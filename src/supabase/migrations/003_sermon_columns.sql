-- ============================================
-- 설교공방 sermons 테이블에 샘물 컬럼 추가 (하위 호환)
-- 기존 passage, memo, length, sermon_text는 유지
-- ============================================

ALTER TABLE sermons ADD COLUMN IF NOT EXISTS book TEXT;
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS chapter INT;
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS verse_start INT;
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS verse_end INT;
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS sermon_type TEXT DEFAULT 'full';
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 20;
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS tone TEXT;
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS qt_date DATE;
ALTER TABLE sermons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 기존 설교공방 데이터를 샘물 포맷으로 마이그레이션
-- passage (예: "마태복음 5:1-12") 를 book/chapter/verse_start/verse_end로 파싱은 어려워서
-- 일단 sermon_text → content, length → duration_minutes 매핑만
UPDATE sermons
SET
  content = COALESCE(content, sermon_text),
  sermon_type = COALESCE(sermon_type, 'full'),
  duration_minutes = COALESCE(duration_minutes,
    CASE length
      WHEN '20분' THEN 20
      WHEN '30분' THEN 30
      WHEN '40분' THEN 40
      WHEN '10분' THEN 10
      ELSE 20
    END
  ),
  title = COALESCE(title, passage)
WHERE sermon_text IS NOT NULL AND content IS NULL;

-- RLS 정책은 설교공방에서 이미 설정되어 있음
