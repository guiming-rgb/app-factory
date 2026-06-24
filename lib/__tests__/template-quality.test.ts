// ============================================================
// 模板质量门禁测试 — 覆盖所有 Flutter 行业模板的完整性/有效性
// ============================================================
//
// 测试：
//   1. Mustache 模板 Dart 类定义验证
//   2. Service 文件 CRUD 方法检查
//   3. Model 文件 fromJson/toJson
//   4. 空/存根文件检测
//   5. 导入路径解析（含跨模板合并路径）
//   6. 综合质量报告
// ============================================================

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname, relative } from "path";

const ROOT = resolve(__dirname, "../..");
const TEMPLATES_DIR = join(ROOT, "templates");
const FLUTTER_BASE = join(TEMPLATES_DIR, "flutter-minimal");
const MUSTACHE_DIR = join(FLUTTER_BASE, "lib", "core", "widgets", "industry");
const PUBSPEC_PATH = join(FLUTTER_BASE, "pubspec.yaml");

const EXCLUDED_DIRS = new Set([
  ".dart_tool", "build", ".pub-cache", "node_modules", ".git", ".next",
  ".cache", "Pods", ".packages", "__pycache__",
]);

// ── 辅助函数 ──────────────────────────────────────────────

function findFiles(dir: string, ext: string, maxDepth = 10, depth = 0): string[] {
  if (depth > maxDepth || !existsSync(dir)) return [];
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || EXCLUDED_DIRS.has(entry.name)) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) results.push(...findFiles(fullPath, ext, maxDepth, depth + 1));
      else if (entry.name.endsWith(ext)) results.push(fullPath);
    }
  } catch { /* noop */ }
  return results;
}

function readFile(path: string): string {
  try { return readFileSync(path, "utf-8"); } catch { return ""; }
}

/** 解析 pubspec.yaml 获取所有依赖名（含 SDK 包） */
function parsePubspecDeps(): Set<string> {
  const content = readFile(PUBSPEC_PATH);
  const deps = new Set<string>();
  deps.add("flutter").add("flutter_localizations").add("flutter_test");
  let inDeps = false;
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (t === "dependencies:") { inDeps = true; continue; }
    if (t.startsWith("dev_dependencies:")) { inDeps = false; continue; }
    // Only break on the bottom "flutter:" config section after deps are done
    if (t.startsWith("flutter:") && !inDeps) break;
    if (inDeps && t.includes(":")) {
      const [name] = t.split(":").map((s) => s.trim());
      if (name && !name.startsWith("#") && name !== "sdk") deps.add(name);
    }
  }
  return deps;
}

/** 提取 Dart import 语句 */
function extractImports(content: string): string[] {
  const imports: string[] = [];
  const re = /^\s*import\s+['"]([^'"]+)['"]\s*;?\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) imports.push(m[1]);
  return imports;
}

/** 解析相对 import 路径 — 先查本地目录，再查 flutter-minimal 合并目录 */
function resolveImportWithFallback(sourceFile: string, importPath: string): string | null {
  const sourceDir = dirname(sourceFile);
  // 直接解析
  const direct = resolve(sourceDir, importPath);
  if (existsSync(direct)) return direct;
  if (!direct.endsWith(".dart")) {
    const dart = direct + ".dart";
    if (existsSync(dart)) return dart;
  }
  // 尝试在 flutter-minimal/lib/ 下查找：
  // 从 industry-xxx/lib/ 开始的相对路径，经过 ../ 后到了 lib/ 层级
  // 例如: industry-blog/lib/features/blog/pages/xxx.dart
  // 的 import "../../../core/theme/app_theme.dart"
  // → 在 flutter-minimal/lib/core/theme/app_theme.dart 查找
  if (sourceFile.includes("templates/industry-")) {
    // 计算 import 路径中的 "../" 层级
    const parts = importPath.split("/");
    let upCount = 0;
    for (const p of parts) {
      if (p === "..") upCount++;
      else break;
    }
    if (upCount > 0) {
      // 从 source 的 lib/ 层级开始
      const libIdx = sourceFile.indexOf("/lib/");
      if (libIdx !== -1) {
        const afterLib = sourceFile.slice(libIdx + 5); // after "lib/"
        const libSegments = afterLib.split("/");
        // 去掉 upCount 个层级（lib 下的目录层）
        const remaining = libSegments.slice(upCount);
        // 构建从 lib/ 往下的相对路径
        const tail = parts.slice(upCount).join("/");
        const fmPath = join(FLUTTER_BASE, "lib", ...remaining.slice(0, -1), tail);
        if (existsSync(fmPath)) return fmPath;
        if (!fmPath.endsWith(".dart")) {
          const fmDart = fmPath + ".dart";
          if (existsSync(fmDart)) return fmDart;
        }
      }
    }
  }
  return null;
}

