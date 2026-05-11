import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const LIST_LIMIT = 50;

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("id, title, status, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ projects: data ?? [] });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "获取项目列表失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildProjectTitle(idea: string) {
  const clean = idea.replace(/\s+/g, " ").trim();
  if (clean.length <= 24) return clean;
  return clean.slice(0, 24) + "...";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idea = String(body.idea || "").trim();

    if (!idea) {
      return NextResponse.json(
        { error: "App 想法不能为空" },
        { status: 400 }
      );
    }

    if (idea.length < 10) {
      return NextResponse.json(
        { error: "请更具体地描述你的 App 想法，至少 10 个字" },
        { status: 400 }
      );
    }

    if (idea.length > 5000) {
      return NextResponse.json(
        { error: "App 想法太长，请控制在 5000 字以内" },
        { status: 400 }
      );
    }

    const title = buildProjectTitle(idea);

    const { data, error } = await supabaseAdmin
      .from("projects")
      .insert({
        title,
        idea,
        status: "pending"
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project: data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "创建项目失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
