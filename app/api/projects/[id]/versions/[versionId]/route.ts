import { NextRequest, NextResponse } from "next/server";

import { fetchProjectWithAccess } from "@/lib/auth/require-project-access";
import { getApiUser } from "@/lib/auth/api-user";
import {
  getSpecVersion,
  restoreVersion,
} from "@/lib/versioning/version-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/projects/[id]/versions/[versionId]
 *
 * Return the full spec version detail, including the spec JSON body.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; versionId: string } },
) {
  try {
    const access = await fetchProjectWithAccess(params.id, "id");
    if (!access.ok) return access.response;

    const version = await getSpecVersion(params.versionId);
    if (!version) {
      return NextResponse.json({ error: "版本不存在" }, { status: 404 });
    }

    // Security: version must belong to this project
    if (version.projectId !== params.id) {
      return NextResponse.json(
        { error: "版本不属于当前项目" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      version: {
        id: version.id,
        projectId: version.projectId,
        spec: version.spec,
        versionNumber: version.versionNumber,
        changelog: version.changelog,
        createdBy: version.createdBy,
        createdAt: version.createdAt,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "获取版本详情失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/versions/[versionId]/restore
 *
 * Restore the project to this spec version.
 *
 * This reads the version's spec, writes it as a NEW version record
 * (with auto-incremented version_number), and updates the project's
 * spec_override. The original version is preserved.
 *
 * Response includes the new version record and the restored spec.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; versionId: string } },
) {
  try {
    const access = await fetchProjectWithAccess(params.id, "id");
    if (!access.ok) return access.response;

    const user = await getApiUser();

    const spec = await restoreVersion(
      params.id,
      params.versionId,
      user?.id ?? null,
    );

    return NextResponse.json({
      ok: true,
      spec,
      message: `已还原到版本 #${params.versionId}`,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "还原版本失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
