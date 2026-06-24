/**
 * Component Marketplace v1 — Registry
 *
 * Type definitions and database access layer for the marketplace component
 * catalog. All functions use the Supabase admin client (service role) for
 * full read/write access. For public reads the RLS policy on the
 * marketplace_components table restricts to approved rows.
 *
 * See also:
 *   app/api/marketplace/components/route.ts  — public API routes
 *   supabase/migrations/20260625_q4_marketplace.sql — DDL
 */
import { getSupabaseAdmin } from "@/lib/supabase";
import type { IndustryCategory } from "@/lib/flutter-codegen/emit-industry";

// ─── Types ───────────────────────────────────────────────────────

export type MarketplaceComponentType = "widget" | "page" | "service" | "template";

export interface MarketplaceComponentFile {
  path: string;
  content: string;
}

export interface MarketplaceComponent {
  id: string;
  name: string;
  version: string;
  industry: IndustryCategory;
  type: MarketplaceComponentType;
  author: string;
  description: string;
  tags: string[];
  downloads: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
  files: MarketplaceComponentFile[];
  previewImage?: string;
}

/** Raw row shape returned by Supabase (snake_case). */
interface MarketplaceComponentRow {
  id: string;
  name: string;
  version: string;
  industry: string;
  type: MarketplaceComponentType;
  author_id: string | null;
  author_name: string;
  description: string | null;
  tags: string[] | null;
  downloads: number;
  rating: number;
  files: MarketplaceComponentFile[] | null;
  preview_image: string | null;
  approved: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────

function rowToComponent(row: MarketplaceComponentRow): MarketplaceComponent {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    industry: row.industry as IndustryCategory,
    type: row.type,
    author: row.author_name,
    description: row.description ?? "",
    tags: row.tags ?? [],
    downloads: row.downloads,
    rating: row.rating,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    files: row.files ?? [],
    previewImage: row.preview_image ?? undefined,
  };
}

function parsePagination(
  page?: number,
  limit?: number,
): { offset: number; limit: number } {
  const p = Math.max(1, page ?? 1);
  const l = Math.min(100, Math.max(1, limit ?? 20));
  return { offset: (p - 1) * l, limit: l };
}

// ─── Registry functions ──────────────────────────────────────────

/**
 * Register a new marketplace component.
 * Inserts into `marketplace_components` and returns the new id.
 */
export async function registerComponent(
  comp: Omit<MarketplaceComponent, "id" | "createdAt" | "updatedAt" | "downloads" | "rating"> & { authorId?: string },
): Promise<{ id: string }> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("marketplace_components")
    .insert({
      name: comp.name,
      version: comp.version ?? "1.0.0",
      industry: comp.industry,
      type: comp.type,
      author_id: comp.authorId || null,
      author_name: comp.author,
      description: comp.description || null,
      tags: comp.tags?.length ? comp.tags : null,
      files: comp.files?.length ? comp.files : [],
      preview_image: comp.previewImage || null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`注册组件失败: ${error.message}`);
  }
  return { id: data.id };
}

/** List / filter / paginate approved components. */
export async function listComponents(
  filters?: {
    industry?: string;
    type?: MarketplaceComponentType;
    search?: string;
    page?: number;
    limit?: number;
  },
): Promise<MarketplaceComponent[]> {
  const supabase = getSupabaseAdmin();
  const { offset, limit } = parsePagination(filters?.page, filters?.limit);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("marketplace_components")
    .select("*")
    .eq("approved", true)
    .order("downloads", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.industry) {
    query = query.eq("industry", filters.industry);
  }
  if (filters?.type) {
    query = query.eq("type", filters.type);
  }
  if (filters?.search) {
    query = query.textSearch("fts", filters.search, {
      type: "websearch",
      config: "english",
    });
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`查询组件列表失败: ${error.message}`);
  }
  return (data ?? []).map(rowToComponent);
}

/** Get a single component by id. Returns null if not found or not approved. */
export async function getComponent(
  id: string,
): Promise<MarketplaceComponent | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("marketplace_components")
    .select("*")
    .eq("id", id)
    .eq("approved", true)
    .maybeSingle();

  if (error) {
    throw new Error(`查询组件失败: ${error.message}`);
  }
  return data ? rowToComponent(data) : null;
}

/** Full-text search over name, description, and tags. */
export async function searchComponents(
  query: string,
): Promise<MarketplaceComponent[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("marketplace_components")
    .select("*")
    .eq("approved", true)
    .textSearch("fts", query, { type: "websearch", config: "english" })
    .order("downloads", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`搜索组件失败: ${error.message}`);
  }
  return (data ?? []).map(rowToComponent);
}

/** Increment the download counter for a component. */
export async function incrementDownloads(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.rpc("increment_component_downloads", {
    comp_id: id,
  });

  if (error) {
    // Fallback: read-then-write if the RPC hasn't been created yet
    const { data, error: readErr } = await supabase
      .from("marketplace_components")
      .select("downloads")
      .eq("id", id)
      .single();
    if (readErr || !data) {
      throw new Error(`更新下载数失败: ${readErr?.message}`);
    }
    const { error: updateErr } = await supabase
      .from("marketplace_components")
      .update({ downloads: (data.downloads ?? 0) + 1 })
      .eq("id", id);
    if (updateErr) {
      throw new Error(`更新下载数失败: ${updateErr.message}`);
    }
  }
}

/** Submit a review (rating + optional comment) for a component. */
export async function submitReview(
  componentId: string,
  rating: number,
  options?: { comment?: string; userId?: string },
): Promise<void> {
  if (rating < 1 || rating > 5) {
    throw new Error("评分需在 1-5 之间");
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("marketplace_reviews").insert({
    component_id: componentId,
    user_id: options?.userId || null,
    rating,
    comment: options?.comment?.trim() || null,
  });

  if (error) {
    throw new Error(`提交评价失败: ${error.message}`);
  }
}

/** Return the most-downloaded approved components. */
export async function getPopularComponents(
  limit: number = 10,
): Promise<MarketplaceComponent[]> {
  const supabase = getSupabaseAdmin();
  const l = Math.min(100, Math.max(1, limit));

  const { data, error } = await supabase
    .from("marketplace_components")
    .select("*")
    .eq("approved", true)
    .order("downloads", { ascending: false })
    .limit(l);

  if (error) {
    throw new Error(`查询热门组件失败: ${error.message}`);
  }
  return (data ?? []).map(rowToComponent);
}

/**
 * Update a component's metadata.
 * Caller is responsible for authorisation (owner check).
 */
export async function updateComponent(
  id: string,
  updates: Partial<{
    name: string;
    version: string;
    industry: IndustryCategory;
    type: MarketplaceComponentType;
    description: string;
    tags: string[];
    files: MarketplaceComponentFile[];
    previewImage: string | null;
  }>,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.version !== undefined) payload.version = updates.version;
  if (updates.industry !== undefined) payload.industry = updates.industry;
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.description !== undefined) payload.description = updates.description || null;
  if (updates.tags !== undefined) payload.tags = updates.tags?.length ? updates.tags : null;
  if (updates.files !== undefined) payload.files = updates.files;
  if (updates.previewImage !== undefined) {
    payload.preview_image = updates.previewImage || null;
  }

  const { error } = await supabase
    .from("marketplace_components")
    .update(payload)
    .eq("id", id);

  if (error) {
    throw new Error(`更新组件失败: ${error.message}`);
  }
}

/** Delete a component. Caller handles authorisation. */
export async function deleteComponent(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("marketplace_components")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`删除组件失败: ${error.message}`);
  }
}
