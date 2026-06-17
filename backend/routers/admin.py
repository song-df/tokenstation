from __future__ import annotations
import sqlite3
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel
from database import get_db
from models import User, Channel, ModelConfig, TopUp, RequestLog, UserRole, Referral, GuideContent, Message
from auth import get_admin_user, hash_password, generate_api_key

router = APIRouter(prefix="/admin", tags=["admin"])


class ChannelIn(BaseModel):
    name: str
    provider: str
    base_url: str = ""
    api_key: str = ""
    models: str = ""
    priority: int = 0


class ModelIn(BaseModel):
    model_name: str
    display_name: str = ""
    provider: str = ""
    input_price: float = 0.0
    output_price: float = 0.0
    max_tokens: int = 4096


class UserIn(BaseModel):
    username: str
    display_name: str = ""
    email: str = ""
    password: str


class TopUpIn(BaseModel):
    user_id: int
    amount: int
    payment_amount: float = 0.0
    remark: str = ""


@router.get("/channels")
async def list_channels(db=Depends(get_db), _=Depends(get_admin_user)):
    r = await db.execute(select(Channel).order_by(desc(Channel.priority)))
    return r.scalars().all()


@router.post("/channels")
async def create_channel(data: ChannelIn, db=Depends(get_db), _=Depends(get_admin_user)):
    ch = Channel(**data.model_dump())
    db.add(ch)
    await db.commit()
    await db.refresh(ch)
    return ch


@router.put("/channels/{cid}")
async def update_channel(cid: int, data: ChannelIn, db=Depends(get_db), _=Depends(get_admin_user)):
    r = await db.execute(select(Channel).where(Channel.id == cid))
    ch = r.scalar_one_or_none()
    if not ch:
        raise HTTPException(404, "Channel not found")
    for k, v in data.model_dump().items():
        setattr(ch, k, v)
    await db.commit()
    await db.refresh(ch)
    return ch


@router.delete("/channels/{cid}")
async def delete_channel(cid: int, db=Depends(get_db), _=Depends(get_admin_user)):
    r = await db.execute(select(Channel).where(Channel.id == cid))
    ch = r.scalar_one_or_none()
    if not ch:
        raise HTTPException(404, "Channel not found")
    await db.delete(ch)
    await db.commit()
    return {"ok": True}


@router.get("/models")
async def list_models(db=Depends(get_db), _=Depends(get_admin_user)):
    r = await db.execute(select(ModelConfig).order_by(ModelConfig.model_name))
    return r.scalars().all()


@router.post("/models")
async def create_model(data: ModelIn, db=Depends(get_db), _=Depends(get_admin_user)):
    ex = await db.execute(select(ModelConfig).where(ModelConfig.model_name == data.model_name))
    if ex.scalar_one_or_none():
        raise HTTPException(400, "Model exists")
    mc = ModelConfig(**data.model_dump())
    db.add(mc)
    await db.commit()
    await db.refresh(mc)
    return mc


@router.put("/models/{mid}")
async def update_model(mid: int, data: ModelIn, db=Depends(get_db), _=Depends(get_admin_user)):
    r = await db.execute(select(ModelConfig).where(ModelConfig.id == mid))
    mc = r.scalar_one_or_none()
    if not mc:
        raise HTTPException(404, "Model not found")
    for k, v in data.model_dump().items():
        setattr(mc, k, v)
    await db.commit()
    await db.refresh(mc)
    return mc


@router.delete("/models/{mid}")
async def delete_model(mid: int, db=Depends(get_db), _=Depends(get_admin_user)):
    r = await db.execute(select(ModelConfig).where(ModelConfig.id == mid))
    mc = r.scalar_one_or_none()
    if not mc:
        raise HTTPException(404, "Model not found")
    await db.delete(mc)
    await db.commit()
    return {"ok": True}


@router.get("/users")
async def list_users(db=Depends(get_db), _=Depends(get_admin_user)):
    r = await db.execute(select(User).order_by(desc(User.created_at)))
    users = r.scalars().all()
    # Add total cash for each user
    result = []
    for u in users:
        tr = await db.execute(select(func.sum(TopUp.payment_amount)).where(TopUp.user_id == u.id))
        total_cash = tr.scalar() or 0.0
        u.total_cash = round(total_cash, 2)
        result.append(u)
    return result


