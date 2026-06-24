import { NextRequest, NextResponse } from "next/server";

import { fetchProjectWithAccess } from "@/lib/auth/require-project-access";
import { getApiUser } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import {
  saveSpecVersion,
  getSpecVersions,
} from "@/lib/versioning/version-service";
import { validateAppSpec } from "@/lib/app-spec/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/projects/[id]/versions?limit=20
 *
 * List all spec versions for a project, newest first.
 * Returns lightweight metadata (no full spec JSON in list).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const access = await fetchProjectWithAccess(params.id, "id");
    if (!access.ok) return access.response;

    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam ?? "20", 10) || 20, 1), 100);

    const versions = await getSpecVersions(params.id, limit);

    // Return lightweight list (omit full spec to keep payload small)
    const list = versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      changelog: v.changelog,
      createdBy: v.createdBy,
      createdAt: v.createdAt,
    }));

    return NextResponse.json({ versions: list });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "获取版本列表失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/versions
 *
 * Save a new spec version snapshot.
 *
 * Body (JSON):
 *   { spec?: AppSpec, changelog?: string }
 *
 * - If `spec` is omitted, the current project spec_override is used.
 * - The spec is validated before saving.
 * - A new version record is created with auto-incremented version_number.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const access = await fetchProjectWithAccess<{
      id: string;
      spec_override: Record<string, unknown> | null;
    }>(params.id, "id, spec_override");
    if (!access.ok) return access.response;

    const user = await getApiUser();

    const body = await req.json().catch(() => ({})) as {
      spec?: Record<string, unknown> | null;
      changelog?: string | null;
    };

    let spec = body.spec ?? null;

    // If no spec provided, use the current project spec_override
    if (!spec) {
      spec = access.project.spec_override ?? null;
      if (!spec) {
        return NextResponse.json(
          { error: "当前项目没有已保存的 Spec，请在请求体中提供 spec 字段" },
          { status: 400 },
        );
      }
    }

    // Validate the spec
    const validation = validateAppSpec(spec);
    if (!validation.ok) {
      return NextResponse.json(
        {
          error: "Spec 校验失败",
          details: validation.errors,
        },
        { status: 422 },
      );
    }

    const version = await saveSpecVersion(
      params.id,
      validation.spec as Record<string, unknown>,
      user?.id ?? null,
      body.changelog ?? null,
    );

    return NextResponse.json({
      version: {
        id: version.id,
        versionNumber: version.versionNumber,
        changelog: version.changelog,
        createdBy: version.createdBy,
        createdAt: version.createdAt,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "保存版本失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
