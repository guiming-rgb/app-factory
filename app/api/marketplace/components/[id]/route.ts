/**
 * Marketplace Component — Single-resource CRUD API
 *
 * GET    /api/marketplace/components/[id]  — detail (public)
 * PUT    /api/marketplace/components/[id]  — update (owner only)
 * DELETE /api/marketplace/components/[id]  — remove (owner only)
 *
 * POST /install is handled by ./install/route.ts
 */
import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import {
  getComponent,
  updateComponent,
  deleteComponent,
} from "@/lib/marketplace/component-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Check that the requesting user owns the component.
 * Throws a NextResponse on failure so callers can `if (error instanceof NextResponse) return error`.
 */
async function requireOwner(id: string): Promise<void> {
  const user = await getApiUser();
  if (isAuthEnabled() && !user) {
    throw unauthorizedResponse();
  }

  // Auth disabled — everyone is owner
  if (!isAuthEnabled()) {
    return;
  }

  const supabase = (await import("@/lib/supabase")).getSupabaseAdmin();
  const { data, error } = await supabase
    .from("marketplace_components")
    .select("author_id")
    .eq("id", id)
    .single();

  if (error || !data) {
    throw NextResponse.json({ error: "组件不存在" }, { status: 404 });
  }

  if (data.author_id && data.author_id !== user!.id) {
    throw NextResponse.json({ error: "无权操作该组件" }, { status: 403 });
  }
}

// ─── GET: single component detail ────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const component = await getComponent(params.id);
    if (!component) {
      return NextResponse.json({ error: "组件不存在或未审核" }, { status: 404 });
    }

    return NextResponse.json({ component });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "查询组件失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PUT: update component ───────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireOwner(params.id);

    const body = await req.json();
    const {
      name,
      version,
      industry,
      type,
      description,
      tags,
      files,
      previewImage,
    } = body as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "组件名称无效" }, { status: 400 });
      }
      updates.name = name.trim();
    }
    if (version !== undefined) updates.version = String(version);
    if (industry !== undefined) updates.industry = String(industry);
    if (type !== undefined) updates.type = String(type);
    if (description !== undefined) updates.description = String(description).trim() || null;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags.map(String) : [];
    if (files !== undefined) {
      if (!Array.isArray(files)) {
        return NextResponse.json({ error: "files 必须是数组" }, { status: 400 });
      }
      updates.files = files;
    }
    if (previewImage !== undefined) {
      updates.previewImage = previewImage ? String(previewImage) : null;
    }

    await updateComponent(params.id, updates);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : "更新组件失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE: remove component ────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireOwner(params.id);
    await deleteComponent(params.id);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : "删除组件失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
