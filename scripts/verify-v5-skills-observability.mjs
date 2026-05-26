/**
 * v5-9 技能注入可观测：静态接线 + 可选 DB 行数校验
 *
 * npm run verify:v5:skills-observability
 * npm run verify:v5:skills-observability -- 833ad678-f204-40d7-a47c-5b76e803f64f
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const EXPECTED_SKILL_INJECTIONS = 8;

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ 找不到 .env.local");
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

function checkStatic() {
  console.log("══ v5-9 技能注入可观测（静态）══\n");

  const requiredFiles = [
    "lib/agents/resolve-skills.ts",
    "lib/usage-logs.ts",
    "lib/workflow.ts",
    "app/api/projects/[id]/usage/route.ts",
    "app/projects/[id]/page.tsx",
    "components/AgentResultCard.tsx"
  ];
  for (const rel of requiredFiles) {
    if (!fs.existsSync(path.join(root, rel))) {
      console.error(`❌ 缺少 ${rel}`);
      process.exit(1);
    }
    console.log(`✓ ${rel}`);
  }

  const workflow = fs.readFileSync(path.join(root, "lib/workflow.ts"), "utf8");
  const usageLogs = fs.readFileSync(path.join(root, "lib/usage-logs.ts"), "utf8");
  const usageRoute = fs.readFileSync(
    path.join(root, "app/api/projects/[id]/usage/route.ts"),
    "utf8"
  );
  const page = fs.readFileSync(
    path.join(root, "app/projects/[id]/page.tsx"),
    "utf8"
  );

  const tokens = [
    ["workflow", workflow, "insertSkillInjectionLog"],
    ["workflow", workflow, "resolveAgentSkillInjection"],
    ["usage-logs", usageLogs, "skill_injection"],
    ["usage-logs", usageLogs, "insertSkillInjectionLog"],
    ["usage-logs", usageLogs, "skillInjections"],
    ["usage API", usageRoute, "skill_injection_row_count"],
    ["project page", page, "技能注入记录（v5-9）"],
    ["AgentResultCard", fs.readFileSync(path.join(root, "components/AgentResultCard.tsx"), "utf8"), "已注入技能"]
  ];

  for (const [label, content, token] of tokens) {
    if (!content.includes(token)) {
      console.error(`❌ ${label} 缺少: ${token}`);
      process.exit(1);
    }
    console.log(`✓ ${label} 含 ${token}`);
  }

  console.log("\n✅ v5-9 静态接线通过");
}

async function checkDatabase(projectId) {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.warn("\n⚠ 跳过 DB 校验：缺少 Supabase 环境变量");
    return;
  }

  const supabase = createClient(url, key);
  const { count, error } = await supabase
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("event_type", "skill_injection");

  if (error) {
    console.error("\n❌ 查 skill_injection 失败：", error.message);
    process.exit(1);
  }

  const n = count ?? 0;
  console.log(`\n══ v5-9 DB 校验（项目 ${projectId}）══`);
  console.log(`skill_injection 行数：${n} / 期望 ≥ ${EXPECTED_SKILL_INJECTIONS}`);

  if (n < EXPECTED_SKILL_INJECTIONS) {
    console.error(
      "\n❌ 行数不足：请对本项目「重新生成报告」后再跑（需已 build + 重启 3001/Inngest）。"
    );
    process.exit(1);
  }

  const { data: sample, error: sampleErr } = await supabase
    .from("usage_logs")
    .select("agent_code, metadata")
    .eq("project_id", projectId)
    .eq("event_type", "skill_injection")
    .order("created_at", { ascending: true })
    .limit(3);

  if (sampleErr) {
    console.error("❌ 抽样 metadata 失败：", sampleErr.message);
    process.exit(1);
  }

  for (const row of sample ?? []) {
    const meta = row.metadata ?? {};
    const injected = meta.injected_skill_codes ?? [];
    console.log(
      `  · ${row.agent_code}: injected=[${(injected || []).join(", ")}]`
    );
  }

  console.log("\n✅ v5-9 DB 校验通过");
}

async function main() {
  checkStatic();

  let projectId = process.argv[2]?.trim();
  if (!projectId) {
    console.log(
      "\nℹ 未传项目 ID，仅做静态检查。要验 DB 请：npm run verify:v5:skills-observability -- <projectId>"
    );
    return;
  }

  await checkDatabase(projectId);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
