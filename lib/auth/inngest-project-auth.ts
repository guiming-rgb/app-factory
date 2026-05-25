import { NonRetriableError } from "inngest";

import { isAuthEnabled } from "@/lib/auth-config";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Inngest 函数入口：校验 event.data.userId 与 projects.owner_id 一致。
 * Auth 未启用时跳过（向后兼容旧事件）。
 */
export async function assertInngestProjectOwner(
  projectId: string,
  userId: string | null | undefined
): Promise<void> {
  if (!projectId || typeof projectId !== "string") {
    throw new NonRetriableError("forbidden: missing projectId");
  }

  if (!isAuthEnabled()) {
    return;
  }

  if (!userId || typeof userId !== "string") {
    throw new NonRetriableError("forbidden: missing userId in event payload");
  }

  const { data: project, error } = await getSupabaseAdmin()
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    throw new NonRetriableError("forbidden: project not found");
  }

  if (project.owner_id !== userId) {
    throw new NonRetriableError("forbidden: project owner mismatch");
  }
}

/** API 投递 Inngest 时附带 userId（Auth 启用时必填） */
export function inngestUserIdFromSession(
  userId: string | null | undefined
): { userId: string } | Record<string, never> {
  if (!isAuthEnabled() || !userId) {
    return {};
  }
  return { userId };
}
