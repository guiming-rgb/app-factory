import { NextRequest, NextResponse } from "next/server";
import {
  getApiUser,
  unauthorizedResponse
} from "@/lib/auth/api-user";
import { isAuthEnabled } from "@/lib/auth-config";
import { getSupabaseForUserRequest } from "@/lib/supabase/request-client";
import { detectPromptInjection, sanitizeSpecInput } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const LIST_LIMIT = 50;

export async function GET() {
  try {
    const user = await getApiUser();
    if (isAuthEnabled() && !user) {
      return unauthorizedResponse();
    }

    const supabase = await getSupabaseForUserRequest();

    let query = supabase
      .from("projects")
      .select("id, title, status, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);

    // Auth 启用时仅返回当前用户的项目
    if (isAuthEnabled() && user) {
      query = query.eq("owner_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/projects]", error.message);
      return NextResponse.json({ error: "获取项目列表失败，请稍后重试" }, { status: 500 });
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

    // ✅ 提示注入检测 — 拒绝试图操控 LLM 系统提示词的输入
    const injectionCheck = detectPromptInjection(idea);
    if (!injectionCheck.safe) {
      return NextResponse.json(
        { error: `输入包含不安全内容：${injectionCheck.risk}` },
        { status: 400 }
      );
    }

    // ✅ 输入清洗 — 移除控制字符/HTML 标签，截断超长 UTF-8
    const sanitizedIdea = sanitizeSpecInput(idea);
    if (sanitizedIdea.length < 10) {
      return NextResponse.json(
        { error: "清洗后的描述不足 10 个有效字符，请提供更具体的 App 想法" },
        { status: 400 }
      );
    }

    const title = buildProjectTitle(sanitizedIdea);

    const user = await getApiUser();
    if (isAuthEnabled() && !user) {
      return unauthorizedResponse();
    }

    // ✅ 原子配额检查（check + increment 在 DB 层单次事务内完成）
    if (user) {
      const { tryConsumeQuota } = await import("@/lib/auth/quota");
      const quotaResult = await tryConsumeQuota(user.id, "project");
      if (!quotaResult.ok) return NextResponse.json({ error: quotaResult.message }, { status: 403 });
    }

    const insert: {
      title: string;
      idea: string;
      status: string;
      owner_id?: string;
    } = {
      title,
      idea: sanitizedIdea,
      status: "pending"
    };
    if (user) {
      insert.owner_id = user.id;
    }

    const supabase = await getSupabaseForUserRequest();

    const { data, error } = await supabase
      .from("projects")
      .insert(insert)
      .select("*")
      .single();

    if (error) {
      console.error("[POST /api/projects]", error.message);
      return NextResponse.json({ error: "创建项目失败，请稍后重试" }, { status: 500 });
    }

    return NextResponse.json({ project: data });
  } catch (error: unknown) {
    console.error("[POST /api/projects]", error);
    return NextResponse.json({ error: "创建项目失败，请稍后重试" }, { status: 500 });
  }
}
