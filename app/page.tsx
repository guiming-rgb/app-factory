import Link from "next/link";
import { ProjectForm } from "@/components/ProjectForm";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <section className="mx-auto flex max-w-5xl flex-col items-center text-center">
        <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
          <div className="rounded-full bg-black px-4 py-1 text-sm text-white">
            App 生产工厂 MVP v1.2
          </div>
          <Link
            href="/projects"
            className="rounded-full border border-gray-300 bg-white px-4 py-1 text-sm text-gray-800 hover:bg-gray-50"
          >
            历史项目
          </Link>
          <Link
            href="/deploy"
            className="rounded-full border border-violet-300 bg-violet-50 px-4 py-1 text-sm text-violet-800 hover:bg-violet-100"
          >
            部署状态
          </Link>
        </div>

        <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-gray-950 md:text-6xl">
          把一个 App 想法，生产成完整项目方案
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
          输入你的 App 想法，AI 团队会自动完成立项分析、产品需求、技术架构、页面设计、开发计划、测试方案和商业化建议。
        </p>

        <div className="mt-10 w-full">
          <ProjectForm />
        </div>

        <div className="mt-12 grid w-full max-w-4xl grid-cols-1 gap-4 text-left md:grid-cols-3">
          <FeatureCard
            title="AI 软件团队"
            desc="CEO、产品经理、架构师、设计师、开发负责人、测试负责人共同协作。"
          />
          <FeatureCard
            title="结构化生产"
            desc="不是普通聊天，而是按软件生产流程一步步生成项目方案。"
          />
          <FeatureCard
            title="可持续进化"
            desc="未来可接入代码生成、沙箱测试、部署、记忆系统和技能市场。"
          />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-gray-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">{desc}</p>
    </div>
  );
}
