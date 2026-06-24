-- Q2-M3: 推送通知 + 离线同步 数据库迁移
-- 执行: supabase db push 或在 SQL Editor 中运行

-- ═══════════════════════════════════════════
-- 1. 推送令牌表
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web', 'wechat', 'harmony')),
  token       TEXT NOT NULL,
  device_name TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, token)
);

-- 推送订阅话题
CREATE TABLE IF NOT EXISTS push_topics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic       TEXT NOT NULL,
  platform    TEXT NOT NULL,
  subscribed  BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic, platform)
);

-- ═══════════════════════════════════════════
-- 2. 离线同步队列表
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sync_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name  TEXT NOT NULL,
  operation   TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id   UUID,
  payload     JSONB,
  synced      BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 离线同步冲突解决日志
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  table_name  TEXT NOT NULL,
  local_data  JSONB,
  server_data JSONB,
  resolution  TEXT CHECK (resolution IN ('local_wins', 'server_wins', 'merged', 'manual')),
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- 3. 索引
-- ═══════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_user_tokens_user ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_platform ON user_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_push_topics_user ON push_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_user ON sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_unsynced ON sync_queue(user_id, synced) WHERE synced = false;

-- ═══════════════════════════════════════════
-- 4. RLS 策略
-- ═══════════════════════════════════════════
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的数据
CREATE POLICY "users_own_tokens" ON user_tokens
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_topics" ON push_topics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_sync_queue" ON sync_queue
  FOR ALL USING (auth.uid() = user_id);

-- Service role 可越权（用于服务端推送和同步）
CREATE POLICY "service_role_all_tokens" ON user_tokens
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_sync" ON sync_queue
  FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════
-- 5. 函数：清理 7 天前已同步记录
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION clean_synced_queue()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sync_queue
  WHERE synced = true AND created_at < now() - INTERVAL '7 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
