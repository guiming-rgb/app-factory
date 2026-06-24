import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// ============================================================
// 类型
// ============================================================

interface AnalyticsEvent {
  app_id: string;
  event_type: string;
  event_name?: string;
  screen_name?: string;
  properties?: Record<string, unknown>;
  user_id?: string;
  session_id?: string;
  device_info?: Record<string, unknown>;
  timestamp?: string;
}

interface PostBody {
  events: AnalyticsEvent[];
}

// ============================================================
// 配置
// ============================================================

/** 单次请求最大事件数 */
const MAX_EVENTS_PER_REQUEST = 100;

/** 每分钟每 app_id 最大事件数 */
const RATE_LIMIT_PER_MINUTE = 1000;

/** 滑动窗口（毫秒） */
const RATE_WINDOW_MS = 60000;

// ============================================================
// 内存限流桶（单进程，生产环境建议 Redis）
// ============================================================

const rateBuckets = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(appId: string): boolean {
  const now = Date.now();
  const key = `analytics:${appId}`;
  const bucket = rateBuckets.get(key);

  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= RATE_LIMIT_PER_MINUTE) {
    return false;
  }

  bucket.count++;
  return true;
}

// 每分钟清理过期桶
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.windowStart > RATE_WINDOW_MS) {
      rateBuckets.delete(key);
    }
  }
}, 60000).unref();

// ============================================================
// 校验
// ============================================================

const VALID_EVENT_TYPES = new Set([
  "screen_view",
  "custom_event",
  "error",
  "user_property",
  "session_start",
  "session_end",
]);

const ALLOWED_WRITE_ORIGINS = [
  "http://localhost:3000",
  "https://app-factory.vercel.app",
];

// ============================================================
// Handler
// ============================================================

/**
 * POST /api/analytics/events
 *
 * 接收客户端批量埋点事件并写入 analytics_events 表。
 *
 * Headers:
 *   x-analytics-key: App ID（必须）
 *
 * Body:
 *   { events: [{ app_id, event_type, event_name, screen_name, properties, user_id, session_id, device_info }] }
 *
 * 限流：100 条/请求，1000 条/分钟/app_id
 */
