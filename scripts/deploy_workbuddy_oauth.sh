#!/usr/bin/env bash
# Deploy WorBuddy OAuth bridge without replacing unrelated production code.
set -euo pipefail

KEY="${KEY:-/Users/song/workspace/api.aiotedu.cc/aiotedu.pem}"
HOST="${HOST:-8.209.242.59}"
REMOTE="root@${HOST}"
APP="/www/wwwroot/ai.aiotedu.cc/api"
WEB_ROOT="/www/wwwroot/workbuddy.wiselink.cc"
NGINX_CONF="/etc/nginx/conf.d/worbuddy.cn.conf"
SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10)
SCP=(scp -i "$KEY" -o StrictHostKeyChecking=accept-new)

"${SCP[@]}" backend/routers/workbuddy_auth.py "$REMOTE:/tmp/workbuddy_auth.py"
"${SCP[@]}" workbuddy/index.html workbuddy/app.js workbuddy/styles.css workbuddy/account.html workbuddy/account.css workbuddy/account.js workbuddy/keys.html workbuddy/keys.js workbuddy/purchase.html workbuddy/purchase.css workbuddy/purchase.js workbuddy/payment-result.html workbuddy/payment-result.js workbuddy/settings.html workbuddy/settings.js "$REMOTE:$WEB_ROOT/"
"${SCP[@]}" deploy/nginx/worbuddy.cn.conf "$REMOTE:/tmp/worbuddy.cn.conf"

"${SSH[@]}" "$REMOTE" 'bash -s' -- "$APP" "$NGINX_CONF" <<'REMOTE_SCRIPT'
set -euo pipefail

app="$1"
nginx_conf="$2"
timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="/tmp/workbuddy-oauth-backup-$timestamp"
mkdir -p "$backup_dir"

cp "$app/config.py" "$backup_dir/config.py"
cp "$app/main.py" "$backup_dir/main.py"
cp "$app/routers/oauth.py" "$backup_dir/oauth.py"
cp "$nginx_conf" "$backup_dir/worbuddy.cn.conf"
if [ -f "$app/routers/workbuddy_auth.py" ]; then
  cp "$app/routers/workbuddy_auth.py" "$backup_dir/workbuddy_auth.py"
  had_workbuddy_router=1
else
  had_workbuddy_router=0
fi

rollback() {
  status=$?
  if [ "$status" -eq 0 ]; then return; fi
  echo "WorBuddy OAuth deployment failed (status $status); restoring $backup_dir" >&2
  cp "$backup_dir/config.py" "$app/config.py"
  cp "$backup_dir/main.py" "$app/main.py"
  cp "$backup_dir/oauth.py" "$app/routers/oauth.py"
  cp "$backup_dir/worbuddy.cn.conf" "$nginx_conf"
  if [ "$had_workbuddy_router" -eq 1 ]; then
    cp "$backup_dir/workbuddy_auth.py" "$app/routers/workbuddy_auth.py"
  else
    rm -f "$app/routers/workbuddy_auth.py"
  fi
  nginx -t && nginx -s reload || true
  systemctl restart aiotedu-backend.service || true
  exit "$status"
}
trap rollback EXIT

cp /tmp/workbuddy_auth.py "$app/routers/workbuddy_auth.py"
echo "installed WorBuddy router"
APP="$app" /usr/bin/python3 - <<'PY'
from pathlib import Path
import os
import secrets

app = Path(os.environ["APP"])
config = app / "config.py"
text = config.read_text()
if "workbuddy_oauth_client_id" not in text:
    secret = secrets.token_urlsafe(32)
    block = '''\n    # WorBuddy first-party OAuth client. This secret stays on this server only.\n    newapi_db_path: str = "/opt/newapi/data/data.db"\n    workbuddy_oauth_client_id: str = "workbuddy-web"\n    workbuddy_oauth_client_secret: str = "''' + secret + '''"\n    workbuddy_oauth_redirect_uri: str = "https://worbuddy.cn/workbuddy-auth/callback"\n    workbuddy_oauth_base_url: str = "https://t.wiselink.cc"\n    workbuddy_session_cookie: str = "workbuddy_session"\n'''
    marker = "\n    class Config:"
    if marker not in text:
        raise SystemExit("config insertion point missing")
    config.write_text(text.replace(marker, block + marker, 1))

oauth = app / "routers/oauth.py"
text = oauth.read_text()
old = "def _get_clients() -> list[dict]:\n    return json.loads(settings.oauth_clients_json)\n"
new = '''def _get_clients() -> list[dict]:\n    clients = json.loads(settings.oauth_clients_json)\n    if settings.workbuddy_oauth_client_secret and not any(\n        client.get("client_id") == settings.workbuddy_oauth_client_id for client in clients\n    ):\n        clients.append({\n            "client_id": settings.workbuddy_oauth_client_id,\n            "client_secret": settings.workbuddy_oauth_client_secret,\n            "redirect_uris": [settings.workbuddy_oauth_redirect_uri],\n        })\n    return clients\n'''
if old in text:
    oauth.write_text(text.replace(old, new, 1))
elif "workbuddy_oauth_client_secret" not in text:
    raise SystemExit("oauth insertion point missing")

main = app / "main.py"
text = main.read_text()
if "from routers import oauth, free_models, workbuddy_auth" not in text:
    text = text.replace(
        "from routers import oauth, free_models\n",
        "from routers import oauth, free_models, workbuddy_auth\n",
        1,
    )
if "app.include_router(workbuddy_auth.router)" not in text:
    marker = "app.include_router(free_models.router)  # OAuth2 at root level, no /api prefix\n"
    if marker not in text:
        raise SystemExit("main insertion point missing")
    text = text.replace(marker, marker + "app.include_router(workbuddy_auth.router)\n", 1)
if "workbuddy_auth" not in text:
    raise SystemExit("main patch missing")
main.write_text(text)
PY
echo "patched production OAuth configuration"

"$app/venv/bin/python3.8" -m py_compile \
  "$app/config.py" "$app/main.py" "$app/routers/oauth.py" "$app/routers/workbuddy_auth.py"
echo "compiled production modules"

cp /tmp/worbuddy.cn.conf "$nginx_conf"
nginx -t
nginx -s reload
systemctl restart aiotedu-backend.service
echo "reloaded nginx and restarted backend"

for _ in $(seq 1 10); do
  systemctl is-active --quiet aiotedu-backend.service && break
  sleep 1
done
systemctl is-active --quiet aiotedu-backend.service
echo "backend is active"

login_status="000"
for _ in $(seq 1 10); do
  login_status="$(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:8001/workbuddy-auth/login?popup=1' || true)"
  [ "$login_status" = "307" ] && break
  sleep 1
done
echo "WorBuddy login endpoint status: $login_status"
test "$login_status" = "307"
echo "WorBuddy login endpoint is reachable"
oauth_status="$(curl -s -o /dev/null -w '%{http_code}' --resolve t.wiselink.cc:443:127.0.0.1 'https://t.wiselink.cc/oauth/authorize?client_id=workbuddy-web&redirect_uri=https%3A%2F%2Fworbuddy.cn%2Fworkbuddy-auth%2Fcallback&response_type=code&state=verify')"
case "$oauth_status" in
  200|302|303|307) ;;
  *) echo "unexpected OAuth authorization status: $oauth_status" >&2; exit 1 ;;
esac

trap - EXIT
echo "WorBuddy OAuth deployed; backups: $backup_dir"
REMOTE_SCRIPT
