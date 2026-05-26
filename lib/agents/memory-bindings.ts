/** v5-6：工作流中注入项目记忆的 Agent（决策链角色） */
export const WORKFLOW_MEMORY_AGENT_CODES = [
  "ceo",
  "product_manager",
  "architect",
  "qa_lead"
] as const;

export type WorkflowMemoryAgentCode =
  (typeof WORKFLOW_MEMORY_AGENT_CODES)[number];

const MEMORY_AGENT_SET = new Set<string>(WORKFLOW_MEMORY_AGENT_CODES);

export function agentReceivesProjectMemories(agentCode: string): boolean {
  return MEMORY_AGENT_SET.has(agentCode);
}

/** 各 Agent 记忆区块说明（写入 user prompt） */
export function memorySectionHintForAgent(agentCode: string): string {
  const hints: Record<string, string> = {
    ceo: "CEO 须纳入战略判断",
    product_manager: "产品经理须在 PRD 中体现约束与边界",
    architect: "架构师须在技术方案中遵守约束",
    qa_lead: "QA 须在测试范围与验收标准中覆盖约束"
  };
  return hints[agentCode] ?? "须在本轮输出中体现";
}
