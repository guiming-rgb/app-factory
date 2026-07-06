/**
 * Enterprise SSO Callback
 *
 * POST /api/enterprise/sso/callback
 *
 * Handles the IdP callback after a SAML or OIDC authentication flow.
 * Expects:
 *   - workspaceId: the workspace the user is authenticating for
 *   - code: authorization code (OIDC) or SAML response
 *   - RelayState (optional): base64-encoded JSON with workspace info
 *
 * Returns a JWT token and user info on success.
 */

import { NextRequest, NextResponse } from "next/server";
import { handleSSOCallback } from "@/lib/enterprise/sso-service";
import { buildSsoRedirectResponse } from "@/lib/enterprise/sso-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST: Handle SSO callback from identity provider.
 *
 * Accepts both JSON body and form-encoded POST (standard OIDC callback).
 *
 * JSON body:
 *   { workspaceId: string, code: string, email?: string, name?: string }
 *
 * Form-encoded (OIDC standard):
 *   code: string
 *   state: string (JSON-encoded workspace info)
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let workspaceId: string;
    let code: string;
    let email: string | undefined;
    let name: string | undefined;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      // OIDC / SAML HTTP-POST binding
      const formData = await req.formData();
      code = String(formData.get("code") || formData.get("SAMLResponse") || "");

      // Extract state/RelayState
      const stateRaw = String(
        formData.get("state") || formData.get("RelayState") || ""
      );

      try {
        const decoded = JSON.parse(
          Buffer.from(stateRaw, "base64url").toString("utf8")
        );
        workspaceId = decoded.workspaceId || decoded.workspace_id || "";
      } catch {
        workspaceId = stateRaw;
      }
    } else {
      // JSON body
      const body = (await req.json()) as Record<string, unknown>;
      workspaceId = String(body.workspaceId || "");
      code = String(body.code || "");
      email = body.email ? String(body.email) : undefined;
      name = body.name ? String(body.name) : undefined;
    }

    if (!workspaceId || !code) {
      return NextResponse.json(
        { error: "缺少必要参数: workspaceId, code" },
        { status: 400 }
      );
    }

    const result = await handleSSOCallback(workspaceId, code, {
      email,
      name,
    });

    const wantsRedirect = req.headers.get("accept")?.includes("text/html");
    if (wantsRedirect) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      return buildSsoRedirectResponse(result.token, appUrl);
    }

    return NextResponse.json({
      ok: true,
      user: result.user,
      token: result.token,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "SSO 登录失败";
    console.error("[enterprise:sso:callback] POST error:", message);
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

/**
 * GET: Handle SAML HTTP-Redirect binding (GET-based callback).
 *
 * Query params:
 *   workspaceId: string (from state)
 *   code or SAMLResponse: string
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code =
      searchParams.get("code") || searchParams.get("SAMLResponse") || "";
    const stateRaw = searchParams.get("state") || searchParams.get("RelayState") || "";

    let workspaceId: string;

    try {
      const decoded = JSON.parse(
        Buffer.from(stateRaw, "base64url").toString("utf8")
      );
      workspaceId = decoded.workspaceId || decoded.workspace_id || "";
    } catch {
      workspaceId = stateRaw;
    }

    if (!workspaceId || !code) {
      return NextResponse.json(
        { error: "Invalid callback: missing workspaceId or code" },
        { status: 400 }
      );
    }

    const result = await handleSSOCallback(workspaceId, code);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return buildSsoRedirectResponse(result.token, appUrl);
  } catch (e) {
    const message = e instanceof Error ? e.message : "SSO 登录失败";
    console.error("[enterprise:sso:callback] GET error:", message);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login?error=sso_failed`
    );
  }
}
