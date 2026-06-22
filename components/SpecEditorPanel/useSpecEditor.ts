"use client";

import { useCallback, useEffect, useState } from "react";

// ---- Types (shared across SpecEditorPanel components) ----

type SpecScreen = {
  id: string;
  title: string;
  type: string;
  entity?: string;
  children?: string[];
};

type SpecEntity = {
  name: string;
  fields: Array<{ name: string; type: string; primary?: boolean; required?: boolean }>;
};

export type AppSpec = {
  specVersion: string;
  appName: string;
  displayName: string;
  screens: SpecScreen[];
  entities?: SpecEntity[];
  navigation?: { tabs?: string[] };
};

type SpecInfo = {
  spec: AppSpec | null;
  source: string;
  warning: string | null;
  specOverride: unknown;
};

// ---- Hook ----

export function useSpecEditor(projectId: string) {
  const [specInfo, setSpecInfo] = useState<SpecInfo | null>(null);
  const [editing, setEditing] = useState(false);
  const [editSpec, setEditSpec] = useState<AppSpec | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [expandedSection, setExpandedSection] = useState<"screens" | "entities" | "nav" | null>(null);

  const fetchSpec = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/spec`, { cache: "no-store" });
    const data = await res.json();
    if (res.ok) setSpecInfo(data);
  }, [projectId]);

  useEffect(() => { void fetchSpec(); }, [fetchSpec]);

  function startEditing() {
    if (specInfo?.spec) {
      setEditSpec(JSON.parse(JSON.stringify(specInfo.spec)));
      setEditing(true);
      setError("");
      setSuccessMsg("");
    }
  }

  function cancelEditing() {
    setEditing(false);
    setEditSpec(null);
    setError("");
  }

  async function handleSave() {
    if (!editSpec) return;
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch(`/api/projects/${projectId}/spec`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec: editSpec })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      setSuccessMsg("Spec 已保存，后续代码生成将使用编辑后的版本");
      setEditing(false);
      await fetchSpec();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/spec`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "重置失败");
      setSuccessMsg("已恢复为 LLM 自动提取的 Spec");
      setEditing(false);
      setEditSpec(null);
      await fetchSpec();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "重置失败");
    } finally {
      setResetting(false);
    }
  }

  function updateScreen(index: number, field: keyof SpecScreen, value: string) {
    if (!editSpec) return;
    const screens = [...editSpec.screens];
    screens[index] = { ...screens[index], [field]: value };
    setEditSpec({ ...editSpec, screens });
  }

  function addScreen() {
    if (!editSpec) return;
    const newId = `screen_${editSpec.screens.length + 1}`;
    setEditSpec({
      ...editSpec,
      screens: [...editSpec.screens, { id: newId, title: `新页面 ${editSpec.screens.length + 1}`, type: "placeholder" }]
    });
  }

  function removeScreen(index: number) {
    if (!editSpec || editSpec.screens.length <= 1) return;
    setEditSpec({ ...editSpec, screens: editSpec.screens.filter((_, i) => i !== index) });
  }

  function addEntity() {
    if (!editSpec) return;
    const entities = editSpec.entities ?? [];
    setEditSpec({ ...editSpec, entities: [...entities, { name: `entity_${entities.length + 1}`, fields: [{ name: "id", type: "uuid", primary: true }] }] });
  }

  function removeEntity(index: number) {
    if (!editSpec) return;
    setEditSpec({ ...editSpec, entities: (editSpec.entities ?? []).filter((_, i) => i !== index) });
  }

  function updateEntityName(index: number, name: string) {
    if (!editSpec) return;
    const entities = [...(editSpec.entities ?? [])];
    entities[index] = { ...entities[index], name };
    setEditSpec({ ...editSpec, entities });
  }

  function addEntityField(entityIndex: number) {
    if (!editSpec) return;
    const entities = [...(editSpec.entities ?? [])];
    const fields = [...entities[entityIndex].fields];
    fields.push({ name: `field_${fields.length + 1}`, type: "string" });
    entities[entityIndex] = { ...entities[entityIndex], fields };
    setEditSpec({ ...editSpec, entities });
  }

  function updateEntityField(entityIndex: number, fieldIndex: number, field: string, value: string) {
    if (!editSpec) return;
    const entities = [...(editSpec.entities ?? [])];
    const fields = [...entities[entityIndex].fields];
    if (field === "primary") {
      fields[fieldIndex] = { ...fields[fieldIndex], primary: !fields[fieldIndex].primary };
    } else {
      fields[fieldIndex] = { ...fields[fieldIndex], [field]: value };
    }
    entities[entityIndex] = { ...entities[entityIndex], fields };
    setEditSpec({ ...editSpec, entities });
  }

  function removeEntityField(entityIndex: number, fieldIndex: number) {
    if (!editSpec) return;
    const entities = [...(editSpec.entities ?? [])];
    const fields = entities[entityIndex].fields.filter((_, i) => i !== fieldIndex);
    if (fields.length === 0) return;
    entities[entityIndex] = { ...entities[entityIndex], fields };
    setEditSpec({ ...editSpec, entities });
  }

  function updateTab(index: number, value: string) {
    if (!editSpec) return;
    const tabs = [...(editSpec.navigation?.tabs ?? [])];
    tabs[index] = value;
    setEditSpec({ ...editSpec, navigation: { ...editSpec.navigation, tabs } });
  }

  const spec = editing ? editSpec : specInfo?.spec;
  const source = specInfo?.source ?? "";
  const hasOverride = specInfo?.specOverride != null;

  return {
    spec, source, hasOverride, editing, saving, resetting, error, successMsg,
    expandedSection, setExpandedSection,
    startEditing, cancelEditing, handleSave, handleReset,
    updateScreen, addScreen, removeScreen,
    addEntity, removeEntity, updateEntityName,
    addEntityField, updateEntityField, removeEntityField,
    updateTab, fetchSpec
  };
}

/** Source labels for display */
export const SOURCE_LABELS: Record<string, string> = {
  "report-llm": "LLM 从报告提取",
  "title-heuristic": "标题启发式（回退）",
  "user-edited": "用户已编辑"
};

/** Available screen types */
export const SCREEN_TYPES = ["tabRoot", "list", "detail", "form", "placeholder"];

/** Available field types */
export const FIELD_TYPES = ["uuid", "string", "int", "float", "bool", "datetime", "json"];