@router.post("/users")
async def create_user(data: UserIn, db=Depends(get_db), _=Depends(get_admin_user)):
    ex = await db.execute(select(User).where(User.username == data.username))
    if ex.scalar_one_or_none():
        raise HTTPException(400, "Username exists")
    u = User(
        username=data.username, display_name=data.display_name,
        email=data.email, hashed_password=hash_password(data.password),
        role=UserRole.student, quota=0, api_key=generate_api_key(),
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


@router.put("/users/{uid}/toggle")
async def toggle_user(uid: int, db=Depends(get_db), _=Depends(get_admin_user)):
    r = await db.execute(select(User).where(User.id == uid))
    u = r.scalar_one_or_none()
    if not u:
        raise HTTPException(404, "User not found")
    u.is_active = not u.is_active
    await db.commit()
    await db.refresh(u)
    return u


@router.post("/users/{uid}/reset-key")
async def reset_key(uid: int, db=Depends(get_db), _=Depends(get_admin_user)):
    r = await db.execute(select(User).where(User.id == uid))
    u = r.scalar_one_or_none()
    if not u:
        raise HTTPException(404, "User not found")
    u.api_key = generate_api_key()
    await db.commit()
    await db.refresh(u)
    return u


@router.get("/topups")
async def list_topups(db=Depends(get_db), _=Depends(get_admin_user)):
    r = await db.execute(
        select(TopUp, User.username)
        .join(User, TopUp.user_id == User.id)
        .order_by(desc(TopUp.created_at))
    )
    rows = []
    for tp, un in r:
        tp._username = un
        rows.append(tp)
    return rows


@router.post("/topups")
async def create_topup(data: TopUpIn, db=Depends(get_db), _=Depends(get_admin_user)):
    r = await db.execute(select(User).where(User.id == data.user_id))
    u = r.scalar_one_or_none()
    if not u:
        raise HTTPException(404, "User not found")
    tp = TopUp(
        user_id=data.user_id, amount=data.amount,
        payment_amount=data.payment_amount, remark=data.remark,
    )
    db.add(tp)
    u.quota += data.amount
    await db.commit()
    await db.refresh(tp)
    return tp


@router.get("/stats")
async def get_stats(db=Depends(get_db), _=Depends(get_admin_user)):
    uc = await db.execute(select(func.count()).select_from(User))
    cc = await db.execute(select(func.count()).select_from(Channel))
    mc = await db.execute(select(func.count()).select_from(ModelConfig))
    tq = await db.execute(select(func.sum(User.quota)))
    tu = await db.execute(select(func.sum(RequestLog.cost)))
    tr = await db.execute(
        select(func.count()).select_from(RequestLog)
        .where(func.date(RequestLog.created_at) == func.date("now"))
    )
    return {
        "user_count": uc.scalar() or 0,
        "channel_count": cc.scalar() or 0,
        "model_count": mc.scalar() or 0,
        "total_quota": tq.scalar() or 0,
        "total_used": round(tu.scalar() or 0, 2),
        "today_requests": tr.scalar() or 0,
    }



@router.get("/referrals")
async def list_referrals(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_admin_user),
):
    """List referral relationships with user info."""
    r = await db.execute(
        select(Referral, User.username, User.display_name)
        .join(User, Referral.referrer_id == User.id)
        .order_by(desc(Referral.created_at))
    )
    referrals = []
    for ref, uname, dname in r:
        ref._referrer_name = dname or uname
        # Get referred user info
        rr = await db.execute(select(User).where(User.id == ref.referred_id))
        referred = rr.scalar_one_or_none()
        ref._referred_name = (referred.display_name or referred.username) if referred else str(ref.referred_id)
        referrals.append(ref)
    return referrals


@router.get("/referrals/stats")
async def referral_stats(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_admin_user),
):
    """Referral statistics."""
    total = await db.execute(select(func.count()).select_from(Referral))
    # Users who have referrals
    active_refs = await db.execute(
        select(func.count(func.distinct(Referral.referrer_id))).select_from(Referral)
    )
    return {
        "total_referrals": total.scalar() or 0,
        "active_referrers": active_refs.scalar() or 0,
    }



