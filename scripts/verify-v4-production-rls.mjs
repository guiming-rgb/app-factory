/**
 * 可选：双用户 Supabase RLS 深测
 * npm run verify:v4:production:rls
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

function loadEnvLocal() {
  if (!fs.existsSync(envPath)) return;
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

loadEnvLocal();

/** @param {string} msg */
function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

/** @param {string} url @param {string} anonKey @param {string} email @param {string} password */
async function signIn(url, anonKey, email, password) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });
  if (error || !data.user) {
    fail(`登录失败 ${email}: ${error?.message ?? "no user"}`);
  }
  return { client, user: data.user };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const emailA = process.env.V4_TEST_EMAIL?.trim();
  const passA = process.env.V4_TEST_PASSWORD?.trim();
  const emailB = process.env.V4_TEST_EMAIL_B?.trim();
  const passB = process.env.V4_TEST_PASSWORD_B?.trim();

  if (!url || !anonKey) {
    console.log("⏭ 跳过（无 Supabase URL/anon key）");
    process.exit(0);
  }
  if (!emailA || !passA) {
    console.log("⏭ 跳过（无 V4_TEST_EMAIL/PASSWORD）");
    process.exit(0);
  }

  console.log("══ v4 RLS 双用户深测 ══\n");

  const { client: clientA, user: userA } = await signIn(
    url,
    anonKey,
    emailA,
    passA
  );
  console.log(`✓ 用户 A 登录 ${userA.email}`);

  const idea =
    "RLS探针：极简记账本，只记支出分类，首版不含同步功能。";
  const { data: project, error: insertErr } = await clientA
    .from("projects")
    .insert({
      title: "RLS探针",
      idea,
      status: "pending",
      owner_id: userA.id
    })
    .select("id")
    .single();

  if (insertErr || !project) {
    fail(`A 创建项目失败: ${insertErr?.message ?? "unknown"}`);
  }
  console.log(`✓ A 创建项目 ${project.id}`);

  const { data: ownRow } = await clientA
    .from("projects")
    .select("id")
    .eq("id", project.id)
    .maybeSingle();
  if (!ownRow) {
    fail("A 无法读取刚创建的项目");
  }
  console.log("✓ A 可读自己的项目");

  if (emailB && passB) {
    const { client: clientB } = await signIn(url, anonKey, emailB, passB);
    const { data: leak } = await clientB
      .from("projects")
      .select("id")
      .eq("id", project.id)
      .maybeSingle();
    if (leak) {
      fail("B 读到了 A 的项目");
    }
    console.log("✓ B 无法读取 A 的项目");
  }

  await clientA.from("projects").delete().eq("id", project.id);
  console.log("\n✅ verify:v4:production:rls 通过");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
