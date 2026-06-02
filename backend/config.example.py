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
    # Shared secret for the external redeem-code API (/api/redeem external endpoint).
    system_api_secret: str = "change-me-system-api-secret"

    class Config:
        env_file = ".env"


settings = Settings()
