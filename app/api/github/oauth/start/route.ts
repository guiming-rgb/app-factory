import { NextRequest, NextResponse } from "next/server";

import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import {
  getGitHubOAuthCallbackUrl,
  getGitHubOAuthClientId,
  getGitHubOAuthScopes,
  isGitHubOAuthEnabled
} from "@/lib/github/config";
import { createGitHubOAuthState } from "@/lib/github/oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: "Auth 未启用" }, { status: 503 });
  }
  if (!isGitHubOAuthEnabled()) {
    return NextResponse.json(
      { error: "GitHub OAuth 未配置（GITHUB_OAUTH_CLIENT_ID/SECRET）" },
      { status: 503 }
    );
  }

  const user = await getApiUser();
  if (!user) {
    return unauthorizedResponse();
  }

  const next = req.nextUrl.searchParams.get("next");
  const state = createGitHubOAuthState({
    userId: user.id,
    next: next?.startsWith("/") ? next : undefined
  });

  const params = new URLSearchParams({
    client_id: getGitHubOAuthClientId(),
    redirect_uri: getGitHubOAuthCallbackUrl(),
    scope: getGitHubOAuthScopes(),
    state,
    allow_signup: "true"
  });

  return NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`
  );
}
