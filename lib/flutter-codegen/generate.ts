import fs from "fs/promises";
import path from "path";
import os from "os";

import type { AppSpec } from "@/lib/app-spec/types";
import { validateAppSpec } from "@/lib/app-spec/validate";
import {
  formatBackendTargetMarkdown,
  resolveBackendTarget
} from "@/lib/app-spec/backend-target";
import { isTodoAppSpec } from "@/lib/app-spec/detect-todo-app";
import {
  emitAppRouterDart,
  emitGeneratedListPage,
  emitGeneratedPlaceholderPage,
  emitMatchListPageFromSpec,
  pageWidgetRef,
  patchAppTitle,
  patchListPageTitle,
  patchPubspecName,
  resolveTabScreens
} from "./dart-emit";
import { emitTodoListPageDart } from "./emit-todo";
import { emitFlutterEntityDetailPage } from "./emit-entity-detail";
import { emitFlutterFormPlaceholder } from "./emit-form";
import { emitFlutterLoginPage, emitFlutterRegisterPage } from "./emit-auth";
import { emitPolishedWidgetsDart } from "./emit-polished-widgets";
import { emitUXWidgetsDart } from "./emit-ux-widgets";
import { emitFlutterMapPage, emitFlutterMapListPage } from "./emit-map";
import { emitFlutterChatListPage, emitFlutterChatRoomPage } from "./emit-chat";
import {
  emitFlutterWebRTCCallPage,
  emitFlutterPaymentPage,
  emitFlutterBLEScannerPage,
  emitFlutterGamePage,
  emitFlutterARPage
} from "./emit-advanced";
import {
  emitFlutterHealthDashboard,
  emitFlutterMedicalBLEDevice,
  emitFlutterMedicationReminder,
  emitFlutterHIPAACompliance
} from "./emit-medical";
import {
  emitFlutterOBD2Diagnostic,
  emitFlutterCarDashboard,
  emitFlutterTripLogger,
  emitFlutterCarPlayScaffold
} from "./emit-automotive";
import {
  emitFlutterBankingPayment,
  emitFlutterInsuranceClaims,
  emitFlutterKYCVerification
} from "./emit-fintech";
import {
  emitFlutterConsentPage,
  emitFlutterComplianceHubPage,
  shouldGenerateCompliancePages
} from "./emit-compliance";
import { getComplianceFlags } from "@/lib/compliance-flags";
import {
  ensureFlutterPlatformFolders,
  resolveFlutterPlatforms
} from "./ensure-flutter-platforms";
import { attachDesktopReleases } from "./attach-desktop-releases";
import { zipDirectory } from "./zip";

const TEMPLATE_DIR = path.join(
  process.cwd(),
  "templates",
  "flutter-minimal"
);

const SKIP_DIR_NAMES = new Set([
  ".dart_tool",
  "build",
  ".git",
  "Pods",
  ".gradle"
]);

function shouldSkipCopy(relPath: string): boolean {
  const parts = relPath.split(path.sep);
  return parts.some((p) => SKIP_DIR_NAMES.has(p));
}

async function copyTemplate(destDir: string): Promise<void> {
  async function walk(src: string, dest: string, base: string) {
    const entries = await fs.readdir(src, { withFileTypes: true });
    await fs.mkdir(dest, { recursive: true });
    for (const ent of entries) {
      const rel = path.join(base, ent.name);
      if (shouldSkipCopy(rel)) continue;
      const from = path.join(src, ent.name);
      const to = path.join(dest, ent.name);
      if (ent.isDirectory()) {
        await walk(from, to, rel);
      } else if (ent.isFile()) {
        await fs.copyFile(from, to);
      }
    }
  }
  await walk(TEMPLATE_DIR, destDir, "");
}

export type FlutterCodegenResult = {
  outputDir: string;
  appName: string;
  displayName: string;
};

