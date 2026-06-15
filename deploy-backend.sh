#!/bin/bash
# ── new-api 后端部署脚本 ─────────────────────────────────────────────────────
# 用法:
#   ./deploy-backend.sh <new_binary>          将新二进制部署到生产(本地→scp→生产)
#   ./deploy-backend.sh --local <new_binary>  已在生产服务器上本地部署
#   ./deploy-backend.sh --force <new_binary>  跳过确认提示
#   ./deploy-backend.sh --skip-backup <bin>   跳过备份(仅紧急热修复)
#
# 流程: 预检→备份→停止(强制释放端口)→部署→启动→验证→失败回滚
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SSH_KEY="${KEY:-$HOME/workspace/aiotedu.cc/aiotedu.pem}"
SSH_HOST="${HOST:-47.245.62.85}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_DIR="/opt/newapi"
SERVICE_NAME="newapi.service"
PORT=8002
HEALTH_URL="http://localhost:${PORT}/status"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "[$(date '+%H:%M:%S')] $*"; }
ok()   { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()  { echo -e "${RED}[FATAL]${NC} $*"; exit 1; }

LOCAL_MODE=false; FORCE=false; SKIP_BACKUP=false; NEW_BINARY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --local) LOCAL_MODE=true; shift ;;
    --force) FORCE=true; shift ;;
    --skip-backup) SKIP_BACKUP=true; shift ;;
    *) NEW_BINARY="$1"; shift ;;
  esac
done

if [[ -z "$NEW_BINARY" ]]; then
  echo "用法: $0 [--local] [--force] [--skip-backup] <new_binary>"
  echo "  --local        已在生产服务器上执行(不 scp)"
  echo "  --force        跳过确认提示"
  echo "  --skip-backup  跳过备份步骤(仅紧急热修复)"
  exit 1
fi

remote() {
  if $LOCAL_MODE; then bash -c "$1"
  else ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 "${REMOTE_USER}@${SSH_HOST}" "$1"
  fi
}

# ── Phase 1: 预检 ────────────────────────────────────────────────────────────
log "Phase 1/7 预检..."
$LOCAL_MODE && { [[ -f "$NEW_BINARY" ]] || die "文件不存在: $NEW_BINARY"; }

CURRENT_PID=$(remote "systemctl show $SERVICE_NAME -p MainPID --value 2>/dev/null" || echo "0")
CURRENT_START=$(remote "systemctl show $SERVICE_NAME -p ActiveEnterTimestamp --value 2>/dev/null" || echo "unknown")
log "  当前 PID: $CURRENT_PID  启动时间: $CURRENT_START"

$FORCE || { echo -n "确认部署? 这将中断服务 2-5 秒 [y/N] "; read -r c; [[ "$c" =~ ^[Yy]$ ]] || die "用户取消"; }

# ── Phase 2: 备份 ─────────────────────────────────────────────────────────────
if $SKIP_BACKUP; then
  warn "Phase 2/7 跳过备份"
else
  log "Phase 2/7 备份..."
  remote "
    cd $REMOTE_DIR
    [[ -f new-api ]] && cp new-api new-api.backup-${TIMESTAMP}
    [[ -f data/data.db ]] && cp data/data.db data/data.db.backup-${TIMESTAMP}
    for p in new-api.backup-* data.db.backup-*; do
      ls -1t \$p 2>/dev/null | tail -n +6 | xargs -r rm -f
    done
  " || warn "备份部分失败,继续..."
  ok "备份完成"
fi

# ── Phase 3: 停止 ─────────────────────────────────────────────────────────────
log "Phase 3/7 停止服务..."
remote "systemctl stop $SERVICE_NAME" || warn "systemctl stop 返回非零"

PORT_FREE=false
for i in $(seq 1 15); do
  remote "! ss -tlnp | grep -q ':$PORT '" 2>/dev/null && { ok "端口 $PORT 已释放 (${i}s)"; PORT_FREE=true; break; }
  sleep 1
done
if ! $PORT_FREE; then
  warn "强制释放端口 $PORT..."
  remote "fuser -k ${PORT}/tcp 2>/dev/null || true"; sleep 2
  remote "ss -tlnp | grep -q ':$PORT '" 2>/dev/null && die "无法释放端口 $PORT,中止"
  ok "端口已强制释放"
