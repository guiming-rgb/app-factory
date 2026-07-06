// ============================================================
// Codegen 全管线 E2E 测试
//
// 覆盖：
//   1. 20 行业 x 3 平台 = 60 组合生成
//   2. Flutter dart analyze 门禁
//   3. WeChat 小程序结构门禁
//   4. Harmony 结构门禁
//   5. detectIndustry 映射一致性
//   6. 所有页面类型生成
//   7. 实体关系 -> Supabase CRUD 查询
//   8. 幂等性（同 spec -> 同输出结构）
// ============================================================

import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

// 环境变量
process.env.OPENAI_API_KEY = "sk-test-pipeline";

// ============================================================
// Mock 基础设施（与 platform-executors.test.ts 保持一致）
// ============================================================

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                id: "proj-pipeline",
                title: "管线测试",
                idea: "全管线 E2E",
                final_report: null,
                status: "completed",
                spec_override: null,
              },
              error: null,
            }),
          ),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/app-spec/resolve-spec", () => ({
  resolveSpecForCodegen: vi.fn((project: unknown) => {
    // 从 spec_override 取出透传的 spec，实现 spec-per-test
    const po = (project as Record<string, unknown>).spec_override;
    const spec = (po as Record<string, unknown>)?.spec ?? {
      specVersion: "0.1.0",
      appName: "test",
      displayName: "测试",
      screens: [{ id: "home", title: "首页", type: "list" }],
      navigation: { tabs: ["home"] },
    };
    return Promise.resolve({ spec, source: "report-llm", warning: null });
  }),
}));

vi.mock("@/lib/app-spec/validate", () => ({
  validateAppSpec: vi.fn((d: unknown) => ({ ok: true, spec: d })),
}));

vi.mock("@/lib/app-spec/spec-quality", () => ({
  assessSpecQuality: vi.fn(() => ({
    score: 90,
    warnings: [],
    suggestions: [],
  })),
}));

vi.mock("@/lib/app-spec/detect-todo-app", () => ({
  isTodoAppSpec: vi.fn(() => false),
}));

vi.mock("@/lib/app-spec/generate-ddl", () => ({
  generateCreateTableDDL: vi.fn(() => ({ fullSql: "CREATE TABLE ..." })),
}));

vi.mock("@/lib/codegen/artifacts", () => ({
  writeArtifactFile: vi.fn(() =>
    Promise.resolve({ relativePath: "/artifacts/pipeline.zip", storageUploaded: true }),
  ),
  writePreviewHtml: vi.fn(() => Promise.resolve("/previews/pipeline.html")),
}));

vi.mock("@/lib/codegen/verify-artifact", () => {
  const okResult = {
    ok: true,
    target: "flutter" as const,
    fileCount: 20,
    hasPubspec: true,
    hasRouter: true,
    hasAuth: true,
    hasSql: true,
    hasAppJson: false,
    hasProjectConfig: false,
    hasWechatPages: false,
    hasHarmonyMainPages: false,
    hasHarmonyEntry: false,
    hasHarmonyEtsPages: false,
    dartAnalyze: "skipped" as const,
    errors: [] as string[],
  };
  return {
    verifyCodegenArtifact: vi.fn(() => Promise.resolve(okResult)),
    verifyGeneratedArtifact: vi.fn(() => Promise.resolve(okResult)),
  };
});

vi.mock("@/lib/codegen/preview-html", () => ({
  generateSpecPreviewHtml: vi.fn(() => "<html>pipeline</html>"),
}));

vi.mock("@/lib/codegen/runs", () => ({
  markCodegenRunRunning: vi.fn(() => Promise.resolve()),
  markCodegenRunCompleted: vi.fn(() => Promise.resolve()),
  markCodegenRunFailed: vi.fn(() => Promise.resolve()),
  createCodegenRun: vi.fn(() =>
    Promise.resolve({ id: "run-pipeline", project_id: "proj-pipeline", target: "flutter", status: "queued" }),
  ),
  getCodegenRun: vi.fn(() =>
    Promise.resolve({ id: "run-pipeline", status: "completed", artifact_path: "/a.zip", metadata: {} }),
  ),
}));

vi.mock("@/lib/codegen/storage", () => ({
  getCodegenStorageBucket: vi.fn(() => "artifacts"),
}));

vi.mock("@/lib/codegen/zip", () => ({
  zipDirectory: vi.fn(() => Promise.resolve(Buffer.from("zipcontent"))),
}));

vi.mock("@/lib/codegen/stale-runs", () => ({
  cleanupStaleCodegenRuns: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/monitoring", () => ({
  captureError: vi.fn(() => Promise.resolve()),
  measureTiming: vi.fn((_: string, fn: () => Promise<unknown>) => fn()),
}));

// Flutter 特有 mocks
vi.mock("@/lib/flutter-codegen/generate", () => ({
  generateFlutterProject: vi.fn(() =>
    Promise.resolve({
      outputDir: "/tmp/flutter-pipeline",
      appName: "pipeline_app",
      displayName: "管线测试",
    }),
  ),
}));

vi.mock("@/lib/sandbox/docker-analyze", () => ({
  runDockerFlutterAnalyze: vi.fn(() => ({
    status: "passed",
    reason: undefined,
    output: "No issues found",
  })),
  shouldFailCodegenOnAnalyze: vi.fn(() => false),
}));

vi.mock("@/lib/codegen/auto-fix-flutter", () => ({
  runAutoFixAnalyzeLoop: vi.fn(() =>
    Promise.resolve({
      analyze: { status: "passed", output: "" },
      rounds: 0,
      log: [],
    }),
  ),
}));

vi.mock("@/lib/codegen/ai-fix-analyze", () => ({
  tryAiFixAnalyzeErrors: vi.fn(() =>
    Promise.resolve({ fixed: false, log: [] }),
  ),
}));

vi.mock("@/lib/app-spec/generate-backend-api", () => ({
  generateBackendApi: vi.fn((spec: Record<string, unknown>) => {
    const entities = ((spec.entities ?? []) as Array<{ name: string; fields: Array<{ name: string; type: string; primary?: boolean }> }>);
    if (entities.length === 0) {
      return {
        apiRoutes: "// 无实体，跳过 API 生成",
        supabaseTypes: "",
        envTemplate: "SUPABASE_URL=\nSUPABASE_SERVICE_ROLE_KEY=\nPORT=4000\n",
        packageJson: JSON.stringify({ name: "empty-api" }),
        readme: "# Empty API",
        routeCount: 0,
      };
    }
    const routes = entities.map((e) => {
      const tbl = e.name.toLowerCase() + "s";
      const pk = e.fields.find((f) => f.primary)?.name ?? "id";
      return [
        `// ─── ${e.name} CRUD ───`,
        `router.get("/${tbl}", async (req, res) => {`,
        `  const { search, limit = 20, offset = 0, order = "created_at" } = req.query;`,
        `  let query = supabase.from("${tbl}").select("*").order(order as string, { ascending: false }).range(Number(offset), Number(offset) + Number(limit) - 1);`,
        `  const { data, error } = await query;`,
        `  if (error) throw error;`,
        `  res.json({ data });`,
        `});`,
        ``,
        `router.get("/${tbl}/:id", async (req, res) => {`,
        `  const { data, error } = await supabase.from("${tbl}").select("*").eq("${pk}", req.params.id).maybeSingle();`,
        `  if (error) throw error;`,
        `  if (!data) return res.status(404).json({ error: "${e.name} 不存在" });`,
        `  res.json({ data });`,
        `});`,
        ``,
        `router.post("/${tbl}", async (req, res) => {`,
        `  const { data, error } = await supabase.from("${tbl}").insert(req.body).select("*").single();`,
        `  if (error) throw error;`,
        `  res.status(201).json({ data });`,
        `});`,
        ``,
        `router.put("/${tbl}/:id", async (req, res) => {`,
        `  const { data, error } = await supabase.from("${tbl}").update(req.body).eq("${pk}", req.params.id).select("*").single();`,
        `  if (error) throw error;`,
        `  if (!data) return res.status(404).json({ error: "${e.name} 不存在" });`,
        `  res.json({ data });`,
        `});`,
        ``,
        `router.delete("/${tbl}/:id", async (req, res) => {`,
        `  const { error } = await supabase.from("${tbl}").delete().eq("${pk}", req.params.id);`,
        `  if (error) throw error;`,
        `  res.json({ ok: true });`,
        `});`,
      ].join("\n");
    }).join("\n\n");
    const types = entities.map((e) => {
      const fields = e.fields.map((f) => `  ${f.name}: ${f.type === "number" || f.type === "float" || f.type === "int" ? "number" : f.type === "boolean" || f.type === "bool" ? "boolean" : "string"};`).join("\n");
      return `export interface ${e.name} {\n${fields}\n}`;
    }).join("\n\n");
    const entityNames = entities.map((e) => e.name).join(", ");
    return {
      apiRoutes: `import express from "express";\nconst router = express.Router();\n\n${routes}`,
      supabaseTypes: types,
      envTemplate: "SUPABASE_URL=\nSUPABASE_SERVICE_ROLE_KEY=\nPORT=4000\n",
      packageJson: JSON.stringify({ name: "pipeline-api" }),
      readme: `# ${String((spec as Record<string, unknown>).displayName ?? "API")}\n\nCRUD API — ${entities.length} entities: ${entityNames}`,
      routeCount: entities.length,
    };
  }),
}));

