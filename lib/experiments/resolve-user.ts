import { NextResponse } from "next/server";
import { isAuthEnabled } from "@/lib/auth-config";

/**
 * A/B 实验 assign/track：禁止伪造他人 user_id。
 * Auth 关闭时允许 body 中的 user_id（内部工具模式）。
 */
export function resolveExperimentUserId(
  sessionUserId: string | undefined,
  bodyUserId: string | undefined,
): { ok: true; userId: string } | { ok: false; response: NextResponse } {
  if (!isAuthEnabled()) {
    const userId = bodyUserId?.trim() || sessionUserId || "anonymous";
    return { ok: true, userId };
  }

  if (!sessionUserId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "未登录" }, { status: 401 }),
    };
  }

  if (bodyUserId && bodyUserId !== sessionUserId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "user_id 必须与当前登录用户一致" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, userId: sessionUserId };
}
