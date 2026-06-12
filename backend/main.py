from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from database import engine, Base, get_db, async_session
from models import User, UserRole
from auth import verify_password, create_access_token, hash_password, generate_api_key, get_current_user
from routers import admin, api, student, auth_public, redeem, autogen, keys


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Schema patches for existing DBs (SQLite doesn't auto-migrate)
        for stmt in [
            "ALTER TABLE redeem_codes ADD COLUMN is_shipped BOOLEAN DEFAULT FALSE",
            "ALTER TABLE redeem_codes ADD COLUMN shipped_at DATETIME",
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
    yield
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
