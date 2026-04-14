-- ============================================
-- 샘물 교회 종합 플랫폼 — 전체 DB 스키마
-- ============================================

-- 1. profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'pastor', 'admin')),
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'pastor', 'church')),
  subscription_expires_at TIMESTAMPTZ,
  daily_ask_count INT NOT NULL DEFAULT 0,
  daily_ask_reset_at DATE NOT NULL DEFAULT CURRENT_DATE,
  qt_streak INT NOT NULL DEFAULT 0,
  qt_total_days INT NOT NULL DEFAULT 0,
  last_qt_date DATE,
  reminder_time TIME DEFAULT '06:00',
  church_id UUID,
  church_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. daily_qt (6단계 큐티)
CREATE TABLE daily_qt (
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
CREATE INDEX idx_daily_qt_date ON daily_qt(qt_date);

-- 3. qt_completions
CREATE TABLE qt_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  qt_date DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, qt_date)
);
CREATE INDEX idx_qt_completions_user ON qt_completions(user_id, qt_date);

-- 4. ask_conversations
CREATE TABLE ask_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ask_messages
CREATE TABLE ask_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ask_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ask_messages_conv ON ask_messages(conversation_id, created_at);

-- 6. reading_plans
CREATE TABLE reading_plans (
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
CREATE TABLE user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES reading_plans(id),
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  current_day INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. plan_progress
CREATE TABLE plan_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_plan_id UUID NOT NULL REFERENCES user_plans(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_plan_id, day_number)
);

-- 9. groups
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  leader_id UUID NOT NULL REFERENCES profiles(id),
  today_scripture JSONB,
  max_members INT NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_groups_invite ON groups(invite_code);

-- 10. group_members
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);
CREATE INDEX idx_group_members_user ON group_members(user_id);

-- 11. notes
CREATE TABLE notes (
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
CREATE INDEX idx_notes_user ON notes(user_id, created_at DESC);

-- 12. group_sharings
CREATE TABLE group_sharings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note_id UUID REFERENCES notes(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_group_sharings_group ON group_sharings(group_id, created_at DESC);

-- 13. sharing_reactions
CREATE TABLE sharing_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sharing_id UUID NOT NULL REFERENCES group_sharings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'amen' CHECK (reaction_type IN ('amen', 'pray', 'love')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sharing_id, user_id, reaction_type)
);

-- 14. sharing_comments
CREATE TABLE sharing_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sharing_id UUID NOT NULL REFERENCES group_sharings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. sermons
CREATE TABLE sermons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sermon_type TEXT NOT NULL CHECK (sermon_type IN ('quick', 'full')),
  book TEXT NOT NULL,
  chapter INT NOT NULL,
  verse_start INT NOT NULL,
  verse_end INT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  duration_minutes INT NOT NULL,
  audience TEXT,
  tone TEXT,
  qt_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. sermon_analyses
CREATE TABLE sermon_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sermon_id UUID NOT NULL REFERENCES sermons(id) ON DELETE CASCADE,
  scores JSONB NOT NULL,
  feedback TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. sermon_permissions
CREATE TABLE sermon_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES profiles(id),
  permission_type TEXT NOT NULL DEFAULT 'full_sermon' CHECK (permission_type IN ('full_sermon')),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission_type)
);

-- 18. churches
CREATE TABLE churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  pastor_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- profiles.church_id FK (churches 생성 후)
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_church FOREIGN KEY (church_id) REFERENCES churches(id);

-- 19. worship_types
CREATE TABLE worship_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  day_of_week INT,
  time TIME,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. attendance
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  worship_type_id UUID NOT NULL REFERENCES worship_types(id),
  attend_date DATE NOT NULL,
  check_method TEXT NOT NULL DEFAULT 'manual' CHECK (check_method IN ('manual', 'qr')),
  checked_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, worship_type_id, attend_date)
);
CREATE INDEX idx_attendance_church_date ON attendance(church_id, attend_date);
CREATE INDEX idx_attendance_user ON attendance(user_id, attend_date);

-- 21. visitations
CREATE TABLE visitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL REFERENCES profiles(id),
  visitee_id UUID REFERENCES profiles(id),
  visitee_name TEXT,
  visit_date DATE NOT NULL,
  visit_type TEXT NOT NULL CHECK (visit_type IN ('regular', 'patient', 'newcomer', 'comfort', 'other')),
  content TEXT NOT NULL,
  prayer_requests TEXT,
  follow_up TEXT,
  follow_up_date DATE,
  follow_up_done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_visitations_church ON visitations(church_id, visit_date DESC);

-- 22. offerings
CREATE TABLE offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  offering_date DATE NOT NULL,
  amount INT NOT NULL,
  offering_type TEXT NOT NULL CHECK (offering_type IN ('tithe', 'thanksgiving', 'mission', 'building', 'district', 'special', 'other')),
  memo TEXT,
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_offerings_church_date ON offerings(church_id, offering_date);
CREATE INDEX idx_offerings_user ON offerings(user_id, offering_date);

-- 23. budget_items
CREATE TABLE budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT,
  category TEXT NOT NULL CHECK (category IN ('salary', 'ministry', 'mission', 'facility', 'education', 'other')),
  category_detail TEXT,
  budget_amount INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(church_id, year, month, category, category_detail)
);

-- 24. expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  budget_item_id UUID REFERENCES budget_items(id),
  expense_date DATE NOT NULL,
  amount INT NOT NULL,
  description TEXT NOT NULL,
  receipt_url TEXT,
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded', 'approved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_expenses_church_date ON expenses(church_id, expense_date);

