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

/** 失败分类对应的界面操作建议（批次 S UX） */
export function failureRemediation(breakdown: FailureBreakdown): string {
  switch (breakdown.category) {
    case "Inngest 队列":
      return "旧任务卡在队列：点该行的「标记失败」，再点上方「生成 ×× ZIP（同步）」。";
    case "App Spec":
      return "先完善方案报告或 Spec 质量，再重新生成；Spec 分低于 60 时界面会提示。";
    case "小程序编译":
      return "多为模板或 Spec 字段不全；可本地跑 npm run verify:c3:wechat-compile 对照日志。";
    case "Flutter analyze":
      return "检查 Spec 导航/实体是否与模板匹配；生产无 Docker 时 analyze 可能跳过。";
    case "鸿蒙结构":
      return "检查 main_pages、列表/详情路由；可跑 npm run verify:c6:harmony。";
    case "Storage":
      return "检查 Supabase Storage 桶与 Vercel 环境变量；ZIP 可能仍在「下载」链路上。";
    case "超时/取消":
      return "任务过久已自动失败：直接点「重试」或改用同步生成按钮。";
    default:
      return "展开下方日志；仍失败可复制日志发给维护者。";
  }
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
  const industry = meta.industryDetected as string | undefined;
  const confidence = meta.industryConfidence as number | undefined;
  if (industry && industry !== "generic") {
    const pct = typeof confidence === "number" ? Math.round(confidence * 100) : null;
    badges.push({
      label: pct !== null ? `${industry} ${pct}%` : industry,
      tone: typeof confidence === "number" && confidence >= 0.85 ? "ok" : "warn",
    });
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
