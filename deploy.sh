#!/bin/bash
# T粒加油站 · 前端部署脚本
# 构建前端并上传到生产云主机
#
# 使用方式：
#   ./deploy.sh               # 构建 + 上传
#   SKIP_BUILD=1 ./deploy.sh  # 跳过构建，仅上传已有 dist

set -euo pipefail

KEY="${KEY:-$HOME/workspace/aiotedu.cc/aiotedu.pem}"
HOST="${HOST:-your-server-ip}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_DIR="/www/wwwroot/ai.aiotedu.cc"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/frontend/dist"

echo ""
echo "  T粒加油站 · 前端部署"
echo "  目标: ${REMOTE_USER}@${HOST}:${REMOTE_DIR}/"
echo ""

if [ ! -f "$KEY" ]; then
  echo "[错误] 未找到 SSH 私钥: $KEY"
  exit 1
fi

SSH_CMD="ssh -i $KEY -o StrictHostKeyChecking=accept-new"
SCP_CMD="scp -i $KEY -o StrictHostKeyChecking=accept-new"

if [ "${SKIP_BUILD:-0}" = "1" ]; then
  echo "[提示] 跳过构建"
else
  echo "[1/2] 构建前端..."
  cd "$SCRIPT_DIR/frontend"
  npx vite build
  echo "  OK"
fi

if [ ! -d "$SOURCE_DIR" ] || [ ! -f "$SOURCE_DIR/index.html" ]; then
  echo "[错误] 未找到构建产物"
  exit 1
fi

echo "[2/2] 上传..."
$SSH_CMD "${REMOTE_USER}@${HOST}" "rm -rf ${REMOTE_DIR}/assets/*"
$SCP_CMD "$SOURCE_DIR/index.html" "${REMOTE_USER}@${HOST}:${REMOTE_DIR}/index.html"
$SCP_CMD "$SOURCE_DIR/favicon.svg" "${REMOTE_USER}@${HOST}:${REMOTE_DIR}/favicon.svg"
$SCP_CMD "$SOURCE_DIR/assets/"* "${REMOTE_USER}@${HOST}:${REMOTE_DIR}/assets/"

echo ""
echo "  完成 $(date '+%H:%M:%S')  https://ai.aiotedu.cc/"
