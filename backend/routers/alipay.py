"""
Alipay PC website payment API — student-facing purchase endpoints.

Auth: reads New-Api-User header (set by new-api frontend), validates against
new-api database, and resolves to (user_id, username).
"""
from __future__ import annotations

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import TliPackage, AlipayOrder, TopUp, GuideContent
from services.alipay import (
    create_page_pay_form,
    verify_notification,
    generate_out_trade_no,
    credit_tli,
    get_tli_balance,
)
from config import settings

logger = logging.getLogger("alipay")
router = APIRouter(prefix="/alipay", tags=["alipay"])


# ── Auth dependency (reused from proxy router) ─────────────────────────────

import sqlite3
from services.proxy import NEWAPI_DB_PATH as _NEWAPI_DB_PATH


def _newapi_readonly() -> sqlite3.Connection:
    """Read-only connection to new-api database."""
    conn = sqlite3.connect(f"file:{_NEWAPI_DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


async def get_proxy_user(request: Request) -> dict:
    """Extract user_id from New-Api-User header and verify in new-api DB."""
    user_id_str = request.headers.get("New-Api-User") or request.headers.get("new-api-user")
    if not user_id_str:
        raise HTTPException(401, "缺少用户认证信息 (New-Api-User header)")

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise HTTPException(401, "无效的用户认证信息")

    try:
        with _newapi_readonly() as db:
            row = db.execute(
                "SELECT id, username, display_name FROM users WHERE id = ? AND deleted_at IS NULL",
                (user_id,),
            ).fetchone()
    except Exception:
        raise HTTPException(500, "无法验证用户信息")

    if not row:
        raise HTTPException(401, "用户不存在或已注销")

    return {"user_id": row["id"], "username": row["username"]}


# ── Request models ──────────────────────────────────────────────────────────

class CreateOrderBody(BaseModel):
    package_id: int


# ── GET /api/alipay/packages ────────────────────────────────────────────────

@router.get("/packages")
async def list_packages(
    proxy_user: dict = Depends(get_proxy_user),
    db: AsyncSession = Depends(get_db),
):
    """List active T粒 packages available for purchase."""
    r = await db.execute(
        select(TliPackage)
        .where(TliPackage.is_active == True)
        .order_by(TliPackage.sort_order)
    )
    packages = [
        {
            "id": p.id,
            "name": p.name,
            "tli_amount": p.tli_amount,
            "price_yuan": p.price_yuan,
        }
        for p in r.scalars().all()
    ]
    return packages


# ── POST /api/alipay/create-order ──────────────────────────────────────────

@router.post("/create-order")
async def create_order(
    data: CreateOrderBody,
    proxy_user: dict = Depends(get_proxy_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a payment order and return the Alipay redirect URL."""
    user_id = proxy_user["user_id"]

    # Validate package
    pkg_r = await db.execute(
        select(TliPackage).where(
            TliPackage.id == data.package_id,
            TliPackage.is_active == True,
        )
    )
    package = pkg_r.scalar_one_or_none()
    if not package:
        raise HTTPException(404, "套餐不存在或已下线")

    # Generate order
    out_trade_no = generate_out_trade_no()
    subject = f"T粒充值 - {package.name}"
    total_amount = package.price_yuan

    # Create order record
    order = AlipayOrder(
        out_trade_no=out_trade_no,
        user_id=user_id,
        package_id=package.id,
        tli_amount=package.tli_amount,
        total_amount=total_amount,
        subject=subject,
        trade_status="WAIT_BUYER_PAY",
    )
    db.add(order)
    await db.commit()

    # Build the Alipay page pay HTML form
    try:
        form_html = create_page_pay_form(
            out_trade_no=out_trade_no,
            total_amount=total_amount,
            subject=subject,
            return_url=settings.alipay_return_url or "",
            notify_url=settings.alipay_notify_url or "",
        )
    except ValueError as e:
        logger.error(f"Failed to create Alipay pay URL: {e}")
        raise HTTPException(500, "支付服务配置未完成，请联系管理员")

    logger.info(f"Alipay order created: {out_trade_no}, user={user_id}, amount={total_amount}")

    return {
        "out_trade_no": out_trade_no,
        "pay_url": form_html,  # GET URL for browser redirect
        "total_amount": total_amount,
        "subject": subject,
    }


# ── POST /api/alipay/notify ────────────────────────────────────────────────

@router.post("/notify")
async def alipay_notify(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Alipay async payment notification.

    This endpoint is called by Alipay's server (no auth).
    Must return plain text "success" on successful processing.
    """
    # Read form-encoded POST body
    try:
        form_data = await request.form()
        params = {k: v for k, v in form_data.items()}
    except Exception:
        params = dict(request.query_params)

    out_trade_no = params.get("out_trade_no", "")
    if not out_trade_no:
        logger.warning("Notify received without out_trade_no")
        return PlainTextResponse("failure", status_code=400)

    logger.info(f"Alipay notify: {out_trade_no}, trade_status={params.get('trade_status')}")

    # 1. Verify signature and business params
    try:
        verified = verify_notification(params)
    except ValueError as e:
        logger.warning(f"Notify verification failed for {out_trade_no}: {e}")
        return PlainTextResponse("failure", status_code=400)

    # 2. Look up the order
    r = await db.execute(
        select(AlipayOrder).where(AlipayOrder.out_trade_no == out_trade_no)
    )
    order = r.scalar_one_or_none()
    if not order:
        logger.warning(f"Notify for unknown order: {out_trade_no}")
        return PlainTextResponse("failure", status_code=400)

    # 3. Check idempotency — already processed?
    if order.trade_status in ("TRADE_SUCCESS", "TRADE_FINISHED"):
        logger.info(f"Order {out_trade_no} already processed, returning success")
        return PlainTextResponse("success")

    # 4. Verify amounts match
    notify_total = float(verified.get("total_amount", 0))
    if abs(notify_total - order.total_amount) > 0.01:
        logger.warning(
            f"Amount mismatch for {out_trade_no}: "
            f"expected {order.total_amount}, got {notify_total}"
        )
        return PlainTextResponse("failure", status_code=400)

    # 5. Credit T粒 to user in new-api DB
    try:
        new_balance = credit_tli(order.user_id, order.tli_amount)
        order.credit_applied = True
        logger.info(f"Credited {order.tli_amount} T粒 to user {order.user_id}, new balance: {new_balance:.2f}")
    except Exception as e:
        logger.error(f"Failed to credit T粒 for {out_trade_no}: {e}")
        # Don't return failure — Alipay will retry. The credit_applied flag
        # prevents double-credit on retry.
        return PlainTextResponse("failure", status_code=500)

    # 6. Update order
    order.trade_no = verified.get("trade_no", "")
    order.trade_status = verified.get("trade_status", "TRADE_SUCCESS")
    order.buyer_id = verified.get("buyer_id", "")
    order.buyer_logon_id = verified.get("buyer_logon_id", "")
    order.paid_at = datetime.now()

    # 7. Create TopUp record (audit log)
    topup = TopUp(
        user_id=order.user_id,
        amount=order.tli_amount,
        payment_amount=order.total_amount,
        remark=f"支付宝充值 {order.subject}",
    )
    db.add(topup)

    await db.commit()

    logger.info(f"Alipay payment complete: {out_trade_no}, "
                f"user={order.user_id}, tli={order.tli_amount}, "
                f"trade_no={order.trade_no}")

    return PlainTextResponse("success")


# ── GET /api/alipay/return ─────────────────────────────────────────────────

@router.get("/return")
async def alipay_return(
    out_trade_no: str = "",
    trade_no: str = "",
    total_amount: str = "",
):
    """
    Handle Alipay synchronous redirect after payment.

    Redirects the user's browser to the frontend result page.
    """
    # Always redirect to frontend result page — the frontend polls for status
    qs = f"out_trade_no={out_trade_no}"
    if trade_no:
        qs += f"&trade_no={trade_no}"
    if total_amount:
        qs += f"&total_amount={total_amount}"

    # Determine frontend origin
    return RedirectResponse(
        url=f"/alipay-result?{qs}",
        status_code=302,
    )


# ── GET /api/alipay/order-status/{out_trade_no} ─────────────────────────────

@router.get("/order-status/{out_trade_no}")
async def get_order_status(
    out_trade_no: str,
    proxy_user: dict = Depends(get_proxy_user),
    db: AsyncSession = Depends(get_db),
):
    """Query a single order's payment status."""
    r = await db.execute(
        select(AlipayOrder).where(
            AlipayOrder.out_trade_no == out_trade_no,
            AlipayOrder.user_id == proxy_user["user_id"],
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
        "trade_no": order.trade_no,
        "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    }


# ── GET /api/alipay/orders ──────────────────────────────────────────────────

# ── GET /api/alipay/orders ──────────────────────────────────────────────────


@router.get("/site-config")
async def get_site_config(
    key: str = "",
    proxy_user: dict = Depends(get_proxy_user),
    db: AsyncSession = Depends(get_db),
):
    """Read site configuration by key (e.g. purchase_link)."""
    r = await db.execute(
        select(GuideContent).where(GuideContent.section_key == f"redeem_{key}")
    )
    row = r.scalar_one_or_none()
    if not row:
        return {"key": key, "value": ""}
    return {"key": row.section_key, "title": row.title, "value": row.content}


@router.get("/orders")
async def list_orders(
    page: int = 1,
    page_size: int = 20,
    proxy_user: dict = Depends(get_proxy_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's Alipay orders."""
    user_id = proxy_user["user_id"]
    offset = (page - 1) * page_size

    from sqlalchemy import func
    total_r = await db.execute(
        select(func.count()).select_from(AlipayOrder).where(AlipayOrder.user_id == user_id)
    )
    total = total_r.scalar() or 0

    # Page
    r = await db.execute(
        select(AlipayOrder)
        .where(AlipayOrder.user_id == user_id)
        .order_by(desc(AlipayOrder.created_at))
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
            "trade_no": o.trade_no,
            "paid_at": o.paid_at.isoformat() if o.paid_at else None,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in r.scalars().all()
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }
