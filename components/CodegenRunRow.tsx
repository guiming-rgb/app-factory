"use client";

import { useState } from "react";
import type { CodegenRun } from "./hooks/useCodegenRuns";
type CodegenTarget = "flutter" | "wechat" | "harmony";
import { CopyTextButton } from "./CopyTextButton";
import {
  qualityGateBadges,
  classifyCodegenFailure,
  failureRemediation
} from "@/lib/codegen/format-run-quality";

const TARGET_LABEL: Record<string, string> = { flutter: "Flutter", wechat: "微信小程序", harmony: "鸿蒙 ArkTS" };
const STATUS_LABEL: Record<string, string> = { queued: "排队中", running: "生成中", completed: "已完成", failed: "失败" };
const STUCK_QUEUED_MS = 3 * 60 * 1000;
const STUCK_RUNNING_MS = 10 * 60 * 1000;

function badgeClass(tone: string) {
  if (tone === "ok") return "bg-emerald-100 text-emerald-900";
  if (tone === "fail") return "bg-red-100 text-red-800";
  if (tone === "warn") return "bg-amber-100 text-amber-900";
  return "bg-violet-100 text-violet-800";
}

function isRunStuck(run: CodegenRun): boolean {
  if (run.status !== "queued" && run.status !== "running") return false;
  const age = Date.now() - new Date(run.created_at).getTime();
  if (run.status === "queued") return age > STUCK_QUEUED_MS;
  return age > STUCK_RUNNING_MS;
}

function formatSpecSource(source: string | null, meta: Record<string, unknown>) {
  const base = source === "report-llm" ? "报告→Spec（LLM）" : source === "title-heuristic" ? "标题启发式（回退）" : source ?? "—";
  let suffix = "";
  const status = meta.analyzeStatus as string | undefined;
  if (status === "passed") suffix += " · analyze ✅";
  else if (status === "failed") suffix += " · analyze ❌";
  else if (status === "skipped") suffix += " · analyze 跳过";
  const buildStatus = meta.buildStatus as string | undefined;
  if (buildStatus === "passed") suffix += " · build ✅";
  else if (buildStatus === "failed") suffix += " · build ❌";
  const rounds = meta.autoFixRounds as number | undefined;
  if (rounds && rounds > 0) suffix += ` · 自动修 ${rounds} 轮`;
  const score = meta.specQualityScore as number | undefined;
  if (typeof score === "number") suffix += ` · Spec ${score}`;
  return base + suffix;
}

function failureDetail(run: CodegenRun, meta: Record<string, unknown>): string {
  const breakdown = classifyCodegenFailure(meta, run.log);
  if (run.log) return `[${breakdown.category}] ${breakdown.detail}\n${run.log}`;
  const parts = [meta.buildReason, meta.analyzeReason, meta.specQualityWarnings, meta.specWarning].filter((x): x is string => typeof x === "string" && x.length > 0);
  return parts[0] ? `[${breakdown.category}] ${parts[0]}` : breakdown.detail;
}

