-- P2: 技能代码生成插件化
-- 让技能可以携带代码片段模板，在代码生成时按平台注入
alter table skills add column if not exists codegen_snippets jsonb default '[]'::jsonb;
comment on column skills.codegen_snippets is '代码生成片段：[{ platform, target, template, placement }]';
