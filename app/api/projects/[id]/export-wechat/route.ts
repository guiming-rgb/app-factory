import { NextRequest, NextResponse } from "next/server";

import { buildMinimalSpecFromProject } from "@/lib/app-spec/from-project";
import { validateAppSpec } from "@/lib/app-spec/validate";
import { generateWechatZip } from "@/lib/wechat-codegen/generate";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function safeZipBaseName(name: string) {
  return name
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const { data: project, error } = await getSupabaseAdmin()
      .from("projects")
      .select("id, title, idea, status")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const spec = buildMinimalSpecFromProject({
      id: project.id,
      title: project.title ?? "未命名",
      idea: project.idea
    });

    const { buffer, fileName, displayName } = await generateWechatZip(spec);
    const encoded = encodeURIComponent(fileName);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeZipBaseName(fileName)}"; filename*=UTF-8''${encoded}`,
        "X-App-Display-Name": encodeURIComponent(displayName)
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "微信小程序导出失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const { data: project, error } = await getSupabaseAdmin()
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as { spec?: unknown };
    if (!body.spec) {
      return NextResponse.json(
        { error: "请在 body.spec 中提供 App Spec JSON" },
        { status: 400 }
      );
    }

    const validation = validateAppSpec(body.spec);
    if (!validation.ok) {
      return NextResponse.json(
        { error: "App Spec 校验失败", details: validation.errors },
        { status: 400 }
      );
    }

    const spec = {
      ...validation.spec,
      sourceProjectId: validation.spec.sourceProjectId ?? projectId
    };

    const { buffer, fileName } = await generateWechatZip(spec);
    const encoded = encodeURIComponent(fileName);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeZipBaseName(fileName)}"; filename*=UTF-8''${encoded}`
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "微信小程序导出失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
