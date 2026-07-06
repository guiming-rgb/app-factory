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

export {
  emitFlutterDashboardPage,
  emitFlutterCardGridPage,
  emitFlutterCalendarPage,
  emitFlutterChartPage,
  emitFlutterKanbanPage,
  emitFlutterOnboardingPage,
} from "./emit-extended/index";
