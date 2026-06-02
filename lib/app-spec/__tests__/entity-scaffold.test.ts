import { describe, it, expect } from "vitest";
import {
  parseEntities,
  resolveEntityForScreen,
  entityTableName,
  primaryKeyField,
  listTitleField,
  supabaseSelectColumns
} from "../entity-scaffold";
import type { AppSpec, AppSpecScreen } from "../types";

function makeSpec(entities: AppSpec["entities"] = []): AppSpec {
  return {
    specVersion: "0.1.0",
    appName: "test",
    displayName: "测试",
    screens: [],
    targets: { flutter: { enabled: true, platforms: ["ios"], formFactors: ["phone"] }, backend: { provider: "supabase" } },
    limitations: [],
    entities
  };
}

describe("parseEntities", () => {
  it("应解析有效的实体", () => {
    const spec = makeSpec([{ name: "match", fields: [{ name: "id", type: "uuid" }, { name: "title", type: "string" }] }]);
    const entities = parseEntities(spec);
    expect(entities).toHaveLength(1);
    expect(entities[0].name).toBe("match");
    expect(entities[0].fields).toHaveLength(2);
  });

  it("应处理空 entities", () => {
    expect(parseEntities(makeSpec())).toEqual([]);
    expect(parseEntities(makeSpec([]))).toEqual([]);
  });

  it("fields 为空时应自动补充默认字段", () => {
    const spec = makeSpec([{ name: "item", fields: [] }]);
    const entities = parseEntities(spec);
    expect(entities).toHaveLength(1);
    expect(entities[0].fields.length).toBeGreaterThanOrEqual(1);
  });
});

describe("resolveEntityForScreen", () => {
  it("应通过 entity 字段匹配", () => {
    const screen: AppSpecScreen = { id: "list", title: "列表", type: "list", entity: "match" };
    const spec = makeSpec([{ name: "match", fields: [{ name: "id", type: "uuid" }] }]);
    const entity = resolveEntityForScreen(spec, screen);
    expect(entity).toBeDefined();
    expect(entity!.name).toBe("match");
  });

  it("screen 无 entity 且无匹配时应回退合成虚拟实体", () => {
    const screen: AppSpecScreen = { id: "unknown", title: "未知", type: "list" };
    const spec = makeSpec([]);
    const entity = resolveEntityForScreen(spec, screen);
    expect(entity).toBeDefined();
    expect(entity!.fields.some((f) => f.name === "id")).toBe(true);
  });
});

describe("entityTableName", () => {
  it("camelCase → snake_case 复数", () => {
    expect(entityTableName({ name: "matchResult", fields: [] })).toBe("match_results");
  });

  it("单数 → 复数", () => {
    expect(entityTableName({ name: "cat", fields: [] })).toBe("cats");
  });

  it("y 结尾 → ies", () => {
    expect(entityTableName({ name: "category", fields: [] })).toBe("categories");
  });
});

describe("primaryKeyField", () => {
  it("应返回 primary: true 的字段名", () => {
    const entity = { name: "item", fields: [{ name: "uid", type: "uuid", primary: true }, { name: "title", type: "string" }] };
    expect(primaryKeyField(entity)).toBe("uid");
  });

  it("无 primary 时应返回 id", () => {
    const entity = { name: "item", fields: [{ name: "x", type: "string" }] };
    expect(primaryKeyField(entity)).toBe("id");
  });
});

describe("listTitleField", () => {
  it("应优先返回 title", () => {
    const entity = { name: "item", fields: [{ name: "id", type: "uuid" }, { name: "title", type: "string" }] };
    expect(listTitleField(entity)).toBe("title");
  });

  it("应回退到 name", () => {
    const entity = { name: "item", fields: [{ name: "id", type: "uuid" }, { name: "name", type: "string" }] };
    expect(listTitleField(entity)).toBe("name");
  });

  it("应回退到第一个非 id 的 string 字段", () => {
    const entity = { name: "item", fields: [{ name: "id", type: "uuid" }, { name: "first", type: "string" }, { name: "second", type: "string" }] };
    expect(listTitleField(entity)).toBe("first");
  });
});

describe("supabaseSelectColumns", () => {
  it("应返回逗号分隔的字段名", () => {
    const entity = { name: "item", fields: [{ name: "id", type: "uuid" }, { name: "title", type: "string" }, { name: "score", type: "int" }] };
    const cols = supabaseSelectColumns(entity);
    expect(cols).toContain("id");
    expect(cols).toContain("title");
    expect(cols).toContain("score");
  });
});
