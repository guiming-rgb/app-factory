insert into agents (code, name, role, description, order_index)
values
('ceo', 'CEO 总策划', 'CEO', '判断项目是否值得做，定义项目战略方向', 1),
('product_manager', '产品经理', 'Product Manager', '输出用户画像、PRD、核心功能和 MVP 范围', 2),
('project_manager', '项目经理', 'Project Manager', '拆解开发阶段、任务优先级和里程碑', 3),
('architect', '系统架构师', 'Software Architect', '设计技术栈、系统架构、数据库结构和 API 方案', 4),
('ui_designer', 'UI/UX 设计师', 'UI/UX Designer', '设计页面结构、用户路径和视觉风格', 5),
('dev_lead', '开发负责人', 'Development Lead', '规划前后端模块、工程结构和开发顺序', 6),
('qa_lead', '测试负责人', 'QA Lead', '制定测试方案、验收标准和风险清单', 7),
('business_advisor', '商业顾问', 'Business Advisor', '分析商业模式、定价策略、获客渠道和增长路径', 8)
on conflict (code) do nothing;
