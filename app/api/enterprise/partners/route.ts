/**
 * Enterprise Partner Program API Routes
 *
 * GET  /api/enterprise/partners — list partners (admin) or get by id
 * POST /api/enterprise/partners — register new partner
 * PATCH /api/enterprise/partners — update partner status / payout
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import {
  registerPartner,
  getPartner,
  listPartners,
  updatePartnerStatus,
  generateReferralLink,
  calculateCommission,
  payoutPartner,
  type PartnerStatus,
} from "@/lib/enterprise/partner-program";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Require enterprise admin or owner role.
 */
async function requireAdmin() {
  const user = await getApiUser();
  if (!user) {
    return { ok: false as const, response: unauthorizedResponse() };
  }

  const { getSupabaseAdmin } = await import("@/lib/supabase");
  const supabase = getSupabaseAdmin();
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "需要企业管理员权限" },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const, user };
}

/**
 * GET: List partners, optionally filtered by status.
 *
 * Query params:
 *   status?: "active" | "pending" | "suspended"
 *   id?: string (get single partner)
 *   action?: "referral-link" (requires id param)
 *   commission?: "true" (requires id and month params)
 *   month?: "YYYY-MM" (for commission calculation)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const status = searchParams.get("status") as PartnerStatus | null;
    const action = searchParams.get("action");
    const commission = searchParams.get("commission");
    const month = searchParams.get("month") || getCurrentMonth();

    // Public: get a single partner by ID (no auth needed for lookup)
    if (id) {
      // Generate referral link
      if (action === "referral-link") {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;

        const url = await generateReferralLink(id);
        return NextResponse.json({ referralLink: url });
      }

      // Calculate commission
      if (commission === "true") {
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;

        const result = await calculateCommission(id, month);
        return NextResponse.json(result);
      }

      const partner = await getPartner(id);
      if (!partner) {
        return NextResponse.json(
          { error: "合作伙伴未找到" },
          { status: 404 }
        );
      }
      return NextResponse.json(partner);
    }

    // Admin: list all partners
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const partners = await listPartners(
      status && ["active", "pending", "suspended"].includes(status)
        ? status
        : undefined
    );

    return NextResponse.json(partners);
  } catch (e) {
    const message = e instanceof Error ? e.message : "获取合作伙伴列表失败";
    console.error("[enterprise:partners] GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Register a new partner.
 *
 * Body:
 *   name: string (required)
 *   type: "agency" | "freelancer" | "platform" (required)
 *   email: string (required)
 *   website?: string
 *   commissionRate?: number (default 10.0)
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      name?: unknown;
      type?: unknown;
      email?: unknown;
      website?: unknown;
      commissionRate?: unknown;
    };

    if (!body.name || !body.type || !body.email) {
      return NextResponse.json(
        {
          error: "缺少必填字段: name, type, email",
        },
        { status: 400 }
      );
    }

    const type = String(body.type).trim();
    if (!["agency", "freelancer", "platform"].includes(type)) {
      return NextResponse.json(
        { error: "type 必须为 agency, freelancer 或 platform" },
        { status: 400 }
      );
    }

    const email = String(body.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "请提供有效的邮箱地址" },
        { status: 400 }
      );
    }

    if (body.commissionRate !== undefined) {
      const rate = Number(body.commissionRate);
      if (rate < 0 || rate > 100) {
        return NextResponse.json(
          { error: "commissionRate 必须在 0 到 100 之间" },
          { status: 400 }
        );
      }
    }

    const partner = await registerPartner({
      name: String(body.name).trim(),
      type: type as "agency" | "freelancer" | "platform",
      email,
      website: body.website ? String(body.website).trim() : undefined,
      commissionRate: body.commissionRate
        ? Number(body.commissionRate)
        : undefined,
    });

    return NextResponse.json(partner, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "注册合作伙伴失败";
    console.error("[enterprise:partners] POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH: Update partner status or perform payout.
 *
 * Body (status update):
 *   id: string
 *   status: "active" | "suspended"
 *
 * Body (payout):
 *   id: string
 *   action: "payout"
 *   amount: number
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      id?: unknown;
      status?: unknown;
      action?: unknown;
      amount?: unknown;
    };

    if (!body.id) {
      return NextResponse.json(
        { error: "缺少必填字段: id" },
        { status: 400 }
      );
    }

    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const id = String(body.id);

    // Payout action
    if (body.action === "payout") {
      const amount = Number(body.amount ?? 0);
      if (amount <= 0) {
        return NextResponse.json(
          { error: "payout amount 必须大于 0" },
          { status: 400 }
        );
      }
      await payoutPartner(id, amount);
      return NextResponse.json({ ok: true, action: "payout", amount });
    }

    // Status update
    if (body.status) {
      const status = String(body.status);
      if (!["active", "suspended"].includes(status)) {
        return NextResponse.json(
          { error: "status 必须为 active 或 suspended" },
          { status: 400 }
        );
      }
      await updatePartnerStatus(id, status as PartnerStatus);
      return NextResponse.json({ ok: true, status });
    }

    return NextResponse.json(
      { error: "请提供 status 或 action=payout" },
      { status: 400 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "更新合作伙伴失败";
    console.error("[enterprise:partners] PATCH error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
