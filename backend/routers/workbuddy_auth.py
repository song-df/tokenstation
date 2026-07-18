"""First-party WorBuddy session bridge for T粒 OAuth2.

The browser only receives a short-lived, HttpOnly WorBuddy session cookie.
The OAuth client secret is kept in the server environment and is never sent
to the static WorBuddy frontend.
"""
from __future__ import annotations

import json
import secrets
import sqlite3
import time
from typing import Any, Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import select

from auth import create_access_token
from config import settings
from database import async_session
from models import AlipayOrder, TliPackage
from services.alipay import create_page_pay_form, generate_out_trade_no

router = APIRouter(prefix="/workbuddy-auth", tags=["workbuddy-auth"])

_STATE_COOKIE = "workbuddy_oauth_state"
_POPUP_COOKIE = "workbuddy_oauth_popup"
_STATE_TTL_SECONDS = 600
_TLI_PER_QUOTA = 690
_PURCHASE_RETURN_URL = "https://worbuddy.cn/payment-result.html"


class PurchaseOrderBody(BaseModel):
    package_id: int


class KeyCreateBody(BaseModel):
    name: str = ""


def _decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None


def _ensure_oauth_ready() -> None:
    if not settings.workbuddy_oauth_client_secret:
        raise HTTPException(status_code=503, detail="WorBuddy OAuth is not configured")


def _popup_result(ok: bool, message: str = "") -> HTMLResponse:
    payload = json.dumps({"type": "workbuddy:oauth", "ok": ok, "message": message})
    return HTMLResponse(
        "<!doctype html><meta charset='utf-8'><script>"
        f"var p={payload},t=window.opener||window.parent;"
        f"if(window.opener)t.postMessage(p,window.location.origin),window.close();"
        f"else t.postMessage(p,'*');"
        "</script><p>登录完成，可关闭此窗口。</p>"
    )


def _clear_oauth_cookies(response: Any) -> None:
    response.delete_cookie(_STATE_COOKIE, path="/workbuddy-auth")
    response.delete_cookie(_POPUP_COOKIE, path="/workbuddy-auth")


