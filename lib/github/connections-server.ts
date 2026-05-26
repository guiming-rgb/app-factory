import { getSupabaseAdmin } from "@/lib/supabase";

export type GitHubConnectionPublic = {
  connected: boolean;
  githubLogin?: string;
  githubUserId?: string;
  connectedAt?: string;
  scope?: string;
};

export type GitHubConnectionWithToken = GitHubConnectionPublic & {
  accessToken: string;
};

export async function getGitHubConnectionPublic(
  userId: string
): Promise<GitHubConnectionPublic> {
  const { data, error } = await getSupabaseAdmin()
    .from("user_github_connections")
    .select("github_login, github_user_id, connected_at, scope")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (/user_github_connections|does not exist/i.test(error.message)) {
      return { connected: false };
    }
    throw new Error(error.message);
  }

  if (!data) {
    return { connected: false };
  }

  return {
    connected: true,
    githubLogin: data.github_login,
    githubUserId: String(data.github_user_id),
    connectedAt: data.connected_at,
    scope: data.scope ?? undefined
  };
}

export async function getGitHubConnectionWithToken(
  userId: string
): Promise<GitHubConnectionWithToken | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("user_github_connections")
    .select("github_login, github_user_id, connected_at, scope, access_token")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (/user_github_connections|does not exist/i.test(error.message)) {
      return null;
    }
    throw new Error(error.message);
  }

  if (!data?.access_token) {
    return null;
  }

  return {
    connected: true,
    githubLogin: data.github_login,
    githubUserId: String(data.github_user_id),
    connectedAt: data.connected_at,
    scope: data.scope ?? undefined,
    accessToken: data.access_token
  };
}

export async function upsertGitHubConnection(input: {
  userId: string;
  githubUserId: number;
  githubLogin: string;
  accessToken: string;
  scope?: string;
  tokenType?: string;
}) {
  const { error } = await getSupabaseAdmin()
    .from("user_github_connections")
    .upsert(
      {
        user_id: input.userId,
        github_user_id: input.githubUserId,
        github_login: input.githubLogin,
        access_token: input.accessToken,
        scope: input.scope ?? null,
        token_type: input.tokenType ?? "bearer",
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );

  if (error) {
    throw new Error(`保存 GitHub 连接失败：${error.message}`);
  }
}

export async function deleteGitHubConnection(userId: string) {
  const { error } = await getSupabaseAdmin()
    .from("user_github_connections")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(`断开 GitHub 连接失败：${error.message}`);
  }
}

import { getGitHubOAuthCallbackUrl } from "./config";

export async function exchangeGitHubOAuthCode(code: string): Promise<{
  accessToken: string;
  scope: string;
  tokenType: string;
}> {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET?.trim();
  const callbackUrl = getGitHubOAuthCallbackUrl();

  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth 未配置");
  }

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl
    })
  });

  const data = (await res.json()) as {
    access_token?: string;
    scope?: string;
    token_type?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "GitHub OAuth token 交换失败"
    );
  }

  return {
    accessToken: data.access_token,
    scope: data.scope ?? "",
    tokenType: data.token_type ?? "bearer"
  };
}

export async function fetchGitHubUserProfile(accessToken: string): Promise<{
  id: number;
  login: string;
}> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  const data = (await res.json()) as { id?: number; login?: string; message?: string };
  if (!res.ok || !data.id || !data.login) {
    throw new Error(data.message || "读取 GitHub 用户信息失败");
  }

  return { id: data.id, login: data.login };
}