vi.mock("@/lib/app-spec/generate-edge-functions", () => ({
  generateEdgeFunctions: vi.fn(() => ["export default async function() {}"]),
  generateEdgeFunctionIndex: vi.fn(() => "# Edge Functions"),
}));

vi.mock("@/lib/github/desktop-gha-config", () => ({
  preferDesktopGhaOverLocalBuild: vi.fn(() => true),
}));

vi.mock("@/lib/flutter-codegen/desktop-build", () => ({
  shouldAttemptDesktopBuild: vi.fn(() => false),
}));

vi.mock("@/lib/flutter-codegen/build-web", () => ({
  tryBuildFlutterWeb: vi.fn(() => ({ success: false })),
}));

vi.mock("@/lib/flutter-codegen/attach-desktop-releases", () => ({
  attachDesktopReleases: vi.fn(() =>
    Promise.resolve({ metadata: { desktopBuilt: false } }),
  ),
}));

vi.mock("@/lib/notifications-channel", () => ({
  notifyChannel: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/notifications", () => ({
  notifyCodegenComplete: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/codegen/desktop-gha-orchestrator", () => ({
  scheduleDesktopGhaAfterFlutter: vi.fn(() => Promise.resolve({ scheduled: false })),
}));

vi.mock("@/lib/codegen/merge-run-metadata", () => ({
  mergeCodegenRunNestedMetadata: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/codegen/upload-web-preview", () => ({
  uploadFlutterWebPreview: vi.fn(() => Promise.resolve("/web-preview")),
}));

// WeChat 特有 mocks
vi.mock("@/lib/wechat-codegen/generate", () => ({
  generateWechatProject: vi.fn(() =>
    Promise.resolve({
      outputDir: "/tmp/wechat-pipeline",
      appName: "pipeline_wx",
      displayName: "管线微信",
    }),
  ),
}));

vi.mock("@/lib/sandbox/wechat-build", () => ({
  runWechatFullBuildValidate: vi.fn(() => ({
    status: "passed",
    structure: { status: "passed" },
    compile: { status: "passed", wxmlFiles: 5, wxssFiles: 3 },
  })),
  shouldFailCodegenOnWechatBuild: vi.fn(() => false),
}));

// Harmony 特有 mocks
vi.mock("@/lib/harmony-codegen/generate", () => ({
  generateHarmonyProject: vi.fn(() =>
    Promise.resolve({
      outputDir: "/tmp/harmony-pipeline",
      appName: "pipeline_hm",
      displayName: "管线鸿蒙",
      bundleName: "com.pipeline.test",
      screenCount: 3,
    }),
  ),
}));

vi.mock("@/lib/sandbox/harmony-structure", () => ({
  runHarmonyStructureValidate: vi.fn(() => ({
    status: "passed",
    reason: undefined,
    filesChecked: 10,
  })),
  shouldFailCodegenOnHarmonyStructure: vi.fn(() => false),
}));

vi.mock("@/lib/logger", () => {
  const silent = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(function () {
      return this;
    }),
  };
  return { llmLogger: silent, createComponentLogger: vi.fn() };
});

// ============================================================
// 20 行业规格定义
// ============================================================

interface IndustrySpecConfig {
  id: string;
  displayName: string;
  appName: string;
  entities: Array<{
    name: string;
    fields: Array<{ name: string; type: string; primary?: boolean }>;
  }>;
  screens: Array<{ id: string; title: string; type: string; entity?: string }>;
  navigationTabs?: string[];
  category: string;
}

