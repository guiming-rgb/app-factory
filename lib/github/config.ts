export function isGitHubOAuthEnabled(): boolean {
  if (process.env.GITHUB_OAUTH_DISABLED === "1") {
    return false;
  }
  return !!(
    process.env.GITHUB_OAUTH_CLIENT_ID?.trim() &&
    process.env.GITHUB_OAUTH_CLIENT_SECRET?.trim()
  );
}

export function getGitHubOAuthClientId(): string {
  const id = process.env.GITHUB_OAUTH_CLIENT_ID?.trim();
  if (!id) {
    throw new Error("缺少 GITHUB_OAUTH_CLIENT_ID");
  }
  return id;
}

export function getGitHubOAuthClientSecret(): string {
  const secret = process.env.GITHUB_OAUTH_CLIENT_SECRET?.trim();
  if (!secret) {
    throw new Error("缺少 GITHUB_OAUTH_CLIENT_SECRET");
  }
  return secret;
}

export function getGitHubOAuthScopes(): string {
  return process.env.GITHUB_OAUTH_SCOPES?.trim() || "repo read:user";
}

export function getAppPublicUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim()?.replace(/^/, "https://") ||
    "http://localhost:3001"
  ).replace(/\/$/, "");
}

export function getGitHubOAuthCallbackUrl(): string {
  return `${getAppPublicUrl()}/api/github/oauth/callback`;
}

export function getGitHubOAuthStateSecret(): string {
  const secret = process.env.GITHUB_OAUTH_STATE_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "Missing GITHUB_OAUTH_STATE_SECRET — set a random 32+ char string in .env.local. " +
      "This secret signs OAuth state parameters to prevent CSRF."
    );
  }
  return secret;
}
