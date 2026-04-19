-- ============================================
-- 교인 명부 테이블 (등록 사용자 + 가족/비회원 통합)
-- 부서 자동 분류: 생년월일 → 유치부/아동부/중고등부/청년부/장년부
-- ============================================

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS church_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  registered_by UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  birth_date DATE,
  gender TEXT,
  phone TEXT,
  relation TEXT DEFAULT '본인',
  department TEXT,
  grade TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_church_members_church ON church_members(church_id);
CREATE INDEX IF NOT EXISTS idx_church_members_profile ON church_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_church_members_dept ON church_members(church_id, department);

-- 2. 부서 자동 계산 함수
CREATE OR REPLACE FUNCTION calc_department(p_birth_date DATE)
RETURNS TABLE(department TEXT, grade TEXT)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_age INT;
  v_school_age INT;
BEGIN
  IF p_birth_date IS NULL THEN
    department := '장년부';
    grade := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- 만 나이 계산 (3월 기준 학년)
  v_age := EXTRACT(YEAR FROM AGE(CURRENT_DATE, p_birth_date));
  -- 학교 나이: 해당 연도 - 출생 연도 - 1 (한국 학제, 3월 기준)
  v_school_age := EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM p_birth_date) -
    CASE WHEN EXTRACT(MONTH FROM p_birth_date) >= 3 THEN 0 ELSE -1 END;

  IF v_age <= 6 THEN
    department := '유치부';
    grade := NULL;
  ELSIF v_school_age BETWEEN 7 AND 12 THEN
    department := '아동부';
    grade := (v_school_age - 6) || '학년';
  ELSIF v_school_age BETWEEN 13 AND 15 THEN
    department := '중등부';
    grade := '중' || (v_school_age - 12) || '학년';
  ELSIF v_school_age BETWEEN 16 AND 18 THEN
    department := '고등부';
    grade := '고' || (v_school_age - 15) || '학년';
  ELSIF v_age BETWEEN 19 AND 34 THEN
    department := '청년부';
    grade := NULL;
  ELSE
    department := '장년부';
    grade := NULL;
  END IF;

  RETURN NEXT;
  RETURN;
END;
$$;

-- 3. 부서 자동 설정 트리거
CREATE OR REPLACE FUNCTION update_member_department()
RETURNS TRIGGER AS $$
DECLARE
  v_dept RECORD;
BEGIN
  SELECT * INTO v_dept FROM calc_department(NEW.birth_date);
  NEW.department := v_dept.department;
  NEW.grade := v_dept.grade;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_member_department
  BEFORE INSERT OR UPDATE OF birth_date ON church_members
  FOR EACH ROW EXECUTE FUNCTION update_member_department();

-- 4. RLS
ALTER TABLE church_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "church_members_select" ON church_members
  FOR SELECT TO authenticated
  USING (
    church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid())
    OR church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid())
  );

CREATE POLICY "church_members_insert" ON church_members
  FOR INSERT TO authenticated
  WITH CHECK (
    church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid())
    OR church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid())
  );

CREATE POLICY "church_members_update" ON church_members
  FOR UPDATE TO authenticated
  USING (
    church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid())
    OR registered_by = auth.uid()
  );

CREATE POLICY "church_members_delete" ON church_members
  FOR DELETE TO authenticated
  USING (
    church_id IN (SELECT id FROM churches WHERE pastor_id = auth.uid())
  );

-- 5. 기존 프로필 데이터 → church_members 마이그레이션
-- 등록된 사용자 (church_id가 있는 profiles)
INSERT INTO church_members (church_id, profile_id, registered_by, name, birth_date, gender, phone, relation)
SELECT
  p.church_id,
  p.id,
  p.id,
  COALESCE(p.name, '이름없음'),
  p.birth_date,
  p.gender,
  p.phone,
  '본인'
FROM profiles p
WHERE p.church_id IS NOT NULL
  AND p.onboarded = true
  AND NOT EXISTS (SELECT 1 FROM church_members cm WHERE cm.profile_id = p.id AND cm.church_id = p.church_id);

-- 가족 구성원 (profiles.family JSONB)
INSERT INTO church_members (church_id, profile_id, registered_by, name, birth_date, relation)
SELECT
  p.church_id,
  NULL,
  p.id,
  f->>'name',
  CASE WHEN f->>'birth_date' != '' THEN (f->>'birth_date')::DATE ELSE NULL END,
  f->>'relation'
FROM profiles p, jsonb_array_elements(p.family) AS f
WHERE p.church_id IS NOT NULL
  AND p.family IS NOT NULL
  AND jsonb_array_length(p.family) > 0;