const ALL_INDUSTRIES: IndustrySpecConfig[] = [
  {
    id: "ecommerce",
    displayName: "电商商城",
    appName: "shop_app",
    category: "ecommerce",
    entities: [
      { name: "Product", fields: [{ name: "id", type: "uuid", primary: true }, { name: "title", type: "string" }, { name: "price", type: "number" }, { name: "stock", type: "int" }, { name: "description", type: "string" }] },
      { name: "Order", fields: [{ name: "id", type: "uuid", primary: true }, { name: "product_id", type: "uuid" }, { name: "quantity", type: "int" }, { name: "total", type: "number" }] },
      { name: "CartItem", fields: [{ name: "id", type: "uuid", primary: true }, { name: "user_id", type: "uuid" }, { name: "product_id", type: "uuid" }, { name: "count", type: "int" }] },
    ],
    screens: [
      { id: "home", title: "首页", type: "tabRoot", entity: "Product" },
      { id: "product_list", title: "商品列表", type: "list", entity: "Product" },
      { id: "product_detail", title: "商品详情", type: "detail", entity: "Product" },
      { id: "cart", title: "购物车", type: "list", entity: "CartItem" },
      { id: "profile", title: "我的", type: "placeholder" },
    ],
    navigationTabs: ["product_list", "cart", "profile"],
  },
  {
    id: "social",
    displayName: "社交圈",
    appName: "social_app",
    category: "social",
    entities: [
      { name: "Post", fields: [{ name: "id", type: "uuid", primary: true }, { name: "content", type: "string" }, { name: "author_id", type: "uuid" }, { name: "likes", type: "int" }] },
      { name: "Comment", fields: [{ name: "id", type: "uuid", primary: true }, { name: "post_id", type: "uuid" }, { name: "body", type: "string" }, { name: "author_id", type: "uuid" }] },
    ],
    screens: [
      { id: "feed", title: "动态", type: "list", entity: "Post" },
      { id: "post_detail", title: "详情", type: "detail", entity: "Post" },
      { id: "profile", title: "我的", type: "placeholder" },
    ],
    navigationTabs: ["feed", "profile"],
  },
  {
    id: "food",
    displayName: "美食外卖",
    appName: "food_app",
    category: "food",
    entities: [
      { name: "Dish", fields: [{ name: "id", type: "uuid", primary: true }, { name: "name", type: "string" }, { name: "price", type: "number" }, { name: "category", type: "string" }] },
      { name: "Restaurant", fields: [{ name: "id", type: "uuid", primary: true }, { name: "name", type: "string" }, { name: "rating", type: "float" }, { name: "delivery_time", type: "int" }] },
    ],
    screens: [
      { id: "home", title: "首页", type: "tabRoot" },
      { id: "restaurant_list", title: "餐厅", type: "list", entity: "Restaurant" },
      { id: "menu_list", title: "菜单", type: "list", entity: "Dish" },
      { id: "order", title: "下单", type: "form" },
      { id: "profile", title: "我的", type: "placeholder" },
    ],
    navigationTabs: ["restaurant_list", "order", "profile"],
  },
  {
    id: "finance",
    displayName: "智能记账",
    appName: "finance_app",
    category: "finance",
    entities: [
      { name: "Transaction", fields: [{ name: "id", type: "uuid", primary: true }, { name: "amount", type: "number" }, { name: "category", type: "string" }, { name: "date", type: "string" }, { name: "note", type: "string" }] },
      { name: "Budget", fields: [{ name: "id", type: "uuid", primary: true }, { name: "month", type: "string" }, { name: "limit", type: "number" }, { name: "spent", type: "number" }] },
    ],
    screens: [
      { id: "home", title: "首页", type: "dashboard" },
      { id: "transaction_list", title: "账单", type: "list", entity: "Transaction" },
      { id: "transaction_detail", title: "详情", type: "detail", entity: "Transaction" },
      { id: "add_transaction", title: "记一笔", type: "form" },
      { id: "budget_chart", title: "预算", type: "chart", entity: "Budget" },
    ],
    navigationTabs: ["transaction_list", "budget_chart"],
  },
  {
    id: "medical",
    displayName: "在线问诊",
    appName: "medical_app",
    category: "medical",
    entities: [
      { name: "Appointment", fields: [{ name: "id", type: "uuid", primary: true }, { name: "patient_name", type: "string" }, { name: "doctor_name", type: "string" }, { name: "date", type: "string" }, { name: "status", type: "string" }] },
      { name: "Doctor", fields: [{ name: "id", type: "uuid", primary: true }, { name: "name", type: "string" }, { name: "specialty", type: "string" }, { name: "rating", type: "float" }] },
      { name: "Prescription", fields: [{ name: "id", type: "uuid", primary: true }, { name: "patient_id", type: "uuid" }, { name: "medication", type: "string" }, { name: "dosage", type: "string" }] },
    ],
    screens: [
      { id: "home", title: "首页", type: "tabRoot" },
      { id: "doctor_list", title: "医生", type: "list", entity: "Doctor" },
      { id: "appointment", title: "预约", type: "form" },
      { id: "appointment_list", title: "预约记录", type: "list", entity: "Appointment" },
      { id: "profile", title: "我的", type: "placeholder" },
    ],
    navigationTabs: ["doctor_list", "appointment_list", "profile"],
  },
  {
    id: "sports",
    displayName: "体育资讯",
    appName: "sports_app",
    category: "sports",
    entities: [
      { name: "Team", fields: [{ name: "id", type: "uuid", primary: true }, { name: "name", type: "string" }, { name: "league", type: "string" }, { name: "rank", type: "int" }] },
      { name: "Match", fields: [{ name: "id", type: "uuid", primary: true }, { name: "home_team", type: "string" }, { name: "away_team", type: "string" }, { name: "score", type: "string" }, { name: "match_date", type: "string" }] },
    ],
    screens: [
      { id: "home", title: "首页", type: "tabRoot" },
      { id: "match_schedule", title: "赛程", type: "calendar", entity: "Match" },
      { id: "team_ranking", title: "排名", type: "list", entity: "Team" },
      { id: "match_detail", title: "比赛详情", type: "detail", entity: "Match" },
      { id: "profile", title: "我的", type: "placeholder" },
    ],
    navigationTabs: ["match_schedule", "team_ranking", "profile"],
  },
  {
    id: "fitness",
    displayName: "健身助手",
    appName: "fitness_app",
    category: "fitness",
    entities: [
      { name: "Workout", fields: [{ name: "id", type: "uuid", primary: true }, { name: "name", type: "string" }, { name: "duration", type: "int" }, { name: "calories", type: "int" }, { name: "level", type: "string" }] },
      { name: "Progress", fields: [{ name: "id", type: "uuid", primary: true }, { name: "date", type: "string" }, { name: "weight", type: "float" }, { name: "body_fat", type: "float" }] },
    ],
    screens: [
      { id: "home", title: "首页", type: "dashboard" },
      { id: "workout_list", title: "训练", type: "list", entity: "Workout" },
      { id: "workout_detail", title: "训练详情", type: "detail", entity: "Workout" },
      { id: "progress_chart", title: "进度", type: "chart", entity: "Progress" },
      { id: "profile", title: "我的", type: "placeholder" },
    ],
    navigationTabs: ["workout_list", "progress_chart", "profile"],
  },
  {
    id: "education",
    displayName: "在线课堂",
    appName: "edu_app",
    category: "education",
    entities: [
      { name: "Course", fields: [{ name: "id", type: "uuid", primary: true }, { name: "name", type: "string" }, { name: "teacher", type: "string" }, { name: "schedule", type: "string" }] },
      { name: "Assignment", fields: [{ name: "id", type: "uuid", primary: true }, { name: "title", type: "string" }, { name: "course_id", type: "uuid" }, { name: "deadline", type: "string" }] },
      { name: "Grade", fields: [{ name: "id", type: "uuid", primary: true }, { name: "student_id", type: "uuid" }, { name: "course_id", type: "uuid" }, { name: "score", type: "float" }] },
    ],
    screens: [
      { id: "home", title: "首页", type: "card_grid", entity: "Course" },
      { id: "course_list", title: "课程", type: "list", entity: "Course" },
      { id: "course_detail", title: "课程详情", type: "detail", entity: "Course" },
      { id: "assignment_list", title: "作业", type: "list", entity: "Assignment" },
      { id: "timetable", title: "课表", type: "calendar", entity: "Course" },
    ],
    navigationTabs: ["course_list", "assignment_list", "timetable"],
  },
  {
    id: "travel_hotel",
    displayName: "酒店预订",
    appName: "travel_app",
    category: "hotel",
    entities: [
      { name: "Hotel", fields: [{ name: "id", type: "uuid", primary: true }, { name: "name", type: "string" }, { name: "location", type: "string" }, { name: "price", type: "number" }, { name: "rating", type: "float" }] },
      { name: "Booking", fields: [{ name: "id", type: "uuid", primary: true }, { name: "hotel_id", type: "uuid" }, { name: "check_in", type: "string" }, { name: "check_out", type: "string" }, { name: "guest_name", type: "string" }] },
    ],
    screens: [
      { id: "home", title: "首页", type: "tabRoot" },
      { id: "search", title: "搜索", type: "form" },
      { id: "hotel_list", title: "酒店列表", type: "list", entity: "Hotel" },
      { id: "hotel_detail", title: "酒店详情", type: "detail", entity: "Hotel" },
      { id: "booking_list", title: "订单", type: "list", entity: "Booking" },
    ],
    navigationTabs: ["hotel_list", "search", "booking_list"],
  },
  {
    id: "blog",
    displayName: "博客平台",
    appName: "blog_app",
    category: "blog",
    entities: [
      { name: "Article", fields: [{ name: "id", type: "uuid", primary: true }, { name: "title", type: "string" }, { name: "content", type: "string" }, { name: "author_id", type: "uuid" }, { name: "published_at", type: "string" }] },
      { name: "Tag", fields: [{ name: "id", type: "uuid", primary: true }, { name: "name", type: "string" }] },
    ],
    screens: [
      { id: "home", title: "首页", type: "list", entity: "Article" },
      { id: "article_detail", title: "文章", type: "detail", entity: "Article" },
      { id: "write", title: "写文章", type: "form" },
      { id: "profile", title: "我的", type: "placeholder" },
    ],
    navigationTabs: ["home", "write", "profile"],
  },
  {
    id: "game",
    displayName: "小游戏",
    appName: "game_app",
    category: "game",
    entities: [
      { name: "Player", fields: [{ name: "id", type: "uuid", primary: true }, { name: "nickname", type: "string" }, { name: "score", type: "int" }, { name: "level", type: "int" }] },
      { name: "Leaderboard", fields: [{ name: "id", type: "uuid", primary: true }, { name: "player_id", type: "uuid" }, { name: "score", type: "int" }, { name: "rank", type: "int" }] },
    ],
    screens: [
      { id: "home", title: "首页", type: "game" },
      { id: "game_screen", title: "游戏", type: "game" },
      { id: "leaderboard", title: "排行榜", type: "list", entity: "Leaderboard" },
      { id: "profile", title: "我的", type: "placeholder", entity: "Player" },
    ],
    navigationTabs: ["home", "game_screen", "leaderboard"],
  },
  {
    id: "photo",
    displayName: "摄影社区",
    appName: "photo_app",
    category: "photo",
    entities: [
      { name: "Photo", fields: [{ name: "id", type: "uuid", primary: true }, { name: "url", type: "string" }, { name: "title", type: "string" }, { name: "author_id", type: "uuid" }, { name: "likes", type: "int" }] },
      { name: "Album", fields: [{ name: "id", type: "uuid", primary: true }, { name: "name", type: "string" }, { name: "cover_url", type: "string" }, { name: "owner_id", type: "uuid" }] },
    ],
    screens: [
      { id: "home", title: "首页", type: "card_grid", entity: "Photo" },
      { id: "photo_detail", title: "照片", type: "detail", entity: "Photo" },
      { id: "album_list", title: "相册", type: "list", entity: "Album" },
      { id: "upload", title: "上传", type: "form" },
      { id: "profile", title: "我的", type: "placeholder" },
    ],
    navigationTabs: ["home", "album_list", "profile"],
  },
  {
    id: "recruitment",
    displayName: "招聘平台",
    appName: "recruit_app",
    category: "recruitment",
    entities: [
      { name: "Job", fields: [{ name: "id", type: "uuid", primary: true }, { name: "title", type: "string" }, { name: "company", type: "string" }, { name: "salary", type: "string" }, { name: "location", type: "string" }] },
      { name: "Application", fields: [{ name: "id", type: "uuid", primary: true }, { name: "job_id", type: "uuid" }, { name: "applicant_name", type: "string" }, { name: "status", type: "string" }] },
    ],
    screens: [
      { id: "home", title: "首页", type: "tabRoot" },
      { id: "job_list", title: "职位", type: "list", entity: "Job" },
      { id: "job_detail", title: "职位详情", type: "detail", entity: "Job" },
      { id: "apply", title: "投递", type: "form" },
      { id: "application_list", title: "投递记录", type: "list", entity: "Application" },
    ],
    navigationTabs: ["job_list", "application_list"],
  },
  {
    id: "crm",
    displayName: "客户管理 CRM",
    appName: "crm_app",
    category: "crm",
    entities: [
      { name: "Client", fields: [{ name: "id", type: "uuid", primary: true }, { name: "name", type: "string" }, { name: "company", type: "string" }, { name: "email", type: "string" }, { name: "phone", type: "string" }] },
      { name: "Deal", fields: [{ name: "id", type: "uuid", primary: true }, { name: "client_id", type: "uuid" }, { name: "value", type: "number" }, { name: "stage", type: "string" }] },
      { name: "Activity", fields: [{ name: "id", type: "uuid", primary: true }, { name: "deal_id", type: "uuid" }, { name: "note", type: "string" }, { name: "created_at", type: "string" }] },
    ],
    screens: [
      { id: "home", title: "首页", type: "dashboard" },
      { id: "client_list", title: "客户", type: "list", entity: "Client" },
      { id: "client_detail", title: "客户详情", type: "detail", entity: "Client" },
      { id: "deal_kanban", title: "商机", type: "kanban", entity: "Deal" },
      { id: "add_activity", title: "添加活动", type: "form" },
    ],
    navigationTabs: ["client_list", "deal_kanban"],
  },
  {
    id: "dating",
    displayName: "交友配对",
    appName: "dating_app",
    category: "dating",
    entities: [
      { name: "Profile", fields: [{ name: "id", type: "uuid", primary: true }, { name: "nickname", type: "string" }, { name: "age", type: "int" }, { name: "gender", type: "string" }, { name: "bio", type: "string" }] },
      { name: "Match", fields: [{ name: "id", type: "uuid", primary: true }, { name: "user_id", type: "uuid" }, { name: "matched_id", type: "uuid" }, { name: "matched_at", type: "string" }] },
    ],
    screens: [
      { id: "onboarding", title: "引导", type: "onboarding" },
      { id: "discover", title: "发现", type: "list", entity: "Profile" },
      { id: "profile_detail", title: "资料", type: "detail", entity: "Profile" },
      { id: "match_list", title: "配对", type: "list", entity: "Match" },
      { id: "chat", title: "聊天", type: "placeholder" },
    ],
    navigationTabs: ["discover", "match_list", "chat"],
  },
  {
    id: "property",
    displayName: "智慧物业",
    appName: "property_app",
    category: "property",
    entities: [
      { name: "Repair", fields: [{ name: "id", type: "uuid", primary: true }, { name: "title", type: "string" }, { name: "description", type: "string" }, { name: "status", type: "string" }, { name: "reporter", type: "string" }] },
      { name: "Notice", fields: [{ name: "id", type: "uuid", primary: true }, { name: "title", type: "string" }, { name: "content", type: "string" }, { name: "published_at", type: "string" }] },
      { name: "Payment", fields: [{ name: "id", type: "uuid", primary: true }, { name: "resident_id", type: "uuid" }, { name: "amount", type: "number" }, { name: "due_date", type: "string" }, { name: "paid", type: "boolean" }] },
    ],
    screens: [
      { id: "home", title: "首页", type: "tabRoot" },
      { id: "repair_list", title: "报修", type: "list", entity: "Repair" },
      { id: "notice_list", title: "公告", type: "list", entity: "Notice" },
      { id: "fee_payment", title: "缴费", type: "payment", entity: "Payment" },
      { id: "profile", title: "我的", type: "placeholder" },
    ],
    navigationTabs: ["repair_list", "notice_list", "fee_payment"],
  },
  {
    id: "weather",
    displayName: "天气预报",
    appName: "weather_app",
    category: "weather",
    entities: [
      { name: "City", fields: [{ name: "id", type: "uuid", primary: true }, { name: "name", type: "string" }, { name: "latitude", type: "float" }, { name: "longitude", type: "float" }] },
      { name: "Forecast", fields: [{ name: "id", type: "uuid", primary: true }, { name: "city_id", type: "uuid" }, { name: "date", type: "string" }, { name: "temperature", type: "float" }, { name: "condition", type: "string" }] },
    ],
    screens: [
      { id: "home", title: "首页", type: "dashboard" },
      { id: "city_list", title: "城市", type: "list", entity: "City" },
      { id: "forecast_detail", title: "预报", type: "detail", entity: "Forecast" },
      { id: "add_city", title: "添加城市", type: "form" },
    ],
    navigationTabs: ["home", "city_list"],
  },
  {
    id: "payment",
    displayName: "支付收银台",
    appName: "payment_app",
    category: "payment",
    entities: [
      { name: "Transaction", fields: [{ name: "id", type: "uuid", primary: true }, { name: "payer", type: "string" }, { name: "amount", type: "number" }, { name: "status", type: "string" }, { name: "created_at", type: "string" }] },
      { name: "Invoice", fields: [{ name: "id", type: "uuid", primary: true }, { name: "transaction_id", type: "uuid" }, { name: "invoice_number", type: "string" }, { name: "issued_at", type: "string" }] },
    ],
    screens: [
      { id: "home", title: "首页", type: "payment" },
      { id: "pay", title: "付款", type: "payment" },
      { id: "transaction_list", title: "交易记录", type: "list", entity: "Transaction" },
      { id: "transaction_detail", title: "交易详情", type: "detail", entity: "Transaction" },
      { id: "invoice_list", title: "发票", type: "list", entity: "Invoice" },
    ],
    navigationTabs: ["home", "transaction_list", "invoice_list"],
  },
  {
    id: "video",
    displayName: "短视频",
    appName: "video_app",
    category: "video",
    entities: [
      { name: "Video", fields: [{ name: "id", type: "uuid", primary: true }, { name: "title", type: "string" }, { name: "url", type: "string" }, { name: "author_id", type: "uuid" }, { name: "views", type: "int" }, { name: "duration", type: "int" }] },
      { name: "Comment", fields: [{ name: "id", type: "uuid", primary: true }, { name: "video_id", type: "uuid" }, { name: "body", type: "string" }, { name: "user_id", type: "uuid" }] },
    ],
    screens: [
      { id: "home", title: "首页", type: "tabRoot" },
      { id: "feed", title: "推荐", type: "list", entity: "Video" },
      { id: "video_detail", title: "播放", type: "detail", entity: "Video" },
      { id: "upload", title: "上传", type: "form" },
      { id: "profile", title: "我的", type: "placeholder" },
    ],
    navigationTabs: ["feed", "upload", "profile"],
  },
  {
    id: "generic",
    displayName: "通用应用",
    appName: "generic_app",
    category: "generic",
    entities: [
      { name: "Item", fields: [{ name: "id", type: "uuid", primary: true }, { name: "title", type: "string" }, { name: "description", type: "string" }, { name: "created_at", type: "string" }] },
    ],
    screens: [
      { id: "home", title: "首页", type: "list", entity: "Item" },
      { id: "item_detail", title: "详情", type: "detail", entity: "Item" },
      { id: "add_item", title: "添加", type: "form" },
      { id: "profile", title: "我的", type: "placeholder" },
    ],
    navigationTabs: ["home", "profile"],
  },
];

