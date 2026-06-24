/**
 * Version Management — Spec history + Codegen artifact versioning.
 *
 * All operations use the Supabase admin client (service_role) so this
 * module is server-only. Route handlers are responsible for auth checks.
 *
 * Tables:
 *   spec_versions   — full JSON snapshots of AppSpec, auto-incremented
 *   codegen_versions— records of generated platform artifacts
 */
import { getSupabaseAdmin } from "@/lib/supabase";
import type { AppSpec } from "@/lib/app-spec/types";

// ─── Types ────────────────────────────────────────────────────────────────

export type SpecVersion = {
  id: string;
  projectId: string;
  spec: Record<string, unknown>;
  versionNumber: number;
  changelog: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type CodegenVersion = {
  id: string;
  projectId: string;
  runId: string;
  platform: string;
  artifactPath: string | null;
  specSnapshot: Record<string, unknown> | null;
  fileCount: number | null;
  totalSizeBytes: number | null;
  createdAt: string;
};

export type VersionDiff = {
  added: {
    screens: string[];
    entities: string[];
    fields: Array<{ entity: string; field: string }>;
  };
  removed: {
    screens: string[];
    entities: string[];
    fields: Array<{ entity: string; field: string }>;
  };
  modified: {
    screens: Array<{ id: string; changes: string[] }>;
    entities: Array<{ name: string; changes: string[] }>;
    fields: Array<{ entity: string; field: string; changes: string[] }>;
  };
};

/** Raw DB row shape for spec_versions */
type SpecVersionRow = {
  id: string;
  project_id: string;
  spec: Record<string, unknown>;
  version_number: number;
  changelog: string | null;
  created_by: string | null;
  created_at: string;
};

/** Raw DB row shape for codegen_versions */
type CodegenVersionRow = {
  id: string;
  project_id: string;
  run_id: string;
  platform: string;
  artifact_path: string | null;
  spec_snapshot: Record<string, unknown> | null;
  file_count: number | null;
  total_size_bytes: number | null;
  created_at: string;
};

// ─── Internal helpers ─────────────────────────────────────────────────────

function toSpecVersion(row: SpecVersionRow): SpecVersion {
  return {
    id: row.id,
    projectId: row.project_id,
    spec: row.spec,
    versionNumber: row.version_number,
    changelog: row.changelog,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function toCodegenVersion(row: CodegenVersionRow): CodegenVersion {
  return {
    id: row.id,
    projectId: row.project_id,
    runId: row.run_id,
    platform: row.platform,
    artifactPath: row.artifact_path,
    specSnapshot: row.spec_snapshot,
    fileCount: row.file_count,
    totalSizeBytes: row.total_size_bytes,
    createdAt: row.created_at,
  };
}

/**
 * Return the current "effective" AppSpec JSON for a project.
 *
 * Precedence:
 *   1. spec_override (user-edited via the spec editor)
 *   2. null — caller should supply their own spec
 */
async function getCurrentProjectSpec(
  projectId: string,
): Promise<Record<string, unknown> | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("projects")
    .select("spec_override")
    .eq("id", projectId)
    .maybeSingle();

  if (!data) return null;
  return (data as { spec_override: Record<string, unknown> | null }).spec_override ?? null;
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Save a new spec version for the project.
 *
 * @param projectId - Project UUID
 * @param spec      - Full AppSpec JSON to snapshot
 * @param userId    - User who created this version (nullable for service operations)
 * @param changelog - Optional human-readable change description
 * @returns The newly created SpecVersion
 */
export async function saveSpecVersion(
  projectId: string,
  spec: Record<string, unknown>,
  userId?: string | null,
  changelog?: string | null,
): Promise<SpecVersion> {
  const supabase = getSupabaseAdmin();

  const row: Record<string, unknown> = {
    project_id: projectId,
    spec,
    created_by: userId || null,
    changelog: changelog || null,
  };

  const { data, error } = await supabase
    .from("spec_versions")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    throw new Error(`保存 Spec 版本失败：${error.message}`);
  }

  return toSpecVersion(data as unknown as SpecVersionRow);
}

/**
 * List all spec versions for a project, newest first.
 *
 * @param projectId - Project UUID
 * @param limit     - Max results (default 20)
 */
export async function getSpecVersions(
  projectId: string,
  limit = 20,
): Promise<SpecVersion[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("spec_versions")
    .select("*")
    .eq("project_id", projectId)
    .order("version_number", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`查询 Spec 版本列表失败：${error.message}`);
  }

  return (data ?? []).map((r) => toSpecVersion(r as unknown as SpecVersionRow));
}

/**
 * Get a single spec version by its ID.
 */
export async function getSpecVersion(
  versionId: string,
): Promise<SpecVersion | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("spec_versions")
    .select("*")
    .eq("id", versionId)
    .maybeSingle();

  if (error) {
    throw new Error(`查询 Spec 版本详情失败：${error.message}`);
  }

  if (!data) return null;
  return toSpecVersion(data as unknown as SpecVersionRow);
}

