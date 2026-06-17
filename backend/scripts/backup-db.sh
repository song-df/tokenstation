#!/usr/bin/env bash
# WAL-safe daily backup of the gateway SQLite DB.
# Uses `sqlite3 .backup`, which produces a single consistent file with the WAL
# already merged in — so a plain `cp data.db` (which would lose un-checkpointed
# transactions under WAL) is NOT used. Keeps the last RETENTION_DAYS copies.
set -euo pipefail

DB="/www/wwwroot/ai.aiotedu.cc/api/data.db"
DEST="/root/db-backups"
RETENTION_DAYS=14
LOG="/root/db-backups/backup.log"

mkdir -p "$DEST"
ts="$(date +%Y%m%d-%H%M%S)"
out="$DEST/data-$ts.db"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >>"$LOG"; }

if [[ ! -f "$DB" ]]; then
    log "ERROR: source DB not found at $DB"
    exit 1
fi

# Hot, WAL-safe backup (does not lock out the running app).
if ! sqlite3 "$DB" ".backup '$out'"; then
    log "ERROR: sqlite3 .backup failed for $out"
    exit 1
fi

# Verify the backup is not corrupt before trusting it / pruning old ones.
check="$(sqlite3 "$out" 'PRAGMA integrity_check;' 2>&1 || true)"
if [[ "$check" != "ok" ]]; then
    log "ERROR: integrity_check FAILED on $out -> $check (keeping it, not pruning)"
    exit 1
fi

size="$(du -h "$out" | cut -f1)"
log "OK: $out ($size), integrity ok"

# Prune backups older than retention window (only after a verified-good backup).
find "$DEST" -maxdepth 1 -name 'data-*.db' -type f -mtime +"$RETENTION_DAYS" -print -delete >>"$LOG" 2>&1 || true
