import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";

import { entityOrFirst, escapeDartString, pascalCase, pkField, tableName } from "./shared";

export function emitFlutterKanbanPage(
  screen: AppSpecScreen,
  spec: AppSpec
): string {
  const className = `${pascalCase(screen.id)}Page`;
  const title = escapeDartString(screen.title);
  const entity = entityOrFirst(spec, screen);
  const table = tableName(entity);
  const pk = pkField(entity);
  const statusField = escapeDartString(
    entity.fields.find((f) => f.name.includes("status") || f.name.includes("stage") || f.name.includes("state"))?.name ?? "status"
  );
  const titleField = escapeDartString(
    entity.fields.find((f) => f.name.includes("title") || f.name.includes("name"))?.name ?? pk.replace(/\\/g, "")
  );

  const statuses = ["todo", "in_progress", "done"];

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
  final Map<String, List<Map<String, dynamic>>> _columns = {
    ${statuses.map((s) => `"${s}": []`).join(",\n    ")}
  };
  bool _loading = true;

  static const _columnColors = {
    ${statuses.map((s, i) => `"${s}": Colors.blue`).join(",\n    ")}
  };

  @override
  void initState() {
    super.initState();
    _loadBoard();
  }

  Future<void> _loadBoard() async {
    setState(() { _loading = true; });
    try {
      final client = supabaseOrNull;
      if (client == null) { setState(() { _loading = false; }); return; }
      final rows = await client.from("${table}").select("*").order("created_at", ascending: false);
      final items = List<Map<String, dynamic>>.from((rows as List<dynamic>?) ?? []);
      final cols = <String, List<Map<String, dynamic>>>{${statuses.map((s) => `"${s}": []`).join(", ")}};
      for (final item in items) {
        final s = item["${statusField}"]?.toString() ?? "todo";
        cols.putIfAbsent(s, () => []).add(item);
      }
      setState(() { _columns.addAll(cols); _loading = false; });
    } catch (_) {
      setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text("${title}")),
      body: _loading
          ? const AppLoadingSkeleton()
          : RefreshIndicator(
              onRefresh: _loadBoard,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.all(12),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  ${statuses.map((s) => `_KanbanColumn(
                    title: "${s}",
                    color: (_columnColors["${s}"] ?? Colors.grey)[400]!,
                    items: _columns["${s}"] ?? [],
                    titleField: "${titleField}",
                  ),`).join("\n                  ")}
                ]),
              ),
            ),
      floatingActionButton: FloatingActionButton(onPressed: _loadBoard, child: const Icon(Icons.refresh)),
    );
  }
}

class _KanbanColumn extends StatelessWidget {
  const _KanbanColumn({required this.title, required this.color, required this.items, required this.titleField});
  final String title;
  final Color color;
  final List<Map<String, dynamic>> items;
  final String titleField;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: 220,
      margin: const EdgeInsets.only(right: 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(AppTheme.radiusSm)),
          child: Row(children: [
            Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
            const SizedBox(width: 8),
            Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
            const Spacer(),
            Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)), child: Text("\${items.length}", style: TextStyle(fontSize: 12, color: color))),
          ]),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: ListView.builder(
            itemCount: items.length,
            itemBuilder: (_, i) {
              final item = items[i];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(item[titleField]?.toString() ?? "", style: const TextStyle(fontSize: 13)),
                ),
              );
            },
          ),
        ),
      ]),
    );
  }
}
`;
}
