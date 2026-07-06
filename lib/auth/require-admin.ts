import { NextResponse } from "next/server";
import { getApiUser, unauthorizedResponse } from "./api-user";
import { isAuthEnabled } from "@/lib/auth-config";

export type AdminAuthResult =
  | { ok: false; response: NextResponse }
  | { ok: true; user: { id: string; email?: string } | null };

/**
 * 统一管理员鉴权：ADMIN_USER_IDS 未配置或为空时默认拒绝（deny-by-default）。
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const user = await getApiUser();

  if (isAuthEnabled() && !user) {
    return { ok: false, response: unauthorizedResponse() };
  }

  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (adminIds.length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "管理员未配置（ADMIN_USER_IDS 为空）" },
        { status: 403 },
      ),
    };
  }

  if (!user || !adminIds.includes(user.id)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "无管理员权限" }, { status: 403 }),
    };
  }

  return { ok: true, user: { id: user.id, email: user.email } };
}