/**
 * Restore a project to a previous spec version.
 *
 * Reads the old version's spec, saves it as a NEW version (with an
 * auto-incremented number), and updates the project's spec_override.
 *
 * @param projectId - Project UUID
 * @param versionId - The version ID to restore FROM
 * @param userId    - User performing the restore
 * @returns The AppSpec that was restored (now the active spec)
 */
export async function restoreVersion(
  projectId: string,
  versionId: string,
  userId?: string | null,
): Promise<AppSpec> {
  const supabase = getSupabaseAdmin();

  // 1. Fetch the old version
  const oldVersion = await getSpecVersion(versionId);
  if (!oldVersion) {
    throw new Error("要还原的版本不存在");
  }
  if (oldVersion.projectId !== projectId) {
    throw new Error("版本不属于当前项目");
  }

  const spec = oldVersion.spec as AppSpec;

  // 2. Save the restored spec as a new version
  const changelog = `从 v${oldVersion.versionNumber} 还原`;
  const newVersion = await saveSpecVersion(projectId, oldVersion.spec, userId, changelog);

  // 3. Update the project's spec_override
  const { error: updateError } = await supabase
    .from("projects")
    .update({
      spec_override: oldVersion.spec,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (updateError) {
    throw new Error(`还原版本成功但更新项目 spec 失败：${updateError.message}`);
  }

  return spec;
}

// ─── Deep diff ────────────────────────────────────────────────────────────

/**
 * Deep-compare two spec versions and return structured deltas.
 *
 * Comparison is structural — it inspects screens (by `id`), entities
 * (by `name`), and entity fields (by `name` and `type`).
 */
export async function diffVersions(
  versionIdA: string,
  versionIdB: string,
): Promise<VersionDiff> {
  const [va, vb] = await Promise.all([
    getSpecVersion(versionIdA),
    getSpecVersion(versionIdB),
  ]);

  if (!va || !vb) {
    throw new Error("版本不存在，无法比较");
  }

  const specA = va.spec;
  const specB = vb.spec;

  return computeDiff(specA, specB);
}

/**
 * Compute a structured diff between two raw spec objects without DB lookups.
 */
export function computeDiff(
  specA: Record<string, unknown>,
  specB: Record<string, unknown>,
): VersionDiff {
  const diff: VersionDiff = {
    added: { screens: [], entities: [], fields: [] },
    removed: { screens: [], entities: [], fields: [] },
    modified: { screens: [], entities: [], fields: [] },
  };

  // ── Screens ──────────────────────────────────────────
  const screensA = (specA.screens as Array<{ id: string; title?: string; type?: string }>) ?? [];
  const screensB = (specB.screens as Array<{ id: string; title?: string; type?: string }>) ?? [];
  const screenMapA = new Map(screensA.map((s) => [s.id, s]));
  const screenMapB = new Map(screensB.map((s) => [s.id, s]));

  for (const id of screenMapB.keys()) {
    if (!screenMapA.has(id)) {
      diff.added.screens.push(id);
    }
  }
  for (const id of screenMapA.keys()) {
    if (!screenMapB.has(id)) {
      diff.removed.screens.push(id);
    }
  }
  for (const [id, sA] of screenMapA) {
    const sB = screenMapB.get(id);
    if (sB) {
      const changes: string[] = [];
      if (sA.title !== sB.title) changes.push("title");
      if (sA.type !== sB.type) changes.push("type");
      if (changes.length > 0) {
        diff.modified.screens.push({ id, changes });
      }
    }
  }

  // ── Entities ─────────────────────────────────────────
  const entitiesA = (specA.entities as Array<{
    name: string;
    fields?: Array<{ name: string; type?: string; primary?: boolean; required?: boolean }>;
  }>) ?? [];
  const entitiesB = (specB.entities as Array<{
    name: string;
    fields?: Array<{ name: string; type?: string; primary?: boolean; required?: boolean }>;
  }>) ?? [];
  const entityMapA = new Map(entitiesA.map((e) => [e.name, e]));
  const entityMapB = new Map(entitiesB.map((e) => [e.name, e]));

  for (const name of entityMapB.keys()) {
    if (!entityMapA.has(name)) {
      diff.added.entities.push(name);
    }
  }
  for (const name of entityMapA.keys()) {
    if (!entityMapB.has(name)) {
      diff.removed.entities.push(name);
    }
  }

  for (const [name, eA] of entityMapA) {
    const eB = entityMapB.get(name);
    if (!eB) continue;

    // Check entity-level metadata changes (non-field)
    const entityChanges: string[] = [];
    // Currently no entity-level fields besides `fields`; reserved for future use
    if (entityChanges.length > 0) {
      diff.modified.entities.push({ name, changes: entityChanges });
    }

    // ── Fields within entity ───────────────────────────
    const fieldsA = eA.fields ?? [];
    const fieldsB = eB.fields ?? [];
    const fieldMapA = new Map(fieldsA.map((f) => [f.name, f]));
    const fieldMapB = new Map(fieldsB.map((f) => [f.name, f]));

    for (const fname of fieldMapB.keys()) {
      if (!fieldMapA.has(fname)) {
        diff.added.fields.push({ entity: name, field: fname });
      }
    }
    for (const fname of fieldMapA.keys()) {
      if (!fieldMapB.has(fname)) {
        diff.removed.fields.push({ entity: name, field: fname });
      }
    }
    for (const [fname, fA] of fieldMapA) {
      const fB = fieldMapB.get(fname);
      if (fB) {
        const fieldChanges: string[] = [];
        if (fA.type !== fB.type) fieldChanges.push("type");
        if (fA.primary !== fB.primary) fieldChanges.push("primary");
        if (fA.required !== fB.required) fieldChanges.push("required");
        if (fieldChanges.length > 0) {
          diff.modified.fields.push({
            entity: name,
            field: fname,
            changes: fieldChanges,
          });
        }
      }
    }
  }

  return diff;
}

// ─── Codegen versions ─────────────────────────────────────────────────────

/**
 * List all codegen artifact versions for a project, optionally filtered by platform.
 */
export async function getCodegenVersions(
  projectId: string,
  platform?: string | null,
): Promise<CodegenVersion[]> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("codegen_versions")
    .select("*")
    .eq("project_id", projectId);

  if (platform) {
    query = query.eq("platform", platform);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`查询 Codegen 版本列表失败：${error.message}`);
  }

  return (data ?? []).map((r) => toCodegenVersion(r as unknown as CodegenVersionRow));
}

