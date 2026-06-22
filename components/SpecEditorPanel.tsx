"use client";

import { SpecVersionPanel } from "./SpecVersionPanel";
import { ScreenSection } from "./SpecEditorPanel/ScreenSection";
import { EntitySection } from "./SpecEditorPanel/EntitySection";
import { NavigationSection } from "./SpecEditorPanel/NavigationSection";
import { useSpecEditor, SOURCE_LABELS } from "./SpecEditorPanel/useSpecEditor";

export type { AppSpec } from "./SpecEditorPanel/useSpecEditor";

export function SpecEditorPanel({ projectId, embedded = false }: {
  projectId: string;
  embedded?: boolean;
}) {
  const {
    spec, source, hasOverride, editing, saving, resetting, error, successMsg,
    expandedSection, setExpandedSection,
    startEditing, cancelEditing, handleSave, handleReset,
    updateScreen, addScreen, removeScreen,
    addEntity, removeEntity, updateEntityName,
    addEntityField, updateEntityField, removeEntityField,
    updateTab, fetchSpec
  } = useSpecEditor(projectId);

  const shellClass = embedded
    ? ""
    : "rounded-xl border border-violet-200 bg-violet-50/60 p-4";

  return (
    <div className={shellClass}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-violet-950">App Spec 预览与编辑</h3>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] text-violet-800">
          {SOURCE_LABELS[source] ?? source}
          {hasOverride && !source.includes("user-edited") ? "（有覆盖）" : ""}
        </span>
      </div>

      <p className="mt-1 text-xs text-violet-800/80">
        Spec 决定了代码生成的结构：包括页面列表、实体定义和导航配置。编辑后保存，后续代码生成将使用编辑版本。
      </p>

      <SpecVersionPanel
        projectId={projectId}
        currentSpec={spec as Record<string, unknown> | null}
        onRestore={fetchSpec}
      />

      {error && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}
      {successMsg && (
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{successMsg}</p>
      )}

      {!spec ? (
        <p className="mt-3 text-xs text-violet-500">请先完成 8 Agent 生成后查看 Spec</p>
      ) : (
        <div className="mt-3 space-y-3">
          {/* 基本信息 */}
          <div className="rounded-lg bg-white/80 px-3 py-2 text-xs text-violet-900">
            <p><strong>显示名称：</strong>{spec.displayName}</p>
            <p><strong>App 标识：</strong>{spec.appName}</p>
            <p><strong>Spec 版本：</strong>{spec.specVersion}</p>
          </div>

          {/* 三个可展开的编辑区 */}
          <ScreenSection
            editing={editing}
            screens={spec.screens}
            expanded={expandedSection === "screens"}
            onToggle={() => setExpandedSection(expandedSection === "screens" ? null : "screens")}
            onAdd={addScreen}
            onRemove={removeScreen}
            onUpdate={updateScreen}
          />

          <EntitySection
            editing={editing}
            entities={spec.entities ?? []}
            expanded={expandedSection === "entities"}
            onToggle={() => setExpandedSection(expandedSection === "entities" ? null : "entities")}
            onAdd={addEntity}
            onRemove={removeEntity}
            onUpdateName={updateEntityName}
            onAddField={addEntityField}
            onUpdateField={updateEntityField}
            onRemoveField={removeEntityField}
          />

          <NavigationSection
            editing={editing}
            tabs={spec.navigation?.tabs ?? []}
            expanded={expandedSection === "nav"}
            onToggle={() => setExpandedSection(expandedSection === "nav" ? null : "nav")}
            onUpdate={updateTab}
          />

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2">
            {!editing ? (
              <>
                <button type="button" onClick={startEditing} className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-800">
                  编辑 Spec
                </button>
                <button type="button" onClick={handleReset} disabled={resetting || !hasOverride} className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs text-amber-800 disabled:opacity-40">
                  {resetting ? "重置中…" : "重置为 LLM 提取"}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50">
                  {saving ? "保存中…" : "保存 Spec"}
                </button>
                <button type="button" onClick={cancelEditing} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                  取消
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
