import fs from "fs/promises";
import path from "path";

import { callLLM } from "@/lib/llm";
import { parseJsonFromLlmText } from "@/lib/app-spec/parse-json";
import {
  runDockerFlutterAnalyze,
  type DockerAnalyzeResult
} from "@/lib/sandbox/docker-analyze";

const AUTOFIX_SYSTEM = `你是 Flutter/Dart 代码修复助手。根据 dart analyze 报错，输出 JSON 修复补丁。

规则：
- 只修改报错涉及的文件；不要改 pubspec.yaml
- 输出格式：{"patches":[{"relativePath":"lib/...","content":"完整文件内容"}]}
- relativePath 相对 Flutter 工程根目录，必须用正斜杠
- 只输出 JSON，不要 markdown`;

function maxRounds(): number {
  const n = Number(process.env.CODEGEN_AUTOFIX_MAX_ROUNDS ?? "3");
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 5) : 3;
}

function isAutoFixDisabled(): boolean {
  return process.env.CODEGEN_AUTOFIX_DISABLED === "1";
}

function extractDartPaths(analyzeOutput: string, appDir: string): string[] {
  const found = new Set<string>();
  const re = /(?:^|\s)(lib\/[^\s:]+\.dart)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(analyzeOutput))) {
    found.add(m[1]);
  }
  if (found.size === 0) {
    found.add("lib/router/app_router.dart");
  }
  return [...found].filter((rel) => {
    const full = path.join(appDir, rel);
    return full.startsWith(appDir);
  });
}

async function readFilesForFix(
  appDir: string,
  relativePaths: string[]
): Promise<string> {
  const chunks: string[] = [];
  for (const rel of relativePaths.slice(0, 6)) {
    try {
      const content = await fs.readFile(path.join(appDir, rel), "utf8");
      chunks.push(`=== ${rel} ===\n${content.slice(0, 8000)}`);
    } catch {
      /* skip missing */
    }
  }
  return chunks.join("\n\n");
}

async function applyPatches(
  appDir: string,
  patches: Array<{ relativePath?: string; content?: string }>
): Promise<number> {
  let applied = 0;
  for (const p of patches) {
    if (!p.relativePath || typeof p.content !== "string") continue;
    const rel = p.relativePath.replace(/^\/+/, "");
    if (!rel.startsWith("lib/") || rel.includes("..")) continue;
    const full = path.join(appDir, rel);
    if (!full.startsWith(appDir)) continue;
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, p.content, "utf8");
    applied++;
  }
  return applied;
}

async function requestFixPatches(
  analyzeOutput: string,
  filesContext: string
): Promise<Array<{ relativePath: string; content: string }>> {
  const { content } = await callLLM({
    systemPrompt: AUTOFIX_SYSTEM,
    userPrompt: [
      "=== dart analyze 输出（末尾）===",
      analyzeOutput.slice(-3500),
      "",
      "=== 当前相关源文件 ===",
      filesContext
    ].join("\n"),
    temperature: 0.1
  });

  const parsed = parseJsonFromLlmText(content) as {
    patches?: Array<{ relativePath?: string; content?: string }>;
  };
  if (!parsed?.patches?.length) {
    throw new Error("自动修错：LLM 未返回 patches");
  }
  return parsed.patches.filter(
    (p): p is { relativePath: string; content: string } =>
      typeof p.relativePath === "string" && typeof p.content === "string"
  );
}

export type AutoFixResult = {
  analyze: DockerAnalyzeResult;
  rounds: number;
  log: string[];
};

/** analyze 失败时最多 N 轮 LLM patch + 重跑 analyze */
export async function runAutoFixAnalyzeLoop(options: {
  appDir: string;
  initialAnalyze?: DockerAnalyzeResult;
}): Promise<AutoFixResult> {
  const log: string[] = [];
  let analyze =
    options.initialAnalyze ?? runDockerFlutterAnalyze({ outDir: options.appDir });
  let rounds = 0;
  const limit = maxRounds();

  if (isAutoFixDisabled() || analyze.status !== "failed") {
    return { analyze, rounds, log };
  }

  while (analyze.status === "failed" && rounds < limit) {
    rounds++;
    log.push(`auto-fix 第 ${rounds} 轮`);

    const output = analyze.output ?? "";
    const paths = extractDartPaths(output, options.appDir);
    const filesContext = await readFilesForFix(options.appDir, paths);

    try {
      const patches = await requestFixPatches(output, filesContext);
      const applied = await applyPatches(options.appDir, patches);
      log.push(`  应用 ${applied} 个补丁`);
      if (applied === 0) break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.push(`  LLM 修错失败：${msg}`);
      break;
    }

    analyze = runDockerFlutterAnalyze({ outDir: options.appDir });
    if (analyze.status === "passed") {
      log.push("  analyze 已通过");
      break;
    }
  }

  return { analyze, rounds, log };
}
