from __future__ import annotations
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    student = "student"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    display_name = Column(String(128), default="")
    email = Column(String(128), default="")
    hashed_password = Column(String(256), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.student, nullable=False)
    quota = Column(Float, default=0.0)
    used_quota = Column(Float, default=0.0)
    api_key = Column(String(64), unique=True, nullable=False, index=True)
    referral_code = Column(String(32), unique=True, nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    top_ups = relationship("TopUp", back_populates="user")
    logs = relationship("RequestLog", back_populates="user")
    proxy_subscription = relationship("ProxySubscription", back_populates="user", uselist=False)


class Channel(Base):
    __tablename__ = "channels"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    provider = Column(String(64), nullable=False)
    base_url = Column(String(512), default="")
    api_key = Column(String(512), default="")
    models = Column(Text, default="")
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)


class ModelConfig(Base):
    __tablename__ = "model_configs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(128), unique=True, nullable=False, index=True)
    display_name = Column(String(256), default="")
    provider = Column(String(64), default="")
    input_price = Column(Float, default=0.0)
    output_price = Column(Float, default=0.0)
    max_tokens = Column(Integer, default=4096)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)


class TopUp(Base):
    __tablename__ = "top_ups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    payment_amount = Column(Float, default=0.0)
    remark = Column(String(256), default="")
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="top_ups")


class RequestLog(Base):
    __tablename__ = "request_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    model = Column(String(128), default="")
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    cost = Column(Float, default=0.0)
    success = Column(Boolean, default=True)
    error_message = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="logs")


class RedeemCode(Base):
    __tablename__ = "redeem_codes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(32), unique=True, nullable=False, index=True)
    amount = Column(Float, nullable=False, default=0.0)
    is_used = Column(Boolean, default=False)
    used_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    used_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    batch_id = Column(String(32), default="")
    created_at = Column(DateTime, default=datetime.now)
    reserved_at = Column(DateTime, nullable=True)
    is_shipped = Column(Boolean, default=False)
    shipped_at = Column(DateTime, nullable=True)



class AutoGenConfig(Base):
    """Auto-generation config per denomination."""
    __tablename__ = "autogen_configs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    amount = Column(Integer, unique=True, nullable=False)
    enabled = Column(Boolean, default=False)
    min_stock = Column(Integer, default=10)
    batch_size = Column(Integer, default=10)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)



class GuideContent(Base):
    """Editable guide page content."""
    __tablename__ = "guide_content"

    id = Column(Integer, primary_key=True, autoincrement=True)
    section_key = Column(String(64), unique=True, nullable=False)
    title = Column(String(256), default="")
    content = Column(Text, default="")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class AutoGenLog(Base):
    """Auto-generation event log."""
    __tablename__ = "autogen_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    amount = Column(Float, nullable=False, default=0.0)
    count = Column(Integer, nullable=False)
    batch_id = Column(String(32), default="")
    trigger_stock = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)




class UserTask(Base):
    __tablename__ = "user_tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_key = Column(String(64), nullable=False)  # verify_email, first_redeem
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

class ApiKey(Base):
    __tablename__ = "user_api_keys"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(64), default="")
    key = Column(String(64), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    reply = Column(Text, default="")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    replied_at = Column(DateTime, nullable=True)

class Referral(Base):
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    referrer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    referred_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.now)


class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(128), nullable=False, index=True)
    code = Column(String(8), nullable=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    expires_at = Column(DateTime, nullable=False)


class ProxyPlan(Base):
    """Pricing plans for proxy subscriptions."""
    __tablename__ = "proxy_plans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False)
    days = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class ProxySubscription(Base):
    """Active proxy subscription — one per user."""
    __tablename__ = "proxy_subscriptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    hy2_password = Column(String(128), unique=True, nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("proxy_plans.id"), nullable=False)
    total_days = Column(Integer, nullable=False)
    started_at = Column(DateTime, default=datetime.now, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    canceled_at = Column(DateTime, nullable=True)
    tli_spent = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    user = relationship("User", back_populates="proxy_subscription")


class ProxyTopUp(Base):
    """Audit log for proxy purchases."""
    __tablename__ = "proxy_topups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    plan_id = Column(Integer, nullable=True)
    days = Column(Integer, nullable=False)
    tli_amount = Column(Float, nullable=False)
    remark = Column(String(256), default="")
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User")


class TliPackage(Base):
    """Predefined T粒 packages for Alipay purchase."""
    __tablename__ = "tli_packages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False)
    tli_amount = Column(Float, nullable=False)
    price_yuan = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class AlipayOrder(Base):
    """Alipay payment orders."""
    __tablename__ = "alipay_orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    out_trade_no = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    package_id = Column(Integer, ForeignKey("tli_packages.id"), nullable=True)
    tli_amount = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)  # CNY
    subject = Column(String(256), nullable=False)
    trade_no = Column(String(64), default="")  # Alipay trade number
    trade_status = Column(String(32), default="WAIT_BUYER_PAY")
    buyer_id = Column(String(32), default="")
    buyer_logon_id = Column(String(64), default="")
    credit_applied = Column(Boolean, default=False)  # idempotency guard
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    user = relationship("User", backref="alipay_orders")


class WechatOrder(Base):
    """WeChat Pay Native payment orders."""
    __tablename__ = "wechat_orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    out_trade_no = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    package_id = Column(Integer, ForeignKey("tli_packages.id"), nullable=True)
    tli_amount = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)  # CNY (in yuan, not fen)
    subject = Column(String(256), nullable=False)
    prepay_id = Column(String(64), default="")  # WeChat prepay_id
    code_url = Column(String(256), default="")  # QR code URL
    trade_status = Column(String(32), default="NOTPAY")  # NOTPAY/SUCCESS/CLOSED/PAYERROR
    transaction_id = Column(String(64), default="")  # WeChat transaction ID
    credit_applied = Column(Boolean, default=False)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    user = relationship("User", backref="wechat_orders")
