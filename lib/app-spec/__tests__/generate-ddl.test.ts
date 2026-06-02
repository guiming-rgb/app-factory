import { describe, it, expect } from "vitest";
import { generateCreateTableDDL } from "../generate-ddl";
import type { AppSpec } from "../types";

function makeSpec(overrides: Partial<AppSpec> = {}): AppSpec {
  return {
    specVersion: "0.1.0",
    appName: "test_app",
    displayName: "测试",
    screens: [{ id: "main_list", title: "列表", type: "list" }],
    targets: { flutter: { enabled: true, platforms: ["ios"], formFactors: ["phone"] }, backend: { provider: "supabase" } },
    limitations: [],
    ...overrides,
  };
}

describe("generateCreateTableDDL", () => {
  it("无实体时应返回空表名列表", () => {
    const ddl = generateCreateTableDDL(makeSpec());
    expect(ddl.tableNames).toEqual([]);
    expect(ddl.fullSql).toContain("DDL");
  });

  it("应生成单表 CREATE TABLE + RLS", () => {
    const ddl = generateCreateTableDDL(makeSpec({
      entities: [{ name: "match", fields: [
        { name: "id", type: "uuid", primary: true },
        { name: "title", type: "string" },
        { name: "score", type: "int" }
      ]}]
    }));

    expect(ddl.tableNames).toContain("matchs");
    expect(ddl.createTables).toContain("create table if not exists matchs");
    expect(ddl.createTables).toContain("id uuid default gen_random_uuid() primary key");
    expect(ddl.createTables).toContain("title text");
    expect(ddl.createTables).toContain("score integer");
    expect(ddl.createTables).toContain("created_at timestamptz default now()");
    expect(ddl.rlsPolicies).toContain("enable row level security");
  });

  it("应生成带 user_id 的 CRUD 四策略", () => {
    const ddl = generateCreateTableDDL(makeSpec({
      entities: [{ name: "item", fields: [
        { name: "id", type: "uuid", primary: true },
        { name: "user_id", type: "uuid" },
        { name: "content", type: "string" }
      ]}]
    }));

    expect(ddl.rlsPolicies).toContain("用户可查看自己的item");
    expect(ddl.rlsPolicies).toContain("用户可插入自己的item");
    expect(ddl.rlsPolicies).toContain("用户可更新自己的item");
    expect(ddl.rlsPolicies).toContain("用户可删除自己的item");
  });

  it("应生成 owner_id 作为用户字段", () => {
    const ddl = generateCreateTableDDL(makeSpec({
      entities: [{ name: "product", fields: [
        { name: "id", type: "uuid", primary: true },
        { name: "owner_id", type: "uuid" }
      ]}]
    }));
    expect(ddl.rlsPolicies).toContain("auth.uid() = owner_id");
  });

  it("应生成外键关系", () => {
    const ddl = generateCreateTableDDL(makeSpec({
      entities: [
        { name: "player", fields: [{ name: "id", type: "uuid", primary: true }, { name: "name", type: "string" }] },
        { name: "match", fields: [
          { name: "id", type: "uuid", primary: true },
          { name: "title", type: "string" }
        ], relations: [{ target: "player", type: "belongs_to" }] }
      ]
    }));

    expect(ddl.createTables).toContain("player_id uuid references players(id)");
  });

  it("chat screen 应自动生成聊天表", () => {
    const ddl = generateCreateTableDDL(makeSpec({
      screens: [{ id: "chat_room", title: "聊天", type: "chat" }]
    }));

    expect(ddl.tableNames).toContain("chat_rooms");
    expect(ddl.tableNames).toContain("chat_messages");
    expect(ddl.createTables).toContain("create table if not exists chat_rooms");
    expect(ddl.createTables).toContain("create table if not exists chat_messages");
    expect(ddl.rlsPolicies).toContain("Realtime");
  });

  it("map screen 应自动生成点位表", () => {
    const ddl = generateCreateTableDDL(makeSpec({
      screens: [{ id: "map_view", title: "地图", type: "map" }]
    }));

    expect(ddl.tableNames).toContain("places");
    expect(ddl.createTables).toContain("latitude double precision");
    expect(ddl.createTables).toContain("longitude double precision");
  });

  it("banking/insurance screen 应自动生成金融表", () => {
    const ddl = generateCreateTableDDL(makeSpec({
      screens: [{ id: "checkout", title: "支付", type: "banking" }]
    }));

    expect(ddl.tableNames).toContain("payment_transactions");
    expect(ddl.tableNames).toContain("kyc_verifications");
  });

  it("location/image/file 字段类型应正确映射", () => {
    const ddl = generateCreateTableDDL(makeSpec({
      entities: [{ name: "place", fields: [
        { name: "id", type: "uuid", primary: true },
        { name: "geo", type: "location" },
        { name: "photo", type: "image" },
        { name: "doc", type: "file" }
      ]}]
    }));

    expect(ddl.createTables).toContain("geo jsonb");
    expect(ddl.createTables).toContain("photo text");
    expect(ddl.createTables).toContain("doc text");
  });

  it("应生成索引", () => {
    const ddl = generateCreateTableDDL(makeSpec({
      entities: [{ name: "item", fields: [
        { name: "id", type: "uuid", primary: true }
      ]}]
    }));

    expect(ddl.fullSql).toContain("create index if not exists");
  });

  it("fullSql 应包含完整的三个部分", () => {
    const ddl = generateCreateTableDDL(makeSpec({
      entities: [{ name: "item", fields: [
        { name: "id", type: "uuid", primary: true }
      ]}]
    }));

    expect(ddl.fullSql).toContain("DDL");
    expect(ddl.fullSql).toContain("RLS");
    expect(ddl.fullSql).toContain("索引");
  });
});
