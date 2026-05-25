import { listCodegenRuns } from "@/lib/codegen/runs";
import { enrichCodegenRuns } from "@/lib/codegen/run-response";
import { isAuthEnabled } from "@/lib/auth-config";
import { getSupabaseForUserRead } from "@/lib/supabase/request-client";
import {
  getProjectUsageSummary,
  type ProjectUsageSummary
} from "@/lib/usage-logs";

const LIST_LIMIT = 50;

export type ProjectListItem = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function listProjectsForPage(
  ownerUserId?: string | null
): Promise<ProjectListItem[] | null> {
  try {
    if (isAuthEnabled() && !ownerUserId) {
      return [];
    }

    const supabase = await getSupabaseForUserRead();
    if (isAuthEnabled() && !supabase) {
      return [];
    }

    const { data, error } = await supabase!
      .from("projects")
      .select("id, title, status, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);

    if (error) {
      console.error("[listProjectsForPage]", error.message);
      return null;
    }

    return data ?? [];
  } catch (e) {
    console.error("[listProjectsForPage]", e);
    return null;
  }
}

export async function getProjectDetailForPage(
  projectId: string,
  ownerUserId?: string | null
) {
  try {
    if (isAuthEnabled() && !ownerUserId) {
      return null;
    }

    const supabase = await getSupabaseForUserRead();
    if (isAuthEnabled() && !supabase) {
      return null;
    }

    const { data: project, error: projectError } = await supabase!
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project) {
      return null;
    }

    const { data: runs, error: runsError } = await supabase!
      .from("agent_runs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (runsError) {
      console.error("[getProjectDetailForPage] runs", runsError.message);
      return null;
    }

    const usage = await getProjectUsageSummary(projectId, supabase!);

    let codegenRuns: Awaited<ReturnType<typeof enrichCodegenRuns>> = [];
    try {
      const rawRuns = await listCodegenRuns(projectId, 8, supabase!);
      codegenRuns = await enrichCodegenRuns(rawRuns, projectId);
    } catch (e) {
      console.warn("[getProjectDetailForPage] codegen_runs", e);
    }

    return { project, runs: runs ?? [], usage, codegenRuns };
  } catch (e) {
    console.error("[getProjectDetailForPage]", e);
    return null;
  }
}

export type { ProjectUsageSummary };
