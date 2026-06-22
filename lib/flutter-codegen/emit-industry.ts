/**
 * 垂直行业「真模板」— 行业专属 Flutter Widget 发射器
 *
 * 5 个垂直行业，每个都有独特的 UI 组件，不只是通用 list/detail/form。
 * generate.ts 根据 Spec metadata.category 选择对应组件集。
 */

// ═══════════════════════════════════════════════════════════
// 1. 记账/财务 — 交易列表 + 预算进度 + 分类饼图 + 月度汇总
// ═══════════════════════════════════════════════════════════

export function emitFinanceWidgetsDart(): string {
  return `import "package:flutter/material.dart";
import "package:intl/intl.dart";

import "../theme/app_theme.dart";

/// 交易列表项 — 带金额颜色、分类图标、日期
class TransactionTile extends StatelessWidget {
  const TransactionTile({
    super.key,
    required this.title,
    required this.amount,
    required this.category,
    required this.date,
    required this.isIncome,
    this.onTap,
  });

  final String title;
  final double amount;
  final String category;
  final DateTime date;
  final bool isIncome;
  final VoidCallback? onTap;

  static const _categoryIcons = {
    "餐饮": Icons.restaurant, "交通": Icons.directions_car, "购物": Icons.shopping_bag,
    "娱乐": Icons.movie, "住房": Icons.home, "医疗": Icons.local_hospital,
    "教育": Icons.school, "工资": Icons.work, "投资": Icons.trending_up,
    "其他": Icons.more_horiz,
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final icon = _categoryIcons[category] ?? Icons.more_horiz;
    final sign = isIncome ? "+" : "-";
    final color = isIncome ? Colors.green : theme.colorScheme.error;

    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withValues(alpha: 0.1),
          child: Icon(icon, color: color, size: 20),
        ),
        title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
        subtitle: Text(DateFormat("MM/dd").format(date), style: AppTheme.caption(theme.textTheme)),
        trailing: Text("\\$sign¥\${amount.toStringAsFixed(2)}",
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: color)),
        onTap: onTap,
      ),
    );
  }
}

/// 预算进度条
class BudgetProgressBar extends StatelessWidget {
  const BudgetProgressBar({
    super.key,
    required this.label,
    required this.spent,
    required this.budget,
  });

  final String label;
  final double spent, budget;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ratio = budget > 0 ? (spent / budget).clamp(0.0, 1.0) : 0.0;
    final color = ratio > 0.9 ? Colors.red : ratio > 0.7 ? Colors.orange : Colors.green;

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label, style: const TextStyle(fontSize: 12)),
        Text("¥\${spent.toStringAsFixed(0)} / ¥\${budget.toStringAsFixed(0)}",
          style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurface.withValues(alpha: 0.6))),
      ]),
      const SizedBox(height: 4),
      ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: LinearProgressIndicator(value: ratio, backgroundColor: color.withValues(alpha: 0.1), color: color, minHeight: 8),
      ),
    ]);
  }
}

/// 月度汇总卡片
class MonthlySummaryCard extends StatelessWidget {
  const MonthlySummaryCard({super.key, required this.income, required this.expense, required this.month});

  final double income, expense;
  final String month;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.3),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(children: [
          Text(month, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            _SummaryItem(label: "收入", value: "¥\${income.toStringAsFixed(2)}", color: Colors.green),
            _SummaryItem(label: "支出", value: "¥\${expense.toStringAsFixed(2)}", color: Colors.red),
            _SummaryItem(label: "结余", value: "¥\${(income - expense).toStringAsFixed(2)}",
              color: income >= expense ? Colors.green : Colors.red),
          ]),
        ]),
      ),
    );
  }
}

class _SummaryItem extends StatelessWidget {
  const _SummaryItem({required this.label, required this.value, required this.color});
  final String label, value;
  final Color color;
  @override
  Widget build(BuildContext context) => Column(children: [
    Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
    const SizedBox(height: 4),
    Text(label, style: AppTheme.caption(Theme.of(context).textTheme)),
  ]);
}
`;
}

// ═══════════════════════════════════════════════════════════
// 2. CRM — 客户卡片 + 商机阶段 + 活动时间线
// ═══════════════════════════════════════════════════════════

