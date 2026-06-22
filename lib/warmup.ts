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

  // P2-14: 随 warmup 清理过期 artifacts（低频，概率触发，避免每次请求都跑）
  if (Math.random() < 0.1) {
    import("@/lib/codegen/artifacts-cleanup")
      .then((m) => m.cleanupAllArtifacts())
      .catch(() => {});
  }
}

export function isWarm(): boolean { return warmed; }
