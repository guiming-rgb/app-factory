import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// ============================================================
// 类型
// ============================================================

interface DailyActiveUser {
  date: string;
  count: number;
}

interface TopItem {
  name: string;
  count: number;
}

interface DashboardResponse {
  app_id: string;
  period: string;
  totalScreens: number;
  totalEvents: number;
  activeUsers: number;
  dailyActiveUsers: DailyActiveUser[];
  topScreens: TopItem[];
  topEvents: TopItem[];
  errorRate: number;
  retentionEstimate: number;
}

// ============================================================
// 有效周期
// ============================================================

const VALID_PERIODS = new Set(["7d", "30d", "90d"]);

function periodToDays(period: string): number {
  switch (period) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    default:
      return 30;
  }
}

// ============================================================
// Handler
// ============================================================

/**
 * GET /api/analytics/dashboard
 *
 * 返回 App 分析面板汇总数据。
 *
 * Query params:
 *   app_id — 必填，App ID
 *   period — 可选，统计周期（7d | 30d | 90d，默认 30d）
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
    const period = searchParams.get("period")?.trim() || "30d";

    if (!appId) {
      return NextResponse.json(
        { error: "Missing app_id query param" },
        { status: 400 }
      );
    }

    if (!VALID_PERIODS.has(period)) {
      return NextResponse.json(
        { error: `Invalid period: ${period}. Use 7d, 30d, or 90d.` },
        { status: 400 }
      );
    }

    const days = periodToDays(period);
    const fromDate = new Date(
      Date.now() - days * 86400000
    ).toISOString();
    const toDate = new Date().toISOString();

    const supabase = getSupabaseAdmin();

    // ---- 3. 并行聚合 ----

    const [
      totalScreensResult,
      totalEventsResult,
      activeUsersResult,
      dailyActiveUsersResult,
      topScreensResult,
      topEventsResult,
      errorEventsResult,
      sessionUsersResult,
    ] = await Promise.allSettled([
      // 3a. 总屏幕数（distinct screen_name）
      supabase
        .from("analytics_events")
        .select("screen_name")
        .eq("app_id", appId)
        .eq("event_type", "screen_view")
        .gte("created_at", fromDate)
        .lte("created_at", toDate),

      // 3b. 总事件数
      supabase
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .eq("app_id", appId)
        .gte("created_at", fromDate)
        .lte("created_at", toDate),

      // 3c. 活跃用户数（distinct user_id）
      supabase
        .from("analytics_events")
        .select("user_id")
        .eq("app_id", appId)
        .not("user_id", "is", null)
        .gte("created_at", fromDate)
        .lte("created_at", toDate),

      // 3d. 每日活跃用户
      supabase
        .from("analytics_events")
        .select("user_id, created_at")
        .eq("app_id", appId)
        .not("user_id", "is", null)
        .gte("created_at", fromDate)
        .lte("created_at", toDate),

      // 3e. Top 10 页面
      supabase
        .from("analytics_events")
        .select("screen_name")
        .eq("app_id", appId)
        .eq("event_type", "screen_view")
        .gte("created_at", fromDate)
        .lte("created_at", toDate),

      // 3f. Top 10 自定义事件
      supabase
        .from("analytics_events")
        .select("event_name")
        .eq("app_id", appId)
        .eq("event_type", "custom_event")
        .gte("created_at", fromDate)
        .lte("created_at", toDate),

      // 3g. 错误事件数
      supabase
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .eq("app_id", appId)
        .eq("event_type", "error")
        .gte("created_at", fromDate)
        .lte("created_at", toDate),

      // 3h. 会话用户（有 session_start 事件的 user_id）
      supabase
        .from("analytics_events")
        .select("user_id")
        .eq("app_id", appId)
        .eq("event_type", "session_start")
        .not("user_id", "is", null)
        .gte("created_at", fromDate)
        .lte("created_at", toDate),
    ]);

    // ---- 4. 解析结果 ----

    // 4a. 屏幕名称去重
    const screenNames = new Set<string>();
    if (
      totalScreensResult.status === "fulfilled" &&
      totalScreensResult.value.data
    ) {
      for (const row of totalScreensResult.value.data as Array<{
        screen_name: string | null;
      }>) {
        if (row.screen_name) screenNames.add(row.screen_name);
      }
    }
    const totalScreens = screenNames.size;

    // 4b. 总事件数
    const totalEvents =
      totalEventsResult.status === "fulfilled"
        ? totalEventsResult.value.count ?? 0
        : 0;

    // 4c. 活跃用户数（user_id 去重）
    const userIds = new Set<string>();
    if (
      activeUsersResult.status === "fulfilled" &&
      activeUsersResult.value.data
    ) {
      for (const row of activeUsersResult.value.data as Array<{
        user_id: string | null;
      }>) {
        if (row.user_id) userIds.add(row.user_id);
      }
    }
    const activeUsers = userIds.size;

    // 4d. 每日活跃用户
    const dailyMap = new Map<string, Set<string>>();
    if (
      dailyActiveUsersResult.status === "fulfilled" &&
      dailyActiveUsersResult.value.data
    ) {
      for (const row of dailyActiveUsersResult.value.data as Array<{
        user_id: string | null;
        created_at: string;
      }>) {
        if (!row.user_id) continue;
        const date = row.created_at.slice(0, 10); // YYYY-MM-DD
        if (!dailyMap.has(date)) dailyMap.set(date, new Set());
        dailyMap.get(date)!.add(row.user_id);
      }
    }
    const dailyActiveUsers: DailyActiveUser[] = [];
    for (const [date, users] of dailyMap) {
      dailyActiveUsers.push({ date, count: users.size });
    }
    dailyActiveUsers.sort((a, b) => a.date.localeCompare(b.date));

    // 4e. Top 10 页面
    const screenCount = new Map<string, number>();
    if (
      topScreensResult.status === "fulfilled" &&
      topScreensResult.value.data
    ) {
      for (const row of topScreensResult.value.data as Array<{
        screen_name: string | null;
      }>) {
        const name = row.screen_name || "unknown";
        screenCount.set(name, (screenCount.get(name) ?? 0) + 1);
      }
    }
    const topScreens: TopItem[] = [...screenCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // 4f. Top 10 自定义事件
    const eventCount = new Map<string, number>();
    if (
      topEventsResult.status === "fulfilled" &&
      topEventsResult.value.data
    ) {
      for (const row of topEventsResult.value.data as Array<{
        event_name: string | null;
      }>) {
        const name = row.event_name || "unknown";
        eventCount.set(name, (eventCount.get(name) ?? 0) + 1);
      }
    }
    const topEvents: TopItem[] = [...eventCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // 4g. 错误率
    const errorCount =
      errorEventsResult.status === "fulfilled"
        ? errorEventsResult.value.count ?? 0
        : 0;
    const errorRate = totalEvents > 0 ? errorCount / totalEvents : 0;

    // 4h. 留存估算
    let retentionEstimate = 0;
    if (
      sessionUsersResult.status === "fulfilled" &&
      sessionUsersResult.value.data
    ) {
      const sessionUsers = new Set<string>();
      for (const row of sessionUsersResult.value.data as Array<{
        user_id: string | null;
      }>) {
        if (row.user_id) sessionUsers.add(row.user_id);
      }
      // 留存估算 = 有会话的用户 / 总活跃用户
      const sessionUserCount = sessionUsers.size;
      retentionEstimate =
        activeUsers > 0 ? sessionUserCount / activeUsers : 0;
    }

    // ---- 5. 返回 ----
    const response: DashboardResponse = {
      app_id: appId,
      period,
      totalScreens,
      totalEvents,
      activeUsers,
      dailyActiveUsers,
      topScreens,
      topEvents,
      errorRate: Math.round(errorRate * 10000) / 10000, // 4 位小数
      retentionEstimate: Math.round(retentionEstimate * 10000) / 10000,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[analytics-dashboard] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
