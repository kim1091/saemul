-- ============================================
-- 소그룹 RLS 전면 재설계 (2026-04-18)
-- 근본 원인: group_members SELECT RLS가 자기참조 → 순환
-- 해결: SECURITY DEFINER 헬퍼 함수로 RLS 우회
-- ============================================

-- ─── 1. 헬퍼 함수 생성 ─────────────────────────────────

-- 그룹 멤버 여부 확인 (RLS 우회)
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  );
$$;

-- 나눔이 속한 그룹 ID 조회 (RLS 우회)
CREATE OR REPLACE FUNCTION get_sharing_group_id(p_sharing_id UUID)
RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT group_id FROM group_sharings WHERE id = p_sharing_id;
$$;

-- ─── 2. 기존 정책 전부 DROP ────────────────────────────

-- group_members (001_initial_schema.sql 구 정책)
DROP POLICY IF EXISTS "gm_read" ON group_members;
DROP POLICY IF EXISTS "gm_insert" ON group_members;
DROP POLICY IF EXISTS "gm_delete" ON group_members;

-- groups
DROP POLICY IF EXISTS "groups_members_read" ON groups;
DROP POLICY IF EXISTS "groups_read_all" ON groups;
DROP POLICY IF EXISTS "groups_create" ON groups;
DROP POLICY IF EXISTS "groups_leader_update" ON groups;
DROP POLICY IF EXISTS "groups_leader_delete" ON groups;

-- group_members
DROP POLICY IF EXISTS "group_members_read" ON group_members;
DROP POLICY IF EXISTS "group_members_self_insert" ON group_members;
DROP POLICY IF EXISTS "group_members_self_delete" ON group_members;

-- group_sharings
DROP POLICY IF EXISTS "group_sharings_members_read" ON group_sharings;
DROP POLICY IF EXISTS "group_sharings_insert" ON group_sharings;
DROP POLICY IF EXISTS "group_sharings_own_delete" ON group_sharings;

-- sharing_reactions
DROP POLICY IF EXISTS "sharing_reactions_all" ON sharing_reactions;

-- sharing_comments
DROP POLICY IF EXISTS "sharing_comments_read" ON sharing_comments;
DROP POLICY IF EXISTS "sharing_comments_own" ON sharing_comments;

-- ─── 3. groups ─────────────────────────────────────────
-- SELECT: 모든 인증 사용자가 소그룹 목록 탐색 가능
CREATE POLICY "groups_select" ON groups
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: 본인이 리더로 생성
CREATE POLICY "groups_insert" ON groups
  FOR INSERT TO authenticated
  WITH CHECK (leader_id = auth.uid());

-- UPDATE: 리더만 수정
CREATE POLICY "groups_update" ON groups
  FOR UPDATE TO authenticated
  USING (leader_id = auth.uid());

-- DELETE: 리더만 삭제
CREATE POLICY "groups_delete" ON groups
  FOR DELETE TO authenticated
  USING (leader_id = auth.uid());

-- ─── 4. group_members ──────────────────────────────────
-- SELECT: 모든 인증 사용자 (멤버 수 카운트 + 목록 표시 필요)
CREATE POLICY "group_members_select" ON group_members
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: 본인만 가입 가능
CREATE POLICY "group_members_insert" ON group_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- DELETE: 본인 탈퇴 또는 리더가 강퇴
CREATE POLICY "group_members_delete" ON group_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR group_id IN (SELECT id FROM groups WHERE leader_id = auth.uid())
  );

-- ─── 5. group_sharings ─────────────────────────────────
-- SELECT: 그룹 멤버만 나눔 조회
CREATE POLICY "group_sharings_select" ON group_sharings
  FOR SELECT TO authenticated
  USING (is_group_member(group_id));

-- INSERT: 그룹 멤버만 나눔 작성
CREATE POLICY "group_sharings_insert" ON group_sharings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_group_member(group_id));

-- DELETE: 본인 나눔만 삭제
CREATE POLICY "group_sharings_delete" ON group_sharings
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ─── 6. sharing_reactions ──────────────────────────────
-- SELECT: 나눔이 속한 그룹의 멤버만
CREATE POLICY "sharing_reactions_select" ON sharing_reactions
  FOR SELECT TO authenticated
  USING (is_group_member(get_sharing_group_id(sharing_id)));

-- INSERT: 그룹 멤버가 본인 반응 추가
CREATE POLICY "sharing_reactions_insert" ON sharing_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_group_member(get_sharing_group_id(sharing_id))
  );

-- DELETE: 본인 반응만 제거
CREATE POLICY "sharing_reactions_delete" ON sharing_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ─── 7. sharing_comments ──────────────────────────────
-- SELECT: 나눔이 속한 그룹의 멤버만
CREATE POLICY "sharing_comments_select" ON sharing_comments
  FOR SELECT TO authenticated
  USING (is_group_member(get_sharing_group_id(sharing_id)));

-- INSERT: 그룹 멤버가 본인 댓글 작성
CREATE POLICY "sharing_comments_insert" ON sharing_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_group_member(get_sharing_group_id(sharing_id))
  );

-- DELETE: 본인 댓글만 삭제
CREATE POLICY "sharing_comments_delete" ON sharing_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- 완료: 5개 테이블, 15개 정책, 순환 참조 완전 제거
-- ============================================
