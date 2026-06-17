from __future__ import annotations
import secrets, uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models import AutoGenConfig, AutoGenLog, RedeemCode, User
from auth import get_admin_user
from database import get_db

router = APIRouter(prefix="/admin/autogen", tags=["autogen"])


@router.get("/configs")
async def list_configs(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    r = await db.execute(select(AutoGenConfig).order_by(AutoGenConfig.amount))
    return r.scalars().all()


@router.post("/configs")
async def save_config(
    data: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    amount = data.get("amount", 0)
    if not amount:
        raise HTTPException(400, "amount required")
    r = await db.execute(select(AutoGenConfig).where(AutoGenConfig.amount == amount))
    cfg = r.scalar_one_or_none()
    if not cfg:
        cfg = AutoGenConfig(amount=amount)
        db.add(cfg)
    cfg.enabled = data.get("enabled", False)
    cfg.min_stock = data.get("min_stock", 10)
    cfg.batch_size = data.get("batch_size", 10)
    await db.commit()
    await db.refresh(cfg)
    return cfg


@router.delete("/configs/{config_id}")
async def delete_config(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    r = await db.execute(select(AutoGenConfig).where(AutoGenConfig.id == config_id))
    cfg = r.scalar_one_or_none()
    if cfg:
        await db.delete(cfg)
        await db.commit()
    return {"ok": True}


@router.get("/logs")
async def list_logs(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    from sqlalchemy import desc
    r = await db.execute(select(AutoGenLog).order_by(desc(AutoGenLog.created_at)).limit(100))
    return r.scalars().all()


# ── Trigger function (called by external API or manual) ──

async def check_and_autogen(db: AsyncSession, amount: int):
    """Check stock for a denomination and auto-generate if below threshold."""
    r = await db.execute(select(AutoGenConfig).where(
        AutoGenConfig.amount == amount,
        AutoGenConfig.enabled == True
    ))
    cfg = r.scalar_one_or_none()
    if not cfg:
        return None

    # Count current unused, unreserved stock
    stock_r = await db.execute(
        select(func.count()).select_from(RedeemCode).where(
            RedeemCode.amount == amount,
            RedeemCode.is_used == False,
            RedeemCode.reserved_at == None
        )
    )
    stock = stock_r.scalar() or 0

    if stock >= cfg.min_stock:
        return {"amount": amount, "stock": stock, "min_stock": cfg.min_stock, "triggered": False}

    # Generate batch
    batch_id = uuid.uuid4().hex[:8]
    count = cfg.batch_size
    for _ in range(count):
        for _ in range(100):
            code_val = secrets.token_hex(8).upper()
            r = await db.execute(select(RedeemCode).where(RedeemCode.code == code_val))
            if not r.scalar_one_or_none():
                break
        db.add(RedeemCode(code=code_val, amount=amount, batch_id=batch_id))

    # Log
    db.add(AutoGenLog(
        amount=amount,
        count=count,
        batch_id=batch_id,
        trigger_stock=stock,
    ))

    await db.commit()
    return {"amount": amount, "stock": stock + count, "min_stock": cfg.min_stock, "triggered": True, "batch_id": batch_id, "generated": count}