export async function generateFlutterProject(
  specInput: unknown,
  options?: { keepOutput?: boolean }
): Promise<FlutterCodegenResult> {
  const validation = validateAppSpec(specInput);
  if (!validation.ok) {
    throw new Error(`App Spec 校验失败：${validation.errors.join("; ")}`);
  }
  const spec = validation.spec;

  const outRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), `app-factory-flutter-`)
  );
  const appDir = path.join(outRoot, spec.appName);
  await copyTemplate(appDir);

  const flutterPlatforms = resolveFlutterPlatforms(spec);
  const platformEnsure = await ensureFlutterPlatformFolders(
    appDir,
    flutterPlatforms
  );

  await fs.writeFile(
    path.join(appDir, "app_spec.json"),
    JSON.stringify(spec, null, 2),
    "utf8"
  );

  // P1: 生成 Supabase 建表 SQL
  const { generateCreateTableDDL } = await import("@/lib/app-spec/generate-ddl");
  const ddl = generateCreateTableDDL(spec);
  const sqlDir = path.join(appDir, "supabase", "migrations");
  await fs.mkdir(sqlDir, { recursive: true });
  await fs.writeFile(
    path.join(sqlDir, "001_create_tables.sql"),
    ddl.fullSql,
    "utf8"
  );
  await fs.writeFile(
    path.join(appDir, "supabase", "README.md"),
    `# Supabase 后端配置\n\n本目录包含 App 生产工厂自动生成的数据库迁移脚本。\n\n## 使用方法\n\n1. 登录 [Supabase](https://supabase.com) 控制台\n2. 进入项目 → SQL Editor\n3. 粘贴 \`migrations/001_create_tables.sql\` 内容并执行\n4. 或在本地使用 Supabase CLI: \`supabase db push\`\n\n## 表结构\n\n${ddl.tableNames.length ? ddl.tableNames.map((t) => `- **${t}**`).join("\n") : "（无）"}\n\n## 注意\n\n- 生成代码中引用的 Supabase URL 和 Anon Key 需要在各平台的环境变量中配置\n- RLS 策略默认配置为用户级隔离，可根据需求修改\n`,
    "utf8"
  );

  const limitations = spec.limitations?.length
    ? spec.limitations.map((l) => `- ${l}`).join("\n")
    : "- （无）";
  const desktopNote = platformEnsure.ok
    ? `- Flutter 平台: ${flutterPlatforms.join(", ")}（含 macOS / Windows 桌面）\n- macOS 运行: \`flutter run -d macos\`（需 Mac + Xcode）\n- Windows 运行: \`flutter run -d windows\`（需 Windows + Visual Studio 桌面开发）\n`
    : `- Flutter 平台: ${flutterPlatforms.join(", ")}（桌面目录生成: ${platformEnsure.message ?? "未完成"}，可在工程根目录执行 \`flutter create . --platforms=macos,windows\`）\n`;

  await fs.writeFile(
    path.join(appDir, "LIMITATIONS.md"),
    `# 生成说明\n\n- displayName: ${spec.displayName}\n- sourceProjectId: ${spec.sourceProjectId ?? "—"}\n- generatedAt: ${new Date().toISOString()}\n${desktopNote}\n## limitations\n\n${limitations}\n`,
    "utf8"
  );

  const backendTarget = resolveBackendTarget(spec);
  await fs.writeFile(
    path.join(appDir, "BACKEND.md"),
    formatBackendTargetMarkdown(spec, backendTarget),
    "utf8"
  );

  const pubspecPath = path.join(appDir, "pubspec.yaml");
  let pubspecContent = patchPubspecName(
    await fs.readFile(pubspecPath, "utf8"),
    spec.appName,
    spec.displayName
  );
  // 动态依赖注入（根据 screen type 添加所需 package）
  const screenTypes = new Set(spec.screens.map((s) => s.type));
  const extraDeps: string[] = [];
  if (isTodoAppSpec(spec) && !pubspecContent.includes("shared_preferences:")) {
    extraDeps.push("  shared_preferences: ^2.5.3");
  }
  if (screenTypes.has("map")) {
    if (!pubspecContent.includes("flutter_map:")) extraDeps.push("  flutter_map: ^7.0.2");
    if (!pubspecContent.includes("latlong2:")) extraDeps.push("  latlong2: ^0.9.1");
    if (!pubspecContent.includes("geolocator:")) extraDeps.push("  geolocator: ^13.0.2");
  }
  if (screenTypes.has("chat")) {
    // Supabase Realtime 已包含在 supabase_flutter 中
  }
  if (screenTypes.has("call")) {
    if (!pubspecContent.includes("flutter_webrtc:")) extraDeps.push("  flutter_webrtc: ^0.12.0");
  }
  if (screenTypes.has("iot")) {
    if (!pubspecContent.includes("flutter_blue_plus:")) extraDeps.push("  flutter_blue_plus: ^1.35.2");
  }
  if (screenTypes.has("game")) {
    if (!pubspecContent.includes("flame:")) extraDeps.push("  flame: ^1.22.0");
  }
  if (screenTypes.has("payment")) {
    // Stripe: 需要 flutter_stripe 但通常由服务端驱动
  }
  if (screenTypes.has("form") || screenTypes.has("detail")) {
    if (!pubspecContent.includes("file_picker:")) extraDeps.push("  file_picker: ^8.1.6");
  }
  if (screenTypes.has("medical")) {
    if (!pubspecContent.includes("health:")) extraDeps.push("  health: ^12.2.0");
  }
  if (screenTypes.has("banking") || screenTypes.has("insurance") || screenTypes.has("kyc")) {
    if (!pubspecContent.includes("flutter_stripe:")) extraDeps.push("  flutter_stripe: ^11.3.0");
  }
  if (extraDeps.length > 0) {
    pubspecContent = pubspecContent.replace(
      /dependencies:\n/,
      `dependencies:\n${extraDeps.join("\n")}\n`
    );
  }
  await fs.writeFile(pubspecPath, pubspecContent, "utf8");

  // App.dart 主题定制延迟到页面生成后统一处理（含 displayName 和 主题色）

  const todoMode = isTodoAppSpec(spec);
  if (todoMode) {
    const todoDir = path.join(
      appDir,
      "lib",
      "features",
      "todo_list",
      "presentation"
    );
    await fs.mkdir(todoDir, { recursive: true });
    await fs.writeFile(
      path.join(todoDir, "todo_list_page.dart"),
      emitTodoListPageDart(spec.displayName),
      "utf8"
    );
  } else {
    const listScreen = spec.screens.find(
      (s) => s.id === "match_list" || s.id === "main_list"
    );
    if (listScreen) {
      const listPath = path.join(
        appDir,
        "lib",
        "features",
        "match_list",
        "presentation",
        "list_page.dart"
      );
      const entityList = emitMatchListPageFromSpec(spec, listScreen);
      if (entityList) {
        await fs.writeFile(listPath, entityList, "utf8");
      } else {
        const listContent = await fs.readFile(listPath, "utf8");
        await fs.writeFile(
          listPath,
          patchListPageTitle(listContent, listScreen.title),
          "utf8"
        );
      }
    }
  }

  const generatedPagesDir = path.join(appDir, "lib", "generated", "pages");
  await fs.mkdir(generatedPagesDir, { recursive: true });

  // 生成所有页面（Tab + 非 Tab）
  const allScreens = spec.screens;
  for (const screen of allScreens) {
    const ref = pageWidgetRef(screen, { spec });
    if (!ref.needsGenerated) continue;

    let content: string;
    let fileName: string;
    if (screen.type === "detail") {
      content = emitFlutterEntityDetailPage(screen, spec);
      fileName = `${screen.id}_detail_page.dart`;
    } else if (screen.type === "form") {
      content = emitFlutterFormPlaceholder(screen, spec);
      fileName = `${screen.id}_form_page.dart`;
    } else if (screen.type === "map") {
      content = emitFlutterMapPage(screen, spec);
      fileName = `${screen.id}_map_page.dart`;
    } else if (screen.type === "chat") {
      content = emitFlutterChatListPage(spec.displayName);
      fileName = `${screen.id}_chat_page.dart`;
    } else if (screen.type === "call") {
      content = emitFlutterWebRTCCallPage();
      fileName = `${screen.id}_call_page.dart`;
    } else if (screen.type === "payment") {
      content = emitFlutterPaymentPage();
      fileName = `${screen.id}_payment_page.dart`;
    } else if (screen.type === "iot") {
      content = emitFlutterBLEScannerPage();
      fileName = `${screen.id}_iot_page.dart`;
    } else if (screen.type === "game") {
      content = emitFlutterGamePage(spec.displayName);
      fileName = `${screen.id}_game_page.dart`;
    } else if (screen.type === "ar") {
      content = emitFlutterARPage();
      fileName = `${screen.id}_ar_page.dart`;
    } else if (screen.type === "medical") {
      content = emitFlutterHealthDashboard(spec.displayName);
      fileName = `${screen.id}_medical_page.dart`;
    } else if (screen.type === "automotive") {
      content = emitFlutterCarDashboard();
      fileName = `${screen.id}_auto_page.dart`;
    } else if (screen.type === "banking") {
      content = emitFlutterBankingPayment();
      fileName = `${screen.id}_banking_page.dart`;
    } else if (screen.type === "insurance") {
      content = emitFlutterInsuranceClaims();
      fileName = `${screen.id}_insurance_page.dart`;
    } else if (screen.type === "kyc") {
      content = emitFlutterKYCVerification();
      fileName = `${screen.id}_kyc_page.dart`;
    } else if (screen.type === "list") {
      content = emitGeneratedListPage(screen, spec);
      fileName = `${screen.id}_page.dart`;
    } else {
      content = emitGeneratedPlaceholderPage(screen, spec);
      fileName = `${screen.id}_page.dart`;
    }

    await fs.writeFile(
      path.join(generatedPagesDir, fileName),
      content,
      "utf8"
    );
  }

  // Auth 页面
  const authDir = path.join(appDir, "lib", "features", "auth", "presentation");
  await fs.mkdir(authDir, { recursive: true });
  await fs.writeFile(
    path.join(authDir, "login_page.dart"),
    emitFlutterLoginPage(spec.displayName),
    "utf8"
  );
  await fs.writeFile(
    path.join(authDir, "register_page.dart"),
    emitFlutterRegisterPage(spec.displayName),
    "utf8"
  );

  // 主题系统（15 套预设 + 完整设计 Token）
  const { resolveTheme, emitFlutterTheme } = await import("./emit-theme");
  const theme = resolveTheme(spec.layoutRules as Record<string, unknown> | undefined);
  const themeDir = path.join(appDir, "lib", "core", "theme");
  await fs.mkdir(themeDir, { recursive: true });
  await fs.writeFile(path.join(themeDir, "app_theme.dart"), emitFlutterTheme(theme), "utf8");

  // 更新 app.dart 显示名称（模板已使用主题系统）
  const appDartFilePath = path.join(appDir, "lib", "app.dart");
  let appDartContent = await fs.readFile(appDartFilePath, "utf8");
  appDartContent = patchAppTitle(appDartContent, spec.displayName);
  // i18n 多语言 (P1)
  const { resolveLocale, emitFlutterI18nDart } = await import("./emit-i18n");
  const locale = resolveLocale(spec);
  const i18nDir = path.join(appDir, "lib", "core", "i18n");
  await fs.mkdir(i18nDir, { recursive: true });
  await fs.writeFile(path.join(i18nDir, "app_strings.dart"), emitFlutterI18nDart(locale), "utf8");

  // 精美组件库
  const widgetsDir = path.join(appDir, "lib", "core", "widgets");
  await fs.writeFile(path.join(widgetsDir, "polished_widgets.dart"), emitPolishedWidgetsDart(), "utf8");
  await fs.writeFile(path.join(widgetsDir, "ux_widgets.dart"), emitUXWidgetsDart(), "utf8");

  // 隐私政策页面（市场合规）
  const privacyDir = path.join(appDir, "lib", "features", "privacy", "presentation");
  await fs.mkdir(privacyDir, { recursive: true });
  await fs.writeFile(path.join(privacyDir, "privacy_page.dart"), generatePrivacyPage(spec.displayName), "utf8");

  // 合规页面生成（条件性，根据 complianceFlags）
  const complianceFlags = getComplianceFlags(spec as Record<string, unknown> as { complianceFlags?: Record<string, unknown> });
  const complianceRoutes: Array<{ route: string; widget: string; importPath: string }> = [];
  if (shouldGenerateCompliancePages(complianceFlags)) {
    const complianceDir = path.join(appDir, "lib", "features", "compliance", "presentation");
    await fs.mkdir(complianceDir, { recursive: true });

    // 用户同意书（首次启动展示）
    if (complianceFlags.requiresConsentScreen) {
      await fs.writeFile(
        path.join(complianceDir, "consent_page.dart"),
        emitFlutterConsentPage(spec.displayName, complianceFlags as Record<string, unknown>),
        "utf8"
      );
      complianceRoutes.push({
        route: "/consent",
        widget: "ConsentPage",
        importPath: "../features/compliance/presentation/consent_page.dart"
      });
    }

    // 合规信息中心
    await fs.writeFile(
      path.join(complianceDir, "compliance_hub_page.dart"),
      emitFlutterComplianceHubPage(spec.displayName, complianceFlags as Record<string, unknown>),
      "utf8"
    );
    complianceRoutes.push({
      route: "/compliance",
      widget: "ComplianceHubPage",
      importPath: "../features/compliance/presentation/compliance_hub_page.dart"
    });
  }

  await fs.writeFile(appDartFilePath, appDartContent, "utf8");

  const routerPath = path.join(appDir, "lib", "router", "app_router.dart");
  await fs.writeFile(routerPath, emitAppRouterDart(spec, complianceRoutes.length > 0 ? complianceRoutes : undefined), "utf8");

  // 技能代码片段注入 (P1-2)
  try {
    const { getCodegenSnippetsForProject, applySnippetsToFiles } = await import("@/lib/skills/codegen-injection");
    const snippets = await getCodegenSnippetsForProject("flutter");
    if (snippets.length > 0) {
      const files = new Map<string, string>();
      // 读取 pubspec.yaml
      files.set("pubspec.yaml", await fs.readFile(path.join(appDir, "pubspec.yaml"), "utf8"));
      const merged = applySnippetsToFiles(files, snippets);
      if (merged.has("pubspec.yaml")) {
        await fs.writeFile(path.join(appDir, "pubspec.yaml"), merged.get("pubspec.yaml")!, "utf8");
      }
      // 页面/组件片段写为新文件
      for (const [name, content] of merged) {
        if (name === "pubspec.yaml") continue;
        await fs.writeFile(path.join(generatedPagesDir, name), content, "utf8");
      }
    }
  } catch (e) {
    console.warn("[generateFlutterProject] skill snippets skipped:", e);
  }

  if (!options?.keepOutput) {
    // 调用方负责清理；默认保留供 zip/API 使用
  }

  return {
    outputDir: appDir,
    appName: spec.appName,
    displayName: spec.displayName
  };
}

