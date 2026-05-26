/**
 * v5-8 网页 E2E：登录 → /skills → 草稿发布 → 状态变已发布
 * npm run verify:v5:skills-publish-ui
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const BASE = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3001";

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ 找不到 .env.local");
    process.exit(1);
  }
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

async function main() {
  loadEnvLocal();
  const email = process.env.V4_TEST_EMAIL?.trim();
  const password = process.env.V4_TEST_PASSWORD?.trim();
  if (!email || !password) {
    console.error("❌ .env.local 需配置 V4_TEST_EMAIL / V4_TEST_PASSWORD");
    process.exit(1);
  }

  const probeCode = `ui_publish_probe_${Date.now()}`;
  const probeName = "UI 发布探针";

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("❌ 未安装 playwright，请在本目录执行：npx playwright install chromium");
    process.exit(1);
  }

  console.log(`══ v5-8 技能管理网页 E2E（${BASE}）══\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 20000 });
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"], input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(projects|skills|$)/, { timeout: 15000 });

    await page.goto(`${BASE}/skills`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForSelector("text=技能管理", { timeout: 10000 });

    const title = await page.title();
    console.log(`✓ 已打开 /skills（title: ${title}）`);

    await page.fill('input[placeholder="my_skill"]', probeCode);
    await page.fill('input[placeholder="技能显示名"]', probeName);
    await page.click('button:has-text("创建草稿")');
    await page.waitForSelector(`text=${probeCode}`, { timeout: 10000 });

    const draftRow = page.locator("tr", { hasText: probeCode });
    await draftRow.getByText("草稿", { exact: true }).waitFor({ timeout: 5000 });
    console.log(`✓ 新建草稿 ${probeCode}，状态为「草稿」`);

    await draftRow.getByRole("button", { name: "发布" }).click();
    await draftRow.getByText("已发布", { exact: true }).waitFor({ timeout: 10000 });
    console.log(`✓ 点击「发布」后状态变为「已发布」`);

    await draftRow.getByRole("button", { name: "撤回草稿" }).waitFor({
      timeout: 5000
    });
    console.log("✓ 操作列显示「撤回草稿」（与已发布态一致）");

    const publishedCount = await page.locator("text=已发布").count();
    console.log(`✓ 页面上「已发布」标签数：${publishedCount}`);

    console.log("\n✅ v5-8 网页确认通过：草稿 → 发布 → 已发布");
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
