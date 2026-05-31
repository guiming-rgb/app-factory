import { NextRequest, NextResponse } from "next/server";

import { enrichCodegenRuns } from "@/lib/codegen/run-response";
import { checkCodegenInngestPreflight } from "@/lib/codegen/inngest-preflight";
import { syncDesktopGhaForRuns } from "@/lib/codegen/sync-desktop-gha";
import { listCodegenRuns } from "@/lib/codegen/runs";
import { cleanupStaleCodegenRuns } from "@/lib/codegen/stale-runs";
import {
  guardProjectAccess,
  getSupabaseForUserRead
} from "@/lib/auth/require-project-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const denied = await guardProjectAccess(projectId);
    if (denied) {
      return denied;
    }

    const supabase = await getSupabaseForUserRead();
    if (!supabase) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const runs = await listCodegenRuns(projectId, 20, supabase);
    await cleanupStaleCodegenRuns({ projectId });
    await syncDesktopGhaForRuns(runs);
    const refreshed = await listCodegenRuns(projectId, 20, supabase);
    const enriched = await enrichCodegenRuns(refreshed, projectId);
    const inngestPreflight = await checkCodegenInngestPreflight();
    return NextResponse.json({ runs: enriched, inngestPreflight }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "查询 codegen 记录失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
