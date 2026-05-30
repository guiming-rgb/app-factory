import {
  getGitHubConnectionWithToken
} from "./connections-server";
import { isGitHubOAuthEnabled } from "./config";

export type GitHubPushCredentials = {
  accessToken: string;
  githubLogin: string;
  source: "oauth_connection" | "env_pat";
};

function getEnvPat(): string | null {
  const pat =
    process.env.GITHUB_PAT?.trim() || process.env.GITHUB_PUSH_TEST_TOKEN?.trim();
  return pat || null;
}

function getPatBindUserId(): string | null {
  return process.env.GITHUB_PAT_BIND_USER_ID?.trim() || null;
}

/** OAuth 连接；或维护者为指定用户配置的 GITHUB_PAT（仅 E2E / 自动化） */
export async function resolveGitHubPushCredentials(
  userId: string
): Promise<GitHubPushCredentials | null> {
  const connection = await getGitHubConnectionWithToken(userId);
  if (connection?.accessToken && connection.githubLogin) {
    return {
      accessToken: connection.accessToken,
      githubLogin: connection.githubLogin,
      source: "oauth_connection"
    };
  }

  const pat = getEnvPat();
  const bindUserId = getPatBindUserId();
  if (!pat || !bindUserId || bindUserId !== userId) {
    return null;
  }

  const login = process.env.GITHUB_PAT_LOGIN?.trim();
  if (!login) {
    return null;
  }

  return {
    accessToken: pat,
    githubLogin: login,
    source: "env_pat"
  };
}

export function isGitHubPushConfigured(): boolean {
  if (process.env.GITHUB_OAUTH_DISABLED === "1") {
    return !!(getEnvPat() && getPatBindUserId() && process.env.GITHUB_PAT_LOGIN?.trim());
  }
  return (
    isGitHubOAuthEnabled() ||
    !!(getEnvPat() && getPatBindUserId() && process.env.GITHUB_PAT_LOGIN?.trim())
  );
}
