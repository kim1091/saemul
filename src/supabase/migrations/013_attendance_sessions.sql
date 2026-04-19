-- 출석 세션 테이블 (셀프 체크인 코드 관리)
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  worship_type_id UUID NOT NULL REFERENCES worship_types(id),
  attend_date DATE NOT NULL DEFAULT CURRENT_DATE,
  code TEXT NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT true,
  opened_by UUID NOT NULL REFERENCES profiles(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  UNIQUE(church_id, worship_type_id, attend_date)
);

ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;

-- 모든 인증 사용자가 세션 조회 가능 (코드 확인용)
CREATE POLICY "attendance_sessions_select" ON attendance_sessions
  FOR SELECT TO authenticated USING (true);

-- 목사만 생성/수정/삭제
CREATE POLICY "attendance_sessions_manage" ON attendance_sessions
  FOR ALL TO authenticated
  USING (church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid()))
  WITH CHECK (church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid()));
