-- ============================================
-- 소그룹 Realtime 활성화 (2026-04-17)
-- Supabase Dashboard > SQL Editor 에서 실행
-- ============================================

-- Supabase Realtime은 supabase_realtime publication에 등록된 테이블만 감지
ALTER PUBLICATION supabase_realtime ADD TABLE group_sharings;
ALTER PUBLICATION supabase_realtime ADD TABLE sharing_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE sharing_comments;
