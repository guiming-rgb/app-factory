"use client";

import type { AppSpec } from "./useSpecEditor";

type Props = {
  spec: AppSpec;
};

/**
 * Spec 基本信息卡片：显示名称、App 标识、Spec 版本
 */
export function SpecBasicInfo({ spec }: Props) {
  return (
    <div className="rounded-lg bg-white/80 px-3 py-2 text-xs text-violet-900">
      <p><strong>显示名称：</strong>{spec.displayName}</p>
      <p><strong>App 标识：</strong>{spec.appName}</p>
      <p><strong>Spec 版本：</strong>{spec.specVersion}</p>
    </div>
  );
}
