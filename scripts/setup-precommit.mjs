#!/usr/bin/env node
import { writeFileSync, chmodSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const hooksDir = join(process.cwd(), ".git/hooks");
const hookPath = join(hooksDir, "pre-commit");

const hook = `#!/bin/sh
# App 生产工厂 pre-commit hook

# --- 1. 禁止 tmp/ 入库 ---
TMP_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '^tmp/')
if [ -n "$TMP_FILES" ]; then
  echo "❌ 禁止提交 tmp/ 目录文件！"
  echo ""
  echo "以下文件在暂存区中："
  echo "$TMP_FILES"
  echo ""
  echo "请执行: git reset HEAD tmp/  然后重新 commit"
  exit 1
fi

# --- 2. TypeScript 检查 ---
echo "🔍 TypeScript 检查..."
npx tsc --noEmit || { echo "❌ TypeScript 错误"; exit 1; }

# --- 3. 单元测试 ---
echo "🧪 单元测试..."
npx vitest run --reporter=verbose || { echo "❌ 测试失败"; exit 1; }

echo "✅ 预提交检查通过"
`;

if (!existsSync(hooksDir)) mkdirSync(hooksDir);
writeFileSync(hookPath, hook);
chmodSync(hookPath, 0o755);
console.log("✅ Pre-commit hook 已安装");
