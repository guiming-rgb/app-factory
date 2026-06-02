import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { isTodoAppSpec } from "@/lib/app-spec/detect-todo-app";
import {
  buildEntityListRows,
  entityTableName,
  listTitleField,
  primaryKeyField,
  resolveEntityForScreen,
  supabaseSelectColumns
} from "@/lib/app-spec/entity-scaffold";
import { resolveTabScreens } from "@/lib/app-spec/resolve-tabs";
import { isListScreen } from "@/lib/app-spec/resolve-list-screen";

export { resolveTabScreens };

const PROFILE_TAB_ID = "profile";

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
    isListScreen(screen, options.spec)
  ) {
    return {
      importPath: "../features/todo_list/presentation/todo_list_page.dart",
      className: "TodoListPage",
      needsGenerated: false
    };
  }
  // P3: 使用共享 isListScreen 替代硬编码 screen ID 匹配
  if (options?.spec && isListScreen(screen, options.spec)) {
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
  // Detail 页面
  if (screen.type === "detail" && options?.spec) {
    const className = `${pascalCase(screen.id)}DetailPage`;
    return {
      importPath: `../generated/pages/${screen.id}_detail_page.dart`,
      className,
      needsGenerated: true
    };
  }
  // Form 页面
  if (screen.type === "form" && options?.spec) {
    const className = `${pascalCase(screen.id)}FormPage`;
    return {
      importPath: `../generated/pages/${screen.id}_form_page.dart`,
      className,
      needsGenerated: true
    };
  }
  // Map / Chat / Call / Payment / IoT / Game / AR / Medical / Automotive / Banking / Insurance / KYC
  if (screen.type === "map" || screen.type === "chat" || screen.type === "call" ||
      screen.type === "payment" || screen.type === "iot" || screen.type === "game" || screen.type === "ar" ||
      screen.type === "medical" || screen.type === "automotive" || screen.type === "banking" ||
      screen.type === "insurance" || screen.type === "kyc") {
    const suffixMap: Record<string, string> = {
      map: "_map_page", chat: "_chat_page", call: "_call_page",
      payment: "_payment_page", iot: "_iot_page", game: "_game_page", ar: "_ar_page",
      medical: "_medical_page", automotive: "_auto_page", banking: "_banking_page",
      insurance: "_insurance_page", kyc: "_kyc_page"
    };
    const classNameMap: Record<string, string> = {
      map: "MapPage", chat: "ChatListPage", call: "CallPage",
      payment: "CheckoutPage", iot: "BLEScannerPage", game: "GamePage", ar: "ARViewPage",
      medical: "HealthDashboardPage", automotive: "CarDashboardPage", banking: "BankingPaymentPage",
      insurance: "InsurancePage", kyc: "KYCVerificationPage"
    };
    const suffix = suffixMap[screen.type] ?? "_page";
    const className = `${pascalCase(screen.id)}${classNameMap[screen.type] ?? "Page"}`;
    return {
      importPath: `../generated/pages/${screen.id}${suffix}.dart`,
      className,
      needsGenerated: true
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
  const table = escapeDartString(entityTableName(entity));
  const titleField = escapeDartString(listTitleField(entity));
  const pk = escapeDartString(primaryKeyField(entity));
  const select = escapeDartString(supabaseSelectColumns(entity));
  const hasImageField = entity.fields.some((f) => f.type === "image");
  const nonIdFields = entity.fields.filter((f) => f.name !== "id" && !f.primary);
  const detailFields = nonIdFields
    .filter((f) => f.name !== "image_url" && f.name !== "thumbnail")
    .map((f) => `      const SizedBox(height: 8),\n      Text("${escapeDartString(f.name)}: \\\${item['${escapeDartString(f.name)}']?.toString() ?? '—'}"),`)
    .join("\n");
  const formCtrlFields = nonIdFields.filter((f) => f.type !== "image");
  const formFieldWidgets = entity.fields
    .filter((f) => !f.primary || f.name !== "id")
    .map((f) => f.type === "image"
      ? "        ListTile(leading: const Icon(Icons.image), title: const Text(\"选择图片\"), onTap: () {})"
      : `        TextField(controller: _${escapeDartString(f.name)}Ctrl, decoration: const InputDecoration(labelText: "${escapeDartString(f.name)}", border: OutlineInputBorder()))`)
    .join(",\n        const SizedBox(height: 12),\n");
  const formInsertData = formCtrlFields
    .map((f) => `"${escapeDartString(f.name)}": _${escapeDartString(f.name)}Ctrl.text`)
    .join(",\n              ");
  const isProduct = entity.fields.some((f) => f.name === "price");
  const isFitness = entity.fields.some((f) => f.name === "calories") || entity.fields.some((f) => f.name === "duration_min");
  const isCRM = entity.fields.some((f) => f.name === "stage") || entity.fields.some((f) => f.name === "probability");

  return `import "package:flutter/material.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../../../core/widgets/polished_widgets.dart";
${isProduct || isFitness || isCRM ? 'import "../../../core/widgets/ux_widgets.dart";' : ''}

const _pageSize = 15;

class _Item {
  const _Item(this.id, this.title, this.subtitle, this.imageUrl);
  final String id;
  final String title;
  final String subtitle;
  final String? imageUrl;
}

class ${className} extends StatefulWidget {
  const ${className}({super.key});
  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
${formCtrlFields.map((f) => `  final _${escapeDartString(f.name)}Ctrl = TextEditingController();`).join("\n")}
  List<_Item> _items = [];
  String? _error;
  bool _loading = true;
  bool _hasMore = true;
  int _page = 0;

  @override
  void initState() {
    super.initState();
    _load(reset: true);
    _scrollController.addListener(() {
      if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 100 && _hasMore && !_loading) _load();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
${formCtrlFields.map((f) => `    _${escapeDartString(f.name)}Ctrl.dispose();`).join("\n")}
    super.dispose();
  }

  Future<void> _load({bool reset = false}) async {
    if (reset) { _page = 0; _hasMore = true; }
    setState(() { _loading = true; _error = null; });
    try {
      final from = _page * _pageSize;
      final to = from + _pageSize - 1;
      dynamic query = Supabase.instance.client.from("${table}").select("${select}");
      if (_searchController.text.isNotEmpty) query = query.ilike("${titleField}", "%\${_searchController.text}%");
      query = query.order("created_at", ascending: false).range(from, to);
      final rows = await query;
      final list = (rows as List<dynamic>?) ?? [];
      final newItems = list.map((item) {
        final m = Map<String, dynamic>.from(item as Map);
        final id = m["${pk}"]?.toString() ?? "";
        final t = m["${titleField}"]?.toString() ?? m["title"]?.toString() ?? "—";
        final sub = "${escapeDartString(entity.name)} · $id";
        final img = ${hasImageField ? 'm["image_url"]?.toString() ?? m["thumbnail"]?.toString()' : 'null'};
        return _Item(id, t, sub, img);
      }).toList();
      setState(() {
        _items = reset ? newItems : [..._items, ...newItems];
        _hasMore = list.length >= _pageSize;
        _page = reset ? 0 : _page + 1;
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = "加载失败，下拉重试"; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("${title}")),
      body: Column(
        children: [
          AppSearchBar(controller: _searchController, onChanged: (_) => _load(reset: true)),
          if (_error != null) AppErrorCard(message: _error!, onRetry: () => _load(reset: true)),
          Expanded(
            child: _loading && _items.isEmpty
                ? const AppLoadingSkeleton()
                : _items.isEmpty
                    ? const AppEmptyState(icon: Icons.inbox_rounded, title: "暂无数据", subtitle: "下拉刷新或点击右下角按钮添加")
                    : RefreshIndicator(
                        onRefresh: () => _load(reset: true),
                        child: ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.fromLTRB(0, 0, 0, 80),
                          itemCount: _items.length + (_hasMore ? 1 : 0),
                          itemBuilder: (_, i) {
                            if (i >= _items.length) {
                              return const Padding(padding: EdgeInsets.all(20), child: Center(child: CircularProgressIndicator(strokeWidth: 2)));
                            }
                            final item = _items[i];
                            ${isProduct ? `return ProductCard(name: item.title, price: double.tryParse(item.subtitle) ?? 0, imageUrl: item.imageUrl, rating: 4.5, sales: 120, onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => Scaffold(appBar: AppBar(title: Text(item.title)), body: _buildDetail(item)))));` : `return AppListItem(title: item.title, subtitle: item.subtitle, imageUrl: item.imageUrl, onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => Scaffold(appBar: AppBar(title: Text(item.title)), body: _buildDetail(item)))));`}
                          },
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => _buildForm())),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildDetail(_Item item) {
    return ListView(padding: const EdgeInsets.all(20), children: [
      if (item.imageUrl != null)
        ClipRRect(borderRadius: BorderRadius.circular(16), child: Image.network(item.imageUrl!, height: 220, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox.shrink())),
      const SizedBox(height: 16),
      Text(item.title, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
      const SizedBox(height: 8),
      Text(item.subtitle, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey)),
      const SizedBox(height: 24),
${detailFields}
      const SizedBox(height: 20),
      OutlinedButton.icon(onPressed: () async {
        final confirm = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(title: const Text("确认删除"), content: Text("确定要删除 \${item.title} 吗？此操作不可撤销。"), actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("取消")), FilledButton(onPressed: () => Navigator.pop(ctx, true), style: FilledButton.styleFrom(backgroundColor: Colors.red), child: const Text("删除"))]));
        if (confirm == true && mounted) {
          try {
            await Supabase.instance.client.from("${table}").delete().eq("${pk}", item.id);
            if (mounted) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("已删除"))); Navigator.of(context).pop(); _load(reset: true); }
          } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("删除失败"))); }
        }
      }, icon: const Icon(Icons.delete_outline, color: Colors.red), label: const Text("删除", style: TextStyle(color: Colors.red))),
    ]);
  }

  Widget _buildForm() {
    return Scaffold(
      appBar: AppBar(title: const Text("添加")),
      body: ListView(padding: const EdgeInsets.all(20), children: [
${formFieldWidgets || '        TextField(decoration: const InputDecoration(labelText: "标题", border: OutlineInputBorder()))'},
        const SizedBox(height: 12),
        FilledButton(onPressed: () async {
          try {
            await Supabase.instance.client.from("${table}").insert({
              ${formInsertData || '"title": ""'}
            });
            if (mounted) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("添加成功"))); Navigator.of(context).pop(); _load(reset: true); }
          } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("添加失败"))); }
        }, child: const Text("提交")),
      ]),
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
  const extraRoutes: string[] = [];

  // Tab 路由
  for (const screen of tabs) {
    const ref = pageWidgetRef(screen, { spec });
    imports.add(`import "${ref.importPath}";`);
    const path = routePath(screen.id);
    // Detail类型的 tab 需要 itemId 参数
    if (screen.type === "detail") {
      branches.push(`          StatefulShellBranch(
            routes: [
              GoRoute(
                path: "${path}/:itemId",
                builder: (context, state) => ${ref.className}(
                  itemId: state.pathParameters["itemId"] ?? "",
                ),
              ),
            ],
          ),`);
    } else {
      branches.push(`          StatefulShellBranch(
            routes: [
              GoRoute(
                path: "${path}",
                builder: (context, state) => const ${ref.className}(),
              ),
            ],
          ),`);
    }
  }

  // 非 Tab 的额外路由（detail/form/auth）
  const nonTabScreens = (spec.screens ?? []).filter(
    (s) => !tabs.some((t) => t.id === s.id)
  );
  for (const screen of nonTabScreens) {
    const ref = pageWidgetRef(screen, { spec });
    if (!ref.needsGenerated) continue;
    imports.add(`import "${ref.importPath}";`);
    const path = routePath(screen.id);
    if (screen.type === "detail") {
      extraRoutes.push(`        GoRoute(
          path: "${path}/:itemId",
          builder: (context, state) => ${ref.className}(
            itemId: state.pathParameters["itemId"] ?? "",
          ),
        ),`);
    } else {
      extraRoutes.push(`        GoRoute(
          path: "${path}",
          builder: (context, state) => const ${ref.className}(),
        ),`);
    }
  }

  // Auth 路由
  imports.add('import "../features/auth/presentation/login_page.dart";');
  imports.add('import "../features/auth/presentation/register_page.dart";');
  extraRoutes.push(`        GoRoute(path: "/login", builder: (_, __) => const LoginPage()),`);
  extraRoutes.push(`        GoRoute(path: "/register", builder: (_, __) => const RegisterPage()),`);

  const destinations = tabs
    .map(
      (s) => `                NavigationDestination(
                  icon: Icon(${tabIcon(s)}),
                  label: "${escapeDartString(s.title)}",
                ),`
    )
    .join("\n");

  const initial = routePath(tabs[0]?.id ?? "main_list");
  const extraBlock = extraRoutes.length > 0
    ? `\n${extraRoutes.join("\n")}`
    : "";

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
      ),${extraBlock}
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
