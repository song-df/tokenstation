from __future__ import annotations
import secrets, uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr
from models import User, UserRole, Referral, EmailVerification
from auth import hash_password, generate_api_key, get_current_user, get_admin_user
from database import get_db
from config import settings

router = APIRouter(prefix="/public", tags=["public"])

# T粒奖励：验证邮箱成功赠送
EMAIL_VERIFY_TLI = 50  # T粒
EMAIL_VERIFY_QUOTA = EMAIL_VERIFY_TLI * 690  # new-api quota 单位
NEWAPI_DB = "/opt/newapi/data/data.db"


class RegisterBody(BaseModel):
    username: str
    email: str
    password: str
    referral_code: str = ""


class SendCodeBody(BaseModel):
    email: str


class VerifyCodeBody(BaseModel):
    email: str
    code: str


@router.post("/send-code")
async def send_verify_code(data: SendCodeBody, db: AsyncSession = Depends(get_db)):
    email = data.email.strip().lower()
    # Check if email already registered in old backend
    r = await db.execute(select(User).where(User.email == email))
    if r.scalar_one_or_none():
        raise HTTPException(400, "该邮箱已注册")

    # Also check new-api DB
    try:
        import sqlite3
        conn = sqlite3.connect(NEWAPI_DB)
        row = conn.execute("SELECT id FROM users WHERE email = ? AND deleted_at IS NULL", (email,)).fetchone()
        conn.close()
        if row:
            raise HTTPException(400, "该邮箱已被其他账号绑定，请更换邮箱")
    except HTTPException:
        raise
    except Exception:
        pass  # new-api DB unreachable — skip check

    # Generate a 6-digit code
    code = str(secrets.randbelow(900000) + 100000)
    expires = datetime.now() + timedelta(minutes=10)

    # Save code
    v = EmailVerification(email=email, code=code, expires_at=expires)
    db.add(v)
    await db.commit()

    # Send email via QQ SMTP
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.header import Header
        from email.utils import formataddr, formatdate

        body = f"您的验证码是：{code}，10分钟内有效。\n\n验证后即可获得 50 T粒奖励！\n\n—— T粒加油站"
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = Header(f"T粒加油站 - 邮箱验证码 {code}", "utf-8")
        # QQ SMTP requires plain email as From, display name in Header
        msg["From"] = formataddr((settings.smtp_from_name, settings.smtp_user))
        msg["Date"] = formatdate(localtime=True)
        msg["To"] = email

        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port) as server:
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_user, [email], msg.as_string())
    except Exception as e:
        import logging
        logging.getLogger("uvicorn").error(f"SMTP send failed: {e}")
        raise HTTPException(500, f"邮件发送失败，请稍后重试")

    return {"message": "验证码已发送"}


@router.post("/verify-email")
async def verify_email_and_reward(data: VerifyCodeBody, request: Request, db: AsyncSession = Depends(get_db)):
    """Verify email code and grant T粒 reward via new-api DB."""
    email = data.email.strip().lower()

    # Find latest unverified code for this email
    r = await db.execute(
        select(EmailVerification)
        .where(EmailVerification.email == email, EmailVerification.is_verified == False)
        .order_by(EmailVerification.created_at.desc())
    )
    v = r.scalars().first()
    if not v:
        raise HTTPException(400, "请先获取验证码")
    if v.expires_at < datetime.now():
        raise HTTPException(400, "验证码已过期")
    if v.code != data.code.strip():
        raise HTTPException(400, "验证码错误")

    # Mark as verified
    v.is_verified = True
    await db.commit()

    # Check if reward already claimed (one-time only)
    r = await db.execute(
        select(EmailVerification)
        .where(EmailVerification.email == email, EmailVerification.is_verified == True)
    )
    if len(r.scalars().all()) > 1:
        # Already claimed before
        return {"message": "邮箱已验证", "reward_tli": 0, "note": "奖励已领取过"}

    # Grant T粒 in new-api DB (direct SQLite write)
    try:
        import sqlite3
        conn = sqlite3.connect(NEWAPI_DB)
        napi_user = conn.execute(
            "SELECT id, quota FROM users WHERE email = ? AND deleted_at IS NULL", (email,)
        ).fetchone()
        if napi_user:
            conn.execute(
                "UPDATE users SET quota = quota + ? WHERE id = ?",
                (EMAIL_VERIFY_QUOTA, napi_user[0]),
            )
            conn.commit()
            conn.close()
            return {
                "message": "邮箱验证成功",
                "reward_tli": EMAIL_VERIFY_TLI,
                "reward_quota": EMAIL_VERIFY_QUOTA,
            }
        conn.close()
        return {"message": "邮箱验证成功（new-api未找到对应用户）", "reward_tli": 0}
    except Exception as e:
        return {"message": f"邮箱已验证，但T粒发放失败: {e}", "reward_tli": 0}


@router.post("/register")
async def register(data: RegisterBody, db: AsyncSession = Depends(get_db)):
    email = data.email.strip().lower()
    username = data.username.strip()

    # Check username uniqueness
    r = await db.execute(select(User).where(User.username == username))
    if r.scalar_one_or_none():
        raise HTTPException(400, "用户名已存在")

    # Check email uniqueness
    r = await db.execute(select(User).where(User.email == email))
    if r.scalar_one_or_none():
        raise HTTPException(400, "该邮箱已注册")

# Create user
    ref_code = uuid.uuid4().hex[:12]
    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(data.password),
        role=UserRole.student,
        quota=0,  # 注册不赠送1000点
        api_key=generate_api_key(),
        referral_code=ref_code,
    )
    db.add(user)
    await db.flush()

    # Handle referral relationship (rewards handled by new-api affiliate system)
    if data.referral_code:
        r = await db.execute(select(User).where(User.referral_code == data.referral_code))
        referrer = r.scalar_one_or_none()
        if referrer and referrer.id != user.id:
            db.add(Referral(referrer_id=referrer.id, referred_id=user.id))

    await db.commit()
    await db.refresh(user)

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "quota": user.quota,
        "api_key": user.api_key,
        "referral_code": user.referral_code,
    }
