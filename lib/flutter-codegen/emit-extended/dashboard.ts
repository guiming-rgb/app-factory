import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";

import { entityOrFirst, escapeDartString, pascalCase, pkField, tableName } from "./shared";

export function emitFlutterDashboardPage(
  screen: AppSpecScreen,
  spec: AppSpec
): string {
  const className = `${pascalCase(screen.id)}DashboardPage`;
  const title = escapeDartString(screen.title);
  const entity = entityOrFirst(spec, screen);
  const table = tableName(entity);
  const pk = pkField(entity);
  const numericFields = entity.fields.filter((f) =>
    ["int", "float", "number"].includes(f.type)
  );

  const chartBarGroups =
    numericFields.length > 0
      ? numericFields
          .slice(0, 3)
          .map(
            (f, i) =>
              `BarChartGroupData(x: ${i}, barRods: [BarChartRodData(toY: (_summary["${escapeDartString(f.name)}"] ?? 0).toDouble())])`
          )
          .join(",\n                            ")
      : `BarChartGroupData(x: 0, barRods: [BarChartRodData(toY: (_summary["total"] ?? 0).toDouble())])`;

  return `import "package:flutter/material.dart";
import "package:fl_chart/fl_chart.dart";

import "../../core/supabase/supabase_client.dart";
import "../../core/theme/app_theme.dart";
import "../../core/widgets/polished_widgets.dart";

class ${className} extends StatefulWidget {
  const ${className}({super.key});
  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
  Map<String, num> _summary = {};
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadSummary();
  }

  Future<void> _loadSummary() async {
    setState(() { _loading = true; _error = null; });
    try {
      final client = supabaseOrNull;
      if (client == null) {
        setState(() { _loading = false; _error = "未配置 Supabase"; });
        return;
      }
      final countRows = await client.from("${table}").select("${pk}");
      final total = (countRows as List<dynamic>?)?.length ?? 0;
      final summary = <String, num>{"total": total};
${numericFields.map((f) => `      try {
        final rows = await client.from("${table}").select("${escapeDartString(f.name)}");
        final sum = (rows as List<dynamic>?)?.fold<num>(0, (s, r) => s + (num.tryParse((r as Map)["${escapeDartString(f.name)}"]?.toString() ?? "0") ?? 0)) ?? 0;
        summary["${escapeDartString(f.name)}"] = sum;
      } catch (_) {}`).join("\n")}
      setState(() { _summary = summary; _loading = false; });
    } catch (e) {
      setState(() { _error = "加载统计数据失败"; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text("${title}")),
      body: _loading
          ? const AppLoadingSkeleton()
          : _error != null
              ? AppErrorCard(message: _error!, onRetry: _loadSummary)
              : RefreshIndicator(
                  onRefresh: _loadSummary,
                  child: ListView(padding: const EdgeInsets.all(16), children: [
                    Wrap(spacing: 12, runSpacing: 12, children: [
                      _SummaryCard(label: "总记录", value: "\${_summary['total'] ?? 0}", icon: Icons.storage, color: theme.colorScheme.primary),
                      ${numericFields.map((f) => `_SummaryCard(label: "${escapeDartString(f.name)} 合计", value: "\${(_summary['${escapeDartString(f.name)}'] ?? 0).toStringAsFixed(1)}", icon: Icons.trending_up, color: theme.colorScheme.tertiary),`).join("\n                      ")}
                    ]),
                    const SizedBox(height: 24),
                    Text("数据趋势", style: AppTheme.headingMedium(theme.textTheme)),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 200,
                      child: BarChart(BarChartData(
                        alignment: BarChartAlignment.spaceAround,
                        maxY: (_summary.values.fold<num>(0, (a, b) => a > b ? a : b)).toDouble() + 10,
                        barGroups: [
                            ${chartBarGroups}
                        ],
                        titlesData: const FlTitlesData(show: true),
                        borderData: FlBorderData(show: false),
                        gridData: FlGridData(show: true, drawVerticalLine: false),
                      )),
                    ),
                    const SizedBox(height: 24),
                    Text("快捷操作", style: AppTheme.headingMedium(theme.textTheme)),
                    const SizedBox(height: 12),
                    _QuickAction(icon: Icons.add, label: "添加记录", onTap: () {}),
                    _QuickAction(icon: Icons.list, label: "查看全部", onTap: () {}),
                  ]),
                ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.label, required this.value, required this.icon, required this.color});
  final String label, value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: 160,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 8),
        Text(value, style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 4),
        Text(label, style: AppTheme.caption(theme.textTheme)),
      ]),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({required this.icon, required this.label, this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(leading: Icon(icon), title: Text(label), trailing: const Icon(Icons.chevron_right), onTap: onTap),
    );
  }
}
`;
}
