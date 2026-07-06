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

export function buildOnboardingPageContext(
  screen: AppSpecScreen,
  _spec: AppSpec,
): Record<string, string> {
  return {
    className: `${pascalCase(screen.id)}Page`,
    title: escapeDartString(screen.title),
  };
}

export function buildCalendarPageContext(
  screen: AppSpecScreen,
  spec: AppSpec,
): Record<string, string> {
  const entity = entityOrFirst(spec, screen);
  return {
    className: `${pascalCase(screen.id)}Page`,
    title: escapeDartString(screen.title),
    table: tableName(entity),
    dateField: escapeDartString(
      entity.fields.find(
        (f) =>
          f.type === "datetime" ||
          f.name.includes("date") ||
          f.name.includes("time"),
      )?.name ?? "created_at",
    ),
    titleField: escapeDartString(
      entity.fields.find(
        (f) => f.name.includes("title") || f.name.includes("name"),
      )?.name ?? "id",
    ),
  };
}

const KANBAN_STATUSES = ["todo", "in_progress", "done"] as const;

export function buildKanbanPageContext(
  screen: AppSpecScreen,
  spec: AppSpec,
): Record<string, string> {
  const entity = entityOrFirst(spec, screen);
  const titleField = escapeDartString(
    entity.fields.find(
      (f) => f.name.includes("title") || f.name.includes("name"),
    )?.name ??
      pkField(entity).replace(/\\/g, ""),
  );
  const statusField = escapeDartString(
    entity.fields.find(
      (f) =>
        f.name.includes("status") ||
        f.name.includes("stage") ||
        f.name.includes("state"),
    )?.name ?? "status",
  );
  return {
    className: `${pascalCase(screen.id)}Page`,
    title: escapeDartString(screen.title),
    table: tableName(entity),
    statusField,
    titleField,
    columnsInit: KANBAN_STATUSES.map((s) => `"${s}": []`).join(",\n    "),
    columnColorsInit: KANBAN_STATUSES.map((s) => `"${s}": Colors.blue`).join(
      ",\n    ",
    ),
    kanbanColumnWidgets: KANBAN_STATUSES.map(
      (s) =>
        `_KanbanColumn(
                    title: "${s}",
                    color: (_columnColors["${s}"] ?? Colors.grey)[400]!,
                    items: _columns["${s}"] ?? [],
                    titleField: "${titleField}",
                  ),`,
    ).join("\n                  "),
    colsInitExpr: KANBAN_STATUSES.map((s) => `"${s}": []`).join(", "),
  };
}

export function buildCardGridPageContext(
  screen: AppSpecScreen,
  spec: AppSpec,
): Record<string, string> {
  const entity = entityOrFirst(spec, screen);
  const pk = pkField(entity);
  const hasImage = entity.fields.some(
    (f) =>
      f.type === "image" ||
      f.name.includes("image") ||
      f.name.includes("thumb"),
  );
  const titleField = escapeDartString(
    entity.fields.find(
      (f) => f.name.includes("title") || f.name.includes("name"),
    )?.name ?? pk.replace(/\\/g, ""),
  );
  const subtitleField = entity.fields.find(
    (f) =>
      f.name.includes("desc") ||
      f.name.includes("price") ||
      f.name.includes("summary"),
  );
  const subtitleExpr = subtitleField
    ? `m["${escapeDartString(subtitleField.name)}"]?.toString() ?? ""`
    : '""';
  const titleFieldRaw = titleField.replace(/\\/g, "");
  const detailFields = entity.fields
    .filter(
      (f) =>
        f.name !== "id" &&
        !f.primary &&
        f.name !== "image_url" &&
        f.name !== "thumbnail" &&
        f.name !== titleFieldRaw &&
        f.name !== subtitleField?.name,
    )
    .map(
      (f) =>
        `const SizedBox(height: 12), _DetailRow(label: "${escapeDartString(f.name)}", value: item["${escapeDartString(f.name)}"]?.toString() ?? "—"),`,
    )
    .join("\n      ");

  return {
    className: `${pascalCase(screen.id)}Page`,
    title: escapeDartString(screen.title),
    table: tableName(entity),
    titleField,
    subtitleExpr,
    gridCardImageParam: hasImage
      ? 'imageUrl: item["image_url"]?.toString() ?? item["thumbnail"]?.toString(),'
      : "",
    detailImageBlock: hasImage
      ? 'if (item["image_url"] != null) ClipRRect(borderRadius: BorderRadius.circular(16), child: Image.network(item["image_url"]!.toString(), height: 220, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox.shrink())), const SizedBox(height: 16),'
      : "",
    detailSubtitleBlock: subtitleField
      ? `const SizedBox(height: 8), Text(item["${escapeDartString(subtitleField.name)}"]?.toString() ?? "", style: AppTheme.bodyText(Theme.of(context).textTheme)),`
      : "",
    detailFieldRows: detailFields,
  };
}

export function buildChartPageContext(
  screen: AppSpecScreen,
  spec: AppSpec,
): Record<string, string> {
  const entity = entityOrFirst(spec, screen);
  const className = `${pascalCase(screen.id)}Page`;
  const title = escapeDartString(screen.title);
  const table = tableName(entity);
  const numericFields = entity.fields.filter((f) =>
    ["int", "float", "number"].includes(f.type),
  );

  if (numericFields.length === 0) {
    return {
      hasNumeric: "",
      className,
      title,
      entityName: escapeDartString(entity.name),
      table: "",
      groupField: "",
      groupedInit: "",
      groupedAccum: "",
      barRodLines: "",
      lineBarLines: "",
    };
  }

  const groupField = escapeDartString(
    entity.fields.find(
      (f) =>
        f.name.includes("category") ||
        f.name.includes("type") ||
        f.name.includes("group") ||
        f.name.includes("name") ||
        f.name.includes("title"),
    )?.name ?? entity.fields[0].name,
  );

  return {
    hasNumeric: "true",
    className,
    title,
    table,
    groupField,
    groupedInit: numericFields
      .map((f) => `"${escapeDartString(f.name)}": 0`)
      .join(", "),
    groupedAccum: numericFields
      .map(
        (f) =>
          `grouped[key]!["${escapeDartString(f.name)}"] = (grouped[key]!["${escapeDartString(f.name)}"] ?? 0) + (double.tryParse(item["${escapeDartString(f.name)}"]?.toString() ?? "0") ?? 0);`,
      )
      .join("\n        "),
    barRodLines: numericFields
      .map(
        (f, i) =>
          `BarChartRodData(toY: _chartData[i].values["${escapeDartString(f.name)}"] ?? 0, color: [theme.colorScheme.primary, theme.colorScheme.tertiary, theme.colorScheme.secondary][${i} % 3])`,
      )
      .join(",\n                      "),
    lineBarLines: numericFields
      .map(
        (f) =>
          `LineChartBarData(spots: List.generate(_chartData.length, (i) => FlSpot(i.toDouble(), _chartData[i].values["${escapeDartString(f.name)}"] ?? 0)), isCurved: true, color: theme.colorScheme.primary, barWidth: 3, dotData: FlDotData(show: true)),`,
      )
      .join("\n                      "),
  };
}