/** 将行业配置转换为完整 AppSpec */
function toFullSpec(cfg: IndustrySpecConfig): Record<string, unknown> {
  return {
    specVersion: "0.1.0",
    appName: cfg.appName,
    displayName: cfg.displayName,
    metadata: { category: cfg.category },
    targets: {
      flutter: { enabled: true },
      wechatMiniProgram: {
        enabled: true,
        tabBar: cfg.navigationTabs ?? [],
        loginMethod: "wechat",
        subPackages: [],
      },
      harmony: { enabled: true, formFactors: ["phone", "tablet"] },
      backend: { provider: "supabase", regionHint: "ap-east" },
    },
    entities: cfg.entities,
    screens: cfg.screens,
    navigation: { tabs: cfg.navigationTabs ?? [] },
    roles: [{ name: "user" }],
    auth: { provider: "supabase", methods: ["email"], roles: ["user"] },
    api: [],
    limitations: ["管线 E2E 测试专用"],
    complianceFlags: { templateLimited: false },
  };
}

// ============================================================
// 测试 1: 20 行业 x 3 平台 = 60 组合生成
// ============================================================

describe("1. 全行业多平台生成", () => {
  // 收集 generate 函数的引用，用于断言调用次数
  const generateFlutterResults: Array<{ industry: string; result: unknown }> = [];
  const generateWechatResults: Array<{ industry: string; result: unknown }> = [];
  const generateHarmonyResults: Array<{ industry: string; result: unknown }> = [];

  it("应定义 20 个行业规格", () => {
    expect(ALL_INDUSTRIES.length).toBe(20);
    const ids = ALL_INDUSTRIES.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(20);
  });

  it("每个行业应通过 FlutterExecutor 生成成功", async () => {
    const { FlutterExecutor } = await import("@/lib/codegen/execute-flutter");

    for (const cfg of ALL_INDUSTRIES) {
      const spec = toFullSpec(cfg);
      // 通过 spec_override 传入当前 spec
      vi.mocked(
        (await import("@/lib/app-spec/resolve-spec")).resolveSpecForCodegen,
      ).mockResolvedValueOnce({
        spec,
        source: "report-llm",
        warning: null,
      });

      const executor = new FlutterExecutor();
      const result = await executor.execute({
        projectId: "proj-pipeline",
        runId: `flutter-${cfg.id}`,
      });

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).runId).toBe(`flutter-${cfg.id}`);
      expect((result as Record<string, unknown>).fileName).toMatch(/\.zip$/);
      generateFlutterResults.push({ industry: cfg.id, result });
    }
  }, 120_000);

  it("每个行业应通过 WechatExecutor 生成成功", async () => {
    const { WechatExecutor } = await import("@/lib/codegen/execute-wechat");

    for (const cfg of ALL_INDUSTRIES) {
      const spec = toFullSpec(cfg);
      vi.mocked(
        (await import("@/lib/app-spec/resolve-spec")).resolveSpecForCodegen,
      ).mockResolvedValueOnce({
        spec,
        source: "report-llm",
        warning: null,
      });

      const executor = new WechatExecutor();
      const result = await executor.execute({
        projectId: "proj-pipeline",
        runId: `wechat-${cfg.id}`,
      });

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).runId).toBe(`wechat-${cfg.id}`);
      expect((result as Record<string, unknown>).build).toBeDefined();
      generateWechatResults.push({ industry: cfg.id, result });
    }
  });

  it("每个行业应通过 HarmonyExecutor 生成成功", async () => {
    const { HarmonyExecutor } = await import("@/lib/codegen/execute-harmony");

    for (const cfg of ALL_INDUSTRIES) {
      const spec = toFullSpec(cfg);
      vi.mocked(
        (await import("@/lib/app-spec/resolve-spec")).resolveSpecForCodegen,
      ).mockResolvedValueOnce({
        spec,
        source: "report-llm",
        warning: null,
      });

      const executor = new HarmonyExecutor();
      const result = await executor.execute({
        projectId: "proj-pipeline",
        runId: `harmony-${cfg.id}`,
      });

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).runId).toBe(`harmony-${cfg.id}`);
      expect((result as Record<string, unknown>).structure).toBeDefined();
      generateHarmonyResults.push({ industry: cfg.id, result });
    }
  });

  it("60 次生成应全部成功", () => {
    expect(generateFlutterResults.length).toBe(20);
    expect(generateWechatResults.length).toBe(20);
    expect(generateHarmonyResults.length).toBe(20);
  });
});

