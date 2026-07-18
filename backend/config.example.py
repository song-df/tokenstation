# Reference configuration. Copy to config.py and fill in real values:
#   cp config.example.py config.py
# config.py is git-ignored so production secrets are never committed.
# Any field below can also be overridden via a .env file (see env_file).
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./data.db"
    # JWT signing key — set to a long random string in production.
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    default_quota: int = 500000
    # Default admin password — only used when creating the initial admin user.
    # Change this immediately after first login.
    default_admin_password: str = "change-me-admin-password"
    # Shared secret for the external redeem-code API (/api/redeem external endpoint).
    system_api_secret: str = "change-me-system-api-secret"

    # ── Alipay PC website payment ────────────────────────────────────────
    # Get these from Alipay Open Platform (https://open.alipay.com)
    # Sandbox keys from: Developer Center > Sandbox Environment
    alipay_app_id: str = ""
    alipay_app_private_key: str = ""  # Merchant RSA2 private key (PKCS#8 PEM, single line)
    alipay_alipay_public_key: str = ""  # Alipay RSA2 public key (PEM, single line)
    alipay_sign_type: str = "RSA2"
    alipay_debug: bool = True  # True=sandbox gateway, False=production gateway
    alipay_notify_url: str = ""  # https://your-domain.com/api/alipay/notify
    alipay_return_url: str = ""  # https://your-domain.com/api/alipay/return

    # ── WeChat Pay Native ──────────────────────────────────────────────────
    # Get from WeChat Pay Merchant Platform (https://pay.weixin.qq.com)
    wechat_app_id: str = ""  # 微信开放平台 AppID (需与商户号绑定)
    wechat_mch_id: str = ""  # 商户号
    wechat_mch_serial_no: str = ""  # 商户API证书序列号
    wechat_api_v3_key: str = ""  # APIv3密钥 (32位ASCII字符)
    wechat_private_key: str = ""  # 商户私钥 (apiclient_key.pem内容, 单行)
    wechat_notify_url: str = ""  # https://your-domain.com/api/wechat/notify
    wechat_debug: bool = True  # True=沙箱环境, False=生产环境


    # OAuth2 client registry (JSON). Format: [{"client_id":"...","client_secret":"...","redirect_uris":["..."]}]
    oauth_clients_json: str = "[]"

    # WorBuddy OAuth client. Keep the secret only in the deployment environment.
    workbuddy_oauth_client_id: str = "workbuddy-web"
    workbuddy_oauth_client_secret: str = ""
    workbuddy_oauth_redirect_uri: str = "https://worbuddy.cn/workbuddy-auth/callback"
    workbuddy_oauth_base_url: str = "https://t.wiselink.cc"
    workbuddy_session_cookie: str = "workbuddy_session"

    class Config:
        env_file = ".env"


settings = Settings()
