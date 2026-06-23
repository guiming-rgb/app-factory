# Supabase 后端配置

本目录包含 App 生产工厂自动生成的数据库迁移脚本。

## 使用方法

1. 登录 [Supabase](https://supabase.com) 控制台
2. 进入项目 → SQL Editor
3. 粘贴 `migrations/001_create_tables.sql` 内容并执行
4. 或在本地使用 Supabase CLI: `supabase db push`

## 表结构

- **transactions**

## 注意

- 生成代码中引用的 Supabase URL 和 Anon Key 需要在各平台的环境变量中配置
- RLS 策略默认配置为用户级隔离，可根据需求修改
