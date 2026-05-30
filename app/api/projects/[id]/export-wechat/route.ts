import { NextRequest, NextResponse } from "next/server";

import { buildSpecForProject } from "@/lib/app-spec/from-report";
import { validateAppSpec } from "@/lib/app-spec/validate";
import { fetchProjectWithAccess } from "@/lib/auth/require-project-access";
import { tryReadLatestCompletedArtifact } from "@/lib/codegen/latest-artifact";
import { generateWechatZip } from "@/lib/wechat-codegen/generate";

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
    const access = await fetchProjectWithAccess<{
      id: string;
      title: string;
      idea: string;
      final_report: string | null;
      status: string;
    }>(projectId, "id, title, idea, final_report, status");
    if (!access.ok) {
      return access.response;
    }
    const project = access.project;

    const cached = await tryReadLatestCompletedArtifact({
      projectId,
      target: "wechat",
      requireTodoMvp: true
    });
    if (cached) {
      const encoded = encodeURIComponent(cached.fileName);
      return new NextResponse(new Uint8Array(cached.buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${safeZipBaseName(cached.fileName)}"; filename*=UTF-8''${encoded}`,
          ...(cached.displayName
            ? {
                "X-App-Display-Name": encodeURIComponent(cached.displayName)
              }
            : {}),
          "X-App-Artifact-Cache": "hit"
        }
      });
    }

    const built = await buildSpecForProject({
      id: project.id,
      title: project.title ?? "未命名",
      idea: project.idea,
      final_report: project.final_report
    });

    const { buffer, fileName, displayName } = await generateWechatZip(
      built.spec
    );
    const encoded = encodeURIComponent(fileName);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeZipBaseName(fileName)}"; filename*=UTF-8''${encoded}`,
        "X-App-Display-Name": encodeURIComponent(displayName),
        "X-App-Artifact-Cache": "fresh"
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
    const access = await fetchProjectWithAccess<{ id: string }>(projectId, "id");
    if (!access.ok) {
      return access.response;
    }
    const project = access.project;

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
