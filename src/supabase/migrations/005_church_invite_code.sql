-- ============================================
-- churches 테이블에 초대코드 추가 (최소)
-- ============================================

-- invite_code 컬럼 추가
ALTER TABLE churches ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- 기존 교회에 초대코드 자동 생성
UPDATE churches
SET invite_code = UPPER(SUBSTRING(MD5(id::text || RANDOM()::text), 1, 6))
WHERE invite_code IS NULL;

-- UNIQUE 제약 추가 (이미 있으면 스킵)
DO $$
BEGIN
  ALTER TABLE churches ADD CONSTRAINT churches_invite_code_unique UNIQUE (invite_code);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- NOT NULL로 전환
ALTER TABLE churches ALTER COLUMN invite_code SET NOT NULL;

-- invite_code 인덱스
CREATE INDEX IF NOT EXISTS idx_churches_invite_code ON churches(invite_code);
