const INNGEST_DEV_UI = "http://127.0.0.1:8288";

export type CodegenInngestPreflight = {
  ok: boolean;
  mode: "local" | "production";
  message: string;
  hint?: string;
};

function appUrlPort(appUrl: string | null | undefined): string | null {
  if (!appUrl?.trim()) return null;
  try {
    const u = new URL(appUrl);
    return u.port || (u.protocol === "https:" ? "443" : "80");
  } catch {
    return null;
  }
}

/** 本地 Inngest Dev 控制台是否可达 */
export async function isInngestDevServerUp(): Promise<boolean> {
  try {
    const res = await fetch(INNGEST_DEV_UI, {
      signal: AbortSignal.timeout(2500)
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * codegen 入队前检查 Inngest 是否就绪。
 * 本地：8288 须响应；生产：须配置 Cloud 密钥。
 */
export async function checkCodegenInngestPreflight(): Promise<CodegenInngestPreflight> {
  const isDev = process.env.INNGEST_DEV === "1";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? null;

  if (isDev) {
    const up = await isInngestDevServerUp();
    if (!up) {
      return {
        ok: false,
        mode: "local",
        message: "Inngest Dev 未启动（8288 无响应）",
        hint:
          "请另开终端运行 npm run inngest:dev:3001（或与 NEXT_PUBLIC_APP_URL 端口一致的 inngest:dev）"
      };
    }

    const port = appUrlPort(appUrl);
    const expectedInngestUrl =
      port === "3001"
        ? "http://localhost:3001/api/inngest"
        : port === "3000"
          ? "http://localhost:3000/api/inngest"
          : appUrl
            ? `${appUrl.replace(/\/$/, "")}/api/inngest`
            : null;

    return {
      ok: true,
      mode: "local",
      message: "Inngest Dev 已响应",
      hint: expectedInngestUrl
        ? `请确认 inngest-cli 指向 ${expectedInngestUrl}`
        : "请确认 inngest-cli 与 Next 端口一致"
    };
  }

  const eventKey = !!process.env.INNGEST_EVENT_KEY?.trim();
  const signingKey = !!process.env.INNGEST_SIGNING_KEY?.trim();
  if (!eventKey || !signingKey) {
    return {
      ok: false,
      mode: "production",
      message: "生产环境缺少 Inngest Cloud 密钥",
      hint: "Vercel 配置 INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY 后 Redeploy"
    };
  }

  return {
    ok: true,
    mode: "production",
    message: "Inngest Cloud 密钥已配置"
  };
}

export const CODEGEN_INNGEST_HINTS = {
  localDevDown:
    "后台队列需要 Inngest Dev：npm run inngest:dev:3001（与 Next 同端口）",
  localPortMismatch:
    "Inngest Dev 与 Next 端口不一致时任务会一直排队；请重启双进程或改用「同步下载」",
  productionKeys:
    "生产后台队列需 Inngest Cloud 密钥；见 /deploy 或 docs/v3-部署指南.md",
  queuedTooLong:
    "排队超过 2 分钟通常表示 Inngest 未消费；可点「标记失败」后改用同步下载或检查 /deploy"
} as const;
