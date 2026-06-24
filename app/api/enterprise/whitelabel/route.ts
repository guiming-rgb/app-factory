/**
 * Enterprise White-Label API Routes
 *
 * GET  /api/enterprise/whitelabel — get white-label config
 * PUT  /api/enterprise/whitelabel — update white-label (enterprise only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import {
  setWhiteLabel,
  getWhiteLabel,
  type WhiteLabelConfig,
} from "@/lib/enterprise/white-label";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Require enterprise admin permission for a workspace.
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
 * GET: Get white-label configuration for a workspace.
 *
 * Query params:
 *   workspaceId: string  (required)
 *   hostname?: string    (optional, resolve by custom domain instead)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const hostname = searchParams.get("hostname");

    // Resolve by custom domain
    if (hostname) {
      const { resolveWhiteLabel } = await import(
        "@/lib/enterprise/white-label"
      );
      const config = await resolveWhiteLabel(hostname);
      if (!config) {
        return NextResponse.json(
          { error: "未找到匹配的白标配置" },
          { status: 404 }
        );
      }
      return NextResponse.json({ configured: true, config });
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "缺少 workspaceId 参数" },
        { status: 400 }
      );
    }

    const config = await getWhiteLabel(workspaceId);
    if (!config) {
      return NextResponse.json({ configured: false });
    }

    return NextResponse.json({ configured: true, config });
  } catch (e) {
    const message = e instanceof Error ? e.message : "获取白标配置失败";
    console.error("[enterprise:whitelabel] GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT: Update white-label configuration.
 *
 * Body:
 *   workspaceId: string
 *   brandName?: string
 *   logoUrl?: string
 *   faviconUrl?: string
 *   primaryColor?: string
 *   secondaryColor?: string
 *   customDomain?: string
 *   customCss?: string
 *   emailFrom?: string
 *   emailFooter?: string
 *   hidePoweredBy?: boolean
 */
export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      workspaceId?: unknown;
      brandName?: unknown;
      logoUrl?: unknown;
      faviconUrl?: unknown;
      primaryColor?: unknown;
      secondaryColor?: unknown;
      customDomain?: unknown;
      customCss?: unknown;
      emailFrom?: unknown;
      emailFooter?: unknown;
      hidePoweredBy?: unknown;
    };

    if (!body.workspaceId) {
      return NextResponse.json(
        { error: "缺少必填字段: workspaceId" },
        { status: 400 }
      );
    }

    const workspaceId = String(body.workspaceId).trim();
    const auth = await requireEnterpriseAdmin(workspaceId);
    if (!auth.ok) return auth.response;

    // Validate primary color if provided
    if (body.primaryColor !== undefined) {
      const color = String(body.primaryColor);
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
        return NextResponse.json(
          { error: "primaryColor 必须是有效的十六进制颜色（如 #0D9488）" },
          { status: 400 }
        );
      }
    }

    // Validate custom domain format if provided
    if (body.customDomain !== undefined) {
      const domain = String(body.customDomain).trim();
      if (domain && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(domain)) {
        return NextResponse.json(
          { error: "customDomain 格式无效" },
          { status: 400 }
        );
      }
    }

    const config: Partial<Omit<WhiteLabelConfig, "workspaceId" | "createdAt" | "updatedAt">> = {};

    if (body.brandName !== undefined) config.brandName = String(body.brandName);
    if (body.logoUrl !== undefined) config.logoUrl = String(body.logoUrl) || null;
    if (body.faviconUrl !== undefined) config.faviconUrl = String(body.faviconUrl) || null;
    if (body.primaryColor !== undefined) config.primaryColor = String(body.primaryColor);
    if (body.secondaryColor !== undefined) config.secondaryColor = String(body.secondaryColor) || null;
    if (body.customDomain !== undefined) config.customDomain = String(body.customDomain).trim() || null;
    if (body.customCss !== undefined) config.customCss = String(body.customCss) || null;
    if (body.emailFrom !== undefined) config.emailFrom = String(body.emailFrom) || null;
    if (body.emailFooter !== undefined) config.emailFooter = String(body.emailFooter) || null;
    if (body.hidePoweredBy !== undefined) config.hidePoweredBy = Boolean(body.hidePoweredBy);

    await setWhiteLabel(workspaceId, config);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "更新白标配置失败";
    console.error("[enterprise:whitelabel] PUT error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