export function emitCrmWidgetsDart(): string {
  return `import "package:flutter/material.dart";
import "package:intl/intl.dart";

import "../theme/app_theme.dart";

/// CRM 客户卡片
class ClientCard extends StatelessWidget {
  const ClientCard({super.key, required this.name, required this.company, this.stage, this.value, this.avatar, this.onTap});
  final String name, company;
  final String? stage, value, avatar;
  final VoidCallback? onTap;

  static const _stageColors = {
    "线索": Colors.blue, "接触": Colors.cyan, "需求": Colors.orange,
    "报价": Colors.amber, "谈判": Colors.deepOrange, "成交": Colors.green, "丢失": Colors.grey,
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final stageColor = _stageColors[stage ?? ""] ?? Colors.grey;

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        child: Padding(padding: const EdgeInsets.all(14), child: Row(children: [
          CircleAvatar(radius: 22, backgroundColor: stageColor.withValues(alpha: 0.15),
            child: Text(name.isNotEmpty ? name[0] : "?", style: TextStyle(color: stageColor, fontWeight: FontWeight.bold))),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 2),
            Text(company, style: AppTheme.caption(theme.textTheme)),
          ])),
          if (stage != null)
            Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: stageColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
              child: Text(stage!, style: TextStyle(fontSize: 11, color: stageColor, fontWeight: FontWeight.w500))),
        ])),
      ),
    );
  }
}

/// 商机阶段指示器
class DealStageIndicator extends StatelessWidget {
  const DealStageIndicator({super.key, required this.currentStage});
  final String currentStage;

  static const stages = ["线索", "接触", "需求", "报价", "谈判", "成交"];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final idx = stages.indexOf(currentStage);

    return Row(children: List.generate(stages.length, (i) {
      final done = i <= idx;
      return Expanded(child: Row(children: [
        if (i > 0) Expanded(child: Container(height: 2, color: done ? theme.colorScheme.primary : Colors.grey.shade300)),
        Container(width: 16, height: 16, decoration: BoxDecoration(
          shape: BoxShape.circle, color: done ? theme.colorScheme.primary : Colors.grey.shade300),
          child: done ? const Icon(Icons.check, size: 10, color: Colors.white) : null),
        if (i < stages.length - 1) Expanded(child: Container(height: 2, color: done && i < idx ? theme.colorScheme.primary : Colors.grey.shade300)),
      ]));
    }));
  }
}

/// 活动时间线
class ActivityTimeline extends StatelessWidget {
  const ActivityTimeline({super.key, required this.activities});
  final List<_TimelineItem> activities;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(children: List.generate(activities.length, (i) {
      final a = activities[i];
      final isLast = i == activities.length - 1;
      return IntrinsicHeight(child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(width: 24, child: Column(children: [
          Container(width: 10, height: 10, decoration: BoxDecoration(shape: BoxShape.circle, color: a.color ?? theme.colorScheme.primary)),
          if (!isLast) Expanded(child: Container(width: 2, color: Colors.grey.shade200)),
        ])),
        const SizedBox(width: 12),
        Expanded(child: Padding(padding: const EdgeInsets.only(bottom: 16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(a.title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
          const SizedBox(height: 2),
          Text(DateFormat("MM/dd HH:mm").format(a.time), style: AppTheme.caption(theme.textTheme)),
          if (a.desc != null) ...[const SizedBox(height: 4), Text(a.desc!, style: const TextStyle(fontSize: 12))],
        ]))),
      ]));
    }));
  }
}

class _TimelineItem {
  final String title, time;
  final String? desc;
  final Color? color;
  const _TimelineItem({required this.title, required this.time, this.desc, this.color});
}
`;
}

// ═══════════════════════════════════════════════════════════
// 3. 健身 — 运动卡片 + 计时器 + 进度仪表
// ═══════════════════════════════════════════════════════════

