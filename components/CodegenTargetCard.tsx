"use client";

import { memo } from "react";
import type { CodegenRun } from "./hooks/useCodegenRuns";
import { latestRunByTarget, qualityGateBadges, classifyCodegenFailure, failureRemediation, type CodegenTarget } from "@/lib/codegen/format-run-quality";

const TARGET_LABEL: Record<string, string> = { flutter: "Flutter", wechat: "微信小程序", harmony: "鸿蒙 ArkTS" };
const STATUS_LABEL: Record<string, string> = { queued: "排队中", running: "生成中", completed: "已完成", failed: "失败" };

function badgeClass(tone: string) {
  if (tone === "ok") return "bg-emerald-100 text-emerald-900";
  if (tone === "fail") return "bg-red-100 text-red-800";
  if (tone === "warn") return "bg-amber-100 text-amber-900";
  return "bg-violet-100 text-violet-800";
}

export const CodegenTargetCards = memo(function CodegenTargetCards({ runs }: { runs: CodegenRun[] }) {
  const latestByTarget = latestRunByTarget(runs);
  const stackTargets: CodegenTarget[] = ["flutter", "wechat", "harmony"];

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      {stackTargets.map((target) => {
        const run = latestByTarget[target];
        const meta = (run?.metadata ?? {}) as Record<string, unknown>;
        const badges = qualityGateBadges(meta);
        const status = run ? (STATUS_LABEL[run.status] ?? run.status) : "未生成";
        const fail = run?.status === "failed" ? classifyCodegenFailure(meta, run.log) : null;
        return (
          <div key={target} className="rounded-lg border border-violet-200 bg-white/80 px-3 py-2 text-xs text-violet-950">
            <p className="font-medium">{TARGET_LABEL[target]}</p>
            <p className="mt-0.5 text-violet-700">{status}</p>
            {badges.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {badges.map((b) => <span key={b.label} className={`rounded px-1.5 py-0.5 text-[10px] ${badgeClass(b.tone)}`}>{b.label}</span>)}
              </div>
            ) : <p className="mt-1 text-[10px] text-violet-500">暂无门禁记录</p>}
            {fail ? <p className="mt-1 text-[10px] leading-snug text-red-700" title={failureRemediation(fail)}>{fail.category}：{fail.detail}</p> : null}
            {run?.status === "completed" && run.downloadUrl ? <p className="mt-1 text-[10px] text-emerald-800">可下载 ZIP</p> : null}
          </div>
        );
      })}
    </div>
  );
});
