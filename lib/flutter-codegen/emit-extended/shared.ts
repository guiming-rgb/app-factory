import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";

export function pascalCase(id: string): string {
  return id
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}
export function escapeDartString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/'/g, "\\'");
}

export type EntityDef = { name: string; fields: Array<{ name: string; type: string; primary?: boolean }> };

export function entityOrFirst(spec: AppSpec, screen: AppSpecScreen): EntityDef {
  const entityName = screen.entity;
  const entities = (spec.entities ?? []) as unknown as EntityDef[];
  if (entityName) {
    const e = entities.find((x) => x.name === entityName);
    if (e) return e;
  }
  return entities[0] ?? { name: "items", fields: [{ name: "id", type: "uuid", primary: true }, { name: "title", type: "string" }] };
}

export function tableName(e: { name: string }) { return escapeDartString(e.name); }
export function pkField(e: { fields: Array<{ name: string; primary?: boolean }> }) {
  return escapeDartString(e.fields.find((f) => f.primary)?.name ?? "id");
}
