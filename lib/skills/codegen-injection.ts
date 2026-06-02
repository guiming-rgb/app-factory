import type { Skill } from "./server";
import type { SkillCodegenSnippet } from "./types";
import { getPublishedSkillsByCodes } from "./server";
import { loadAgentSkillBindings } from "@/lib/agents/skill-bindings";

/**
 * P2: 技能代码生成插件化 — 代码片段解析与注入
 */

/** 从技能列表中解析出目标平台的代码片段 */
export function resolveCodegenSnippets(
  skills: Skill[],
  platform: "flutter" | "wechat" | "harmony"
): SkillCodegenSnippet[] {
  const snippets: SkillCodegenSnippet[] = [];

  for (const skill of skills) {
    const raw = skill.codegen_snippets;
    if (!Array.isArray(raw)) continue;

    for (const item of raw) {
      if (typeof item !== "object" || item === null) continue;
      const rec = item as Record<string, unknown>;

      const snippetPlatform = rec.platform;
      if (snippetPlatform !== platform) continue;

      const target = rec.target;
      if (
        target !== "pubspec.yaml" &&
        target !== "page" &&
        target !== "router" &&
        target !== "component"
      ) continue;

      const template = rec.template;
      if (typeof template !== "string" || !template.trim()) continue;

      const placement = rec.placement;
      if (
        placement !== "append" &&
        placement !== "prepend" &&
        placement !== "replace"
      ) continue;

      snippets.push({
        platform: snippetPlatform as SkillCodegenSnippet["platform"],
        target: target as SkillCodegenSnippet["target"],
        template: template.trim(),
        placement: placement as SkillCodegenSnippet["placement"],
        marker:
          typeof rec.marker === "string" && rec.marker.trim()
            ? rec.marker.trim()
            : undefined
      });
    }
  }

  return snippets;
}

/** 查询项目的绑定技能并解析代码片段 */
export async function getCodegenSnippetsForProject(
  platform: "flutter" | "wechat" | "harmony"
): Promise<SkillCodegenSnippet[]> {
  try {
    const bindings = await loadAgentSkillBindings();
    const allCodes = [
      ...new Set(Object.values(bindings).flat())
    ];

    if (!allCodes.length) return [];

    const skills = await getPublishedSkillsByCodes(allCodes);
    return resolveCodegenSnippets(skills, platform);
  } catch {
    return [];
  }
}

/** 将代码片段应用到生成的项目文件 */
export function applySnippetsToFiles(
  files: Map<string, string>,
  snippets: SkillCodegenSnippet[]
): Map<string, string> {
  const result = new Map(files);

  for (const snippet of snippets) {
    switch (snippet.target) {
      case "pubspec.yaml": {
        const existing = result.get("pubspec.yaml") ?? "";
        if (snippet.placement === "append") {
          result.set("pubspec.yaml", existing + "\n" + snippet.template);
        } else if (snippet.placement === "prepend") {
          result.set("pubspec.yaml", snippet.template + "\n" + existing);
        }
        break;
      }
      case "page": {
        // 新页面文件：snippet.marker 作为文件名
        const fileName = snippet.marker ?? "generated_skill_page.dart";
        if (snippet.placement === "append") {
          const existing = result.get(fileName) ?? "";
          result.set(fileName, existing + "\n" + snippet.template);
        } else {
          result.set(fileName, snippet.template);
        }
        break;
      }
      case "component": {
        const fileName = snippet.marker ?? "skill_component.dart";
        if (snippet.placement === "append") {
          const existing = result.get(fileName) ?? "";
          result.set(fileName, existing + "\n" + snippet.template);
        } else {
          result.set(fileName, snippet.template);
        }
        break;
      }
      // router 类型的处理留给生成器内部
    }
  }

  return result;
}
