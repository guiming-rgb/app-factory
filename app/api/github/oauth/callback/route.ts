import { NextRequest, NextResponse } from "next/server";

import {
  exchangeGitHubOAuthCode,
  fetchGitHubUserProfile,
  upsertGitHubConnection
} from "@/lib/github/connections-server";
import { getAppPublicUrl } from "@/lib/github/config";
import { verifyGitHubOAuthState } from "@/lib/github/oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = getAppPublicUrl();
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/projects?github=error&reason=${encodeURIComponent(oauthError)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/projects?github=error&reason=missing_code`);
  }

  const payload = verifyGitHubOAuthState(state);
  if (!payload) {
    return NextResponse.redirect(`${origin}/projects?github=error&reason=invalid_state`);
  }

  try {
    const token = await exchangeGitHubOAuthCode(code);
    const profile = await fetchGitHubUserProfile(token.accessToken);
    await upsertGitHubConnection({
      userId: payload.userId,
      githubUserId: profile.id,
      githubLogin: profile.login,
      accessToken: token.accessToken,
      scope: token.scope,
      tokenType: token.tokenType
    });

    const next = payload.next ?? "/projects";
    const sep = next.includes("?") ? "&" : "?";
    return NextResponse.redirect(`${origin}${next}${sep}github=connected`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_failed";
    return NextResponse.redirect(
      `${origin}/projects?github=error&reason=${encodeURIComponent(message.slice(0, 120))}`
    );
  }
}
