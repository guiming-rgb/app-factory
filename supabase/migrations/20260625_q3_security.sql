-- Q3: 安全审计日志 + 隐私合规 数据库迁移
-- 执行: supabase db push 或在 SQL Editor 中运行
--
-- 表结构说明:
--   security_audit_log  — 记录来自生成应用的安全事件
--     - app_id:    生成应用的标识符（关联 projects 表）
--     - event_type: 事件类型（白名单在 API 层校验）
--     - severity:   严重等级（low/medium/high/critical）
--     - details:    详细信息的 JSON 负载
--     - ip:         来源 IP 地址
--     - created_at: 自动时间戳

-- ═══════════════════════════════════════════
-- 1. 安全审计日志表
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS security_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id      TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  severity    TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details     JSONB DEFAULT NULL,
  ip          TEXT DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE security_audit_log IS '安全审计日志: 记录生成应用的关键安全事件';
COMMENT ON COLUMN security_audit_log.app_id IS '生成应用 ID (projects 表外键)';
COMMENT ON COLUMN security_audit_log.event_type IS '事件类型: login, login_failed, data_access, privacy_consent 等';
COMMENT ON COLUMN security_audit_log.severity IS '严重等级: low / medium / high / critical';
COMMENT ON COLUMN security_audit_log.details IS 'JSON 格式的额外上下文信息';
COMMENT ON COLUMN security_audit_log.ip IS '来源客户端 IP 地址';

-- ═══════════════════════════════════════════
-- 2. 索引
-- ═══════════════════════════════════════════
-- 按应用查询所有事件
CREATE INDEX IF NOT EXISTS idx_audit_log_app_id ON security_audit_log(app_id);

-- 按事件类型筛选
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON security_audit_log(event_type);

-- 按严重等级筛选
CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON security_audit_log(severity);

-- 按时间范围查询
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON security_audit_log(created_at DESC);

-- 复合索引: 按应用 + 严重等级（常见查询模式）
CREATE INDEX IF NOT EXISTS idx_audit_log_app_severity ON security_audit_log(app_id, severity);

-- 复合索引: 按应用 + 事件类型（常见查询模式）
CREATE INDEX IF NOT EXISTS idx_audit_log_app_event ON security_audit_log(app_id, event_type);

-- ═══════════════════════════════════════════
-- 3. RLS 策略
-- ═══════════════════════════════════════════
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Service role 完全访问（用于 /api/security/audit-log 端点和管理员后台）
CREATE POLICY "service_role_full_access" ON security_audit_log
  FOR ALL USING (true) WITH CHECK (true);

-- 普通用户可查看自己应用的事件（通过 app_id 关联 projects 表）
-- 仅供管理后台使用，API 端点通过 service_role 写入
CREATE POLICY "users_view_own_app_events" ON security_audit_log
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND app_id IN (
      SELECT id::text FROM projects WHERE user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════
-- 4. 定期清理函数
-- ═══════════════════════════════════════════
-- 清理 90 天前的 low 级别事件（保留 medium+ 至少 1 年）
CREATE OR REPLACE FUNCTION clean_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- 清理 90 天前的 low 级别事件
  DELETE FROM security_audit_log
  WHERE severity = 'low'
    AND created_at < now() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- 清理 365 天前的 medium+ 级别事件
  DELETE FROM security_audit_log
  WHERE severity IN ('medium', 'high', 'critical')
    AND created_at < now() - INTERVAL '365 days';

  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION clean_old_audit_logs IS '清理过期审计日志: low 保留 90 天, medium+ 保留 365 天';
