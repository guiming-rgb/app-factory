/**
 * Q3: 安全审计日志端点
 *
 * POST /api/security/audit-log
 *
 * 接收来自生成应用的审计事件，验证 HMAC 签名并写入
 * security_audit_log 表。
 *
 * 安全设计:
 * - HMAC-SHA256 签名验证（共享密钥）
 * - 内存级别速率限制（每 IP 每分钟 10 次）
 * - 仅接受已知事件类型白名单
 * - 超长 payload 自动截断
 */

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import { apiRateLimiter } from "@/lib/security/rate-limiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── 常量 ──────────────────────────────────────────────

const MAX_BODY_BYTES = 64 * 1024; // 64 KB max payload

const ALLOWED_EVENT_TYPES = new Set([
  "login",
  "login_failed",
  "logout",
  "signup",
  "password_change",
  "password_reset",
  "email_change",
  "data_access",
  "data_export",
  "data_deletion",
  "api_access",
  "api_key_created",
  "api_key_revoked",
  "permission_change",
  "role_change",
  "account_deleted",
  "session_expired",
  "rate_limit_exceeded",
  "csp_violation",
  "suspicious_activity",
  "privacy_consent",
  "privacy_consent_withdrawn",
]);

const ALLOWED_SEVERITIES = new Set(["low", "medium", "high", "critical"]);

// ── 类型 ──────────────────────────────────────────────

interface AuditEvent {
  app_id: string;
  event_type: string;
  severity: string;
  details?: Record<string, unknown>;
  ip?: string;
  timestamp?: string;
}

interface SignedAuditEvent extends AuditEvent {
  signature: string;
  timestamp: string;
}

// ── 帮助函数 ──────────────────────────────────────────

/**
 * 验证 HMAC-SHA256 签名。
 * 使用 timingSafeEqual 防止时序攻击。
 */
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSig = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const receivedBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");

    if (receivedBuf.length !== expectedBuf.length) return false;

    return timingSafeEqual(receivedBuf, expectedBuf);
  } catch {
    return false;
  }
}

/**
 * 从客户端 IP 构造限流 key。
 * X-Forwarded-For 可能包含逗号分隔的列表，取第一个真实 IP。
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }
  return request.headers.get("x-real-ip") || "127.0.0.1";
}

/**
 * 验证审计事件负载
 */
function validateEvent(body: unknown): body is SignedAuditEvent {
  if (!body || typeof body !== "object") return false;

  const event = body as Record<string, unknown>;

  if (typeof event.app_id !== "string" || event.app_id.length === 0) return false;
  if (typeof event.event_type !== "string" || !ALLOWED_EVENT_TYPES.has(event.event_type)) return false;
  if (typeof event.severity !== "string" || !ALLOWED_SEVERITIES.has(event.severity)) return false;
  if (typeof event.signature !== "string" || event.signature.length === 0) return false;
  if (typeof event.timestamp !== "string" || isNaN(Date.parse(event.timestamp))) return false;

  // details 可选，但必须是对象
  if (event.details !== undefined && (typeof event.details !== "object" || event.details === null)) {
    return false;
  }

  return true;
}

// ── 端点 ──────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // ── 速率限制 ──
    const clientIp = getClientIp(request);
    const rateCheck = apiRateLimiter.check(`audit-log:${clientIp}`);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "too many requests",
          retryAfter: Math.ceil((rateCheck.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // ── 读取请求体（带大小限制）──
    const contentLength = parseInt(
      request.headers.get("content-length") || "0",
      10
    );
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "payload too large" },
        { status: 413 }
      );
    }

    const rawBody = await request.text();
    let body: unknown;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "invalid JSON" },
        { status: 400 }
      );
    }

    // ── 验证签名 ──
    const sharedSecret = process.env.SECURITY_AUDIT_SECRET?.trim();
    if (!sharedSecret) {
      console.error("[audit-log] SECURITY_AUDIT_SECRET 未配置");
      return NextResponse.json(
        { error: "server configuration error" },
        { status: 500 }
      );
    }

    if (!validateEvent(body)) {
      return NextResponse.json(
        {
          error: "invalid event",
          hint: "app_id, event_type (见白名单), severity (low|medium|high|critical), signature, timestamp 为必填",
        },
        { status: 400 }
      );
    }

    const event = body as SignedAuditEvent;

    // 构建签名验证字符串 (app_id + event_type + severity + timestamp)
    const sigPayload = [
      event.app_id,
      event.event_type,
      event.severity,
      event.timestamp,
    ].join(":");

    if (!verifySignature(sigPayload, event.signature, sharedSecret)) {
      // 记录未授权尝试
      console.warn(
        `[audit-log] 签名验证失败: app_id=${event.app_id} event=${event.event_type} ip=${clientIp}`
      );
      return NextResponse.json(
        { error: "invalid signature" },
        { status: 401 }
      );
    }

    // ── 写入数据库 ──
    const supabase = getSupabaseAdmin();

    // 截断 details 超长字段
    let details = event.details ?? null;
    if (details) {
      const raw = JSON.stringify(details);
      if (raw.length > 10000) {
        details = { ...details, _truncated: true };
      }
    }

    const { error: insertError } = await supabase
      .from("security_audit_log")
      .insert({
        app_id: event.app_id,
        event_type: event.event_type,
        severity: event.severity,
        details: details,
        ip: event.ip || clientIp,
      });

    if (insertError) {
      console.error("[audit-log] 插入失败:", insertError.message);
      return NextResponse.json(
        { error: "storage error" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { received: true },
      {
        status: 200,
        headers: {
          "X-RateLimit-Remaining": String(rateCheck.remaining),
          "X-RateLimit-Reset": String(rateCheck.resetTime),
        },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[audit-log] 处理异常:", msg);
    return NextResponse.json(
      { error: "internal error" },
      { status: 500 }
    );
  }
}

/**
 * GET: 健康检查
 */
export async function GET() {
  const secretConfigured = !!process.env.SECURITY_AUDIT_SECRET?.trim();
  return NextResponse.json({
    ok: true,
    service: "security-audit-log",
    secretConfigured,
    timestamp: new Date().toISOString(),
  });
}
