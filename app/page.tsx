import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export default async function HomePage() {
  let plans: { id: string; name: string; tier: string; price: number; features: string[]; limits: Record<string, number> }[] = [];
  try {
    const plansRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/billing/plans`, {
      next: { revalidate: 300 },
    });
    if (plansRes.ok) {
      const data = await plansRes.json();
      plans = data.plans ?? [];
    }
  } catch {
    // Fallback plans
    plans = [];
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 text-xs font-bold text-white">
              A
            </div>
            <span className="text-base font-bold text-gray-950">App 生产工厂</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              登录
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700 shadow-sm"
            >
              免费注册
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700">
          <span className="h-2 w-2 rounded-full bg-violet-500" />
          AI 驱动 · 三平台 · 一键生成
        </div>
        <h1 className="mt-8 text-5xl font-extrabold tracking-tight text-gray-950 md:text-7xl">
          AI 描述即生成
          <br />
          <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
            三平台应用
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
          输入你的 App 想法，AI 团队自动完成产品设计、架构规划、代码生成。
          同时输出 Flutter / 微信小程序 / 鸿蒙三平台源码，附带数据库和后端 API。
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/onboarding"
            className="rounded-xl bg-violet-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-violet-700 shadow-lg shadow-violet-200 transition-all hover:shadow-xl"
          >
            免费开始
          </Link>
          <Link
            href="#how-it-works"
            className="rounded-xl border border-gray-300 px-8 py-3.5 text-base font-medium text-gray-700 hover:bg-gray-50"
          >
            了解详情
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-400">无需信用卡 · 2 分钟从想法到代码</p>

        {/* Social proof */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
          <span className="font-semibold text-gray-700">已有 500+ 应用生成</span>
          <span className="hidden sm:inline">·</span>
          <span>覆盖 20+ 行业</span>
          <span className="hidden sm:inline">·</span>
          <span>三平台 100% 覆盖</span>
        </div>
      </section>

      {/* Platform badges */}
      <section className="border-y border-gray-100 bg-gray-50 py-10">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-center text-sm font-medium text-gray-500">支持平台</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
            {[
              { name: 'Flutter', desc: 'iOS / Android', color: 'bg-blue-50 text-blue-700' },
              { name: '微信小程序', desc: '微信生态', color: 'bg-emerald-50 text-emerald-700' },
              { name: '鸿蒙 HarmonyOS', desc: '原生应用', color: 'bg-red-50 text-red-700' },
            ].map((p) => (
              <div
                key={p.name}
                className={`flex items-center gap-3 rounded-xl px-5 py-3 ${p.color}`}
              >
                <span className="font-bold">{p.name}</span>
                <span className="text-xs opacity-75">{p.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold text-gray-950">
          为什么选择 App 生产工厂？
        </h2>
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                </svg>
              ),
              title: 'AI 驱动',
              desc: '8 个 AI Agent 协同工作——CEO、产品经理、架构师、设计师、开发者、测试工程师各司其职。',
            },
            {
              icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                </svg>
              ),
              title: '三平台',
              desc: '一次描述，同时生成 Flutter、微信小程序、鸿蒙 ArkTS 三平台源码，覆盖全部主流移动端。',
            },
            {
              icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              ),
              title: '20+ 行业模板',
              desc: '金融、电商、社交、CRM、博客、健身、教育等预置模板，快速启动你的项目。',
            },
            {
              icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              ),
              title: '一键发布',
              desc: 'GitHub 推送、桌面打包、Vercel 部署一键完成，真正实现从想法到上线。',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                {f.icon}
              </div>
              <h3 className="mt-5 text-lg font-bold text-gray-950">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-gray-50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-950">三步生成你的 App</h2>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                step: '01',
                title: '描述你的想法',
                desc: '用自然语言描述 App 需求，或选择行业模板作为起点。AI 会自动分析并完成需求文档。',
                color: 'bg-violet-100 text-violet-700',
              },
              {
                step: '02',
                title: 'AI 生成代码',
                desc: '8 个 AI Agent 并行工作——产品设计、架构规划、UI 设计、代码实现、测试验证全自动完成。',
                color: 'bg-emerald-100 text-emerald-700',
              },
              {
                step: '03',
                title: '下载与发布',
                desc: '一键下载三平台源码，或直接推送到 GitHub、打包桌面应用、部署到 Vercel。',
                color: 'bg-blue-100 text-blue-700',
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div
                  className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold ${s.color}`}
                >
                  {s.step}
                </div>
                <h3 className="mt-6 text-xl font-bold text-gray-950">{s.title}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-center text-3xl font-bold text-gray-950">灵活的定价方案</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-gray-500">
          从小规模尝试到企业级部署，我们提供适合各种需求的方案
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.length > 0
            ? plans.map((plan) => (
                <PricingCard key={plan.id} plan={plan} />
              ))
            : [
                {
                  id: 'free',
                  name: 'Free',
                  tier: 'free',
                  price: 0,
                  features: ['3 个项目', '10 次代码生成 / 月', '100MB 存储', '1 个成员', '社区支持'],
                  limits: { projects: 3, codegenPerMonth: 10, storageMB: 100, members: 1 },
                },
                {
                  id: 'pro',
                  name: 'Pro',
                  tier: 'pro',
                  price: 199,
                  features: ['50 个项目', '500 次代码生成 / 月', '5GB 存储', '5 个成员', '优先支持', '高级模板'],
                  limits: { projects: 50, codegenPerMonth: 500, storageMB: 5120, members: 5 },
                },
                {
                  id: 'enterprise',
                  name: 'Enterprise',
                  tier: 'enterprise',
                  price: 999,
                  features: ['无限项目', '无限代码生成', '50GB 存储', '不限成员', '专属支持', '私有部署', '定制模板', 'SLA 保障'],
                  limits: { projects: 9999, codegenPerMonth: 9999, storageMB: 51200, members: 999 },
                },
              ].map((plan) => <PricingCard key={plan.id} plan={plan} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-violet-700 to-blue-700 py-20 text-center text-white">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-4xl font-bold">准备好开始了吗？</h2>
          <p className="mt-4 text-lg text-violet-200">
            2 分钟从想法到可运行的应用代码，完全免费开始
          </p>
          <Link
            href="/onboarding"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-violet-700 hover:bg-violet-50 shadow-xl transition-all"
          >
            免费开始创建
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-blue-600 text-[10px] font-bold text-white">
                  A
                </div>
                <span className="text-sm font-bold text-gray-950">App 生产工厂</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-gray-400">
                AI 原生软件生产平台。输入想法，输出三平台应用源码。
              </p>
            </div>
            {[
              {
                title: '产品',
                links: [
                  { label: '功能特性', href: '#features' },
                  { label: '定价', href: '#pricing' },
                  { label: '模板市场', href: '#' },
                  { label: '更新日志', href: '#' },
                ],
              },
              {
                title: '支持',
                links: [
                  { label: '文档', href: '/docs/' },
                  { label: 'API 参考', href: '#' },
                  { label: '状态页', href: '/health' },
                  { label: '联系我们', href: '#' },
                ],
              },
              {
                title: '法律',
                links: [
                  { label: '隐私政策', href: '/privacy' },
                  { label: '服务条款', href: '/terms' },
                  { label: 'Cookie 政策', href: '#' },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-sm font-semibold text-gray-900">{col.title}</p>
                <ul className="mt-4 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-xs text-gray-400 hover:text-gray-700"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} App 生产工厂。保留所有权利。
          </div>
        </div>
      </footer>
    </main>
  );
}

function PricingCard({
  plan,
}: {
  plan: { id: string; name: string; tier: string; price: number; features: string[] };
}) {
  const isPro = plan.tier === 'pro';
  const isEnterprise = plan.tier === 'enterprise';

  return (
    <div
      className={`relative rounded-2xl border-2 p-8 ${
        isPro
          ? 'border-violet-500 bg-violet-50 shadow-lg shadow-violet-100'
          : 'border-gray-200 bg-white'
      }`}
    >
      {isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-4 py-1 text-xs font-bold text-white">
          最受欢迎
        </div>
      )}
      <h3 className="text-xl font-bold text-gray-950">{plan.name}</h3>
      <p className="mt-3">
        <span className="text-4xl font-bold text-gray-950">
          ¥{plan.price}
        </span>
        <span className="text-sm text-gray-400">/月</span>
      </p>
      <ul className="mt-8 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={plan.price === 0 ? '/onboarding' : '/signup'}
        className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold ${
          isPro
            ? 'bg-violet-600 text-white hover:bg-violet-700'
            : isEnterprise
            ? 'bg-gray-950 text-white hover:bg-gray-800'
            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        {plan.price === 0 ? '免费开始' : '订阅'}
      </Link>
    </div>
  );
}
