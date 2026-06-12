"""
Proxy subscription service — sing-box config management, FlClash YAML generation,
and subscription lifecycle (subscribe / cancel / expire).

Talks to new-api's SQLite database for T粒 balance and to the local sing-box
installation for proxy user management.
"""
from __future__ import annotations

import json
import os
import secrets
import sqlite3
import subprocess
import logging
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger("proxy")

# ── Paths (overridable via config) ──────────────────────────────────────────
from config import settings

SINGBOX_CONFIG_PATH = getattr(settings, "singbox_config_path", "/etc/sing-box/config.json")
NEWAPI_DB_PATH = getattr(settings, "newapi_db_path", "/opt/newapi/data/data.db")
SYSTEMCTL_RELOAD = ["systemctl", "reload-or-restart", "sing-box"]

# ── Proxy constants ─────────────────────────────────────────────────────────
SERVER_IP = str(getattr(settings, "proxy_server_ip", "47.245.62.85"))
HY2_PORT = int(getattr(settings, "proxy_hy2_port", 8443))
HY2_SNI = str(getattr(settings, "proxy_hy2_sni", "ai.aiotedu.cc"))
HY2_OBFS_PASSWORD = str(getattr(settings, "proxy_hy2_obfs_password", "UfCevIIgStVIUyIZ5VzHMQ"))
SS_PORT = int(getattr(settings, "proxy_ss_port", 37858))
SS_PASSWORD = str(getattr(settings, "proxy_ss_password", "RhDmno7UUnj1qmYjMr2oeQ=="))
Tli_PER_QUOTA = 10000  # new-api: 1 T粒 = 10000 quota units


# ── Password generation ─────────────────────────────────────────────────────

def generate_hy2_password() -> str:
    """Generate a 128-char hex Hysteria2 password (512 bits entropy)."""
    return secrets.token_hex(64)


# ── new-api T粒 integration ─────────────────────────────────────────────────

