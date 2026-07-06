import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isAuthEnabled } from "@/lib/auth-config";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ["/projects", "/admin"];

/** 安全头 — CSP 使用 nonce 替代 unsafe-inline（scripts） */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security":
    "max-age=63072000; includeSubDomains; preload",
};

function buildCSPHeader(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

/**
 * ✅ 安全地验证重定向 URL
 * 只允许相对路径，拒绝协议相对 URL（//evil.com）和外部 URL
 */
function safeRedirectPath(input: string, fallback: string): string {
  // 必须是字符串且非空
  if (typeof input !== "string" || input.trim().length === 0) {
    return fallback;
  }

  const trimmed = input.trim();

  // 拒绝协议相对 URL: //evil.com
  if (trimmed.startsWith("//")) {
    return fallback;
  }

  // 拒绝绝对 URL: https://evil.com
  if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(trimmed)) {
    return fallback;
  }

  // 只接受以 / 开头的相对路径
  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  return fallback;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 生成 per-request nonce（CSP）
  const nonce = generateNonce();

  // API 限流（Supabase 持久化，按 IP 分桶 — P2-H6）
  if (pathname.startsWith("/api")) {
    const { checkSupabaseRateLimit } = await import(
      "@/lib/auth/rate-limit-supabase"
    );
    if (!(await checkSupabaseRateLimit(request))) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    }
  }

  // 冷启动预热
  if (pathname === "/api/projects" || pathname === "/api/dashboard") {
    import("@/lib/warmup")
      .then((w) => w.warmup())
      .catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("[middleware] warmup failed:", err);
        }
      });
  }

  let response: NextResponse = NextResponse.next();

  // 安全头
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }
  // CSP with per-request nonce
  response.headers.set("Content-Security-Policy", buildCSPHeader(nonce));
  response.headers.set("x-nonce", nonce);

  if (!isAuthEnabled()) {
    return response;
  }

  const session = await updateSession(request);
  response = session.response ?? response;

  // 重新设置安全头（updateSession 可能覆盖了）
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }
  response.headers.set("Content-Security-Policy", buildCSPHeader(nonce));

  const user = session.user;

  // ✅ 精确路径匹配，避免 /projector → /projects 误判
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) =>
      pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const rawNext = request.nextUrl.searchParams.get("next") || "";
    // ✅ 安全的重定向路径验证
    const destPath = safeRedirectPath(rawNext, "/projects");

    const dest = request.nextUrl.clone();
    dest.pathname = destPath;
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/projects/:path*",
    "/admin/:path*",
    "/onboarding",
    "/login",
    "/signup",
    "/register",
    "/auth/:path*",
    "/dashboard",
    "/health",
    "/privacy",
    "/terms",
  ],
};
