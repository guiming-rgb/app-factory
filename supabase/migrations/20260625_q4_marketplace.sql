-- Q4-M1: Component Marketplace v1 — 组件市场数据库迁移
-- 执行: supabase db push 或在 SQL Editor 中运行
--
-- 依赖:
--   auth.users (Supabase 内置)
--   无其他依赖

-- ═══════════════════════════════════════════
-- 1. 组件市场主表
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS marketplace_components (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  version       TEXT NOT NULL DEFAULT '1.0.0',
  industry      TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('widget', 'page', 'service', 'template')),
  author_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name   TEXT NOT NULL,
  description   TEXT,
  tags          TEXT[] DEFAULT '{}',
  downloads     INT NOT NULL DEFAULT 0,
  rating        NUMERIC(2,1) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  files         JSONB NOT NULL DEFAULT '[]',
  preview_image TEXT,
  approved      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE marketplace_components IS '组件市场：可复用的 widget/page/service/template，按行业分类';
COMMENT ON COLUMN marketplace_components.industry IS '行业分类，与 IndustryCategory 类型对齐（finance/crm/fitness/...）';
COMMENT ON COLUMN marketplace_components.type IS '组件类型：widget=UI组件 page=完整页面 service=服务 class template=代码模板';
COMMENT ON COLUMN marketplace_components.files IS '组件文件清单，JSON 数组：[{path:"lib/foo.dart", content:"..."}]';
COMMENT ON COLUMN marketplace_components.approved IS '审核通过后才对外可见';
COMMENT ON COLUMN marketplace_components.downloads IS '下载/安装计数，通过 RPC increment_component_downloads 原子自增';

-- ═══════════════════════════════════════════
-- 2. 组件评价表
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES marketplace_components(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating       INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE marketplace_reviews IS '组件评价/评分';
COMMENT ON COLUMN marketplace_reviews.rating IS '评分 1-5';

-- ═══════════════════════════════════════════
-- 3. 索引
-- ═══════════════════════════════════════════

-- 查询加速
CREATE INDEX IF NOT EXISTS idx_mc_industry   ON marketplace_components (industry);
CREATE INDEX IF NOT EXISTS idx_mc_type       ON marketplace_components (type);
CREATE INDEX IF NOT EXISTS idx_mc_downloads  ON marketplace_components (downloads DESC);
CREATE INDEX IF NOT EXISTS idx_mc_rating     ON marketplace_components (rating DESC);
CREATE INDEX IF NOT EXISTS idx_mc_approved   ON marketplace_components (approved) WHERE approved = true;

-- GIN 全文搜索（name + description + tags）
-- 见下方的物化列 fts + idx_mc_fts_stored
CREATE INDEX IF NOT EXISTS idx_mc_tags_gin   ON marketplace_components USING GIN (tags);

-- 评价表索引
CREATE INDEX IF NOT EXISTS idx_mr_component  ON marketplace_reviews (component_id);
CREATE INDEX IF NOT EXISTS idx_mr_user       ON marketplace_reviews (user_id);

-- ═══════════════════════════════════════════
-- 4. 全文搜索物化列
-- ── listComponents / searchComponents 使用 textSearch('fts', query)
-- ═══════════════════════════════════════════
ALTER TABLE marketplace_components ADD COLUMN IF NOT EXISTS fts TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(name, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(array_to_string(tags, ' '), '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_mc_fts_stored ON marketplace_components USING GIN (fts);

COMMENT ON COLUMN marketplace_components.fts IS '物化全文搜索向量，由 name/description/tags 自动生成';

-- ═══════════════════════════════════════════
-- 5. RPC: 原子自增下载计数
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_component_downloads(comp_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE marketplace_components
  SET downloads = downloads + 1
  WHERE id = comp_id;
END;
$$;

-- ═══════════════════════════════════════════
-- 6. RPC: 平均评分计算（评价更新后刷新主表 rating）
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION refresh_component_rating(comp_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE marketplace_components mc
  SET rating = COALESCE(
    (SELECT ROUND(AVG(rating)::numeric, 1) FROM marketplace_reviews WHERE component_id = comp_id),
    0
  )
  WHERE mc.id = comp_id;
END;
$$;

-- ═══════════════════════════════════════════
-- 7. 自动触发器：评价提交后刷新评分
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_refresh_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM refresh_component_rating(
    COALESCE(NEW.component_id, OLD.component_id)
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_reviews_rating ON marketplace_reviews;
CREATE TRIGGER trg_marketplace_reviews_rating
  AFTER INSERT OR DELETE OR UPDATE OF rating
  ON marketplace_reviews
  FOR EACH ROW
  EXECUTE FUNCTION trg_refresh_rating();

-- ═══════════════════════════════════════════
-- 8. 自动触发器：updated_at 刷新
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_set_updated_at()
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

DROP TRIGGER IF EXISTS trg_marketplace_components_updated_at ON marketplace_components;
CREATE TRIGGER trg_marketplace_components_updated_at
  BEFORE UPDATE ON marketplace_components
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_updated_at();

-- ═══════════════════════════════════════════
-- 9. Row-Level Security
-- ═══════════════════════════════════════════
ALTER TABLE marketplace_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_reviews ENABLE ROW LEVEL SECURITY;

-- 任何人可读取已审核的组件
DROP POLICY IF EXISTS "public_read_approved" ON marketplace_components;
CREATE POLICY "public_read_approved" ON marketplace_components
  FOR SELECT
  USING (approved = true);

-- 组件所有者可更新/删除
DROP POLICY IF EXISTS "owner_update" ON marketplace_components;
CREATE POLICY "owner_update" ON marketplace_components
  FOR UPDATE
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "owner_delete" ON marketplace_components;
CREATE POLICY "owner_delete" ON marketplace_components
  FOR DELETE
  USING (author_id = auth.uid());

-- 任何人可创建组件（auth 用户）
DROP POLICY IF EXISTS "auth_insert" ON marketplace_components;
CREATE POLICY "auth_insert" ON marketplace_components
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- service role 完全访问（用于 admin 操作）
DROP POLICY IF EXISTS "service_role_all" ON marketplace_components;
CREATE POLICY "service_role_all" ON marketplace_components
  USING (auth.role() = 'service_role');

-- 评价：登录用户可读，可提交
DROP POLICY IF EXISTS "public_read_reviews" ON marketplace_reviews;
CREATE POLICY "public_read_reviews" ON marketplace_reviews
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "auth_insert_reviews" ON marketplace_reviews;
CREATE POLICY "auth_insert_reviews" ON marketplace_reviews
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- service role 完全访问评价表
DROP POLICY IF EXISTS "service_role_all_reviews" ON marketplace_reviews;
CREATE POLICY "service_role_all_reviews" ON marketplace_reviews
  USING (auth.role() = 'service_role');
