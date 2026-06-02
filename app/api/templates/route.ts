import { NextRequest, NextResponse } from "next/server";
import { TEMPLATE_LIBRARY, getTemplateById } from "@/lib/app-spec/template-library";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/** GET: 列出所有模板 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const t = getTemplateById(id);
    if (!t) return NextResponse.json({ error: "模板不存在" }, { status: 404 });
    return NextResponse.json(t);
  }
  return NextResponse.json({ templates: TEMPLATE_LIBRARY.map(({ id, name, description, category, icon }) => ({ id, name, description, category, icon })) });
}

/** POST: 从模板创建项目 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const templateId = body.templateId as string;
    const template = getTemplateById(templateId);
    if (!template) return NextResponse.json({ error: "模板不存在" }, { status: 404 });

    const title = body.title || template.name;
    const { data, error } = await getSupabaseAdmin().from("projects").insert({
      title,
      idea: template.description,
      spec_override: template.spec,
      status: "completed",
    }).select("id, title").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, project: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
