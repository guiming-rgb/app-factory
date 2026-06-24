"use client";

import { SpecVersionPanel } from "./SpecVersionPanel";
import { useSpecEditor } from "./SpecEditorPanel/useSpecEditor";
import { SpecInfoBar } from "./SpecEditorPanel/SpecInfoBar";
import { SpecBasicInfo } from "./SpecEditorPanel/SpecBasicInfo";
import { SpecSectionList } from "./SpecEditorPanel/SpecSectionList";
import { SpecActionBar } from "./SpecEditorPanel/SpecActionBar";

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

  const shellClass = embedded ? "" : "rounded-xl border border-violet-200 bg-violet-50/60 p-4";

  return (
    <div className={shellClass}>
      <SpecInfoBar source={source} hasOverride={hasOverride} />
      <SpecVersionPanel projectId={projectId} currentSpec={spec as Record<string, unknown> | null} onRestore={fetchSpec} />
      {error && <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      {successMsg && <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{successMsg}</p>}
      {!spec ? (
        <p className="mt-3 text-xs text-violet-500">请先完成 8 Agent 生成后查看 Spec</p>
      ) : (
        <>
          <SpecBasicInfo spec={spec} />
          <SpecSectionList spec={spec} editing={editing} expandedSection={expandedSection} setExpandedSection={setExpandedSection}
            addScreen={addScreen} removeScreen={removeScreen} updateScreen={updateScreen}
            addEntity={addEntity} removeEntity={removeEntity} updateEntityName={updateEntityName}
            addEntityField={addEntityField} updateEntityField={updateEntityField} removeEntityField={removeEntityField}
            updateTab={updateTab} />
          <SpecActionBar editing={editing} saving={saving} resetting={resetting} hasOverride={hasOverride}
            startEditing={startEditing} handleSave={handleSave} cancelEditing={cancelEditing} handleReset={handleReset} />
        </>
      )}
    </div>
  );
}
