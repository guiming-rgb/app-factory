/**
 * P2-14: Artifacts 生命周期管理
 * - 本地磁盘清理（/tmp 下的旧产物）
 * - Supabase Storage 过期清理
 */
import fs from "fs/promises";
import path from "path";
import os from "os";

import { getSupabaseAdmin } from "@/lib/supabase";
import { getCodegenStorageBucket } from "@/lib/codegen/storage";

const ARTIFACTS_ROOT = path.join(os.tmpdir(), "app-factory-artifacts");

/** 默认保留 7 天的产物 */
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 清理过期的本地磁盘产物
 */
export async function cleanupLocalArtifacts(
  maxAgeMs: number = DEFAULT_MAX_AGE_MS
): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;

  try {
    const entries = await fs.readdir(ARTIFACTS_ROOT, { withFileTypes: true });
    const cutoff = Date.now() - maxAgeMs;

    for (const entry of entries) {
      const full = path.join(ARTIFACTS_ROOT, entry.name);
      try {
        const stat = await fs.stat(full);
        if (stat.mtimeMs < cutoff) {
          await fs.rm(full, { recursive: true, force: true });
          deleted++;
        }
      } catch (e) {
        errors.push(`${entry.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch {
    // 目录不存在或空，正常
  }

  return { deleted, errors };
}

/**
 * 清理 Supabase Storage 中的过期产物。
 * 列出 bucket 中超过 maxAgeMs 的对象并删除。
 */
export async function cleanupStorageArtifacts(
  maxAgeMs: number = DEFAULT_MAX_AGE_MS
): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;

  try {
    const bucket = getCodegenStorageBucket();
    const supabase = getSupabaseAdmin();
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

    // 遍历 Storage 对象（Supabase Storage 不直接支持按时间筛选，需全量遍历）
    const { data: objects, error: listError } = await supabase.storage
      .from(bucket)
      .list();

    if (listError) {
      if (/not found/i.test(listError.message)) return { deleted, errors };
      errors.push(`list: ${listError.message}`);
      return { deleted, errors };
    }

    for (const obj of objects ?? []) {
      try {
        if (obj.created_at && obj.created_at < cutoff) {
          const { error: delError } = await supabase.storage
            .from(bucket)
            .remove([obj.name]);

          if (delError) {
            errors.push(`${obj.name}: ${delError.message}`);
          } else {
            deleted++;
          }
        }
      } catch (e) {
        errors.push(`${obj.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch (e) {
    errors.push(`storage: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { deleted, errors };
}

/**
 * 全量 artifacts 清理（本地 + 远端）。
 * 可在 cron / warmup / 手动管理端点中调用。
 */
export async function cleanupAllArtifacts(
  maxAgeMs: number = DEFAULT_MAX_AGE_MS
): Promise<{ local: number; storage: number; errors: string[] }> {
  const [local, storage] = await Promise.all([
    cleanupLocalArtifacts(maxAgeMs),
    cleanupStorageArtifacts(maxAgeMs)
  ]);

  return {
    local: local.deleted,
    storage: storage.deleted,
    errors: [...local.errors, ...storage.errors]
  };
}