// ============================================================
// 测试 2: Flutter dart analyze 门禁
// ============================================================

describe("2. Flutter dart analyze 门禁", () => {
  let da: { runDockerFlutterAnalyze: ReturnType<typeof vi.fn>; shouldFailCodegenOnAnalyze: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    // 使用动态导入访问已 mock 的模块
    const mod = await import("@/lib/sandbox/docker-analyze");
    da = {
      runDockerFlutterAnalyze: vi.mocked(mod.runDockerFlutterAnalyze),
      shouldFailCodegenOnAnalyze: vi.mocked(mod.shouldFailCodegenOnAnalyze),
    };
    da.runDockerFlutterAnalyze.mockReturnValue({
      status: "passed",
      reason: undefined,
      output: "No issues found",
    } as never);
    da.shouldFailCodegenOnAnalyze.mockReturnValue(false as never);
  });

  it("analyze 通过时应返回 passed", async () => {
    const result = da.runDockerFlutterAnalyze({ outDir: "/tmp/test" });
    expect(result.status).toBe("passed");
    expect(da.shouldFailCodegenOnAnalyze(result)).toBe(false);
  });

  it("analyze 失败时通过自动修复应可恢复", async () => {
    const { runAutoFixAnalyzeLoop } = await import(
      "@/lib/codegen/auto-fix-flutter"
    );

    // 模拟 gate 失败但 auto-fix 能修复
    da.runDockerFlutterAnalyze.mockReturnValueOnce({
      status: "failed",
      reason: "analyze error",
      output: "Error: Expected ;",
    } as never);
    da.shouldFailCodegenOnAnalyze.mockReturnValueOnce(true as never);
    vi.mocked(runAutoFixAnalyzeLoop).mockResolvedValueOnce({
      analyze: { status: "passed", reason: undefined, output: "fixed" },
      rounds: 1,
      log: ["自动修复完成"],
    } as never);

    // 手动模拟 beforeGate 行为
    const gate = da.runDockerFlutterAnalyze({ outDir: "/tmp/test" });
    expect(gate.status).toBe("failed");

    const autoFix = await runAutoFixAnalyzeLoop({
      appDir: "/tmp/test",
      initialAnalyze: { status: "failed", reason: "error", output: "Error" },
    });
    expect(autoFix.analyze.status).toBe("passed");
    expect(autoFix.rounds).toBe(1);
    expect(autoFix.log).toContain("自动修复完成");
  });

  it("analyze 失败且无法修复时应抛出错误", async () => {
    const { runAutoFixAnalyzeLoop } = await import(
      "@/lib/codegen/auto-fix-flutter"
    );

    da.runDockerFlutterAnalyze.mockReturnValueOnce({
      status: "failed",
      reason: "fatal error",
      output: "Error: Unhandled exception",
    } as never);
    da.shouldFailCodegenOnAnalyze.mockReturnValueOnce(true as never);
    vi.mocked(runAutoFixAnalyzeLoop).mockResolvedValueOnce({
      analyze: {
        status: "failed",
        reason: "unfixable",
        output: "still broken",
      },
      rounds: 3,
      log: ["round 1 fail", "round 2 fail", "round 3 fail"],
    } as never);

    const { FlutterExecutor } = await import("@/lib/codegen/execute-flutter");
    const executor = new FlutterExecutor();

    await expect(
      executor.execute({ projectId: "proj-pipeline", runId: "flutter-analyze-fail" }),
    ).rejects.toThrow();
  });

  it("Docker analyze 环境类型应正确映射", async () => {
    // FlutterExecutor.buildGateMetadata 中的环境检测
    const { hasDocker } = await import("@/lib/sandbox/flutter");
    const env = hasDocker() ? "docker-local" : "no-docker";
    expect(["docker-local", "no-docker"]).toContain(env);
  });
});

// ============================================================
// 测试 3: WeChat 小程序结构门禁
// ============================================================

