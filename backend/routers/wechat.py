"""
WeChat Pay Native payment API — student-facing QR code purchase.

Auth: reads New-Api-User header, validates against new-api database.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import TliPackage, WechatOrder, TopUp
from services.wechat import (
    create_native_pay,
    generate_qr_base64,
    generate_wx_out_trade_no,
    query_order,
    verify_notification,
    decrypt_notification_resource,
)
from services.alipay import credit_tli
from config import settings

# Reuse auth dependency from alipay router
from routers.alipay import get_proxy_user

logger = logging.getLogger("wechat")
router = APIRouter(prefix="/wechat", tags=["wechat"])


class CreateOrderBody(BaseModel):
    package_id: int


# ── POST /api/wechat/create-order ─────────────────────────────────────────

@router.post("/create-order")
async def create_wechat_order(
    data: CreateOrderBody,
    proxy_user: dict = Depends(get_proxy_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a WeChat Native payment order, return QR code image."""
    user_id = proxy_user["user_id"]

    pkg_r = await db.execute(
        select(TliPackage).where(
            TliPackage.id == data.package_id,
            TliPackage.is_active == True,
        )
    )
    package = pkg_r.scalar_one_or_none()
    if not package:
        raise HTTPException(404, "套餐不存在或已下线")

    out_trade_no = generate_wx_out_trade_no()
    subject = f"T粒充值 - {package.name}"
    total_amount = package.price_yuan

    order = WechatOrder(
        out_trade_no=out_trade_no,
        user_id=user_id,
        package_id=package.id,
        tli_amount=package.tli_amount,
        total_amount=total_amount,
        subject=subject,
        trade_status="NOTPAY",
    )
    db.add(order)
    await db.commit()

    try:
        code_url = create_native_pay(
            out_trade_no=out_trade_no,
            total_amount=total_amount,
            description=subject[:127],  # WeChat limits description to 127 chars
            notify_url=settings.wechat_notify_url or "",
        )
        qr_b64 = generate_qr_base64(code_url)
    except ValueError as e:
        logger.error(f"Failed to create WeChat pay: {e}")
        raise HTTPException(500, f"微信支付创建失败：{e}")

    # Update order with QR code URL
    order.code_url = code_url
    await db.commit()

    logger.info(f"WeChat order created: {out_trade_no}, user={user_id}, amount={total_amount}")

    return {
        "out_trade_no": out_trade_no,
        "qr_code": qr_b64,
        "total_amount": total_amount,
        "subject": subject,
    }


# ── POST /api/wechat/notify ────────────────────────────────────────────────

