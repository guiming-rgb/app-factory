import { NextRequest, NextResponse } from "next/server";

import { buildSpecForProject } from "@/lib/app-spec/from-report";
import { validateAppSpec } from "@/lib/app-spec/validate";
import { assessSpecQuality } from "@/lib/app-spec/spec-quality";
import { fetchProjectWithAccess } from "@/lib/auth/require-project-access";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const sourceParam = req.nextUrl.searchParams.get("source");
    const preferReport = sourceParam !== "title";

    const access = await fetchProjectWithAccess<{
      id: string;
      title: string;
      idea: string;
      final_report: string | null;
      status: string;
      spec_override: unknown;
    }>(projectId, "id, title, idea, final_report, status, spec_override");
    if (!access.ok) {
      return access.response;
    }
    const project = access.project;

    if (sourceParam === "title") {
      const { buildMinimalSpecFromProject } = await import(
        "@/lib/app-spec/from-project"
      );
      return NextResponse.json({
        spec: buildMinimalSpecFromProject({
          id: project.id,
          title: project.title ?? "未命名",
          idea: project.idea
        }),
        source: "title-heuristic",
        specOverride: project.spec_override ?? null
      });
    }

    const result = await buildSpecForProject(
      {
        id: project.id,
        title: project.title ?? "未命名",
        idea: project.idea,
        final_report: project.final_report
      },
      { preferReport }
    );

    return NextResponse.json({
      spec: result.spec,
      source: result.source,
      warning: result.warning ?? null,
      hasReport: Boolean(project.final_report?.trim()),
      quality: assessSpecQuality(result.spec),
      specOverride: project.spec_override ?? null
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Spec 生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT: 保存用户编辑的 Spec（写入 projects.spec_override）
 * P0: Spec 编辑交互
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    const access = await fetchProjectWithAccess<{
      id: string;
    }>(projectId, "id");
    if (!access.ok) {
      return access.response;
    }

    const body = await req.json().catch(() => null);
    const spec = (body as Record<string, unknown> | null)?.spec;
    if (!spec || typeof spec !== "object") {
      return NextResponse.json(
        { error: "请求体需包含 spec 字段（JSON 对象）" },
        { status: 400 }
      );
    }

    // 校验 Spec 合法性
    const validation = validateAppSpec(spec);
    if (!validation.ok) {
      return NextResponse.json(
        {
          error: "Spec 校验失败",
          details: validation.errors
        },
        { status: 422 }
      );
    }

    const { error } = await getSupabaseAdmin()
      .from("projects")
      .update({
        spec_override: validation.spec,
        updated_at: new Date().toISOString()
      })
      .eq("id", projectId);

    if (error) {
      return NextResponse.json(
        { error: `保存 Spec 失败：${error.message}` },
        { status: 500 }
      );
    }

    // 保存版本历史 (P2)
    try {
      const { saveSpecVersion } = await import("@/lib/app-spec/spec-versions");
      await saveSpecVersion(projectId, validation.spec as Record<string, unknown>);
    } catch (versionErr) {
      console.warn("[spec/route] version save skipped:", versionErr);
    }

    return NextResponse.json({
      ok: true,
      spec: validation.spec,
      source: "user-edited"
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "保存 Spec 失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE: 重置 spec_override，回退到 LLM 自动提取
 * P0: Spec 编辑交互
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    const access = await fetchProjectWithAccess<{
      id: string;
    }>(projectId, "id");
    if (!access.ok) {
      return access.response;
    }

    const { error } = await getSupabaseAdmin()
      .from("projects")
      .update({
        spec_override: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", projectId);

    if (error) {
      return NextResponse.json(
        { error: `重置 Spec 失败：${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, source: "report-llm" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "重置 Spec 失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