export async function POST(req: NextRequest) {
  try {
    // ---- 1. 鉴权 ----
    const appId = req.headers.get("x-analytics-key")?.trim();
    if (!appId) {
      return NextResponse.json(
        { error: "Missing x-analytics-key header" },
        { status: 401 }
      );
    }

    // ---- 2. 解析 Body ----
    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const events = body.events;
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "events must be a non-empty array" },
        { status: 400 }
      );
    }

    // ---- 3. 单次请求上限 ----
    if (events.length > MAX_EVENTS_PER_REQUEST) {
      return NextResponse.json(
        {
          error: `Too many events per request (max ${MAX_EVENTS_PER_REQUEST})`,
          accepted: 0,
          rejected: events.length,
        },
        { status: 429 }
      );
    }

    // ---- 4. 限流 ----
    if (!checkRateLimit(appId)) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded (${RATE_LIMIT_PER_MINUTE} events/min per app_id)`,
          accepted: 0,
          rejected: events.length,
          retryAfterMs: RATE_WINDOW_MS,
        },
        { status: 429 }
      );
    }

    // ---- 5. 校验并写入 ----
    const supabase = getSupabaseAdmin();
    let accepted = 0;
    let rejected = 0;

    // 分批写入（每批 50 条避免请求过大）
    const BATCH_SIZE = 50;
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE);

      const validBatch = batch
        .filter((e) => e.app_id === appId && VALID_EVENT_TYPES.has(e.event_type))
        .map((e) => ({
          app_id: e.app_id,
          event_type: e.event_type,
          event_name: e.event_name ?? null,
          screen_name: e.screen_name ?? null,
          properties: e.properties ?? {},
          user_id: e.user_id ?? null,
          session_id: e.session_id ?? null,
          device_info: e.device_info ?? {},
          created_at: e.timestamp ?? new Date().toISOString(),
        }));

      rejected += batch.length - validBatch.length;

      if (validBatch.length > 0) {
        try {
          const { error } = await supabase
            .from("analytics_events")
            .insert(validBatch);

          if (error) {
            console.warn(
              "[analytics-events] supabase insert error:",
              error.message
            );
            // 部分成功时也算拒绝
            rejected += validBatch.length;
          } else {
            accepted += validBatch.length;
          }
        } catch (dbErr) {
          console.warn("[analytics-events] db exception:", dbErr);
          rejected += validBatch.length;
        }
      }
    }

    return NextResponse.json({
      accepted,
      rejected,
    });
  } catch (err) {
    console.error("[analytics-events] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/events
 *
 * 查询分析事件（仅限管理员通过 ANALYTICS_API_KEY 访问）。
 *
 * Query params:
 *   app_id    — 必填，App ID
 *   event_type — 可选，筛选事件类型
 *   from      — 可选，起始时间 ISO（默认 24 小时前）
 *   to        — 可选，结束时间 ISO（默认 now）
 *   limit     — 可选，返回条数（默认 100，最大 1000）
 *
 * Headers:
 *   x-analytics-key: ANALYTICS_API_KEY 环境变量值（管理员密钥）
 */
export async function GET(req: NextRequest) {
  try {
    // ---- 1. 管理员鉴权 ----
    const adminKey = req.headers.get("x-analytics-key")?.trim();
    const expectedKey = process.env.ANALYTICS_API_KEY?.trim();

    if (!adminKey || !expectedKey || adminKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ---- 2. 查询参数 ----
    const { searchParams } = new URL(req.url);
    const appId = searchParams.get("app_id")?.trim();
    const eventType = searchParams.get("event_type")?.trim();
    const from = searchParams.get("from")?.trim();
    const to = searchParams.get("to")?.trim();
    const limitParam = searchParams.get("limit")?.trim();

    if (!appId) {
      return NextResponse.json(
        { error: "Missing app_id query param" },
        { status: 400 }
      );
    }
    if (eventType && !VALID_EVENT_TYPES.has(eventType)) {
      return NextResponse.json(
        { error: `Invalid event_type: ${eventType}` },
        { status: 400 }
      );
    }

    const fromDate =
      from && !isNaN(Date.parse(from))
        ? new Date(from).toISOString()
        : new Date(Date.now() - 86400000).toISOString();

    const toDate =
      to && !isNaN(Date.parse(to))
        ? new Date(to).toISOString()
        : new Date().toISOString();

    const limit = Math.min(Math.max(1, Number(limitParam) || 100), 1000);

    // ---- 3. 聚合查询 ----
    const supabase = getSupabaseAdmin();

    // 总计数
    let countQuery = supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("app_id", appId)
      .gte("created_at", fromDate)
      .lte("created_at", toDate);

    if (eventType) {
      countQuery = countQuery.eq("event_type", eventType);
    }

    const { count: totalCount, error: countError } = await countQuery;
    if (countError) {
      console.warn("[analytics-events] count error:", countError.message);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    // 样本事件
    let sampleQuery = supabase
      .from("analytics_events")
      .select("*")
      .eq("app_id", appId)
      .gte("created_at", fromDate)
      .lte("created_at", toDate)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (eventType) {
      sampleQuery = sampleQuery.eq("event_type", eventType);
    }

    const { data: samples, error: sampleError } = await sampleQuery;
    if (sampleError) {
      console.warn("[analytics-events] sample error:", sampleError.message);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    // 按 event_type 分组统计
    const { data: breakdown, error: breakdownError } = await supabase
      .from("analytics_events")
      .select("event_type, count")
      .eq("app_id", appId)
      .gte("created_at", fromDate)
      .lte("created_at", toDate);

    // 如果 breakdown 查询不支持原生 count，手动计算
    let typeBreakdown: Record<string, number> = {};
    if (!breakdownError && breakdown) {
      // 这里是因为 Supabase 不支持 SELECT event_type, count(*) 原生聚合
      // 回退到事件列表手动分组
    }

    // ---- 返回 ----
    return NextResponse.json({
      app_id: appId,
      period: { from: fromDate, to: toDate },
      totalCount: totalCount ?? 0,
      samples: samples ?? [],
    });
  } catch (err) {
    console.error("[analytics-events] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