def _load_newapi_user(user_id: int) -> Optional[dict]:
    conn = sqlite3.connect(f"file:{settings.newapi_db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            """SELECT id, username, display_name, email, role, quota, used_quota, request_count
               FROM users WHERE id = ? AND deleted_at IS NULL AND status = 1""",
            (user_id,),
        ).fetchone()
    finally:
        conn.close()
    return dict(row) if row else None


def _newapi_write() -> sqlite3.Connection:
    conn = sqlite3.connect(f"file:{settings.newapi_db_path}?mode=rw", uri=True)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def _mask_key(key: str) -> str:
    if len(key) <= 4:
        return "*" * len(key)
    if len(key) <= 8:
        return key[:2] + "****" + key[-2:]
    return key[:4] + "**********" + key[-4:]


def _get_session_user(request: Request) -> Optional[dict]:
    session = request.cookies.get(settings.workbuddy_session_cookie, "")
    payload = _decode_token(session)
    if not payload or payload.get("scope") != "workbuddy" or not payload.get("sub"):
        return None
    try:
        return _load_newapi_user(int(payload["sub"]))
    except (TypeError, ValueError):
        return None


@router.get("/login")
async def login(popup: bool = Query(False)):
    _ensure_oauth_ready()
    state = secrets.token_urlsafe(32)
    query = urlencode({
        "client_id": settings.workbuddy_oauth_client_id,
        "redirect_uri": settings.workbuddy_oauth_redirect_uri,
        "response_type": "code",
        "state": state,
    })
    response = RedirectResponse(f"{settings.workbuddy_oauth_base_url}/oauth/authorize?{query}")
    response.set_cookie(
        _STATE_COOKIE, state, max_age=_STATE_TTL_SECONDS, httponly=True,
        secure=True, samesite="lax", path="/workbuddy-auth",
    )
    response.set_cookie(
        _POPUP_COOKIE, "1" if popup else "0", max_age=_STATE_TTL_SECONDS,
        httponly=True, secure=True, samesite="lax", path="/workbuddy-auth",
    )
    return response


@router.get("/callback")
async def callback(request: Request, code: str = "", state: str = ""):
    popup = request.cookies.get(_POPUP_COOKIE) == "1"
    expected_state = request.cookies.get(_STATE_COOKIE, "")
    if not code or not expected_state or not secrets.compare_digest(state, expected_state):
        if popup:
            response = _popup_result(False, "授权已过期或验证失败，请重试。")
            _clear_oauth_cookies(response)
            return response
        response = RedirectResponse("/?login_error=state", status_code=303)
        _clear_oauth_cookies(response)
        return response

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_response = await client.post(
                f"{settings.workbuddy_oauth_base_url}/oauth/token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": settings.workbuddy_oauth_client_id,
                    "client_secret": settings.workbuddy_oauth_client_secret,
                    "redirect_uri": settings.workbuddy_oauth_redirect_uri,
                },
            )
        token_response.raise_for_status()
        upstream_token = token_response.json().get("access_token", "")
        payload = _decode_token(upstream_token)
        user_id = int(payload["sub"]) if payload and payload.get("sub") else 0
        user = _load_newapi_user(user_id) if user_id else None
        if not user:
            raise ValueError("OAuth user is unavailable")
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        if popup:
            response = _popup_result(False, "无法完成 T粒账号登录，请稍后重试。")
            _clear_oauth_cookies(response)
            return response
        response = RedirectResponse("/?login_error=oauth", status_code=303)
        _clear_oauth_cookies(response)
        return response

    session = create_access_token({"sub": str(user["id"]), "scope": "workbuddy"})
    if popup:
        response = _popup_result(True)
    else:
        response = RedirectResponse("/", status_code=303)
    response.set_cookie(
        settings.workbuddy_session_cookie, session, httponly=True, secure=True,
        samesite="lax", path="/", max_age=settings.access_token_expire_minutes * 60,
    )
    _clear_oauth_cookies(response)
    return response


@router.get("/me")
async def me(request: Request):
    user = _get_session_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Account is unavailable")
    return {
        "id": user["id"],
        "username": user["username"],
        "display_name": user["display_name"] or user["username"],
        "email": user["email"] or "",
        "role": user["role"],
    }


@router.get("/usage")
async def usage(request: Request):
    user = _get_session_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    return {
        "balance_points": round(int(user["quota"] or 0) / _TLI_PER_QUOTA, 2),
        "used_points": round(int(user["used_quota"] or 0) / _TLI_PER_QUOTA, 2),
        "request_count": int(user["request_count"] or 0),
    }


@router.get("/purchase/packages")
async def purchase_packages(request: Request):
    if not _get_session_user(request):
        raise HTTPException(status_code=401, detail="Not logged in")
    async with async_session() as db:
        result = await db.execute(
            select(TliPackage)
            .where(TliPackage.is_active == True)
            .order_by(TliPackage.sort_order)
        )
        return [
            {"id": package.id, "name": package.name, "points": package.tli_amount,
             "price_yuan": package.price_yuan}
            for package in result.scalars().all()
        ]


@router.post("/purchase/orders")
async def create_purchase_order(data: PurchaseOrderBody, request: Request):
    user = _get_session_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    async with async_session() as db:
        result = await db.execute(
            select(TliPackage).where(
                TliPackage.id == data.package_id, TliPackage.is_active == True,
            )
        )
        package = result.scalar_one_or_none()
        if not package:
            raise HTTPException(status_code=404, detail="积分包不存在或已下线")

        out_trade_no = generate_out_trade_no()
        subject = f"WorBuddy 积分充值 - {package.name}"
        order = AlipayOrder(
            out_trade_no=out_trade_no, user_id=user["id"], package_id=package.id,
            tli_amount=package.tli_amount, total_amount=package.price_yuan,
            subject=subject, trade_status="WAIT_BUYER_PAY",
        )
        db.add(order)
        await db.commit()
        try:
            pay_url = create_page_pay_form(
                out_trade_no=out_trade_no, total_amount=package.price_yuan,
                subject=subject, return_url=_PURCHASE_RETURN_URL,
                notify_url=settings.alipay_notify_url or "",
            )
        except ValueError:
            raise HTTPException(status_code=503, detail="支付服务暂不可用")
    return {"out_trade_no": out_trade_no, "pay_url": pay_url}


@router.post("/purchase/orders/{out_trade_no}/repay")
async def repay_order(out_trade_no: str, request: Request):
    user = _get_session_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    async with async_session() as db:
        result = await db.execute(
            select(AlipayOrder).where(
                AlipayOrder.out_trade_no == out_trade_no, AlipayOrder.user_id == user["id"],
            )
        )
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="订单不存在")
        if order.trade_status != "WAIT_BUYER_PAY":
            raise HTTPException(status_code=400, detail="该订单已处理，无需重复支付")
        try:
            pay_url = create_page_pay_form(
                out_trade_no=order.out_trade_no, total_amount=order.total_amount,
                subject=order.subject, return_url=_PURCHASE_RETURN_URL,
                notify_url=settings.alipay_notify_url or "",
            )
        except ValueError:
            raise HTTPException(status_code=503, detail="支付服务暂不可用")
    return {"pay_url": pay_url}


@router.get("/purchase/orders")
async def list_purchase_orders(request: Request, limit: int = Query(20, ge=1, le=50)):
    user = _get_session_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    async with async_session() as db:
        result = await db.execute(
            select(AlipayOrder)
            .where(AlipayOrder.user_id == user["id"])
            .order_by(AlipayOrder.id.desc())
            .limit(limit)
        )
        return [
            {
                "out_trade_no": order.out_trade_no,
                "tli_amount": order.tli_amount,
                "total_amount": order.total_amount,
                "trade_status": order.trade_status,
                "subject": order.subject,
            }
            for order in result.scalars().all()
        ]


@router.get("/purchase/orders/{out_trade_no}")
async def purchase_order_status(out_trade_no: str, request: Request):
    user = _get_session_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    async with async_session() as db:
        result = await db.execute(
            select(AlipayOrder).where(
                AlipayOrder.out_trade_no == out_trade_no, AlipayOrder.user_id == user["id"],
            )
        )
        order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    return {
        "out_trade_no": order.out_trade_no, "points": order.tli_amount,
        "total_amount": order.total_amount, "trade_status": order.trade_status,
    }


@router.get("/keys")
async def list_keys(request: Request):
    user = _get_session_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    try:
        conn = _newapi_write()
        try:
            rows = conn.execute(
                """SELECT id, name, key, status, created_time, accessed_time, remain_quota,
                          used_quota, expired_time
                   FROM tokens WHERE user_id = ? AND deleted_at IS NULL ORDER BY id DESC""",
                (user["id"],),
            ).fetchall()
        finally:
            conn.close()
    except sqlite3.Error:
        raise HTTPException(status_code=503, detail="暂时无法读取 API Key")
    return [{
        "id": row["id"], "name": row["name"] or "未命名 Key",
        "key": "sk-" + _mask_key(row["key"]), "status": row["status"],
        "created_time": row["created_time"], "accessed_time": row["accessed_time"],
        "remain_points": round(int(row["remain_quota"] or 0) / _TLI_PER_QUOTA, 2),
        "used_points": round(int(row["used_quota"] or 0) / _TLI_PER_QUOTA, 2),
        "expired_time": row["expired_time"],
    } for row in rows]


@router.post("/keys")
async def create_key(data: KeyCreateBody, request: Request):
    user = _get_session_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    name = data.name.strip()
    if len(name) > 50:
        raise HTTPException(status_code=400, detail="Key 名称不能超过 50 个字符")
    raw_key = secrets.token_urlsafe(36)[:48]
    now = int(time.time())
    try:
        conn = _newapi_write()
        try:
            option = conn.execute(
                "SELECT value FROM options WHERE key = 'MaxUserTokens'"
            ).fetchone()
            max_tokens = int(option["value"]) if option and str(option["value"]).isdigit() else 0
            if max_tokens:
                count = conn.execute(
                    "SELECT COUNT(*) FROM tokens WHERE user_id = ? AND deleted_at IS NULL", (user["id"],)
                ).fetchone()[0]
                if count >= max_tokens:
                    raise HTTPException(status_code=400, detail=f"已达到 API Key 数量上限（{max_tokens}）")
            cursor = conn.execute(
                """INSERT INTO tokens (user_id, key, status, name, created_time, accessed_time,
                   expired_time, remain_quota, unlimited_quota, model_limits_enabled,
                   model_limits, used_quota, "group", cross_group_retry)
                   VALUES (?, ?, 1, ?, ?, ?, -1, ?, 0, 0, '', 0, '', 0)""",
                (user["id"], raw_key, name or "未命名 Key", now, now, int(user["quota"] or 0)),
            )
            conn.commit()
        finally:
            conn.close()
    except HTTPException:
        raise
    except sqlite3.Error:
        raise HTTPException(status_code=503, detail="暂时无法创建 API Key")
    return {"id": cursor.lastrowid, "name": name or "未命名 Key", "key": "sk-" + raw_key}


@router.post("/keys/{key_id}/secret")
async def reveal_key(key_id: int, request: Request):
    user = _get_session_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    try:
        conn = _newapi_write()
        try:
            row = conn.execute(
                "SELECT key FROM tokens WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
                (key_id, user["id"]),
            ).fetchone()
        finally:
            conn.close()
    except sqlite3.Error:
        raise HTTPException(status_code=503, detail="暂时无法读取 API Key")
    if not row:
        raise HTTPException(status_code=404, detail="API Key 不存在")
    return {"key": "sk-" + row["key"]}


@router.post("/keys/{key_id}/toggle")
async def toggle_key(key_id: int, request: Request):
    user = _get_session_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    try:
        conn = _newapi_write()
        try:
            row = conn.execute(
                "SELECT status FROM tokens WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
                (key_id, user["id"]),
            ).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="API Key 不存在")
            if row["status"] not in (1, 2):
                raise HTTPException(status_code=400, detail="当前状态无法切换")
            status = 2 if row["status"] == 1 else 1
            conn.execute("UPDATE tokens SET status = ? WHERE id = ? AND user_id = ?", (status, key_id, user["id"]))
            conn.commit()
        finally:
            conn.close()
    except HTTPException:
        raise
    except sqlite3.Error:
        raise HTTPException(status_code=503, detail="暂时无法更新 API Key")
    return {"status": status}


@router.delete("/keys/{key_id}")
async def delete_key(key_id: int, request: Request):
    user = _get_session_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    try:
        conn = _newapi_write()
        try:
            cursor = conn.execute(
                "DELETE FROM tokens WHERE id = ? AND user_id = ?", (key_id, user["id"])
            )
            conn.commit()
        finally:
            conn.close()
    except sqlite3.Error:
        raise HTTPException(status_code=503, detail="暂时无法删除 API Key")
    if cursor.rowcount != 1:
        raise HTTPException(status_code=404, detail="API Key 不存在")
    return {"ok": True}


@router.post("/logout")
async def logout():
    response = JSONResponse({"success": True})
    response.delete_cookie(settings.workbuddy_session_cookie, path="/")
    return response
