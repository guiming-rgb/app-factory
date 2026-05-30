import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { isTodoAppSpec } from "@/lib/app-spec/detect-todo-app";
import {
  buildEntityListRows,
  resolveEntityForScreen
} from "@/lib/app-spec/entity-scaffold";
import { resolveTabScreens } from "@/lib/app-spec/resolve-tabs";

export { resolveTabScreens };

const PROFILE_TAB_ID = "profile";
const LIST_TAB_IDS = new Set([
  "match_list",
  "main_list",
  "index",
  "home",
  "todo_list",
  "task_list"
]);

function routePath(screenId: string): string {
  if (screenId === "match_list" || screenId === "main_list") return "/matches";
  if (screenId === PROFILE_TAB_ID) return "/profile";
  return `/${screenId.replace(/_/g, "-")}`;
}

export function pageWidgetRef(
  screen: AppSpecScreen,
  options?: { spec?: AppSpec }
): {
  importPath: string;
  className: string;
  needsGenerated: boolean;
} {
  if (
    options?.spec &&
    isTodoAppSpec(options.spec) &&
    (LIST_TAB_IDS.has(screen.id) || screen.type === "list")
  ) {
    return {
      importPath: "../features/todo_list/presentation/todo_list_page.dart",
      className: "TodoListPage",
      needsGenerated: false
    };
  }
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

export function emitGeneratedListPage(
  screen: AppSpecScreen,
  spec?: AppSpec
): string {
  const className = `${pascalCase(screen.id)}Page`;
  const title = escapeDartString(screen.title);
  const entity = spec ? resolveEntityForScreen(spec, screen) : undefined;
  if (!entity || !spec) {
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
  const rows = buildEntityListRows(entity, screen, spec);
  const itemsDart = rows
    .map(
      (r) =>
        `      _Item("${escapeDartString(r.id)}", "${escapeDartString(r.title)}", "${escapeDartString(r.subtitle)}"),`
    )
    .join("\n");
  const entityName = escapeDartString(entity.name);
  return `import "package:flutter/material.dart";

class _Item {
  const _Item(this.id, this.title, this.subtitle);
  final String id;
  final String title;
  final String subtitle;
}

class ${className} extends StatelessWidget {
  const ${className}({super.key});

  static const _items = <_Item>[
${itemsDart}
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("${title}")),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final item = _items[index];
          return Card(
            child: ListTile(
              title: Text(item.title),
              subtitle: Text(item.subtitle),
            ),
          );
        },
      ),
    );
  }
}
`;
}

export function emitMatchListPageFromSpec(
  spec: AppSpec,
  screen: AppSpecScreen
): string | null {
  const entity = resolveEntityForScreen(spec, screen);
  if (!entity) return null;
  return emitGeneratedListPage(screen, spec).replace(
    /class \w+Page/,
    "class MatchListPage"
  );
}

export function emitGeneratedPlaceholderPage(
  screen: AppSpecScreen,
  spec?: AppSpec
): string {
  const className = `${pascalCase(screen.id)}Page`;
  const title = escapeDartString(screen.title);
  const appLine = spec
    ? escapeDartString(spec.displayName)
    : escapeDartString(screen.id);
  const roles =
    spec?.roles
      ?.map((r) => {
        if (typeof r === "object" && r !== null && "name" in r) {
          return String((r as { name: unknown }).name);
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 3) ?? [];
  const roleLine =
    roles.length > 0
      ? `角色：${roles.map((r) => escapeDartString(r!)).join("、")}`
      : "个人中心 · Spec placeholder";
  return `import "package:flutter/material.dart";

class ${className} extends StatelessWidget {
  const ${className}({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("${title}")),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("${appLine}", style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text("${escapeDartString(roleLine)}"),
          ],
        ),
      ),
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
    const ref = pageWidgetRef(screen, { spec });
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
