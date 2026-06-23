/**
 * 扩展页面类型发射器 — 大幅提升 App 多样性
 *
 * 新增 6 种 screen type:
 *   dashboard  — 仪表盘 / 统计摘要（解锁健身、记账、习惯追踪类 App）
 *   card_grid  — 卡片网格（解锁电商浏览、菜谱、图片库）
 *   calendar   — 日历 / 时间线（解锁事件管理、习惯打卡）
 *   chart      — 图表视图（解锁数据可视化、预算分析）
 *   kanban     — 看板（解锁项目管理、任务流）
 *   onboarding — 引导页（解锁新用户引导流程）
 */

import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";

// ─── 工具函数 ───────────────────────────────────────────────

function pascalCase(id: string): string {
  return id
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}
function escapeDartString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/'/g, "\\'");
}

type EntityDef = { name: string; fields: Array<{ name: string; type: string; primary?: boolean }> };

function entityOrFirst(spec: AppSpec, screen: AppSpecScreen): EntityDef {
  const entityName = screen.entity;
  const entities = (spec.entities ?? []) as unknown as EntityDef[];
  if (entityName) {
    const e = entities.find((x) => x.name === entityName);
    if (e) return e;
  }
  return entities[0] ?? { name: "items", fields: [{ name: "id", type: "uuid", primary: true }, { name: "title", type: "string" }] };
}

function tableName(e: { name: string }) { return escapeDartString(e.name); }
function pkField(e: { fields: Array<{ name: string; primary?: boolean }> }) {
  return escapeDartString(e.fields.find((f) => f.primary)?.name ?? "id");
}

// ─── 1. Dashboard / 统计摘要 ──────────────────────────────────

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

// ─── 2. 卡片网格 ──────────────────────────────────────────────

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

// ─── 3. 日历 / 时间线 ──────────────────────────────────────────

