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

async def get_active_users(db) -> list[dict]:
    """Return list of active (non-expired, non-canceled, non-banned) subscriptions with port+password."""
    from sqlalchemy import select
    from models import ProxySubscription

    now = datetime.now()
    result = await db.execute(
        select(ProxySubscription).where(
            ProxySubscription.expires_at > now,
            ProxySubscription.canceled_at == None,
            ProxySubscription.banned_until == None,
        )
    )
    return [{"port": s.hy2_port, "password": s.hy2_password} for s in result.scalars().all()]


async def get_next_port(db) -> int:
    """Return the next available Hysteria2 port."""
    from sqlalchemy import select, func
    from models import ProxySubscription

    result = await db.execute(select(func.max(ProxySubscription.hy2_port)))
    max_port = result.scalar() or 8442
    return max_port + 1


def write_singbox_config(users: list[dict]) -> bool:
    """Rebuild sing-box config with per-user Hysteria2 inbounds and reload."""
    with open(SINGBOX_CONFIG_PATH, "r") as f:
        config = json.load(f)

    # Keep only non-hysteria2 inbounds
    config["inbounds"] = [
        ib for ib in config.get("inbounds", [])
        if ib.get("type") != "hysteria2"
    ]

    # Add per-user Hysteria2 inbounds
    for u in users:
        config["inbounds"].append({
            "type": "hysteria2",
            "tag": f"hysteria2-u{u['port']}",
            "listen": "0.0.0.0",
            "listen_port": u["port"],
            "obfs": {"type": "salamander", "password": HY2_OBFS_PASSWORD},
            "users": [{"password": u["password"]}],
            "tls": {
                "enabled": True,
                "certificate_path": "/etc/sing-box/hysteria2.crt",
                "key_path": "/etc/sing-box/hysteria2.key",
            },
        })

    # Atomic write
    tmp_path = SINGBOX_CONFIG_PATH + ".tmp"
    with open(tmp_path, "w") as f:
        json.dump(config, f, indent=2)
    os.rename(tmp_path, SINGBOX_CONFIG_PATH)

    subprocess.run(SYSTEMCTL_RELOAD, check=False, capture_output=True)
    logger.info(f"sing-box synced: {len(users)} active user(s)")
    return True


