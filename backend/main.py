from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import engine, Base, get_db, async_session
from models import User, UserRole, ProxyPlan, TliPackage
from auth import verify_password, create_access_token, hash_password, generate_api_key, get_current_user
from routers import admin, api, student, auth_public, redeem, autogen, keys, proxy, alipay, wechat
from routers import oauth


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Schema patches for existing DBs (SQLite doesn't auto-migrate)
        for stmt in [
            "ALTER TABLE redeem_codes ADD COLUMN is_shipped BOOLEAN DEFAULT FALSE",
            "ALTER TABLE redeem_codes ADD COLUMN shipped_at DATETIME",
            # Alipay payment tables
            "ALTER TABLE alipay_orders ADD COLUMN credit_applied BOOLEAN DEFAULT FALSE",
            # WeChat Pay tables
            "ALTER TABLE wechat_orders ADD COLUMN credit_applied BOOLEAN DEFAULT FALSE",
        ]:
            try:
                await conn.run_sync(lambda c, s=stmt: c.exec_driver_sql(s))
            except Exception:
                pass  # column already exists
    async with async_session() as session:
        r = await session.execute(select(User).where(User.role == UserRole.admin))
        if not r.scalar_one_or_none():
            admin_user = User(
                username="admin",
                display_name="Administrator",
                hashed_password=hash_password(settings.default_admin_password),
                role=UserRole.admin,
                quota=999999999,
                api_key=generate_api_key(),
            )
            session.add(admin_user)
            await session.commit()

        # Seed default proxy plans
        plans_r = await session.execute(select(ProxyPlan).limit(1))
        if not plans_r.scalar_one_or_none():
            session.add_all([
                ProxyPlan(name="7天套餐", days=7, price=210),
                ProxyPlan(name="30天套餐", days=30, price=750),
                ProxyPlan(name="90天套餐", days=90, price=1800),
            ])
            await session.commit()

        # Seed default T粒 packages for Alipay
        packs_r = await session.execute(select(TliPackage).limit(1))
        if not packs_r.scalar_one_or_none():
            session.add_all([
                TliPackage(name="100 T粒", tli_amount=100, price_yuan=1.00, sort_order=1),
                TliPackage(name="500 T粒", tli_amount=500, price_yuan=5.00, sort_order=2),
                TliPackage(name="1,000 T粒", tli_amount=1000, price_yuan=9.90, sort_order=3),
                TliPackage(name="5,000 T粒", tli_amount=5000, price_yuan=45.00, sort_order=4),
                TliPackage(name="10,000 T粒", tli_amount=10000, price_yuan=80.00, sort_order=5),
            ])
            await session.commit()

    # Background proxy tasks
    import asyncio
    async def proxy_expire_loop():
        while True:
            try:
                async with async_session() as session:
                    from services.proxy import expire_check
                    await expire_check(session)
            except Exception:
                pass
            await asyncio.sleep(300)  # every 5 minutes

    async def proxy_monitor_loop():
        while True:
            try:
                async with async_session() as session:
                    from services.proxy import check_multi_ip
                    await check_multi_ip(session)
            except Exception:
                pass
            await asyncio.sleep(30)  # every 30 seconds

    expire_task = asyncio.create_task(proxy_expire_loop())
    monitor_task = asyncio.create_task(proxy_monitor_loop())

    yield

    expire_task.cancel()
    monitor_task.cancel()
    try:
        await expire_task
        await monitor_task
    except asyncio.CancelledError:
        pass
    # Close the shared upstream HTTP client's connection pool on shutdown.
    from services.relay import aclose_client
    await aclose_client()


app = FastAPI(title="智联学习云AI服务", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    import logging
    logger = logging.getLogger("uvicorn")
    logger.info(f">>> {request.method} {request.url.path}")
    response = await call_next(request)
    if response.status_code >= 400:
        logger.warning(f"<<< {request.method} {request.url.path} -> {response.status_code}")
    else:
        logger.info(f"<<< {request.method} {request.url.path} -> {response.status_code}")
    return response

class LoginBody(BaseModel):
    username: str
    password: str


@app.post("/api/auth/login")
async def login(data: LoginBody, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(User).where(User.username == data.username))
    user = r.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    if not user.is_active:
        raise HTTPException(403, "Account disabled")
    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "role": user.role.value,
            "quota": user.quota,
        }
    }


@app.get("/api/auth/me")
async def me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "email": user.email,
        "role": user.role.value,
        "quota": user.quota,
        "used_quota": user.used_quota,
        "api_key": user.api_key,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


app.include_router(admin.router, prefix="/api")
app.include_router(api.router, prefix="/api")
app.include_router(student.router, prefix="/api")
app.include_router(auth_public.router, prefix="/api")
app.include_router(redeem.router, prefix="/api")
app.include_router(autogen.router, prefix="/api")
app.include_router(keys.router, prefix="/api")
app.include_router(proxy.router, prefix="/api")
app.include_router(alipay.router, prefix="/api")
app.include_router(wechat.router, prefix="/api")

app.include_router(oauth.router)  # OAuth2 at root level, no /api prefix
