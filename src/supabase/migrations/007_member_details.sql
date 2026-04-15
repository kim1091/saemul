-- ============================================
-- 성도 상세정보 컬럼 추가 (직분/봉사/세례/가족/주소 등)
-- ============================================

-- 직분 (교회에서의 공식 직분)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank TEXT;
-- 가능값: '담임목사', '부목사', '전도사', '장로', '권사', '안수집사', '서리집사', '성도', '세례교인', '원입교인'

-- 봉사 (배열 - 여러 봉사 가능)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS services TEXT[];
-- 예: ['구역장', '구역인도자', '교구장', '찬양대', '주일학교교사']

-- 세례 정보
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS baptism_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS baptism_church TEXT;

-- 원입/등록 일자
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS registration_date DATE;

-- 개인 신상
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT; -- 'male' | 'female'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marital_status TEXT; -- 'single' | 'married' | 'widowed' | 'divorced'

-- 가족 사항 (JSON - 이름, 관계, 생년월일)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family JSONB;
-- 예: [{"relation": "배우자", "name": "김영희", "birth_date": "1985-06-15"}, {"relation": "자녀", "name": "김철수", "birth_date": "2015-03-20"}]

-- 구역
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS district TEXT;

-- 온보딩 완료 여부
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT false;

-- join_requests에도 상세정보 포함 (승인 시 profiles로 복사하기 위함)
ALTER TABLE join_requests ADD COLUMN IF NOT EXISTS snapshot JSONB;
-- 신청 시점의 성도 정보 스냅샷 (이름, 직분, 봉사, 세례일 등)
