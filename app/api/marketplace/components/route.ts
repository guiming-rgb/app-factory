/**
 * Marketplace Components — List & Create API
 *
 * GET  — list/search approved components (public)
 * POST — submit a new component (auth required)
 */
import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import {
  listComponents,
  searchComponents,
  registerComponent,
} from "@/lib/marketplace/component-registry";
import type { MarketplaceComponentType } from "@/lib/marketplace/component-registry";
import type { IndustryCategory } from "@/lib/flutter-codegen/emit-industry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── GET: list / search ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const industry = searchParams.get("industry") ?? undefined;
    const type = (searchParams.get("type") ?? undefined) as
      | MarketplaceComponentType
      | undefined;
    const search = searchParams.get("search") ?? undefined;

    // Pagination
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);

    let components;

    if (search) {
      // Full-text search mode
      components = await searchComponents(search);
    } else {
      components = await listComponents({ industry, type, page, limit });
    }

    // Count total for pagination metadata
    // We do a second lightweight query for the total count under the same
    // filters. This is acceptable for v1; for higher traffic add a count
    // estimate via Supabase's .select("id", { count: "exact", head: true }).
    const supabase = (await import("@/lib/supabase")).getSupabaseAdmin();
    let countQuery = supabase
      .from("marketplace_components")
      .select("id", { count: "exact", head: true })
      .eq("approved", true);

    if (industry) countQuery = countQuery.eq("industry", industry);
    if (type) countQuery = countQuery.eq("type", type);

    const { count } = await countQuery;

    return NextResponse.json({
      components,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取组件列表失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST: submit new component ──────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const user = await getApiUser();
    if (isAuthEnabled() && !user) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const { name, version, industry, type, description, tags, files, previewImage } =
      body as Record<string, unknown>;

    // ── Validation ──────────────────────────────────────────────
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "组件名称不能为空" }, { status: 400 });
    }

    const validTypes: MarketplaceComponentType[] = [
      "widget",
      "page",
      "service",
      "template",
    ];
    if (!type || !validTypes.includes(type as MarketplaceComponentType)) {
      return NextResponse.json(
        { error: "组件类型无效，必须为 widget/page/service/template 之一" },
        { status: 400 },
      );
    }

    if (!industry || typeof industry !== "string") {
      return NextResponse.json(
        { error: "行业类型不能为空" },
        { status: 400 },
      );
    }

    if (description && typeof description !== "string") {
      return NextResponse.json(
        { error: "描述必须是字符串" },
        { status: 400 },
      );
    }

    if (files && !Array.isArray(files)) {
      return NextResponse.json(
        { error: "files 必须是数组" },
        { status: 400 },
      );
    }

    // Build the component payload
    const result = await registerComponent({
      name: name.trim(),
      version: (version as string) || "1.0.0",
      industry: industry as IndustryCategory,
      type: type as MarketplaceComponentType,
      authorId: user?.id || undefined,
      author: user?.user_metadata?.name || user?.email || "匿名",
      description: (description as string)?.trim() ?? "",
      tags: Array.isArray(tags) ? tags.map(String) : [],
      files: Array.isArray(files) ? files : [],
      previewImage: (previewImage as string) || undefined,
    });

    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "提交组件失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
