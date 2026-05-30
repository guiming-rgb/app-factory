#!/usr/bin/env bash
set -euo pipefail
MARKER="# app-factory-maintainer-remind"
existing="$(crontab -l 2>/dev/null || true)"
filtered="$(echo "$existing" | grep -v "$MARKER" || true)"
if [[ -n "$(echo "$filtered" | sed '/^[[:space:]]*$/d')" ]]; then
  echo "$filtered" | crontab -
else
  crontab -r 2>/dev/null || true
fi
echo "✅ 已卸载维护者 cron 提醒"
