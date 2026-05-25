import {
  getCodegenStorageBucket,
  isCodegenStorageEnabled
} from "@/lib/codegen/storage";

export type DeployCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

export function getDeployStatus(): {
  mode: "local" | "production";
  ready: boolean;
  checks: DeployCheck[];
  appUrl: string | null;
} {
  const isDev = process.env.INNGEST_DEV === "1";
  const mode = isDev ? "local" : "production";

  const checks: DeployCheck[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  checks.push({
    id: "supabase",
    label: "Supabase URL",
    ok: !!supabaseUrl && /^https?:\/\//i.test(supabaseUrl),
    detail: supabaseUrl
      ? supabaseUrl.replace(/^https?:\/\//, "").split("/")[0]
      : "未配置"
  });

  checks.push({
    id: "service_role",
    label: "Service Role Key",
    ok: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    detail: process.env.SUPABASE_SERVICE_ROLE_KEY ? "已配置" : "未配置"
  });

  checks.push({
    id: "openai",
    label: "OpenAI / 模型 Key",
    ok: !!process.env.OPENAI_API_KEY?.trim(),
    detail: process.env.OPENAI_API_KEY ? "已配置" : "未配置"
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? null;
  checks.push({
    id: "app_url",
    label: "NEXT_PUBLIC_APP_URL",
    ok: !!appUrl,
    detail: appUrl ?? "未配置"
  });

  if (isDev) {
    checks.push({
      id: "inngest_dev",
      label: "Inngest 本地模式",
      ok: true,
      detail: "INNGEST_DEV=1 · 需 inngest:dev:3001"
    });
  } else {
    const eventKey = !!process.env.INNGEST_EVENT_KEY?.trim();
    const signingKey = !!process.env.INNGEST_SIGNING_KEY?.trim();
    checks.push({
      id: "inngest_cloud",
      label: "Inngest Cloud 密钥",
      ok: eventKey && signingKey,
      detail:
        eventKey && signingKey
          ? "EVENT_KEY + SIGNING_KEY 已配置"
          : "生产环境缺少 Inngest Cloud 密钥"
    });
  }

  checks.push({
    id: "storage",
    label: "Codegen Storage",
    ok: isCodegenStorageEnabled(),
    detail: isCodegenStorageEnabled()
      ? `bucket: ${getCodegenStorageBucket()}`
      : "CODEGEN_STORAGE_DISABLED=1"
  });

  const dockerAnalyze =
    process.env.CODEGEN_DOCKER_ANALYZE_DISABLED !== "1";
  checks.push({
    id: "docker_analyze",
    label: "Docker analyze（codegen）",
    ok: dockerAnalyze,
    detail: dockerAnalyze
      ? "本地可用；Vercel 无 Docker 将 skip"
      : "已禁用"
  });

  const ready = checks.every((c) => c.ok);

  return { mode, ready, checks, appUrl };
}
