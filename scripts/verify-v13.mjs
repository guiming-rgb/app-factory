/**
 * 一条命令检验 v1.3：不依赖详情页、不依赖 /usage 网页。
 * 用法：
 *   npm run verify:v13
 *   npm run verify:v13 -- 833ad678-f204-40d7-a47c-5b76e803f64f
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const EXPECTED_LLM_CALLS = 8;

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ 找不到 .env.local，请在 app-factory 目录下配置 Supabase。");
    process.exit(1);
  }
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("❌ .env.local 缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  let projectId = process.argv[2]?.trim();

  if (!projectId) {
    const { data, error } = await supabase
      .from("projects")
      .select("id, title, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("❌ 查 projects 失败：", error.message);
      if (/usage_logs|does not exist/i.test(error.message)) {
        console.error("   → 请在 Supabase 执行 sql/schema.sql");
      }
      process.exit(1);
    }
    if (!data?.length) {
      console.error("❌ 数据库里还没有任何项目，请先在网页上创建一个并生成完成。");
      process.exit(1);
    }
    projectId = data[0].id;
    console.log(`📌 未指定项目 ID，自动用最近更新的项目：`);
    console.log(`   标题：${data[0].title}`);
    console.log(`   状态：${data[0].status}`);
    console.log(`   ID：${projectId}\n`);
  }

  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select("id, title, status")
    .eq("id", projectId)
    .single();

  if (pErr || !project) {
    console.error("❌ 项目不存在：", projectId);
    process.exit(1);
  }

  const { count, error: uErr } = await supabase
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("event_type", "llm_call");

  if (uErr) {
    console.error("❌ 查 usage_logs 失败：", uErr.message);
    if (/usage_logs|does not exist/i.test(uErr.message)) {
      console.error("   → 请在 Supabase SQL Editor 执行：sql/migrations/20260519_usage_logs.sql");
    }
    process.exit(1);
  }

  const n = count ?? 0;
  const supabaseHost = new URL(url).hostname;

  console.log("──────── v1.3 检验结果 ────────");
  console.log(`Supabase：${supabaseHost}`);
  console.log(`项目：${project.title}`);
  console.log(`状态：${project.status}`);
  console.log(`usage_logs 行数（llm_call）：${n} / 期望 ${EXPECTED_LLM_CALLS}`);

  if (n >= EXPECTED_LLM_CALLS) {
    console.log("\n✅ v1.3 通过：数据库里已有用量记录。");
    console.log("   （不必在详情页找「v1.3」字样，以这个数字为准。）");
    process.exit(0);
  }

  console.log("\n❌ v1.3 未通过：用量行数不够。");
  if (project.status === "completed" && n === 0) {
    console.log("   常见原因：生成时网站还是旧版（没 npm run build）。");
    console.log("   处理：终端 A 执行 build + start -p 3001，详情页点一次「重新生成报告」。");
  } else if (project.status !== "completed") {
    console.log("   请先等项目生成完成（8/8），再运行本命令。");
  } else {
    console.log("   请对该项目再「重新生成报告」一次后，再运行本命令。");
  }
  process.exit(1);
}

main().catch((e) => {
  console.error("❌ 脚本异常：", e.message);
  process.exit(1);
});
