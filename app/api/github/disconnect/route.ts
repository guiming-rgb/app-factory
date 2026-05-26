import { NextResponse } from "next/server";

import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import { deleteGitHubConnection } from "@/lib/github/connections-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: "Auth 未启用" }, { status: 503 });
  }

  const user = await getApiUser();
  if (!user) {
    return unauthorizedResponse();
  }

  await deleteGitHubConnection(user.id);
  return NextResponse.json({ ok: true, connected: false });
}
