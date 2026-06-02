import { parseEntities, entityTableName, primaryKeyField } from "./entity-scaffold";
import type { AppSpec } from "./types";

/**
 * P1: 根据 App Spec 中的 entities 自动生成 Supabase 建表 DDL
 * 包括 CREATE TABLE、RLS 策略和索引
 */

export type DdlBundle = {
  createTables: string;
  rlsPolicies: string;
  fullSql: string;
  tableNames: string[];
};

/** App Spec 字段类型 → PostgreSQL 类型映射 */
const FIELD_TYPE_MAP: Record<string, string> = {
  string: "text",
  uuid: "uuid default gen_random_uuid()",
  int: "integer",
  integer: "integer",
  float: "double precision",
  number: "double precision",
  bool: "boolean",
  boolean: "boolean",
  datetime: "timestamptz default now()",
  timestamp: "timestamptz default now()",
  date: "date",
  json: "jsonb default '{}'::jsonb",
  text: "text",
  location: "jsonb",          // { lat: number, lng: number, address: string }
  image: "text",              // Supabase Storage 路径
  file: "text"                // Supabase Storage 路径
};

function sqlType(field: { name: string; type: string }): string {
  const t = field.type.toLowerCase();
  // uuid 类型仅在 name 为 "id" 时使用 gen_random_uuid()
  if (t === "uuid" && field.name === "id") {
    return "uuid default gen_random_uuid()";
  }
  if (t === "uuid") {
    return "uuid";
  }
  return FIELD_TYPE_MAP[t] ?? "text";
}

function columnDef(field: {
  name: string;
  type: string;
  primary?: boolean;
  required?: boolean;
}): string {
  const parts: string[] = [field.name, sqlType(field)];
  if (field.primary) {
    parts.push("primary key");
  }
  if (field.required && !field.primary) {
    parts.push("not null");
  }
  return parts.join(" ");
}

