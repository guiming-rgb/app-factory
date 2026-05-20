/** 从 LLM 回复中抽取 JSON 对象 */
export function parseJsonFromLlmText(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("LLM 回复中未找到 JSON 对象");
  }
  return JSON.parse(raw.slice(start, end + 1));
}