def _newapi_db() -> sqlite3.Connection:
    """Open a read/write connection to new-api's SQLite database."""
    conn = sqlite3.connect(f"file:{NEWAPI_DB_PATH}?mode=rw", uri=True)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def get_tli_balance(user_id: int) -> float:
    """Return T粒 balance for a user from new-api DB."""
    with _newapi_db() as db:
        row = db.execute("SELECT quota FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        raise ValueError(f"User {user_id} not found in new-api database")
    return row["quota"] / Tli_PER_QUOTA


def deduct_tli(user_id: int, tli_amount: float) -> float:
    """Deduct T粒 from user's new-api balance. Returns new balance. Raises if insufficient."""
    quota_deduct = int(tli_amount * Tli_PER_QUOTA)
    with _newapi_db() as db:
        row = db.execute("SELECT quota FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            raise ValueError(f"User {user_id} not found")
        current = row["quota"]
        if current < quota_deduct:
            raise ValueError(
                f"T粒余额不足，需要 {tli_amount:.0f} T粒，当前余额 {current / Tli_PER_QUOTA:.0f} T粒"
            )
        new_quota = current - quota_deduct
        new_used = int(row["quota"])  # actually need used_quota
        # re-fetch for used_quota
        db.execute(
            "UPDATE users SET quota = quota - ?, used_quota = used_quota + ? WHERE id = ?",
            (quota_deduct, quota_deduct, user_id),
        )
        db.commit()
    return new_quota / Tli_PER_QUOTA


# ── sing-box config management ──────────────────────────────────────────────

async def get_active_passwords(db) -> list[str]:
    """Return list of Hysteria2 passwords for all active (non-expired, non-canceled) subscriptions."""
    from sqlalchemy import select
    from models import ProxySubscription

    now = datetime.now()
    result = await db.execute(
        select(ProxySubscription.hy2_password).where(
            ProxySubscription.expires_at > now,
            ProxySubscription.canceled_at == None,
        )
    )
    return [row[0] for row in result.all()]


def write_singbox_users(passwords: list[str]) -> bool:
    """Write the users array into the live sing-box config and reload."""
    # Read current config
    with open(SINGBOX_CONFIG_PATH, "r") as f:
        config = json.load(f)

    # Find hysteria2 inbound and replace users
    found = False
    for inbound in config.get("inbounds", []):
        if inbound.get("type") == "hysteria2":
            inbound["users"] = [{"password": pw} for pw in passwords]
            found = True
            break

    if not found:
        logger.warning("No hysteria2 inbound found in sing-box config — skipping sync")
        return False

    # Atomic write: write to temp file then rename
    tmp_path = SINGBOX_CONFIG_PATH + ".tmp"
    with open(tmp_path, "w") as f:
        json.dump(config, f, indent=2)

    os.rename(tmp_path, SINGBOX_CONFIG_PATH)

    # Reload
    subprocess.run(SYSTEMCTL_RELOAD, check=False, capture_output=True)
    logger.info(f"sing-box synced: {len(passwords)} active user(s)")
    return True


async def sync_singbox(db) -> bool:
    """Full sync: query active subscriptions → write sing-box config → reload."""
    passwords = await get_active_passwords(db)
    return write_singbox_users(passwords)


# ── Expiration check ────────────────────────────────────────────────────────

async def expire_check(db) -> int:
    """Cancel all expired subscriptions and sync sing-box. Returns count expired."""
    from sqlalchemy import select
    from models import ProxySubscription

    now = datetime.now()
    result = await db.execute(
        select(ProxySubscription).where(
            ProxySubscription.expires_at <= now,
            ProxySubscription.canceled_at == None,
        )
    )
    expired = result.scalars().all()

    if expired:
        for sub in expired:
            sub.canceled_at = now
        await db.commit()
        await sync_singbox(db)
        logger.info(f"Expired {len(expired)} proxy subscription(s)")

    return len(expired)


# ── Subscribe / Renew ───────────────────────────────────────────────────────

async def subscribe_user(db, user_id: int, plan, days: int) -> dict:
    """
    Subscribe or renew proxy access.

    1. Check T粒 balance in new-api DB
    2. Deduct T粒 from new-api DB
    3. Create/update ProxySubscription in old backend DB
    4. Create ProxyTopUp audit record
    5. Sync sing-box config
    """
    from sqlalchemy import select
    from models import ProxySubscription, ProxyTopUp

    total_tli = plan.price * days
    actual_days = plan.days * days  # plan.days is per-unit, days is multiplier

    # Check & deduct T粒 from new-api
    try:
        new_balance = deduct_tli(user_id, total_tli)
    except ValueError as e:
        from fastapi import HTTPException
        raise HTTPException(400, str(e))

    now = datetime.now()

    # Find existing subscription (including canceled ones for reactivation)
    result = await db.execute(
        select(ProxySubscription).where(
            ProxySubscription.user_id == user_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Renew / reactivate
        if existing.canceled_at:
            # Reactivating — start fresh from now, reset counters
            existing.canceled_at = None
            existing.hy2_password = generate_hy2_password()
            existing.total_days = 0
            existing.tli_spent = 0
        base = max(existing.expires_at, now) if existing.expires_at and not existing.canceled_at else now
        existing.expires_at = base + timedelta(days=actual_days)
        existing.total_days += actual_days
        existing.tli_spent += total_tli
        existing.plan_id = plan.id
        subscription = existing
    else:
        subscription = ProxySubscription(
            user_id=user_id,
            hy2_password=generate_hy2_password(),
            plan_id=plan.id,
            total_days=actual_days,
            started_at=now,
            expires_at=now + timedelta(days=actual_days),
            tli_spent=total_tli,
        )
        db.add(subscription)

    # Audit log
    db.add(ProxyTopUp(
        user_id=user_id,
        plan_id=plan.id,
        days=actual_days,
        tli_amount=total_tli,
        remark=f"代理订阅 {plan.name} x{days}份",
    ))

    await db.commit()
    await db.refresh(subscription)

    # Sync sing-box
    await sync_singbox(db)

    return {
        "subscription_id": subscription.id,
        "expires_at": subscription.expires_at,
        "days_remaining": (subscription.expires_at - now).days + 1,
        "tli_balance": new_balance,
    }


# ── Cancel ──────────────────────────────────────────────────────────────────

async def cancel_subscription(db, user_id: int) -> bool:
    """Cancel a user's subscription (no refund)."""
    from sqlalchemy import select
    from models import ProxySubscription
    from fastapi import HTTPException

    result = await db.execute(
        select(ProxySubscription).where(
            ProxySubscription.user_id == user_id,
            ProxySubscription.canceled_at == None,
        )
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(404, "没有活跃的代理订阅")

    sub.canceled_at = datetime.now()
    await db.commit()
    await sync_singbox(db)
    return True


# ── FlClash YAML generation ─────────────────────────────────────────────────

CLASH_TEMPLATE = r"""# FlClash / Clash Meta 配置 — 用户 {username}
# 自建节点 47.245.62.85 — Hysteria2
# 到期时间: {expires_at}
mixed-port: 7890
allow-lan: false
mode: rule
log-level: warning
ipv6: false
unified-delay: true
tcp-concurrent: true

tun:
  enable: false
  stack: system
  auto-route: true
  auto-detect-interface: true
  dns-hijack:
    - any:53

dns:
  enable: true
  listen: 127.0.0.1:1053
  ipv6: false
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  fake-ip-filter:
    - "*.lan"
    - "*.local"
    - "+.aiotedu.cc"
  default-nameserver:
    - 223.5.5.5
    - 119.29.29.29
  nameserver:
    - https://223.5.5.5/dns-query
    - https://1.12.12.12/dns-query
  proxy-server-nameserver:
    - https://223.5.5.5/dns-query

proxies:
  - name: "T粒加油站-HY2"
    type: hysteria2
    server: {server_ip}
    port: {hy2_port}
    password: "{hy2_password}"
    obfs: salamander
    obfs-password: "{hy2_obfs_password}"
    sni: {hy2_sni}
    skip-cert-verify: true
    udp: true

proxy-groups:
  - name: "AI专线"
    type: select
    proxies:
      - "T粒加油站-HY2"
      - DIRECT
  - name: "其它流量"
    type: select
    proxies:
      - DIRECT
      - "T粒加油站-HY2"

rules:
  # —— AI 相关 ——
  - DOMAIN-SUFFIX,anthropic.com,AI专线
  - DOMAIN-SUFFIX,claude.ai,AI专线
  - DOMAIN-SUFFIX,claude.com,AI专线
  - DOMAIN-SUFFIX,openai.com,AI专线
  - DOMAIN-SUFFIX,chatgpt.com,AI专线
  - DOMAIN-SUFFIX,oaistatic.com,AI专线
  - DOMAIN-SUFFIX,oaiusercontent.com,AI专线
  - DOMAIN-SUFFIX,huggingface.co,AI专线
  - DOMAIN-SUFFIX,perplexity.ai,AI专线
  - DOMAIN-SUFFIX,mistral.ai,AI专线
  - DOMAIN-SUFFIX,cursor.com,AI专线
  - DOMAIN-SUFFIX,github.com,AI专线
  - DOMAIN-SUFFIX,githubassets.com,AI专线
  - DOMAIN-SUFFIX,githubusercontent.com,AI专线
  # —— Google 全家桶 ——
  - DOMAIN-KEYWORD,google,AI专线
  - DOMAIN-SUFFIX,google.com,AI专线
  - DOMAIN-SUFFIX,google.com.hk,AI专线
  - DOMAIN-SUFFIX,googleapis.com,AI专线
  - DOMAIN-SUFFIX,generativelanguage.googleapis.com,AI专线
  - DOMAIN-SUFFIX,gemini.google.com,AI专线
  - DOMAIN-SUFFIX,googleusercontent.com,AI专线
  - DOMAIN-SUFFIX,gstatic.com,AI专线
  - DOMAIN-SUFFIX,gmail.com,AI专线
  - DOMAIN-SUFFIX,googlevideo.com,AI专线
  - DOMAIN-SUFFIX,youtube.com,AI专线
  - DOMAIN-SUFFIX,youtube-nocookie.com,AI专线
  - DOMAIN-SUFFIX,youtubei.googleapis.com,AI专线
  - DOMAIN-SUFFIX,ytimg.com,AI专线
  - DOMAIN-SUFFIX,ggpht.com,AI专线
  # —— 社交 / 社区 ——
  - DOMAIN-SUFFIX,twitter.com,AI专线
  - DOMAIN-SUFFIX,x.com,AI专线
  - DOMAIN-SUFFIX,reddit.com,AI专线
  - DOMAIN-SUFFIX,discord.com,AI专线
  - DOMAIN-SUFFIX,telegram.org,AI专线
  # —— 开发 ——
  - DOMAIN-SUFFIX,stackoverflow.com,AI专线
  - DOMAIN-SUFFIX,docker.com,AI专线
  - DOMAIN-SUFFIX,docker.io,AI专线
  - DOMAIN-SUFFIX,registry-1.docker.io,AI专线
  - DOMAIN-SUFFIX,cloudflare.com,AI专线
  - DOMAIN-SUFFIX,wikipedia.org,AI专线
  # —— 常用 ——
  - DOMAIN-SUFFIX,notion.so,AI专线
  - DOMAIN-SUFFIX,figma.com,AI专线
  - DOMAIN-SUFFIX,medium.com,AI专线
  # —— TikTok ——
  - DOMAIN-SUFFIX,tiktok.com,AI专线
  - DOMAIN-SUFFIX,tiktokv.com,AI专线
  - DOMAIN-SUFFIX,tiktokcdn.com,AI专线
  - DOMAIN-SUFFIX,tiktokcdn-us.com,AI专线
  - DOMAIN-SUFFIX,tiktokcdn-eu.com,AI专线
  - DOMAIN-SUFFIX,tiktok-share.com,AI专线
  - DOMAIN-SUFFIX,tiktok.org,AI专线
  - DOMAIN-SUFFIX,ibytedtos.com,AI专线
  - DOMAIN-SUFFIX,bytedap.com,AI专线
  - DOMAIN-SUFFIX,byteoversea.com,AI专线
  - DOMAIN-SUFFIX,bytecdn.cn,AI专线
  - DOMAIN-SUFFIX,bytedance.com,AI专线
  - DOMAIN-KEYWORD,tiktok,AI专线
  - DOMAIN-KEYWORD,bytedance,AI专线
  - DOMAIN-KEYWORD,anthropic,AI专线
  - DOMAIN-KEYWORD,claude,AI专线
  # —— 自己的网关：直连 ——
  - DOMAIN-SUFFIX,aiotedu.cc,DIRECT
  # —— 国内/局域网：直连 ——
  - GEOIP,LAN,DIRECT,no-resolve
  - GEOIP,CN,DIRECT
  # —— 其余：交给"其它流量"组（默认直连）——
  - MATCH,其它流量
"""


def generate_flclash_yaml(username: str, hy2_password: str, expires_at: str = "") -> str:
    """Generate a personalized FlClash YAML config for a user."""
    return CLASH_TEMPLATE.format(
        username=username,
        hy2_password=hy2_password,
        expires_at=expires_at,
        server_ip=SERVER_IP,
        hy2_port=HY2_PORT,
        hy2_sni=HY2_SNI,
        hy2_obfs_password=HY2_OBFS_PASSWORD,
    )
