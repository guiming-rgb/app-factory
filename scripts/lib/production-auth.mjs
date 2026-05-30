/**
 * 生产/本地 E2E：Supabase 登录并生成 Cookie 头（供 fetch 调 Next API）
 */
import fs from "fs";
import path from "path";
import { createServerClient } from "@supabase/ssr";

export function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
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

export function isAuthConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

/**
 * @returns {Promise<{ cookieHeader: string | null; email?: string }>}
 */
export async function createSessionCookieHeader() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const email = process.env.V4_TEST_EMAIL?.trim();
  const password = process.env.V4_TEST_PASSWORD?.trim();

  if (!url || !anonKey) {
    return { cookieHeader: null };
  }
  if (!email || !password) {
    throw new Error(
      "Auth 已启用但缺少 V4_TEST_EMAIL / V4_TEST_PASSWORD（.env.local）"
    );
  }

  /** @type {{ name: string; value: string }[]} */
  const jar = [];

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return jar.map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const c of cookiesToSet) {
          const idx = jar.findIndex((x) => x.name === c.name);
          if (idx >= 0) {
            jar[idx] = { name: c.name, value: c.value };
          } else {
            jar.push({ name: c.name, value: c.value });
          }
        }
      }
    }
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`测试账号登录失败 (${email}): ${error.message}`);
  }

  const cookieHeader = jar.map((c) => `${c.name}=${c.value}`).join("; ");
  if (!cookieHeader) {
    throw new Error("登录成功但未生成 session cookie");
  }

  return { cookieHeader, email };
}
