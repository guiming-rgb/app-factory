import { NextRequest, NextResponse } from "next/server";

import { getApiUser, unauthorizedResponse } from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import { guardProjectAccess } from "@/lib/auth/require-project-access";
import {
  createProjectMemory,
  listProjectMemories,
  normalizeMemoryType,
  validateMemoryContent
} from "@/lib/memories/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = await guardProjectAccess(params.id);
  if (denied) {
    return denied;
  }

  const memories = await listProjectMemories(params.id);
  if (memories === null) {
    return NextResponse.json({ error: "加载记忆失败" }, { status: 500 });
  }
  return NextResponse.json({ memories });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;
  const denied = await guardProjectAccess(projectId);
  if (denied) {
    return denied;
  }

  const user = await getApiUser();
  if (isAuthEnabled() && !user) {
    return unauthorizedResponse();
  }

  try {
    const body = (await req.json()) as {
      content?: unknown;
      memory_type?: unknown;
      importance?: unknown;
    };
    const contentErr = validateMemoryContent(body.content);
    if (contentErr) {
      return NextResponse.json({ error: contentErr }, { status: 400 });
    }
    const content = String(body.content).trim();
    const memoryType = normalizeMemoryType(body.memory_type);

    const result = await createProjectMemory({
      projectId,
      userId: user?.id ?? null,
      content,
      memoryType,
      importance: Number(body.importance)
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ memory: result.memory });
  } catch (e) {
    const message = e instanceof Error ? e.message : "创建记忆失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
