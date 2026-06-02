"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Spec 编辑面板 — P0: 让用户查看、编辑、保存 App Spec
 * 放置在项目详情页的报告区和 CodegenPanel 之间
 */

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

type AppSpec = {
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

const SCREEN_TYPES = ["tabRoot", "list", "detail", "form", "placeholder"];
const FIELD_TYPES = ["uuid", "string", "int", "float", "bool", "datetime", "json"];

const SOURCE_LABELS: Record<string, string> = {
  "report-llm": "LLM 从报告提取",
  "title-heuristic": "标题启发式（回退）",
  "user-edited": "用户已编辑"
};

export function SpecEditorPanel({ projectId, embedded = false }: {
  projectId: string;
  embedded?: boolean;
}) {
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
    if (res.ok) {
      setSpecInfo(data);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchSpec();
  }, [fetchSpec]);

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
      if (!res.ok) {
        throw new Error(data.error ?? "保存失败");
      }
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
      if (!res.ok) {
        throw new Error(data.error ?? "重置失败");
      }
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
    const newScreen: SpecScreen = {
      id: newId,
      title: `新页面 ${editSpec.screens.length + 1}`,
      type: "placeholder"
    };
    setEditSpec({ ...editSpec, screens: [...editSpec.screens, newScreen] });
  }

  function removeScreen(index: number) {
    if (!editSpec || editSpec.screens.length <= 1) return;
    const screens = editSpec.screens.filter((_, i) => i !== index);
    setEditSpec({ ...editSpec, screens });
  }

  function addEntity() {
    if (!editSpec) return;
    const entities = editSpec.entities ?? [];
    const newEntity: SpecEntity = {
      name: `entity_${entities.length + 1}`,
      fields: [{ name: "id", type: "uuid", primary: true }]
    };
    setEditSpec({ ...editSpec, entities: [...entities, newEntity] });
  }

  function removeEntity(index: number) {
    if (!editSpec) return;
    const entities = (editSpec.entities ?? []).filter((_, i) => i !== index);
    setEditSpec({ ...editSpec, entities });
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

  const shellClass = embedded
    ? ""
    : "rounded-xl border border-violet-200 bg-violet-50/60 p-4";

  return (
    <div className={shellClass}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-violet-950">
          App Spec 预览与编辑
        </h3>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] text-violet-800">
          {SOURCE_LABELS[source] ?? source}
          {hasOverride && !source.includes("user-edited") ? "（有覆盖）" : ""}
        </span>
      </div>

      <p className="mt-1 text-xs text-violet-800/80">
        Spec 决定了代码生成的结构：包括页面列表、实体定义和导航配置。编辑后保存，后续代码生成将使用编辑版本。
      </p>

      {error ? (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      {successMsg ? (
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {successMsg}
        </p>
      ) : null}

      {!spec ? (
        <p className="mt-3 text-xs text-violet-500">
          请先完成 8 Agent 生成后查看 Spec
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {/* 基本信息 */}
          <div className="rounded-lg bg-white/80 px-3 py-2 text-xs text-violet-900">
            <p><strong>显示名称：</strong>{spec.displayName}</p>
            <p><strong>App 标识：</strong>{spec.appName}</p>
            <p><strong>Spec 版本：</strong>{spec.specVersion}</p>
          </div>

          {/* Screens */}
          <div className="rounded-lg border border-violet-200 bg-white/80">
            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === "screens" ? null : "screens")}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-violet-900"
            >
              <span>📱 页面 ({spec.screens.length})</span>
              <span className="text-violet-500">{expandedSection === "screens" ? "▲" : "▼"}</span>
            </button>
            {expandedSection === "screens" && (
              <div className="border-t border-violet-100 px-3 py-2">
                {editing && (
                  <button
                    type="button"
                    onClick={addScreen}
                    className="mb-2 rounded border border-violet-300 px-2 py-1 text-[10px] text-violet-700 hover:bg-violet-50"
                  >
                    + 添加页面
                  </button>
                )}
                <div className="space-y-2">
                  {spec.screens.map((screen, i) => (
                    <div key={i} className="flex items-center gap-2 rounded bg-violet-50 px-2 py-1">
                      {editing ? (
                        <>
                          <input
                            value={screen.id}
                            onChange={(e) => updateScreen(i, "id", e.target.value)}
                            className="w-28 rounded border border-violet-200 px-1 py-0.5 text-[10px]"
                            placeholder="id"
                          />
                          <input
                            value={screen.title}
                            onChange={(e) => updateScreen(i, "title", e.target.value)}
                            className="w-28 rounded border border-violet-200 px-1 py-0.5 text-[10px]"
                            placeholder="标题"
                          />
                          <select
                            value={screen.type}
                            onChange={(e) => updateScreen(i, "type", e.target.value)}
                            className="rounded border border-violet-200 px-1 py-0.5 text-[10px]"
                          >
                            {SCREEN_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                          {(screen.type === "list" || screen.type === "detail") && (
                            <input
                              value={screen.entity ?? ""}
                              onChange={(e) => updateScreen(i, "entity", e.target.value)}
                              className="w-20 rounded border border-violet-200 px-1 py-0.5 text-[10px]"
                              placeholder="实体"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeScreen(i)}
                            className="ml-auto text-[10px] text-red-600"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px]">
                          <span className="font-mono text-violet-700">{screen.id}</span>
                          {" — "}
                          {screen.title}
                          <span className="ml-1 rounded bg-violet-100 px-1 text-[9px] text-violet-600">
                            {screen.type}
                          </span>
                          {screen.entity && (
                            <span className="ml-1 rounded bg-amber-100 px-1 text-[9px] text-amber-800">
                              实体: {screen.entity}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Entities */}
          <div className="rounded-lg border border-violet-200 bg-white/80">
            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === "entities" ? null : "entities")}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-violet-900"
            >
              <span>🗄️ 实体 ({(spec.entities ?? []).length})</span>
              <span className="text-violet-500">{expandedSection === "entities" ? "▲" : "▼"}</span>
            </button>
            {expandedSection === "entities" && (
              <div className="border-t border-violet-100 px-3 py-2">
                {editing && (
                  <button
                    type="button"
                    onClick={addEntity}
                    className="mb-2 rounded border border-violet-300 px-2 py-1 text-[10px] text-violet-700 hover:bg-violet-50"
                  >
                    + 添加实体
                  </button>
                )}
                {(spec.entities ?? []).length === 0 ? (
                  <p className="text-[10px] text-violet-500">暂无实体定义</p>
                ) : (
                  <div className="space-y-3">
                    {(spec.entities ?? []).map((entity, ei) => (
                      <div key={ei} className="rounded bg-violet-50 px-2 py-1.5">
                        {editing ? (
                          <input
                            value={entity.name}
                            onChange={(e) => updateEntityName(ei, e.target.value)}
                            className="mb-1 w-40 rounded border border-violet-200 px-1 py-0.5 text-[11px] font-medium"
                          />
                        ) : (
                          <p className="text-[11px] font-medium text-violet-900">{entity.name}</p>
                        )}
                        <div className="mt-1 space-y-1">
                          {entity.fields.map((field, fi) => (
                            <div key={fi} className="flex items-center gap-1 text-[10px] text-violet-700">
                              {editing ? (
                                <>
                                  <input
                                    value={field.name}
                                    onChange={(e) => updateEntityField(ei, fi, "name", e.target.value)}
                                    className="w-24 rounded border border-violet-200 px-1 py-0.5"
                                  />
                                  <select
                                    value={field.type}
                                    onChange={(e) => updateEntityField(ei, fi, "type", e.target.value)}
                                    className="rounded border border-violet-200 px-1 py-0.5"
                                  >
                                    {FIELD_TYPES.map((t) => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                  <label className="flex items-center gap-0.5">
                                    <input
                                      type="checkbox"
                                      checked={field.primary === true}
                                      onChange={() => updateEntityField(ei, fi, "primary", "")}
                                      className="rounded"
                                    />
                                    PK
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => removeEntityField(ei, fi)}
                                    className="text-red-600"
                                  >
                                    ✕
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="font-mono">{field.name}</span>
                                  <span className="rounded bg-violet-200 px-1 text-[9px]">{field.type}</span>
                                  {field.primary && <span className="text-amber-700">PK</span>}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                        {editing && (
                          <button
                            type="button"
                            onClick={() => addEntityField(ei)}
                            className="mt-1 rounded border border-violet-300 px-1.5 py-0.5 text-[9px] text-violet-600 hover:bg-violet-100"
                          >
                            + 添加字段
                          </button>
                        )}
                        {editing && (
                          <button
                            type="button"
                            onClick={() => removeEntity(ei)}
                            className="ml-2 mt-1 rounded border border-red-200 px-1.5 py-0.5 text-[9px] text-red-600 hover:bg-red-50"
                          >
                            删除实体
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="rounded-lg border border-violet-200 bg-white/80">
            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === "nav" ? null : "nav")}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-violet-900"
            >
              <span>🧭 导航 ({spec.navigation?.tabs?.length ?? 0} 个 Tab)</span>
              <span className="text-violet-500">{expandedSection === "nav" ? "▲" : "▼"}</span>
            </button>
            {expandedSection === "nav" && (
              <div className="border-t border-violet-100 px-3 py-2">
                <div className="flex flex-wrap gap-1.5">
                  {(spec.navigation?.tabs ?? []).map((tab, i) => (
                    <div key={i} className="rounded bg-violet-100 px-2 py-0.5 text-[10px] text-violet-800">
                      {editing ? (
                        <input
                          value={tab}
                          onChange={(e) => updateTab(i, e.target.value)}
                          className="w-28 rounded border border-violet-200 px-1 py-0.5 text-[10px]"
                        />
                      ) : (
                        tab
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
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
        </div>
      )}
    </div>
  );
}