export async function generateFlutterZip(specInput: unknown): Promise<{
  buffer: Buffer;
  fileName: string;
  displayName: string;
}> {
  const { outputDir, appName, displayName } =
    await generateFlutterProject(specInput);
  try {
    await attachDesktopReleases({ appDir: outputDir, appName });
    const buffer = await zipDirectory(outputDir);
    return {
      buffer,
      fileName: `${appName}-flutter.zip`,
      displayName
    };
  } finally {
    await fs.rm(path.dirname(outputDir), { recursive: true, force: true });
  }
}

/** 从 spec.layoutRules 或 metadata 解析主题色 */
function resolveThemeColor(spec: AppSpec): string {
  const layoutRules = (spec.layoutRules ?? {}) as Record<string, unknown>;
  const metadata = (spec.metadata ?? {}) as Record<string, unknown>;
  const color = (layoutRules.primaryColor || metadata.themeColor) as string | undefined;
  if (color && /^[0-9a-fA-F]{6}$/.test(color)) {
    return `const Color(0xFF${color})`;
  }
  // 预设映射
  const themes: Record<string, string> = {
    blue: "Colors.blue",
    green: "Colors.green",
    red: "Colors.red",
    orange: "Colors.orange",
    purple: "Colors.purple",
    pink: "Colors.pink",
    indigo: "Colors.indigo",
    cyan: "Colors.cyan",
    amber: "Colors.amber",
    teal: "Colors.teal",
  };
  const themeName = (layoutRules.theme || metadata.theme || "teal") as string;
  return themes[themeName] ?? "Colors.teal";
}

