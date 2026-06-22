"use client";

import type { AppSpec } from "./useSpecEditor";
import { FIELD_TYPES } from "./useSpecEditor";

type Props = {
  editing: boolean;
  entities: NonNullable<AppSpec["entities"]>;
  expanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdateName: (i: number, name: string) => void;
  onAddField: (entityIndex: number) => void;
  onUpdateField: (entityIndex: number, fieldIndex: number, field: string, value: string) => void;
  onRemoveField: (entityIndex: number, fieldIndex: number) => void;
};

export function EntitySection({ editing, entities, expanded, onToggle, onAdd, onRemove, onUpdateName, onAddField, onUpdateField, onRemoveField }: Props) {
  return (
    <div className="rounded-lg border border-violet-200 bg-white/80">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-violet-900"
      >
        <span>🗄️ 实体 ({entities.length})</span>
        <span className="text-violet-500">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="border-t border-violet-100 px-3 py-2">
          {editing && (
            <button type="button" onClick={onAdd} className="mb-2 rounded border border-violet-300 px-2 py-1 text-[10px] text-violet-700 hover:bg-violet-50">
              + 添加实体
            </button>
          )}
          {entities.length === 0 ? (
            <p className="text-[10px] text-violet-500">暂无实体定义</p>
          ) : (
            <div className="space-y-3">
              {entities.map((entity, ei) => (
                <div key={ei} className="rounded bg-violet-50 px-2 py-1.5">
                  {editing ? (
                    <input value={entity.name} onChange={(e) => onUpdateName(ei, e.target.value)} className="mb-1 w-40 rounded border border-violet-200 px-1 py-0.5 text-[11px] font-medium" />
                  ) : (
                    <p className="text-[11px] font-medium text-violet-900">{entity.name}</p>
                  )}
                  <div className="mt-1 space-y-1">
                    {entity.fields.map((field, fi) => (
                      <div key={fi} className="flex items-center gap-1 text-[10px] text-violet-700">
                        {editing ? (
                          <>
                            <input value={field.name} onChange={(e) => onUpdateField(ei, fi, "name", e.target.value)} className="w-24 rounded border border-violet-200 px-1 py-0.5" />
                            <select value={field.type} onChange={(e) => onUpdateField(ei, fi, "type", e.target.value)} className="rounded border border-violet-200 px-1 py-0.5">
                              {FIELD_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                            </select>
                            <label className="flex items-center gap-0.5">
                              <input type="checkbox" checked={field.primary === true} onChange={() => onUpdateField(ei, fi, "primary", "")} className="rounded" />
                              PK
                            </label>
                            <button type="button" onClick={() => onRemoveField(ei, fi)} className="text-red-600">✕</button>
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
                    <>
                      <button type="button" onClick={() => onAddField(ei)} className="mt-1 rounded border border-violet-300 px-1.5 py-0.5 text-[9px] text-violet-600 hover:bg-violet-100">
                        + 添加字段
                      </button>
                      <button type="button" onClick={() => onRemove(ei)} className="ml-2 mt-1 rounded border border-red-200 px-1.5 py-0.5 text-[9px] text-red-600 hover:bg-red-50">
                        删除实体
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