async def sync_singbox(db) -> bool:
    """Full sync: query active users → rebuild sing-box config → reload."""
    users = await get_active_users(db)
    return write_singbox_config(users)


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
        logger.info(f"Expired {len(expired)} proxy subscription(s)")

    # Always sync — also handles unbans and startup state
    await sync_singbox(db)
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
        port = await get_next_port(db)
        subscription = ProxySubscription(
            user_id=user_id,
            hy2_password=generate_hy2_password(),
            hy2_port=port,
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
  # —— AI / LLM ——
  - DOMAIN-KEYWORD,anthropic,AI专线
  - DOMAIN-KEYWORD,claude,AI专线
  - DOMAIN-KEYWORD,openai,AI专线
  - DOMAIN-SUFFIX,openai.com,AI专线
  - DOMAIN-SUFFIX,chatgpt.com,AI专线
  - DOMAIN-SUFFIX,oaistatic.com,AI专线
  - DOMAIN-SUFFIX,oaiusercontent.com,AI专线
  - DOMAIN-SUFFIX,sora.com,AI专线
  - DOMAIN-SUFFIX,anthropic.com,AI专线
  - DOMAIN-SUFFIX,claude.ai,AI专线
  - DOMAIN-SUFFIX,claude.com,AI专线
  - DOMAIN-SUFFIX,perplexity.ai,AI专线
  - DOMAIN-SUFFIX,mistral.ai,AI专线
  - DOMAIN-SUFFIX,x.ai,AI专线
  - DOMAIN-SUFFIX,meta.ai,AI专线
  - DOMAIN-SUFFIX,huggingface.co,AI专线
  - DOMAIN-SUFFIX,cursor.com,AI专线
  - DOMAIN-SUFFIX,cursor.sh,AI专线
  - DOMAIN-SUFFIX,grazie.ai,AI专线
  - DOMAIN-SUFFIX,jetbrains.ai,AI专线
  - DOMAIN-SUFFIX,copilot.microsoft.com,AI专线
  - DOMAIN-SUFFIX,copilot.cloud.microsoft,AI专线
  - DOMAIN,api.githubcopilot.com,AI专线
  - DOMAIN,copilot-proxy.githubusercontent.com,AI专线
  - DOMAIN-SUFFIX,intercom.io,AI专线
  - DOMAIN-SUFFIX,intercomcdn.com,AI专线
  - DOMAIN-SUFFIX,client-api.arkoselabs.com,AI专线
  - DOMAIN-SUFFIX,events.statsigapi.net,AI专线
  - DOMAIN-SUFFIX,featuregates.org,AI专线
  - DOMAIN-SUFFIX,identrust.com,AI专线
  - DOMAIN-SUFFIX,auth0.com,AI专线
  # —— Google 全家桶 ——
  - DOMAIN-KEYWORD,google,AI专线
  - DOMAIN-SUFFIX,google.com,AI专线
  - DOMAIN-SUFFIX,google.com.hk,AI专线
  - DOMAIN-SUFFIX,googlevideo.com,AI专线
  - DOMAIN-SUFFIX,gstatic.com,AI专线
  - DOMAIN-SUFFIX,googleapis.com,AI专线
  - DOMAIN-SUFFIX,googleusercontent.com,AI专线
  - DOMAIN-SUFFIX,gmail.com,AI专线
  - DOMAIN-SUFFIX,ggpht.com,AI专线
  - DOMAIN-SUFFIX,youtube.com,AI专线
  - DOMAIN-SUFFIX,youtube-nocookie.com,AI专线
  - DOMAIN-SUFFIX,youtubei.googleapis.com,AI专线
  - DOMAIN-SUFFIX,ytimg.com,AI专线
  - DOMAIN-SUFFIX,googlesyndication.com,AI专线
  - DOMAIN-SUFFIX,doubleclick.net,AI专线
  - DOMAIN-SUFFIX,googleadservices.com,AI专线
  - DOMAIN-SUFFIX,google-analytics.com,AI专线
  - DOMAIN,gemini.google.com,AI专线
  - DOMAIN,generativelanguage.googleapis.com,AI专线
  - DOMAIN,aistudio.google.com,AI专线
  - DOMAIN,bard.google.com,AI专线
  - DOMAIN,ai.google.dev,AI专线
  - DOMAIN,notebooklm.google.com,AI专线
  # —— 社交 / 社区 ——
  - DOMAIN-SUFFIX,twitter.com,AI专线
  - DOMAIN-SUFFIX,twitter.co,AI专线
  - DOMAIN-SUFFIX,x.com,AI专线
  - DOMAIN-SUFFIX,twimg.com,AI专线
  - DOMAIN-SUFFIX,t.co,AI专线
  - DOMAIN-SUFFIX,reddit.com,AI专线
  - DOMAIN-SUFFIX,redd.it,AI专线
  - DOMAIN-SUFFIX,redditmedia.com,AI专线
  - DOMAIN-SUFFIX,redditstatic.com,AI专线
  - DOMAIN-SUFFIX,discord.com,AI专线
  - DOMAIN-SUFFIX,discord.gg,AI专线
  - DOMAIN-SUFFIX,discord.media,AI专线
  - DOMAIN-SUFFIX,discordapp.com,AI专线
  - DOMAIN-SUFFIX,discordapp.net,AI专线
  - DOMAIN-SUFFIX,telegram.org,AI专线
  - DOMAIN-SUFFIX,telegram.me,AI专线
  - DOMAIN-SUFFIX,telesco.pe,AI专线
  - DOMAIN-SUFFIX,facebook.com,AI专线
  - DOMAIN-SUFFIX,fb.com,AI专线
  - DOMAIN-SUFFIX,fbcdn.net,AI专线
  - DOMAIN-SUFFIX,instagram.com,AI专线
  - DOMAIN-SUFFIX,cdninstagram.com,AI专线
  - DOMAIN-SUFFIX,messenger.com,AI专线
  - DOMAIN-SUFFIX,whatsapp.com,AI专线
  - DOMAIN-SUFFIX,whatsapp.net,AI专线
  - DOMAIN-SUFFIX,linkedin.com,AI专线
  - DOMAIN-SUFFIX,licdn.com,AI专线
  - DOMAIN-SUFFIX,pinterest.com,AI专线
  - DOMAIN-SUFFIX,pinimg.com,AI专线
  - DOMAIN-SUFFIX,snapchat.com,AI专线
  - DOMAIN-SUFFIX,tumblr.com,AI专线
  - DOMAIN-SUFFIX,quora.com,AI专线
  - DOMAIN-SUFFIX,quoracdn.net,AI专线
  - DOMAIN-SUFFIX,imgur.com,AI专线
  # —— 媒体 / 流媒体 ——
  - DOMAIN-SUFFIX,netflix.com,AI专线
  - DOMAIN-SUFFIX,netflix.net,AI专线
  - DOMAIN-SUFFIX,nflxext.com,AI专线
  - DOMAIN-SUFFIX,nflximg.com,AI专线
  - DOMAIN-SUFFIX,nflxvideo.net,AI专线
  - DOMAIN-SUFFIX,nflxso.net,AI专线
  - DOMAIN-SUFFIX,spotify.com,AI专线
  - DOMAIN-SUFFIX,scdn.co,AI专线
  - DOMAIN-SUFFIX,spotifycdn.com,AI专线
  - DOMAIN-SUFFIX,spotifycdn.net,AI专线
  - DOMAIN-SUFFIX,disneyplus.com,AI专线
  - DOMAIN-SUFFIX,disney-plus.net,AI专线
  - DOMAIN-SUFFIX,dssott.com,AI专线
  - DOMAIN-SUFFIX,bamgrid.com,AI专线
  - DOMAIN-SUFFIX,hulu.com,AI专线
  - DOMAIN-SUFFIX,hbomax.com,AI专线
  - DOMAIN-SUFFIX,hbo.com,AI专线
  - DOMAIN-SUFFIX,hbogo.com,AI专线
  - DOMAIN-SUFFIX,primevideo.com,AI专线
  - DOMAIN-SUFFIX,amazonvideo.com,AI专线
  - DOMAIN-SUFFIX,aiv-cdn.net,AI专线
  - DOMAIN-SUFFIX,media-amazon.com,AI专线
  - DOMAIN-SUFFIX,pv-cdn.net,AI专线
  - DOMAIN-SUFFIX,twitch.tv,AI专线
  - DOMAIN-SUFFIX,ttvnw.net,AI专线
  - DOMAIN-SUFFIX,jtvnw.net,AI专线
  - DOMAIN-SUFFIX,vimeo.com,AI专线
  - DOMAIN-SUFFIX,vimeocdn.com,AI专线
  - DOMAIN-SUFFIX,dailymotion.com,AI专线
  - DOMAIN-SUFFIX,dmcdn.net,AI专线
  - DOMAIN-SUFFIX,bbc.com,AI专线
  - DOMAIN-SUFFIX,bbc.co.uk,AI专线
  - DOMAIN-SUFFIX,bbci.co.uk,AI专线
  - DOMAIN-SUFFIX,ted.com,AI专线
  - DOMAIN-SUFFIX,tedcdn.com,AI专线
  # —— 开发 ——
  - DOMAIN-SUFFIX,github.com,AI专线
  - DOMAIN-SUFFIX,githubassets.com,AI专线
  - DOMAIN-SUFFIX,githubusercontent.com,AI专线
  - DOMAIN-SUFFIX,github.dev,AI专线
  - DOMAIN-SUFFIX,github.io,AI专线
  - DOMAIN-SUFFIX,gitlab.com,AI专线
  - DOMAIN-SUFFIX,bitbucket.org,AI专线
  - DOMAIN-SUFFIX,stackoverflow.com,AI专线
  - DOMAIN-SUFFIX,stackexchange.com,AI专线
  - DOMAIN-SUFFIX,serverfault.com,AI专线
  - DOMAIN-SUFFIX,superuser.com,AI专线
  - DOMAIN-SUFFIX,askubuntu.com,AI专线
  - DOMAIN-SUFFIX,docker.com,AI专线
  - DOMAIN-SUFFIX,docker.io,AI专线
  - DOMAIN-SUFFIX,cloudflare.com,AI专线
  - DOMAIN-SUFFIX,cloudflareinsights.com,AI专线
  - DOMAIN-SUFFIX,cloudflareclient.com,AI专线
  - DOMAIN-SUFFIX,npmjs.com,AI专线
  - DOMAIN-SUFFIX,npmjs.org,AI专线
  - DOMAIN-SUFFIX,jsdelivr.net,AI专线
  - DOMAIN-SUFFIX,unpkg.com,AI专线
  - DOMAIN-SUFFIX,cdnjs.com,AI专线
  - DOMAIN-SUFFIX,codepen.io,AI专线
  - DOMAIN-SUFFIX,jsfiddle.net,AI专线
  - DOMAIN-SUFFIX,replit.com,AI专线
  - DOMAIN-SUFFIX,sourcegraph.com,AI专线
  - DOMAIN-SUFFIX,pypi.org,AI专线
  - DOMAIN-SUFFIX,pythonhosted.org,AI专线
  - DOMAIN-SUFFIX,rust-lang.org,AI专线
  - DOMAIN-SUFFIX,golang.org,AI专线
  - DOMAIN-SUFFIX,go.dev,AI专线
  - DOMAIN-SUFFIX,wikipedia.org,AI专线
  - DOMAIN-SUFFIX,wikimedia.org,AI专线
  - DOMAIN-SUFFIX,archive.org,AI专线
  # —— 生产力 / 办公 ——
  - DOMAIN-SUFFIX,notion.so,AI专线
  - DOMAIN-SUFFIX,notion.com,AI专线
  - DOMAIN-SUFFIX,figma.com,AI专线
  - DOMAIN-SUFFIX,figstatic.com,AI专线
  - DOMAIN-SUFFIX,medium.com,AI专线
  - DOMAIN-SUFFIX,slack.com,AI专线
  - DOMAIN-SUFFIX,slack-edge.com,AI专线
  - DOMAIN-SUFFIX,zoom.us,AI专线
  - DOMAIN-SUFFIX,zoom.com,AI专线
  - DOMAIN-SUFFIX,linear.app,AI专线
  - DOMAIN-SUFFIX,trello.com,AI专线
  - DOMAIN-SUFFIX,atlassian.com,AI专线
  - DOMAIN-SUFFIX,atlassian.net,AI专线
  - DOMAIN-SUFFIX,jira.com,AI专线
  - DOMAIN-SUFFIX,confluence.com,AI专线
  - DOMAIN-SUFFIX,microsoft.com,AI专线
  - DOMAIN-SUFFIX,live.com,AI专线
  - DOMAIN-SUFFIX,office.com,AI专线
  - DOMAIN-SUFFIX,office.net,AI专线
  - DOMAIN-SUFFIX,office365.com,AI专线
  - DOMAIN-SUFFIX,sharepoint.com,AI专线
  - DOMAIN-SUFFIX,onedrive.com,AI专线
  - DOMAIN-SUFFIX,outlook.com,AI专线
  - DOMAIN-SUFFIX,outlookmobile.com,AI专线
  - DOMAIN-SUFFIX,teams.microsoft.com,AI专线
  - DOMAIN-SUFFIX,visualstudio.com,AI专线
  - DOMAIN-SUFFIX,azure.com,AI专线
  - DOMAIN-SUFFIX,msn.com,AI专线
  - DOMAIN-SUFFIX,bing.com,AI专线
  - DOMAIN-SUFFIX,dropbox.com,AI专线
  - DOMAIN-SUFFIX,dropboxstatic.com,AI专线
  - DOMAIN-SUFFIX,dropboxusercontent.com,AI专线
  - DOMAIN-SUFFIX,canva.com,AI专线
  - DOMAIN-SUFFIX,grammarly.com,AI专线
  # —— 电商 / 支付 ——
  - DOMAIN-SUFFIX,amazon.com,AI专线
  - DOMAIN-SUFFIX,amazon.co.uk,AI专线
  - DOMAIN-SUFFIX,amazon.co.jp,AI专线
  - DOMAIN-SUFFIX,amazon.de,AI专线
  - DOMAIN-SUFFIX,paypal.com,AI专线
  - DOMAIN-SUFFIX,paypalobjects.com,AI专线
  - DOMAIN-SUFFIX,ebay.com,AI专线
  - DOMAIN-SUFFIX,ebayimg.com,AI专线
  - DOMAIN-SUFFIX,ebaystatic.com,AI专线
  - DOMAIN-SUFFIX,shopify.com,AI专线
  - DOMAIN-SUFFIX,myshopify.com,AI专线
  - DOMAIN-SUFFIX,stripe.com,AI专线
  - DOMAIN-SUFFIX,etsy.com,AI专线
  # —— Apple ——
  - DOMAIN-SUFFIX,apple.com,AI专线
  - DOMAIN-SUFFIX,icloud.com,AI专线
  - DOMAIN-SUFFIX,icloud-content.com,AI专线
  - DOMAIN-SUFFIX,mzstatic.com,AI专线
  - DOMAIN-SUFFIX,aaplimg.com,AI专线
  - DOMAIN-SUFFIX,apple-dns.net,AI专线
  - DOMAIN-SUFFIX,apple.news,AI专线
  # —— TikTok / 字节 ——
  - DOMAIN-KEYWORD,tiktok,AI专线
  - DOMAIN-KEYWORD,bytedance,AI专线
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
  # —— 自己的网关：直连 ——
  - DOMAIN-SUFFIX,aiotedu.cc,DIRECT
  # —— 国内 / 局域网：直连 ——
  - GEOIP,LAN,DIRECT,no-resolve
  - GEOIP,CN,DIRECT
  # —— 其余：交给"其它流量"组（默认直连）——
  - MATCH,其它流量
"""


def generate_flclash_yaml(username: str, hy2_password: str, hy2_port: int, expires_at: str = "") -> str:
    """Generate a personalized FlClash YAML config for a user."""
    return CLASH_TEMPLATE.format(
        username=username,
        hy2_password=hy2_password,
        hy2_port=hy2_port,
        expires_at=expires_at,
        server_ip=SERVER_IP,
        hy2_sni=HY2_SNI,
        hy2_obfs_password=HY2_OBFS_PASSWORD,
    )


# ── Multi-IP detection & auto-ban ─────────────────────────────────────────

async def check_multi_ip(db) -> int:
    """
    Check for subscriptions being used from multiple IPs simultaneously.
    If detected, ban the password for 10 minutes.
    Returns number of users banned.
    """
    import subprocess as sp
    from models import ProxySubscription

    # Get all active subscriptions with their ports
    now = datetime.now()
    result = await db.execute(
        select(ProxySubscription).where(
            ProxySubscription.expires_at > now,
            ProxySubscription.canceled_at == None,
            ProxySubscription.banned_until == None,
        )
    )
    active_subs = {s.hy2_port: s for s in result.scalars().all()}
    if not active_subs:
        return 0

    # Get UDP connections per port
    try:
        out = sp.run(["ss", "-uln", "sport", ">=", "8443"], capture_output=True, text=True, timeout=5)
        lines = out.stdout.strip().split("\n")
    except Exception:
        return 0

    # Count unique IPs per port
    port_ips: dict[int, set] = {}
    for line in lines:
        parts = line.split()
        if len(parts) < 5:
            continue
        # ss -uln format: State  Recv-Q  Send-Q  Local Address:Port  Peer Address:Port
        local = parts[4] if len(parts) > 4 else ""
        peer = parts[5] if len(parts) > 5 else ""
        if ":" not in local or ":" not in peer:
            continue
        try:
            local_port = int(local.rsplit(":", 1)[-1])
            peer_ip = peer.rsplit(":", 1)[0]
        except ValueError:
            continue
        if local_port not in active_subs:
            continue
        if local_port not in port_ips:
            port_ips[local_port] = set()
        port_ips[local_port].add(peer_ip)

    # Ban users with 2+ distinct IPs
    banned = 0
    for port, ips in port_ips.items():
        if len(ips) >= 2 and port in active_subs:
            sub = active_subs[port]
            sub.banned_until = now + timedelta(minutes=10)
            logger.warning(
                f"Multi-IP detected on port {port} (user {sub.user_id}): {ips} — banned 10min"
            )
            banned += 1

    if banned:
        await db.commit()
        await sync_singbox(db)

    return banned
