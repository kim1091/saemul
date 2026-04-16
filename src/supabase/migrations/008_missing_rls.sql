-- ============================================
-- 누락된 RLS 정책 일괄 추가
-- 원인: 테이블은 있지만 정책이 없어서 모든 쿼리 차단됨
-- ============================================

-- 1. daily_qt: 모든 인증 사용자 읽기 가능, 서비스롤만 쓰기
DROP POLICY IF EXISTS "daily_qt_read" ON daily_qt;
CREATE POLICY "daily_qt_read" ON daily_qt
  FOR SELECT TO authenticated
  USING (true);

-- 2. qt_completions: 본인 것만
DROP POLICY IF EXISTS "qt_completions_own" ON qt_completions;
CREATE POLICY "qt_completions_own" ON qt_completions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. notes: 본인 + 공유된 소그룹 멤버
DROP POLICY IF EXISTS "notes_own" ON notes;
CREATE POLICY "notes_own" ON notes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notes_shared_read" ON notes;
CREATE POLICY "notes_shared_read" ON notes
  FOR SELECT TO authenticated
  USING (
    is_shared = true
    AND shared_to_group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

-- 4. groups: 멤버 조회 + 누구나 생성(본인이 리더) + 리더만 수정
DROP POLICY IF EXISTS "groups_members_read" ON groups;
CREATE POLICY "groups_members_read" ON groups
  FOR SELECT TO authenticated
  USING (
    leader_id = auth.uid()
    OR id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "groups_create" ON groups;
CREATE POLICY "groups_create" ON groups
  FOR INSERT TO authenticated
  WITH CHECK (leader_id = auth.uid());

DROP POLICY IF EXISTS "groups_leader_update" ON groups;
CREATE POLICY "groups_leader_update" ON groups
  FOR UPDATE TO authenticated
  USING (leader_id = auth.uid());

DROP POLICY IF EXISTS "groups_leader_delete" ON groups;
CREATE POLICY "groups_leader_delete" ON groups
  FOR DELETE TO authenticated
  USING (leader_id = auth.uid());

-- 5. group_members: 본인 가입/탈퇴, 같은 그룹 멤버 조회
DROP POLICY IF EXISTS "group_members_self_insert" ON group_members;
CREATE POLICY "group_members_self_insert" ON group_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "group_members_self_delete" ON group_members;
CREATE POLICY "group_members_self_delete" ON group_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "group_members_read" ON group_members;
CREATE POLICY "group_members_read" ON group_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR group_id IN (SELECT group_id FROM group_members gm WHERE gm.user_id = auth.uid())
  );

-- 6. group_sharings: 같은 그룹 멤버끼리
DROP POLICY IF EXISTS "group_sharings_members_read" ON group_sharings;
CREATE POLICY "group_sharings_members_read" ON group_sharings
  FOR SELECT TO authenticated
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "group_sharings_insert" ON group_sharings;
CREATE POLICY "group_sharings_insert" ON group_sharings
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "group_sharings_own_delete" ON group_sharings;
CREATE POLICY "group_sharings_own_delete" ON group_sharings
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 7. sharing_reactions: 같은 그룹 멤버끼리
DROP POLICY IF EXISTS "sharing_reactions_all" ON sharing_reactions;
CREATE POLICY "sharing_reactions_all" ON sharing_reactions
  FOR ALL TO authenticated
  USING (
    sharing_id IN (
      SELECT gs.id FROM group_sharings gs
      JOIN group_members gm ON gs.group_id = gm.group_id
      WHERE gm.user_id = auth.uid()
    )
  )
  WITH CHECK (user_id = auth.uid());

-- 8. sharing_comments: 같은 그룹 멤버끼리
DROP POLICY IF EXISTS "sharing_comments_read" ON sharing_comments;
CREATE POLICY "sharing_comments_read" ON sharing_comments
  FOR SELECT TO authenticated
  USING (
    sharing_id IN (
      SELECT gs.id FROM group_sharings gs
      JOIN group_members gm ON gs.group_id = gm.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sharing_comments_own" ON sharing_comments;
CREATE POLICY "sharing_comments_own" ON sharing_comments
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 9. reading_plans: 공개 플랜은 모두 읽기
DROP POLICY IF EXISTS "reading_plans_public_read" ON reading_plans;
CREATE POLICY "reading_plans_public_read" ON reading_plans
  FOR SELECT TO authenticated
  USING (is_public = true OR created_by = auth.uid());

-- 10. user_plans: 본인 것만
DROP POLICY IF EXISTS "user_plans_own" ON user_plans;
CREATE POLICY "user_plans_own" ON user_plans
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 11. plan_progress: 본인 것만
DROP POLICY IF EXISTS "plan_progress_own" ON plan_progress;
CREATE POLICY "plan_progress_own" ON plan_progress
  FOR ALL TO authenticated
  USING (
    user_plan_id IN (SELECT id FROM user_plans WHERE user_id = auth.uid())
  )
  WITH CHECK (
    user_plan_id IN (SELECT id FROM user_plans WHERE user_id = auth.uid())
  );

-- 12. ask_conversations: 본인 것만
DROP POLICY IF EXISTS "ask_conversations_own" ON ask_conversations;
CREATE POLICY "ask_conversations_own" ON ask_conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 13. ask_messages: 본인 대화의 메시지만
DROP POLICY IF EXISTS "ask_messages_own" ON ask_messages;
CREATE POLICY "ask_messages_own" ON ask_messages
  FOR ALL TO authenticated
  USING (
    conversation_id IN (SELECT id FROM ask_conversations WHERE user_id = auth.uid())
  )
  WITH CHECK (
    conversation_id IN (SELECT id FROM ask_conversations WHERE user_id = auth.uid())
  );

-- 14. sermon_analyses: 본인 설교의 분석만
DROP POLICY IF EXISTS "sermon_analyses_own" ON sermon_analyses;
CREATE POLICY "sermon_analyses_own" ON sermon_analyses
  FOR ALL TO authenticated
  USING (sermon_id IN (SELECT id FROM sermons WHERE user_id = auth.uid()))
  WITH CHECK (sermon_id IN (SELECT id FROM sermons WHERE user_id = auth.uid()));

-- 15. sermon_permissions: 본인 조회 + 목사만 부여
DROP POLICY IF EXISTS "sermon_permissions_self_read" ON sermon_permissions;
CREATE POLICY "sermon_permissions_self_read" ON sermon_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR granted_by = auth.uid());

DROP POLICY IF EXISTS "sermon_permissions_pastor_manage" ON sermon_permissions;
CREATE POLICY "sermon_permissions_pastor_manage" ON sermon_permissions
  FOR ALL TO authenticated
  USING (granted_by = auth.uid())
  WITH CHECK (granted_by = auth.uid());

-- ============================================
-- 완료: 13개 테이블에 정책 추가
-- ============================================
