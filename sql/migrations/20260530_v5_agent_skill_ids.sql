-- v5-4：为 Agent 绑定 published skill codes（供工作流 prompt 注入）
update agents
set skill_ids = '["prd_outline"]'::jsonb
where code = 'product_manager';

update agents
set skill_ids = '["tech_stack_recommend"]'::jsonb
where code = 'architect';

update agents
set skill_ids = '["qa_checklist"]'::jsonb
where code = 'qa_lead';

notify pgrst, 'reload schema';
