'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type Step = 1 | 2 | 3 | 4 | 5;

const STORAGE_KEY = 'app-factory-onboarding';

interface OnboardingState {
  step: Step;
  workspaceName: string;
  industry: string;
  appIdea: string;
  projectId?: string;
  codegenRunId?: string;
}

const INDUSTRIES = [
  { id: 'finance', label: '金融理财', icon: '💰' },
  { id: 'ecommerce', label: '电商', icon: '🛍️' },
  { id: 'social', label: '社交', icon: '💬' },
  { id: 'crm', label: 'CRM / 企业管理', icon: '📊' },
  { id: 'health', label: '健康 / 健身', icon: '🏃' },
  { id: 'education', label: '教育', icon: '📚' },
  { id: 'blog', label: '博客 / 内容', icon: '✍️' },
  { id: 'custom', label: '自定义描述', icon: '✨' },
];

const DEFAULT_PLATFORMS = ['Flutter', '微信小程序', '鸿蒙'];

export default function OnboardingPage() {
  const router = useRouter();

  const [state, setState] = useState<OnboardingState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return { step: 1, workspaceName: '', industry: '', appIdea: '' };
  });

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [downloaded, setDownloaded] = useState(false);

  // Save state to localStorage
  const saveState = useCallback(
    (updates: Partial<OnboardingState>) => {
      setState((prev) => {
        const next = { ...prev, ...updates };
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        return next;
      });
    },
    []
  );

  // Step navigation
  const goTo = useCallback(
    (step: Step) => {
      saveState({ step });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [saveState]
  );

  const nextStep = useCallback(() => {
    if (state.step < 5) goTo((state.step + 1) as Step);
  }, [state.step, goTo]);

  const prevStep = useCallback(() => {
    if (state.step > 1) goTo((state.step - 1) as Step);
  }, [state.step, goTo]);

  // Step 3: Trigger codegen
  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setProgress('正在分析需求…');

    try {
      // Create project via API
      const projRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: state.appIdea || `${state.industry} App`,
          description: state.appIdea,
          industry: state.industry,
        }),
      });

      if (!projRes.ok) {
        const errData = await projRes.json();
        throw new Error(errData.error || '创建项目失败');
      }

      const { project } = await projRes.json();
      saveState({ projectId: project.id });

      setProgress('正在生成应用代码（多平台并行）…');

      // Trigger codegen
      const codegenRes = await fetch('/api/projects/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          platforms: ['flutter', 'wechat', 'harmony'],
        }),
      });

      if (!codegenRes.ok) {
        const errData = await codegenRes.json();
        throw new Error(errData.error || '代码生成启动失败');
      }

      const { runId } = await codegenRes.json();
      saveState({ codegenRunId: runId });

      setProgress('代码生成中，请稍候…');

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60;
      const pollInterval = 5000;

      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, pollInterval));
        attempts++;

        const statusRes = await fetch(`/api/projects/${project.id}/status`);
        if (!statusRes.ok) continue;

        const statusData = await statusRes.json();
        const run = statusData.codegenRuns?.find(
          (r: Record<string, unknown>) => r.id === runId
        );

        if (run) {
          const runStatus = run.status as string;
          setProgress(
            `代码生成中 (${attempts}/${maxAttempts})… 状态: ${runStatus}`
          );

          if (runStatus === 'completed' || runStatus === 'success') {
            setProgress('代码生成完成！');
            setLoading(false);
            nextStep();
            return;
          }

          if (runStatus === 'failed') {
            throw new Error(
              (run.error as string) || '代码生成失败，请稍后重试'
            );
          }
        }
      }

      throw new Error('生成超时，请稍后查看项目状态');
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
      setLoading(false);
    }
  };

  // Step 4: Download
  const handleDownload = (platform: string) => {
    // In a real implementation, this would trigger a file download
    // For now, we mark it as handled
    setDownloaded(true);
  };

  // Clean up local storage on completion
  const handleFinish = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    router.push('/projects');
  };

  // Step indicator
  const steps = [
    { num: 1, label: '创建工作区' },
    { num: 2, label: '描述需求' },
    { num: 3, label: '生成应用' },
    { num: 4, label: '预览下载' },
    { num: 5, label: '下一步' },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* Logo */}
      <div className="mb-8 flex items-center justify-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 text-xs font-bold text-white">
          A
        </div>
        <span className="text-sm font-bold text-gray-950">App 生产工厂</span>
      </div>

      {/* Progress bar */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          {steps.map((s) => (
            <div key={s.num} className="flex flex-col items-center">
              <button
                onClick={() => s.num < state.step && goTo(s.num as Step)}
                disabled={s.num > state.step}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  s.num === state.step
                    ? 'bg-violet-600 text-white'
                    : s.num < state.step
                    ? 'bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {s.num < state.step ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  s.num
                )}
              </button>
              <p
                className={`mt-1.5 text-xs font-medium ${
                  s.num <= state.step ? 'text-gray-700' : 'text-gray-400'
                }`}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>
        {/* Progress line */}
        <div className="relative mt-3">
          <div className="h-1 rounded-full bg-gray-200">
            <div
              className="h-1 rounded-full bg-violet-600 transition-all duration-500"
              style={{ width: `${((state.step - 1) / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={() => setError('')}
            className="ml-3 font-medium underline"
          >
            关闭
          </button>
        </div>
      )}

      {/* Step content */}
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        {/* Step 1: Welcome + Workspace Name */}
        {state.step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-950">
              欢迎来到 App 生产工厂！
            </h2>
            <p className="mt-2 text-gray-600">
              首先，为你的项目创建一个工作区。
            </p>

            <div className="mt-8 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  工作区名称
                </label>
                <input
                  type="text"
                  value={state.workspaceName}
                  onChange={(e) => saveState({ workspaceName: e.target.value })}
                  placeholder="例如：我的第一个 App"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <p className="text-xs text-gray-400">
                你可以稍后在设置中修改工作区名称和邀请团队成员。
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Select industry / describe idea */}
        {state.step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-950">
              你的 App 是什么？
            </h2>
            <p className="mt-2 text-gray-600">
              选择一个行业模板，或描述你的 App 想法。
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => saveState({ industry: ind.id })}
                  className={`rounded-xl border-2 p-4 text-center transition-all ${
                    state.industry === ind.id
                      ? 'border-violet-500 bg-violet-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{ind.icon}</span>
                  <p className="mt-2 text-xs font-medium text-gray-700">
                    {ind.label}
                  </p>
                </button>
              ))}
            </div>

            {state.industry && (
              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  详细描述你的 App 想法（可选）
                </label>
                <textarea
                  value={state.appIdea}
                  onChange={(e) => saveState({ appIdea: e.target.value })}
                  placeholder="例如：一个帮助用户记账的 App，支持分类统计、图表展示和预算管理…"
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
                <p className="mt-1 text-xs text-gray-400">
                  越详细，生成的 App 越符合你的需求。
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Generate */}
        {state.step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-950">
              生成你的 App
            </h2>
            <p className="mt-2 text-gray-600">
              AI 将同时为以下三平台生成代码：
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {DEFAULT_PLATFORMS.map((p) => (
                <div
                  key={p}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700"
                >
                  {p}
                </div>
              ))}
            </div>

            <div className="mt-8">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
                <p className="font-medium text-gray-900">生成概要</p>
                <ul className="mt-3 space-y-2">
                  <li>工作区：{state.workspaceName || '未命名'}</li>
                  <li>
                    行业：{INDUSTRIES.find((i) => i.id === state.industry)?.label ?? state.industry}
                  </li>
                  <li>
                    描述：{state.appIdea || '（未填写）'}
                  </li>
                  <li>平台：Flutter + 微信小程序 + 鸿蒙</li>
                </ul>
              </div>

              {loading && (
                <div className="mt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
                    <p className="text-sm text-gray-600">{progress}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Preview / Download */}
        {state.step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-950">
              你的 App 已生成！
            </h2>
            <p className="mt-2 text-gray-600">
              选择平台下载生成的代码，或在线预览。
            </p>

            <div className="mt-8 space-y-4">
              {DEFAULT_PLATFORMS.map((p, i) => {
                const platforms = ['flutter', 'wechat', 'harmony'];
                const colors = ['border-violet-200', 'border-emerald-200', 'border-blue-200'];
                return (
                  <div
                    key={p}
                    className={`rounded-xl border-2 ${colors[i]} bg-white p-5 flex items-center justify-between`}
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{p}</p>
                      <p className="text-xs text-gray-400">
                        {i === 0
                          ? 'iOS / Android'
                          : i === 1
                          ? '微信小程序'
                          : 'HarmonyOS'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleDownload(platforms[i])}
                        className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                      >
                        {downloaded ? '重新下载' : '下载'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {downloaded && (
              <p className="mt-4 text-sm text-emerald-600">
                下载已开始，文件将保存到你的电脑。
              </p>
            )}
          </div>
        )}

        {/* Step 5: Next Steps */}
        {state.step === 5 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-950">
              下一步做什么？
            </h2>
            <p className="mt-2 text-gray-600">
              你的 App 生成完成！以下是你可以继续做的事情：
            </p>

            <div className="mt-8 space-y-4">
              {[
                {
                  title: '自定义和迭代',
                  desc: '返回项目页面，可以继续修改需求、重新生成，或在生成的代码基础上手动定制。',
                  icon: '🎨',
                },
                {
                  title: '邀请团队成员',
                  desc: '创建工作区并邀请团队成员协作，共同开发和改进 App。',
                  icon: '👥',
                },
                {
                  title: '发布到应用商店',
                  desc: '将生成的 Flutter App 编译并发布到 App Store 和 Google Play。',
                  icon: '🚀',
                },
                {
                  title: '部署微信小程序',
                  desc: '上传生成的微信小程序代码到微信开发者工具，提交审核后即可上线。',
                  icon: '📱',
                },
                {
                  title: '探索组件市场',
                  desc: '从组件市场安装现成的行业组件，快速扩展你的 App 功能。',
                  icon: '🧩',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
          <div>
            {state.step > 1 && (
              <button
                onClick={prevStep}
                disabled={loading}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                上一步
              </button>
            )}
            {state.step === 1 && (
              <Link
                href="/"
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                跳过
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            {state.step < 5 && (
              <Link
                href={state.step === 4 ? '/projects' : '/'}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                跳过此步骤
              </Link>
            )}
            {state.step === 1 && (
              <button
                onClick={nextStep}
                disabled={!state.workspaceName.trim()}
                className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                继续
              </button>
            )}
            {state.step === 2 && (
              <button
                onClick={nextStep}
                disabled={!state.industry}
                className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                继续
              </button>
            )}
            {state.step === 3 && !loading && (
              <button
                onClick={handleGenerate}
                className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
              >
                开始生成
              </button>
            )}
            {state.step === 4 && (
              <button
                onClick={nextStep}
                className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
              >
                继续
              </button>
            )}
            {state.step === 5 && (
              <button
                onClick={handleFinish}
                className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
              >
                完成，进入项目页
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
