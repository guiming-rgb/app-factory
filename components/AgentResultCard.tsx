type SkillInjectionSummary = {
  injectedCodes: string[];
  missingCodes: string[];
  skillNames: Array<{ code: string; name: string; version: string }>;
};

type AgentRun = {
  id: string;
  agent_code: string;
  agent_name: string;
  status: string;
  output: string | null;
  error_message: string | null;
};

export function AgentResultCard({
  run,
  skillInjection
}: {
  run: AgentRun;
  skillInjection?: SkillInjectionSummary | null;
}) {
  const statusStyle = getStatusStyle(run.status);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {run.agent_name}
          </h3>
          <p className="mt-1 text-xs text-gray-500">{run.agent_code}</p>
        </div>

        <span className={`w-fit rounded-full px-3 py-1 text-xs ${statusStyle}`}>
          {formatStatus(run.status)}
        </span>
      </div>

      {skillInjection && (
        <div className="mb-3 rounded-xl border border-violet-100 bg-violet-50/80 px-3 py-2 text-xs text-violet-900">
          <span className="font-medium">已注入技能：</span>
          {skillInjection.injectedCodes.length > 0 ? (
            <span>
              {skillInjection.skillNames.length > 0
                ? skillInjection.skillNames
                    .map((s) => `${s.name} (${s.code})`)
                    .join("、")
                : skillInjection.injectedCodes.join("、")}
            </span>
          ) : (
            <span className="text-violet-700">无（绑定未命中已发布技能）</span>
          )}
          {skillInjection.missingCodes.length > 0 && (
            <span className="mt-1 block text-amber-800">
              未发布/缺失：{skillInjection.missingCodes.join("、")}
            </span>
          )}
        </div>
      )}

      {run.error_message && (
        <div className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {run.error_message}
        </div>
      )}

      {run.output ? (
        <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-800">
          {run.output}
        </pre>
      ) : (
        <p className="text-sm text-gray-500">暂无输出</p>
      )}
    </div>
  );
}

function formatStatus(status: string) {
  const map: Record<string, string> = {
    pending: "等待中",
    running: "生成中",
    completed: "已完成",
    failed: "失败"
  };

  return map[status] || status;
}

function getStatusStyle(status: string) {
  if (status === "completed") {
    return "bg-green-100 text-green-700";
  }

  if (status === "running") {
    return "bg-blue-100 text-blue-700";
  }

  if (status === "failed") {
    return "bg-red-100 text-red-700";
  }

  return "bg-gray-100 text-gray-700";
}
