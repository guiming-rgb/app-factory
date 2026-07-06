import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";

import { entityOrFirst, escapeDartString, pascalCase, pkField, tableName } from "./shared";

export function emitFlutterCardGridPage(
  screen: AppSpecScreen,
  spec: AppSpec
): string {
  const className = `${pascalCase(screen.id)}Page`;
  const title = escapeDartString(screen.title);
  const entity = entityOrFirst(spec, screen);
  const table = tableName(entity);
  const pk = pkField(entity);
  const hasImage = entity.fields.some((f) => f.type === "image" || f.name.includes("image") || f.name.includes("thumb"));
  const titleField = escapeDartString(
    entity.fields.find((f) => f.name.includes("title") || f.name.includes("name"))?.name ?? pk.replace(/\\/g, "")
  );
  const subtitleField = entity.fields.find((f) =>
    f.name.includes("desc") || f.name.includes("price") || f.name.includes("summary")
  );
  const subtitleExpr = subtitleField
    ? `m["${escapeDartString(subtitleField.name)}"]?.toString() ?? ""`
    : '""';

  return `import "package:flutter/material.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../../../core/supabase/supabase_client.dart";
import "../../../core/theme/app_theme.dart";
import "../../../core/widgets/polished_widgets.dart";

class ${className} extends StatefulWidget {
  const ${className}({super.key});
  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
  final _searchController = TextEditingController();
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load({String? search}) async {
    setState(() { _loading = true; _error = null; });
    try {
      final client = supabaseOrNull;
      if (client == null) { setState(() { _error = "未配置 Supabase"; _loading = false; }); return; }
      dynamic query = client.from("${table}").select("*").order("created_at", ascending: false).limit(50);
      if (search != null && search.isNotEmpty) {
        query = query.ilike("${titleField}", "%\$search%");
      }
      final rows = await query;
      setState(() { _items = List<Map<String, dynamic>>.from((rows as List<dynamic>?) ?? []); _loading = false; });
    } catch (e) {
      setState(() { _error = "加载失败"; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text("${title}")),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: AppSearchBar(controller: _searchController, onChanged: (v) => _load(search: v)),
        ),
        Expanded(
          child: _loading
              ? const AppLoadingSkeleton()
              : _error != null
                  ? AppErrorCard(message: _error!, onRetry: () => _load())
                  : _items.isEmpty
                      ? const AppEmptyState(icon: Icons.grid_view_rounded, title: "暂无内容", subtitle: "下拉刷新试试")
                      : RefreshIndicator(
                          onRefresh: () => _load(),
                          child: GridView.builder(
                            padding: const EdgeInsets.all(12),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              childAspectRatio: 0.75,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 12,
                            ),
                            itemCount: _items.length,
                            itemBuilder: (_, i) {
                              final item = _items[i];
                              return _GridCard(
                                title: item["${titleField}"]?.toString() ?? "",
                                subtitle: ${subtitleExpr},
                                ${hasImage ? 'imageUrl: item["image_url"]?.toString() ?? item["thumbnail"]?.toString(),' : ""}
                                onTap: () => Navigator.of(context).push(MaterialPageRoute(
                                  builder: (_) => Scaffold(
                                    appBar: AppBar(title: Text(item["${titleField}"]?.toString() ?? "")),
                                    body: _buildDetail(item),
                                  ),
                                )),
                              );
                            },
                          ),
                        ),
        ),
      ]),
    );
  }

  Widget _buildDetail(Map<String, dynamic> item) {
    return ListView(padding: const EdgeInsets.all(20), children: [
      ${hasImage ? 'if (item["image_url"] != null) ClipRRect(borderRadius: BorderRadius.circular(16), child: Image.network(item["image_url"]!.toString(), height: 220, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox.shrink())), const SizedBox(height: 16),' : ""}
      Text(item["${titleField}"]?.toString() ?? "", style: AppTheme.headingLarge(Theme.of(context).textTheme)),
      ${subtitleField ? 'const SizedBox(height: 8), Text(item["${escapeDartString(subtitleField.name)}"]?.toString() ?? "", style: AppTheme.bodyText(Theme.of(context).textTheme)),' : ""}
      ${entity.fields.filter((f) => f.name !== "id" && !f.primary && f.name !== "image_url" && f.name !== "thumbnail" && f.name !== titleField.replace(/\\/g, "") && f.name !== subtitleField?.name).map((f) => `const SizedBox(height: 12), _DetailRow(label: "${escapeDartString(f.name)}", value: item["${escapeDartString(f.name)}"]?.toString() ?? "—"),`).join("\n      ")}
    ]);
  }
}

class _GridCard extends StatelessWidget {
  const _GridCard({required this.title, required this.subtitle, this.imageUrl, this.onTap});
  final String title, subtitle;
  final String? imageUrl;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          boxShadow: AppTheme.cardShadow(theme.colorScheme),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (imageUrl != null)
            AspectRatio(aspectRatio: 1.4, child: Image.network(imageUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(color: theme.colorScheme.surfaceContainerHighest, child: const Icon(Icons.image, size: 32))))
          else
            AspectRatio(aspectRatio: 1.4, child: Container(color: theme.colorScheme.surfaceContainerHighest, child: const Icon(Icons.image, size: 32))),
          Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14), maxLines: 2, overflow: TextOverflow.ellipsis),
            if (subtitle.isNotEmpty) ...[const SizedBox(height: 4), Text(subtitle, style: AppTheme.caption(theme.textTheme), maxLines: 1)],
          ])),
        ]),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});
  final String label, value;
  @override
  Widget build(BuildContext context) => Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
    SizedBox(width: 80, child: Text(label, style: AppTheme.caption(Theme.of(context).textTheme))),
    Expanded(child: Text(value, style: AppTheme.bodyText(Theme.of(context).textTheme))),
  ]);
}
`;
}
