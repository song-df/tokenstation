from __future__ import annotations
import secrets, uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr
from models import User, UserRole, Referral, TopUp, RedeemCode
from auth import hash_password, generate_api_key, get_current_user, get_admin_user
from database import get_db

router = APIRouter(prefix="/public", tags=["public"])


class RegisterBody(BaseModel):
    username: str
    email: str
    password: str
    referral_code: str = ""


class SendCodeBody(BaseModel):
    email: str


@router.post("/send-code")
async def send_verify_code(data: SendCodeBody, db: AsyncSession = Depends(get_db)):
    email = data.email.strip().lower()
    # Check if email already registered
    r = await db.execute(select(User).where(User.email == email))
    if r.scalar_one_or_none():
        raise HTTPException(400, "该邮箱已注册")

    # Generate a 6-digit code
    code = str(secrets.randbelow(900000) + 100000)
    expires = datetime.now() + timedelta(minutes=10)

    # Save to DB (in production, send email instead)
    v = EmailVerification(email=email, code=code, expires_at=expires)
    db.add(v)
    await db.commit()

    # In production: send email. For now, return code in dev mode.
    return {"message": "验证码已发送", "code": code if "localhost" in str(db.bind.url) else None}


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

    # Handle referral
    if data.referral_code:
        r = await db.execute(select(User).where(User.referral_code == data.referral_code))
        referrer = r.scalar_one_or_none()
        if referrer and referrer.id != user.id:
            # Create referral relationship
            db.add(Referral(referrer_id=referrer.id, referred_id=user.id))
            # Give both 1000 bonus
            referrer.quota += 1000
            user.quota += 1000
            db.add(TopUp(user_id=referrer.id, amount=100, remark=f"推荐用户 {username} 奖励"))
            db.add(TopUp(user_id=user.id, amount=100, remark=f"通过推荐码注册奖励"))

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
