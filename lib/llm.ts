import OpenAI from "openai";

/** 大模型调用模块：仅允许服务端导入（与 API Route / workflow 同进程）。 */

const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY");
}

export const openai = new OpenAI({
  apiKey,
  baseURL
});

export type LlmUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type LlmCallResult = {
  content: string;
  model: string;
  usage: LlmUsage;
};

export async function callLLM(params: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}): Promise<LlmCallResult> {
  // 熔断器检查
  const { llmBreaker } = await import("@/lib/llm-circuit-breaker");
  llmBreaker.tryReset();
  const fallback = llmBreaker.getFallbackConfig();
  const effectiveBaseURL = fallback?.baseURL ?? baseURL;
  const effectiveModel = fallback?.model ?? model;
  const effectiveKey = fallback?.apiKey ?? apiKey;

  const client = (effectiveBaseURL !== baseURL || effectiveKey !== apiKey)
    ? new OpenAI({ apiKey: effectiveKey, baseURL: effectiveBaseURL })
    : openai;

  const { measureTiming, captureError } = await import("@/lib/monitoring");
  const completion = await measureTiming("llm.call", () =>
    client.chat.completions.create({
      model: effectiveModel,
      temperature: params.temperature ?? 0.4,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt }
      ]
    })
  ).then((c) => {
    llmBreaker.onSuccess();
    return c;
  }).catch(async (err) => {
    llmBreaker.onFailure();
    await captureError(err, { component: "callLLM" });
    throw err;
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("LLM 返回内容为空");
  }

  const usage = completion.usage;

  return {
    content,
    model: completion.model ?? model,
    usage: {
      promptTokens: usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completion_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0
    }
  };
}
