/**
 * POST /api/marketplace/components/[id]/install
 *
 * Increment the download counter for a component and return its full
 * file listing so the caller (codegen pipeline) can integrate it.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getComponent,
  incrementDownloads,
} from "@/lib/marketplace/component-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const component = await getComponent(params.id);
    if (!component) {
      return NextResponse.json({ error: "组件不存在或未审核" }, { status: 404 });
    }

    // Increment the download counter
    await incrementDownloads(params.id);

    return NextResponse.json({
      component: {
        id: component.id,
        name: component.name,
        version: component.version,
        industry: component.industry,
        type: component.type,
        description: component.description,
        tags: component.tags,
        files: component.files,
        previewImage: component.previewImage,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "下载组件失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
