from __future__ import annotations
import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from models import User, ApiKey, RequestLog
from auth import get_current_user, get_admin_user
from database import get_db

router = APIRouter(prefix="/keys", tags=["keys"])

def _generate_key() -> str:
    return "sk-" + secrets.token_urlsafe(32)


# ── Student endpoints ──

@router.get("/my")
async def list_my_keys(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(
        select(ApiKey).where(ApiKey.user_id == user.id).order_by(desc(ApiKey.created_at))
    )
    keys = r.scalars().all()
    result = []
    # Add legacy key from users table
    if user.api_key:
        result.append({
            "id": 0, "name": "默认Key", "key": user.api_key[:16] + "..." + user.api_key[-8:],
            "full_key": user.api_key, "is_active": user.is_active,
            "usage_count": user.used_quota, "total_tokens": user.used_quota,
            "last_used_at": None,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        })
    for k in keys:
        result.append({
            "id": k.id, "name": k.name, "key": k.key[:16] + "..." + k.key[-8:],
            "full_key": k.key, "is_active": k.is_active,
            "usage_count": k.usage_count or 0, "total_tokens": k.total_tokens or 0,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            "created_at": k.created_at.isoformat() if k.created_at else None,
        })
    return result


@router.post("/create")
async def create_key(
    data: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Count existing keys
    r = await db.execute(select(func.count()).select_from(ApiKey).where(ApiKey.user_id == user.id))
    if (r.scalar() or 0) >= 5:
        raise HTTPException(400, "最多创建5个API Key")
    
    k = ApiKey(user_id=user.id, name=data.get("name", ""), key=_generate_key())
    db.add(k)
    await db.commit()
    await db.refresh(k)
    return {"id": k.id, "name": k.name, "key": k.key}


@router.post("/{key_id}/toggle")
async def toggle_key(
    key_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == user.id))
    k = r.scalar_one_or_none()
    if not k:
        raise HTTPException(404, "Key not found")
    k.is_active = not k.is_active
    await db.commit()
    return {"is_active": k.is_active}


@router.delete("/{key_id}")
async def delete_key(
    key_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == user.id))
    k = r.scalar_one_or_none()
    if not k:
        raise HTTPException(404, "Key not found")
    await db.delete(k)
    await db.commit()
    return {"ok": True}


# ── Admin endpoints ──

@router.get("/admin/all")
async def admin_list_keys(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_admin_user),
):
    r = await db.execute(
        select(ApiKey, User.username).join(User, ApiKey.user_id == User.id)
        .order_by(desc(ApiKey.created_at)).limit(200)
    )
    result = []
    for k, uname in r:
        result.append({
            "id": k.id, "user_id": k.user_id, "username": uname,
            "name": k.name, "key": k.key[:16] + "..." + k.key[-8:],
            "is_active": k.is_active, "usage_count": k.usage_count,
            "total_tokens": k.total_tokens,
            "created_at": k.created_at.isoformat() if k.created_at else None,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
        })
    return result


@router.post("/admin/{key_id}/toggle")
async def admin_toggle_key(
    key_id: int, data: dict,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_admin_user),
):
    r = await db.execute(select(ApiKey).where(ApiKey.id == key_id))
    k = r.scalar_one_or_none()
    if not k:
        raise HTTPException(404, "Key not found")
    k.is_active = data.get("is_active", not k.is_active)
    await db.commit()
    return {"ok": True}
