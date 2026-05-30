export type CodegenTarget = "flutter" | "wechat" | "harmony";

export type RunQualityMeta = Record<string, unknown>;

export type QualityGateBadge = {
  label: string;
  tone: "ok" | "warn" | "fail" | "muted";
};

export type FailureBreakdown = {
  category: string;
  detail: string;
};

export function classifyCodegenFailure(
  meta: RunQualityMeta,
  log?: string | null
): FailureBreakdown {
  const text = [
    log,
    meta.buildReason,
    meta.analyzeReason,
    meta.buildOutput,
    meta.analyzeOutput
  ]
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .join("\n")
    .toLowerCase();

  if (text.includes("inngest") || text.includes("队列") || text.includes("queued")) {
    return { category: "Inngest 队列", detail: "事件未消费或排队超时" };
  }
  if (text.includes("spec") && text.includes("校验")) {
    return { category: "App Spec", detail: "Spec 校验或质量门禁未通过" };
  }
  if (text.includes("wcc") || text.includes("wcsc") || text.includes("compile")) {
    return { category: "小程序编译", detail: "wcc/wcsc 或结构门禁失败" };
  }
  if (text.includes("analyze") || text.includes("flutter")) {
    return { category: "Flutter analyze", detail: "dart analyze 未通过" };
  }
  if (text.includes("harmony") || text.includes("hvigor") || text.includes("结构")) {
    return { category: "鸿蒙结构", detail: "ArkTS 结构门禁或模板校验失败" };
  }
  if (text.includes("storage") || text.includes("upload")) {
    return { category: "Storage", detail: "产物上传 Supabase 失败" };
  }
  if (text.includes("timeout") || text.includes("超时") || text.includes("cancel")) {
    return { category: "超时/取消", detail: "任务超时或人工标记失败" };
  }
  return { category: "未知", detail: "见运行日志或 metadata" };
}

export function qualityGateBadges(meta: RunQualityMeta): QualityGateBadge[] {
  const badges: QualityGateBadge[] = [];
  const analyze = meta.analyzeStatus;
  if (analyze === "passed") badges.push({ label: "analyze ✅", tone: "ok" });
  else if (analyze === "failed")
    badges.push({ label: "analyze ❌", tone: "fail" });
  else if (analyze === "skipped")
    badges.push({ label: "analyze 跳过", tone: "muted" });

  const build = meta.buildStatus;
  if (build === "passed") badges.push({ label: "build ✅", tone: "ok" });
  else if (build === "failed") badges.push({ label: "build ❌", tone: "fail" });
  else if (build === "skipped") badges.push({ label: "build 跳过", tone: "muted" });

  const score = meta.specQualityScore;
  if (typeof score === "number") {
    badges.push({
      label: `Spec ${score}`,
      tone: score >= 60 ? "ok" : "warn"
    });
  }
  const screens = meta.screenCount;
  if (typeof screens === "number" && screens > 0) {
    badges.push({ label: `${screens} 屏`, tone: "muted" });
  }
  if (meta.codegenTodoMvp === true) {
    badges.push({ label: "待办 MVP", tone: "ok" });
  }
  return badges;
}

export function latestRunByTarget<
  T extends { target: CodegenTarget; created_at: string }
>(runs: T[]): Partial<Record<CodegenTarget, T>> {
  const out: Partial<Record<CodegenTarget, T>> = {};
  for (const run of runs) {
    const prev = out[run.target];
    if (!prev || new Date(run.created_at) > new Date(prev.created_at)) {
      out[run.target] = run;
    }
  }
  return out;
}
