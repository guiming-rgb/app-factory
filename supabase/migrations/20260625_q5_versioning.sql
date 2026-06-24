-- Q5: Version Management — spec_versions + codegen_versions
-- 执行: supabase db push 或在 SQL Editor 中运行
--
-- 依赖:
--   auth.users (Supabase 内置)
--   projects (本仓库)
--
-- ═══════════════════════════════════════════
-- 1. spec_versions — Spec 历史版本快照
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS spec_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  spec           JSONB NOT NULL,
  version_number INT NOT NULL,
  changelog      TEXT,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, version_number)
);

COMMENT ON TABLE spec_versions IS 'Spec 历史版本快照，每次保存自动生成新版本';
COMMENT ON COLUMN spec_versions.spec IS '完整 Spec JSON 快照';
COMMENT ON COLUMN spec_versions.version_number IS '项目内自增版本号，从 1 开始';

-- ═══════════════════════════════════════════
-- 2. codegen_versions — 代码生成产物版本
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS codegen_versions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  run_id           TEXT NOT NULL,
  platform         TEXT NOT NULL,
  artifact_path    TEXT,
  spec_snapshot    JSONB,
  file_count       INT,
  total_size_bytes BIGINT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE codegen_versions IS '代码生成产物版本，记录每次生成的快照和统计数据';
COMMENT ON COLUMN codegen_versions.run_id IS '对应 agent_runs.id 或外部生成任务 ID';
COMMENT ON COLUMN codegen_versions.platform IS '目标平台：flutter / wechat / harmony';
COMMENT ON COLUMN codegen_versions.spec_snapshot IS '生成时使用的 Spec 快照';

-- ═══════════════════════════════════════════
-- 3. 索引
-- ═══════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_sv_project_version
  ON spec_versions (project_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_sv_project_created
  ON spec_versions (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sv_created_by
  ON spec_versions (created_by);

CREATE INDEX IF NOT EXISTS idx_cv_project
  ON codegen_versions (project_id);
CREATE INDEX IF NOT EXISTS idx_cv_project_platform
  ON codegen_versions (project_id, platform);
CREATE INDEX IF NOT EXISTS idx_cv_project_created
  ON codegen_versions (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cv_run_id
  ON codegen_versions (run_id);

-- ═══════════════════════════════════════════
-- 4. 自动版本号递增触发器
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_auto_version_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  SELECT COALESCE(MAX(sv.version_number), 0) + 1
  INTO NEW.version_number
  FROM spec_versions sv
  WHERE sv.project_id = NEW.project_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_spec_versions_auto_number ON spec_versions;
CREATE TRIGGER trg_spec_versions_auto_number
  BEFORE INSERT ON spec_versions
  FOR EACH ROW
  EXECUTE FUNCTION trg_auto_version_number();

COMMENT ON FUNCTION trg_auto_version_number IS 'INSERT 时自动计算 project 内下一个 version_number';

-- ═══════════════════════════════════════════
-- 5. 清理函数：保留每个项目最近的 N 个版本
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION clean_old_versions(
  keep_count INT DEFAULT 50
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_total INT := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT project_id FROM spec_versions
  LOOP
    DELETE FROM spec_versions sv
    WHERE sv.project_id = rec.project_id
      AND sv.id NOT IN (
        SELECT sv2.id FROM spec_versions sv2
        WHERE sv2.project_id = rec.project_id
        ORDER BY sv2.version_number DESC
        LIMIT keep_count
      );
    deleted_total := deleted_total + ROW_COUNT;
  END LOOP;
  RETURN deleted_total;
END;
$$;

COMMENT ON FUNCTION clean_old_versions(INT) IS '清理每个项目超出 keep_count 的旧版本，返回删除行数';

-- ═══════════════════════════════════════════
-- 6. Row-Level Security
-- ═══════════════════════════════════════════
ALTER TABLE spec_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE codegen_versions ENABLE ROW LEVEL SECURITY;

-- spec_versions: 项目成员可读
DROP POLICY IF EXISTS "member_select_spec_version" ON spec_versions;
CREATE POLICY "member_select_spec_version" ON spec_versions
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
        AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
    )
  );

-- spec_versions: 登录用户可创建
DROP POLICY IF EXISTS "auth_insert_spec_version" ON spec_versions;
CREATE POLICY "auth_insert_spec_version" ON spec_versions
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR (
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_id
          AND p.owner_id = auth.uid()
      )
    )
  );

-- spec_versions: update/delete 仅 service_role
DROP POLICY IF EXISTS "service_update_spec_version" ON spec_versions;
CREATE POLICY "service_update_spec_version" ON spec_versions
  FOR UPDATE
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_delete_spec_version" ON spec_versions;
CREATE POLICY "service_delete_spec_version" ON spec_versions
  FOR DELETE
  USING (auth.role() = 'service_role');

-- codegen_versions: 项目成员可读
DROP POLICY IF EXISTS "member_select_codegen_version" ON codegen_versions;
CREATE POLICY "member_select_codegen_version" ON codegen_versions
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
        AND (p.owner_id = auth.uid() OR p.owner_id IS NULL)
    )
  );

-- codegen_versions: 仅 service_role 写
DROP POLICY IF EXISTS "service_insert_codegen_version" ON codegen_versions;
CREATE POLICY "service_insert_codegen_version" ON codegen_versions
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_update_codegen_version" ON codegen_versions;
CREATE POLICY "service_update_codegen_version" ON codegen_versions
  FOR UPDATE
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_delete_codegen_version" ON codegen_versions;
CREATE POLICY "service_delete_codegen_version" ON codegen_versions
  FOR DELETE
  USING (auth.role() = 'service_role');
