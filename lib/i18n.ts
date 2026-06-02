/**
 * A-2: 工厂 UI 国际化（中/英）
 */

type Locale = "zh" | "en";

const T: Record<Locale, Record<string, string>> = {
  zh: {
    home_title: "把一个 App 想法，生产成完整项目方案",
    home_subtitle: "输入你的 App 想法，AI 团队会自动完成立项分析、产品需求、技术架构、页面设计、开发计划、测试方案和商业化建议。",
    history_projects: "历史项目",
    dashboard: "用量仪表盘",
    deploy_status: "部署状态",
    create_project: "创建项目",
    app_idea_placeholder: "描述你的 App 想法…",
    start_generation: "启动 AI 生产",
    status_pending: "等待生产",
    status_running: "生产中",
    status_completed: "已完成",
    status_failed: "失败",
    codegen_title: "代码生成",
    generate_flutter: "生成 Flutter ZIP（同步）",
    generate_wechat: "生成小程序 ZIP（同步）",
    generate_harmony: "生成鸿蒙 ZIP（同步）",
    generate_all: "一键三栈生成（并行）",
    refresh: "刷新记录",
    push_github: "推 GitHub",
    download_zip: "源码 ZIP",
    download_sql: "SQL",
    preview: "预览",
    retry: "重试",
    cancel: "取消",
    spec_editor: "App Spec 预览与编辑",
    save_spec: "保存 Spec",
    reset_spec: "重置为 LLM 提取",
    edit_spec: "编辑 Spec",
    memories: "项目记忆",
    login: "登录",
    logout: "登出",
    version: "App 生产工厂 MVP v1.2",
  },
  en: {
    home_title: "Turn an App Idea into a Complete Project Blueprint",
    home_subtitle: "Describe your app idea. Our AI team handles product analysis, requirements, architecture, UI design, development planning, testing, and business strategy.",
    history_projects: "Projects",
    dashboard: "Dashboard",
    deploy_status: "Deploy Status",
    create_project: "Create Project",
    app_idea_placeholder: "Describe your app idea…",
    start_generation: "Start AI Generation",
    status_pending: "Pending",
    status_running: "Running",
    status_completed: "Completed",
    status_failed: "Failed",
    codegen_title: "Code Generation",
    generate_flutter: "Generate Flutter ZIP (Sync)",
    generate_wechat: "Generate Mini Program ZIP (Sync)",
    generate_harmony: "Generate Harmony ZIP (Sync)",
    generate_all: "Generate All 3 Stacks (Parallel)",
    refresh: "Refresh",
    push_github: "Push GitHub",
    download_zip: "Source ZIP",
    download_sql: "SQL",
    preview: "Preview",
    retry: "Retry",
    cancel: "Cancel",
    spec_editor: "App Spec Editor",
    save_spec: "Save Spec",
    reset_spec: "Reset to LLM",
    edit_spec: "Edit Spec",
    memories: "Memories",
    login: "Login",
    logout: "Logout",
    version: "App Factory MVP v1.2",
  },
};

let currentLocale: Locale = "zh";

export function setLocale(locale: Locale) { currentLocale = locale; }
export function getLocale(): Locale { return currentLocale; }
export function t(key: string): string { return T[currentLocale][key] ?? T.zh[key] ?? key; }
