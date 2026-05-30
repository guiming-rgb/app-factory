import type { AppSpec } from "./types";

function toAppName(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (/^[a-z][a-z0-9_]*$/.test(slug)) return slug.slice(0, 48);
  return `app_${slug.replace(/[^a-z0-9]/g, "").slice(0, 32) || "factory"}`;
}

/** 从工厂项目记录生成最小可校验 App Spec（PoC，待报告→Spec Agent 替代） */
export function buildMinimalSpecFromProject(project: {
  id: string;
  title: string;
  idea?: string | null;
}): AppSpec {
  const displayName = (project.title || "未命名应用").trim();
  const listTitle = displayName.length > 24 ? `${displayName.slice(0, 22)}…` : displayName;

  return {
    specVersion: "0.1.0",
    appName: toAppName(displayName),
    displayName,
    sourceProjectId: project.id,
    targets: {
      flutter: {
        enabled: true,
        platforms: ["ios", "android"],
        formFactors: ["phone"]
      },
      harmony: { enabled: false, formFactors: ["phone"] },
      backend: { provider: "supabase" },
      wechatMiniProgram: {
        enabled: true,
        tabBar: ["main_list", "profile"],
        loginMethod: "wechat",
        subPackages: []
      }
    },
    entities: [],
    screens: [
      {
        id: "home",
        title: "首页",
        type: "tabRoot",
        children: ["main_list"]
      },
      {
        id: "main_list",
        title: listTitle,
        type: "list"
      },
      {
        id: "profile",
        title: "我的",
        type: "placeholder"
      }
    ],
    navigation: { tabs: ["main_list", "profile"] },
    roles: [],
    auth: {
      provider: "supabase",
      methods: ["email"],
      roles: ["user"]
    },
    api: [],
    layoutRules: {},
    complianceFlags: { templateLimited: true },
    limitations: [
      "由 App 生产工厂 PoC 从项目标题自动生成，非 8-Agent 结构化抽取",
      project.idea
        ? `原始想法摘要：${String(project.idea).slice(0, 200)}`
        : "未提供 idea 字段"
    ],
    metadata: {
      locale: "zh-CN",
      generatedBy: "app-factory-codegen-poc",
      flutterTemplateVersion: "minimal-0.1.0",
      wechatTemplateVersion: "minimal-0.1.0"
    }
  };
}
