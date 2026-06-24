"use client";

type Props = {
  editing: boolean;
  saving: boolean;
  resetting: boolean;
  hasOverride: boolean;
  startEditing: () => void;
  handleSave: () => void;
  cancelEditing: () => void;
  handleReset: () => void;
};

/**
 * Spec 操作按钮栏：编辑 / 保存 / 取消 / 重置
 */
export function SpecActionBar({
  editing,
  saving,
  resetting,
  hasOverride,
  startEditing,
  handleSave,
  cancelEditing,
  handleReset,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {!editing ? (
        <>
          <button
            type="button"
            onClick={startEditing}
            className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-800"
          >
            编辑 Spec
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting || !hasOverride}
            className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs text-amber-800 disabled:opacity-40"
          >
            {resetting ? "重置中…" : "重置为 LLM 提取"}
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {saving ? "保存中…" : "保存 Spec"}
          </button>
          <button
            type="button"
            onClick={cancelEditing}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
        </>
      )}
    </div>
  );
}