export function emitFitnessWidgetsDart(): string {
  return `import "package:flutter/material.dart";

import "../theme/app_theme.dart";

/// 健身课程/动作卡片
class WorkoutCard extends StatelessWidget {
  const WorkoutCard({super.key, required this.name, required this.duration, required this.calories, this.level, this.imageUrl, this.onTap});
  final String name, duration;
  final int calories;
  final String? level, imageUrl;
  final VoidCallback? onTap;

  static const _levelColors = {"初级": Colors.green, "中级": Colors.orange, "高级": Colors.red};

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final lc = _levelColors[level ?? ""] ?? Colors.grey;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (imageUrl != null)
            AspectRatio(aspectRatio: 2, child: Image.network(imageUrl!, fit: BoxFit.cover))
          else
            AspectRatio(aspectRatio: 2, child: Container(color: theme.colorScheme.primaryContainer, child: const Center(child: Icon(Icons.fitness_center, size: 32)))),
          Padding(padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
            const SizedBox(height: 8),
            Row(children: [
              _Tag(icon: Icons.timer, text: duration),
              const SizedBox(width: 12),
              _Tag(icon: Icons.local_fire_department, text: "\\$calories kcal"),
              if (level != null) ...[const SizedBox(width: 12), _Tag(icon: Icons.speed, text: level!, color: lc)],
            ]),
          ])),
        ]),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag({required this.icon, required this.text, this.color});
  final IconData icon; final String text; final Color? color;
  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
    Icon(icon, size: 13, color: color ?? Colors.grey),
    const SizedBox(width: 3),
    Text(text, style: TextStyle(fontSize: 11, color: color ?? Colors.grey)),
  ]);
}

/// 进度环
class ProgressRing extends StatelessWidget {
  const ProgressRing({super.key, required this.value, required this.label, this.color});
  final double value; // 0.0~1.0
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? Theme.of(context).colorScheme.primary;
    return Column(children: [
      SizedBox(width: 64, height: 64,
        child: Stack(fit: StackFit.expand, children: [
          CircularProgressIndicator(value: value, strokeWidth: 6, backgroundColor: c.withValues(alpha: 0.1), color: c),
          Center(child: Text("\${(value * 100).toInt()}%", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: c))),
        ])),
      const SizedBox(height: 6),
      Text(label, style: AppTheme.caption(Theme.of(context).textTheme)),
    ]);
  }
}

/// 身体数据卡片
class BodyStatCard extends StatelessWidget {
  const BodyStatCard({super.key, required this.label, required this.value, required this.unit, this.icon});
  final String label, value, unit;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(14), margin: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: theme.colorScheme.surface, borderRadius: BorderRadius.circular(12),
        boxShadow: AppTheme.cardShadow(theme.colorScheme)),
      child: Column(children: [
        if (icon != null) Icon(icon, size: 20, color: theme.colorScheme.primary),
        const SizedBox(height: 6),
        Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        Text(unit, style: AppTheme.caption(theme.textTheme)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 11)),
      ]),
    );
  }
}
`;
}

// ═══════════════════════════════════════════════════════════
// 4. 电商 — 增强商品卡片 + 价格标签 + 星级 + 购物车角标
// ═══════════════════════════════════════════════════════════

export function emitEcommerceWidgetsDart(): string {
  return `import "package:flutter/material.dart";

import "../theme/app_theme.dart";

/// 商品卡片（增强版 — 价格、评分、销量、角标）
class ProductCardEnhanced extends StatelessWidget {
  const ProductCardEnhanced({
    super.key, required this.name, required this.price,
    this.originalPrice, this.imageUrl, this.rating, this.sales, this.tag, this.onTap,
  });
  final String name;
  final double price,? originalPrice;
  final String? imageUrl, tag;
  final double? rating;
  final int? sales;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasDiscount = originalPrice != null && originalPrice! > price;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(color: theme.colorScheme.surface, borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          boxShadow: AppTheme.cardShadow(theme.colorScheme)),
        clipBehavior: Clip.antiAlias,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Stack(children: [
            AspectRatio(aspectRatio: 1,
              child: imageUrl != null
                  ? Image.network(imageUrl!, fit: BoxFit.cover)
                  : Container(color: theme.colorScheme.surfaceContainerHighest, child: const Center(child: Icon(Icons.image, size: 32)))),
            if (tag != null)
              Positioned(top: 8, left: 8,
                child: Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(4)),
                  child: Text(tag!, style: const TextStyle(color: Colors.white, fontSize: 10)))),
          ]),
          Padding(padding: const EdgeInsets.all(10), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(name, maxLines: 2, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, height: 1.3)),
            const SizedBox(height: 6),
            Row(children: [
              Text("¥\${price.toStringAsFixed(2)}", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
              if (hasDiscount) ...[
                const SizedBox(width: 6),
                Text("¥\${originalPrice!.toStringAsFixed(2)}", style: const TextStyle(fontSize: 11, decoration: TextDecoration.lineThrough, color: Colors.grey)),
              ],
            ]),
            if (rating != null || sales != null) ...[
              const SizedBox(height: 4),
              Row(children: [
                if (rating != null) ...[Icon(Icons.star, size: 12, color: Colors.amber), const SizedBox(width: 2), Text(rating!.toStringAsFixed(1), style: const TextStyle(fontSize: 11))],
                if (rating != null && sales != null) const SizedBox(width: 10),
                if (sales != null) Text("已售\\$sales", style: AppTheme.caption(theme.textTheme)),
              ]),
            ],
          ])),
        ]),
      ),
    );
  }
}

/// 购物车角标
class CartBadge extends StatelessWidget {
  const CartBadge({super.key, required this.count, this.onTap});
  final int count;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Stack(children: [
    IconButton(icon: const Icon(Icons.shopping_cart_outlined), onPressed: onTap),
    if (count > 0)
      Positioned(right: 4, top: 4,
        child: Container(padding: const EdgeInsets.all(4),
          decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
          child: Text("\\$count", style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)))),
  ]);
}

/// 星级评分
class RatingStars extends StatelessWidget {
  const RatingStars({super.key, required this.rating, this.size = 14});
  final double rating;
  final double size;

  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: List.generate(5, (i) {
    if (i < rating.floor()) return Icon(Icons.star, size: size, color: Colors.amber);
    if (i < rating) return Icon(Icons.star_half, size: size, color: Colors.amber);
    return Icon(Icons.star_border, size: size, color: Colors.grey.shade300);
  }));
}
`;
}