function isStubContent(content: string): boolean {
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 10) return true;
  const code = lines.filter((l) => {
    const t = l.trim();
    return !t.startsWith("//") && !t.startsWith("/*") && !t.startsWith("*") && !t.match(/^(import|export|part)\s/);
  });
  if (code.length < 3) return true;
  const todo = code.filter((l) => /\b(TODO|FIXME|stub)\b/i.test(l));
  return todo.length > code.length * 0.3;
}

// ============================================================
// 1. Mustache 模板 — Dart 类定义
// ============================================================

describe("1. Mustache Widget 模板 — Dart 类定义", () => {
  const files = findFiles(MUSTACHE_DIR, ".mustache");

  it(`应包含至少 19 个 mustache 模板文件（当前 ${files.length}）`, () => {
    expect(files.length).toBeGreaterThanOrEqual(19);
  });

  // 统计报告
  let withMustacheSyntax = 0;
  let withPrimaryColorRef = 0;

  for (const file of files) {
    const rel = relative(TEMPLATES_DIR, file);
    const content = readFile(file);
    const hasMustache = /\{\{/.test(content);
    const hasPrimaryColor = /\{\{+\s*primaryColor\s*\}\}+/.test(content);
    if (hasMustache) withMustacheSyntax++;
    if (hasPrimaryColor) withPrimaryColorRef++;

    it(`${rel} 包含 class 定义`, () => {
      expect(content.length).toBeGreaterThan(50);
      expect(content).toMatch(/\bclass\s+\w+/);
    });
    it(`${rel} 包含 extends StatelessWidget / StatefulWidget`, () => {
      expect(content).toMatch(/extends\s+(StatelessWidget|StatefulWidget)/);
    });
    // 有些模板是纯静态 Dart 文件（无占位符），存储为 .mustache 用于管道统一处理
    if (hasMustache) {
      it(`${rel} 使用 Mustache 占位符语法`, () => {
        expect(content).toMatch(/\{\{+\w+/);
      });
    }
    // primaryColor 可能以 {{primaryColor}}（注释）或 {{{primaryColor}}}（代码）形式出现
    // 少数静态模板（dating, photo, sports, video, weather）为纯 Dart 文件，无模板变量
    if (hasMustache || hasPrimaryColor) {
      it(`${rel} 引用 primaryColor 变量`, () => {
        expect(hasPrimaryColor).toBe(true);
      });
    }
    it(`${rel} 非存根`, () => {
      expect(isStubContent(content)).toBe(false);
    });
  }

  it(`模板变量使用率: ${withMustacheSyntax}/${files.length} 含占位符`, () => {
    // 至少 50% 的文件应使用 mustache 占位符
    expect(withMustacheSyntax / Math.max(files.length, 1)).toBeGreaterThanOrEqual(0.5);
  });
  it(`primaryColor 引用率: ${withPrimaryColorRef}/${files.length}`, () => {
    // 至少 60% 的文件应引用 primaryColor
    expect(withPrimaryColorRef / Math.max(files.length, 1)).toBeGreaterThanOrEqual(0.6);
  });
});

// ============================================================
// 2. Service 文件 — CRUD 方法
// ============================================================

describe("2. Service 文件 — CRUD 方法", () => {
  const industryDirs = readdirSync(TEMPLATES_DIR).filter(
    (d) => d.startsWith("industry-") && statSync(join(TEMPLATES_DIR, d)).isDirectory()
  );
  let serviceFiles: string[] = [];
  for (const dir of industryDirs) {
    serviceFiles.push(
      ...findFiles(join(TEMPLATES_DIR, dir, "lib"), ".dart").filter(
        (f) => f.includes("/services/") && f.endsWith("_service.dart")
      )
    );
  }

  it(`应存在至少 18 个 service 文件（当前 ${serviceFiles.length}）`, () => {
    expect(serviceFiles.length).toBeGreaterThanOrEqual(18);
  });

  for (const file of serviceFiles) {
    const rel = relative(TEMPLATES_DIR, file);
    const content = readFile(file);

    it(`${rel} 包含 class 定义`, () => {
      expect(content).toMatch(/\bclass\s+\w+/);
    });
    // game 服务使用 Flame 游戏引擎模板（非 Supabase CRUD）
    const isGameService = rel.includes("industry-game") && rel.includes("game_service");
    if (!isGameService) {
      it(`${rel} 包含 SupabaseClient`, () => {
        expect(content).toMatch(/SupabaseClient/);
      });
      it(`${rel} 使用 Supabase .from()`, () => {
        expect(content).toMatch(/\.from\(/);
      });
    }
    it(`${rel} 包含 Future 方法`, () => {
      expect(content).toMatch(/\bFuture\s*</);
    });
    // 部分服务使用箭头函数语法（无 try/catch），这是可接受风格
    const hasTryCatch = /\btry\s*\{/.test(content) && /\bcatch\s*\(/.test(content);
    if (!hasTryCatch) {
      console.warn(`[info] ${rel}: 使用无 try/catch 的简洁风格`);
    }
  }

  it("所有 Service 文件至少有 2 个 Future 方法", () => {
    const failures: string[] = [];
    for (const file of serviceFiles) {
      const content = readFile(file);
      const count = (content.match(/\bFuture\s*</g) || []).length;
      if (count < 2) failures.push(`${relative(TEMPLATES_DIR, file)}: ${count}`);
    }
    expect(failures, `Future 方法不足: ${failures.join("; ")}`).toHaveLength(0);
  });
});

// ============================================================
// 3. Model 文件 — fromJson/toJson
// ============================================================

describe("3. Model 文件 — fromJson / toJson", () => {
  const industryDirs = readdirSync(TEMPLATES_DIR).filter(
    (d) => d.startsWith("industry-") && statSync(join(TEMPLATES_DIR, d)).isDirectory()
  );
  let modelFiles: string[] = [];
  for (const dir of industryDirs) {
    modelFiles.push(
      ...findFiles(join(TEMPLATES_DIR, dir, "lib"), ".dart").filter((f) => f.includes("/models/"))
    );
  }

  it(`应存在至少 18 个 model 文件（当前 ${modelFiles.length}）`, () => {
    expect(modelFiles.length).toBeGreaterThanOrEqual(18);
  });

  let fromJsonOk = 0;
  let toJsonOk = 0;

  for (const file of modelFiles) {
    const rel = relative(TEMPLATES_DIR, file);
    const content = readFile(file);

    it(`${rel} 包含 class 定义`, () => {
      expect(content).toMatch(/\bclass\s+\w+/);
    });
    it(`${rel} 包含构造函数`, () => {
      expect(content).toMatch(/^\s*(const\s+)?\w+\s*\(/m);
    });
    it(`${rel} 包含 factory fromJson`, () => {
      const ok = /factory\s+\w+\.fromJson\s*\(/.test(content);
      if (ok) fromJsonOk++;
      expect(ok).toBe(true);
    });
    it(`${rel} 包含 Map<String,dynamic> toJson`, () => {
      const ok = /\bMap\s*<\s*String\s*,\s*dynamic\s*>\s+toJson\s*\(/.test(content);
      if (ok) toJsonOk++;
      expect(ok).toBe(true);
    });
  }

  it(`fromJson 覆盖: ${fromJsonOk}/${modelFiles.length}`, () => {
    expect(fromJsonOk / Math.max(modelFiles.length, 1)).toBeGreaterThanOrEqual(0.8);
  });
  it(`toJson 覆盖: ${toJsonOk}/${modelFiles.length}`, () => {
    expect(toJsonOk / Math.max(modelFiles.length, 1)).toBeGreaterThanOrEqual(0.8);
  });
});

// ============================================================
// 4. 空/存根文件检测
// ============================================================

describe("4. 空/存根文件检测", () => {
  const dartFiles = findFiles(TEMPLATES_DIR, ".dart").filter(
    (f) => !f.includes("/.dart_tool/") && !f.includes("/build/") && !f.includes("/Pods/") && !f.includes("GeneratedPluginRegistrant")
  );
  const samples = dartFiles.slice(0, 100);

  it(`共扫描 ${dartFiles.length} 个 Dart 模板文件（取样 ${samples.length}）`, () => {
    expect(dartFiles.length).toBeGreaterThan(50);
  });

  let stubCount = 0;
  for (const file of samples) {
    const rel = relative(TEMPLATES_DIR, file);
    const content = readFile(file);
    const stub = isStubContent(content);
    if (stub) stubCount++;
    it(`${rel} 非空非存根`, () => {
      expect(content.length).toBeGreaterThan(0);
      expect(stub).toBe(false);
    });
  }

  it(`存根率 ${stubCount}/${samples.length} <= 15%`, () => {
    expect(stubCount / samples.length).toBeLessThanOrEqual(0.15);
  });
});

// ============================================================
// 5. 导入路径解析（含跨模板合并路径）
// ============================================================

describe("5. 导入路径解析", () => {
  const pubspecDeps = parsePubspecDeps();
  const industryDirs = readdirSync(TEMPLATES_DIR).filter(
    (d) => d.startsWith("industry-") && statSync(join(TEMPLATES_DIR, d)).isDirectory()
  );

  it(`pubspec.yaml 至少包含 8 个依赖（当前 ${pubspecDeps.size}）`, () => {
    expect(pubspecDeps.size).toBeGreaterThanOrEqual(8);
    expect(pubspecDeps.has("supabase_flutter")).toBe(true);
    expect(pubspecDeps.has("go_router")).toBe(true);
  });

  describe("Mustache 模板导入", () => {
    const mustacheFiles = findFiles(MUSTACHE_DIR, ".mustache");
    const allIssues: Array<{ file: string; issue: string }> = [];
    let totalImports = 0;

    for (const file of mustacheFiles) {
      const content = readFile(file);
      const imports = extractImports(content);
      totalImports += imports.length;
      const rel = relative(TEMPLATES_DIR, file);

      for (const imp of imports) {
        if (imp.startsWith("dart:")) continue;
        if (imp.startsWith("package:")) {
          const pkg = imp.replace("package:", "").split("/")[0];
          if (!pubspecDeps.has(pkg)) allIssues.push({ file: rel, issue: `包 "${pkg}" 不在 pubspec.yaml` });
          continue;
        }
        if (!resolveImportWithFallback(file, imp)) {
          allIssues.push({ file: rel, issue: `路径 "${imp}" 不存在` });
        }
      }
    }

    it(`${allIssues.length}/${totalImports} Mustache 导入问题`, () => {
      for (const { file, issue } of allIssues) console.warn(`  ${file}: ${issue}`);
      // 问题率 < 10% 视为可接受
      expect(allIssues.length / Math.max(totalImports, 1)).toBeLessThan(0.1);
    });
  });

  describe("行业模板导入", () => {
    const allIssues: Array<{ file: string; issue: string }> = [];
    let totalImports = 0;

    for (const dirName of industryDirs) {
      const baseDir = join(TEMPLATES_DIR, dirName);
      const dartFiles = findFiles(join(baseDir, "lib"), ".dart");

      for (const file of dartFiles) {
        const content = readFile(file);
        const imports = extractImports(content);
        totalImports += imports.length;
        const rel = relative(TEMPLATES_DIR, file);

        for (const imp of imports) {
          if (imp.startsWith("dart:")) continue;
          if (imp.startsWith("package:")) {
            const pkg = imp.replace("package:", "").split("/")[0];
            if (!pubspecDeps.has(pkg)) allIssues.push({ file: rel, issue: `包 "${pkg}" 不在 pubspec.yaml` });
            continue;
          }
          if (!resolveImportWithFallback(file, imp)) {
            allIssues.push({ file: rel, issue: `路径 "${imp}" 不存在` });
          }
        }
      }
    }

    it(`${allIssues.length}/${totalImports} 行业模板导入问题`, () => {
      if (allIssues.length > 0) {
        console.warn(`问题导入路径详细:`);
        const byFile = new Map<string, string[]>();
        for (const { file, issue } of allIssues) {
          if (!byFile.has(file)) byFile.set(file, []);
          byFile.get(file)!.push(issue);
        }
        for (const [file, issues] of byFile) {
          console.warn(`  ${file}:`);
          for (const iss of issues) console.warn(`    ${iss}`);
        }
      }
      // 问题率 < 10% 视为可接受
      expect(allIssues.length / Math.max(totalImports, 1)).toBeLessThan(0.1);
    });
  });
});

// ============================================================
// 6. 综合质量报告
// ============================================================

describe("6. 综合质量报告", () => {
  it("打印模板质量统计", () => {
    const allDart = findFiles(TEMPLATES_DIR, ".dart").filter((f) => !f.includes("/.dart_tool/"));
    const mustacheCount = findFiles(MUSTACHE_DIR, ".mustache").length;
    const industryDirs = readdirSync(TEMPLATES_DIR).filter(
      (d) => d.startsWith("industry-") && statSync(join(TEMPLATES_DIR, d)).isDirectory()
    );
    const pubspecDeps = parsePubspecDeps();
    const serviceFiles = allDart.filter((f) => f.includes("/services/") && f.endsWith("_service.dart"));
    const modelFiles = allDart.filter((f) => f.includes("/models/"));
    const pageFiles = allDart.filter((f) => f.includes("/pages/"));
    const modelJsonOk = modelFiles.filter((f) => {
      const c = readFile(f);
      return /factory\s+\w+\.fromJson/.test(c) && /\bMap\s*<\s*String\s*,\s*dynamic\s*>\s+toJson\s*\(/.test(c);
    }).length;

    const lines = [
      `  行业模板数:      ${industryDirs.length}`,
      `  Dart 文件总数:   ${allDart.length}`,
      `    其中 Service: ${serviceFiles.length}`,
      `    其中 Model:   ${modelFiles.length}`,
      `    其中 Pages:   ${pageFiles.length}`,
      `  Mustache 模板数: ${mustacheCount}`,
      `  模型 JSON 覆盖:  ${modelFiles.length > 0 ? ((modelJsonOk / modelFiles.length) * 100).toFixed(1) : "N/A"}%`,
      `  pubspec 依赖数:  ${pubspecDeps.size}`,
    ];

    console.log("\n═══════════════════════════════════════");
    console.log("  模板质量统计报告");
    console.log("═══════════════════════════════════════");
    for (const l of lines) console.log(l);
    console.log("═══════════════════════════════════════\n");

    expect(industryDirs.length).toBeGreaterThanOrEqual(18);
    expect(mustacheCount).toBeGreaterThanOrEqual(19);
    expect(serviceFiles.length).toBeGreaterThanOrEqual(18);
    expect(modelFiles.length).toBeGreaterThanOrEqual(18);
    expect(pageFiles.length).toBeGreaterThanOrEqual(54);
  });
});
