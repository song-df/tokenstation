"""
Alipay PC website payment service — order creation, RSA2 signing,
notification verification, and T粒 crediting to new-api database.
"""
from __future__ import annotations

import base64
import logging
import secrets
import sqlite3
import sys
from datetime import datetime
from typing import Any
from urllib.parse import quote, urlencode

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend

from config import settings

logger = logging.getLogger("alipay")

# ── Gateway URLs ────────────────────────────────────────────────────────────
SANDBOX_GATEWAY = "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
PRODUCTION_GATEWAY = "https://openapi.alipay.com/gateway.do"

# ── new-api T粒 constants ───────────────────────────────────────────────────
Tli_PER_QUOTA = 690  # 1 T粒 = 690 new-api quota units
NEWAPI_DB_PATH = getattr(settings, "newapi_db_path", "/opt/newapi/data/data.db")


def _get_gateway_url() -> str:
    """Return sandbox or production gateway based on config."""
    return SANDBOX_GATEWAY if settings.alipay_debug else PRODUCTION_GATEWAY


# ── RSA2 Signing ────────────────────────────────────────────────────────────

def _load_private_key(pem_str: str):
    """Load an RSA private key from a single-line PEM string (PKCS#1 or PKCS#8)."""
    if not pem_str:
        raise ValueError("Alipay private key is not configured")
    # Single-line PEM: restore header/footer if needed
    if "-----BEGIN" not in pem_str:
        # Try PKCS#8 format first (the Alipay sandbox generates PKCS#8 keys)
        for header, footer in [
            ("-----BEGIN PRIVATE KEY-----", "-----END PRIVATE KEY-----"),
            ("-----BEGIN RSA PRIVATE KEY-----", "-----END RSA PRIVATE KEY-----"),
        ]:
            try:
                formatted = f"{header}\n{pem_str}\n{footer}"
                return serialization.load_pem_private_key(
                    formatted.encode("utf-8"), password=None, backend=default_backend()
                )
            except Exception:
                continue
        raise ValueError("Failed to load private key: not a valid PKCS#1 or PKCS#8 key")
    return serialization.load_pem_private_key(
        pem_str.encode("utf-8"), password=None, backend=default_backend()
    )


def _load_public_key(pem_str: str):
    """Load an RSA public key from a single-line PEM string."""
    if not pem_str:
        raise ValueError("Alipay public key is not configured")
    if "-----BEGIN" not in pem_str:
        pem_str = (
            "-----BEGIN PUBLIC KEY-----\n"
            + pem_str
            + "\n-----END PUBLIC KEY-----"
        )
    return serialization.load_pem_public_key(
        pem_str.encode("utf-8"), backend=default_backend()
    )


def sign_params(params: dict[str, Any], private_key_pem: str) -> str:
    """
    Generate RSA2 (SHA256WithRSA) signature for a dict of params.

    1. Sort keys alphabetically
    2. Concatenate key=value pairs with & (values URL-encoded, but NOT the = and &)
    3. Sign with SHA256WithRSA
    4. Base64-encode the result
    """
    # Filter out sign, sort alphabetically
    keys = sorted(k for k in params if k != "sign")
    # Build the string to sign: key1=value1&key2=value2...
    parts = []
    for k in keys:
        v = params[k]
        if v is None or v == "":
            continue
        parts.append(f"{k}={v}")
    sign_str = "&".join(parts)

    private_key = _load_private_key(private_key_pem)
    signature = private_key.sign(
        sign_str.encode("utf-8"),
        padding.PKCS1v15(),
        hashes.SHA256(),
    )
    return base64.b64encode(signature).decode("utf-8")


