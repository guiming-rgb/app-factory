#!/usr/bin/env node
import { writeFileSync, chmodSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const hooksDir = join(process.cwd(), ".git/hooks");
const hookPath = join(hooksDir, "pre-commit");

const hook = `#!/bin/sh
# App 生产工厂 pre-commit hook
echo "🔍 TypeScript 检查..."
npx tsc --noEmit || { echo "❌ TypeScript 错误"; exit 1; }

echo "🧪 单元测试..."
npx vitest run --reporter=verbose || { echo "❌ 测试失败"; exit 1; }

echo "✅ 预提交检查通过"
`;

if (!existsSync(hooksDir)) mkdirSync(hooksDir);
writeFileSync(hookPath, hook);
chmodSync(hookPath, 0o755);
console.log("✅ Pre-commit hook 已安装");
