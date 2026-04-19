-- 출석 테이블에 member_id 추가 (church_members 기반 출석 체크)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES church_members(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(member_id);

-- user_id를 nullable로 변경 (가족 멤버는 profile이 없음)
ALTER TABLE attendance ALTER COLUMN user_id DROP NOT NULL;

-- 기존 출석 데이터에 member_id 백필
UPDATE attendance a
SET member_id = cm.id
FROM church_members cm
WHERE cm.profile_id = a.user_id
  AND cm.church_id = a.church_id
  AND a.member_id IS NULL;
