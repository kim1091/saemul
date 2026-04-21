-- ============================================
-- 파트너 시스템: 목회자가 지정한 성도에게 관리자 모드 접근 권한 부여
-- church_members.is_partner = true → /admin 접근 가능
-- ============================================

-- 1. 파트너 컬럼 추가
ALTER TABLE church_members ADD COLUMN IF NOT EXISTS is_partner BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. 파트너 조회 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_church_members_partner
  ON church_members(church_id, profile_id)
  WHERE is_partner = TRUE;

-- 3. 관리 모드 접근 가능 여부 확인 함수
--    목회자(churches.pastor_id) 또는 파트너(church_members.is_partner) → TRUE
CREATE OR REPLACE FUNCTION public.can_access_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    -- 목회자인 경우
    SELECT 1 FROM churches WHERE pastor_id = p_user_id
    UNION ALL
    -- 파트너인 경우
    SELECT 1 FROM church_members
    WHERE profile_id = p_user_id
      AND is_partner = TRUE
      AND is_active = TRUE
  );
$$;