def verify_signature(params: dict[str, Any], signature: str, public_key_pem: str, sign_type: str = "RSA2") -> bool:
    """
    Verify an RSA2 signature from Alipay's async notification.

    Args:
        params: All notification params except sign and sign_type
        signature: The base64-encoded signature from Alipay
        public_key_pem: Alipay's RSA2 public key
        sign_type: "RSA2" or "RSA"

    Returns:
        True if signature is valid
    """
    # Build the string that was signed (same process as signing)
    keys = sorted(params.keys())
    parts = []
    for k in keys:
        v = params[k]
        if v is None or v == "":
            continue
        parts.append(f"{k}={v}")
    sign_str = "&".join(parts)

    public_key = _load_public_key(public_key_pem)
    try:
        signature_bytes = base64.b64decode(signature)
        public_key.verify(
            signature_bytes,
            sign_str.encode("utf-8"),
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return True
    except Exception as e:
        logger.warning(f"Signature verification failed: {e}")
        return False


# ── Page Pay ────────────────────────────────────────────────────────────────

def create_page_pay_form(
    out_trade_no: str,
    total_amount: float,
    subject: str,
    return_url: str = "",
    notify_url: str = "",
) -> str:
    """
    Build the full alipay.trade.page.pay redirect URL (GET mode).

    GET mode is simpler and avoids HTML form encoding issues.
    Returns a full URL for the frontend to redirect to.
    """
    import json

    biz_content = {
        "out_trade_no": out_trade_no,
        "total_amount": f"{total_amount:.2f}",
        "subject": subject,
        "product_code": "FAST_INSTANT_TRADE_PAY",
    }
    biz_content_str = json.dumps(biz_content, ensure_ascii=False)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    common_params = {
        "app_id": settings.alipay_app_id,
        "method": "alipay.trade.page.pay",
        "format": "JSON",
        "charset": "utf-8",
        "sign_type": settings.alipay_sign_type,
        "timestamp": timestamp,
        "version": "1.0",
        "biz_content": biz_content_str,
    }
    if return_url:
        common_params["return_url"] = return_url
    if notify_url:
        common_params["notify_url"] = notify_url

    sign = sign_params(common_params, settings.alipay_app_private_key)
    gateway = _get_gateway_url()

    keys = sorted(k for k in common_params if k != "sign")
    debug_sign_str = "&".join(f"{k}={common_params[k]}" for k in keys if common_params[k])
    import os as _os
    _debug_file = _os.environ.get("ALIPAY_DEBUG_LOG", "/tmp/alipay_debug.log")
    with open(_debug_file, "a", encoding="utf-8") as _f:
        _f.write(f"=== {datetime.now()} ===\n")
        _f.write(f"SIGN_STR: {debug_sign_str}\n")
        _f.write(f"SIGN_VAL: {sign[:80]}...\n")
        _f.write(f"APP_ID: {settings.alipay_app_id}\n")
        _f.write(f"GATEWAY: {gateway}\n")
        _f.write(f"DEBUG: {settings.alipay_debug}\n")
        _f.write("\n")

    qs_parts = []
    for k, v in common_params.items():
        qs_parts.append(f"{k}={quote(v, safe='', encoding='utf-8')}")
    qs_parts.append(f"sign={quote(sign, safe='', encoding='utf-8')}")
    final_url = f"{gateway}?{'&'.join(qs_parts)}"
    print(f"[ALIPAY_URL] {final_url[:200]}...", file=sys.stderr, flush=True)
    return final_url


def _html_escape(s: str) -> str:
    """Not used in GET mode, kept for reference."""
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")


# ── Notification Verification ──────────────────────────────────────────────

def verify_notification(params: dict[str, str]) -> dict[str, str]:
    """
    Verify an async notification from Alipay.

    1. Extract and verify the signature
    2. Verify app_id matches
    3. Verify trade_status is TRADE_SUCCESS or TRADE_FINISHED

    Args:
        params: Form-encoded POST params from Alipay

    Returns:
        The verified params dict

    Raises:
        ValueError: If verification fails
    """
    sign = params.get("sign", "")
    sign_type = params.get("sign_type", "RSA2")

    if not sign:
        raise ValueError("Missing sign parameter")

    # Build verification params (all except sign and sign_type)
    verify_params = {
        k: v for k, v in params.items()
        if k not in ("sign", "sign_type") and v
    }

    # Verify signature
    if not verify_signature(verify_params, sign, settings.alipay_alipay_public_key, sign_type):
        raise ValueError("Invalid signature")

    # Verify app_id
    app_id = params.get("app_id", "")
    if app_id != settings.alipay_app_id:
        raise ValueError(f"app_id mismatch: expected {settings.alipay_app_id}, got {app_id}")

    # Verify trade status
    trade_status = params.get("trade_status", "")
    if trade_status not in ("TRADE_SUCCESS", "TRADE_FINISHED"):
        raise ValueError(f"Trade status is {trade_status}, not a success state")

    return params


# ── new-api T粒 Credit ─────────────────────────────────────────────────────

def _newapi_db() -> sqlite3.Connection:
    """Open a read/write connection to new-api's SQLite database."""
    conn = sqlite3.connect(f"file:{NEWAPI_DB_PATH}?mode=rw", uri=True)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def get_tli_balance(user_id: int) -> float:
    """Return T粒 balance for a user from new-api DB."""
    with _newapi_db() as db:
        row = db.execute(
            "SELECT quota FROM users WHERE id = ? AND deleted_at IS NULL",
            (user_id,),
        ).fetchone()
    if not row:
        raise ValueError(f"User {user_id} not found in new-api database")
    return row["quota"] / Tli_PER_QUOTA


def credit_tli(user_id: int, tli_amount: float) -> float:
    """
    Add T粒 to user's new-api balance. Returns new balance in T粒.

    Args:
        user_id: User ID in new-api
        tli_amount: T粒 amount to credit

    Returns:
        New T粒 balance

    Raises:
        ValueError: If user not found
    """
    quota_add = int(tli_amount * Tli_PER_QUOTA)
    with _newapi_db() as db:
        row = db.execute(
            "SELECT quota FROM users WHERE id = ? AND deleted_at IS NULL",
            (user_id,),
        ).fetchone()
        if not row:
            raise ValueError(f"User {user_id} not found in new-api database")

        db.execute(
            "UPDATE users SET quota = quota + ? WHERE id = ?",
            (quota_add, user_id),
        )
        db.commit()
        new_quota = row["quota"] + quota_add

    return new_quota / Tli_PER_QUOTA


# ── Order ID Generation ────────────────────────────────────────────────────

def generate_out_trade_no() -> str:
    """Generate a unique order number: TLI + timestamp + random hex."""
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    rand = secrets.token_hex(3)  # 6 hex chars
    return f"TLI{ts}{rand}"
