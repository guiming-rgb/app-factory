/**
 * Spec JSON diff 工具 — 对比两个 AppSpec JSON 对象，生成可读的差异列表
 *
 * 对数组采取智能匹配：
 * - screens → 按 screen.id 匹配
 * - entities → 按 entity.name 匹配
 * - 其他数组 → 按索引匹配
 */

export type DiffType = "added" | "removed" | "changed";

export type DiffEntry = {
  type: DiffType;
  path: string; // 如 "screens[\"todo_list\"].title"
  oldValue?: unknown;
  newValue?: unknown;
};

const KEYED_ARRAYS: Record<string, string> = {
  screens: "id",
  entities: "name",
  fields: "name",
  targets: "platform",
  tabs: "id",
};

function formatPath(segments: (string | number)[]): string {
  let result = "";
  for (const seg of segments) {
    if (typeof seg === "number") {
      result += `[${seg}]`;
    } else if (typeof seg === "string" && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(seg)) {
      result += result ? `.${seg}` : seg;
    } else {
      result += `["${seg}"]`;
    }
  }
  return result;
}

function getKey(array: unknown[], keyField: string, index: number): string | number {
  const item = array[index];
  if (item && typeof item === "object" && keyField in (item as Record<string, unknown>)) {
    const val = (item as Record<string, unknown>)[keyField];
    if (typeof val === "string" || typeof val === "number") return val;
  }
  return index;
}

function isKeyedArray(arr: unknown[], parentPath: string): string | null {
  return KEYED_ARRAYS[parentPath] ?? null;
}

function isPrimitive(val: unknown): boolean {
  return val === null || val === undefined || typeof val === "string" || typeof val === "number" || typeof val === "boolean";
}

function diffPair(
  path: string,
  segments: (string | number)[],
  a: unknown,
  b: unknown,
  diffs: DiffEntry[]
): void {
  // 完全相同
  if (a === b) return;
  // 都是原始值 → changed
  if (isPrimitive(a) && isPrimitive(b)) {
    if (a !== b) diffs.push({ type: "changed", path, oldValue: a, newValue: b });
    return;
  }
  // 一方是 null/undefined → added/removed
  if (a == null || b == null) {
    if (a == null && b != null) {
      diffs.push({ type: "added", path, newValue: b });
    } else if (a != null && b == null) {
      diffs.push({ type: "removed", path, oldValue: a });
    }
    return;
  }
  // 类型不同 → changed
  if (typeof a !== typeof b) {
    diffs.push({ type: "changed", path, oldValue: a, newValue: b });
    return;
  }
  // 数组对比
  if (Array.isArray(a) && Array.isArray(b)) {
    const keyField = isKeyedArray(a, path);
    diffArrays(path, segments, a, b, keyField, diffs);
    return;
  }
  // 对象对比
  if (typeof a === "object" && typeof b === "object") {
    diffObjects(path, segments, a as Record<string, unknown>, b as Record<string, unknown>, diffs);
    return;
  }
  // 兜底
  if (a !== b) {
    diffs.push({ type: "changed", path, oldValue: a, newValue: b });
  }
}

function diffArrays(
  path: string,
  segments: (string | number)[],
  a: unknown[],
  b: unknown[],
  keyField: string | null,
  diffs: DiffEntry[]
): void {
  // 用 key 建立两边的索引
  const aMap = new Map<string | number, { index: number; value: unknown }>();
  const bMap = new Map<string | number, { index: number; value: unknown }>();

  for (let i = 0; i < a.length; i++) {
    const key = keyField ? getKey(a, keyField, i) : i;
    aMap.set(key, { index: i, value: a[i] });
  }
  for (let i = 0; i < b.length; i++) {
    const key = keyField ? getKey(b, keyField, i) : i;
    bMap.set(key, { index: i, value: b[i] });
  }

  const allKeys = new Set([...Array.from(aMap.keys()), ...Array.from(bMap.keys())]);

  for (const key of Array.from(allKeys)) {
    const aEntry = aMap.get(key);
    const bEntry = bMap.get(key);
    const keyPathPart = keyField ? `["${key}"]` : `[${key}]`;

    if (!aEntry && bEntry) {
      diffs.push({ type: "added", path: `${path}${keyPathPart}`, newValue: bEntry.value });
    } else if (aEntry && !bEntry) {
      diffs.push({ type: "removed", path: `${path}${keyPathPart}`, oldValue: aEntry.value });
    } else if (aEntry && bEntry) {
      diffPair(`${path}${keyPathPart}`, [...segments, key], aEntry.value, bEntry.value, diffs);
    }
  }
}

function diffObjects(
  path: string,
  segments: (string | number)[],
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  diffs: DiffEntry[]
): void {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of Array.from(allKeys)) {
    const childPath = path ? `${path}.${key}` : key;
    const childSegments = [...segments, key];

    if (!(key in a)) {
      diffs.push({ type: "added", path: childPath, newValue: b[key] });
    } else if (!(key in b)) {
      diffs.push({ type: "removed", path: childPath, oldValue: a[key] });
    } else {
      diffPair(childPath, childSegments, a[key], b[key], diffs);
    }
  }
}

/**
 * 对比当前的 active spec 与某个历史版本的 spec，返回差异列表
 * @param current — 当前保存的 spec
 * @param version — 历史版本的 spec
 */
export function computeSpecDiff(
  current: Record<string, unknown>,
  version: Record<string, unknown>
): DiffEntry[] {
  const diffs: DiffEntry[] = [];
  diffObjects("", [], current, version, diffs);
  return diffs;
}

/**
 * 用中文描述差异，方便在 UI 中展示
 */
export function describeDiff(diff: DiffEntry): string {
  switch (diff.type) {
    case "added":
      return `新增 ${diff.path}`;
    case "removed":
      return `删除 ${diff.path}`;
    case "changed":
      return `修改 ${diff.path}`;
  }
}

export function formatDiffValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    if (value.length > 80) return `"${value.slice(0, 80)}…"`;
    return `"${value}"`;
  }
  if (typeof value === "object") {
    try {
      const str = JSON.stringify(value);
      if (str.length > 120) return str.slice(0, 120) + "…";
      return str;
    } catch {
      return String(value);
    }
  }
  return String(value);
}
