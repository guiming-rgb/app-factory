import { NextResponse } from "next/server";

import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import { listPublishedSkills } from "@/lib/skills/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (isAuthEnabled()) {
    const user = await getApiUser();
    if (!user) {
      return unauthorizedResponse();
    }
  }

  const skills = await listPublishedSkills();
  if (skills === null) {
    return NextResponse.json({ error: "加载技能列表失败" }, { status: 500 });
  }
  return NextResponse.json({ skills });
}