@router.get("/guide/sections")
async def get_guide_sections(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_admin_user),
):
    r = await db.execute(select(GuideContent).order_by(GuideContent.id))
    sections = r.scalars().all()
    if not sections:
        # Seed default sections
        defaults = [
            ("intro", "欢迎使用", "智联学习云AI服务 - 20+ AI模型一站接入"),
            ("claude", "Claude Code 接入", "配置方法说明..."),
            ("openai", "OpenAI 兼容接口", "使用说明..."),
            ("models", "可用模型", "模型列表..."),
            ("pricing", "定价说明", "10元=1000T粒..."),
            ("redeem_purchase_link", "购买兑换券链接", "https://m.tb.cn/h.RPaDRYm?tk=bzAWgW5A5RY"),
        ]
        for key, title, content in defaults:
            db.add(GuideContent(section_key=key, title=title, content=content))
        await db.commit()
        r = await db.execute(select(GuideContent).order_by(GuideContent.id))
        sections = r.scalars().all()
    return sections


@router.post("/guide/sections")
async def save_guide_sections(
    data: list,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_admin_user),
):
    for item in data:
        r = await db.execute(select(GuideContent).where(GuideContent.section_key == item["section_key"]))
        s = r.scalar_one_or_none()
        if s:
            s.title = item.get("title", "")
            s.content = item.get("content", "")
    await db.commit()
    return {"ok": True}



@router.get("/messages")
async def list_messages(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_admin_user),
):
    r = await db.execute(
        select(Message, User.username, User.display_name)
        .join(User, Message.user_id == User.id)
        .order_by(desc(Message.created_at)).limit(200)
    )
    items = []
    for m, uname, dname in r:
        items.append({
            "id": m.id, "user_id": m.user_id, "username": uname,
            "display_name": dname or uname,
            "content": m.content, "reply": m.reply,
            "is_read": m.is_read,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "replied_at": m.replied_at.isoformat() if m.replied_at else None,
        })
    return items


@router.post("/messages/{msg_id}/reply")
async def reply_message(
    msg_id: int, data: dict,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_admin_user),
):
    r = await db.execute(select(Message).where(Message.id == msg_id))
    m = r.scalar_one_or_none()
    if not m:
        raise HTTPException(404, "留言不存在")
    m.reply = data.get("reply", "").strip()
    m.is_read = True
    m.replied_at = datetime.now()
    await db.commit()
    return {"ok": True}


@router.get("/messages/unread-count")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_admin_user),
):
    r = await db.execute(select(func.count()).select_from(Message).where(Message.is_read == False))
    return {"count": r.scalar() or 0}


@router.get("/logs")
async def list_logs(
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db=Depends(get_db), _=Depends(get_admin_user),
):
    off = (page - 1) * page_size
    t = await db.execute(select(func.count()).select_from(RequestLog))
    total = t.scalar() or 0
    r = await db.execute(
        select(RequestLog, User.username)
        .join(User, RequestLog.user_id == User.id)
        .order_by(desc(RequestLog.created_at))
        .offset(off).limit(page_size)
    )
    rows = []
    for log, un in r:
        log._username = un
        rows.append(log)
    return {"total": total, "items": rows}


# ── Proxy subscription management ─────────────────────────────────────────

from models import ProxyPlan, ProxySubscription, ProxyTopUp


@router.get("/proxy/subscriptions")
async def admin_proxy_subs(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_admin_user),
):
    """List all proxy subscriptions with user info."""
    now = datetime.now()
    r = await db.execute(
        select(ProxySubscription)
        .order_by(desc(ProxySubscription.created_at))
    )
    result = []
    for sub in r.scalars().all():
        # Look up username from new-api DB
        username = f"user_{sub.user_id}"
        try:
            import sqlite3
            conn = sqlite3.connect("file:/opt/newapi/data/data.db?mode=ro", uri=True)
            conn.row_factory = sqlite3.Row
            row = conn.execute("SELECT username FROM users WHERE id = ?", (sub.user_id,)).fetchone()
            conn.close()
            if row:
                username = row["username"]
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


