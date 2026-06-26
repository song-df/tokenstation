"""OAuth2 authorization-code grant provider.

Registers third-party apps via config.oauth_clients_json and issues
standard JWT access tokens that work with /api/auth/me.
"""
from __future__ import annotations
import html, json, secrets, time
from fastapi import APIRouter, Depends, HTTPException, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from config import settings
from database import get_db
from models import User
from auth import verify_password, create_access_token, get_current_user
from services.proxy import get_tli_balance

router = APIRouter(prefix="/oauth", tags=["oauth"])

_codes: dict[str, dict] = {}
_CODE_TTL = 300  # 5 minutes


def _get_clients() -> list[dict]:
    return json.loads(settings.oauth_clients_json)


def _find_client(client_id: str) -> dict | None:
    for c in _get_clients():
        if c["client_id"] == client_id:
            return c
    return None


def _clean_expired_codes():
    now = time.time()
    expired = [k for k, v in _codes.items() if v["expires_at"] < now]
    for k in expired:
        del _codes[k]


LOGIN_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>T粒加油站 - 登录</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f0f2f5;display:flex;align-items:center;justify-content:center;min-height:100vh}}
.card{{background:#fff;border-radius:8px;padding:32px 28px;width:100%;max-width:380px;box-shadow:0 2px 8px rgba(0,0,0,.08)}}
h1{{font-size:20px;margin-bottom:4px;color:#1a1a2e}}
.sub{{font-size:13px;color:#888;margin-bottom:24px}}
label{{display:block;font-size:13px;color:#333;margin-bottom:6px}}
input{{width:100%;padding:10px 12px;border:1px solid #d9d9d9;border-radius:6px;font-size:14px;margin-bottom:16px;outline:none}}
input:focus{{border-color:#1677ff;box-shadow:0 0 0 2px rgba(22,119,255,.15)}}
button{{width:100%;padding:10px;background:#1677ff;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer}}
button:hover{{background:#4096ff}}
.err{{color:#ff4d4f;font-size:13px;margin-bottom:12px}}
</style>
</head>
<body>
<div class="card">
<h1>T粒加油站</h1>
<p class="sub">授权登录 — {client_name}</p>
{error}
<form method="post">
<input type="hidden" name="client_id" value="{client_id}">
<input type="hidden" name="redirect_uri" value="{redirect_uri}">
<input type="hidden" name="state" value="{state}">
<label>用户名</label>
<input type="text" name="username" required autofocus>
<label>密码</label>
<input type="password" name="password" required>
<button type="submit">登录并授权</button>
</form>
</div>
</body>
</html>"""


def _render_login(client_id: str, redirect_uri: str, state: str, error: str = "") -> str:
    return LOGIN_HTML.format(
        client_name=html.escape(client_id),
        error=error,
        client_id=html.escape(client_id),
        redirect_uri=html.escape(redirect_uri),
        state=html.escape(state),
    )


@router.get("/authorize")
async def authorize_get(
    client_id: str,
    redirect_uri: str,
    response_type: str = "code",
    state: str = "",
):
    if response_type != "code":
        raise HTTPException(400, "unsupported response_type")
    client = _find_client(client_id)
    if not client:
        raise HTTPException(400, "unknown client_id")
    if redirect_uri not in client.get("redirect_uris", []):
        raise HTTPException(400, "redirect_uri not registered")
    return HTMLResponse(_render_login(client_id, redirect_uri, state))


@router.post("/authorize")
async def authorize_post(
    client_id: str = Form(...),
    redirect_uri: str = Form(...),
    state: str = Form(""),
    username: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    client = _find_client(client_id)
    if not client:
        raise HTTPException(400, "unknown client_id")
    if redirect_uri not in client.get("redirect_uris", []):
        raise HTTPException(400, "redirect_uri not registered")

    r = await db.execute(select(User).where(User.username == username))
    user = r.scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        html = _render_login(client_id, redirect_uri, state, '<p class="err">用户名或密码错误</p>')
        return HTMLResponse(html, status_code=401)
    if not user.is_active:
        html = _render_login(client_id, redirect_uri, state, '<p class="err">账号已被禁用</p>')
        return HTMLResponse(html, status_code=403)

    # Check T粒 balance (new-api) — course platform requires ≥2000 T粒
    try:
        balance = get_tli_balance(user.id)
        if balance < 2000:
            html = _render_login(client_id, redirect_uri, state,
                f'<p class="err">T粒余额不足（当前 {balance:.0f} T粒，需要至少 2000 T粒）。<br>请到 T粒加油站 充值后再试。</p>')
            return HTMLResponse(html, status_code=402)
    except Exception:
        html = _render_login(client_id, redirect_uri, state,
            '<p class="err">无法查询余额，请稍后重试</p>')
        return HTMLResponse(html, status_code=500)

    _clean_expired_codes()
    code = secrets.token_urlsafe(32)
    _codes[code] = {
        "user_id": user.id,
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "expires_at": time.time() + _CODE_TTL,
    }

    sep = "&" if "?" in redirect_uri else "?"
    url = f"{redirect_uri}{sep}code={code}"
    if state:
        url += f"&state={state}"
    return RedirectResponse(url, status_code=302)


@router.post("/token")
async def token(
    grant_type: str = Form(...),
    code: str = Form(...),
    client_id: str = Form(...),
    client_secret: str = Form(...),
    redirect_uri: str = Form(""),
):
    if grant_type != "authorization_code":
        raise HTTPException(400, "unsupported grant_type")

    client = _find_client(client_id)
    if not client or client.get("client_secret") != client_secret:
        raise HTTPException(400, "invalid client credentials")

    _clean_expired_codes()
    entry = _codes.pop(code, None)
    if not entry:
        raise HTTPException(400, "invalid or expired authorization code")
    if entry["client_id"] != client_id:
        raise HTTPException(400, "code was issued to a different client")
    if entry.get("redirect_uri") and redirect_uri and entry["redirect_uri"] != redirect_uri:
        raise HTTPException(400, "redirect_uri mismatch")

    access_token = create_access_token({"sub": str(entry["user_id"])})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60,
    }


@router.get("/userinfo")
async def userinfo(user: User = Depends(get_current_user)):
    return {
        "sub": str(user.id),
        "username": user.username,
        "display_name": user.display_name,
        "email": user.email,
        "role": user.role.value,
    }
