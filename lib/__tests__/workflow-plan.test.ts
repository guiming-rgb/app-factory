import { describe, expect, it, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => ({
    from: mockFrom,
  }),
}));

vi.mock("@/lib/agents", () => ({
  filterAgentsForApp: () => [
    { code: "ceo", name: "CEO" },
    { code: "product_manager", name: "PM" },
  ],
  getAgentConfig: (code: string) => ({ code, name: code }),
}));

describe("getProjectWorkflowPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completed 项目应 skip", async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { id: "p1", status: "completed", idea: "test" },
              error: null,
            }),
        }),
      }),
    });

    const { getProjectWorkflowPlan } = await import("@/lib/workflow");
    const plan = await getProjectWorkflowPlan("p1");
    expect(plan).toEqual({
      action: "skip",
      reason: "项目已完成，跳过重复执行（幂等）",
    });
  });

  it("running 项目应返回 agent 列表", async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { id: "p1", status: "running", idea: "二手平台" },
              error: null,
            }),
        }),
      }),
    });

    const { getProjectWorkflowPlan } = await import("@/lib/workflow");
    const plan = await getProjectWorkflowPlan("p1");
    expect(plan).toEqual({
      action: "run",
      agentCodes: ["ceo", "product_manager"],
    });
  });
});
