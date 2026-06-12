from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from models import User, RequestLog, TopUp, ModelConfig, Referral, Message, UserTask, GuideContent
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/student", tags=["student"])


@router.get("/profile")
async def get_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(func.coalesce(func.sum(TopUp.payment_amount), 0))
        .where(TopUp.user_id == user.id)
    )
    total_cash = result.scalar() or 0.0

    # Count referrals
    ref_result = await db.execute(
        select(func.count()).select_from(Referral)
        .where(Referral.referrer_id == user.id)
    )
    referral_count = ref_result.scalar() or 0

    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "email": user.email,
        "role": user.role.value,
        "quota": user.quota,
        "used_quota": user.used_quota,
        "total_cash": round(total_cash, 2),
        "api_key": user.api_key,
        "api_base_url": "/api/v1",
        "is_active": user.is_active,
        "referral_code": user.referral_code,
        "referral_count": referral_count,
        "referral_url": f"/register?ref={user.referral_code}" if user.referral_code else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }



@router.patch("/profile")
async def update_profile(
    data: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update display_name, email, or password."""
    from auth import hash_password

    if "display_name" in data and data["display_name"]:
        user.display_name = data["display_name"]
    if "email" in data and data["email"]:
        # Check email uniqueness
        r = await db.execute(select(User).where(User.email == data["email"], User.id != user.id))
        if r.scalar_one_or_none():
            raise HTTPException(400, "该邮箱已被使用")
        user.email = data["email"]
    if "password" in data and data["password"]:
        user.hashed_password = hash_password(data["password"])

    await db.commit()
    await db.refresh(user)
    return {"message": "更新成功"}



@router.get("/tasks")
async def get_tasks(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get task completion status."""
    r = await db.execute(select(UserTask).where(UserTask.user_id == user.id))
    completed = {t.task_key: t.is_completed for t in r.scalars().all()}
    
    # Count referrals
    ref_r = await db.execute(select(func.count()).select_from(Referral).where(Referral.referrer_id == user.id))
    referral_count = ref_r.scalar() or 0
    
    return {
        "tasks": [
            {
                "key": "verify_email",
                "title": "验证邮箱",
                "reward": 50,
                "description": "验证邮箱送50 T粒",
                "completed": completed.get("verify_email", False),
            },
            {
                "key": "referral",
                "title": "推荐注册",
                "reward": 100,
                "description": f"每推荐1人注册送100 T粒（已推荐{referral_count}人）",
                "completed": False,  # Always show as available
                "count": referral_count,
            },
            {
                "key": "first_redeem",
                "title": "首次兑换",
                "reward": 50,
                "description": "首次成功兑换兑换券，额外送50 T粒",
                "completed": completed.get("first_redeem", False),
            },
            {
                "key": "redeem_commission",
                "title": "推荐返T粒",
                "reward": 10,
                "description": "分享链接给好友，被推荐人每次兑换你都获得10%返利",
                "completed": False,
                "is_commission": True,
                "referral_url": f"/register?ref={user.referral_code}" if user.referral_code else None,
            },
        ],
        "referral_count": referral_count,
    }


@router.post("/tasks/verify-email")
async def verify_email(
    data: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark email as verified and grant reward."""
    r = await db.execute(select(UserTask).where(
        UserTask.user_id == user.id, UserTask.task_key == "verify_email"
    ))
    t = r.scalar_one_or_none()
    if t and t.is_completed:
        raise HTTPException(400, "邮箱已验证过")
    
    # Update user email
    email = data.get("email", "").strip()
    if email:
        user.email = email
    
    # Create task record
    if not t:
        t = UserTask(user_id=user.id, task_key="verify_email")
        db.add(t)
    t.is_completed = True
    t.completed_at = datetime.now()
    
    # Grant reward
    user.quota += 50
    db.add(TopUp(user_id=user.id, amount=50, remark="验证邮箱奖励"))
    await db.commit()
    return {"reward": 50, "quota": user.quota}


@router.post("/tasks/claim-referral-reward")
async def claim_referral_reward(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manual claim for referral rewards (mostly informational, rewards auto-granted)."""
    return {"message": "推荐奖励已自动发放"}


@router.get("/models")
async def get_available_models(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ModelConfig)
        .where(ModelConfig.is_active == True)
        .order_by(ModelConfig.model_name)
    )
    models = result.scalars().all()
    return [
        {
            "model_name": m.model_name,
            "display_name": m.display_name,
            "provider": m.provider,
            "input_price": m.input_price,
            "output_price": m.output_price,
            "max_tokens": m.max_tokens,
        }
        for m in models
    ]


@router.get("/logs")
async def get_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size
    total_result = await db.execute(
        select(func.count()).select_from(RequestLog)
        .where(RequestLog.user_id == user.id)
    )
    total = total_result.scalar() or 0

    result = await db.execute(
        select(RequestLog)
        .where(RequestLog.user_id == user.id)
        .order_by(desc(RequestLog.created_at))
        .offset(offset).limit(page_size)
    )
    logs = result.scalars().all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": log.id,
                "model": log.model,
                "prompt_tokens": log.prompt_tokens,
                "completion_tokens": log.completion_tokens,
                "cost": log.cost,
                "success": log.success,
                "error_message": log.error_message,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
    }



@router.post("/messages")
async def send_message(
    data: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = data.get("content", "").strip()
    if not content:
        raise HTTPException(400, "内容不能为空")
    if len(content) > 2000:
        raise HTTPException(400, "内容过长")
    msg = Message(user_id=user.id, content=content)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return {"id": msg.id, "message": "留言已提交"}


@router.get("/messages")
async def get_my_messages(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(
        select(Message).where(Message.user_id == user.id).order_by(desc(Message.created_at)).limit(20)
    )
    messages = r.scalars().all()
    return [
        {
            "id": m.id, "content": m.content, "reply": m.reply,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "replied_at": m.replied_at.isoformat() if m.replied_at else None,
        }
        for m in messages
    ]


@router.get("/topups")
async def get_topups(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size
    total_result = await db.execute(
        select(func.count()).select_from(TopUp)
        .where(TopUp.user_id == user.id)
    )
    total = total_result.scalar() or 0

    result = await db.execute(
        select(TopUp)
        .where(TopUp.user_id == user.id)
        .order_by(desc(TopUp.created_at))
        .offset(offset).limit(page_size)
    )
    topups = result.scalars().all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": t.id,
                "amount": t.amount,
                "payment_amount": t.payment_amount,
                "remark": t.remark,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in topups
        ],
    }


@router.get("/site-config")
async def get_site_config(
    key: str = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Read site configuration by key (e.g. purchase_link). Returns all if no key given."""
    q = select(GuideContent)
    if key:
        q = q.where(GuideContent.section_key == f"redeem_{key}" if not key.startswith("redeem_") else GuideContent.section_key == key)
        r = await db.execute(q)
        row = r.scalar_one_or_none()
        if not row:
            return {"key": key, "value": ""}
        return {"key": row.section_key, "title": row.title, "value": row.content}
    r = await db.execute(q.order_by(GuideContent.id))
    return [{"key": s.section_key, "title": s.title, "value": s.content} for s in r.scalars().all()]
