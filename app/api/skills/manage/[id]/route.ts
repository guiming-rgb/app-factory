import { NextRequest, NextResponse } from "next/server";

import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import {
  publishSkill,
  updateSkillForManage,
  type SkillStatus
} from "@/lib/skills/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireManageUser(): Promise<
  | { ok: true }
  | { ok: false; response: ReturnType<typeof unauthorizedResponse> }
> {
  if (!isAuthEnabled()) {
    return { ok: true };
  }
  const user = await getApiUser();
  if (!user) {
    return { ok: false, response: unauthorizedResponse() };
  }
  return { ok: true };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireManageUser();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = (await req.json()) as {
      name?: unknown;
      description?: unknown;
      category?: unknown;
      version?: unknown;
      status?: unknown;
      action?: unknown;
    };

    if (body.action === "publish") {
      const result = await publishSkill(params.id);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ skill: result.skill });
    }

    const result = await updateSkillForManage(params.id, {
      name: body.name != null ? String(body.name) : undefined,
      description:
        body.description !== undefined
          ? body.description == null
            ? null
            : String(body.description)
          : undefined,
      category:
        body.category !== undefined
          ? body.category == null
            ? null
            : String(body.category)
          : undefined,
      version: body.version != null ? String(body.version) : undefined,
      status: body.status as SkillStatus | undefined
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ skill: result.skill });
  } catch (e) {
    const message = e instanceof Error ? e.message : "更新技能失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
