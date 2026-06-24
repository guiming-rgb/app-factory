"use client";

import { SOURCE_LABELS } from "./useSpecEditor";

type Props = {
  source: string;
  hasOverride: boolean;
};

/**
 * App Spec 信息栏：标题、来源标签、描述
 */
export function SpecInfoBar({ source, hasOverride }: Props) {
  return (
    <>
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
    </>
  );
}
