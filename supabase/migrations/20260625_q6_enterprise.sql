-- Q6: Enterprise 功能集 —— SSO / White-Label / Partner 联盟 / SLA
-- 执行: supabase db push 或在 SQL Editor 中运行
--
-- 功能域:
--   sso_configs        — SAML / OIDC 单点登录配置
--   white_label_configs — 白标品牌配置
--   partners           — 联盟合作伙伴
--   referrals          — 推荐记录
--   sla_incidents      — SLA 事件
--   sla_configs        — SLA 等级配置

-- ═══════════════════════════════════════════
-- 1. SSO 配置
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sso_configs (
  workspace_id            UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  provider                TEXT NOT NULL CHECK (provider IN ('saml', 'oidc')),
  metadata_url            TEXT NOT NULL,
  client_id               TEXT,
  client_secret_encrypted TEXT,
  domain                  TEXT UNIQUE NOT NULL,
  enabled                 BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE sso_configs IS '企业 SSO 配置：每个工作区支持 SAML 或 OIDC 协议';
COMMENT ON COLUMN sso_configs.client_secret_encrypted IS '使用应用级加密密钥加密后的 client secret';
COMMENT ON COLUMN sso_configs.domain IS '企业域名（如 example.com），用于路由 SSO 登录请求';

CREATE INDEX IF NOT EXISTS idx_sso_configs_domain ON sso_configs(domain);
CREATE INDEX IF NOT EXISTS idx_sso_configs_workspace_id ON sso_configs(workspace_id);

-- ═══════════════════════════════════════════
-- 2. 白标品牌配置
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS white_label_configs (
  workspace_id    UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_name      TEXT,
  logo_url        TEXT,
  favicon_url     TEXT,
  primary_color   TEXT DEFAULT '#0D9488',
  secondary_color TEXT,
  custom_domain   TEXT UNIQUE,
  custom_css      TEXT,
  email_from      TEXT,
  email_footer    TEXT,
  hide_powered_by BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE white_label_configs IS '白标品牌配置：品牌色、Logo、自定义域名、CSS 覆盖';

CREATE INDEX IF NOT EXISTS idx_white_label_custom_domain ON white_label_configs(custom_domain);

-- ═══════════════════════════════════════════
-- 3. 合作伙伴
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS partners (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('agency', 'freelancer', 'platform')),
  email            TEXT UNIQUE NOT NULL,
  website          TEXT,
  commission_rate  NUMERIC(3,1) NOT NULL DEFAULT 10.0 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  referral_code    TEXT UNIQUE,
  total_referrals  INTEGER NOT NULL DEFAULT 0,
  total_commission NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE partners IS '联盟合作伙伴：代理 / 自由职业者 / 平台';
COMMENT ON COLUMN partners.referral_code IS '唯一推荐码，用于生成推荐链接';

CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_referral_code ON partners(referral_code);
CREATE INDEX IF NOT EXISTS idx_partners_email ON partners(email);

-- ═══════════════════════════════════════════
-- 4. 推荐记录
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  referral_code   TEXT NOT NULL,
  referred_user_id UUID,
  converted       BOOLEAN NOT NULL DEFAULT false,
  converted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE referrals IS '推荐记录：追踪每个推荐链接带来的注册与转化';

CREATE INDEX IF NOT EXISTS idx_referrals_partner_id ON referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_converted ON referrals(converted);

-- ═══════════════════════════════════════════
-- 5. SLA 事件
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sla_incidents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('outage', 'degraded', 'maintenance')),
  description      TEXT,
  started_at       TIMESTAMPTZ NOT NULL,
  resolved_at      TIMESTAMPTZ,
  duration_minutes INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE sla_incidents IS 'SLA 事件记录：宕机 / 降级 / 维护';

CREATE INDEX IF NOT EXISTS idx_sla_incidents_workspace_id ON sla_incidents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sla_incidents_started_at ON sla_incidents(started_at);
CREATE INDEX IF NOT EXISTS idx_sla_incidents_type ON sla_incidents(type);

-- ═══════════════════════════════════════════
-- 6. SLA 等级配置
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sla_configs (
  workspace_id      UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  uptime_target     NUMERIC(4,1) NOT NULL DEFAULT 99.9 CHECK (uptime_target > 0 AND uptime_target <= 100),
  response_time_ms  INTEGER NOT NULL DEFAULT 3600000 CHECK (response_time_ms > 0),
  support_level     TEXT NOT NULL DEFAULT 'standard' CHECK (support_level IN ('standard', 'priority', 'dedicated')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE sla_configs IS 'SLA 等级配置：各工作区的可用性 / 响应时间 / 支持级别';

-- ═══════════════════════════════════════════
-- 7. SSO 用户映射表
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sso_users (
  user_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL UNIQUE,
  display_name TEXT,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  last_login   TIMESTAMPTZ DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE sso_users IS 'SSO 用户映射：每个邮箱对应一个本地用户 ID（独立于 Supabase Auth）';

CREATE INDEX IF NOT EXISTS idx_sso_users_email ON sso_users(email);
CREATE INDEX IF NOT EXISTS idx_sso_users_workspace_id ON sso_users(workspace_id);

-- ═══════════════════════════════════════════
-- 8. 合作伙伴支出记录
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS partner_payouts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency    TEXT NOT NULL DEFAULT 'USD',
  status      TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE partner_payouts IS '合作伙伴佣金支出记录';

CREATE INDEX IF NOT EXISTS idx_partner_payouts_partner_id ON partner_payouts(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_status ON partner_payouts(status);

-- ═══════════════════════════════════════════
-- 9. RLS 策略
-- ═══════════════════════════════════════════
ALTER TABLE sso_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE white_label_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_configs ENABLE ROW LEVEL SECURITY;

-- SSO: 工作区 admin/owner 可读写；普通成员只读
CREATE POLICY "sso_configs_select_member"
  ON sso_configs FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "sso_configs_manage_admin"
  ON sso_configs FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "sso_configs_update_admin"
  ON sso_configs FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "sso_configs_delete_admin"
  ON sso_configs FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- White-Label: 工作区 admin/owner 可管理；普通成员只读
CREATE POLICY "white_label_configs_select_member"
  ON white_label_configs FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "white_label_configs_insert_admin"
  ON white_label_configs FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "white_label_configs_update_admin"
  ON white_label_configs FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "white_label_configs_delete_admin"
  ON white_label_configs FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Partners: 管理员读写所有；普通成员只读
CREATE POLICY "partners_select_all"
  ON partners FOR SELECT
  USING (true);

CREATE POLICY "partners_insert_admin"
  ON partners FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "partners_update_admin"
  ON partners FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "partners_delete_admin"
  ON partners FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Referrals: 关联 partner 的管理员可读写
CREATE POLICY "referrals_select_admin"
  ON referrals FOR SELECT
  USING (
    partner_id IN (
      SELECT id FROM partners
      WHERE EXISTS (
        SELECT 1 FROM workspace_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "referrals_insert_admin"
  ON referrals FOR INSERT
  WITH CHECK (
    partner_id IN (
      SELECT id FROM partners
      WHERE EXISTS (
        SELECT 1 FROM workspace_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "referrals_update_admin"
  ON referrals FOR UPDATE
  USING (
    partner_id IN (
      SELECT id FROM partners
      WHERE EXISTS (
        SELECT 1 FROM workspace_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- SLA Incidents: 工作区成员只读；admin/owner 可管理
CREATE POLICY "sla_incidents_select_member"
  ON sla_incidents FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "sla_incidents_insert_admin"
  ON sla_incidents FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "sla_incidents_update_admin"
  ON sla_incidents FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "sla_incidents_delete_admin"
  ON sla_incidents FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- SSO Users: 服务端驱动（service_role 拥有完全权限，RLS 仅作安全网）
CREATE POLICY "sso_users_select_member"
  ON sso_users FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "sso_users_insert_admin"
  ON sso_users FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "sso_users_update_admin"
  ON sso_users FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Partner Payouts: 管理员管理
CREATE POLICY "partner_payouts_select_admin"
  ON partner_payouts FOR SELECT
  USING (
    partner_id IN (
      SELECT id FROM partners
      WHERE EXISTS (
        SELECT 1 FROM workspace_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "partner_payouts_insert_admin"
  ON partner_payouts FOR INSERT
  WITH CHECK (
    partner_id IN (
      SELECT id FROM partners
      WHERE EXISTS (
        SELECT 1 FROM workspace_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "partner_payouts_update_admin"
  ON partner_payouts FOR UPDATE
  USING (
    partner_id IN (
      SELECT id FROM partners
      WHERE EXISTS (
        SELECT 1 FROM workspace_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- SLA Configs: 工作区成员只读；admin/owner 可管理
CREATE POLICY "sla_configs_select_member"
  ON sla_configs FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "sla_configs_insert_admin"
  ON sla_configs FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "sla_configs_update_admin"
  ON sla_configs FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "sla_configs_delete_admin"
  ON sla_configs FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ═══════════════════════════════════════════
-- 10. 种子数据：为已有 enterprise 工作区创建默认 SLA 配置
-- ═══════════════════════════════════════════
INSERT INTO sla_configs (workspace_id, uptime_target, response_time_ms, support_level)
SELECT
  id,
  99.9,
  3600000,
  CASE
    WHEN subscription_tier = 'enterprise' THEN 'priority'
    ELSE 'standard'
  END
FROM workspaces
WHERE id NOT IN (SELECT workspace_id FROM sla_configs)
ON CONFLICT (workspace_id) DO NOTHING;

-- ═══════════════════════════════════════════
-- 11. 触发器：同步 updated_at
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_enterprise_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- sso_configs
DROP TRIGGER IF EXISTS trg_sso_configs_updated_at ON sso_configs;
CREATE TRIGGER trg_sso_configs_updated_at
  BEFORE UPDATE ON sso_configs
  FOR EACH ROW EXECUTE FUNCTION update_enterprise_updated_at();

-- white_label_configs
DROP TRIGGER IF EXISTS trg_white_label_configs_updated_at ON white_label_configs;
CREATE TRIGGER trg_white_label_configs_updated_at
  BEFORE UPDATE ON white_label_configs
  FOR EACH ROW EXECUTE FUNCTION update_enterprise_updated_at();

-- partners
DROP TRIGGER IF EXISTS trg_partners_updated_at ON partners;
CREATE TRIGGER trg_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION update_enterprise_updated_at();

-- sla_configs
DROP TRIGGER IF EXISTS trg_sla_configs_updated_at ON sla_configs;
CREATE TRIGGER trg_sla_configs_updated_at
  BEFORE UPDATE ON sla_configs
  FOR EACH ROW EXECUTE FUNCTION update_enterprise_updated_at();

-- sso_users
DROP TRIGGER IF EXISTS trg_sso_users_updated_at ON sso_users;
CREATE TRIGGER trg_sso_users_updated_at
  BEFORE UPDATE ON sso_users
  FOR EACH ROW EXECUTE FUNCTION update_enterprise_updated_at();
