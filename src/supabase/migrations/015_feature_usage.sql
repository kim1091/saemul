-- 기능별 사용량 추적 (BigIdea 월 10회 등)
-- 별도 카운터 컬럼 대신 행 기반으로 추적하여 리셋 로직 불필요

CREATE TABLE IF NOT EXISTS feature_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL,  -- 'bigidea', 'analyze' 등
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_feature_usage_user_feature ON feature_usage(user_id, feature, created_at DESC);

-- RLS
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON feature_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON feature_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);
