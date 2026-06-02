import { describe, it, expect } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * 代码生成集成测试
 * 验证从 Spec → Flutter 项目 → ZIP 的完整流程
 */
describe("Codegen Integration", () => {
  it("应能从最小 Spec 生成 Flutter 项目目录", async () => {
    const spec = {
      specVersion: "0.1.0",
      appName: "test_integration",
      displayName: "集成测试",
      targets: {
        flutter: { enabled: true, platforms: ["ios", "android", "web"], formFactors: ["phone"] },
        backend: { provider: "supabase" }
      },
      screens: [
        { id: "home", title: "首页", type: "tabRoot" },
        { id: "main_list", title: "列表", type: "list", entity: "item" },
        { id: "detail", title: "详情", type: "detail", entity: "item" },
        { id: "form", title: "添加", type: "form", entity: "item" },
        { id: "profile", title: "我的", type: "placeholder" },
        { id: "map_view", title: "地图", type: "map" },
        { id: "chat", title: "聊天", type: "chat" }
      ],
      entities: [{
        name: "item",
        fields: [
          { name: "id", type: "uuid", primary: true },
          { name: "title", type: "string" },
          { name: "price", type: "float" },
          { name: "image_url", type: "image" }
        ]
      }],
      navigation: { tabs: ["main_list", "profile"] },
      limitations: ["测试环境"],
      layoutRules: { theme: "teal" }
    };

    // 动态导入 generateFlutterProject（避免顶层依赖）
    const { generateFlutterProject } = await import("@/lib/flutter-codegen/generate");
    const { outputDir, appName, displayName } = await generateFlutterProject(spec);

    try {
      // 验证基础结构存在
      expect(appName).toBe("test_integration");
      expect(displayName).toBe("集成测试");

      // 验证核心文件存在
      const pubspecExists = await fs.access(path.join(outputDir, "pubspec.yaml")).then(() => true).catch(() => false);
      expect(pubspecExists).toBe(true);

      const appDartExists = await fs.access(path.join(outputDir, "lib", "app.dart")).then(() => true).catch(() => false);
      expect(appDartExists).toBe(true);

      const routerExists = await fs.access(path.join(outputDir, "lib", "router", "app_router.dart")).then(() => true).catch(() => false);
      expect(routerExists).toBe(true);

      // 验证生成的页面文件
      const generatedDir = path.join(outputDir, "lib", "generated", "pages");
      const authDir = path.join(outputDir, "lib", "features", "auth", "presentation");

      const loginExists = await fs.access(path.join(authDir, "login_page.dart")).then(() => true).catch(() => false);
      expect(loginExists).toBe(true);

      const registerExists = await fs.access(path.join(authDir, "register_page.dart")).then(() => true).catch(() => false);
      expect(registerExists).toBe(true);

      // 验证 SQL 生成
      const sqlExists = await fs.access(path.join(outputDir, "supabase", "migrations", "001_create_tables.sql")).then(() => true).catch(() => false);
      expect(sqlExists).toBe(true);

      // 验证 app_spec.json 保存
      const specJsonExists = await fs.access(path.join(outputDir, "app_spec.json")).then(() => true).catch(() => false);
      expect(specJsonExists).toBe(true);

      // 验证 LIMITATIONS.md
      const limExists = await fs.access(path.join(outputDir, "LIMITATIONS.md")).then(() => true).catch(() => false);
      expect(limExists).toBe(true);

      // 验证 BACKEND.md
      const backendExists = await fs.access(path.join(outputDir, "BACKEND.md")).then(() => true).catch(() => false);
      expect(backendExists).toBe(true);
    } finally {
      // 清理
      await fs.rm(path.dirname(outputDir), { recursive: true, force: true }).catch(() => {});
    }
  }, 30000); // 30s timeout

  it("DDL 生成应包含全部预期内容", async () => {
    const { generateCreateTableDDL } = await import("@/lib/app-spec/generate-ddl");
    const spec = {
      specVersion: "0.1.0",
      appName: "full_test",
      displayName: "全功能测试",
      screens: [
        { id: "list", title: "列表", type: "list" },
        { id: "chat", title: "聊天", type: "chat" },
        { id: "map", title: "地图", type: "map" },
        { id: "banking", title: "支付", type: "banking" }
      ],
      targets: { flutter: { enabled: true, platforms: ["ios"], formFactors: ["phone"] }, backend: { provider: "supabase" } },
      limitations: [],
      entities: [
        { name: "user", fields: [
          { name: "id", type: "uuid", primary: true },
          { name: "user_id", type: "uuid" },
          { name: "email", type: "string" }
        ]},
        { name: "order", fields: [
          { name: "id", type: "uuid", primary: true },
          { name: "total", type: "float" }
        ], relations: [{ target: "user", type: "belongs_to" }] }
      ]
    };

    // eslint-disable-next-line
    const ddlResult = generateCreateTableDDL(spec as any);

    const ddl = ddlResult;

    // 实体表
    expect(ddl.tableNames).toContain("users");
    expect(ddl.tableNames).toContain("orders");

    // 功能表
    expect(ddl.tableNames).toContain("chat_rooms");
    expect(ddl.tableNames).toContain("chat_messages");
    expect(ddl.tableNames).toContain("places");
    expect(ddl.tableNames).toContain("payment_transactions");
    expect(ddl.tableNames).toContain("kyc_verifications");

    // RLS
    expect(ddl.rlsPolicies).toContain("enable row level security");

    // 完整 SQL
    expect(ddl.fullSql.length).toBeGreaterThan(500);
  });
});
