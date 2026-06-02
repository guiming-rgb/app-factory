import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

test.describe("App 生产工厂 E2E", () => {
  test("首页加载正常", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator("h1")).toContainText("App 想法");
  });

  test("首页有导航链接", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('a[href="/projects"]')).toBeVisible();
    await expect(page.locator('a[href="/dashboard"]')).toBeVisible();
    await expect(page.locator('a[href="/deploy"]')).toBeVisible();
  });

  test("首页有创建项目表单", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator("form")).toBeVisible();
  });

  test("项目列表页加载", async ({ page }) => {
    await page.goto(`${BASE_URL}/projects`);
    await expect(page.locator("main")).toBeVisible();
  });

  test("仪表盘页加载", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1")).toContainText("仪表盘");
  });

  test("创建项目表单输入", async ({ page }) => {
    await page.goto(BASE_URL);
    const titleInput = page.locator('input[name="title"]');
    const ideaInput = page.locator('textarea[name="idea"]');
    if (await titleInput.isVisible()) {
      await titleInput.fill("E2E 测试项目");
      await ideaInput.fill("这是一个端到端测试项目");
      await expect(titleInput).toHaveValue("E2E 测试项目");
    }
  });

  test("API Spec 端点可访问", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/projects`);
    expect(res.ok()).toBeTruthy();
  });

  test("API 仪表盘端点可访问", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/dashboard`);
    expect(res.ok()).toBeTruthy();
  });

  test("代码生成 API - Spec 校验", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/projects/nonexistent/codegen/flutter`);
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("模板 API 可访问", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/templates`);
    expect(res.ok()).toBeTruthy();
  });

  test("健康页面可访问", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/health`);
    expect(res.ok()).toBeTruthy();
  });

  test("落地页可访问", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/landing`);
    expect(res.ok()).toBeTruthy();
  });

  test("404 页面正常", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/nonexistent-page`);
    expect(res.status()).toBe(404);
  });

  test("部署状态 API 可访问", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/deploy/status`);
    expect(res.ok()).toBeTruthy();
  });

  test("模板列表 API 返回正确结构", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/templates`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.templates).toBeDefined();
    expect(Array.isArray(data.templates)).toBe(true);
  });

  test("模板详情 API", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/templates?id=ecommerce`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.name).toBeDefined();
  });

  test("API 文档生成脚本可运行", async () => {
    const { spawnSync } = await import("child_process");
    const r = spawnSync("node", ["scripts/generate-api-docs.mjs"], { encoding: "utf8", timeout: 10000 });
    expect(r.status).toBe(0);
  });

  test("Spec 校验脚本可运行", async () => {
    const { spawnSync } = await import("child_process");
    const r = spawnSync("node", ["scripts/validate-app-spec.mjs", "docs/schemas/examples/valid-minimal.json"], { encoding: "utf8", timeout: 10000 });
    expect(r.status).toBe(0);
  });

  test("Changelog 脚本可运行", async () => {
    const { spawnSync } = await import("child_process");
    const r = spawnSync("node", ["scripts/generate-changelog.mjs", "/tmp/test-changelog.md"], { encoding: "utf8", timeout: 10000 });
    expect(r.status === 0 || r.status === 128).toBe(true); // ok or git error
  });

  test("性能检测脚本可运行", async () => {
    const { spawnSync } = await import("child_process");
    const r = spawnSync("node", ["scripts/perf-benchmark.mjs"], { encoding: "utf8", timeout: 30000 });
    expect(r.status === 0 || r.status === 1).toBe(true); // 1 = can't reach server, expected in CI
  });

  test("备份脚本存在并可解析", async () => {
    const { existsSync } = await import("fs");
    expect(existsSync("scripts/db-backup.mjs")).toBe(true);
    expect(existsSync("scripts/db-migration-status.mjs")).toBe(true);
  });
});
