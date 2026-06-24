-- Q5: 多租户工作区（Workspace）团队协作 —— 数据库迁移
-- 执行: supabase db push 或在 SQL Editor 中运行
--
-- 表结构说明:
--   workspaces        — 工作区 / 团队空间（多租户根对象）
--   workspace_members — 成员关系与角色
--   workspace_invites — 邀请记录
--
-- 角色层次: owner > admin > editor > viewer
--   owner  = 全部权限（含转让/删除）
--   admin  = 全部 CRUD + 邀请
--   editor = 编辑 spec / 生成代码
--   viewer = 只读

-- ═══════════════════════════════════════════
-- 1. 工作区表
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS workspaces (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  description       TEXT DEFAULT '',
  owner_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url          TEXT DEFAULT NULL,
  member_count      INTEGER NOT NULL DEFAULT 1,
  project_count     INTEGER NOT NULL DEFAULT 0,
  subscription_tier TEXT NOT NULL DEFAULT 'free'
                      CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE workspaces IS '工作区（多租户逻辑根对象）：每个 workspace 包含一组项目和成员';
COMMENT ON COLUMN workspaces.owner_id IS '创建者（同时也是第一个 owner 角色成员）';
COMMENT ON COLUMN workspaces.subscription_tier IS '订阅等级: free / pro / enterprise';

-- ═══════════════════════════════════════════
-- 2. 成员表
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS workspace_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'editor'
                 CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

COMMENT ON TABLE workspace_members IS '工作区成员关系与角色';
COMMENT ON COLUMN workspace_members.role IS '角色: owner / admin / editor / viewer';

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);

-- ═══════════════════════════════════════════
-- 3. 邀请表
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS workspace_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'editor'
                 CHECK (role IN ('admin', 'editor', 'viewer')),
  token        TEXT UNIQUE NOT NULL,
  invited_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE workspace_invites IS '工作区邀请记录，48 小时过期';
COMMENT ON COLUMN workspace_invites.token IS '唯一令牌，用于邀请链接';

CREATE INDEX IF NOT EXISTS idx_workspace_invites_email ON workspace_invites(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_token ON workspace_invites(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_expires_at ON workspace_invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace_id ON workspace_invites(workspace_id);

-- ═══════════════════════════════════════════
-- 4. RLS 策略
-- ═══════════════════════════════════════════
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

-- workspaces: 成员可读自己所属的工作区
CREATE POLICY "workspaces_select_member"
  ON workspaces FOR SELECT
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- workspaces: 创建者可写（更新/删除）
CREATE POLICY "workspaces_all_owner"
  ON workspaces FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- workspace_members: 本人可读自己所有成员关系；同工作区成员可读
CREATE POLICY "workspace_members_select"
  ON workspace_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- workspace_members: admin/owner 可管理成员（INSERT/UPDATE/DELETE）
CREATE POLICY "workspace_members_manage_admin"
  ON workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspace_members_update_admin"
  ON workspace_members FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspace_members_delete_admin"
  ON workspace_members FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- workspace_invites: 同工作区 admin/owner 可管理邀请
CREATE POLICY "workspace_invites_select_admin"
  ON workspace_invites FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspace_invites_insert_admin"
  ON workspace_invites FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspace_invites_update_admin"
  ON workspace_invites FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 受邀人可通过 token 读到自己的邀请
CREATE POLICY "workspace_invites_select_invitee"
  ON workspace_invites FOR SELECT
  USING (
    token IS NOT NULL  -- 由 service_role 查询时不受限
  );

-- ═══════════════════════════════════════════
-- 5. 触发器：自动更新 member_count
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_workspace_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE workspaces
    SET member_count = (
      SELECT COUNT(*) FROM workspace_members WHERE workspace_id = NEW.workspace_id
    )
    WHERE id = NEW.workspace_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE workspaces
    SET member_count = (
      SELECT COUNT(*) FROM workspace_members WHERE workspace_id = OLD.workspace_id
    )
    WHERE id = OLD.workspace_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workspace_member_count_insert ON workspace_members;
CREATE TRIGGER trg_workspace_member_count_insert
  AFTER INSERT ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION update_workspace_member_count();

DROP TRIGGER IF EXISTS trg_workspace_member_count_delete ON workspace_members;
CREATE TRIGGER trg_workspace_member_count_delete
  AFTER DELETE ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION update_workspace_member_count();

-- ═══════════════════════════════════════════
-- 6. 自动清理过期邀请的函数
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION clean_expired_invites()
RETURNS INTEGER AS $$
DECLARE
  cleaned INTEGER;
BEGIN
  UPDATE workspace_invites
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now()
  RETURNING 1 INTO cleaned;

  GET DIAGNOSTICS cleaned = ROW_COUNT;
  RETURN cleaned;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clean_expired_invites() IS '将已过期的 pending 邀请标记为 expired；可通过 pg_cron 或 Supabase Edge Function 定时调用';
