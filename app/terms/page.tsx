import Link from "next/link";

export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-950">
        服务条款
      </h1>
      <p className="mb-8 text-sm text-gray-500">最后更新：2026-06-16</p>

      <section className="space-y-6 text-sm leading-7 text-gray-700">
        <p>
          欢迎使用 <strong>App 生产工厂</strong>（以下简称「本平台」或「我们」）。
          使用本平台即表示您同意以下条款。如果您不同意这些条款，请勿使用本平台。
        </p>

        <h2 className="text-lg font-semibold text-gray-950">1. 服务说明</h2>
        <p>
          本平台是一个 AI 原生软件生产工具，用户输入 App 想法后，通过多 Agent 工作流自动生成项目方案和代码。
          生成的代码和方案归用户所有，用户可以自由使用、修改和分发。
        </p>

        <h2 className="text-lg font-semibold text-gray-950">2. 用户责任</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>您保证输入的 App 想法不侵犯任何第三方知识产权</li>
          <li>您不得利用本平台生成违反法律法规的内容</li>
          <li>您对使用本平台生成的内容负全部责任</li>
          <li>您有责任将生成的代码进行安全审计后再部署上线</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-950">3. 知识产权</h2>
        <p>
          本平台本身的代码、架构和设计受开源许可证保护（详见 GitHub 仓库）。
          通过本平台生成的 App 方案和代码的知识产权归您所有。
          本平台使用的第三方模板和组件受其各自许可证的约束。
        </p>

        <h2 className="text-lg font-semibold text-gray-950">4. 服务可用性</h2>
        <p>
          我们尽力保证平台的稳定运行，但不对服务的连续性和绝对可用性做出承诺。
          平台可能因维护、升级或不可抗力因素暂时不可用。
          我们不对因服务中断导致的数据损失承担责任。
        </p>

        <h2 className="text-lg font-semibold text-gray-950">5. AI 内容免责</h2>
        <p>
          本平台生成的方案和代码由 AI 模型自动产生，不经过人工审查。
          AI 生成的内容可能存在不准确、不完整或存在安全风险的情况。
          您在使用生成内容前应进行独立的审查和测试。我们对因使用 AI 生成内容导致的任何损失不承担责任。
        </p>

        <h2 className="text-lg font-semibold text-gray-950">6. 付费服务</h2>
        <p>
          本平台可能提供付费套餐（Free / Pro / Enterprise）。付费服务的具体条款和价格以购买时的页面说明为准。
          如发生计费争议，我们将依据我们的使用记录进行核对和处理。
        </p>

        <h2 className="text-lg font-semibold text-gray-950">7. 终止</h2>
        <p>
          我们保留在您违反本条款的情况下终止您账号的权利。
          您可以随时停止使用本平台并删除您的数据。
        </p>

        <h2 className="text-lg font-semibold text-gray-950">8. 免责声明</h2>
        <p>
          本平台按「现状」提供，不提供任何明示或暗示的保证，包括但不限于适销性、特定用途适用性和非侵权保证。
          在任何情况下，我们均不对因使用或无法使用本平台而产生的任何直接、间接、附带、特殊或后果性损害承担责任。
        </p>

        <h2 className="text-lg font-semibold text-gray-950">9. 适用法律</h2>
        <p>
          本条款受中华人民共和国法律管辖。因本条款引起的争议，双方应友好协商解决；
          协商不成的，提交有管辖权的人民法院诉讼解决。
        </p>

        <h2 className="text-lg font-semibold text-gray-950">10. 联系方式</h2>
        <p>
          如有任何疑问，请联系：<br />
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
        <Link href="/privacy" className="underline hover:text-gray-600">隐私政策</Link>
        <span className="mx-2">·</span>
        <Link href="/" className="underline hover:text-gray-600">返回首页</Link>
      </p>
    </main>
  );
}
