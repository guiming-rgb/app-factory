import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";

import { entityOrFirst, escapeDartString, pascalCase, tableName } from "./shared";

export function emitFlutterChartPage(
  screen: AppSpecScreen,
  spec: AppSpec
): string {
  const className = `${pascalCase(screen.id)}Page`;
  const title = escapeDartString(screen.title);
  const entity = entityOrFirst(spec, screen);
  const table = tableName(entity);
  const numericFields = entity.fields.filter((f) =>
    ["int", "float", "number"].includes(f.type)
  );

  if (numericFields.length === 0) {
    // 没有数值字段时回退到普通列表
    return `// Chart page fallback — no numeric fields in entity "${entity.name}"
import "package:flutter/material.dart";
import "../../../core/widgets/polished_widgets.dart";

class ${className} extends StatelessWidget {
  const ${className}({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text("${title}")),
    body: const AppEmptyState(icon: Icons.bar_chart, title: "暂无图表数据", subtitle: "请添加数值类型的实体字段"),
  );
}
`;
  }

  const groupField = escapeDartString(
    entity.fields.find((f) => f.name.includes("category") || f.name.includes("type") || f.name.includes("group") || f.name.includes("name") || f.name.includes("title"))?.name ?? entity.fields[0].name
  );
  const barSeries = numericFields.map((f) => `        _ChartSeries(
          label: "${escapeDartString(f.name)}",
          future: _loadSeries("${escapeDartString(groupField)}", "${escapeDartString(f.name)}"),
        ),`).join("\n");

  return `import "package:flutter/material.dart";
import "package:supabase_flutter/supabase_flutter.dart";
import "package:fl_chart/fl_chart.dart";

import "../../../core/supabase/supabase_client.dart";
import "../../../core/theme/app_theme.dart";
import "../../../core/widgets/polished_widgets.dart";

class ${className} extends StatefulWidget {
  const ${className}({super.key});
  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<_ChartData> _chartData = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() { _tabController.dispose(); super.dispose(); }

  Future<void> _loadData() async {
    setState(() { _loading = true; _error = null; });
    try {
      final client = supabaseOrNull;
      if (client == null) { setState(() { _loading = false; _error = "未配置 Supabase"; }); return; }
      final rows = await client.from("${table}").select("*").limit(200);
      final items = List<Map<String, dynamic>>.from((rows as List<dynamic>?) ?? []);
      final grouped = <String, Map<String, double>>{};
      for (final item in items) {
        final key = item["${groupField}"]?.toString() ?? "其他";
        grouped.putIfAbsent(key, () => {${numericFields.map((f) => `"${escapeDartString(f.name)}": 0`).join(", ")}});
        ${numericFields.map((f) => `grouped[key]!["${escapeDartString(f.name)}"] = (grouped[key]!["${escapeDartString(f.name)}"] ?? 0) + (double.tryParse(item["${escapeDartString(f.name)}"]?.toString() ?? "0") ?? 0);`).join("\n        ")}
      }
      setState(() {
        _chartData = grouped.entries.map((e) => _ChartData(e.key, e.value)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = "加载数据失败"; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text("${title}"), bottom: TabBar(controller: _tabController, tabs: const [
        Tab(text: "柱状图"), Tab(text: "饼图"), Tab(text: "折线图"),
      ])),
      body: _loading
          ? const AppLoadingSkeleton()
          : _error != null
              ? AppErrorCard(message: _error!, onRetry: _loadData)
              : TabBarView(controller: _tabController, children: [
                  // 柱状图
                  Padding(padding: const EdgeInsets.all(16), child: _chartData.isEmpty ? const AppEmptyState(icon: Icons.bar_chart, title: "暂无数据") : BarChart(BarChartData(
                    barGroups: List.generate(_chartData.length, (i) => BarChartGroupData(x: i, barRods: [
                      ${numericFields.map((f, i) => `BarChartRodData(toY: _chartData[i].values["${escapeDartString(f.name)}"] ?? 0, color: [theme.colorScheme.primary, theme.colorScheme.tertiary, theme.colorScheme.secondary][${i} % 3])`).join(",\n                      ")}
                    ])),
                    titlesData: FlTitlesData(bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, getTitlesWidget: (v, _) => Text(_chartData[v.toInt()].label, style: const TextStyle(fontSize: 10)), reservedSize: 40)), leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 50)), topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)), rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false))),
                    borderData: FlBorderData(show: false),
                  ))),
                  // 饼图
                  Padding(padding: const EdgeInsets.all(16), child: _chartData.isEmpty ? const AppEmptyState(icon: Icons.pie_chart, title: "暂无数据") : PieChart(PieChartData(
                    sections: List.generate(_chartData.length, (i) => PieChartSectionData(
                      value: (_chartData[i].values.values.fold(0.0, (a, b) => a + b)),
                      title: _chartData[i].label,
                      color: [theme.colorScheme.primary, theme.colorScheme.tertiary, theme.colorScheme.secondary, theme.colorScheme.error][i % 4],
                      radius: 100,
                      titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    )),
                  ))),
                  // 折线图
                  Padding(padding: const EdgeInsets.all(16), child: _chartData.isEmpty ? const AppEmptyState(icon: Icons.show_chart, title: "暂无数据") : LineChart(LineChartData(
                    lineBarsData: [
                      ${numericFields.map((f) => `LineChartBarData(spots: List.generate(_chartData.length, (i) => FlSpot(i.toDouble(), _chartData[i].values["${escapeDartString(f.name)}"] ?? 0)), isCurved: true, color: theme.colorScheme.primary, barWidth: 3, dotData: FlDotData(show: true)),`).join("\n                      ")}
                    ],
                    titlesData: FlTitlesData(bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, getTitlesWidget: (v, _) => Text(_chartData[v.toInt()].label, style: const TextStyle(fontSize: 10)), reservedSize: 40))),
                    borderData: FlBorderData(show: true),
                    gridData: FlGridData(show: true),
                  ))),
                ]),
    );
  }
}

class _ChartSeries {
  final String label;
  final Future<List<_ChartData>> future;
  const _ChartSeries({required this.label, required this.future});
}

class _ChartData {
  final String label;
  final Map<String, double> values;
  const _ChartData(this.label, this.values);
}
`;
}