// ═══════════════════════════════════════════════════════════
// 5. 课表/教育 — 课表网格 + 课程卡片 + 作业卡片 + 成绩徽章
// ═══════════════════════════════════════════════════════════

export function emitEducationWidgetsDart(): string {
  return `import "package:flutter/material.dart";

import "../theme/app_theme.dart";

/// 课表时间格
class TimetableCell extends StatelessWidget {
  const TimetableCell({super.key, required this.courseName, required this.room, this.color, this.onTap});
  final String courseName, room;
  final Color? color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = color ?? Theme.of(context).colorScheme.primary;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.all(2),
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(color: c.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6), border: Border.all(color: c.withValues(alpha: 0.2))),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(courseName, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: c), maxLines: 2, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center),
          const SizedBox(height: 2),
          Text(room, style: TextStyle(fontSize: 9, color: c.withValues(alpha: 0.7))),
        ]),
      ),
    );
  }
}

/// 课程卡片
class CourseCard extends StatelessWidget {
  const CourseCard({super.key, required this.name, required this.teacher, this.schedule, this.studentCount, this.onTap});
  final String name, teacher;
  final String? schedule;
  final int? studentCount;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      leading: CircleAvatar(child: Text(name.isNotEmpty ? name[0] : "课")),
      title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
      subtitle: Text(teacher, style: const TextStyle(fontSize: 12)),
      trailing: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        if (schedule != null) Text(schedule!, style: const TextStyle(fontSize: 11)),
        if (studentCount != null) Text("\\$studentCount 人", style: AppTheme.caption(Theme.of(context).textTheme)),
      ]),
      onTap: onTap,
    ),
  );
}

/// 作业卡片
class AssignmentCard extends StatelessWidget {
  const AssignmentCard({super.key, required this.title, required this.course, required this.deadline, this.submitted, this.total, this.onTap});
  final String title, course;
  final DateTime deadline;
  final int? submitted, total;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final now = DateTime.now();
    final isUrgent = deadline.isBefore(now.add(const Duration(days: 2)));
    final ratio = total != null && total! > 0 ? (submitted ?? 0) / total! : null;

    return Card(
      child: ListTile(
        leading: Icon(isUrgent ? Icons.warning_amber_rounded : Icons.assignment, color: isUrgent ? Colors.red : theme.colorScheme.primary),
        title: Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
        subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(course, style: AppTheme.caption(theme.textTheme)),
          if (ratio != null) ...[const SizedBox(height: 4),
            ClipRRect(borderRadius: BorderRadius.circular(2), child: LinearProgressIndicator(value: ratio, minHeight: 4, backgroundColor: Colors.grey.shade200))],
        ]),
        trailing: Text(isUrgent ? "⏰ 截止" : "\${deadline.month}/\${deadline.day}", style: TextStyle(fontSize: 11, color: isUrgent ? Colors.red : Colors.grey)),
        onTap: onTap,
      ),
    );
  }
}

/// 成绩徽章
class GradeBadge extends StatelessWidget {
  const GradeBadge({super.key, required this.grade});
  final String grade;

  Color get _color {
    final g = double.tryParse(grade) ?? 0;
    if (g >= 90) return Colors.green;
    if (g >= 75) return Colors.blue;
    if (g >= 60) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
    decoration: BoxDecoration(color: _color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20), border: Border.all(color: _color.withValues(alpha: 0.3))),
    child: Text(grade, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: _color)),
  );
}
`;
}

