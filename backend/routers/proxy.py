"""
Proxy subscription API — student-facing endpoints.

Auth: reads New-Api-User header (set by new-api frontend), validates against
new-api database, and resolves to (user_id, username).
"""
from __future__ import annotations

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import ProxyPlan, ProxySubscription, ProxyTopUp, RedeemCode, CourseInviteCode
from services.proxy import (
    subscribe_user,
    cancel_subscription,
    expire_check,
    generate_flclash_yaml,
    get_tli_balance,
    NEWAPI_DB_PATH,
)
import sqlite3

logger = logging.getLogger("proxy")
router = APIRouter(prefix="/proxy", tags=["proxy"])


# ── Auth dependency ─────────────────────────────────────────────────────────

def _newapi_readonly() -> sqlite3.Connection:
    """Read-only connection to new-api database."""
    conn = sqlite3.connect(f"file:{NEWAPI_DB_PATH}?mode=ro", uri=True)
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

    # Verify user exists in new-api DB
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

class SubscribeBody(BaseModel):
    plan_id: int
    days: int = 1


# ── GET /api/proxy/status ────────────────────────────────────────────────────

@router.get("/status")
async def get_proxy_status(
    proxy_user: dict = Depends(get_proxy_user),
    db: AsyncSession = Depends(get_db),
):
    """Current subscription status, available plans, and T粒 balance."""
    user_id = proxy_user["user_id"]
    await expire_check(db)

    # Available plans
    plans_r = await db.execute(
        select(ProxyPlan).where(ProxyPlan.is_active == True).order_by(ProxyPlan.days)
    )
    plans = [
        {"id": p.id, "name": p.name, "days": p.days, "price": p.price}
        for p in plans_r.scalars().all()
    ]

    # T粒 balance from new-api
    try:
        tli_balance = get_tli_balance(user_id)
    except Exception:
        tli_balance = 0

    # Current subscription
    sub_r = await db.execute(
        select(ProxySubscription).where(
            ProxySubscription.user_id == user_id,
            ProxySubscription.canceled_at == None,
        )
    )
    sub = sub_r.scalar_one_or_none()

    subscription = None
    if sub:
        now = datetime.now()
        if sub.expires_at > now:
            days_remaining = max(0, (sub.expires_at - now).days + 1)
            subscription = {
                "id": sub.id,
                "started_at": sub.started_at.isoformat() if sub.started_at else None,
                "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
                "total_days": sub.total_days,
                "tli_spent": sub.tli_spent,
                "days_remaining": days_remaining,
            }

    # Purchase history
    history_r = await db.execute(
        select(ProxyTopUp)
        .where(ProxyTopUp.user_id == user_id)
        .order_by(ProxyTopUp.created_at.desc())
        .limit(20)
    )
    history = [
        {
            "id": h.id,
            "days": h.days,
            "tli_amount": h.tli_amount,
            "remark": h.remark,
            "created_at": h.created_at.isoformat() if h.created_at else None,
        }
        for h in history_r.scalars().all()
    ]

    return {
        "tli_balance": tli_balance,
        "plans": plans,
        "subscription": subscription,
        "history": history,
    }


# ── POST /api/proxy/subscribe ────────────────────────────────────────────────

@router.post("/subscribe")
async def do_subscribe(
    data: SubscribeBody,
    proxy_user: dict = Depends(get_proxy_user),
    db: AsyncSession = Depends(get_db),
):
    """Purchase or renew proxy subscription with T粒."""
    user_id = proxy_user["user_id"]
    await expire_check(db)

    if data.days < 1 or data.days > 365:
        raise HTTPException(400, "天数需在 1-365 之间")

    # Look up plan
    plan_r = await db.execute(select(ProxyPlan).where(ProxyPlan.id == data.plan_id))
    plan = plan_r.scalar_one_or_none()
    if not plan or not plan.is_active:
        raise HTTPException(404, "套餐不存在或已下线")

    result = await subscribe_user(db, user_id, plan, data.days)
    return {
        "message": "订阅成功",
        **result,
    }


