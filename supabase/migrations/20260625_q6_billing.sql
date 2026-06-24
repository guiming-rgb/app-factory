-- Q6: Workspace Billing & Subscription System
-- 工作空间级别订阅、用量追踪与定价方案
--
-- 架构：
--   workspace_subscriptions — 每个工作空间一条订阅记录
--   usage_records           — 按月按 metric 汇聚的用量事件流水
--   pricing_plans           — 定价方案目录（seed 数据）
--
-- 依赖：
--   workspaces / workspace_members (20260601_workspaces.sql)
--   stripe_events (20260601_rpc_functions.sql)
-- ============================================================

-- ═══════════════════════════════════════════
-- 1. 工作空间订阅表
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS workspace_subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id           UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plan_id                TEXT NOT NULL DEFAULT 'free',
  status                 TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN (
                             'active', 'past_due', 'canceled',
                             'trialing', 'incomplete',
                             'incomplete_expired', 'unpaid'
                           )),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id     TEXT,
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancel_at              TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE workspace_subscriptions IS '工作空间级别的 Stripe 订阅记录。每个工作空间最多一条活动订阅。';
COMMENT ON COLUMN workspace_subscriptions.plan_id IS '订阅方案 ID：free / pro / enterprise';
COMMENT ON COLUMN workspace_subscriptions.status IS '订阅状态，与 Stripe Subscription.status 对齐';
COMMENT ON COLUMN workspace_subscriptions.stripe_subscription_id IS 'Stripe Subscription ID，用于 webhook 回写';
COMMENT ON COLUMN workspace_subscriptions.stripe_customer_id IS 'Stripe Customer ID，用于 portal 与 checkout';

-- 唯一约束：每个工作空间只有一条订阅记录
CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_sub_workspace ON workspace_subscriptions (workspace_id);
CREATE INDEX IF NOT EXISTS idx_ws_sub_status ON workspace_subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_ws_sub_stripe_sub ON workspace_subscriptions (stripe_subscription_id);

-- ═══════════════════════════════════════════
-- 2. 用量记录表
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS usage_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  metric       TEXT NOT NULL CHECK (metric IN ('codegen', 'storage', 'members')),
  amount       INT NOT NULL DEFAULT 1,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE usage_records IS '用量事件流水。按月按 workspace 汇聚计算月度用量。';
COMMENT ON COLUMN usage_records.metric IS '用量指标：codegen=代码生成次数 storage=存储字节 members=成员数快照';
COMMENT ON COLUMN usage_records.amount IS '本次记录的量值（存储的字节数、代码生成次数的增量等）';

CREATE INDEX IF NOT EXISTS idx_ur_workspace_month ON usage_records (workspace_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_ur_metric ON usage_records (metric);

-- ═══════════════════════════════════════════
-- 3. 定价方案表（可外部覆盖，seed 数据见下方）
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pricing_plans (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  tier          TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise')),
  price_monthly INT NOT NULL DEFAULT 0,
  price_yearly  INT NOT NULL DEFAULT 0,
  features      JSONB NOT NULL DEFAULT '[]',
  limits        JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE pricing_plans IS '定价方案目录。seed 数据在下方插入，后续可通过 admin API 调整。';
COMMENT ON COLUMN pricing_plans.price_monthly IS '月付价格，单位：分（CNY）。Free=0, Pro=9900, Enterprise=49900';
COMMENT ON COLUMN pricing_plans.price_yearly IS '年付价格，单位：分（CNY）';

-- ═══════════════════════════════════════════
-- 4. Seed: 定价方案
-- ═══════════════════════════════════════════

INSERT INTO pricing_plans (id, name, tier, price_monthly, price_yearly, features, limits)
VALUES
  (
    'free',
    'Free',
    'free',
    0,
    0,
    '["最多 3 个项目","每月 10 次代码生成","100MB 存储空间","1 位成员"]'::jsonb,
    '{"projects": 3, "codegenPerMonth": 10, "storageMB": 100, "members": 1}'::jsonb
  ),
  (
    'pro',
    'Pro',
    'pro',
    9900,
    99000,
    '["最多 20 个项目","每月 100 次代码生成","1GB 存储空间","最多 5 位成员","优先队列","自定义域名","去除水印"]'::jsonb,
    '{"projects": 20, "codegenPerMonth": 100, "storageMB": 1024, "members": 5}'::jsonb
  ),
  (
    'enterprise',
    'Enterprise',
    'enterprise',
    49900,
    499000,
    '["不限项目数","每月 500 次代码生成","10GB 存储空间","不限成员数","SSO 单点登录","白标定制","SLA 保障","专属技术支持"]'::jsonb,
    '{"projects": -1, "codegenPerMonth": 500, "storageMB": 10240, "members": -1}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name          = EXCLUDED.name,
  tier          = EXCLUDED.tier,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly  = EXCLUDED.price_yearly,
  features      = EXCLUDED.features,
  limits        = EXCLUDED.limits,
  is_active     = true;

-- ═══════════════════════════════════════════
-- 5. 自动更新 updated_at 触发器
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION trg_billing_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workspace_subscriptions_updated_at ON workspace_subscriptions;
CREATE TRIGGER trg_workspace_subscriptions_updated_at
  BEFORE UPDATE ON workspace_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION trg_billing_set_updated_at();

-- ═══════════════════════════════════════════
-- 6. Row-Level Security
-- ═══════════════════════════════════════════

ALTER TABLE workspace_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;

-- 6a. workspace_subscriptions: 成员可读，service_role 全权

DROP POLICY IF EXISTS "members_read_subscription" ON workspace_subscriptions;
CREATE POLICY "members_read_subscription" ON workspace_subscriptions
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_role_all_subscriptions" ON workspace_subscriptions;
CREATE POLICY "service_role_all_subscriptions" ON workspace_subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- 6b. usage_records: 成员可读本工作空间，service_role 全权

DROP POLICY IF EXISTS "members_read_usage" ON usage_records;
CREATE POLICY "members_read_usage" ON usage_records
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_role_all_usage" ON usage_records;
CREATE POLICY "service_role_all_usage" ON usage_records
  FOR ALL
  USING (auth.role() = 'service_role');

-- 6c. pricing_plans: 公开可读，service_role 可管理

DROP POLICY IF EXISTS "public_read_plans" ON pricing_plans;
CREATE POLICY "public_read_plans" ON pricing_plans
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "service_role_all_plans" ON pricing_plans;
CREATE POLICY "service_role_all_plans" ON pricing_plans
  FOR ALL
  USING (auth.role() = 'service_role');