@router.post("/notify")
async def wechat_notify(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle WeChat Pay async payment notification.

    Called by WeChat server. Must return {"code": "SUCCESS"} on success.
    """
    # Read headers
    sig = request.headers.get("Wechatpay-Signature", "")
    ts = request.headers.get("Wechatpay-Timestamp", "")
    nonce = request.headers.get("Wechatpay-Nonce", "")
    serial = request.headers.get("Wechatpay-Serial", "")

    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")

    if not all([sig, ts, nonce]):
        logger.warning("WeChat notify missing headers")
        return JSONResponse({"code": "FAIL", "message": "missing headers"}, status_code=400)

    # Verify signature
    if not verify_notification(sig, ts, nonce, body_str, serial):
        logger.warning("WeChat notify signature verification failed")
        return JSONResponse({"code": "FAIL", "message": "invalid signature"}, status_code=400)

    # Parse notification body
    try:
        notify_data = json.loads(body_str)
    except json.JSONDecodeError:
        logger.warning("WeChat notify invalid JSON body")
        return JSONResponse({"code": "FAIL", "message": "invalid json"}, status_code=400)

    event_type = notify_data.get("event_type", "")
    if event_type != "TRANSACTION.SUCCESS":
        logger.info(f"WeChat notify: non-success event {event_type}, ignoring")
        return JSONResponse({"code": "SUCCESS"})

    resource = notify_data.get("resource", {})
    ciphertext = resource.get("ciphertext", "")
    rnonce = resource.get("nonce", "")
    associated_data = resource.get("associated_data", "")

    if not ciphertext:
        logger.warning("WeChat notify missing ciphertext")
        return JSONResponse({"code": "FAIL", "message": "missing ciphertext"}, status_code=400)

    # Decrypt resource
    try:
        decrypted = decrypt_notification_resource(ciphertext, rnonce, associated_data)
    except Exception as e:
        logger.error(f"WeChat notify decryption failed: {e}")
        return JSONResponse({"code": "FAIL", "message": "decryption failed"}, status_code=500)

    out_trade_no = decrypted.get("out_trade_no", "")
    if not out_trade_no:
        logger.warning("WeChat notify missing out_trade_no")
        return JSONResponse({"code": "FAIL"}, status_code=400)

    logger.info(f"WeChat notify: {out_trade_no}, trade_state={decrypted.get('trade_state')}")

    # Look up order
    r = await db.execute(
        select(WechatOrder).where(WechatOrder.out_trade_no == out_trade_no)
    )
    order = r.scalar_one_or_none()
    if not order:
        logger.warning(f"WeChat notify for unknown order: {out_trade_no}")
        return JSONResponse({"code": "FAIL"}, status_code=400)

    # Idempotency check
    if order.trade_status == "SUCCESS":
        logger.info(f"WeChat order {out_trade_no} already processed")
        return JSONResponse({"code": "SUCCESS"})

    # Credit T粒
    try:
        new_balance = credit_tli(order.user_id, order.tli_amount)
        order.credit_applied = True
        logger.info(f"Credited {order.tli_amount} T粒 to user {order.user_id}")
    except Exception as e:
        logger.error(f"Failed to credit T粒 for {out_trade_no}: {e}")
        return JSONResponse({"code": "FAIL", "message": "credit failed"}, status_code=500)

    # Update order
    order.trade_status = "SUCCESS"
    order.transaction_id = decrypted.get("transaction_id", "")
    order.paid_at = datetime.now()

    # Create TopUp record
    topup = TopUp(
        user_id=order.user_id,
        amount=order.tli_amount,
        payment_amount=order.total_amount,
        remark=f"微信支付充值 {order.subject}",
    )
    db.add(topup)
    await db.commit()

    logger.info(f"WeChat payment complete: {out_trade_no}, user={order.user_id}, tli={order.tli_amount}")
    return JSONResponse({"code": "SUCCESS"})


# ── GET /api/wechat/order-status/{out_trade_no} ────────────────────────────

@router.get("/order-status/{out_trade_no}")
async def get_order_status(
    out_trade_no: str,
    proxy_user: dict = Depends(get_proxy_user),
    db: AsyncSession = Depends(get_db),
):
    """Query a WeChat order's payment status."""
    r = await db.execute(
        select(WechatOrder).where(
            WechatOrder.out_trade_no == out_trade_no,
            WechatOrder.user_id == proxy_user["user_id"],
        )
    )
    order = r.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "订单不存在")

    return {
        "out_trade_no": order.out_trade_no,
        "tli_amount": order.tli_amount,
        "total_amount": order.total_amount,
        "subject": order.subject,
        "trade_status": order.trade_status,
        "transaction_id": order.transaction_id,
        "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    }


# ── GET /api/wechat/orders ──────────────────────────────────────────────────

@router.get("/orders")
async def list_orders(
    page: int = 1,
    page_size: int = 20,
    proxy_user: dict = Depends(get_proxy_user),
    db: AsyncSession = Depends(get_db),
):
    """List current user's WeChat orders."""
    user_id = proxy_user["user_id"]
    offset = (page - 1) * page_size

    total_r = await db.execute(
        select(func.count()).select_from(WechatOrder).where(WechatOrder.user_id == user_id)
    )
    total = total_r.scalar() or 0

    r = await db.execute(
        select(WechatOrder)
        .where(WechatOrder.user_id == user_id)
        .order_by(desc(WechatOrder.created_at))
        .offset(offset)
        .limit(page_size)
    )
    items = [
        {
            "out_trade_no": o.out_trade_no,
            "tli_amount": o.tli_amount,
            "total_amount": o.total_amount,
            "subject": o.subject,
            "trade_status": o.trade_status,
            "transaction_id": o.transaction_id,
            "paid_at": o.paid_at.isoformat() if o.paid_at else None,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in r.scalars().all()
    ]

    return {"items": items, "total": total, "page": page, "page_size": page_size}
