/**
 * v5-8 技能管理：Cookie 登录 + 网页 E2E（草稿 → 发布）
 * npm run verify:v5:skills-publish-ui
 */
import fs from "fs";
import path from "path";

import { createSessionCookieHeader, loadEnvLocal } from "./lib/production-auth.mjs";

const root = process.cwd();
const BASE =
  process.env.SKILLS_UI_BASE?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "http://localhost:3001";

function parseCookies(cookieHeader, baseUrl) {
  const { hostname } = new URL(baseUrl);
  return cookieHeader.split("; ").map((pair) => {
    const i = pair.indexOf("=");
    return {
      name: pair.slice(0, i),
      value: pair.slice(i + 1),
      domain: hostname,
      path: "/"
    };
  });
}

async function main() {
  loadEnvLocal();

  const probeCode = `ui_publish_probe_${Date.now()}`;
  const probeName = "UI 发布探针";

  const session = await createSessionCookieHeader();
  console.log(`══ v5-8 技能管理网页 E2E（${BASE}）══\n`);
  console.log(`✓ 测试账号已登录 (${session.email})\n`);

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("❌ 未安装 playwright：npx playwright install chromium");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies(parseCookies(session.cookieHeader, BASE));
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}/skills`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("text=技能管理", { timeout: 15000 });

    console.log(`✓ 已打开 /skills（title: ${await page.title()}）`);

    await page.fill('input[placeholder="my_skill"]', probeCode);
    await page.fill('input[placeholder="技能显示名"]', probeName);
    await page.click('button:has-text("创建草稿")');
    await page.waitForSelector(`text=${probeCode}`, { timeout: 15000 });

    const draftRow = page.locator("tr", { hasText: probeCode });
    await draftRow.getByText("草稿", { exact: true }).waitFor({ timeout: 8000 });
    console.log(`✓ 新建草稿 ${probeCode}`);

    await draftRow.getByRole("button", { name: "发布" }).click();
    await draftRow.getByText("已发布", { exact: true }).waitFor({ timeout: 15000 });
    console.log("✓ 点击「发布」后状态变为「已发布」");

    console.log("\n✅ v5-8 网页确认通过：草稿 → 发布 → 已发布");
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
