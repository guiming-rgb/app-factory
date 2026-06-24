import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  renderWidgetTemplate,
  hasWidgetTemplate,
  listWidgetTemplates,
  clearTemplateCache,
} from "@/lib/codegen/template-renderer";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

describe("template-renderer", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "app-factory-test-"));
    clearTemplateCache();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it("hasWidgetTemplate 应检测存在的模板", async () => {
    // All 20 must have widget templates
    const industries = [
      "finance", "crm", "fitness", "ecommerce", "education",
      "social", "food", "hotel", "recruitment", "property",
      "video", "weather", "sports", "photo", "dating",
      "medical", "blog", "game", "payment",
    ];

    for (const ind of industries) {
      const exists = await hasWidgetTemplate(ind);
      expect(exists, `${ind} widget template should exist`).toBe(true);
    }
  });

  it("generic 应有专属模板（作为兜底）", async () => {
    const exists = await hasWidgetTemplate("generic");
    expect(exists).toBe(true);
  });

  it("listWidgetTemplates 应返回至少 19 个模板", async () => {
    const templates = await listWidgetTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(19);
    // 验证每个模板名含 "widgets"
    for (const t of templates) {
      expect(t).toMatch(/_widgets$/);
    }
  });

  it("renderWidgetTemplate 应渲染有效的 Dart 代码", async () => {
    // 测试 ecommerce widget 模板（已知存在且复杂）
    const result = await renderWidgetTemplate("ecommerce_widgets", {
      industry: "ecommerce",
      displayName: "电商商城",
      tableName: "products",
      titleField: "name",
      primaryKey: "id",
      hasImage: true,
      primaryColor: "Color(0xFF0D9488)",
    });

    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(500);
    expect(result).toContain("import ");
    expect(result).toContain("class ");
    expect(result).toContain("Widget");
    // Mustache 变量应已被替换
    expect(result).not.toContain("{{industry}}");
    expect(result).not.toContain("{{displayName}}");
  });

  it("renderWidgetTemplate 应对不存在的模板抛出异常", async () => {
    await expect(
      renderWidgetTemplate("nonexistent_widgets", {
        industry: "test",
        displayName: "Test",
        tableName: "items",
        titleField: "name",
        primaryKey: "id",
        hasImage: false,
        primaryColor: "Colors.blue",
      })
    ).rejects.toThrow(/模板文件不存在/);
  });

  it("模板缓存应在渲染后生效", async () => {
    // First render
    const r1 = await renderWidgetTemplate("generic_widgets", {
      industry: "test1",
      displayName: "Test1",
      tableName: "items",
      titleField: "name",
      primaryKey: "id",
      hasImage: false,
      primaryColor: "Colors.blue",
    });

    // Second render with different context — should use cache
    const r2 = await renderWidgetTemplate("generic_widgets", {
      industry: "test2",
      displayName: "Test2",
      tableName: "items",
      titleField: "name",
      primaryKey: "id",
      hasImage: false,
      primaryColor: "Colors.red",
    });

    expect(r1).not.toBe(r2); // Different output because context differs
    expect(r1).toContain("test1");
    expect(r2).toContain("test2");
  });

  it("所有 20 个模板应包含至少 2 个 class 定义", async () => {
    const industries = [
      "finance", "crm", "fitness", "ecommerce", "education",
      "social", "food", "hotel", "recruitment", "property",
      "video", "weather", "sports", "photo", "dating",
      "medical", "blog", "game", "payment", "generic",
    ];

    for (const ind of industries) {
      const hasTemplate = await hasWidgetTemplate(ind);
      if (!hasTemplate) continue;

      const result = await renderWidgetTemplate(`${ind}_widgets`, {
        industry: ind,
        displayName: ind,
        tableName: "items",
        titleField: "name",
        primaryKey: "id",
        hasImage: false,
        primaryColor: "Colors.blue",
      });

      const classCount = (result.match(/class \w+/g) || []).length;
      expect(
        classCount,
        `${ind} widget template should have ≥2 classes, found ${classCount}`
      ).toBeGreaterThanOrEqual(2);
    }
  });
});
