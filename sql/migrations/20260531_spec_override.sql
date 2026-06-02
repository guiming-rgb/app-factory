-- 令用户可编辑 Spec 覆盖 LLM 提取结果
-- P0: Spec 编辑交互
alter table projects add column if not exists spec_override jsonb;
comment on column projects.spec_override is '用户编辑的 App Spec（优先级高于 LLM 提取）';
