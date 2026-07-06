import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-16 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-950 md:text-7xl">
          AI 原生<br /><span className="text-violet-700">软件生产工厂</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
          输入一个想法，AI 团队自动完成产品设计、架构规划、代码生成。支持 Flutter / 微信小程序 / 鸿蒙三平台，附带数据库和后端 API。
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/" className="rounded-xl bg-violet-700 px-8 py-3 text-lg font-semibold text-white hover:bg-violet-800 shadow-lg">免费开始</Link>
          <Link href="/docs/" className="rounded-xl border border-gray-300 px-8 py-3 text-lg text-gray-700 hover:bg-gray-50">查看文档</Link>
        </div>
      </section>

      {/* 能力展示 */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">核心能力</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: "🤖", title: "9 Agent 团队", desc: "CEO → PM → 架构师 → 设计师 → 开发 → 测试 → 安全 → 商业，全流程覆盖" },
            { icon: "📱", title: "三平台代码", desc: "Flutter + 微信小程序 + 鸿蒙 ArkTS，同步生成可运行源码" },
            { icon: "🗄️", title: "后端一条龙", desc: "Supabase DDL + RLS + Express API + Edge Functions 自动生成" },
            { icon: "⚡", title: "一键部署", desc: "GitHub Push + GHA 桌面包 + Vercel Web 部署" },
            { icon: "🎨", title: "模板市场", desc: "电商/社交/CRM/博客/健身 5 套预置模板" },
            { icon: "🔒", title: "企业就绪", desc: "团队空间 + 配额 + Stripe 计费 + Sentry 监控" },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-violet-700 py-16 text-center text-white">
        <h2 className="text-3xl font-bold">准备好了吗？</h2>
        <p className="mt-4 text-violet-200">几分钟内从想法到可运行的应用</p>
        <Link href="/" className="mt-8 inline-block rounded-xl bg-white px-8 py-3 text-lg font-bold text-violet-700">立即体验</Link>
      </section>

      <footer className="py-8 text-center text-xs text-gray-400">
        App 生产工厂 · AI 原生软件生产平台 · 2026
      </footer>
    </main>
  );
}
