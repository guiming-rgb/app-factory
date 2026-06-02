import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isAuthEnabled } from "@/lib/auth-config";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ["/projects"];

/** 安全头 */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/** API 限流（简单内存计数器，Vercel 边缘层可替换） */
const rateTracker = new Map<string, number>();
const RATE_LIMIT = 60; // 每分钟 60 次

function checkApiRateLimit(pathname: string): boolean {
  if (!pathname.startsWith("/api")) return true;
  const now = Date.now();
  const key = `minute-${Math.floor(now / 60000)}`;
  const count = (rateTracker.get(key) ?? 0) + 1;
  rateTracker.set(key, count);
  return count <= RATE_LIMIT;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API 限流
  if (pathname.startsWith("/api") && !checkApiRateLimit(pathname)) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  // 冷启动预热
  if (pathname === "/api/projects" || pathname === "/api/dashboard") {
    import("@/lib/warmup").then((w) => w.warmup()).catch(() => {});
  }

  let response: NextResponse = NextResponse.next();

  // 安全头
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }

  if (!isAuthEnabled()) {
    return response;
  }

  const session = await updateSession(request);
  response = session.response ?? response;

  // 重新设置安全头（updateSession 可能覆盖了）
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }

  const user = session.user;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const next = request.nextUrl.searchParams.get("next") || "/projects";
    const dest = request.nextUrl.clone();
    dest.pathname = next.startsWith("/") ? next : "/projects";
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/projects/:path*",
    "/login",
    "/signup",
    "/auth/:path*",
    "/dashboard",
    "/health",
  ]
};
