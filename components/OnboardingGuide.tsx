"use client";

import { useState } from "react";
import { TEMPLATE_LIBRARY } from "@/lib/app-spec/template-library";

const STEPS = [
  { title: "选择模板或自由创建", desc: "5 套预置 App 模板，一键开始" },
  { title: "AI 团队自动生产", desc: "9 Agent 串行协作，10-30 秒完成" },
  { title: "下载代码或一键部署", desc: "Flutter / 微信小程序 / 鸿蒙 + 后端 API" },
];

export function OnboardingGuide({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(0);
  const [showTemplates, setShowTemplates] = useState(false);

  return (
    <div className="rounded-2xl border border-violet-200 bg-white p-6 shadow-sm">
      {/* 步骤指示器 */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i <= step ? "bg-violet-700 text-white" : "bg-gray-100 text-gray-400"}`}>
              {i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={`h-0.5 w-8 ${i < step ? "bg-violet-700" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      <h3 className="text-lg font-bold text-gray-900">{STEPS[step].title}</h3>
      <p className="mt-1 text-sm text-gray-600">{STEPS[step].desc}</p>

      {/* 步骤内容 */}
      {step === 0 && (
        <div className="mt-4">
          {!showTemplates ? (
            <div className="flex gap-3">
              <button onClick={() => setShowTemplates(true)} className="rounded-lg bg-violet-700 px-4 py-2 text-sm text-white">从模板开始</button>
              <button onClick={() => { setStep(1); onComplete?.(); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">自由创建</button>
            </div>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {TEMPLATE_LIBRARY.map((tmpl) => (
                <button key={tmpl.id} onClick={async () => {
                  const res = await fetch("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: tmpl.id, title: tmpl.name }) });
                  const data = await res.json();
                  if (data.ok && data.project?.id) {
                    window.location.href = `/projects/${data.project.id}`;
                  }
                }} className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-left text-sm hover:bg-violet-100 transition">
                  <span className="text-xl">{tmpl.icon}</span>
                  <p className="mt-1 font-medium">{tmpl.name}</p>
                  <p className="text-xs text-gray-500">{tmpl.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-violet-700" />
            CEO → 产品经理 → 架构师 → 设计师 → 开发 → 测试 → 商业顾问
          </div>
          <button onClick={() => setStep(2)} className="mt-4 rounded-lg bg-violet-700 px-4 py-2 text-sm text-white">下一步</button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          <p>✅ Flutter (iOS/Android/Mac/Win/Web)</p>
          <p>✅ 微信小程序</p>
          <p>✅ 鸿蒙 ArkTS</p>
          <p>✅ Supabase 后端 API + 建表 SQL</p>
          <button onClick={onComplete} className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white">开始使用</button>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {step > 0 && <button onClick={() => setStep(step - 1)} className="rounded-lg border px-3 py-1 text-xs">← 上一步</button>}
        <button onClick={onComplete} className="rounded-lg px-3 py-1 text-xs text-gray-400">跳过引导</button>
      </div>
    </div>
  );
}
