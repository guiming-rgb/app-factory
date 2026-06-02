/**
 * P0-2: 社交登录（Google / GitHub OAuth）
 * 通过 Supabase Auth 的 OAuth provider 实现
 */

export type SocialProvider = "google" | "github";

export function getSocialLoginUrl(provider: SocialProvider, redirectTo: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return "#";

  const params = new URLSearchParams({
    provider,
    redirect_to: `${redirectTo}/auth/callback?next=/projects`,
  });

  return `${supabaseUrl}/auth/v1/authorize?${params.toString()}`;
}

export function isSocialLoginEnabled(provider: SocialProvider): boolean {
  if (provider === "google") return !!process.env.GOOGLE_CLIENT_ID?.trim();
  if (provider === "github") return !!process.env.GITHUB_CLIENT_ID?.trim();
  return false;
}