/**
 * Compare two codegen runs by their run IDs.
 *
 * Loads both records from codegen_versions and produces a summary.
 */
export async function compareCodegenVersions(
  runIdA: string,
  runIdB: string,
): Promise<{
  fileChanges: string[];
  sizeDiff: number;
  a: CodegenVersion | null;
  b: CodegenVersion | null;
}> {
  const supabase = getSupabaseAdmin();

  const { data: rows } = await supabase
    .from("codegen_versions")
    .select("*")
    .in("run_id", [runIdA, runIdB]);

  const a = (rows ?? []).find(
    (r) => r.run_id === runIdA,
  ) as CodegenVersionRow | null;
  const b = (rows ?? []).find(
    (r) => r.run_id === runIdB,
  ) as CodegenVersionRow | null;

  const sizeDiff = (b?.total_size_bytes ?? 0) - (a?.total_size_bytes ?? 0);
  const fileChanges: string[] = [];

  if (a && b) {
    const countA = a.file_count ?? 0;
    const countB = b.file_count ?? 0;
    const delta = countB - countA;
    if (delta > 0) fileChanges.push(`+${delta} 个文件`);
    else if (delta < 0) fileChanges.push(`${delta} 个文件`);
    else fileChanges.push("文件数不变");

    if (a.platform !== b.platform) {
      fileChanges.push(`平台变更：${a.platform} → ${b.platform}`);
    }
  } else if (!a && !b) {
    throw new Error("两个运行记录均未找到");
  } else if (!a) {
    fileChanges.push(`运行 ${runIdA} 未找到记录`);
  } else {
    fileChanges.push(`运行 ${runIdA} → ${runIdB}（新增记录）`);
  }

  return {
    fileChanges,
    sizeDiff,
    a: a ? toCodegenVersion(a) : null,
    b: b ? toCodegenVersion(b) : null,
  };
}

/**
 * Get the current highest version number for a project.
 */
export async function getLatestVersion(projectId: string): Promise<number> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("spec_versions")
    .select("version_number")
    .eq("project_id", projectId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`查询最新版本号失败：${error.message}`);
  }

  return (data as { version_number: number } | null)?.version_number ?? 0;
}

/**
 * Save a codegen version record.
 * Called after a successful code generation run.
 */
export async function saveCodegenVersion(params: {
  projectId: string;
  runId: string;
  platform: string;
  artifactPath?: string | null;
  specSnapshot?: Record<string, unknown> | null;
  fileCount?: number | null;
  totalSizeBytes?: number | null;
}): Promise<CodegenVersion> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("codegen_versions")
    .insert({
      project_id: params.projectId,
      run_id: params.runId,
      platform: params.platform,
      artifact_path: params.artifactPath ?? null,
      spec_snapshot: params.specSnapshot ?? null,
      file_count: params.fileCount ?? null,
      total_size_bytes: params.totalSizeBytes ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`保存 Codegen 版本失败：${error.message}`);
  }

  return toCodegenVersion(data as unknown as CodegenVersionRow);
}
