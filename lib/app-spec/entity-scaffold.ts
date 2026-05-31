import type { AppSpec, AppSpecScreen } from "./types";

export type AppSpecEntityField = {
  name: string;
  type: string;
  primary?: boolean;
};

export type AppSpecEntity = {
  name: string;
  fields: AppSpecEntityField[];
};

export type EntityListRow = {
  id: string;
  title: string;
  subtitle: string;
};

function asEntity(raw: unknown): AppSpecEntity | null {
  if (typeof raw !== "object" || raw === null) return null;
  const rec = raw as Record<string, unknown>;
  const name = typeof rec.name === "string" ? rec.name.trim() : "";
  if (!name) return null;
  const fields: AppSpecEntityField[] = [];
  if (Array.isArray(rec.fields)) {
    for (const f of rec.fields) {
      if (typeof f !== "object" || f === null) continue;
      const fr = f as Record<string, unknown>;
      const fn = typeof fr.name === "string" ? fr.name.trim() : "";
      const ft = typeof fr.type === "string" ? fr.type : "string";
      if (!fn) continue;
      fields.push({
        name: fn,
        type: ft,
        primary: fr.primary === true
      });
    }
  }
  if (fields.length === 0) {
    fields.push(
      { name: "id", type: "uuid", primary: true },
      { name: "title", type: "string" }
    );
  }
  return { name, fields };
}

export function parseEntities(spec: AppSpec): AppSpecEntity[] {
  const out: AppSpecEntity[] = [];
  for (const raw of spec.entities ?? []) {
    const e = asEntity(raw);
    if (e) out.push(e);
  }
  return out;
}

/** 列表页关联实体；无 entities 时按 screen.entity / 屏 id 合成最小 schema */
export function resolveEntityForScreen(
  spec: AppSpec,
  screen: AppSpecScreen
): AppSpecEntity | undefined {
  const entities = parseEntities(spec);
  const ref =
    typeof screen.entity === "string" && screen.entity.trim()
      ? screen.entity.trim()
      : screen.type === "list"
        ? screen.id
        : undefined;
  if (!ref) return undefined;

  const found = entities.find(
    (e) => e.name.toLowerCase() === ref.toLowerCase()
  );
  if (found) return found;

  if (screen.type !== "list" && screen.type !== "detail") return undefined;

  const label = screen.title || ref;
  return {
    name: ref,
    fields: [
      { name: "id", type: "uuid", primary: true },
      { name: "title", type: "string" },
      { name: "note", type: "string" }
    ]
  };
}

/** PostgREST 表名推断（Match → matches） */
export function entityTableName(entity: AppSpecEntity): string {
  const raw = entity.name.trim();
  if (!raw) return "items";
  const snake = raw
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase();
  if (snake.endsWith("s")) return snake;
  if (snake.endsWith("y")) return `${snake.slice(0, -1)}ies`;
  return `${snake}s`;
}

export function supabaseSelectColumns(entity: AppSpecEntity): string {
  const names = entity.fields
    .map((f) => f.name)
    .filter((n) => /^[a-z_][a-z0-9_]*$/i.test(n))
    .slice(0, 8);
  const set = new Set(names);
  set.add(listTitleField(entity));
  const pk = entity.fields.find((f) => f.primary)?.name ?? "id";
  set.add(pk);
  return [...set].join(",");
}

export function primaryKeyField(entity: AppSpecEntity): string {
  return entity.fields.find((f) => f.primary)?.name ?? "id";
}

export function listTitleField(entity: AppSpecEntity): string {
  const title = entity.fields.find((f) =>
    ["title", "name", "label"].includes(f.name.toLowerCase())
  );
  if (title) return title.name;
  const nonId = entity.fields.find(
    (f) => f.type === "string" && f.name.toLowerCase() !== "id"
  );
  return nonId?.name ?? entity.fields[entity.fields.length - 1]?.name ?? "title";
}

export function buildEntityListRows(
  entity: AppSpecEntity,
  screen: AppSpecScreen,
  spec: AppSpec
): EntityListRow[] {
  const label = listTitleField(entity);
  const base = screen.title || entity.name;
  const app = spec.displayName || spec.appName;
  const samples = [
    { suffix: "一", note: "离线示例（拉取失败时显示）" },
    { suffix: "二", note: "由 App Spec 生成" },
    { suffix: "三", note: app.slice(0, 24) }
  ];
  return samples.map((s, i) => ({
    id: String(i + 1),
    title: `${base}${s.suffix}`,
    subtitle: `${entity.name}.${label} — ${s.note}`
  }));
}

export function screenUsesEntityScaffold(
  spec: AppSpec,
  screen: AppSpecScreen
): boolean {
  if (screen.type === "list") return !!resolveEntityForScreen(spec, screen);
  if (screen.type === "detail") return !!resolveEntityForScreen(spec, screen);
  return false;
}
