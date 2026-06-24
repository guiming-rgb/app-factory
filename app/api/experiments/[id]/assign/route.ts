import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import { assignUser } from "@/lib/experiments/ab-testing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/experiments/[id]/assign
 *
 * 为用户分配实验变体。
 * Body: { user_id: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getApiUser();
    if (isAuthEnabled() && !user) {
      return unauthorizedResponse();
    }

    const body: { user_id?: string } = await request.json();
    if (!body.user_id || typeof body.user_id !== "string") {
      return NextResponse.json({ error: "user_id 不能为空" }, { status: 400 });
    }

    const variant = await assignUser(params.id, body.user_id);
    return NextResponse.json({ variant });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "分配变体失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