/** 隐私政策页面（市场合规） */
function generatePrivacyPage(displayName: string): string {
  const name = displayName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `import "package:flutter/material.dart";

class PrivacyPage extends StatelessWidget {
  const PrivacyPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("隐私政策")),
      body: ListView(padding: const EdgeInsets.all(24), children: [
        const Icon(Icons.shield, size: 48, color: Colors.teal),
        const SizedBox(height: 16),
        Text("${name} 隐私政策", style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        _section("1. 信息收集", "我们仅收集您主动提供的必要信息，包括邮箱地址（用于账号注册）和应用使用数据（用于改进服务）。"),
        _section("2. 数据存储", "您的数据存储在 Supabase 云数据库中，采用行级安全（RLS）策略进行隔离保护。数据传输全程加密。"),
        _section("3. 数据使用", "您的数据仅用于提供应用核心功能，不会出售或分享给第三方。"),
        _section("4. 数据删除", "您可以在应用内删除您的数据。如需彻底删除账号及全部关联数据，请联系 support@app-factory.dev。"),
        _section("5. 合规声明", "本应用遵循 GDPR（欧盟通用数据保护条例）和《个人信息保护法》的相关规定。"),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: () => showDialog(context: context, builder: (_) => AlertDialog(title: const Text("删除全部数据"), content: const Text("此操作将删除您的账号及所有关联数据，不可撤销。确定继续？"), actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text("取消")),
            FilledButton(onPressed: () { Navigator.pop(context); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("数据删除请求已提交"))); }, style: FilledButton.styleFrom(backgroundColor: Colors.red), child: const Text("确认删除")),
          ])),
          icon: const Icon(Icons.delete_forever, color: Colors.red),
          label: const Text("删除我的全部数据", style: TextStyle(color: Colors.red)),
        ),
      ]),
    );
  }

  Widget _section(String title, String body) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        const SizedBox(height: 4),
        Text(body, style: const TextStyle(color: Colors.black87, height: 1.6)),
      ]),
    );
  }
}
`;
}
