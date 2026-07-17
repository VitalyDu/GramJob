#!/usr/bin/env bash
# GramJob PostgreSQL backup — daily dump with rotation.
#
# Install on backend VPS:
#   1. Copy this file to /opt/gramjob/ops/pg-backup.sh, chmod +x
#   2. Copy ops/pg-backup.env.example to /etc/gramjob-backup.env, fill in creds
#   3. Add cron entry (see ops/pg-backup.cron)
#
# Every run:
#   - Dumps the database to $BACKUP_DIR/gramjob-YYYY-MM-DD.sql.gz
#   - Deletes dumps older than $RETENTION_DAYS
#   - Writes result to $LOG_FILE (single line per run for easy grep)
set -euo pipefail

CONFIG_FILE="${GRAMJOB_BACKUP_CONFIG:-/etc/gramjob-backup.env}"
if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$CONFIG_FILE"; set +a
fi

: "${DATABASE_HOST:=localhost}"
: "${DATABASE_PORT:=5432}"
: "${DATABASE_NAME:?DATABASE_NAME is required}"
: "${DATABASE_USERNAME:?DATABASE_USERNAME is required}"
: "${DATABASE_PASSWORD:?DATABASE_PASSWORD is required}"
: "${BACKUP_DIR:=/var/backups/gramjob}"
: "${RETENTION_DAYS:=7}"
: "${LOG_FILE:=/var/log/gramjob-backup.log}"

mkdir -p "$BACKUP_DIR"
DATE=$(date -u +%Y-%m-%d)
DUMP_FILE="$BACKUP_DIR/gramjob-$DATE.sql.gz"

log() {
  echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') $*" | tee -a "$LOG_FILE"
}

log "backup start database=$DATABASE_NAME target=$DUMP_FILE"

# pg_dump respects PGPASSWORD; use -Fc for a custom-format dump only if you
# plan to restore with pg_restore. Plain SQL + gzip is portable and grep-able.
export PGPASSWORD="$DATABASE_PASSWORD"

if pg_dump \
  --host="$DATABASE_HOST" \
  --port="$DATABASE_PORT" \
  --username="$DATABASE_USERNAME" \
  --no-owner --no-privileges \
  "$DATABASE_NAME" | gzip -9 > "$DUMP_FILE.tmp"; then
  mv "$DUMP_FILE.tmp" "$DUMP_FILE"
  SIZE=$(stat -c%s "$DUMP_FILE" 2>/dev/null || stat -f%z "$DUMP_FILE")
  log "backup ok file=$DUMP_FILE size=${SIZE}B"
else
  rm -f "$DUMP_FILE.tmp"
  log "backup FAILED database=$DATABASE_NAME"
  exit 1
fi

# Rotation — keep the last $RETENTION_DAYS days
DELETED=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'gramjob-*.sql.gz' -mtime "+$RETENTION_DAYS" -print -delete | wc -l)
log "rotation deleted=$DELETED retention=${RETENTION_DAYS}d"
