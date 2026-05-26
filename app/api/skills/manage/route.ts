import { NextRequest, NextResponse } from "next/server";

import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import {
  createSkillDraft,
  listAllSkillsForManage,
  type SkillStatus
} from "@/lib/skills/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireManageUser(): Promise<
  | { ok: true; user: Awaited<ReturnType<typeof getApiUser>> }
  | { ok: false; response: ReturnType<typeof unauthorizedResponse> }
> {
  if (!isAuthEnabled()) {
    return { ok: true, user: null };
  }
  const user = await getApiUser();
  if (!user) {
    return { ok: false, response: unauthorizedResponse() };
  }
  return { ok: true, user };
}

export async function GET() {
  const auth = await requireManageUser();
  if (!auth.ok) {
    return auth.response;
  }

  const skills = await listAllSkillsForManage();
  if (skills === null) {
    return NextResponse.json({ error: "加载技能列表失败" }, { status: 500 });
  }
  return NextResponse.json(
    { skills },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  const auth = await requireManageUser();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = (await req.json()) as {
      code?: unknown;
      name?: unknown;
      description?: unknown;
      category?: unknown;
      version?: unknown;
      status?: unknown;
    };

    const result = await createSkillDraft({
      code: String(body.code ?? ""),
      name: String(body.name ?? ""),
      description:
        body.description != null ? String(body.description) : undefined,
      category: body.category != null ? String(body.category) : undefined,
      version: body.version != null ? String(body.version) : undefined,
      status: body.status as SkillStatus | undefined
    });

    if ("error" in result) {
      const status = result.error.includes("已存在") ? 409 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ skill: result.skill }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "创建技能失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