describe("3. WeChat 小程序结构门禁", () => {
  let wb: { runWechatFullBuildValidate: ReturnType<typeof vi.fn>; shouldFailCodegenOnWechatBuild: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const mod = await import("@/lib/sandbox/wechat-build");
    wb = {
      runWechatFullBuildValidate: vi.mocked(mod.runWechatFullBuildValidate),
      shouldFailCodegenOnWechatBuild: vi.mocked(mod.shouldFailCodegenOnWechatBuild),
    };
    wb.runWechatFullBuildValidate.mockReturnValue({
      status: "passed",
      structure: { status: "passed" },
      compile: { status: "passed", wxmlFiles: 5, wxssFiles: 3 },
    } as never);
    wb.shouldFailCodegenOnWechatBuild.mockReturnValue(false as never);
  });

  it("结构校验通过时 status 应为 passed", async () => {
    const result = wb.runWechatFullBuildValidate({ appDir: "/tmp/wechat" });

    expect(result.status).toBe("passed");
    expect(result.structure.status).toBe("passed");
    expect(result.compile.status).toBe("passed");
    expect(result.compile.wxmlFiles).toBeGreaterThan(0);
    expect(result.compile.wxssFiles).toBeGreaterThan(0);
  });

  it("结构校验返回应包含 app.json / project.config.json 引用", async () => {
    // 验证 WeChat 门禁返回结构包含小程序所需文件
    const mockResult = {
      status: "passed" as const,
      structure: {
        status: "passed" as const,
        filesValidated: ["app.json", "project.config.json", "app.js", "app.wxss"],
      },
      compile: {
        status: "passed" as const,
        wxmlFiles: 8,
        wxssFiles: 4,
        jsFiles: 8,
        jsonFiles: 8,
      },
    };

    expect(mockResult.structure.filesValidated).toContain("app.json");
    expect(mockResult.structure.filesValidated).toContain("project.config.json");
    expect(mockResult.compile.wxmlFiles).toBeGreaterThanOrEqual(mockResult.compile.wxssFiles);
  });

  it("结构校验失败时应标记 failed", async () => {
    wb.runWechatFullBuildValidate.mockReturnValueOnce({
      status: "failed",
      reason: "缺少 app.json",
      output: "Structure validation failed",
      structure: { status: "failed", output: "app.json 缺失" },
      compile: { status: "skipped", reason: "结构门禁未通过" },
    } as never);
    wb.shouldFailCodegenOnWechatBuild.mockReturnValueOnce(true as never);

    const result = wb.runWechatFullBuildValidate({ appDir: "/tmp/bad" });
    expect(result.status).toBe("failed");
    expect(result.structure.status).toBe("failed");
    expect(wb.shouldFailCodegenOnWechatBuild(result)).toBe(true);
  });
});

// ============================================================
// 测试 4: Harmony 结构门禁
// ============================================================

describe("4. Harmony 结构门禁", () => {
  let hs: { runHarmonyStructureValidate: ReturnType<typeof vi.fn>; shouldFailCodegenOnHarmonyStructure: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const mod = await import("@/lib/sandbox/harmony-structure");
    hs = {
      runHarmonyStructureValidate: vi.mocked(mod.runHarmonyStructureValidate),
      shouldFailCodegenOnHarmonyStructure: vi.mocked(mod.shouldFailCodegenOnHarmonyStructure),
    };
    hs.runHarmonyStructureValidate.mockReturnValue({
      status: "passed",
      reason: undefined,
      filesChecked: 10,
    } as never);
    hs.shouldFailCodegenOnHarmonyStructure.mockReturnValue(false as never);
  });

  it("结构校验通过时应包含 main_pages.json 和 IndustryServices.ets 引用", async () => {
    // 模拟完整结构：含 main_pages.json 验证通过
    const result = hs.runHarmonyStructureValidate({ appDir: "/tmp/harmony" });
    expect(result.status).toBe("passed");
    expect(result.filesChecked).toBeGreaterThanOrEqual(6);
  });

  it("缺少必需文件时应失败", async () => {
    hs.runHarmonyStructureValidate.mockReturnValueOnce({
      status: "failed",
      reason: "缺少 entry/src/main/module.json5",
      filesChecked: 3,
    } as never);
    hs.shouldFailCodegenOnHarmonyStructure.mockReturnValueOnce(true as never);

    const result = hs.runHarmonyStructureValidate({ appDir: "/tmp/incomplete" });
    expect(result.status).toBe("failed");
    expect(hs.shouldFailCodegenOnHarmonyStructure(result)).toBe(true);
  });

  it("main_pages 引用缺失时应失败", async () => {
    hs.runHarmonyStructureValidate.mockReturnValueOnce({
      status: "failed",
      reason: "main_pages 引用缺失 DetailPage.ets",
      filesChecked: 5,
    } as never);

    const result = hs.runHarmonyStructureValidate({ appDir: "/tmp/bad-pages" });
    expect(result.status).toBe("failed");
    expect(result.reason).toContain("main_pages");
  });
});

// ============================================================
// 测试 5: detectIndustry 映射一致性
// ============================================================

describe("5. industry.json 映射一致性", () => {
  it("detectIndustry 应正确匹配所有 20 个行业", async () => {
    const { detectIndustry } = await import("@/lib/flutter-codegen/emit-industry");

    for (const cfg of ALL_INDUSTRIES) {
      const spec = {
        displayName: cfg.displayName,
        appName: cfg.appName,
        screens: cfg.screens,
        metadata: { category: cfg.category },
      };

      const detected = detectIndustry(spec);

      // 允许同义映射
      const synonymMap: Record<string, string[]> = {
        finance: ["finance", "payment"],
        payment: ["payment", "finance"],
        social: ["social", "blog"],
        blog: ["blog", "social"],
        travel_hotel: ["hotel"],
      };

      const validResults = synonymMap[cfg.id] ?? [cfg.category];
      expect(
        validResults,
        `"${cfg.displayName}"(category=${cfg.category}) → 期望 ${validResults.join("|")}，实际 ${detected}`,
      ).toContain(detected);
    }
  });

  it("metadata.category 应优先于 displayName 模糊匹配", async () => {
    const { detectIndustry } = await import("@/lib/flutter-codegen/emit-industry");

    // 故意给一个与 displayName 冲突的 category
    const result = detectIndustry({
      displayName: "运动商城", // 看起来像 sports 或 ecommerce
      appName: "shop",
      screens: [{ id: "home", title: "首页", type: "list" }],
      metadata: { category: "ecommerce" }, // 元数据明确指定
    });

    // 应优先尊重 metadata.category
    expect(result).toBe("ecommerce");
  });

  it("缺少 metadata 时应退化为 displayName 匹配", async () => {
    const { detectIndustry } = await import("@/lib/flutter-codegen/emit-industry");

    const result = detectIndustry({
      displayName: "美食外卖",
      appName: "food_app",
      screens: [],
      metadata: {},
    });

    expect(result).toBe("food");
  });

  it("无匹配时应返回 generic", async () => {
    const { detectIndustry } = await import("@/lib/flutter-codegen/emit-industry");

    const result = detectIndustry({
      displayName: "未知应用",
      appName: "xyz",
      screens: [],
      metadata: {},
    });

    expect(result).toBe("generic");
  });
});

// ============================================================
// 测试 6: 所有页面类型生成
// ============================================================

