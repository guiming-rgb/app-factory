"use client";

type Props = {
  editing: boolean;
  tabs: string[];
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (i: number, value: string) => void;
};

export function NavigationSection({ editing, tabs, expanded, onToggle, onUpdate }: Props) {
  return (
    <div className="rounded-lg border border-violet-200 bg-white/80">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-violet-900"
      >
        <span>🧭 导航 ({tabs.length} 个 Tab)</span>
        <span className="text-violet-500">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="border-t border-violet-100 px-3 py-2">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((tab, i) => (
              <div key={i} className="rounded bg-violet-100 px-2 py-0.5 text-[10px] text-violet-800">
                {editing ? (
                  <input value={tab} onChange={(e) => onUpdate(i, e.target.value)} className="w-28 rounded border border-violet-200 px-1 py-0.5 text-[10px]" />
                ) : (
                  tab
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
