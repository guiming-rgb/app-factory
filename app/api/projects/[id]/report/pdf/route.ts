import { NextRequest, NextResponse } from "next/server";
import { generateReportPdf } from "@/lib/pdf-report";
import { fetchProjectWithAccess } from "@/lib/auth/require-project-access";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const access = await fetchProjectWithAccess(params.id, "id");
    if (!access.ok) return access.response;

    const { html } = await generateReportPdf(params.id);

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
