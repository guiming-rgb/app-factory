#!/usr/bin/env bash
# 安装每天 5 次维护者提醒（macOS cron）
# npm run maintainer:install-reminders
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMIND="$ROOT/scripts/maintainer-daily-remind.sh"
chmod +x "$REMIND"

# 默认：每天 9、12、15、18、21 点（本机时区）
HOURS="${MAINTAINER_REMIND_HOURS:-9,12,15,18,21}"
MARKER="# app-factory-maintainer-remind"

existing="$(crontab -l 2>/dev/null || true)"
filtered="$(echo "$existing" | grep -v "$MARKER" || true)"

new_lines=""
IFS=',' read -ra ARR <<< "$HOURS"
for h in "${ARR[@]}"; do
  h="$(echo "$h" | tr -d ' ')"
  [[ -z "$h" ]] && continue
  new_lines+=$'\n'"0 ${h} * * * cd \"$ROOT\" && \"$REMIND\" >> \"$ROOT/logs/maintainer-remind.log\" 2>&1 ${MARKER}"
done

mkdir -p "$ROOT/logs"
{
  echo "$filtered" | sed '/^[[:space:]]*$/d'
  echo "$new_lines" | sed '/^[[:space:]]*$/d'
} | crontab -

echo "✅ 已安装维护者每日提醒（本机时区）"
echo "   时刻：${HOURS} 点（每天各 1 次，共 ${#ARR[@]} 次）"
echo "   日志：$ROOT/logs/maintainer-remind.log"
echo ""
echo "查看：crontab -l | grep maintainer"
echo "卸载：npm run maintainer:uninstall-reminders"
echo ""
echo "立即试一次：npm run maintainer:remind"
