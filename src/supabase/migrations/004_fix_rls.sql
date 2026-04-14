-- ============================================
-- RLS 정책 수정 — 신규 교회 등록 허용
-- ============================================

-- 기존 churches 정책 제거 (있으면)
DROP POLICY IF EXISTS "Pastor manage church" ON churches;
DROP POLICY IF EXISTS "Members view church" ON churches;
DROP POLICY IF EXISTS "churches_insert" ON churches;
DROP POLICY IF EXISTS "churches_select" ON churches;
DROP POLICY IF EXISTS "churches_update" ON churches;
DROP POLICY IF EXISTS "churches_delete" ON churches;

-- churches: 누구나 자기가 목사인 교회 생성 가능
CREATE POLICY "churches_insert" ON churches
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = pastor_id);

-- churches: 소속 성도 또는 목사만 조회
CREATE POLICY "churches_select" ON churches
  FOR SELECT TO authenticated
  USING (
    pastor_id = auth.uid()
    OR id IN (SELECT church_id FROM profiles WHERE id = auth.uid())
  );

-- churches: 목사만 수정
CREATE POLICY "churches_update" ON churches
  FOR UPDATE TO authenticated
  USING (pastor_id = auth.uid());

-- churches: 목사만 삭제
CREATE POLICY "churches_delete" ON churches
  FOR DELETE TO authenticated
  USING (pastor_id = auth.uid());

-- worship_types 정책 수정
DROP POLICY IF EXISTS "Church members view" ON worship_types;
DROP POLICY IF EXISTS "Pastor manage" ON worship_types;
DROP POLICY IF EXISTS "worship_insert" ON worship_types;
DROP POLICY IF EXISTS "worship_select" ON worship_types;
DROP POLICY IF EXISTS "worship_update" ON worship_types;
DROP POLICY IF EXISTS "worship_delete" ON worship_types;

CREATE POLICY "worship_all" ON worship_types
  FOR ALL TO authenticated
  USING (
    church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid())
    OR church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid())
  );

-- attendance 정책 수정
DROP POLICY IF EXISTS "Users view own attendance" ON attendance;
DROP POLICY IF EXISTS "Pastor manage attendance" ON attendance;

CREATE POLICY "attendance_select" ON attendance
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid())
  );

CREATE POLICY "attendance_manage" ON attendance
  FOR ALL TO authenticated
  USING (church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid()))
  WITH CHECK (church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid()));

-- visitations 정책 수정
DROP POLICY IF EXISTS "Pastor manage visitations" ON visitations;

CREATE POLICY "visitations_manage" ON visitations
  FOR ALL TO authenticated
  USING (church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid()))
  WITH CHECK (church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid()));

-- offerings 정책 수정
DROP POLICY IF EXISTS "Users view own offerings" ON offerings;
DROP POLICY IF EXISTS "Pastor manage offerings" ON offerings;

CREATE POLICY "offerings_select" ON offerings
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid())
  );

CREATE POLICY "offerings_manage" ON offerings
  FOR ALL TO authenticated
  USING (church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid()))
  WITH CHECK (church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid()));

-- expenses 정책 수정
DROP POLICY IF EXISTS "Pastor manage expenses" ON expenses;

CREATE POLICY "expenses_manage" ON expenses
  FOR ALL TO authenticated
  USING (church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid()))
  WITH CHECK (church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid()));

-- newcomers 정책 수정
DROP POLICY IF EXISTS "Pastor manage newcomers" ON newcomers;

CREATE POLICY "newcomers_manage" ON newcomers
  FOR ALL TO authenticated
  USING (church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid()))
  WITH CHECK (church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid()));

-- budget_items 정책 수정
DROP POLICY IF EXISTS "Pastor manage budget" ON budget_items;

CREATE POLICY "budget_manage" ON budget_items
  FOR ALL TO authenticated
  USING (church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid()))
  WITH CHECK (church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid()));
