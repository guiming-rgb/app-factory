import type { AppSpec } from "./types";

export type BackendProvider = "supabase" | "nest" | "custom";

export type BackendTarget = {
  provider: BackendProvider;
  regionHint?: string;
  authProvider: string;
  authMethods: string[];
  /** 生成器写入产物时的环境变量占位说明 */
  envPlaceholders: {
    flutter: string[];
    wechat: string[];
  };
  /** nest/custom 尚未接入 codegen 时为 true */
  codegenSupported: boolean;
};

const DEFAULT_AUTH = {
  provider: "supabase",
  methods: ["email"] as string[]
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function readProvider(targets: Record<string, unknown>): BackendProvider {
  const backend = asRecord(targets.backend);
  const raw = backend.provider;
  if (raw === "supabase" || raw === "nest" || raw === "custom") {
    return raw;
  }
  return "supabase";
}

/** 从 App Spec 解析 BackendTarget，供 Flutter / 小程序生成器共用 */
export function resolveBackendTarget(spec: AppSpec): BackendTarget {
  const targets = asRecord(spec.targets);
  const backend = asRecord(targets.backend);
  const auth = asRecord(spec.auth);
  const provider = readProvider(targets);

  const authProvider =
    typeof auth.provider === "string" && auth.provider.trim()
      ? auth.provider.trim()
      : DEFAULT_AUTH.provider;

  const authMethods = Array.isArray(auth.methods)
    ? auth.methods.filter((m): m is string => typeof m === "string" && !!m.trim())
    : [...DEFAULT_AUTH.methods];

  const regionHint =
    typeof backend.regionHint === "string" && backend.regionHint.trim()
      ? backend.regionHint.trim()
      : undefined;

  if (provider === "supabase") {
    return {
      provider,
      regionHint,
      authProvider,
      authMethods,
      envPlaceholders: {
        flutter: ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
        wechat: ["SUPABASE_URL", "SUPABASE_ANON_KEY"]
      },
      codegenSupported: true
    };
  }

  if (provider === "nest") {
    return {
      provider,
      regionHint,
      authProvider: authProvider === "supabase" ? "nest" : authProvider,
      authMethods,
      envPlaceholders: {
        flutter: ["API_BASE_URL"],
        wechat: ["API_BASE_URL"]
      },
      codegenSupported: false
    };
  }

  return {
    provider: "custom",
    regionHint,
    authProvider,
    authMethods,
    envPlaceholders: {
      flutter: ["API_BASE_URL"],
      wechat: ["API_BASE_URL"]
    },
    codegenSupported: false
  };
}

export function formatBackendTargetMarkdown(
  spec: AppSpec,
  target: BackendTarget
): string {
  const lines = [
    `# 后端契约（BackendTarget）`,
    "",
    `- provider: \`${target.provider}\``,
    `- auth.provider: \`${target.authProvider}\``,
    `- auth.methods: ${target.authMethods.map((m) => `\`${m}\``).join(", ") || "—"}`,
    target.regionHint ? `- regionHint: \`${target.regionHint}\`` : null,
    `- codegenSupported: ${target.codegenSupported ? "是" : "否（首版仅 supabase 自动接线）"}`,
    "",
    "## 环境变量占位",
    "",
    "### Flutter",
    ...target.envPlaceholders.flutter.map((k) => `- \`${k}\``),
    "",
    "### 微信小程序",
    ...target.envPlaceholders.wechat.map((k) => `- \`${k}\``),
    "",
    "## Spec 溯源",
    "",
    `- appName: ${spec.appName}`,
    `- sourceProjectId: ${spec.sourceProjectId ?? "—"}`,
    `- generatedAt: ${new Date().toISOString()}`
  ].filter((line): line is string => line !== null);

  return lines.join("\n") + "\n";
}