// ═══════════════════════════════════════════════════════════
// 工具函数 — 根据 Spec metadata 判断行业并注入对应 Widget 文件
// ═══════════════════════════════════════════════════════════

export type IndustryCategory = "finance" | "crm" | "fitness" | "ecommerce" | "education" | "social" | "food" | "hotel" | "recruitment" | "property" | "video" | "weather" | "sports" | "photo" | "dating" | "medical" | "blog" | "game" | "payment" | "generic";

/** 从 Spec 判断行业类型（覆盖 19 种；优先 appName/displayName，避免 screen id 误判） */
export function detectIndustry(spec: Record<string, unknown>): IndustryCategory {
  const metadata = (spec.metadata ?? {}) as Record<string, unknown>;
  const cat = (metadata?.category as string ?? "").toLowerCase();
  const name = ((spec.displayName as string) ?? "").toLowerCase();
  const appName = ((spec.appName as string) ?? "").toLowerCase();
  const coreBlob = [cat, name, appName].join(" ").toLowerCase();

  const match = (blob: string): IndustryCategory | null => {
    if (/记账|财务|账单|理财|budget|finance|expense|transaction|记一笔/.test(blob)) return "finance";
    if (/crm|客户|customer|client|lead|商机|销售|sales|pipeline/.test(blob)) return "crm";
    if (/健身|运动|训练|workout|fitness|exercise|gym|跑步|瑜伽/.test(blob)) return "fitness";
    if (/外卖|点餐|餐厅|饭店|美食|food_delivery|food|delivery|restaurant/.test(blob)) return "food";
    if (/电商|购物|商城|shop|store|ecommerce|商品|product/.test(blob)) return "ecommerce";
    if (/课表|课程|course|学校|作业|exam|成绩|学习|class|timetable|student/.test(blob)) return "education";
    if (/博客|文章|阅读|blog|article|写作|专栏/.test(blob)) return "blog";
    if (/照片|摄影|拍照|图库|photo_share|photo|gallery|camera/.test(blob)) return "photo";
    if (/交友|相亲|匹配|dating|tinder/.test(blob)) return "dating";
    if (/医疗|问诊|医院|医生|看病|medical|doctor|patient|处方/.test(blob)) return "medical";
    if (/酒店|住宿|宾馆|民宿|hotel|booking|客房/.test(blob)) return "hotel";
    if (/招聘|求职|找工作|职位|job|recruit|hr|简历/.test(blob)) return "recruitment";
    if (/物业|小区|报修|缴费|门禁|property|repair/.test(blob)) return "property";
    if (/视频|影音|播放|电影|video|movie|film|netflix/.test(blob)) return "video";
    if (/天气|气象|预报|weather|forecast|temperature/.test(blob)) return "weather";
    if (/体育|比赛|球队|赛程|sport|league|足球|篮球/.test(blob)) return "sports";
    if (/游戏|game|flame|玩法|关卡|得分|对战|休闲|射击/.test(blob)) return "game";
    if (/支付|付款|收银|stripe|pay|checkout|结算|充值/.test(blob)) return "payment";
    if (/社交|社区|朋友圈|动态|social|feed|post|话题|小红书/.test(blob)) return "social";
    return null;
  };

  const fromCore = match(coreBlob);
  if (fromCore) return fromCore;

  const screenBlob = ((spec.screens as Array<{ id: string }>) ?? [])
    .map((s) => s.id)
    .join(" ")
    .toLowerCase();
  return match(`${coreBlob} ${screenBlob}`) ?? "generic";
}

/** 获取行业对应的 Widget 文件内容 */
export function getIndustryWidgetsDart(category: IndustryCategory): string | null {
  switch (category) {
    case "finance": return emitFinanceWidgetsDart();
    case "crm": return emitCrmWidgetsDart();
    case "fitness": return emitFitnessWidgetsDart();
    case "ecommerce": return emitEcommerceWidgetsDart();
    case "education": return emitEducationWidgetsDart();
    default: return null;
  }
}
