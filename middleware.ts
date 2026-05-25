import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isAuthEnabled } from "@/lib/auth-config";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ["/projects"];

export async function middleware(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

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
    "/projects/:path*",
    "/login",
    "/signup",
    "/auth/:path*"
  ]
};
