import { getSupabaseAdmin } from "@/lib/supabase";

const LIST_LIMIT = 50;

export type ProjectListItem = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function listProjectsForPage(): Promise<ProjectListItem[] | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
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

export async function getProjectDetailForPage(projectId: string) {
  try {
    const { data: project, error: projectError } = await getSupabaseAdmin()
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return null;
    }

    const { data: runs, error: runsError } = await getSupabaseAdmin()
      .from("agent_runs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (runsError) {
      console.error("[getProjectDetailForPage] runs", runsError.message);
      return null;
    }

    return { project, runs: runs ?? [] };
  } catch (e) {
    console.error("[getProjectDetailForPage]", e);
    return null;
  }
}
