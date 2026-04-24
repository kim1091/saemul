-- 018: 세대주(신앙의 가장) 시스템
-- 2026-04-24
-- 교인을 세대주 기준으로 가족 단위 묶기
-- QR 가입 시 각자 가입해도 기존 세대주에 연결 가능

-- ═══ 1. household_head_id 컬럼 추가 ═══
ALTER TABLE church_members
  ADD COLUMN IF NOT EXISTS household_head_id UUID REFERENCES church_members(id);

CREATE INDEX IF NOT EXISTS idx_church_members_household
  ON church_members(household_head_id);

-- ═══ 2. 기존 데이터 백필 ═══

-- 2-1. 본인(세대주) → 자기 자신을 가리킴
UPDATE church_members
  SET household_head_id = id
  WHERE relation = '본인'
    AND household_head_id IS NULL;

-- 2-2. 가족 구성원 → 같은 교회에서 registered_by가 같은 본인(세대주)에 연결
UPDATE church_members cm
  SET household_head_id = head.id
  FROM church_members head
  WHERE cm.registered_by = head.profile_id
    AND cm.relation != '본인'
    AND head.relation = '본인'
    AND cm.church_id = head.church_id
    AND cm.household_head_id IS NULL;

-- 2-3. 아직 연결 안 된 본인이 아닌 멤버 → registered_by와 같은 registered_by를 가진 본인에 연결
UPDATE church_members cm
  SET household_head_id = head.id
  FROM church_members head
  WHERE cm.registered_by = head.registered_by
    AND cm.relation != '본인'
    AND head.relation = '본인'
    AND cm.church_id = head.church_id
    AND cm.household_head_id IS NULL;

-- 2-4. 그래도 연결 안 된 독립 멤버(relation=본인인데 household_head_id 없는 경우)
UPDATE church_members
  SET household_head_id = id
  WHERE household_head_id IS NULL
    AND relation = '본인';
