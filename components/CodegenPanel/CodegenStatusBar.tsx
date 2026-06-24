"use client";

const SPEC_QUALITY_WARN = 60;

type SpecQualityPreview = { score: number; warnings: string[] };

type Props = {
  inngestHint: string | null;
  specQuality: SpecQualityPreview | null;
  successMsg: string | null;
  syncProgress: string | null;
};

/**
 * Codegen 状态栏：Inngest 提示、Spec 质量、成功消息、同步进度
 */
export function CodegenStatusBar({ inngestHint, specQuality, successMsg, syncProgress }: Props) {
  return (
    <>
      {inngestHint && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          ⚠ Inngest：{inngestHint}
        </p>
      )}

      {specQuality && (
        <p
          data-specQualityScore={specQuality.score}
          className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
            specQuality.score < SPEC_QUALITY_WARN
              ? "border-orange-200 bg-orange-50 text-orange-950"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          Spec 质量 {specQuality.score}/100
          {specQuality.score < SPEC_QUALITY_WARN ? "偏低" : ""}
          {specQuality.warnings.length > 0
            ? ` · ${specQuality.warnings.slice(0, 2).join("；")}`
            : ""}
        </p>
      )}

      {successMsg && (
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          ✅ {successMsg}
        </p>
      )}

      {syncProgress && (
        <p className="mt-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
          <span className="inline-block animate-pulse">●</span> {syncProgress}
        </p>
      )}
    </>
  );
}
