import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-950">
        隐私政策
      </h1>
      <p className="mb-8 text-sm text-gray-500">最后更新：2026-06-16</p>

      <section className="space-y-6 text-sm leading-7 text-gray-700">
        <p>
          <strong>App 生产工厂</strong>（以下简称「本平台」或「我们」）深知个人信息对您的重要性，
          并会全力保护您的个人信息安全。本隐私政策说明了我们如何收集、使用、存储和保护您的个人信息。
        </p>

        <h2 className="text-lg font-semibold text-gray-950">1. 信息收集</h2>
        <p>当您使用本平台时，我们可能收集以下类型的信息：</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>注册信息</strong>：邮箱地址（用于账号注册和登录）</li>
          <li><strong>使用信息</strong>：您输入的 App 想法、生成的项目方案、Agent 输出内容</li>
          <li><strong>技术信息</strong>：浏览器类型、设备信息、访问时间（用于服务优化）</li>
          <li><strong>LLM 调用日志</strong>：Token 用量、模型名称、调用时长（仅用于用量统计和计费）</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-950">2. 信息使用</h2>
        <p>我们收集的信息用于以下目的：</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>提供 App 方案生成和代码生成核心服务</li>
          <li>优化 AI Agent 输出质量和用户体验</li>
          <li>计算用量和计费（Free / Pro / Enterprise）</li>
          <li>发送服务相关的通知（如生成完成）</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-950">3. AI 与第三方服务</h2>
        <p>
          本平台使用第三方 AI 服务（包括但不限于 OpenAI 兼容 API）处理您输入的 App 想法并生成方案。
          发送给 AI 服务的内容包括您输入的 App 想法和已生成的 Agent 输出。
          我们选择的服务商符合行业标准的数据保护要求。我们不会将您的个人信息用于训练或改进第三方 AI 模型。
        </p>

        <h2 className="text-lg font-semibold text-gray-950">4. 数据存储与安全</h2>
        <p>
          您的数据存储在 Supabase PostgreSQL 数据库中，采用行级安全（RLS）策略进行隔离保护。
          数据传输全程加密（HTTPS）。我们采取合理的技术措施保护您的数据安全，
          但请注意没有任何互联网传输或存储方式能做到 100% 安全。
        </p>

        <h2 className="text-lg font-semibold text-gray-950">5. 数据保留与删除</h2>
        <p>
          您的项目数据和账号信息在您主动删除前将一直保留。您可以在项目详情页删除单个项目，
          也可以联系我们删除整个账号及全部关联数据。删除后，数据将在合理期限内从备份中清除。
        </p>

        <h2 className="text-lg font-semibold text-gray-950">6. 您的权利</h2>
        <p>根据适用的数据保护法律，您享有以下权利：</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>访问权：查看我们收集的您的个人信息</li>
          <li>更正权：更新不准确的信息</li>
          <li>删除权：申请删除您的数据</li>
          <li>撤回同意：撤回对数据处理的授权</li>
          <li>数据可携带性：导出您的数据副本</li>
        </ul>
        <p>如需行使上述权利，请联系：<span className="font-mono text-violet-700">support@app-factory.dev</span></p>

        <h2 className="text-lg font-semibold text-gray-950">7. Cookie</h2>
        <p>
          本平台使用必要的 Cookie 来维护登录会话和基本功能。我们不使用第三方跟踪 Cookie。
          您可以通过浏览器设置管理 Cookie 偏好。
        </p>

        <h2 className="text-lg font-semibold text-gray-950">8. 政策更新</h2>
        <p>
          我们可能会不时更新本隐私政策。重大变更时，我们将通过平台通知或邮件告知您。
          继续使用本平台即表示您同意更新后的政策。
        </p>

        <h2 className="text-lg font-semibold text-gray-950">9. 联系方式</h2>
        <p>
          如果您对本隐私政策有任何疑问，请联系我们：<br />
          邮箱：<span className="font-mono text-violet-700">support@app-factory.dev</span><br />
          项目地址：
          <Link
            href="https://github.com/guiming-rgb/app-factory"
            className="ml-1 text-violet-700 underline"
            target="_blank"
          >
            github.com/guiming-rgb/app-factory
          </Link>
        </p>
      </section>

      <p className="mt-10 text-center text-sm text-gray-400">
        <Link href="/terms" className="underline hover:text-gray-600">服务条款</Link>
        <span className="mx-2">·</span>
        <Link href="/" className="underline hover:text-gray-600">返回首页</Link>
      </p>
    </main>
  );
}
