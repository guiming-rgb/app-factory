import { NextRequest, NextResponse } from "next/server";

import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import { guardProjectAccess } from "@/lib/auth/require-project-access";
import { deleteProjectMemory } from "@/lib/memories/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; memoryId: string } }
) {
  const denied = await guardProjectAccess(params.id);
  if (denied) {
    return denied;
  }

  if (isAuthEnabled() && !(await getApiUser())) {
    return unauthorizedResponse();
  }

  const result = await deleteProjectMemory(params.id, params.memoryId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
