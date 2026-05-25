import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";

export type RateLimitAction = "generate" | "codegen";

const WINDOW_MS = 60 * 60 * 1000;
const RETENTION_MS = 2 * WINDOW_MS;

function parseLimit(raw: string | undefined, fallback: number): number {
  if (raw === "0") {
    return 0;
  }
  if (!raw) {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getRateLimitPerHour(action: RateLimitAction): number {
  if (action === "generate") {
    return parseLimit(process.env.RATE_LIMIT_GENERATE_PER_HOUR?.trim(), 10);
  }
  return parseLimit(process.env.RATE_LIMIT_CODEGEN_PER_HOUR?.trim(), 20);
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimitBucketKey(
  req: NextRequest,
  userId: string | null | undefined
): string {
  if (userId) {
    return `user:${userId}`;
  }
  return `ip:${getClientIp(req)}`;
}

function isRateLimitTableMissing(message: string) {
  return /api_rate_limit_events|schema cache|relation.*does not exist/i.test(
    message
  );
}

async function pruneOldRateLimitEvents() {
  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();
  const { error } = await getSupabaseAdmin()
    .from("api_rate_limit_events")
    .delete()
    .lt("created_at", cutoff);
  if (error && !isRateLimitTableMissing(error.message)) {
    console.warn("[rate-limit] prune failed:", error.message);
  }
}

type ConsumeResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number; limit: number };

export async function consumeRateLimit(input: {
  bucketKey: string;
  action: RateLimitAction;
  limit: number;
}): Promise<ConsumeResult> {
  if (input.limit <= 0) {
    return { ok: true };
  }

  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const admin = getSupabaseAdmin();

  const { count, error: countError } = await admin
    .from("api_rate_limit_events")
    .select("*", { count: "exact", head: true })
    .eq("bucket_key", input.bucketKey)
    .eq("action", input.action)
    .gte("created_at", since);

  if (countError) {
    if (isRateLimitTableMissing(countError.message)) {
      console.warn(
        "[rate-limit] 表未就绪，跳过限流。请执行 npm run db:apply:v4-rate-limit"
      );
      return { ok: true };
    }
    console.warn("[rate-limit] count failed:", countError.message);
    return { ok: true };
  }

  if ((count ?? 0) >= input.limit) {
    const { data: oldest } = await admin
      .from("api_rate_limit_events")
      .select("created_at")
      .eq("bucket_key", input.bucketKey)
      .eq("action", input.action)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const oldestMs = oldest?.created_at
      ? new Date(oldest.created_at).getTime()
      : Date.now();
    const retryAfterSec = Math.max(
      1,
      Math.ceil((WINDOW_MS - (Date.now() - oldestMs)) / 1000)
    );
    return { ok: false, retryAfterSec, limit: input.limit };
  }

  const { error: insertError } = await admin
    .from("api_rate_limit_events")
    .insert({
      bucket_key: input.bucketKey,
      action: input.action
    });

  if (insertError) {
    if (isRateLimitTableMissing(insertError.message)) {
      return { ok: true };
    }
    console.warn("[rate-limit] insert failed:", insertError.message);
    return { ok: true };
  }

  void pruneOldRateLimitEvents();
  return { ok: true };
}

export function rateLimitResponse(
  retryAfterSec: number,
  limit: number,
  action: RateLimitAction
) {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  const label = action === "generate" ? "AI 生产" : "代码生成";
  return NextResponse.json(
    {
      error: `${label}过于频繁，请约 ${minutes} 分钟后再试（每小时最多 ${limit} 次）`,
      retryAfterSec,
      limitPerHour: limit
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) }
    }
  );
}

/** 超限返回 429 Response，否则 null */
export async function enforceRateLimit(
  req: NextRequest,
  action: RateLimitAction,
  userId?: string | null
): Promise<NextResponse | null> {
  const limit = getRateLimitPerHour(action);
  if (limit <= 0) {
    return null;
  }

  const bucketKey = rateLimitBucketKey(req, userId);
  const result = await consumeRateLimit({ bucketKey, action, limit });
  if (result.ok) {
    return null;
  }
  return rateLimitResponse(result.retryAfterSec, result.limit, action);
}
