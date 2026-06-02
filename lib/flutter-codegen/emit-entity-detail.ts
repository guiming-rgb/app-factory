import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { resolveEntityForScreen, entityTableName } from "@/lib/app-spec/entity-scaffold";

/**
 * Flutter Entity Detail 页面生成
 * 修复三大障碍之三：Flutter 缺详情页
 */

function esc(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$");
}

export function emitFlutterEntityDetailPage(
  screen: AppSpecScreen,
  spec: AppSpec
): string {
  const entity = resolveEntityForScreen(spec, screen);
  if (!entity) {
    // 无实体回退到占位详情页
    return emitFlutterPlaceholderDetail(screen, spec);
  }

  const className = pascalCase(screen.id) + "DetailPage";
  const title = esc(screen.title);
  const table = esc(entityTableName(entity));

  // 生成字段展示
  const fieldRows = entity.fields.map((f) => {
    const label = esc(f.name);
    return `        _DetailRow(label: "${label}", value: (item["${esc(f.name)}"]?.toString() ?? "—")),`;
  }).join("\n");

  const supabaseImport = `import "package:supabase_flutter/supabase_flutter.dart";`;

  return `import "package:flutter/material.dart";

import "../../../core/config/env.dart";
${supabaseImport}

class ${className} extends StatelessWidget {
  const ${className}({super.key, required this.itemId});

  final String itemId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("${title}")),
      body: FutureBuilder<Map<String, dynamic>?>(
        future: _fetchItem(itemId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError || !snapshot.hasData) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.grey),
                  const SizedBox(height: 12),
                  Text(snapshot.error?.toString() ?? "未找到数据",
                      style: const TextStyle(color: Colors.grey)),
                ],
              ),
            );
          }
          final item = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
${fieldRows}
            ],
          );
        },
      ),
    );
  }

  Future<Map<String, dynamic>?> _fetchItem(String id) async {
    try {
      final client = Supabase.instance.client;
      final response = await client
          .from("${table}")
          .select("*")
          .eq("id", id)
          .maybeSingle();
      return response as Map<String, dynamic>?;
    } catch (_) {
      // 回退示例数据
      return {
${entity.fields.map(f => `        "${esc(f.name)}": "${esc(f.name)}_示例"`).join(",\n")}
      };
    }
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(label,
                style: const TextStyle(
                    fontWeight: FontWeight.w600, color: Colors.black54))),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(value,
                style: const TextStyle(fontSize: 15)),
          ),
        ],
      ),
    );
  }
}
`;
}

function emitFlutterPlaceholderDetail(
  screen: AppSpecScreen,
  _spec: AppSpec
): string {
  const className = pascalCase(screen.id) + "DetailPage";
  const title = esc(screen.title);
  return `import "package:flutter/material.dart";

class ${className} extends StatelessWidget {
  const ${className}({super.key, required this.itemId});
  final String itemId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("${title}")),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.info_outline, size: 48, color: Colors.grey),
            const SizedBox(height: 12),
            Text("详情页占位（item: \${itemId}）",
                style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 4),
            Text("${esc(screen.id)} · ${esc(screen.type)}",
                style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}
`;
}

export function pascalCase(id: string): string {
  return id
    .split(/[_-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

export { type AppSpecScreen, type AppSpec };
