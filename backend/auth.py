from __future__ import annotations
import secrets
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from config import settings
from database import get_db
from models import User, UserRole, ApiKey

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    # Normalize $2b$ to $2a$ for passlib compat
    hashed_fixed = hashed.replace("$2b$", "$2a$")
    return pwd_context.verify(plain, hashed_fixed)


def generate_api_key() -> str:
    return "sk-" + secrets.token_urlsafe(32)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    # ── Try New-Api-User header first (web console via new-api proxy) ──
    newapi_user_id = request.headers.get("New-Api-User") or request.headers.get("new-api-user")
    if newapi_user_id:
        try:
            import sqlite3
            conn = sqlite3.connect(f"file:{settings.newapi_db_path}?mode=ro", uri=True)
            row = conn.execute(
                "SELECT id, username, role FROM users WHERE id=? AND deleted_at IS NULL",
                (int(newapi_user_id),),
            ).fetchone()
            conn.close()
            if row:
                username = row[1]
                role = row[2]
                result = await db.execute(select(User).where(User.username == username))
                user = result.scalar_one_or_none()
                if user:
                    if role >= 100 and user.role != UserRole.admin:
                        user.role = UserRole.admin
                        await db.commit()
                    if user.is_active:
                        return user
                # Create shadow record if first access
                admin_role = UserRole.admin if role >= 100 else UserRole.student
                new_user = User(
                    username=username,
                    display_name=username,
                    hashed_password="",
                    role=admin_role,
                    quota=0,
                    api_key="newapi-shadow-" + str(int(newapi_user_id)),
                    is_active=True,
                )
                db.add(new_user)
                await db.commit()
                await db.refresh(new_user)
                return new_user
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid New-Api-User")

    # ── Standard auth: Bearer / x-api-key / JWT / legacy keys ──
    token = None
    if credentials:
        token = credentials.credentials

    if not token:
        token = request.headers.get("x-api-key")

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing credentials")

    # Try JWT (admin web)
    payload = decode_token(token)
    if payload:
        user_id = payload.get("sub")
        if user_id:
            result = await db.execute(select(User).where(User.id == int(user_id)))
            user = result.scalar_one_or_none()
            if user and user.is_active:
                return user

    # Try primary API key (student API - legacy)
    result = await db.execute(select(User).where(User.api_key == token))
    user = result.scalar_one_or_none()
    if user and user.is_active:
        return user

    # Try user_api_keys table
    result = await db.execute(select(ApiKey).where(ApiKey.key == token, ApiKey.is_active == True))
    apikey = result.scalar_one_or_none()
    if apikey:
        result = await db.execute(select(User).where(User.id == apikey.user_id))
        user = result.scalar_one_or_none()
        if user and user.is_active:
            # Update usage stats
            apikey.usage_count = (apikey.usage_count or 0) + 1
            apikey.last_used_at = datetime.now()
            await db.commit()
            return user

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return current_user
