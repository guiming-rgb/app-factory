import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";

const PROFILE_TAB_ID = "profile";

export function resolveTabScreens(spec: AppSpec): AppSpecScreen[] {
  const screens = spec.screens ?? [];
  const byId = new Map(screens.map((s) => [s.id, s]));
  const tabIds = [...(spec.navigation?.tabs ?? [])];
  if (!tabIds.includes(PROFILE_TAB_ID)) {
    tabIds.push(PROFILE_TAB_ID);
  }
  return tabIds.map(
    (id) =>
      byId.get(id) ?? {
        id,
        title: id === PROFILE_TAB_ID ? "我的" : id,
        type: id === PROFILE_TAB_ID ? "placeholder" : "list"
      }
  );
}

function routePath(screenId: string): string {
  if (screenId === "match_list" || screenId === "main_list") return "/matches";
  if (screenId === PROFILE_TAB_ID) return "/profile";
  return `/${screenId.replace(/_/g, "-")}`;
}

export function pageWidgetRef(screen: AppSpecScreen): {
  importPath: string;
  className: string;
  needsGenerated: boolean;
} {
  if (screen.id === "match_list" || screen.id === "main_list") {
    return {
      importPath: "../features/match_list/presentation/list_page.dart",
      className: "MatchListPage",
      needsGenerated: false
    };
  }
  if (screen.id === PROFILE_TAB_ID) {
    return {
      importPath: "../features/profile/presentation/profile_page.dart",
      className: "ProfilePage",
      needsGenerated: false
    };
  }
  const className = `${pascalCase(screen.id)}Page`;
  return {
    importPath: `../generated/pages/${screen.id}_page.dart`,
    className,
    needsGenerated: true
  };
}

function pascalCase(id: string): string {
  return id
    .split(/[_-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function tabIcon(screen: AppSpecScreen): string {
  if (screen.id === PROFILE_TAB_ID) return "Icons.person";
  if (screen.type === "list") return "Icons.list_alt";
  return "Icons.widgets_outlined";
}

export function emitGeneratedListPage(screen: AppSpecScreen): string {
  const className = `${pascalCase(screen.id)}Page`;
  const title = escapeDartString(screen.title);
  return `import "package:flutter/material.dart";

import "../../core/widgets/empty_state.dart";

class ${className} extends StatelessWidget {
  const ${className}({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("${title}")),
      body: const EmptyState(
        message: "列表页占位（Generator 按 App Spec 生成）。",
      ),
    );
  }
}
`;
}

export function emitGeneratedPlaceholderPage(screen: AppSpecScreen): string {
  const className = `${pascalCase(screen.id)}Page`;
  const title = escapeDartString(screen.title);
  return `import "package:flutter/material.dart";

class ${className} extends StatelessWidget {
  const ${className}({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("${title}")),
      body: const Center(child: Text("占位页（App Spec: ${screen.id}）")),
    );
  }
}
`;
}

export function emitAppRouterDart(spec: AppSpec): string {
  const tabs = resolveTabScreens(spec);
  const imports = new Set<string>();
  const branches: string[] = [];

  for (const screen of tabs) {
    const ref = pageWidgetRef(screen);
    imports.add(`import "${ref.importPath}";`);
    const path = routePath(screen.id);
    branches.push(`          StatefulShellBranch(
            routes: [
              GoRoute(
                path: "${path}",
                builder: (context, state) => const ${ref.className}(),
              ),
            ],
          ),`);
  }

  const destinations = tabs
    .map(
      (s) => `                NavigationDestination(
                  icon: Icon(${tabIcon(s)}),
                  label: "${escapeDartString(s.title)}",
                ),`
    )
    .join("\n");

  const initial = routePath(tabs[0]?.id ?? "main_list");

  return `import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

${[...imports].join("\n")}

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

GoRouter createAppRouter() {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: "${initial}",
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return Scaffold(
            body: navigationShell,
            bottomNavigationBar: NavigationBar(
              selectedIndex: navigationShell.currentIndex,
              onDestinationSelected: navigationShell.goBranch,
              destinations: const [
${destinations}
              ],
            ),
          );
        },
        branches: [
${branches.join("\n")}
        ],
      ),
    ],
  );
}
`;
}

function escapeDartString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$");
}

export function patchListPageTitle(content: string, title: string): string {
  const escaped = escapeDartString(title);
  return content.replace(
    /appBar: AppBar\(title: const Text\("[^"]*"\)\)/,
    `appBar: AppBar(title: const Text("${escaped}"))`
  );
}

export function patchAppTitle(content: string, displayName: string): string {
  const escaped = escapeDartString(displayName);
  return content.replace(
    /title: "[^"]*"/,
    `title: "${escaped}"`
  );
}

export function patchPubspecName(
  content: string,
  appName: string,
  displayName: string
): string {
  const safeName = appName.replace(/[^a-z0-9_]/g, "_").slice(0, 64) || "app_factory";
  const desc = escapeYamlString(
    `${displayName} — App 生产工厂生成（App Spec v0.1）`
  );
  return content
    .replace(/^name: .+$/m, `name: ${safeName}`)
    .replace(/^description: .+$/m, `description: "${desc}"`);
}

function escapeYamlString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
