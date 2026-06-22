"use client";

import type { AppSpec } from "./useSpecEditor";
import { SCREEN_TYPES } from "./useSpecEditor";

type Props = {
  editing: boolean;
  screens: AppSpec["screens"];
  expanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, field: "id" | "title" | "type" | "entity", value: string) => void;
};

export function ScreenSection({ editing, screens, expanded, onToggle, onAdd, onRemove, onUpdate }: Props) {
  return (
    <div className="rounded-lg border border-violet-200 bg-white/80">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-violet-900"
      >
        <span>📱 页面 ({screens.length})</span>
        <span className="text-violet-500">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="border-t border-violet-100 px-3 py-2">
          {editing && (
            <button type="button" onClick={onAdd} className="mb-2 rounded border border-violet-300 px-2 py-1 text-[10px] text-violet-700 hover:bg-violet-50">
              + 添加页面
            </button>
          )}
          <div className="space-y-2">
            {screens.map((screen, i) => (
              <div key={i} className="flex items-center gap-2 rounded bg-violet-50 px-2 py-1">
                {editing ? (
                  <>
                    <input value={screen.id} onChange={(e) => onUpdate(i, "id", e.target.value)} className="w-28 rounded border border-violet-200 px-1 py-0.5 text-[10px]" placeholder="id" />
                    <input value={screen.title} onChange={(e) => onUpdate(i, "title", e.target.value)} className="w-28 rounded border border-violet-200 px-1 py-0.5 text-[10px]" placeholder="标题" />
                    <select value={screen.type} onChange={(e) => onUpdate(i, "type", e.target.value)} className="rounded border border-violet-200 px-1 py-0.5 text-[10px]">
                      {SCREEN_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                    </select>
                    {(screen.type === "list" || screen.type === "detail") && (
                      <input value={screen.entity ?? ""} onChange={(e) => onUpdate(i, "entity", e.target.value)} className="w-20 rounded border border-violet-200 px-1 py-0.5 text-[10px]" placeholder="实体" />
                    )}
                    <button type="button" onClick={() => onRemove(i)} className="ml-auto text-[10px] text-red-600">✕</button>
                  </>
                ) : (
                  <span className="text-[11px]">
                    <span className="font-mono text-violet-700">{screen.id}</span>
                    {" — "}{screen.title}
                    <span className="ml-1 rounded bg-violet-100 px-1 text-[9px] text-violet-600">{screen.type}</span>
                    {screen.entity && <span className="ml-1 rounded bg-amber-100 px-1 text-[9px] text-amber-800">实体: {screen.entity}</span>}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
