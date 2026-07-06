import { NextRequest, NextResponse } from "next/server";
import {
  clearSsoExchangeCookie,
  readSsoExchangeCookie,
} from "@/lib/enterprise/sso-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/enterprise/sso/exchange
 *
 * 前端在 ?sso=pending 时调用，一次性换取 token 并清除 cookie。
 */
export async function POST(req: NextRequest) {
  const token = readSsoExchangeCookie(req.cookies);
  if (!token) {
    return NextResponse.json({ error: "无待交换的 SSO 会话" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, token });
  clearSsoExchangeCookie(response);
  return response;
}