# ── POST /api/proxy/cancel ───────────────────────────────────────────────────

@router.post("/cancel")
async def do_cancel(
    proxy_user: dict = Depends(get_proxy_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel current subscription (no refund)."""
    user_id = proxy_user["user_id"]
    await cancel_subscription(db, user_id)
    return {"message": "订阅已取消"}


# ── GET /api/proxy/config ────────────────────────────────────────────────────

@router.get("/config")
async def download_config(
    proxy_user: dict = Depends(get_proxy_user),
    db: AsyncSession = Depends(get_db),
):
    """Download personalized FlClash YAML configuration."""
    user_id = proxy_user["user_id"]
    username = proxy_user["username"]
    await expire_check(db)

    sub_r = await db.execute(
        select(ProxySubscription).where(
            ProxySubscription.user_id == user_id,
            ProxySubscription.canceled_at == None,
            ProxySubscription.expires_at > datetime.now(),
        )
    )
    sub = sub_r.scalar_one_or_none()
    if not sub:
        raise HTTPException(404, "没有活跃的代理订阅，请先订阅")

    expires_str = sub.expires_at.strftime("%Y-%m-%d %H:%M") if sub.expires_at else ""
    yaml_content = generate_flclash_yaml(username, sub.hy2_password, sub.hy2_port, expires_str)

    return Response(
        content=yaml_content,
        media_type="application/x-yaml",
        headers={
            "Content-Disposition": f"attachment; filename=clash-{username}.yaml"
        },
    )


# ── GET /api/proxy/referral ─────────────────────────────────────────────────

@router.get("/referral")
async def get_referral(
    proxy_user: dict = Depends(get_proxy_user),
):
    """Get referral stats and referred users with their top-up amounts."""
    user_id = proxy_user["user_id"]
    result = {"referral_code": "", "referral_count": 0, "referral_quota": 0, "referees": []}

    try:
        with _newapi_readonly() as db:
            user_row = db.execute(
                "SELECT aff_code, aff_count, aff_quota FROM users WHERE id = ? AND deleted_at IS NULL",
                (user_id,),
            ).fetchone()
            if not user_row:
                return result

            result["referral_code"] = user_row["aff_code"] or ""
            result["referral_count"] = user_row["aff_count"] or 0
            result["referral_quota"] = (user_row["aff_quota"] or 0) / 690

            # Referred users
            referees = db.execute(
                "SELECT id, username, display_name, quota, created_at FROM users WHERE inviter_id = ? AND deleted_at IS NULL ORDER BY created_at DESC",
                (user_id,),
            ).fetchall()

            for r in referees:
                # Sum top-ups for this referred user
                topup_row = db.execute(
                    "SELECT COALESCE(SUM(amount), 0) FROM top_ups WHERE user_id = ? AND status = 'completed'",
                    (r["id"],),
                ).fetchone()
                total_topup = (topup_row[0] or 0) / 690 if topup_row else 0

                result["referees"].append({
                    "user_id": r["id"],
                    "username": r["username"],
                    "display_name": r["display_name"] or r["username"],
                    "quota": (r["quota"] or 0) / 690,
                    "total_topup": total_topup,
                    "joined_at": r["created_at"],
                })
    except Exception as e:
        logger.warning(f"Referral lookup failed: {e}")

    return result


# ── POST /api/proxy/course ──────────────────────────────────────────────────

class CoursePurchaseBody(BaseModel):
    pass  # No params needed — fixed 1000 T粒


@router.post("/course")
async def purchase_course(
    _data: CoursePurchaseBody,
    proxy_user: dict = Depends(get_proxy_user),
    db: AsyncSession = Depends(get_db),
):
    """Purchase a course invite code for 1000 T粒."""
    from services.proxy import deduct_tli, get_tli_balance
    from config import settings
    

    user_id = proxy_user["user_id"]

    # Check balance
    balance = get_tli_balance(user_id)
    price = int(getattr(settings, "course_price_tli", 1000))
    if balance < price:
        raise HTTPException(400, f"T粒余额不足，需要 {price} T粒，当前余额 {balance:.0f} T粒")

    # Deduct T粒
    try:
        deduct_tli(user_id, price)
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Allocate one available RedeemCode from local pool
    r = await db.execute(
        select(CourseInviteCode)
        .where(
            CourseInviteCode.amount == price,
            CourseInviteCode.is_used == False,
            CourseInviteCode.is_shipped == False,
        )
        .order_by(CourseInviteCode.created_at)
        .limit(1)
    )
    code_row = r.scalar_one_or_none()
    if not code_row:
        # Refund: no codes available
        conn = sqlite3.connect(f"file:{NEWAPI_DB_PATH}?mode=rw", uri=True)
        conn.execute(
            "UPDATE users SET quota = quota + ?, used_quota = used_quota - ? WHERE id = ?",
            (price * 690, price * 690, user_id),
        )
        conn.commit(); conn.close()
        raise HTTPException(502, "获取邀请码失败，T粒已退回（无可用码）")

    code_row.is_shipped = True
    code_row.purchased_by = user_id
    code_row.purchased_at = datetime.now()
    code_row.shipped_at = datetime.now()
    await db.commit()

    return {
        "message": "购买成功",
        "code": code_row.code,
        "tli_spent": price,
        "tli_balance": get_tli_balance(user_id),
    }




# ── GET /api/proxy/course-codes ────────────────────────────────────────────

@router.get("/course-codes")
async def list_course_codes(
    proxy_user: dict = Depends(get_proxy_user),
    db: AsyncSession = Depends(get_db),
):
    """List course invite codes purchased by the current student, with state."""
    user_id = proxy_user["user_id"]

    r = await db.execute(
        select(CourseInviteCode)
        .where(CourseInviteCode.purchased_by == user_id)
        .order_by(CourseInviteCode.purchased_at.desc())
        .limit(50)
    )
    codes = r.scalars().all()

    def _state(c: RedeemCode) -> str:
        """Human-readable state of the code."""
        if c.is_used:
            return "used"       # consumed by course platform
        if c.is_shipped:
            return "shipped"    # purchased, not yet used
        return "unknown"

    return [
        {
            "id": c.id,
            "code": c.code,
            "amount": c.amount,
            "state": _state(c),
            "purchased_at": c.purchased_at.isoformat() if c.purchased_at else None,
            "used_at": c.used_at.isoformat() if c.used_at else None,
        }
        for c in codes
    ]



# ── Admin auth dependency ───────────────────────────────────────────────────

async def get_proxy_admin(request: Request) -> dict:
    """Extract user_id from New-Api-User header and verify admin role in new-api DB."""
    user_id_str = request.headers.get("New-Api-User") or request.headers.get("new-api-user")
    if not user_id_str:
        raise HTTPException(401, "缺少用户认证信息")

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise HTTPException(401, "无效的用户认证信息")

    try:
        with _newapi_readonly() as db:
            row = db.execute(
                "SELECT id, username, role FROM users WHERE id = ? AND deleted_at IS NULL",
                (user_id,),
            ).fetchone()
    except Exception:
        raise HTTPException(500, "无法验证用户信息")

    if not row:
        raise HTTPException(401, "用户不存在或已注销")
    if int(row["role"]) < 100:
        raise HTTPException(403, "需要管理员权限")

    return {"user_id": row["id"], "username": row["username"]}


# ── Admin: subscriptions ────────────────────────────────────────────────────

@router.get("/admin/subscriptions")
async def admin_list_subs(
    proxy_admin: dict = Depends(get_proxy_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all proxy subscriptions with user info."""
    await expire_check(db)
    now = datetime.now()

    r = await db.execute(
        select(ProxySubscription).order_by(ProxySubscription.created_at.desc())
    )
    result = []
    for sub in r.scalars().all():
        # Look up username from new-api DB
        username = f"user_{sub.user_id}"
        try:
            with _newapi_readonly() as ndb:
                urow = ndb.execute(
                    "SELECT username FROM users WHERE id = ?", (sub.user_id,)
                ).fetchone()
                if urow:
                    username = urow["username"]
        except Exception:
            pass

        is_active = sub.expires_at and sub.expires_at > now and not sub.canceled_at
        days_remaining = max(0, (sub.expires_at - now).days + 1) if sub.expires_at and not sub.canceled_at else 0

        result.append({
            "id": sub.id,
            "user_id": sub.user_id,
            "username": username,
            "plan_id": sub.plan_id,
            "total_days": sub.total_days,
            "started_at": sub.started_at.isoformat() if sub.started_at else None,
            "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
            "canceled_at": sub.canceled_at.isoformat() if sub.canceled_at else None,
            "tli_spent": sub.tli_spent,
            "is_active": is_active,
            "days_remaining": days_remaining,
        })
    return result


@router.post("/admin/subscriptions/{sub_id}/cancel")
async def admin_cancel_subs(
    sub_id: int,
    proxy_admin: dict = Depends(get_proxy_admin),
    db: AsyncSession = Depends(get_db),
):
    """Force-cancel a subscription."""
    r = await db.execute(select(ProxySubscription).where(ProxySubscription.id == sub_id))
    sub = r.scalar_one_or_none()
    if not sub:
        raise HTTPException(404, "Subscription not found")
    sub.canceled_at = datetime.now()
    await db.commit()
    from services.proxy import sync_singbox
    await sync_singbox(db)
    return {"ok": True}


# ── Admin: plans ─────────────────────────────────────────────────────────────

@router.get("/admin/plans")
async def admin_list_plans(
    proxy_admin: dict = Depends(get_proxy_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all proxy plans."""
    r = await db.execute(select(ProxyPlan).order_by(ProxyPlan.days))
    return [
        {"id": p.id, "name": p.name, "days": p.days, "price": p.price, "is_active": p.is_active}
        for p in r.scalars().all()
    ]


class PlanBody(BaseModel):
    name: str
    days: int
    price: float
    is_active: bool = True


@router.post("/admin/plans")
async def admin_create_plan(
    data: PlanBody,
    proxy_admin: dict = Depends(get_proxy_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new proxy plan."""
    plan = ProxyPlan(name=data.name, days=data.days, price=data.price, is_active=data.is_active)
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return {"id": plan.id, "name": plan.name, "days": plan.days, "price": plan.price, "is_active": plan.is_active}


@router.put("/admin/plans/{plan_id}")
async def admin_update_plan(
    plan_id: int,
    data: PlanBody,
    proxy_admin: dict = Depends(get_proxy_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a proxy plan."""
    r = await db.execute(select(ProxyPlan).where(ProxyPlan.id == plan_id))
    plan = r.scalar_one_or_none()
    if not plan:
        raise HTTPException(404, "Plan not found")
    plan.name = data.name
    plan.days = data.days
    plan.price = data.price
    await db.commit()
    return {"id": plan.id, "name": plan.name, "days": plan.days, "price": plan.price, "is_active": plan.is_active}


# ── 消费统计 ──────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_consumption_stats(
    period: str = "day",
    proxy_user: dict = Depends(get_proxy_user),
):
    """Return aggregated consumption by time buckets.
    period: day (hourly), week (daily), month (daily)
    """
    import sqlite3, time
    from datetime import datetime, timedelta
    from services.proxy import NEWAPI_DB_PATH, Tli_PER_QUOTA

    user_id = proxy_user["user_id"]
    now = int(time.time())

    if period == "day":
        start = now - 86400
        bucket_fmt = "%H:00"
        bucket_step = 3600
        buckets = 24
    elif period == "week":
        start = now - 86400 * 7
        bucket_fmt = "%m/%d"
        bucket_step = 86400
        buckets = 7
    elif period == "month":
        start = now - 86400 * 30
        bucket_fmt = "%m/%d"
        bucket_step = 86400
        buckets = 30
    else:
        start = now - 86400
        bucket_fmt = "%H:00"
        bucket_step = 3600
        buckets = 24

    db = sqlite3.connect(f"file:{NEWAPI_DB_PATH}?mode=ro", uri=True)
    db.row_factory = sqlite3.Row

    rows = db.execute(
        "SELECT created_at, quota FROM logs WHERE user_id = ? AND type = 2 AND created_at >= ? ORDER BY created_at",
        (user_id, start),
    ).fetchall()

    # Build bucket labels
    bucket_labels = []
    for i in range(buckets - 1, -1, -1):
        t = now - i * bucket_step
        bucket_labels.append(datetime.fromtimestamp(t).strftime(bucket_fmt))

    # Initialize all buckets to 0
    bucket_data = {label: 0.0 for label in bucket_labels}

    # Aggregate rows into buckets
    for row in rows:
        ts = row["created_at"]
        bucket_idx = (ts - start) // bucket_step
        if 0 <= bucket_idx < buckets:
            label = bucket_labels[-(bucket_idx + 1)] if period == "day" else bucket_labels[buckets - 1 - bucket_idx]
            bucket_data[label] += row["quota"] / Tli_PER_QUOTA

    db.close()

    # Convert to ordered list
    total_tli = sum(bucket_data.values())
    result = {
        "period": period,
        "total_tli": round(total_tli, 2),
        "buckets": [{"label": k, "tli": round(v, 2)} for k, v in zip(bucket_labels, [bucket_data[l] for l in bucket_labels])],
    }

    return result



# ── Admin: T粒兑换券管理 ───────────────────────────────────────────────

@router.get("/admin/redeem/list")
async def admin_redeem_list(
    batch_id: str = "",
    db: AsyncSession = Depends(get_db),
    proxy_admin: dict = Depends(get_proxy_admin),
):
    """List T粒 redeem codes (admin only)."""
    from sqlalchemy import desc
    q = select(RedeemCode)
    if batch_id:
        q = q.where(RedeemCode.batch_id == batch_id)
    q = q.order_by(desc(RedeemCode.created_at)).limit(200)
    r = await db.execute(q)
    return r.scalars().all()


@router.get("/admin/redeem/stats")
async def admin_redeem_stats(
    db: AsyncSession = Depends(get_db),
    proxy_admin: dict = Depends(get_proxy_admin),
):
    """T粒 redeem code statistics (admin only)."""
    from sqlalchemy import func
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


@router.get("/admin/redeem/batches")
async def admin_redeem_batches(
    db: AsyncSession = Depends(get_db),
    proxy_admin: dict = Depends(get_proxy_admin),
):
    """T粒 redeem code batch summaries (admin only)."""
    from sqlalchemy import func, desc, Integer as SAInt
    r = await db.execute(
        select(
            RedeemCode.batch_id,
            func.min(RedeemCode.created_at).label("created_at"),
            func.count().label("total"),
            func.sum(RedeemCode.amount).label("amount"),
            func.sum(RedeemCode.is_used.cast(SAInt)).label("used_count"),
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


class AdminRedeemGenerateBody(BaseModel):
    amount: int
    count: int
    remark: str = ""


@router.post("/admin/redeem/generate")
async def admin_redeem_generate(
    data: AdminRedeemGenerateBody,
    db: AsyncSession = Depends(get_db),
    proxy_admin: dict = Depends(get_proxy_admin),
):
    """Generate T粒 redeem codes (admin only)."""
    import secrets, uuid

    batch_id = uuid.uuid4().hex[:8]
    codes = []
    for _ in range(data.count):
        for _ in range(100):
            code_val = secrets.token_hex(8).upper()
            r = await db.execute(select(RedeemCode).where(RedeemCode.code == code_val))
            if not r.scalar_one_or_none():
                break
        c = RedeemCode(code=code_val, amount=data.amount, created_by=proxy_admin["user_id"], batch_id=batch_id)
        db.add(c)
        codes.append({"code": c.code, "amount": c.amount})
    await db.commit()
    return {"batch_id": batch_id, "count": len(codes), "codes": codes}


# ── Admin: course invite codes ───────────────────

@router.get("/admin/course-codes/list")
async def admin_course_list(
    batch_id: str = "",
    db: AsyncSession = Depends(get_db),
    proxy_admin: dict = Depends(get_proxy_admin),
):
    """List redeem codes (admin only)."""
    from sqlalchemy import desc
    q = select(CourseInviteCode)
    if batch_id:
        q = q.where(CourseInviteCode.batch_id == batch_id)
    q = q.order_by(desc(CourseInviteCode.created_at)).limit(200)
    r = await db.execute(q)
    return r.scalars().all()


@router.get("/admin/course-codes/stats")
async def admin_course_stats(
    db: AsyncSession = Depends(get_db),
    proxy_admin: dict = Depends(get_proxy_admin),
):
    """Redeem code statistics (admin only)."""
    from sqlalchemy import func
    r1 = await db.execute(select(func.count()).select_from(CourseInviteCode))
    total_val = r1.scalar() or 0
    r2 = await db.execute(select(func.count()).select_from(CourseInviteCode).where(CourseInviteCode.is_used == True))
    used_val = r2.scalar() or 0
    r3 = await db.execute(select(func.sum(CourseInviteCode.amount)).select_from(CourseInviteCode).where(CourseInviteCode.is_used == True))
    total_redeemed = r3.scalar() or 0
    return {
        "total": total_val,
        "used": used_val,
        "unused": total_val - used_val,
        "total_redeemed": total_redeemed,
    }


@router.get("/admin/course-codes/batches")
async def admin_course_batches(
    db: AsyncSession = Depends(get_db),
    proxy_admin: dict = Depends(get_proxy_admin),
):
    """List redeem code batch summaries (admin only)."""
    from sqlalchemy import func, desc, Integer as SAInt
    r = await db.execute(
        select(
            CourseInviteCode.batch_id,
            func.min(CourseInviteCode.created_at).label("created_at"),
            func.count().label("total"),
            func.sum(CourseInviteCode.amount).label("amount"),
            func.sum(CourseInviteCode.is_used.cast(SAInt)).label("used_count"),
        )
        .group_by(CourseInviteCode.batch_id)
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


class AdminCourseGenerateBody(BaseModel):
    amount: int
    count: int


@router.post("/admin/course-codes/generate")
async def admin_course_generate(
    data: AdminCourseGenerateBody,
    db: AsyncSession = Depends(get_db),
    proxy_admin: dict = Depends(get_proxy_admin),
):
    """Generate redeem codes (admin only)."""
    import secrets, uuid

    batch_id = uuid.uuid4().hex[:8]
    codes = []
    for _ in range(data.count):
        for _ in range(100):
            code_val = secrets.token_hex(8).upper()
            r = await db.execute(select(CourseInviteCode).where(CourseInviteCode.code == code_val))
            if not r.scalar_one_or_none():
                break
        c = CourseInviteCode(code=code_val, amount=data.amount, created_by=proxy_admin["user_id"], batch_id=batch_id)
        db.add(c)
        codes.append({"code": c.code, "amount": c.amount})
    await db.commit()
    return {"batch_id": batch_id, "count": len(codes), "codes": codes}
