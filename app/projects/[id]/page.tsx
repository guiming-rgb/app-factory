import Link from "next/link";
import { AgentResultCard } from "@/components/AgentResultCard";
import { AutoRefreshWhenRunning } from "@/components/AutoRefreshWhenRunning";
import { CodegenPanel } from "@/components/CodegenPanel";
import { CopyReportButton } from "@/components/CopyReportButton";
import { DownloadFlutterButton } from "@/components/DownloadFlutterButton";
import { DownloadHarmonyButton } from "@/components/DownloadHarmonyButton";
import { DownloadWechatButton } from "@/components/DownloadWechatButton";
import { DownloadReportButton } from "@/components/DownloadReportButton";
import { GenerateProjectButton } from "@/components/GenerateProjectButton";
import { ProjectMemoriesPanel } from "@/components/ProjectMemoriesPanel";
import { RefreshProjectButton } from "@/components/RefreshProjectButton";
import { RegenerateCompletedButton } from "@/components/RegenerateCompletedButton";
import { AGENT_PIPELINE_COUNT } from "@/lib/agents";
import { APP_FEATURES } from "@/lib/app-features";
import { getProjectDetailForPage } from "@/lib/projects-server";
import { getServerUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProjectPage({
  params
}: {
  params: { id: string };
}) {
  const user = await getServerUser();
  const data = await getProjectDetailForPage(params.id, user?.id ?? null);

  if (!data) {
    return (
      <main className="min-h-screen bg-gray-50 p-10">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-gray-700">项目不存在或加载失败。</p>
          <Link href="/" className="mt-4 inline-block text-blue-600">
            返回首页
          </Link>
        </div>
      </main>
    );
  }

  const { project, runs, usage, codegenRuns } = data;

  const completedAgentCount = runs.filter((r) => r.status === "completed")
    .length;
  const progressPercent = Math.min(
    Math.round((completedAgentCount / AGENT_PIPELINE_COUNT) * 100),
    100
  );

  const skillInjectionByRunId = new Map(
    (usage?.skillInjections ?? [])
      .filter((row) => row.agentRunId)
      .map((row) => [row.agentRunId as string, row])
  );

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <AutoRefreshWhenRunning enabled={project.status === "running"} />

      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-black">
            ← 返回首页
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/projects" className="text-sm text-gray-500 hover:text-black">
            历史项目
          </Link>
        </div>

        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                状态：{formatProjectStatus(project.status)}
              </div>

              <h1 className="text-3xl font-bold text-gray-950">
                {project.title}
              </h1>

              <p className="mt-2 text-xs text-gray-500">
                项目 ID：{project.id}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                当前构建：{APP_FEATURES.displayLabel}
                {APP_FEATURES.usageV13
                  ? " · 验收自检：/api/projects/" + project.id + "/usage"
                  : null}
              </p>

              {usage && usage.llmCallCount > 0 && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">生成用量（v1.3）</p>
                  <p className="mt-1 text-xs text-slate-600">
                    LLM 调用 {usage.llmCallCount} 次 · 总耗时{" "}
                    {formatDurationMs(usage.totalDurationMs)} · Token 合计{" "}
                    {usage.totalTokens.toLocaleString()}
                  </p>
                </div>
              )}

              {usage && usage.skillInjections.length > 0 && (
                <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
                  <p className="font-medium">技能注入记录（v5-9）</p>
                  <p className="mt-1 text-xs text-violet-800">
                    共 {usage.skillInjections.length} 条 · 已写入 usage_logs（event_type=skill_injection）
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-violet-900">
                    {usage.skillInjections.map((row) => (
                      <li key={row.id}>
                        <span className="font-mono">{row.agentCode}</span>
                        {row.injectedCodes.length > 0 ? (
                          <>
                            {" "}
                            →{" "}
                            {row.skillNames.length > 0
                              ? row.skillNames
                                  .map((s) => `${s.name} (${s.code})`)
                                  .join("、")
                              : row.injectedCodes.join("、")}
                          </>
                        ) : (
                          <span className="text-violet-700">（本轮未注入已发布技能）</span>
                        )}
                        {row.missingCodes.length > 0 && (
                          <span className="text-amber-800">
                            {" "}
                            · 未发布/缺失：{row.missingCodes.join("、")}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {project.status === "completed" &&
                (!usage || usage.llmCallCount === 0) && (
                  <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                    未记录生成用量：请先在 Supabase 执行{" "}
                    <code className="rounded bg-amber-100 px-1">
                      sql/migrations/20260519_usage_logs.sql
                    </code>
                    ，在本机执行{" "}
                    <code className="rounded bg-amber-100 px-1">npm run build</code>{" "}
                    并重启 3001 + Inngest 后，对本项目点「重新生成报告」再验收 v1.3。
                  </p>
                )}

              {(project.status === "running" ||
                runs.length > 0 ||
                project.status === "completed") && (
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                    <span>Agent 进度</span>
                    <span>
                      {completedAgentCount}/{AGENT_PIPELINE_COUNT} 已完成
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-black transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-stretch gap-2 md:items-end">
              {project.status === "pending" && (
                <GenerateProjectButton projectId={project.id} />
              )}

              {project.status === "failed" && (
                <GenerateProjectButton
                  projectId={project.id}
                  confirmMessage="将清空本次失败的运行记录并重新开始全流程，确定吗？"
                />
              )}

              {project.status === "completed" && (
                <RegenerateCompletedButton projectId={project.id} />
              )}

              {(project.status === "running" ||
                project.status === "completed") && (
                <RefreshProjectButton />
              )}
            </div>
          </div>

          {project.status === "completed" && (
            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50/80 p-5">
              <h2 className="text-lg font-semibold text-gray-900">代码生成</h2>
              <p className="mt-1 text-xs text-gray-600">
                「快速下载」为即时导出当前 Spec；下方三按钮为<strong>同步生成</strong>
                （约 10–30 秒/栈，无需 Inngest 队列），产物可预览、下载 ZIP、推 GitHub。
                历史记录写入 Supabase（若已配置 Storage）。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <DownloadFlutterButton projectId={project.id} />
                <DownloadWechatButton projectId={project.id} />
                <DownloadHarmonyButton projectId={project.id} />
              </div>
              <CodegenPanel
                projectId={project.id}
                embedded
                initialRuns={codegenRuns.map((run) => ({
                  id: run.id,
                  target: run.target,
                  status: run.status as
                    | "queued"
                    | "running"
                    | "completed"
                    | "failed",
                  spec_source: run.spec_source,
                  log: run.log,
                  metadata: run.metadata,
                  created_at: run.created_at,
                  downloadUrl: run.downloadUrl,
                  previewUrl: run.previewUrl
                }))}
              />
            </div>
          )}

          <div>
            <h2 className="mb-2 font-semibold text-gray-900">原始想法</h2>
            <p className="whitespace-pre-wrap leading-7 text-gray-700">
              {project.idea}
            </p>
          </div>

          <ProjectMemoriesPanel projectId={project.id} />

          {project.error_message && (
            <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {project.error_message}
            </div>
          )}

          {project.status === "running" && (
            <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
              AI 正在后台生产中（Inngest）。页面每约 5 秒自动刷新；也可点「刷新状态」。本地请同时运行
              Inngest Dev Server，否则任务不会执行。
            </div>
          )}
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-bold text-gray-950">
            AI 团队生产过程
          </h2>

          <div className="space-y-5">
            {runs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
                还没有生成结果，请点击「开始 AI 生产」。
              </div>
            ) : (
              runs.map((run) => (
                <AgentResultCard
                  key={run.id}
                  run={run}
                  skillInjection={skillInjectionByRunId.get(run.id) ?? null}
                />
              ))
            )}
          </div>
        </div>

        {project.final_report && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-bold text-gray-950">
                最终完整报告
              </h2>

              <div className="flex flex-wrap gap-2">
                <DownloadReportButton projectId={project.id} />
                <CopyReportButton text={project.final_report} />
              </div>
            </div>

            <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-800">
              {project.final_report}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}

function formatProjectStatus(status: string) {
  const map: Record<string, string> = {
    pending: "等待生产",
    running: "生产中",
    completed: "已完成",
    failed: "失败"
  };

  return map[status] || status;
}

function formatDurationMs(ms: number) {
  if (ms < 1000) {
    return `${ms} ms`;
  }
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds} 秒`;
  }
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest > 0 ? `${minutes} 分 ${rest} 秒` : `${minutes} 分`;
}
