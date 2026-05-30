import { NextRequest, NextResponse } from "next/server";

import { buildSpecForProject } from "@/lib/app-spec/from-report";
import { fetchProjectWithAccess } from "@/lib/auth/require-project-access";
import { tryReadLatestCompletedArtifact } from "@/lib/codegen/latest-artifact";
import { generateHarmonyZip } from "@/lib/harmony-codegen/generate";

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
      target: "harmony"
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

    const { buffer, fileName, displayName } = await generateHarmonyZip(
      built.spec
    );
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
    const message = err instanceof Error ? err.message : "鸿蒙导出失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
