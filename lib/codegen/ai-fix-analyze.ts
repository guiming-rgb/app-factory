import fs from "fs/promises";
import { callLLM } from "@/lib/llm";

/**
 * P2-2: AI 代码审查回路
 * dart analyze 失败时用 LLM 自动修复
 */

const AI_FIX_SYSTEM = `你是一个 Flutter/Dart 代码修复专家。
用户会提供 dart analyze 的错误输出和对应的源代码文件内容。
请直接返回修复后的完整文件内容，不要加任何解释。
用 markdown code fence 包裹代码：\`\`\`dart ... \`\`\`
只修复 analyze 报告的错误，不要改动其他代码。`;

export async function tryAiFixAnalyzeErrors(
  analyzeOutput: string,
  appDir: string
): Promise<{ fixed: boolean; repaired: number; log: string[] }> {
  const log: string[] = [];
  let repaired = 0;

  // 从 analyze 输出中提取文件路径和行号
  const errorPattern = /(?:error|warning|info)\s*-\s*(\S+\.dart):(\d+):(\d+)\s*-\s*(.+)/g;
  const errorsByFile = new Map<string, Array<{ line: number; col: number; message: string }>>();

  let match;
  while ((match = errorPattern.exec(analyzeOutput)) !== null) {
    const filePath = match[1];
    const line = parseInt(match[2]);
    const col = parseInt(match[3]);
    const message = match[4];
    if (!errorsByFile.has(filePath)) errorsByFile.set(filePath, []);
    errorsByFile.get(filePath)!.push({ line, col, message });
  }

  // 最多修复 3 个文件
  const filesToFix = [...errorsByFile.entries()].slice(0, 3);

  for (const [relPath, errors] of filesToFix) {
    try {
      // 构建完整路径（相对路径可能来自 analyze 输出）
      const fullPath = relPath.startsWith("/") ? relPath : `${appDir}/${relPath}`;
      const source = await fs.readFile(fullPath, "utf8");

      const errorSummary = errors.slice(0, 5).map((e) =>
        `行 ${e.line}:${e.col} - ${e.message}`
      ).join("\n");

      log.push(`修复 ${relPath}：${errors.length} 个错误`);

      const result = await callLLM({
        systemPrompt: AI_FIX_SYSTEM,
        userPrompt: `dart analyze 报告以下错误：

${errorSummary}

源文件内容：
\`\`\`dart
${source.slice(0, 4000)}
\`\`\`

请返回修复后的完整文件内容。`,
        temperature: 0.1
      });

      // 从 LLM 回复中提取代码
      const codeMatch = result.content.match(/```dart\n([\s\S]*?)\n```/);
      if (codeMatch) {
        await fs.writeFile(fullPath, codeMatch[1], "utf8");
        repaired++;
        log.push(`  ✅ ${relPath} 已修复`);
      } else {
        log.push(`  ⚠ ${relPath} LLM 未返回有效代码`);
      }
    } catch (e) {
      log.push(`  ❌ ${relPath} 修复失败：${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    fixed: repaired > 0,
    repaired,
    log
  };
}
