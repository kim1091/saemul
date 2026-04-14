-- ============================================
-- 교회 가입 요청 테이블 (승인 워크플로)
-- ============================================

CREATE TABLE IF NOT EXISTS join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(church_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_join_requests_church_status ON join_requests(church_id, status);
CREATE INDEX IF NOT EXISTS idx_join_requests_user ON join_requests(user_id);

-- RLS
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jr_select" ON join_requests;
DROP POLICY IF EXISTS "jr_insert" ON join_requests;
DROP POLICY IF EXISTS "jr_update" ON join_requests;

-- 본인 요청 OR 해당 교회 목사 조회 가능
CREATE POLICY "jr_select" ON join_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid())
  );

-- 본인 요청 생성 가능
CREATE POLICY "jr_insert" ON join_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 해당 교회 목사만 승인/거절 가능
CREATE POLICY "jr_update" ON join_requests
  FOR UPDATE TO authenticated
  USING (church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid()));