@router.post("/proxy/subscriptions/{sub_id}/cancel")
async def admin_cancel_sub(
    sub_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_admin_user),
):
    """Admin force-cancel a subscription."""
    r = await db.execute(select(ProxySubscription).where(ProxySubscription.id == sub_id))
    sub = r.scalar_one_or_none()
    if not sub:
        raise HTTPException(404, "Subscription not found")
    sub.canceled_at = datetime.now()
    await db.commit()
    from services.proxy import sync_singbox
    await sync_singbox(db)
    return {"ok": True}


@router.get("/proxy/plans")
async def admin_proxy_plans(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_admin_user),
):
    """List proxy pricing plans."""
    r = await db.execute(select(ProxyPlan).order_by(ProxyPlan.days))
    plans = r.scalars().all()
    return [
        {"id": p.id, "name": p.name, "days": p.days, "price": p.price, "is_active": p.is_active}
        for p in plans
    ]


@router.post("/proxy/plans")
async def admin_create_plan(
    data: dict,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_admin_user),
):
    """Create a new proxy pricing plan."""
    plan = ProxyPlan(
        name=data.get("name", ""),
        days=int(data.get("days", 30)),
        price=float(data.get("price", 0)),
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return {"id": plan.id, "name": plan.name, "days": plan.days, "price": plan.price}


@router.put("/proxy/plans/{plan_id}")
async def admin_update_plan(
    plan_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_admin_user),
):
    """Update a proxy pricing plan."""
    r = await db.execute(select(ProxyPlan).where(ProxyPlan.id == plan_id))
    plan = r.scalar_one_or_none()
    if not plan:
        raise HTTPException(404, "Plan not found")
    for k in ("name", "days", "price", "is_active"):
        if k in data:
            setattr(plan, k, data[k])
    await db.commit()
    return {"id": plan.id, "name": plan.name, "days": plan.days, "price": plan.price, "is_active": plan.is_active}


# ── Accurate data dashboard (reads new-api SQLite directly) ────────────────

@router.get("/newapi-stats")
async def newapi_stats(_=Depends(get_admin_user)):
    """Get accurate usage stats directly from new-api database."""
    from services.proxy import NEWAPI_DB_PATH
    db = sqlite3.connect(f"file:{NEWAPI_DB_PATH}?mode=ro", uri=True)
    db.row_factory = sqlite3.Row

    today_start = int(datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).timestamp())
    TLI = 690  # 1 T粒 = 690 new-api quota units

    # Total requests
    total = db.execute("SELECT COUNT(*) as c FROM logs WHERE type=2").fetchone()["c"]

    # Today's requests
    today = db.execute(
        "SELECT COUNT(*) as c FROM logs WHERE type=2 AND created_at >= ?", (today_start,)
    ).fetchone()["c"]

    # Today's T粒 consumed
    tli_today = db.execute(
        "SELECT COALESCE(SUM(quota), 0) as s FROM logs WHERE type=2 AND created_at >= ?",
        (today_start,),
    ).fetchone()["s"] / TLI

    # Total T粒 consumed
    tli_total = db.execute(
        "SELECT COALESCE(SUM(quota), 0) as s FROM logs WHERE type=2"
    ).fetchone()["s"] / TLI

    # Active users (today)
    active_users = db.execute(
        "SELECT COUNT(DISTINCT user_id) as c FROM logs WHERE type=2 AND created_at >= ?",
        (today_start,),
    ).fetchone()["c"]

    # Top models today
    top_models = [
        {"model": r["model_name"] or "unknown", "count": r["c"], "tli": (r["s"] or 0) / TLI}
        for r in db.execute(
            "SELECT model_name, COUNT(*) as c, SUM(quota) as s FROM logs WHERE type=2 AND created_at >= ? "
            "GROUP BY model_name ORDER BY c DESC LIMIT 10",
            (today_start,),
        ).fetchall()
    ]

    db.close()
    return {
        "total_requests": total,
        "today_requests": today,
        "today_tli": round(tli_today, 2),
        "total_tli": round(tli_total, 2),
        "active_users_today": active_users,
        "top_models": top_models,
    }
