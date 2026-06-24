/**
 * Enterprise SLA API Routes
 *
 * GET  /api/enterprise/sla — SLA metrics for workspace (?period=30d) or global uptime
 * POST /api/enterprise/sla — report/resolve incident
 * PUT  /api/enterprise/sla — update SLA config
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import {
  setSLAConfig,
  getSLAConfig,
  getSLAMetrics,
  getUptimeStatus,
  trackIncident,
  resolveIncident,
  listIncidents,
  type IncidentType,
} from "@/lib/enterprise/sla-tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Require workspace member (view-only access) or admin (management access).
 */
async function requireWorkspaceAccess(workspaceId: string, requireAdmin = false) {
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

  if (!membership) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "您不是此工作区成员" },
        { status: 403 }
      ),
    };
  }

  if (requireAdmin && !["owner", "admin"].includes(membership.role)) {
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
 * GET: Get SLA metrics for a workspace or global uptime.
 *
 * Query params:
 *   workspaceId?: string
 *   month?: "YYYY-MM" (defaults to current month)
 *   period?: "30d" | "7d" | "24h"
 *   incidents?: "true" (include incident list)
 *   global?: "true" (get global uptime instead)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const month = searchParams.get("month") || getCurrentMonth();
    const globalFlag = searchParams.get("global");

    // Global uptime status (no auth required)
    if (globalFlag === "true") {
      const status = await getUptimeStatus();
      return NextResponse.json(status);
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "缺少 workspaceId 参数" },
        { status: 400 }
      );
    }

    const auth = await requireWorkspaceAccess(workspaceId);
    if (!auth.ok) return auth.response;

    // Get config
    const config = await getSLAConfig(workspaceId);

    // Get monthly metrics
    const metrics = await getSLAMetrics(workspaceId, month);

    // Include incidents if requested
    if (searchParams.get("incidents") === "true") {
      const incidents = await listIncidents(workspaceId, month);
      return NextResponse.json({
        config,
        metrics,
        incidents,
      });
    }

    return NextResponse.json({
      config,
      metrics,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "获取 SLA 数据失败";
    console.error("[enterprise:sla] GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Report a new incident or resolve an existing one.
 *
 * Body (report):
 *   action: "report" (default)
 *   workspaceId: string
 *   type: "outage" | "degraded" | "maintenance"
 *   description?: string
 *   startedAt?: string (ISO)
 *
 * Body (resolve):
 *   action: "resolve"
 *   incidentId: string
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action?: unknown;
      workspaceId?: unknown;
      type?: unknown;
      description?: unknown;
      startedAt?: unknown;
      incidentId?: unknown;
    };

    // Resolve an existing incident
    if (body.action === "resolve") {
      if (!body.incidentId) {
        return NextResponse.json(
          { error: "缺少 incidentId" },
          { status: 400 }
        );
      }

      const incident = await resolveIncident(String(body.incidentId));
      return NextResponse.json({ ok: true, incident });
    }

    // Report a new incident
    if (!body.workspaceId || !body.type) {
      return NextResponse.json(
        { error: "缺少必填字段: workspaceId, type" },
        { status: 400 }
      );
    }

    const workspaceId = String(body.workspaceId);
    const type = String(body.type);

    if (!["outage", "degraded", "maintenance"].includes(type)) {
      return NextResponse.json(
        { error: "type 必须为 outage, degraded 或 maintenance" },
        { status: 400 }
      );
    }

    const auth = await requireWorkspaceAccess(workspaceId, true);
    if (!auth.ok) return auth.response;

    const incident = await trackIncident(
      workspaceId,
      type as IncidentType,
      body.description ? String(body.description) : undefined,
      body.startedAt ? String(body.startedAt) : undefined
    );

    return NextResponse.json(incident, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "处理 SLA 事件失败";
    console.error("[enterprise:sla] POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT: Update SLA configuration for a workspace.
 *
 * Body:
 *   workspaceId: string
 *   uptimeTarget?: number (0.1 - 100)
 *   responseTimeTarget?: number (ms)
 *   supportLevel?: "standard" | "priority" | "dedicated"
 */
export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      workspaceId?: unknown;
      uptimeTarget?: unknown;
      responseTimeTarget?: unknown;
      supportLevel?: unknown;
    };

    if (!body.workspaceId) {
      return NextResponse.json(
        { error: "缺少必填字段: workspaceId" },
        { status: 400 }
      );
    }

    const workspaceId = String(body.workspaceId);
    const auth = await requireWorkspaceAccess(workspaceId, true);
    if (!auth.ok) return auth.response;

    // Validate support level
    if (body.supportLevel !== undefined) {
      const level = String(body.supportLevel);
      if (!["standard", "priority", "dedicated"].includes(level)) {
        return NextResponse.json(
          { error: "supportLevel 必须为 standard, priority 或 dedicated" },
          { status: 400 }
        );
      }
    }

    // Validate uptime target
    if (body.uptimeTarget !== undefined) {
      const target = Number(body.uptimeTarget);
      if (target <= 0 || target > 100) {
        return NextResponse.json(
          { error: "uptimeTarget 必须在 0 到 100 之间" },
          { status: 400 }
        );
      }
    }

    // Validate response time
    if (body.responseTimeTarget !== undefined) {
      const rt = Number(body.responseTimeTarget);
      if (rt <= 0) {
        return NextResponse.json(
          { error: "responseTimeTarget 必须大于 0" },
          { status: 400 }
        );
      }
    }

    await setSLAConfig(workspaceId, {
      uptimeTarget: body.uptimeTarget !== undefined ? Number(body.uptimeTarget) : undefined,
      responseTimeTarget:
        body.responseTimeTarget !== undefined
          ? Number(body.responseTimeTarget)
          : undefined,
      supportLevel: body.supportLevel !== undefined
        ? (String(body.supportLevel) as "standard" | "priority" | "dedicated")
        : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "更新 SLA 配置失败";
    console.error("[enterprise:sla] PUT error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
