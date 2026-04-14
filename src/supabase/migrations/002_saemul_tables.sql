-- ============================================
-- 샘물 추가 테이블 (profiles, sermons 제외 — 이미 존재)
-- ============================================

-- profiles에 샘물 컬럼 추가 (이미 있으면 무시)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_ask_count INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_ask_reset_at DATE DEFAULT CURRENT_DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS qt_streak INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS qt_total_days INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_qt_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reminder_time TIME DEFAULT '06:00';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS church_id UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS church_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. daily_qt
CREATE TABLE IF NOT EXISTS daily_qt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qt_date DATE NOT NULL UNIQUE,
  book TEXT NOT NULL,
  chapter INT NOT NULL,
  verse_start INT NOT NULL,
  verse_end INT NOT NULL,
  scripture_text TEXT NOT NULL,
  commentary JSONB NOT NULL,
  observation_general JSONB NOT NULL,
  observation_key JSONB NOT NULL,
  interpretation JSONB NOT NULL,
  application JSONB NOT NULL,
  prayer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_daily_qt_date ON daily_qt(qt_date);

-- 3. qt_completions
CREATE TABLE IF NOT EXISTS qt_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  qt_date DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, qt_date)
);

-- 4. ask_conversations
CREATE TABLE IF NOT EXISTS ask_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ask_messages
CREATE TABLE IF NOT EXISTS ask_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ask_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. reading_plans
CREATE TABLE IF NOT EXISTS reading_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_days INT NOT NULL,
  schedule JSONB NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. user_plans
CREATE TABLE IF NOT EXISTS user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES reading_plans(id),
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  current_day INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. plan_progress
CREATE TABLE IF NOT EXISTS plan_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_plan_id UUID NOT NULL REFERENCES user_plans(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_plan_id, day_number)
);

-- 9. groups
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  leader_id UUID NOT NULL REFERENCES profiles(id),
  today_scripture JSONB,
  max_members INT NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. group_members
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 11. notes
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  qt_date DATE,
  book TEXT,
  chapter INT,
  verse_start INT,
  verse_end INT,
  content TEXT NOT NULL,
  tags TEXT[],
  is_shared BOOLEAN NOT NULL DEFAULT false,
  shared_to_group_id UUID REFERENCES groups(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. group_sharings
CREATE TABLE IF NOT EXISTS group_sharings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note_id UUID REFERENCES notes(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. sharing_reactions
CREATE TABLE IF NOT EXISTS sharing_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sharing_id UUID NOT NULL REFERENCES group_sharings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'amen' CHECK (reaction_type IN ('amen', 'pray', 'love')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sharing_id, user_id, reaction_type)
);

-- 14. sharing_comments
CREATE TABLE IF NOT EXISTS sharing_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sharing_id UUID NOT NULL REFERENCES group_sharings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. sermon_analyses
CREATE TABLE IF NOT EXISTS sermon_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sermon_id UUID NOT NULL REFERENCES sermons(id) ON DELETE CASCADE,
  scores JSONB NOT NULL,
  feedback TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. sermon_permissions
CREATE TABLE IF NOT EXISTS sermon_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES profiles(id),
  permission_type TEXT NOT NULL DEFAULT 'full_sermon',
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission_type)
);

-- 17. churches
CREATE TABLE IF NOT EXISTS churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  pastor_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. worship_types
CREATE TABLE IF NOT EXISTS worship_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  day_of_week INT,
  time TIME,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. attendance
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  worship_type_id UUID NOT NULL REFERENCES worship_types(id),
  attend_date DATE NOT NULL,
  check_method TEXT NOT NULL DEFAULT 'manual',
  checked_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, worship_type_id, attend_date)
);

-- 20. visitations
CREATE TABLE IF NOT EXISTS visitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL REFERENCES profiles(id),
  visitee_id UUID REFERENCES profiles(id),
  visitee_name TEXT,
  visit_date DATE NOT NULL,
  visit_type TEXT NOT NULL,
  content TEXT NOT NULL,
  prayer_requests TEXT,
  follow_up TEXT,
  follow_up_date DATE,
  follow_up_done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. offerings
CREATE TABLE IF NOT EXISTS offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  offering_date DATE NOT NULL,
  amount INT NOT NULL,
  offering_type TEXT NOT NULL,
  memo TEXT,
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. budget_items
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT,
  category TEXT NOT NULL,
  category_detail TEXT,
  budget_amount INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23. expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  budget_item_id UUID REFERENCES budget_items(id),
  expense_date DATE NOT NULL,
  amount INT NOT NULL,
  description TEXT NOT NULL,
  receipt_url TEXT,
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'recorded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 24. newcomers
CREATE TABLE IF NOT EXISTS newcomers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  phone TEXT,
  first_visit_date DATE NOT NULL,
  referrer TEXT,
  interests TEXT,
  stage TEXT NOT NULL DEFAULT 'first_visit',
  assigned_to UUID REFERENCES profiles(id),
  district TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS 활성화 (이미 활성화된 테이블은 무시됨)
ALTER TABLE daily_qt ENABLE ROW LEVEL SECURITY;
ALTER TABLE qt_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ask_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ask_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_sharings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermon_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermon_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE worship_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE newcomers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_progress ENABLE ROW LEVEL SECURITY;

-- RLS 정책은 Supabase 대시보드에서 별도 설정
