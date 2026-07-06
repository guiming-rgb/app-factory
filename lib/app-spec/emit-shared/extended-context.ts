/**
 * B2: Flutter extended 页 Mustache 上下文构建
 */
import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import {
  entityOrFirst,
  escapeDartString,
  pascalCase,
  pkField,
  tableName,
} from "@/lib/flutter-codegen/emit-extended/shared";

export function buildDashboardPageContext(
  screen: AppSpecScreen,
  spec: AppSpec,
): Record<string, string> {
  const className = `${pascalCase(screen.id)}DashboardPage`;
  const title = escapeDartString(screen.title);
  const entity = entityOrFirst(spec, screen);
  const table = tableName(entity);
  const pk = pkField(entity);
  const numericFields = entity.fields.filter((f) =>
    ["int", "float", "number"].includes(f.type),
  );

  const chartBarGroups =
    numericFields.length > 0
      ? numericFields
          .slice(0, 3)
          .map(
            (f, i) =>
              `BarChartGroupData(x: ${i}, barRods: [BarChartRodData(toY: (_summary["${escapeDartString(f.name)}"] ?? 0).toDouble())])`,
          )
          .join(",\n                            ")
      : `BarChartGroupData(x: 0, barRods: [BarChartRodData(toY: (_summary["total"] ?? 0).toDouble())])`;

  const numericFieldLoaders = numericFields
    .map(
      (f) => `      try {
        final rows = await client.from("${table}").select("${escapeDartString(f.name)}");
        final sum = (rows as List<dynamic>?)?.fold<num>(0, (s, r) => s + (num.tryParse((r as Map)["${escapeDartString(f.name)}"]?.toString() ?? "0") ?? 0)) ?? 0;
        summary["${escapeDartString(f.name)}"] = sum;
      } catch (_) {}`,
    )
    .join("\n");

  const summaryCards = numericFields
    .map(
      (f) =>
        '_SummaryCard(label: "' +
        escapeDartString(f.name) +
        ' 合计", value: "${(_summary[\'' +
        escapeDartString(f.name) +
        '\'] ?? 0).toStringAsFixed(1)}", icon: Icons.trending_up, color: theme.colorScheme.tertiary),',
    )
    .join("\n                      ");

  return {
    className,
    title,
    table,
    pk,
    numericFieldLoaders,
    summaryCards,
    chartBarGroups,
  };
}