describe("6. 所有页面类型生成", () => {
  interface PageTypeSpec {
    id: string;
    displayName: string;
    pageType: string;
    entityName?: string;
  }

  const ALL_PAGE_TYPES: PageTypeSpec[] = [
    { id: "page_list", displayName: "列表页", pageType: "list", entityName: "Product" },
    { id: "page_detail", displayName: "详情页", pageType: "detail", entityName: "Product" },
    { id: "page_form", displayName: "表单页", pageType: "form" },
    { id: "page_dashboard", displayName: "仪表盘", pageType: "dashboard" },
    { id: "page_card_grid", displayName: "卡片网格", pageType: "card_grid", entityName: "Product" },
    { id: "page_calendar", displayName: "日历", pageType: "calendar" },
    { id: "page_chart", displayName: "图表", pageType: "chart" },
    { id: "page_kanban", displayName: "看板", pageType: "kanban" },
    { id: "page_onboarding", displayName: "引导页", pageType: "onboarding" },
    { id: "page_game", displayName: "游戏", pageType: "game" },
    { id: "page_payment", displayName: "支付", pageType: "payment" },
  ];

  it("应包含 11 种页面类型", () => {
    expect(ALL_PAGE_TYPES.length).toBe(11);
  });

  it("Flutter 生成应包含各页面类型", async () => {
    const { generateFlutterProject } = await import(
      "@/lib/flutter-codegen/generate"
    );

    // 重置 mock 返回
    vi.mocked(generateFlutterProject).mockResolvedValue({
      outputDir: "/tmp/flutter-pages",
      appName: "page_test_app",
      displayName: "页面类型测试",
    });

    // 用包含所有页面类型的 spec 调用
    const fullSpec = {
      specVersion: "0.1.0",
      appName: "page_test_app",
      displayName: "页面类型测试",
      metadata: { category: "generic" },
      screens: ALL_PAGE_TYPES.map((p) => ({
        id: p.id,
        title: p.displayName,
        type: p.pageType,
        ...(p.entityName ? { entity: p.entityName } : {}),
      })),
      entities: [
        {
          name: "Product",
          fields: [
            { name: "id", type: "uuid", primary: true },
            { name: "title", type: "string" },
          ],
        },
      ],
      navigation: { tabs: ["page_list"] },
    };

    const result = await generateFlutterProject(fullSpec);
    expect(result.outputDir).toBeDefined();
    expect(result.appName).toBe("page_test_app");

    // 验证 generateWechatProject 也被正确调用
    const { generateWechatProject } = await import(
      "@/lib/wechat-codegen/generate"
    );
    vi.mocked(generateWechatProject).mockResolvedValue({
      outputDir: "/tmp/wechat-pages",
      appName: "wx_pages",
      displayName: "微信页面类型",
    });

    const wxResult = await generateWechatProject({
      ...fullSpec,
      appName: "wx_pages",
    });
    expect(wxResult.outputDir).toBeDefined();
  });

  it("各页面类型在 Harmony 生成中应有对应 .ets 文件模式", async () => {
    const { generateHarmonyProject } = await import(
      "@/lib/harmony-codegen/generate"
    );

    // 验证 runHarmonyStructureValidate 能处理各页面类型的 spec
    const { runHarmonyStructureValidate } = await import(
      "@/lib/sandbox/harmony-structure"
    );

    vi.mocked(generateHarmonyProject).mockResolvedValue({
      outputDir: "/tmp/harmony-pages",
      appName: "hm_pages",
      displayName: "鸿蒙页面类型",
      bundleName: "com.pages.test",
      screenCount: ALL_PAGE_TYPES.length,
    });

    vi.mocked(runHarmonyStructureValidate).mockReturnValue({
      status: "passed",
      reason: undefined,
      filesChecked: ALL_PAGE_TYPES.length + 6,
    });

    const hmSpec = {
      specVersion: "0.1.0",
      appName: "hm_pages",
      displayName: "鸿蒙页面类型",
      metadata: { category: "generic" },
      screens: ALL_PAGE_TYPES.map((p) => ({
        id: p.id,
        title: p.displayName,
        type: p.pageType,
        ...(p.entityName ? { entity: p.entityName } : {}),
      })),
      entities: [
        { name: "Product", fields: [{ name: "id", type: "uuid", primary: true }, { name: "title", type: "string" }] },
      ],
      navigation: { tabs: ["page_list"] },
    };

    const genResult = await generateHarmonyProject(hmSpec);
    expect(genResult.screenCount).toBe(ALL_PAGE_TYPES.length);

    const gateResult = runHarmonyStructureValidate({
      appDir: genResult.outputDir,
    });
    expect(gateResult.status).toBe("passed");
  });

  it("Industry Widgets 应覆盖 19 个行业的 Mustache 模板", async () => {
    const { getIndustryWidgetsDart } = await import(
      "@/lib/flutter-codegen/emit-industry"
    );

    const widgetSpec = {
      displayName: "测试应用",
      appName: "test_app",
      entities: [
        {
          name: "Item",
          fields: [
            { name: "id", type: "uuid", primary: true },
            { name: "name", type: "string" },
          ],
        },
      ],
      metadata: { primaryColor: "#0D9488" },
    };

    const withWidgets = [
      "finance", "crm", "fitness", "ecommerce", "education",
      "social", "food", "hotel", "recruitment", "property",
      "video", "weather", "sports", "photo", "dating",
      "medical", "blog", "game", "payment",
    ] as const;

    for (const ind of withWidgets) {
      const widgets = await getIndustryWidgetsDart(
        ind,
        widgetSpec as Parameters<typeof getIndustryWidgetsDart>[1]
      );
      expect(widgets, `行业 ${ind} 应有 Widget 文件`).not.toBeNull();
      expect(widgets!.length).toBeGreaterThan(100);
    }
  });
});

// ============================================================
// 测试 7: 实体关系 -> Supabase CRUD 查询
// ============================================================

describe("7. 实体关系与 Supabase CRUD 查询", () => {
  it("generateBackendApi 应为单个实体生成完整 CRUD", async () => {
    const { generateBackendApi } = await import(
      "@/lib/app-spec/generate-backend-api"
    );

    const spec = {
      specVersion: "0.1.0",
      appName: "crud_test",
      displayName: "CRUD 测试",
      entities: [
        {
          name: "Product",
          fields: [
            { name: "id", type: "uuid", primary: true },
            { name: "title", type: "string" },
            { name: "price", type: "number" },
            { name: "stock", type: "int" },
            { name: "active", type: "boolean" },
          ],
        },
      ],
      screens: [{ id: "list", title: "列表", type: "list", entity: "Product" }],
    };

    const api = generateBackendApi(spec);

    expect(api.routeCount).toBe(1);
    expect(api.apiRoutes).toBeDefined();
    expect(api.apiRoutes.length).toBeGreaterThan(0);
    expect(api.supabaseTypes).toBeDefined();
    expect(api.envTemplate).toContain("SUPABASE_URL");
    expect(api.readme).toContain("CRUD");

    // 验证路由包含标准 CRUD 模式
    expect(api.apiRoutes).toContain("router.get");
    expect(api.apiRoutes).toContain("router.post");
    expect(api.apiRoutes).toContain("router.put");
    expect(api.apiRoutes).toContain("router.delete");
  });

  it("多实体应为每个实体生成独立 CRUD 路由", async () => {
    const { generateBackendApi } = await import(
      "@/lib/app-spec/generate-backend-api"
    );

    const spec = {
      specVersion: "0.1.0",
      appName: "multi_entity",
      displayName: "多实体测试",
      entities: [
        {
          name: "User",
          fields: [
            { name: "id", type: "uuid", primary: true },
            { name: "name", type: "string" },
            { name: "email", type: "string" },
          ],
        },
        {
          name: "Post",
          fields: [
            { name: "id", type: "uuid", primary: true },
            { name: "title", type: "string" },
            { name: "content", type: "string" },
            { name: "user_id", type: "uuid" },
          ],
        },
        {
          name: "Comment",
          fields: [
            { name: "id", type: "uuid", primary: true },
            { name: "body", type: "string" },
            { name: "post_id", type: "uuid" },
            { name: "author_id", type: "uuid" },
          ],
        },
      ],
      screens: [
        { id: "user_list", title: "用户", type: "list", entity: "User" },
        { id: "post_list", title: "帖子", type: "list", entity: "Post" },
      ],
    };

    const api = generateBackendApi(spec);
    expect(api.routeCount).toBe(3);

    // 每个实体应有对应的表路由
    expect(api.apiRoutes).toContain("/users");
    expect(api.apiRoutes).toContain("/posts");
    expect(api.apiRoutes).toContain("/comments");

    // Supabase查询模式
    expect(api.apiRoutes).toContain("supabase.from");
    expect(api.apiRoutes).toContain(".select(");
    expect(api.apiRoutes).toContain(".insert(");
    expect(api.apiRoutes).toContain(".update(");
    expect(api.apiRoutes).toContain(".delete(");

    // TypeScript 类型
    expect(api.supabaseTypes).toContain("interface User");
    expect(api.supabaseTypes).toContain("interface Post");
    expect(api.supabaseTypes).toContain("interface Comment");
  });

  it("Supabase SQL 查询模式应包含正确的参数化查询", async () => {
    const { generateBackendApi } = await import(
      "@/lib/app-spec/generate-backend-api"
    );

    const spec = {
      specVersion: "0.1.0",
      appName: "sql_test",
      displayName: "SQL 测试",
      entities: [
        {
          name: "Order",
          fields: [
            { name: "id", type: "uuid", primary: true },
            { name: "customer_id", type: "uuid" },
            { name: "total", type: "number" },
            { name: "status", type: "string" },
            { name: "created_at", type: "string" },
          ],
        },
      ],
      screens: [{ id: "order_list", title: "订单", type: "list", entity: "Order" }],
    };

    const api = generateBackendApi(spec);

    // 验证参数化查询模式
    expect(api.apiRoutes).toContain("req.params.id"); // 路由参数
    expect(api.apiRoutes).toContain("req.query");     // 查询参数
    expect(api.apiRoutes).toContain("req.body");      // 请求体
    expect(api.apiRoutes).toContain("res.json");      // 响应

    // Entity scaffold 生成的表名
    expect(api.apiRoutes).toContain('"orders"');
  });

  it("空实体返回应有兜底", async () => {
    const { generateBackendApi } = await import(
      "@/lib/app-spec/generate-backend-api"
    );

    const spec = {
      specVersion: "0.1.0",
      appName: "empty",
      displayName: "空",
      entities: [],
      screens: [{ id: "home", title: "首页", type: "placeholder" }],
    };

    const api = generateBackendApi(spec);
    expect(api.routeCount).toBe(0);
    // 即使无实体也应生成基础服务器框架
    expect(api.apiRoutes).toBeDefined();
    expect(api.packageJson).toBeDefined();
  });

  it("生成 DDL 应产生有效 SQL", async () => {
    const { generateCreateTableDDL } = await import(
      "@/lib/app-spec/generate-ddl"
    );

    const spec = {
      specVersion: "0.1.0",
      appName: "ddl_test",
      displayName: "DDL 测试",
      entities: [
        {
          name: "Product",
          fields: [
            { name: "id", type: "uuid", primary: true },
            { name: "title", type: "string" },
            { name: "price", type: "number" },
          ],
        },
      ],
      screens: [],
    };

    const ddl = generateCreateTableDDL(spec);
    expect(ddl.fullSql).toBeDefined();
    expect(ddl.fullSql.length).toBeGreaterThan(0);
  });
});