export function emitFlutterCalendarPage(
  screen: AppSpecScreen,
  spec: AppSpec
): string {
  const className = `${pascalCase(screen.id)}Page`;
  const title = escapeDartString(screen.title);
  const entity = entityOrFirst(spec, screen);
  const table = tableName(entity);
  const dateField = escapeDartString(
    entity.fields.find((f) => f.type === "datetime" || f.name.includes("date") || f.name.includes("time"))?.name ?? "created_at"
  );
  const titleField = escapeDartString(
    entity.fields.find((f) => f.name.includes("title") || f.name.includes("name"))?.name ?? "id"
  );

  return `import "package:flutter/material.dart";
import "package:supabase_flutter/supabase_flutter.dart";
import "package:table_calendar/table_calendar.dart";

import "../../../core/supabase/supabase_client.dart";
import "../../../core/theme/app_theme.dart";
import "../../../core/widgets/polished_widgets.dart";

class ${className} extends StatefulWidget {
  const ${className}({super.key});
  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;
  Map<DateTime, List<Map<String, dynamic>>> _events = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _selectedDay = DateTime.now();
    _loadEvents();
  }

  Future<void> _loadEvents() async {
    setState(() { _loading = true; });
    try {
      final client = supabaseOrNull;
      if (client == null) { setState(() { _loading = false; }); return; }
      final rows = await client.from("${table}").select("*").order("${dateField}", ascending: true).limit(200);
      final items = List<Map<String, dynamic>>.from((rows as List<dynamic>?) ?? []);
      final map = <DateTime, List<Map<String, dynamic>>>{};
      for (final item in items) {
        final dateStr = item["${dateField}"]?.toString() ?? "";
        final date = DateTime.tryParse(dateStr);
        if (date == null) continue;
        final day = DateTime(date.year, date.month, date.day);
        map.putIfAbsent(day, () => []).add(item);
      }
      setState(() { _events = map; _loading = false; });
    } catch (_) {
      setState(() { _loading = false; });
    }
  }

  List<Map<String, dynamic>> _getEventsForDay(DateTime day) {
    return _events[DateTime(day.year, day.month, day.day)] ?? [];
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final selectedEvents = _selectedDay != null ? _getEventsForDay(_selectedDay!) : <Map<String, dynamic>>[];

    return Scaffold(
      appBar: AppBar(title: Text("${title}")),
      body: _loading
          ? const AppLoadingSkeleton()
          : Column(children: [
              TableCalendar(
                firstDay: DateTime.utc(2020, 1, 1),
                lastDay: DateTime.utc(2030, 12, 31),
                focusedDay: _focusedDay,
                selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
                onDaySelected: (selected, focused) => setState(() { _selectedDay = selected; _focusedDay = focused; }),
                onPageChanged: (focused) => setState(() { _focusedDay = focused; }),
                eventLoader: _getEventsForDay,
                calendarStyle: CalendarStyle(
                  todayDecoration: BoxDecoration(color: theme.colorScheme.primary.withValues(alpha: 0.4), shape: BoxShape.circle),
                  selectedDecoration: BoxDecoration(color: theme.colorScheme.primary, shape: BoxShape.circle),
                  markerDecoration: BoxDecoration(color: theme.colorScheme.tertiary, shape: BoxShape.circle),
                ),
                headerStyle: HeaderStyle(formatButtonVisible: false, titleCentered: true),
              ),
              const Divider(),
              Expanded(
                child: selectedEvents.isEmpty
                    ? const AppEmptyState(icon: Icons.event_note, title: "这天没有安排", subtitle: "选择日期查看")
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: selectedEvents.length,
                        itemBuilder: (_, i) {
                          final e = selectedEvents[i];
                          return Card(
                            child: ListTile(
                              leading: CircleAvatar(backgroundColor: theme.colorScheme.primaryContainer, child: Text("\${i + 1}")),
                              title: Text(e["${titleField}"]?.toString() ?? ""),
                              subtitle: Text(e["${dateField}"]?.toString() ?? ""),
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

// ─── 4. 图表视图 ───────────────────────────────────────────────

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

// ─── 5. 看板 / 列视图 ───────────────────────────────────────────

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

// ─── 6. 引导页 ──────────────────────────────────────────────────

export function emitFlutterOnboardingPage(
  screen: AppSpecScreen,
  _spec: AppSpec
): string {
  const className = `${pascalCase(screen.id)}Page`;
  const title = escapeDartString(screen.title);

  return `import "package:flutter/material.dart";
import "package:shared_preferences/shared_preferences.dart";

import "../../../core/theme/app_theme.dart";

class ${className} extends StatefulWidget {
  const ${className}({super.key});

  static Future<bool> shouldShow() async {
    final prefs = await SharedPreferences.getInstance();
    return !(prefs.getBool("onboarding_done") ?? false);
  }

  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
  final _pageController = PageController();
  int _currentPage = 0;

  static const _pages = [
    _OnboardingPageData(
      icon: Icons.rocket_launch,
      title: "欢迎使用 ${title}",
      description: "快速上手，体验流畅的操作流程。",
      color: Color(0xFF0D9488),
    ),
    _OnboardingPageData(
      icon: Icons.cloud_sync,
      title: "数据同步",
      description: "所有数据安全存储在云端，随时随地访问。",
      color: Color(0xFF2563EB),
    ),
    _OnboardingPageData(
      icon: Icons.shield,
      title: "隐私安全",
      description: "采用行业标准加密，保护你的数据安全。",
      color: Color(0xFF7C3AED),
    ),
  ];

  void _onDone() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool("onboarding_done", true);
    if (mounted) Navigator.of(context).pushReplacementNamed("/home");
  }

  @override
  void dispose() { _pageController.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Column(children: [
          Expanded(
            child: PageView.builder(
              controller: _pageController,
              itemCount: _pages.length,
              onPageChanged: (i) => setState(() => _currentPage = i),
              itemBuilder: (_, i) {
                final p = _pages[i];
                return Padding(
                  padding: const EdgeInsets.all(40),
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Container(
                      width: 120, height: 120,
                      decoration: BoxDecoration(color: p.color.withValues(alpha: 0.1), shape: BoxShape.circle),
                      child: Icon(p.icon, size: 56, color: p.color),
                    ),
                    const SizedBox(height: 40),
                    Text(p.title, style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    Text(p.description, textAlign: TextAlign.center, style: AppTheme.bodyText(theme.textTheme)),
                  ]),
                );
              },
            ),
          ),
          // 指示器
          Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(_pages.length, (i) => Container(
            margin: const EdgeInsets.symmetric(horizontal: 4),
            width: _currentPage == i ? 24 : 8, height: 8,
            decoration: BoxDecoration(
              color: _currentPage == i ? _pages[i].color : Colors.grey.shade300,
              borderRadius: BorderRadius.circular(4),
            ),
          ))),
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _currentPage == _pages.length - 1 ? _onDone : () => _pageController.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut),
                child: Text(_currentPage == _pages.length - 1 ? "开始使用" : "下一步", style: const TextStyle(fontSize: 16)),
              ),
            ),
          ),
          const SizedBox(height: 8),
          if (_currentPage < _pages.length - 1)
            TextButton(onPressed: _onDone, child: const Text("跳过")),
          const SizedBox(height: 32),
        ]),
      ),
    );
  }
}

class _OnboardingPageData {
  final IconData icon;
  final String title, description;
  final Color color;
  const _OnboardingPageData({required this.icon, required this.title, required this.description, required this.color});
}
`;
}
