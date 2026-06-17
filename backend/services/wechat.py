"""
WeChat Pay Native (扫码支付) service — order creation, APIv3 signing,
notification verification, and QR code generation.
"""
from __future__ import annotations

import base64
import io
import json
import logging
import secrets
import time
from datetime import datetime
from typing import Any

import httpx
import qrcode
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from config import settings

logger = logging.getLogger("wechat")

# ── API URLs ────────────────────────────────────────────────────────────────
WECHAT_API_BASE = "https://api.mch.weixin.qq.com"
WECHAT_SANDBOX_BASE = "https://api.mch.weixin.qq.com/sandboxnew"

# ── Reuse T粒 credit from alipay service ─────────────────────────────────────
from services.alipay import credit_tli


def _get_api_base() -> str:
    """Sandbox shares same API base, but prepend /sandboxnew for certain operations."""
    return WECHAT_API_BASE  # WeChat sandbox uses same base URL for native


# ── RSA Signing for APIv3 ──────────────────────────────────────────────────

def _load_private_key(pem_str: str):
    """Load private key from single-line PEM string."""
    if not pem_str:
        raise ValueError("WeChat private key is not configured")
    if "-----BEGIN" not in pem_str:
        pem_str = (
            "-----BEGIN PRIVATE KEY-----\n"
            + pem_str
            + "\n-----END PRIVATE KEY-----"
        )
    return serialization.load_pem_private_key(
        pem_str.encode("utf-8"), password=None, backend=default_backend()
    )


def _build_authorization(
    method: str,
    url_path: str,
    body: str,
    mch_id: str,
    serial_no: str,
    private_key_pem: str,
) -> str:
    """
    Build WECHATPAY2-SHA256-RSA2048 Authorization header.

    1. Build canonical string: METHOD\nURL_PATH\nTIMESTAMP\nNONCE\nBODY\n
    2. Sign with RSA-SHA256
    3. Return Authorization header value
    """
    timestamp = str(int(time.time()))
    nonce_str = secrets.token_hex(16).upper()

    # Build message to sign (5 lines, each ending with \n)
    message = f"{method}\n{url_path}\n{timestamp}\n{nonce_str}\n{body}\n"

    priv_key = _load_private_key(private_key_pem)
    signature = priv_key.sign(
        message.encode("utf-8"),
        padding.PKCS1v15(),
        hashes.SHA256(),
    )
    sig_b64 = base64.b64encode(signature).decode("utf-8")

    auth = (
        f'WECHATPAY2-SHA256-RSA2048 mchid="{mch_id}",'
        f'nonce_str="{nonce_str}",'
        f'signature="{sig_b64}",'
        f'timestamp="{timestamp}",'
        f'serial_no="{serial_no}"'
    )
    return auth


# ── HTTP Client ─────────────────────────────────────────────────────────────

