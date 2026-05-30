import type { AppSpec } from "./types";

function entityName(entity: unknown): string {
  if (typeof entity === "object" && entity !== null && "name" in entity) {
    const name = (entity as { name?: unknown }).name;
    return typeof name === "string" ? name : "";
  }
  return "";
}

/** 判断 Spec/文案是否描述「待办清单」类 MVP（S6 等） */
export function isTodoAppSpec(spec: AppSpec): boolean {
  const blob = [
    spec.displayName,
    spec.appName,
    ...(spec.screens?.map((s) => `${s.id} ${s.title}`) ?? []),
    ...(spec.entities?.map(entityName) ?? []),
    ...(spec.limitations ?? []),
    JSON.stringify(spec.metadata ?? {})
  ]
    .join(" ")
    .toLowerCase();

  if (/待办|todo|task.?list|任务清单|to-do|todolist/.test(blob)) {
    return true;
  }

  for (const entity of spec.entities ?? []) {
    const name = entityName(entity).toLowerCase();
    if (name.includes("todo") || name.includes("task")) {
      return true;
    }
  }

  for (const screen of spec.screens ?? []) {
    const id = screen.id.toLowerCase();
    if (id.includes("todo") || id.includes("task")) {
      return true;
    }
  }

  return false;
}
