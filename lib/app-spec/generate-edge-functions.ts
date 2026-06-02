import { parseEntities, entityTableName, primaryKeyField, listTitleField, supabaseSelectColumns, type AppSpecEntity } from "./entity-scaffold";
import type { AppSpec } from "./types";

/**
 * 方向 A-3: Supabase Edge Functions 生成（Deno runtime）
 * 比 Express API 更适合 Serverless 部署
 */

function pascalCase(str: string): string {
  return str.split(/[_-]+/).filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}

function generateCrudHandler(entity: AppSpecEntity): string {
  const table = entityTableName(entity);
  const pk = primaryKeyField(entity);
  const titleField = listTitleField(entity);
  const select = supabaseSelectColumns(entity);
  const name = entity.name;

  return `// ${name} CRUD
serve(async (req) => {
  const { method, url } = req;
  const urlObj = new URL(url);
  const id = urlObj.pathname.split("/").pop();
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    if (method === "GET" && !id) {
      const search = urlObj.searchParams.get("search") || "";
      const limit = parseInt(urlObj.searchParams.get("limit") || "20");
      const offset = parseInt(urlObj.searchParams.get("offset") || "0");
      let query = client.from("${table}").select("${select}").order("created_at", { ascending: false }).range(offset, offset + limit - 1);
      if (search) query = query.ilike("${titleField}", \`%\${search}%\`);
      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { "Content-Type": "application/json" } });
    }
    if (method === "GET" && id) {
      const { data, error } = await client.from("${table}").select("${select}").eq("${pk}", id).maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { "Content-Type": "application/json" } });
    }
    if (method === "POST") {
      const body = await req.json();
      const { data, error } = await client.from("${table}").insert(body).select("${select}").single();
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { status: 201, headers: { "Content-Type": "application/json" } });
    }
    if (method === "PUT" && id) {
      const body = await req.json();
      const { data, error } = await client.from("${table}").update(body).eq("${pk}", id).select("${select}").single();
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { "Content-Type": "application/json" } });
    }
    if (method === "DELETE" && id) {
      const { error } = await client.from("${table}").delete().eq("${pk}", id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
`;
}

export function generateEdgeFunctions(spec: AppSpec): string[] {
  const entities = parseEntities(spec);
  if (!entities.length) return [];

  const shared = `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
`;

  return entities.map((e) => shared + generateCrudHandler(e));
}

export function generateEdgeFunctionIndex(spec: AppSpec): string {
  const entities = parseEntities(spec);
  return `# Supabase Edge Functions

## 部署

\`\`\`bash
supabase functions deploy ${entities.map((e) => entityTableName(e)).join(" ")}
\`\`\`

## 端点

${entities.map((e) => {
  const t = entityTableName(e);
  return `| \`${t}\` | \`https://<project>.supabase.co/functions/v1/${t}\` | GET/POST/PUT/DELETE |`;
}).join("\n")}
`;
}
