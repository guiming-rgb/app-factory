#!/usr/bin/env bash
# 维护者每日提醒（由 cron 调用）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MSG="$(node scripts/maintainer-pending.mjs message 2>/dev/null || echo '【App 生产工厂】请运行 npm run maintainer:pending')"

echo "$MSG"
echo ""
echo "--- $(date '+%Y-%m-%d %H:%M:%S') ---"

if [[ "$(uname -s)" == "Darwin" ]]; then
  SHORT="$(echo "$MSG" | head -5 | tr '\n' ' ' | cut -c1-200)"
  osascript -e "display notification \"$SHORT\" with title \"App 生产工厂 · 维护者待办\"" 2>/dev/null || true
fi
