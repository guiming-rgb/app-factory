import { NextResponse } from "next/server";

const SSO_COOKIE = "sso_exchange";
const SSO_COOKIE_PATH = "/api/enterprise/sso/exchange";

function cookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 120,
    path: SSO_COOKIE_PATH,
  };
}

/** P2: 浏览器 SSO 回调 — token 写入 httpOnly cookie，避免 query 泄露 */
export function buildSsoRedirectResponse(
  token: string,
  appUrl: string,
): NextResponse {
  const redirectUrl = new URL("/login", appUrl);
  redirectUrl.searchParams.set("sso", "pending");
  const response = NextResponse.redirect(redirectUrl.toString());
  response.cookies.set(SSO_COOKIE, token, cookieOptions());
  return response;
}

export function readSsoExchangeCookie(
  cookies: { get: (name: string) => { value: string } | undefined },
): string | null {
  return cookies.get(SSO_COOKIE)?.value ?? null;
}

export function clearSsoExchangeCookie(response: NextResponse): void {
  response.cookies.set(SSO_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}