export function generateCreateTableDDL(spec: AppSpec): DdlBundle {
  const entities = parseEntities(spec);
  const tableNames: string[] = [];
  const tableBlocks: string[] = [];
  const rlsBlocks: string[] = [];

  for (const entity of entities) {
    const tableName = entityTableName(entity);
    tableNames.push(tableName);

    // 添加通用系统字段
    const allFields = [
      ...entity.fields,
      { name: "created_at", type: "datetime" },
      { name: "updated_at", type: "datetime" }
    ];

    const columns = allFields.map((f) => `  ${columnDef(f)}`).join(",\n");

    const createTable = [
      `-- ${entity.name}`,
      `create table if not exists ${tableName} (`,
      columns,
      ");"
    ].join("\n");

    tableBlocks.push(createTable);

    // 外键关系
    const relations = entity.relations;
    if (Array.isArray(relations) && relations.length > 0) {
      for (const rel of relations) {
        if (typeof rel.target !== "string" || !rel.target.trim()) continue;
        // 查找目标实体获取表名
        const targetEntity = entities.find(
          (e) => e.name.toLowerCase() === rel.target.toLowerCase()
        );
        const targetTable = targetEntity ? entityTableName(targetEntity) : rel.target + "s";
        const fkColumn = `${rel.target}_id`;
        tableBlocks.push(
          `alter table ${tableName} add column if not exists ${fkColumn} uuid references ${targetTable}(id);`
        );
      }
    }

    // RLS
    rlsBlocks.push(`alter table ${tableName} enable row level security;`);

    // 基于 user_id 的查看策略（若有 user_id 字段）
    const hasUserId = entity.fields.some(
      (f) => f.name === "user_id" || f.name === "owner_id"
    );
    const userField = hasUserId
      ? entity.fields.find((f) => f.name === "user_id" || f.name === "owner_id")!
          .name
      : null;

    if (userField) {
      rlsBlocks.push(
        `create policy "用户可查看自己的${entity.name}" on ${tableName} for select using (auth.uid() = ${userField});`
      );
      rlsBlocks.push(
        `create policy "用户可插入自己的${entity.name}" on ${tableName} for insert with check (auth.uid() = ${userField});`
      );
      rlsBlocks.push(
        `create policy "用户可更新自己的${entity.name}" on ${tableName} for update using (auth.uid() = ${userField});`
      );
      rlsBlocks.push(
        `create policy "用户可删除自己的${entity.name}" on ${tableName} for delete using (auth.uid() = ${userField});`
      );
    } else {
      rlsBlocks.push(`-- 无 user_id 字段：仅允许认证用户读写`);
      rlsBlocks.push(`create policy "认证用户可读${entity.name}" on ${tableName} for select using (auth.role() = 'authenticated');`);
      rlsBlocks.push(`create policy "认证用户可插入${entity.name}" on ${tableName} for insert with check (auth.role() = 'authenticated');`);
      rlsBlocks.push(`create policy "认证用户可更新${entity.name}" on ${tableName} for update using (auth.role() = 'authenticated');`);
      rlsBlocks.push(`create policy "认证用户可删除${entity.name}" on ${tableName} for delete using (auth.role() = 'authenticated');`);
    }
  }

  // 聊天功能表（如果 Spec 包含 chat screen type）
  const hasChat = (spec.screens ?? []).some((s) => s.type === "chat");
  if (hasChat) {
    const chatRooms = [
      "create table if not exists chat_rooms (",
      "  id uuid primary key default gen_random_uuid(),",
      "  name text not null,",
      "  last_message text,",
      "  created_at timestamptz default now(),",
      "  updated_at timestamptz default now()",
      ");"
    ].join("\n");
    const chatMessages = [
      "create table if not exists chat_messages (",
      "  id uuid primary key default gen_random_uuid(),",
      "  room_id uuid references chat_rooms(id) on delete cascade,",
      "  user_id uuid references auth.users(id),",
      "  content text not null,",
      "  created_at timestamptz default now()",
      ");"
    ].join("\n");
    tableBlocks.push(chatRooms, chatMessages);
    tableNames.push("chat_rooms", "chat_messages");

    // Realtime 需要 publication
    rlsBlocks.push("alter table chat_rooms enable row level security;");
    rlsBlocks.push("alter table chat_messages enable row level security;");
    rlsBlocks.push("create policy \"公开可查看聊天室\" on chat_rooms for select using (true);");
    rlsBlocks.push("create policy \"用户可发送消息\" on chat_messages for insert with check (auth.uid() = user_id);");
    rlsBlocks.push("create policy \"公开可查看消息\" on chat_messages for select using (true);");
    rlsBlocks.push("-- Supabase Realtime: 在 Dashboard → Database → Replication 中为 chat_messages 开启 Realtime");
  }

  // 地图点位表（如果 Spec 包含 map screen type）
  const hasMap = (spec.screens ?? []).some((s) => s.type === "map");
  if (hasMap) {
    const placesTable = [
      "create table if not exists places (",
      "  id uuid primary key default gen_random_uuid(),",
      "  name text not null,",
      "  latitude double precision not null,",
      "  longitude double precision not null,",
      "  address text,",
      "  created_at timestamptz default now()",
      ");"
    ].join("\n");
    tableBlocks.push(placesTable);
    tableNames.push("places");
    rlsBlocks.push("alter table places enable row level security;");
    rlsBlocks.push("create policy \"公开可查看点位\" on places for select using (true);");
  }

  // 金融保险表（如果 Spec 包含 banking / insurance / kyc screen type）
  const hasFintech = (spec.screens ?? []).some((s) =>
    s.type === "banking" || s.type === "insurance" || s.type === "kyc"
  );
  if (hasFintech) {
    const fintechTables = [
      "create table if not exists insurance_policies (",
      "  id uuid primary key default gen_random_uuid(),",
      "  user_id uuid references auth.users(id),",
      "  type text not null,",
      "  name text not null,",
      "  coverage_amount numeric(12,2),",
      "  premium_amount numeric(12,2),",
      "  status text default 'active',",
      "  created_at timestamptz default now()",
      ");",
      "",
      "create table if not exists insurance_claims (",
      "  id uuid primary key default gen_random_uuid(),",
      "  policy_id uuid references insurance_policies(id),",
      "  user_id uuid references auth.users(id),",
      "  amount numeric(12,2),",
      "  description text,",
      "  status text default 'pending',",
      "  filed_at timestamptz default now()",
      ");",
      "",
      "create table if not exists payment_transactions (",
      "  id uuid primary key default gen_random_uuid(),",
      "  user_id uuid references auth.users(id),",
      "  amount numeric(12,2),",
      "  currency text default 'USD',",
      "  method text,",
      "  status text default 'pending',",
      "  created_at timestamptz default now()",
      ");",
      "",
      "create table if not exists kyc_verifications (",
      "  id uuid primary key default gen_random_uuid(),",
      "  user_id uuid references auth.users(id) unique,",
      "  full_name text,",
      "  document_verified boolean default false,",
      "  face_verified boolean default false,",
      "  level text default 'none',",
      "  created_at timestamptz default now()",
      ");"
    ].join("\n");

    tableBlocks.push(fintechTables);
    tableNames.push("insurance_policies", "insurance_claims", "payment_transactions", "kyc_verifications");

    rlsBlocks.push("alter table insurance_policies enable row level security;");
    rlsBlocks.push("alter table insurance_claims enable row level security;");
    rlsBlocks.push("alter table payment_transactions enable row level security;");
    rlsBlocks.push("alter table kyc_verifications enable row level security;");
    rlsBlocks.push("create policy \"用户可查看自己的保单\" on insurance_policies for select using (auth.uid() = user_id);");
    rlsBlocks.push("create policy \"用户可查看自己的理赔\" on insurance_claims for select using (auth.uid() = user_id);");
    rlsBlocks.push("create policy \"用户可查看自己的交易\" on payment_transactions for select using (auth.uid() = user_id);");
    rlsBlocks.push("create policy \"用户可查看自己的KYC\" on kyc_verifications for select using (auth.uid() = user_id);");
  }

  const createTables = tableBlocks.join("\n\n");
  const rlsPolicies = rlsBlocks.join("\n");
  const fullSql = [
    "-- ======================================",
    `-- App 生产工厂 — 后端 DDL`,
    `-- 生成时间: ${new Date().toISOString()}`,
    `-- 应用名称: ${spec.displayName}`,
    "-- ======================================",
    "",
    createTables,
    "",
    "-- ======================================",
    "-- RLS 策略",
    "-- ======================================",
    "",
    rlsPolicies,
    "",
    "-- ======================================",
    "-- 索引",
    "-- ======================================",
    ...tableNames.map(
      (t) =>
        `create index if not exists idx_${t}_created_at on ${t}(created_at desc);`
    ),
    ""
  ].join("\n");

  return { createTables, rlsPolicies, fullSql, tableNames };
}
