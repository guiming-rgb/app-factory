/**
 * P1-3: 冷启动预热 — 预加载关键模块
 * Vercel 函数首次调用时动态 import 耗时，此模块预先触发加载
 */

const WARMUP_MODULES = [
  "@/lib/supabase",
  "@/lib/llm",
  "@/lib/agents",
  "@/lib/workflow",
  "@/lib/app-spec/validate",
  "@/lib/app-spec/generate-ddl",
  "@/lib/codegen/runs",
];

let warmed = false;

export async function warmup(): Promise<void> {
  if (warmed) return;
  const start = Date.now();

  await Promise.allSettled(
    WARMUP_MODULES.map((mod) => import(mod).catch(() => {}))
  );

  warmed = true;
  const elapsed = Date.now() - start;
  if (elapsed > 500) console.log(`[warmup] ${elapsed}ms`);
}

export function isWarm(): boolean { return warmed; }
