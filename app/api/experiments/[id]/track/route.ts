import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import { trackExperimentEvent } from "@/lib/experiments/ab-testing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/experiments/[id]/track
 *
 * 记录转化事件。
 * Body: { user_id: string, event_name: string, properties?: Record<string, unknown> }
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

    const body: {
      user_id?: string;
      event_name?: string;
      properties?: Record<string, unknown>;
    } = await request.json();

    if (!body.user_id || typeof body.user_id !== "string") {
      return NextResponse.json({ error: "user_id 不能为空" }, { status: 400 });
    }
    if (!body.event_name || typeof body.event_name !== "string") {
      return NextResponse.json({ error: "event_name 不能为空" }, { status: 400 });
    }

    await trackExperimentEvent(params.id, body.user_id, body.event_name, body.properties);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "记录事件失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
