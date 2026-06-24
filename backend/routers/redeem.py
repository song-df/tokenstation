from __future__ import annotations
import secrets, uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, Integer
from pydantic import BaseModel
from models import User, RedeemCode, CourseInviteCode, Referral, TopUp, UserTask
from routers.autogen import check_and_autogen
from auth import get_current_user, get_admin_user
from database import get_db

router = APIRouter(prefix="/redeem", tags=["redeem"])


class GenerateCodesBody(BaseModel):
    amount: int
    count: int
    remark: str = ""


class UseCodeBody(BaseModel):
    code: str


# ── Admin: generate redemption codes ──

@router.post("/admin/generate")
async def generate_codes(
    data: GenerateCodesBody,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    batch_id = uuid.uuid4().hex[:8]
    codes = []
    for _ in range(data.count):
        for _ in range(100):  # collision safety
            code_val = secrets.token_hex(8).upper()
            r = await db.execute(select(CourseInviteCode).where(CourseInviteCode.code == code_val))
            if not r.scalar_one_or_none():
                break
        c = RedeemCode(code=code_val, amount=data.amount, created_by=admin.id, batch_id=batch_id)
        db.add(c)
        codes.append({"code": c.code, "amount": c.amount})
    await db.commit()
    return {"batch_id": batch_id, "count": len(codes), "codes": codes}


@router.get("/admin/list")
async def list_codes(
    batch_id: str = "",
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    q = select(RedeemCode)
    if batch_id:
        q = q.where(RedeemCode.batch_id == batch_id)
    q = q.order_by(desc(RedeemCode.created_at)).limit(200)
    r = await db.execute(q)
    return r.scalars().all()



@router.get("/admin/batches")
async def list_batches(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """List all batch summaries with creation info."""
    r = await db.execute(
        select(
            RedeemCode.batch_id,
            func.min(RedeemCode.created_at).label("created_at"),
            func.count().label("total"),
            func.sum(RedeemCode.amount).label("amount"),
            func.sum(RedeemCode.is_used.cast(Integer)).label("used_count"),
        )
        .group_by(RedeemCode.batch_id)
        .order_by(desc("created_at"))
    )
    batches = []
    for row in r:
        batches.append({
            "batch_id": row.batch_id,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "total": row.total,
            "used_count": row.used_count or 0,
            "amount_per_code": (row.amount or 0) // (row.total or 1),
        })
    return batches


@router.get("/admin/stats")
async def code_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    r1 = await db.execute(select(func.count()).select_from(RedeemCode))
    total_val = r1.scalar() or 0
    r2 = await db.execute(select(func.count()).select_from(RedeemCode).where(RedeemCode.is_used == True))
    used_val = r2.scalar() or 0
    r3 = await db.execute(select(func.sum(RedeemCode.amount)).select_from(RedeemCode).where(RedeemCode.is_used == True))
    total_redeemed = r3.scalar() or 0
    return {
        "total": total_val,
        "used": used_val,
        "unused": total_val - used_val,
        "total_redeemed": total_redeemed,
    }



@router.post("/external/codes")
async def get_codes_external(
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """External API: get unused codes. POST JSON with system_secret, amount, batch_id, limit."""
    from config import settings
    secret = data.get("system_secret", "")
    if not secret or secret != settings.system_api_secret:
        raise HTTPException(403, "Invalid system secret")

    batch_id = data.get("batch_id", "")
    amount = data.get("amount", 0)
    limit = data.get("limit", 0)

    # Only return codes that have never been reserved or shipped
    q = select(RedeemCode).where(
        RedeemCode.is_used == False,
        RedeemCode.is_shipped == False,
        RedeemCode.reserved_at == None
    )
    if batch_id:
        q = q.where(RedeemCode.batch_id == batch_id)
    if amount:
        q = q.where(RedeemCode.amount == amount)
    q = q.order_by(RedeemCode.created_at)
    if limit > 0:
        q = q.limit(limit)
    r = await db.execute(q)
    codes = r.scalars().all()
    # Mark as reserved
    now = datetime.now()
    for c in codes:
        c.reserved_at = now
    await db.commit()
    # Trigger auto-gen check for this denomination
    if amount:
        await check_and_autogen(db, amount)
    return {
        "batch_id": batch_id or "all",
        "amount": amount,
        "count": len(codes),
        "codes": [{"code": c.code, "amount": c.amount, "batch_id": c.batch_id, "created_at": c.created_at.isoformat()} for c in codes],
    }


@router.post("/external/allocate")
async def allocate_code(
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """External API: allocate ONE unused+unshipped code of a specific amount.
    Marks it as shipped so it won't be allocated again.
    POST JSON: { "system_secret": "...", "amount": 1000 }
    Returns: { "code": "...", "amount": 1000 } or 404 if none available.
    """
    from config import settings
    secret = data.get("system_secret", "")
    if not secret or secret != settings.system_api_secret:
        raise HTTPException(403, "Invalid system secret")

    amount = data.get("amount", 0)
    if not amount or amount <= 0:
        raise HTTPException(400, "Invalid amount")

    # Find one available code: not used, not shipped, not reserved
    r = await db.execute(
        select(RedeemCode)
        .where(
            RedeemCode.amount == amount,
            RedeemCode.is_used == False,
            RedeemCode.is_shipped == False,
            RedeemCode.reserved_at == None,
        )
        .order_by(RedeemCode.created_at)
        .limit(1)
    )
    code = r.scalar_one_or_none()
    if not code:
        raise HTTPException(404, f"No available codes for amount {amount}")

    # Mark as shipped
    code.is_shipped = True
    code.shipped_at = datetime.now()
    await db.commit()

    # Trigger auto-gen check
    await check_and_autogen(db, amount)

    return {
        "code": code.code,
        "amount": code.amount,
        "batch_id": code.batch_id,
        "created_at": code.created_at.isoformat(),
    }


# ── External: verify code (called by course platform) ──

@router.post("/external/verify")
async def verify_code(
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """External API: verify a course invite code.
    Called by the course platform when a student uses an invite code during registration.
    POST JSON: { "system_secret": "...", "code": "..." }
    Returns: { "valid": true, "code": "...", "amount": 1000 } or 404 if invalid.
    Marks the code as used after verification.
    """
    from config import settings
    secret = data.get("system_secret", "")
    if not secret or secret != settings.system_api_secret:
        raise HTTPException(403, "Invalid system secret")

    code_val = data.get("code", "").strip().upper()
    if not code_val:
        raise HTTPException(400, "Missing code")

    r = await db.execute(select(CourseInviteCode).where(CourseInviteCode.code == code_val))
    rc = r.scalar_one_or_none()
    if not rc:
        raise HTTPException(404, "邀请码不存在")
    if rc.is_used:
        raise HTTPException(400, "该邀请码已被使用")

    # Mark as consumed
    rc.is_used = True
    rc.used_at = datetime.now()
    rc.reserved_at = None
    await db.commit()

    return {
        "valid": True,
        "code": rc.code,
        "amount": rc.amount,
        "batch_id": rc.batch_id,
        "used_at": rc.used_at.isoformat() if rc.used_at else None,
    }


# ── Student: use a code ──

@router.post("/use")
async def use_code(
    data: UseCodeBody,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(select(RedeemCode).where(RedeemCode.code == data.code.upper()))
    rc = r.scalar_one_or_none()
    if not rc:
        raise HTTPException(404, "兑换码不存在")
    if rc.is_used:
        raise HTTPException(400, "该兑换码已被使用")

    amount = rc.amount

    # Mark code as used
    rc.is_used = True
    rc.used_by = user.id
    rc.used_at = datetime.now()
    rc.reserved_at = None   # clear reservation
    rc.is_shipped = False   # clear shipped flag
    rc.shipped_at = None

    # Add tokens to user
    user.quota += amount
    db.add(TopUp(user_id=user.id, amount=amount, payment_amount=amount * 0.01, remark=f"兑换码 {rc.code}"))

    # First redeem bonus
    tr = await db.execute(select(UserTask).where(
        UserTask.user_id == user.id, UserTask.task_key == "first_redeem", UserTask.is_completed == True
    ))
    if not tr.scalar_one_or_none():
        t = UserTask(user_id=user.id, task_key="first_redeem", is_completed=True, completed_at=datetime.now())
        db.add(t)
        user.quota += 50
        db.add(TopUp(user_id=user.id, amount=50, remark="首次兑换额外奖励"))
        await db.flush()

    # Referral commission: 10% to referrer
    rr = await db.execute(select(Referral).where(Referral.referred_id == user.id))
    referral = rr.scalar_one_or_none()
    if referral:
        commission = int(amount * 0.1)
        if commission > 0:
            rr2 = await db.execute(select(User).where(User.id == referral.referrer_id))
            referrer = rr2.scalar_one_or_none()
            if referrer:
                referrer.quota += commission
                db.add(TopUp(user_id=referrer.id, amount=commission,
                             payment_amount=commission * 0.01, remark=f"推荐用户 {user.username} 兑换返利 10%"))

    await db.commit()
    return {"amount": amount, "quota": user.quota}
