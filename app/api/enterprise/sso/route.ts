/**
 * Enterprise SSO API Routes
 *
 * POST /api/enterprise/sso — configure SSO (enterprise admin only)
 * GET  /api/enterprise/sso — get SSO status for workspace
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import {
  configureSSO,
  getSSOConfigSafe,
  disableSSO,
  initiateSSOLogin,
  type ConfigureSSOInput,
} from "@/lib/enterprise/sso-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Require the caller to be an enterprise admin (workspace owner/admin).
 * Returns the authenticated user or an error response.
 */
async function requireEnterpriseAdmin(workspaceId: string) {
  const user = await getApiUser();
  if (!user) {
    return { ok: false as const, response: unauthorizedResponse() };
  }

  const { getSupabaseAdmin } = await import("@/lib/supabase");
  const supabase = getSupabaseAdmin();
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "需要企业管理员权限" },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const, user, role: membership.role };
}

/**
 * POST: Configure SSO for a workspace.
 *
 * Body:
 *   workspaceId: string
 *   provider: "saml" | "oidc"
 *   metadataUrl: string
 *   clientId?: string
 *   clientSecret?: string
 *   domain: string
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      workspaceId?: unknown;
      provider?: unknown;
      metadataUrl?: unknown;
      clientId?: unknown;
      clientSecret?: unknown;
      domain?: unknown;
      action?: unknown;
      enable?: unknown;
    };

    // Handle disable action
    if (body.action === "disable" && body.workspaceId) {
      const wsId = String(body.workspaceId);
      const auth = await requireEnterpriseAdmin(wsId);
      if (!auth.ok) return auth.response;

      await disableSSO(wsId);
      return NextResponse.json({ ok: true, enabled: false });
    }

    // Configure
    if (
      !body.workspaceId ||
      !body.provider ||
      !body.metadataUrl ||
      !body.domain
    ) {
      return NextResponse.json(
        {
          error:
            "缺少必填字段: workspaceId, provider, metadataUrl, domain",
        },
        { status: 400 }
      );
    }

    const workspaceId = String(body.workspaceId).trim();
    const provider = String(body.provider).trim();
    const metadataUrl = String(body.metadataUrl).trim();
    const domain = String(body.domain).trim().toLowerCase();

    if (!["saml", "oidc"].includes(provider)) {
      return NextResponse.json(
        { error: "provider 必须为 saml 或 oidc" },
        { status: 400 }
      );
    }

    if (!/^https?:\/\//i.test(metadataUrl)) {
      return NextResponse.json(
        { error: "metadataUrl 必须是完整 URL（以 http:// 或 https:// 开头）" },
        { status: 400 }
      );
    }

    if (!domain.includes(".")) {
      return NextResponse.json(
        { error: "domain 必须是有效的域名（如 example.com）" },
        { status: 400 }
      );
    }

    const auth = await requireEnterpriseAdmin(workspaceId);
    if (!auth.ok) return auth.response;

    const input: ConfigureSSOInput = {
      provider: provider as "saml" | "oidc",
      metadataUrl,
      domain,
    };

    if (body.clientId) input.clientId = String(body.clientId);
    if (body.clientSecret) input.clientSecret = String(body.clientSecret);

    await configureSSO(workspaceId, input);

    return NextResponse.json({ ok: true, enabled: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "配置 SSO 失败";
    console.error("[enterprise:sso] POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET: Get SSO configuration for a workspace.
 *
 * Query params:
 *   workspaceId: string  (required)
 *   action?: "login" to generate a login redirect URL
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const action = searchParams.get("action");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "缺少 workspaceId 参数" },
        { status: 400 }
      );
    }

    // Initiate login: generates the IdP redirect URL
    if (action === "login") {
      const url = await initiateSSOLogin(workspaceId);
      return NextResponse.json({ redirectUrl: url });
    }

    const auth = await requireEnterpriseAdmin(workspaceId);
    if (!auth.ok) return auth.response;

    // Get config (redacted, no client secret)
    const config = await getSSOConfigSafe(workspaceId);
    if (!config) {
      return NextResponse.json({ configured: false });
    }

    return NextResponse.json({ configured: true, config });
  } catch (e) {
    const message = e instanceof Error ? e.message : "获取 SSO 配置失败";
    console.error("[enterprise:sso] GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
