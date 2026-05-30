import { NextRequest, NextResponse } from "next/server";

import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import {
  getUserProfile,
  upsertUserProfile,
  validateUserProfilePatch
} from "@/lib/user-profiles/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAuthEnabled()) {
    return NextResponse.json({ profile: null, enabled: false });
  }
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();
  const profile = await getUserProfile(user.id);
  return NextResponse.json({ profile, enabled: true });
}

export async function PUT(req: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: "Auth 未启用" }, { status: 503 });
  }
  const user = await getApiUser();
  if (!user) return unauthorizedResponse();

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const validated = validateUserProfilePatch({
    displayName: body.displayName,
    roleHint: body.roleHint,
    summary: body.summary
  });
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const result = await upsertUserProfile({
    userId: user.id,
    displayName: validated.patch.display_name,
    roleHint: validated.patch.role_hint,
    summary: validated.patch.summary
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ profile: result });
}
