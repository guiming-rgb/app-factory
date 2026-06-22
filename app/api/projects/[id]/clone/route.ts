import { requireProjectOwner } from "@/lib/auth/require-auth";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { fetchProjectWithAccess } from "@/lib/auth/require-project-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST: 克隆项目（复制 Spec + 想法 + 记忆）
 * 方向 B-3：项目克隆/模板化
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await fetchProjectWithAccess<{
      id: string; title: string; idea: string; spec_override: unknown; owner_id: string;
    }>(params.id, "id, title, idea, spec_override, owner_id");
    if (!access.ok) return access.response;

    const body = await req.json().catch(() => ({}));
    const newTitle = (typeof body.title === "string" && body.title.trim()) ? body.title.trim() : `${access.project.title} (副本)`;

    const supabase = getSupabaseAdmin();

    // 创建新项目
    const { data: cloned, error } = await supabase.from("projects").insert({
      title: newTitle,
      idea: access.project.idea,
      spec_override: access.project.spec_override,
      owner_id: access.project.owner_id,
      status: "pending",
    }).select("id, title").single();

    if (error || !cloned) {
      return NextResponse.json({ error: `克隆失败: ${error?.message}` }, { status: 500 });
    }

    // 复制记忆
    const { data: memories } = await supabase.from("memories").select("memory_type, content, importance").eq("project_id", params.id).limit(10);
    if (memories?.length) {
      await supabase.from("memories").insert(
        memories.map((m: Record<string, unknown>) => ({ ...m, project_id: cloned.id, id: undefined }))
      );
    }

    return NextResponse.json({ ok: true, cloned: { id: cloned.id, title: cloned.title } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "克隆失败" }, { status: 500 });
  }
}
