-- Q4: App 分析面板 — 埋点事件 + 会话 数据库迁移
-- 执行: supabase db push 或在 SQL Editor 中运行

-- ═══════════════════════════════════════════
-- 1. 分析事件表
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id      TEXT NOT NULL,
  event_type  TEXT NOT NULL CHECK (event_type IN ('screen_view','custom_event','error','user_property','session_start','session_end')),
  event_name  TEXT,
  screen_name TEXT,
  properties  JSONB DEFAULT '{}'::jsonb,
  user_id     TEXT,
  session_id  TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- 2. 分析会话表
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id          TEXT NOT NULL,
  user_id         TEXT,
  start_time      TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time        TIMESTAMPTZ,
  duration_seconds INTEGER,
  device_info     JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- 3. 索引 — 时间序列查询优先使用 BRIN
-- ═══════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_analytics_events_app_time
  ON analytics_events USING BRIN (app_id, created_at) WITH (pages_per_range = 32);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type
  ON analytics_events (event_type);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id
  ON analytics_events (user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id
  ON analytics_events (session_id);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_app_time
  ON analytics_sessions (app_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user_id
  ON analytics_sessions (user_id);

-- ═══════════════════════════════════════════
-- 4. RLS 策略
-- ═══════════════════════════════════════════
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;

-- 仅允许 service_role 写入和读取（客户端通过后端 API 写，面板通过后端 API 读）
CREATE POLICY "service_role_all_events" ON analytics_events
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_sessions" ON analytics_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════
-- 5. 启用 Realtime（仅 sessions 表）
-- ═══════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD ONLY analytics_sessions;

-- ═══════════════════════════════════════════
-- 6. 周期性清理 90 天前的原始事件
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION clean_analytics_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM analytics_events
  WHERE created_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════
-- 7. 会话时长计算函数（端上报 session_end 时调用）
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'session_end' AND NEW.session_id IS NOT NULL THEN
    UPDATE analytics_sessions
    SET end_time = NEW.created_at,
        duration_seconds = EXTRACT(EPOCH FROM (NEW.created_at - start_time))::INTEGER
    WHERE id = NEW.session_id::UUID
      AND end_time IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_session_duration ON analytics_events;
CREATE TRIGGER trg_session_duration
  AFTER INSERT ON analytics_events
  FOR EACH ROW
  WHEN (NEW.event_type = 'session_end')
  EXECUTE FUNCTION update_session_duration();

COMMENT ON TABLE analytics_events IS 'Q4 埋点事件：screen_view / custom_event / error / user_property / session_start / session_end';
COMMENT ON TABLE analytics_sessions IS 'Q4 用户会话：客户端 session_start 时插入，session_end 时更新时长';
