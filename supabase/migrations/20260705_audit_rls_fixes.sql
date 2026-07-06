-- 审计修复 S-13 ~ S-15：收紧 RLS 策略
-- 日期: 2026-07-05

-- S-13: security_audit_log service_role 策略限定角色
DROP POLICY IF EXISTS "service_role_full_access" ON security_audit_log;
CREATE POLICY "service_role_full_access" ON security_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- S-14: 修正 projects 列名 user_id → owner_id
DROP POLICY IF EXISTS "users_view_own_app_events" ON security_audit_log;
CREATE POLICY "users_view_own_app_events" ON security_audit_log
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND app_id IN (
      SELECT id::text FROM projects WHERE owner_id = auth.uid()
    )
  );

-- S-15: experiments 写策略限定 service_role
DROP POLICY IF EXISTS "experiments_admin_write" ON experiments;
DROP POLICY IF EXISTS "experiments_admin_update" ON experiments;

CREATE POLICY "experiments_service_write" ON experiments
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "experiments_service_update" ON experiments
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "experiments_service_delete" ON experiments
  FOR DELETE
  TO service_role
  USING (true);
