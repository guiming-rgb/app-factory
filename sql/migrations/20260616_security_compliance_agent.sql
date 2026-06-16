-- 新增安全与合规顾问 Agent，更新现有 Agent 排序
-- 新顺序：CEO(1)→PM(2)→PMgr(3)→架构师(4)→安全与合规(5)→设计师(6)→开发(7)→测试(8)→商业(9)

insert into agents (code, name, role, description, order_index)
values ('security_compliance', '安全与合规顾问', 'Security & Compliance Advisor', '分析安全风险、隐私合规和法规要求，输出合规检查清单', 5)
on conflict (code) do nothing;

-- 将原 order_index 5-8 的 Agent 顺延
update agents set order_index = 6 where code = 'ui_designer' and order_index = 5;
update agents set order_index = 7 where code = 'dev_lead' and order_index = 6;
update agents set order_index = 8 where code = 'qa_lead' and order_index = 7;
update agents set order_index = 9 where code = 'business_advisor' and order_index = 8;
