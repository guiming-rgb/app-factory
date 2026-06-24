import { NextRequest, NextResponse } from "next/server";

import { fetchProjectWithAccess } from "@/lib/auth/require-project-access";
import { diffVersions } from "@/lib/versioning/version-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/projects/[id]/versions/diff?from=<versionIdA>&to=<versionIdB>
 *
 * Deep-compare two spec versions and return a structured diff.
 *
 * Query params:
 *   from  (required) — UUID of the "before" version
 *   to    (required) — UUID of the "after" version
 *
 * Response:
 * ```json
 * {
 *   diff: {
 *     added:   { screens: string[], entities: string[], fields: Array<{entity, field}> },
 *     removed: { screens: string[], entities: string[], fields: Array<{entity, field}> },
 *     modified: {
 *       screens:  Array<{id: string, changes: string[]}>,
 *       entities: Array<{name: string, changes: string[]}>,
 *       fields:   Array<{entity: string, field: string, changes: string[]}>
 *     }
 *   },
 *   versionA: { id, versionNumber },
 *   versionB: { id, versionNumber }
 * }
 * ```
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const access = await fetchProjectWithAccess(params.id, "id");
    if (!access.ok) return access.response;

    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        {
          error: "请提供 from 和 to 参数（版本 UUID）",
          hint: '用法: GET /api/projects/:id/versions/diff?from=<versionId>&to=<versionId>',
        },
        { status: 400 },
      );
    }

    if (from === to) {
      return NextResponse.json(
        { error: "两个版本相同，无法比较" },
        { status: 400 },
      );
    }

    const diff = await diffVersions(from, to);

    // Fetch version metadata for context
    const { getSpecVersion } = await import("@/lib/versioning/version-service");
    const [vA, vB] = await Promise.all([
      getSpecVersion(from),
      getSpecVersion(to),
    ]);

    return NextResponse.json({
      diff,
      versionA: vA ? { id: vA.id, versionNumber: vA.versionNumber } : null,
      versionB: vB ? { id: vB.id, versionNumber: vB.versionNumber } : null,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "比较版本失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