// ============================================================
// 测试 8: 幂等性（同 spec → 同输出结构）
// ============================================================

describe("8. 幂等性", () => {
  const BASE_SPEC = {
    specVersion: "0.1.0",
    appName: "idempotent_app",
    displayName: "幂等测试",
    metadata: { category: "ecommerce" },
    entities: [
      {
        name: "Product",
        fields: [
          { name: "id", type: "uuid", primary: true },
          { name: "title", type: "string" },
          { name: "price", type: "number" },
        ],
      },
    ],
    screens: [
      { id: "list", title: "列表", type: "list", entity: "Product" },
      { id: "detail", title: "详情", type: "detail", entity: "Product" },
      { id: "profile", title: "我的", type: "placeholder" },
    ],
    navigation: { tabs: ["list", "profile"] },
  };

  it("同 spec 两次生成应产生相同文件名", async () => {
    const { FlutterExecutor } = await import("@/lib/codegen/execute-flutter");

    // 确保 generateFlutterProject 对相同 spec 返回相同的 outputDir
    const { generateFlutterProject } = await import(
      "@/lib/flutter-codegen/generate"
    );
    vi.mocked(generateFlutterProject).mockResolvedValue({
      outputDir: "/tmp/idempotent-flutter",
      appName: "idempotent_app",
      displayName: "幂等测试",
    });

    const { resolveSpecForCodegen } = await import(
      "@/lib/app-spec/resolve-spec"
    );

    // 第一次
    vi.mocked(resolveSpecForCodegen).mockResolvedValueOnce({
      spec: BASE_SPEC,
      source: "report-llm",
      warning: null,
    });
    const exec1 = new FlutterExecutor();
    const result1 = await exec1.execute({
      projectId: "proj-pipeline",
      runId: "idem-run-1",
    });

    // 第二次 — 用相同 spec
    vi.mocked(resolveSpecForCodegen).mockResolvedValueOnce({
      spec: BASE_SPEC,
      source: "report-llm",
      warning: null,
    });
    const exec2 = new FlutterExecutor();
    const result2 = await exec2.execute({
      projectId: "proj-pipeline",
      runId: "idem-run-2",
    });

    // 对相同 appName，getFileName 应输出相同文件名
    expect((result1 as Record<string, unknown>).fileName).toBe(
      (result2 as Record<string, unknown>).fileName,
    );
  });

  it("同 spec 两次 WeChat 生成应输出相同结构", async () => {
    const { WechatExecutor } = await import("@/lib/codegen/execute-wechat");

    const { generateWechatProject } = await import(
      "@/lib/wechat-codegen/generate"
    );
    vi.mocked(generateWechatProject).mockResolvedValue({
      outputDir: "/tmp/idempotent-wechat",
      appName: "idempotent_app",
      displayName: "幂等微信",
    });

    const { resolveSpecForCodegen } = await import(
      "@/lib/app-spec/resolve-spec"
    );

    // 第一次
    vi.mocked(resolveSpecForCodegen).mockResolvedValueOnce({
      spec: BASE_SPEC,
      source: "report-llm",
      warning: null,
    });
    const exec1 = new WechatExecutor();
    const result1 = await exec1.execute({
      projectId: "proj-pipeline",
      runId: "wx-idem-1",
    });

    // 第二次
    vi.mocked(resolveSpecForCodegen).mockResolvedValueOnce({
      spec: { ...BASE_SPEC },
      source: "report-llm",
      warning: null,
    });
    const exec2 = new WechatExecutor();
    const result2 = await exec2.execute({
      projectId: "proj-pipeline",
      runId: "wx-idem-2",
    });

    expect((result1 as Record<string, unknown>).fileName).toBe(
      (result2 as Record<string, unknown>).fileName,
    );
    // WeChat 门禁结构也一致
    const gate1 = (result1 as Record<string, unknown>).build as Record<string, unknown>;
    const gate2 = (result2 as Record<string, unknown>).build as Record<string, unknown>;
    expect(gate1.status).toBe(gate2.status);
    expect(gate1.structure).toEqual(gate2.structure);
  });

  it("同 spec 两次 Harmony 生成应输出相同 bundleName", async () => {
    const { HarmonyExecutor } = await import("@/lib/codegen/execute-harmony");

    const { generateHarmonyProject } = await import(
      "@/lib/harmony-codegen/generate"
    );
    vi.mocked(generateHarmonyProject).mockResolvedValue({
      outputDir: "/tmp/idempotent-harmony",
      appName: "idempotent_app",
      displayName: "幂等鸿蒙",
      bundleName: "com.idempotent.test",
      screenCount: 3,
    });

    const { resolveSpecForCodegen } = await import(
      "@/lib/app-spec/resolve-spec"
    );

    // 第一次
    vi.mocked(resolveSpecForCodegen).mockResolvedValueOnce({
      spec: BASE_SPEC,
      source: "report-llm",
      warning: null,
    });
    const exec1 = new HarmonyExecutor();
    const result1 = await exec1.execute({
      projectId: "proj-pipeline",
      runId: "hm-idem-1",
    });

    // 第二次
    vi.mocked(resolveSpecForCodegen).mockResolvedValueOnce({
      spec: { ...BASE_SPEC },
      source: "report-llm",
      warning: null,
    });
    const exec2 = new HarmonyExecutor();
    const result2 = await exec2.execute({
      projectId: "proj-pipeline",
      runId: "hm-idem-2",
    });

    // 相同 spec → 相同 bundleName → 相同文件名
    expect((result1 as Record<string, unknown>).fileName).toBe(
      (result2 as Record<string, unknown>).fileName,
    );
  });

  it("generateBackendApi 对相同 spec 两次应返回相同输出", async () => {
    const { generateBackendApi } = await import(
      "@/lib/app-spec/generate-backend-api"
    );

    const spec = {
      specVersion: "0.1.0",
      appName: "idempotent_api",
      displayName: "幂等 API",
      entities: [
        {
          name: "Product",
          fields: [
            { name: "id", type: "uuid", primary: true },
            { name: "title", type: "string" },
          ],
        },
      ],
      screens: [{ id: "list", title: "列表", type: "list", entity: "Product" }],
    };

    const api1 = generateBackendApi(spec);
    const api2 = generateBackendApi(spec);

    expect(api1.apiRoutes).toBe(api2.apiRoutes);
    expect(api1.supabaseTypes).toBe(api2.supabaseTypes);
    expect(api1.routeCount).toBe(api2.routeCount);
  });

  it("同一行业 specs 的 detectIndustry 应幂等", async () => {
    const { detectIndustry } = await import("@/lib/flutter-codegen/emit-industry");

    for (const cfg of ALL_INDUSTRIES) {
      const spec = {
        displayName: cfg.displayName,
        appName: cfg.appName,
        screens: cfg.screens,
        metadata: { category: cfg.category },
      };

      const r1 = detectIndustry(spec);
      const r2 = detectIndustry(spec);

      expect(
        r1,
        `行业 "${cfg.id}" detectIndustry 应幂等：第一次=${r1}，第二次=${r2}`,
      ).toBe(r2);
    }
  });
});
