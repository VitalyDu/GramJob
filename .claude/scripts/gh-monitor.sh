#!/usr/bin/env bash
# Monitors GitHub Actions after git push. Called by Claude Code PostToolUse hook.
# Exits with code 2 to wake Claude if deploy fails (asyncRewake).

REPO="VitalyDu/GramJob"
COMMIT=$(git rev-parse HEAD 2>/dev/null) || exit 0

echo "Ожидаю запуска GitHub Actions для коммита ${COMMIT:0:7}..."

# Wait up to 30s for GitHub to register the run
RUN_IDS=""
for attempt in 1 2 3; do
  sleep 10
  RUN_IDS=$(gh run list --repo "$REPO" --commit "$COMMIT" --json databaseId -q '.[].databaseId' 2>/dev/null)
  [ -n "$RUN_IDS" ] && break
done

if [ -z "$RUN_IDS" ]; then
  echo "Деплой не запустился (нет изменений в отслеживаемых путях)"
  exit 0
fi

echo "Слежу за runs: $(echo "$RUN_IDS" | tr '\n' ' ')"

TIMEOUT=720
INTERVAL=20
ELAPSED=0
FAILED=0
PENDING="$RUN_IDS"

while [ -n "$PENDING" ] && [ "$ELAPSED" -lt "$TIMEOUT" ]; do
  NEW_PENDING=""
  for RUN_ID in $PENDING; do
    DATA=$(gh run view "$RUN_ID" --repo "$REPO" --json status,conclusion,name 2>/dev/null)
    STATUS=$(echo "$DATA" | jq -r '.status')
    NAME=$(echo "$DATA" | jq -r '.name')
    CONCLUSION=$(echo "$DATA" | jq -r '.conclusion')

    if [ "$STATUS" = "completed" ]; then
      if [ "$CONCLUSION" = "success" ] || [ "$CONCLUSION" = "skipped" ]; then
        echo "OK '$NAME' (#$RUN_ID): $CONCLUSION"
      else
        echo "FAIL '$NAME' (#$RUN_ID): $CONCLUSION"
        echo "=== Логи ошибки ==="
        gh run view "$RUN_ID" --repo "$REPO" --log-failed 2>&1 | tail -200
        FAILED=1
      fi
    else
      NEW_PENDING="$NEW_PENDING $RUN_ID"
    fi
  done
  PENDING=$(echo "$NEW_PENDING" | xargs 2>/dev/null || true)
  [ -n "$PENDING" ] && sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
done

if [ -n "$PENDING" ]; then
  echo "Таймаут: runs $PENDING всё ещё running после $((TIMEOUT / 60)) мин"
fi

[ "$FAILED" -eq 1 ] && exit 2
exit 0
