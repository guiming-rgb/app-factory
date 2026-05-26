import { NextResponse } from "next/server";

import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import { getGitHubConnectionPublic } from "@/lib/github/connections-server";
import { isGitHubOAuthEnabled } from "@/lib/github/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAuthEnabled()) {
    return NextResponse.json({
      enabled: false,
      configured: isGitHubOAuthEnabled(),
      connected: false,
      reason: "Auth 未启用"
    });
  }

  const user = await getApiUser();
  if (!user) {
    return unauthorizedResponse();
  }

  const connection = await getGitHubConnectionPublic(user.id);

  return NextResponse.json({
    enabled: isGitHubOAuthEnabled(),
    configured: isGitHubOAuthEnabled(),
    ...connection
  });
}