-- 25. newcomers
CREATE TABLE newcomers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  phone TEXT,
  first_visit_date DATE NOT NULL,
  referrer TEXT,
  interests TEXT,
  stage TEXT NOT NULL DEFAULT 'first_visit' CHECK (stage IN ('first_visit', 'newcomer_class', 'settling', 'assigned')),
  assigned_to UUID REFERENCES profiles(id),
  district TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_newcomers_church ON newcomers(church_id, first_visit_date DESC);

-- ============================================
-- Auth trigger: 회원가입 시 profiles 자동 생성
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', NULL)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RLS 정책
-- ============================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- daily_qt
ALTER TABLE daily_qt ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read qt" ON daily_qt FOR SELECT USING (auth.role() = 'authenticated');

-- qt_completions
ALTER TABLE qt_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own completions" ON qt_completions FOR ALL USING (auth.uid() = user_id);

-- ask_conversations
ALTER TABLE ask_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own conversations" ON ask_conversations FOR ALL USING (auth.uid() = user_id);

-- ask_messages
ALTER TABLE ask_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own messages" ON ask_messages FOR ALL USING (
  conversation_id IN (SELECT id FROM ask_conversations WHERE user_id = auth.uid())
);

-- notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own notes" ON notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Group members read shared notes" ON notes FOR SELECT USING (
  is_shared = true AND shared_to_group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);

-- groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view group" ON groups FOR SELECT USING (
  id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);
CREATE POLICY "Leader update group" ON groups FOR UPDATE USING (leader_id = auth.uid());
CREATE POLICY "Auth users create group" ON groups FOR INSERT WITH CHECK (auth.uid() = leader_id);

-- group_members
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view members" ON group_members FOR SELECT USING (
  group_id IN (SELECT group_id FROM group_members gm WHERE gm.user_id = auth.uid())
);
CREATE POLICY "Users join groups" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users leave groups" ON group_members FOR DELETE USING (auth.uid() = user_id);

-- group_sharings
ALTER TABLE group_sharings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read sharings" ON group_sharings FOR SELECT USING (
  group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);
CREATE POLICY "Members create sharings" ON group_sharings FOR INSERT WITH CHECK (
  auth.uid() = user_id AND group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);

-- sermons
ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own sermons" ON sermons FOR ALL USING (auth.uid() = user_id);

-- attendance (성도: 본인만, 목회자: 같은 교회 전체)
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own attendance" ON attendance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Pastor manage attendance" ON attendance FOR ALL USING (
  church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid() AND role IN ('pastor', 'admin'))
);

-- offerings (성도: 본인만, 목회자: 같은 교회 전체)
ALTER TABLE offerings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own offerings" ON offerings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Pastor manage offerings" ON offerings FOR ALL USING (
  church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid() AND role IN ('pastor', 'admin'))
);

-- visitations (목회자만)
ALTER TABLE visitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pastor manage visitations" ON visitations FOR ALL USING (
  church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid() AND role IN ('pastor', 'admin'))
);

-- newcomers (목회자만)
ALTER TABLE newcomers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pastor manage newcomers" ON newcomers FOR ALL USING (
  church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid() AND role IN ('pastor', 'admin'))
);

-- churches
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pastor manage church" ON churches FOR ALL USING (pastor_id = auth.uid());
CREATE POLICY "Members view church" ON churches FOR SELECT USING (
  id IN (SELECT church_id FROM profiles WHERE id = auth.uid())
);

-- worship_types
ALTER TABLE worship_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Church members view" ON worship_types FOR SELECT USING (
  church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Pastor manage" ON worship_types FOR ALL USING (
  church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid() AND role IN ('pastor', 'admin'))
);

-- budget_items, expenses (목회자만)
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pastor manage budget" ON budget_items FOR ALL USING (
  church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid() AND role IN ('pastor', 'admin'))
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pastor manage expenses" ON expenses FOR ALL USING (
  church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid() AND role IN ('pastor', 'admin'))
);

-- sermon_permissions, sermon_analyses
ALTER TABLE sermon_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own perms" ON sermon_permissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Pastor manage perms" ON sermon_permissions FOR ALL USING (
  granted_by = auth.uid()
);

ALTER TABLE sermon_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner view analysis" ON sermon_analyses FOR SELECT USING (
  sermon_id IN (SELECT id FROM sermons WHERE user_id = auth.uid())
);

-- reading_plans (공개 플랜은 모두 읽기)
ALTER TABLE reading_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public plans readable" ON reading_plans FOR SELECT USING (is_public = true);

-- user_plans, plan_progress
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own plans" ON user_plans FOR ALL USING (auth.uid() = user_id);

ALTER TABLE plan_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own progress" ON plan_progress FOR ALL USING (
  user_plan_id IN (SELECT id FROM user_plans WHERE user_id = auth.uid())
);

-- sharing_reactions, sharing_comments
ALTER TABLE sharing_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage reactions" ON sharing_reactions FOR ALL USING (
  sharing_id IN (
    SELECT gs.id FROM group_sharings gs
    JOIN group_members gm ON gs.group_id = gm.group_id
    WHERE gm.user_id = auth.uid()
  )
);

ALTER TABLE sharing_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage comments" ON sharing_comments FOR ALL USING (
  sharing_id IN (
    SELECT gs.id FROM group_sharings gs
    JOIN group_members gm ON gs.group_id = gm.group_id
    WHERE gm.user_id = auth.uid()
  )
);