export function CodegenRunRow({
  run,
  onGenerate,
  onPush,
  onCancel,
  loadingTarget,
  activeRun,
  pushingRunId,
  cancelingRunId,
  copiedRepoRunId,
  onCopyRepo,
}: {
  run: CodegenRun;
  onGenerate: (target: CodegenTarget) => void;
  onPush: (runId: string) => void;
  onCancel: (runId: string) => void;
  loadingTarget: string | null;
  activeRun: CodegenRun | undefined;
  pushingRunId: string | null;
  cancelingRunId: string | null;
  copiedRepoRunId: string | null;
  onCopyRepo: (runId: string, url: string) => void;
}) {
  const meta = (run.metadata ?? {}) as Record<string, unknown>;
  const gateBadges = qualityGateBadges(meta);
  const stuck = isRunStuck(run);
  const failBreakdown = run.status === "failed" ? classifyCodegenFailure(meta, run.log) : null;
  const failText = run.status === "failed" ? failureDetail(run, meta) : "";
  const githubRepoUrl = meta.githubRepoUrl as string | undefined;

  return (
    <tr className="border-b border-violet-100/80 align-top">
      <td className="py-2 pr-2">{TARGET_LABEL[run.target]}</td>
      <td className="py-2 pr-2">
        {STATUS_LABEL[run.status] ?? run.status}
        {stuck ? <span className="ml-1 text-amber-700" title={run.status === "queued" ? "排队超过 3 分钟" : "生成超过 10 分钟"}>⚠ 可能卡住</span> : null}
        {run.status === "failed" && failBreakdown ? (
          <div className="mt-1 max-w-xs text-[10px] leading-snug text-red-600">
            <p><span className="font-medium">{failBreakdown.category}</span> — {failBreakdown.detail}</p>
            <p className="mt-0.5 text-amber-900">{failureRemediation(failBreakdown)}</p>
          </div>
        ) : null}
      </td>
      <td className="py-2 pr-2">
        {formatSpecSource(run.spec_source, meta)}
        {meta.specWarning ? <span className="ml-1 cursor-help text-amber-700" title={meta.specWarning as string}>⚠</span> : null}
      </td>
      <td className="py-2 pr-2">
        <div className="flex flex-wrap gap-1">
          {gateBadges.length > 0 ? gateBadges.map((b) => <span key={b.label} className={`rounded px-1 py-0.5 text-[10px] ${badgeClass(b.tone)}`}>{b.label}</span>) : <span className="text-violet-400">—</span>}
        </div>
      </td>
      <td className="py-2 pr-2">
        {run.status === "completed" && meta.storageUploaded ? <span className="text-emerald-700">Storage ✅</span>
          : run.status === "completed" ? <span className="text-amber-700">本地</span>
          : <span className="text-violet-400">—</span>}
        {run.status === "completed" && run.sqlDownloadUrl ? <a href={run.sqlDownloadUrl} className="ml-1 font-medium text-amber-800 underline" title="下载 SQL">SQL</a> : null}
        {run.target === "flutter" && run.flutterWebUrl ? <a href={run.flutterWebUrl} className="ml-1 font-medium text-violet-700 underline" title="Web 预览">Web</a> : null}
      </td>
      <td className="py-2">
        <div className="flex flex-wrap gap-2">
          {run.previewUrl ? <a href={run.previewUrl} target="_blank" rel="noreferrer" className="font-medium text-violet-700 underline">预览</a> : null}
          {run.downloadUrl ? (
            <>
              <a href={run.downloadUrl} className="font-medium text-violet-700 underline">源码 ZIP</a>
              {run.downloadUrl.startsWith("http") ? null : <CopyTextButton text={`${typeof window !== "undefined" ? window.location.origin : ""}${run.downloadUrl}`} label="复制链" className="font-medium text-violet-600 underline" />}
            </>
          ) : null}
          {run.target === "flutter" && run.downloadMacGithubUrl ? <a href={run.downloadMacGithubUrl} target="_blank" rel="noreferrer" className="font-medium text-teal-800 underline">Mac .app(GitHub)</a>
            : run.downloadMacUrl ? <a href={run.downloadMacUrl} className="font-medium text-teal-800 underline">Mac .app</a> : null}
          {run.target === "flutter" && run.downloadWinUrl ? <a href={run.downloadWinUrl} className="font-medium text-teal-800 underline">Win .exe</a> : null}
          {run.status === "completed" && run.downloadUrl ? (
            <button type="button" disabled={pushingRunId === run.id} onClick={() => onPush(run.id)} className="font-medium text-emerald-700 underline disabled:opacity-50">
              {pushingRunId === run.id ? "推送中…" : githubRepoUrl ? "再次推送" : "推 GitHub"}
            </button>
          ) : null}
          {githubRepoUrl ? (
            <>
              <a href={githubRepoUrl} target="_blank" rel="noreferrer" className="font-medium text-emerald-700 underline">GitHub</a>
              <button type="button" onClick={() => onCopyRepo(run.id, githubRepoUrl)} className="font-medium text-emerald-700 underline">{copiedRepoRunId === run.id ? "已复制" : "复制链接"}</button>
            </>
          ) : null}
          {run.status === "failed" ? <button type="button" disabled={!!loadingTarget || !!activeRun} onClick={() => onGenerate(run.target)} className="font-medium text-amber-800 underline disabled:opacity-50">重试</button> : null}
          {run.status === "failed" && failText ? <CopyTextButton text={failText} label="复制日志" className="font-medium text-red-700 underline" /> : null}
          {(run.status === "queued" || run.status === "running") && (stuck || run.status === "queued") ? (
            <button type="button" disabled={cancelingRunId === run.id} onClick={() => onCancel(run.id)} className="font-medium text-red-700 underline disabled:opacity-50">{cancelingRunId === run.id ? "取消中…" : "标记失败"}</button>
          ) : null}
          {!run.downloadUrl && !run.previewUrl && run.status === "failed" && !run.log ? <span className="text-red-600">失败</span> : null}
          {!run.downloadUrl && !run.previewUrl && run.status !== "failed" && run.status !== "queued" && run.status !== "running" ? <span className="text-violet-400">—</span> : null}
        </div>
      </td>
    </tr>
  );
}
