-- v5-3：示例 published 技能 + 1 条 draft（API 不返回 draft）
insert into skills (
  code,
  name,
  description,
  category,
  version,
  status,
  input_schema,
  workflow_schema,
  tools_required,
  quality_checks
)
values
(
  'prd_outline',
  'PRD 大纲生成',
  '根据项目 idea 输出结构化 PRD 大纲',
  'product',
  '1.0.0',
  'published',
  '{"type":"object","properties":{"idea":{"type":"string"}}}'::jsonb,
  '{"steps":["analyze_idea","outline_sections"]}'::jsonb,
  '[]'::jsonb,
  '[{"id":"has_mvp_scope","label":"含 MVP 范围"}]'::jsonb
),
(
  'tech_stack_recommend',
  '技术栈推荐',
  '为 MVP 推荐前后端技术栈与架构要点',
  'architecture',
  '1.0.0',
  'published',
  '{}'::jsonb,
  '{}'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb
),
(
  'qa_checklist',
  '验收清单',
  '生成 MVP 验收与测试检查项',
  'qa',
  '1.0.0',
  'published',
  '{}'::jsonb,
  '{}'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb
),
(
  'internal_draft_skill',
  '内部草稿技能',
  '仅用于验证 API 不返回 draft',
  'internal',
  '0.1.0',
  'draft',
  '{}'::jsonb,
  '{}'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb
)
on conflict (code) do nothing;

notify pgrst, 'reload schema';
