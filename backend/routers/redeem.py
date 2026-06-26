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
            r = await db.execute(select(RedeemCode).where(RedeemCode.code == code_val))
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
