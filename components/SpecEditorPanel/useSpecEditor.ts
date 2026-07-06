"use client";

import { useCallback, useEffect, useState } from "react";
import { useSpecScreens } from "./useSpecScreens";
import { useSpecEntities } from "./useSpecEntities";

// ---- Types (shared across SpecEditorPanel components) ----

export type SpecScreen = {
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

  // ── P2-14: 领域 hooks 替代内联 CRUD ──
  const setEditSpecWrapper = (s: AppSpec) => setEditSpec(s);
  const { updateScreen, addScreen, removeScreen } = useSpecScreens(editSpec, setEditSpecWrapper);
  const { addEntity, removeEntity, updateEntityName, addEntityField, updateEntityField, removeEntityField } = useSpecEntities(editSpec, setEditSpecWrapper);

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
export const SCREEN_TYPES = ["tabRoot", "list", "detail", "form", "placeholder", "dashboard", "card_grid", "calendar", "chart", "kanban", "onboarding", "map", "chat", "call", "iot", "game", "ar", "medical", "automotive", "banking", "insurance", "kyc"];

/** Available field types */
export const FIELD_TYPES = ["uuid", "string", "int", "float", "bool", "datetime", "json"];