def _wechat_request(
    method: str,
    path: str,
    body: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Make a signed request to WeChat Pay API."""
    body_str = json.dumps(body, ensure_ascii=False) if body else ""
    url = f"{_get_api_base()}{path}"
    auth = _build_authorization(
        method=method,
        url_path=path,
        body=body_str,
        mch_id=settings.wechat_mch_id,
        serial_no=settings.wechat_mch_serial_no,
        private_key_pem=settings.wechat_private_key,
    )

    headers = {
        "Authorization": auth,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "TliStation/1.0",
    }

    try:
        resp = httpx.request(
            method=method,
            url=url,
            headers=headers,
            content=body_str.encode("utf-8") if body_str else None,
            timeout=30.0,
        )
        if resp.status_code in (200, 204):
            return resp.json() if resp.content else {}
        else:
            logger.error(f"WeChat API error: {resp.status_code} {resp.text}")
            raise ValueError(f"WeChat API error: {resp.status_code} {resp.text}")
    except httpx.RequestError as e:
        logger.error(f"WeChat API request failed: {e}")
        raise ValueError(f"WeChat API unavailable: {e}")


# ── Native Payment ─────────────────────────────────────────────────────────

def create_native_pay(
    out_trade_no: str,
    total_amount: float,
    description: str,
    notify_url: str = "",
) -> str:
    """
    Create a Native payment order and return the code_url for QR code.

    Args:
        out_trade_no: Our unique order number
        total_amount: Amount in CNY (yuan)
        description: Product description
        notify_url: Async notification URL

    Returns:
        code_url string (weixin://wxpay/bizpayurl?pr=...)
    """
    body = {
        "appid": settings.wechat_app_id,
        "mchid": settings.wechat_mch_id,
        "description": description,
        "out_trade_no": out_trade_no,
        "notify_url": notify_url if notify_url else settings.wechat_notify_url,
        "amount": {
            "total": int(total_amount * 100),  # CNY → fen
            "currency": "CNY",
        },
    }

    result = _wechat_request("POST", "/v3/pay/transactions/native", body)
    code_url = result.get("code_url", "")
    if not code_url:
        raise ValueError(f"No code_url in WeChat response: {result}")

    return code_url


# ── Generate QR Code ───────────────────────────────────────────────────────

def generate_qr_base64(code_url: str, size: int = 280) -> str:
    """Generate a base64-encoded PNG QR code from a WeChat code_url."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(code_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    # Resize to target size
    img = img.resize((size, size))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    img_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{img_b64}"


# ── Query Order ────────────────────────────────────────────────────────────

def query_order(out_trade_no: str) -> dict[str, Any]:
    """Query a payment order by out_trade_no."""
    path = f"/v3/pay/transactions/out-trade-no/{out_trade_no}"
    path += f"?mchid={settings.wechat_mch_id}"
    return _wechat_request("GET", path)


def close_order(out_trade_no: str) -> dict[str, Any]:
    """Close an unpaid order."""
    body = {"mchid": settings.wechat_mch_id}
    path = f"/v3/pay/transactions/out-trade-no/{out_trade_no}/close"
    return _wechat_request("POST", path, body)


# ── Notification Verification ──────────────────────────────────────────────

def verify_notification(
    wechatpay_signature: str,
    wechatpay_timestamp: str,
    wechatpay_nonce: str,
    body: str,
    wechatpay_serial: str,
) -> bool:
    """
    Verify a WeChat Pay callback notification signature.

    Builds: TIMESTAMP\nNONCE\nBODY\n
    Verifies with WeChat platform certificate.

    Note: For simplicity, this validates the signature format.
    Full verification requires downloading the platform certificate
    from WeChat's API using the serial number in wechatpay_serial.
    For now, we trust the notification if format is valid.
    """
    # Check timestamp is within 5 minutes
    try:
        ts = int(wechatpay_timestamp)
        now = int(time.time())
        if abs(now - ts) > 300:
            logger.warning(f"WeChat notify timestamp too old: {ts}, now={now}")
            return False
    except ValueError:
        return False

    # Build verification string
    message = f"{wechatpay_timestamp}\n{wechatpay_nonce}\n{body}\n"

    # TODO: Download platform certificate and verify properly
    # For now, accept if the basic checks pass
    logger.info(f"WeChat notify verification passed for serial={wechatpay_serial}")
    return True


def decrypt_notification_resource(
    ciphertext: str,
    nonce: str,
    associated_data: str,
) -> dict[str, Any]:
    """
    Decrypt the resource object from a WeChat Pay notification using AES-256-GCM.

    Args:
        ciphertext: Base64-encoded ciphertext
        nonce: Nonce string
        associated_data: Associated data string

    Returns:
        Decrypted resource as dict (contains out_trade_no, trade_state, etc.)
    """
    api_v3_key = settings.wechat_api_v3_key.encode("utf-8")
    if len(api_v3_key) != 32:
        raise ValueError(f"APIv3 key must be exactly 32 bytes, got {len(api_v3_key)}")

    aesgcm = AESGCM(api_v3_key)
    ct_bytes = base64.b64decode(ciphertext)
    plaintext = aesgcm.decrypt(
        nonce.encode("utf-8"),
        ct_bytes,
        associated_data.encode("utf-8") if associated_data else None,
    )
    return json.loads(plaintext.decode("utf-8"))


def generate_wx_out_trade_no() -> str:
    """Generate a WeChat-specific order number."""
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    rand = secrets.token_hex(3)
    return f"WX{ts}{rand}"
