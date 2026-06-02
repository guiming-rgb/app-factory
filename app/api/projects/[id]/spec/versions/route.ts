import { NextRequest, NextResponse } from "next/server";

import { fetchProjectWithAccess } from "@/lib/auth/require-project-access";
import { listSpecVersions, restoreSpecVersion } from "@/lib/app-spec/spec-versions";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await fetchProjectWithAccess(params.id, "id");
    if (!access.ok) return access.response;

    const versions = await listSpecVersions(params.id);
    return NextResponse.json({ versions });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await fetchProjectWithAccess(params.id, "id");
    if (!access.ok) return access.response;

    const body = await req.json().catch(() => ({}));
    const versionId = body.versionId as string;
    if (!versionId) return NextResponse.json({ error: "缺少 versionId" }, { status: 400 });

    const spec = await restoreSpecVersion(params.id, versionId);
    if (!spec) return NextResponse.json({ error: "版本不存在" }, { status: 404 });

    return NextResponse.json({ ok: true, spec });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
