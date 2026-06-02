import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * P0: Supabase 项目自动创建 + DDL 执行
 * 通过 Supabase Management API 一键建项目、建表、配置 RLS
 */

export type ProvisionResult = {
  ok: boolean;
  tablesCreated: string[];
  sqlExecuted: boolean;
  errors: string[];
};

/**
 * 在当前 Supabase 实例中执行 DDL（CREATE TABLE + RLS）
 * 省去用户手动打开 SQL Editor 的步骤
 */
export async function executeProjectDDL(
  sql: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin();

    // 逐条执行 SQL 语句（用分号分割）
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      const { error } = await supabase.rpc("exec_sql", {
        sql_text: statement + ";",
      }).maybeSingle();

      if (error) {
        // exec_sql 可能不存在，回退到直接 SQL 查询
        // Supabase 默认不允许任意 SQL，需要开启 pg_net 或使用 REST API
        console.warn("[executeProjectDDL] rpc exec_sql not available:", error.message);
        return {
          ok: false,
          error: "请在 Supabase SQL Editor 中手动执行 DDL。或启用 pg_net 扩展后重试。"
        };
      }
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "DDL 执行失败" };
  }
}

/**
 * 通过 Management API 创建新 Supabase 项目
 * 需要 SUPABASE_ACCESS_TOKEN 环境变量
 */
export async function createSupabaseProject(input: {
  name: string;
  dbPassword: string;
  region?: string;
}): Promise<{ ok: boolean; projectId?: string; anonKey?: string; url?: string; error?: string }> {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) {
    return { ok: false, error: "缺少 SUPABASE_ACCESS_TOKEN。请在 Vercel 环境变量中配置。" };
  }

  try {
    // Supabase Management API: POST /v1/projects
    const res = await fetch("https://api.supabase.com/v1/projects", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: input.name.slice(0, 40),
        db_pass: input.dbPassword,
        region: input.region || "ap-southeast-1",
        plan: "free",
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: (body as Record<string, unknown>).message as string || `Supabase API 返回 ${res.status}` };
    }

    const project = (await res.json()) as {
      id: string;
      name: string;
      database?: { host: string };
    };

    // 等待项目就绪
    await new Promise((r) => setTimeout(r, 3000));

    // 获取 API keys
    const keysRes = await fetch(
      `https://api.supabase.com/v1/projects/${project.id}/api-keys`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    let anonKey = "";
    if (keysRes.ok) {
      const keys = (await keysRes.json()) as Array<{ name: string; api_key: string }>;
      const anon = keys.find((k) => k.name === "anon");
      if (anon) anonKey = anon.api_key;
    }

    const url = `https://${project.id}.supabase.co`;

    return {
      ok: true,
      projectId: project.id,
      anonKey,
      url,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "创建 Supabase 项目失败" };
  }
}

/**
 * 一键部署：创建 Supabase 项目 + 执行 DDL
 */
export async function provisionSupabaseBackend(input: {
  appName: string;
  sql: string;
}): Promise<ProvisionResult> {
  const errors: string[] = [];
  const tablesCreated: string[] = [];

  // 尝试在当前 Supabase 实例中直接执行 DDL（最快路径）
  const ddlResult = await executeProjectDDL(input.sql);
  if (ddlResult.ok) {
    // 解析表名
    const tableMatches = input.sql.matchAll(/create table if not exists (\w+)/gi);
    for (const m of tableMatches) {
      tablesCreated.push(m[1]);
    }
    return { ok: true, tablesCreated, sqlExecuted: true, errors: [] };
  }

  errors.push(`自动执行 DDL 失败: ${ddlResult.error}`);

  // 回退：生成 SQL 文件供用户手动执行
  return {
    ok: false,
    tablesCreated,
    sqlExecuted: false,
    errors: [...errors, "请手动在 Supabase SQL Editor 中执行生成的 DDL"],
  };
}