fi

# ── Phase 4: 部署 ─────────────────────────────────────────────────────────────
log "Phase 4/7 部署..."
if $LOCAL_MODE; then
  cp "$NEW_BINARY" "$REMOTE_DIR/new-api" && chmod +x "$REMOTE_DIR/new-api"
else
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$NEW_BINARY" "${REMOTE_USER}@${SSH_HOST}:${REMOTE_DIR}/new-api.tmp"
  remote "mv $REMOTE_DIR/new-api.tmp $REMOTE_DIR/new-api && chmod +x $REMOTE_DIR/new-api"
fi
ok "二进制已就位"

# ── Phase 5: 启动 ─────────────────────────────────────────────────────────────
log "Phase 5/7 启动..."
remote "systemctl start $SERVICE_NAME"
STARTED=false
for i in $(seq 1 10); do
  if remote "ss -tlnp | grep -q ':$PORT '" 2>/dev/null; then
    NEW_PID=$(remote "ss -tlnp | grep ':$PORT ' | grep -oP 'pid=\K[0-9]+' || echo '?'")
    ok "服务已启动 PID=$NEW_PID (${i}s)"; STARTED=true; break
  fi
  sleep 1
done
$STARTED || die "端口 $PORT 未监听"

ACTIVE=$(remote "systemctl is-active $SERVICE_NAME" 2>/dev/null || echo "unknown")
[[ "$ACTIVE" == "active" ]] || die "systemctl 状态: $ACTIVE"
ok "systemctl: $ACTIVE"

# ── Phase 6: 验证 ─────────────────────────────────────────────────────────────
log "Phase 6/7 验证..."
ROLLBACK_NEEDED=false

HTTP_CODE=$(remote "curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 '$HEALTH_URL' 2>/dev/null" || echo "000")
if [[ "$HTTP_CODE" != "200" ]]; then
  warn "健康检查 HTTP $HTTP_CODE (期望 200)"; ROLLBACK_NEEDED=true
else
  ok "健康检查: HTTP $HTTP_CODE"
fi

FATAL_COUNT=$(remote "journalctl -u $SERVICE_NAME --no-pager --since '10 seconds ago' 2>/dev/null | grep -ci 'FATAL\|panic' || echo 0")
if [[ "$FATAL_COUNT" -gt 0 ]]; then
  warn "日志中有 FATAL/panic ($FATAL_COUNT 条)"; ROLLBACK_NEEDED=true
  remote "journalctl -u $SERVICE_NAME --no-pager --since '30 seconds ago' 2>/dev/null | grep -iE 'FATAL|panic' || true"
else
  ok "日志无致命错误"
fi

# ── Phase 7: 回滚或完成 ──────────────────────────────────────────────────────
if $ROLLBACK_NEEDED; then
  log "Phase 7/7 回滚..."
  remote "systemctl stop $SERVICE_NAME; sleep 2; fuser -k ${PORT}/tcp 2>/dev/null || true"
  LATEST_BACKUP=$(remote "ls -1t $REMOTE_DIR/new-api.backup-* 2>/dev/null | head -1 || true")
  [[ -n "$LATEST_BACKUP" ]] || die "无可用备份!"
  remote "cp $LATEST_BACKUP $REMOTE_DIR/new-api && chmod +x $REMOTE_DIR/new-api"
  warn "已恢复: $LATEST_BACKUP"
  remote "systemctl start $SERVICE_NAME"; sleep 3
  RHTTP=$(remote "curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 '$HEALTH_URL' 2>/dev/null" || echo "000")
  [[ "$RHTTP" == "200" ]] && ok "回滚成功 (HTTP $RHTTP)" || die "回滚失败! HTTP $RHTTP"
else
  log "Phase 7/7 完成"
  NEW_PID=$(remote "systemctl show $SERVICE_NAME -p MainPID --value 2>/dev/null" || echo "?")
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "  部署成功!  旧 PID: $CURRENT_PID → 新 PID: $NEW_PID"
  log "  备份: new-api.backup-${TIMESTAMP}"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi
