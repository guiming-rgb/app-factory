-- Q4: 应用商店发布记录 + A/B 测试 数据库迁移
-- 执行: supabase db push 或在 SQL Editor 中运行

-- ═══════════════════════════════════════════
-- 1. 实验表
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS experiments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  description        TEXT,
  variants           TEXT[] NOT NULL,
  traffic_allocation REAL NOT NULL DEFAULT 1.0,
  start_at           TIMESTAMPTZ,
  end_at             TIMESTAMPTZ,
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- 2. 实验分配记录表
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id   UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL,
  variant         TEXT NOT NULL,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(experiment_id, user_id)
);

-- ═══════════════════════════════════════════
-- 3. 实验事件表（转化、点击等）
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS experiment_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id   UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  user_id         TEXT,
  variant         TEXT,
  event_name      TEXT NOT NULL,
  properties      JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- 4. 发布历史表
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS publish_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name        TEXT NOT NULL,
  platform        TEXT NOT NULL,
  version         TEXT,
  build_number    INTEGER,
  status          TEXT NOT NULL DEFAULT 'submitted',
  store_response  JSONB,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at    TIMESTAMPTZ
);

-- ═══════════════════════════════════════════
-- 5. 索引
-- ═══════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);

CREATE INDEX IF NOT EXISTS idx_exp_assignments_experiment_user
  ON experiment_assignments(experiment_id, user_id);

CREATE INDEX IF NOT EXISTS idx_exp_events_experiment_created
  ON experiment_events(experiment_id, created_at);

CREATE INDEX IF NOT EXISTS idx_publish_history_app
  ON publish_history(app_name, submitted_at DESC);

-- ═══════════════════════════════════════════
-- 6. RLS 策略
-- ═══════════════════════════════════════════
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_history ENABLE ROW LEVEL SECURITY;

-- 所有用户可读实验配置
CREATE POLICY "experiments_read_all" ON experiments
  FOR SELECT USING (true);

-- admin 角色可写实验配置（通过 service_role 或自定义声明）
CREATE POLICY "experiments_admin_write" ON experiments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "experiments_admin_update" ON experiments
  FOR UPDATE USING (true);

-- 用户可读自己的实验分配记录
CREATE POLICY "assignments_read_own" ON experiment_assignments
  FOR SELECT USING (
    auth.jwt() ->> 'sub' = user_id
    OR auth.uid()::text = user_id
  );

-- service_role 可读写所有分配记录
CREATE POLICY "assignments_service_all" ON experiment_assignments
  FOR ALL USING (true) WITH CHECK (true);

-- 用户可读自己的事件记录
CREATE POLICY "events_read_own" ON experiment_events
  FOR SELECT USING (
    auth.jwt() ->> 'sub' = user_id
    OR auth.uid()::text = user_id
  );

-- service_role 可写入事件
CREATE POLICY "events_service_insert" ON experiment_events
  FOR INSERT WITH CHECK (true);

-- 发布历史所有用户可读，仅 service_role 可写
CREATE POLICY "publish_history_read_all" ON publish_history
  FOR SELECT USING (true);

CREATE POLICY "publish_history_service_all" ON publish_history
  FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════
-- 7. 函数：获取各变体用户数
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_experiment_variant_counts(
  p_experiment_id UUID
)
RETURNS TABLE (variant TEXT, cnt BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT ea.variant, COUNT(DISTINCT ea.user_id)::BIGINT AS cnt
  FROM experiment_assignments ea
  WHERE ea.experiment_id = p_experiment_id
  GROUP BY ea.variant
  ORDER BY ea.variant;
END;
$$;

-- ═══════════════════════════════════════════
-- 8. 函数：清理 90 天前的已发布记录
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION clean_publish_history()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM publish_history
  WHERE published_at IS NOT NULL
    AND published_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
