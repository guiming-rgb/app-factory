insert into agents (code, name, role, description, order_index)
values
('ceo', 'CEO 总策划', 'CEO', '判断项目是否值得做，定义项目战略方向', 1),
('product_manager', '产品经理', 'Product Manager', '输出用户画像、PRD、核心功能和 MVP 范围', 2),
('project_manager', '项目经理', 'Project Manager', '拆解开发阶段、任务优先级和里程碑', 3),
('architect', '系统架构师', 'Software Architect', '设计技术栈、系统架构、数据库结构和 API 方案', 4),
('security_compliance', '安全与合规顾问', 'Security & Compliance Advisor', '分析安全风险、隐私合规和法规要求，输出合规检查清单', 5),
('ui_designer', 'UI/UX 设计师', 'UI/UX Designer', '设计页面结构、用户路径和视觉风格', 6),
('dev_lead', '开发负责人', 'Development Lead', '规划前后端模块、工程结构和开发顺序', 7),
('qa_lead', '测试负责人', 'QA Lead', '制定测试方案、验收标准和风险清单', 8),
('business_advisor', '商业顾问', 'Business Advisor', '分析商业模式、定价策略、获客渠道和增长路径', 9)
on conflict (code) do nothing;

-- 更新现有行的 order_index（适配新增的安全与合规顾问）
update agents set order_index = 6 where code = 'ui_designer' and order_index = 5;
update agents set order_index = 7 where code = 'dev_lead' and order_index = 6;
update agents set order_index = 8 where code = 'qa_lead' and order_index = 7;
update agents set order_index = 9 where code = 'business_advisor' and order_index = 8;
