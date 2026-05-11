type AgentRun = {
  id: string;
  agent_code: string;
  agent_name: string;
  status: string;
  output: string | null;
  error_message: string | null;
};

export function AgentResultCard({ run }: { run: AgentRun }) {
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
