"use client";

import { memo } from "react";
import { GitHubConnectButton } from "@/components/GitHubConnectButton";
import { TARGET_LABEL } from "./useCodegenActions";

type CodegenTarget = "flutter" | "wechat" | "harmony";

type Props = {
  projectId: string;
  loadingTarget: string | null;
  activeRun: { target: string } | undefined;
  pushingAll: boolean;
  pushingRunId: string | null;
  hideFailedRuns: boolean;
  failedRunCount: number;
  doGenerate: (target: string) => void;
  doGenerateAll: () => void;
  doPushAll: () => void;
  fetchRuns: () => Promise<unknown>;
  setHideFailedRuns: (v: boolean) => void;
};

/**
 * Codegen 生成按钮组：三栈目标按钮 + 一键三栈 + 推 GitHub + 刷新/折叠
 */
export const CodegenGenerateButtons = memo(function CodegenGenerateButtons({
  projectId,
  loadingTarget,
  activeRun,
  pushingAll,
  pushingRunId,
  hideFailedRuns,
  failedRunCount,
  doGenerate,
  doGenerateAll,
  doPushAll,
  fetchRuns,
  setHideFailedRuns,
}: Props) {
  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <GitHubConnectButton nextPath={`/projects/${projectId}`} />
        <button
          type="button"
          disabled={pushingAll || !!pushingRunId}
          onClick={doPushAll}
          className="rounded-lg border border-gray-800 px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-100 disabled:opacity-50"
        >
          {pushingAll ? "三栈推送中…" : "一键推三栈 GitHub"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(["flutter", "wechat", "harmony"] as CodegenTarget[]).map((target) => (
          <button
            key={target}
            type="button"
            disabled={!!loadingTarget || !!activeRun}
            onClick={() => doGenerate(target)}
            className={`rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
              target === "flutter"
                ? "bg-violet-700 text-white"
                : target === "wechat"
                  ? "border border-violet-600 text-violet-800"
                  : "border border-emerald-700 text-emerald-900"
            }`}
          >
            {loadingTarget === target
              ? "提交中…"
              : activeRun?.target === target
                ? `${TARGET_LABEL[target]} 生成中…`
                : `生成 ${TARGET_LABEL[target]} ZIP（同步）`}
          </button>
        ))}
        <button
          type="button"
          disabled={!!loadingTarget || !!activeRun}
          onClick={doGenerateAll}
          className="rounded-lg bg-gradient-to-r from-violet-700 to-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingTarget ? "生成中…" : "一键三栈生成（并行）"}
        </button>
        <button
          type="button"
          disabled={false}
          onClick={() => void fetchRuns().catch(() => {})}
          className="rounded-lg border border-violet-300 px-3 py-2 text-xs text-violet-800"
        >
          刷新记录
        </button>
        {failedRunCount > 0 && (
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-violet-800">
            <input
              type="checkbox"
              checked={hideFailedRuns}
              onChange={(e) => setHideFailedRuns(e.target.checked)}
              className="rounded border-violet-300"
            />
            折叠失败记录（{failedRunCount}）
          </label>
        )}
      </div>
    </>
  );
});
