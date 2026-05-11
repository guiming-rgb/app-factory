export function buildFinalMarkdownReport(params: {
  title: string;
  idea: string;
  sections: string[];
}) {
  return `# ${params.title} - App 生产报告

## 原始 App 想法

${params.idea}

---

${params.sections.join("\n\n---\n\n")}

---

## 生成说明

本报告由“App 生产工厂”的多智能体工作流自动生成。

当前版本为 MVP v1，主要用于生成完整 App 项目方案。

在进入真实开发前，建议由产品、技术、业务负责人进行人工复核。
`;
}
