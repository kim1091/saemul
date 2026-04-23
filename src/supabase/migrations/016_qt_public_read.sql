-- daily_qt 공개 읽기 정책 (anon key로 접근 허용)
-- /api/qt/today에서 service_role_key → anon_key 전환에 필요

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'daily_qt' AND policyname = 'daily_qt_public_read'
  ) THEN
    EXECUTE 'CREATE POLICY "daily_qt_public_read" ON daily_qt FOR SELECT USING (true)';
  END IF;
END $$;
