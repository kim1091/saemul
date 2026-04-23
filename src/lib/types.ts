export type UserRole = "member" | "pastor" | "admin";
export type SubscriptionTier = "free" | "premium" | "premium_plus" | "pastor" | "church";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  subscription_tier: SubscriptionTier;
  subscription_expires_at: string | null;
  daily_ask_count: number;
  daily_ask_reset_at: string;
  qt_streak: number;
  qt_total_days: number;
  last_qt_date: string | null;
  reminder_time: string;
  church_id: string | null;
  church_name: string | null;
  phone: string | null;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyQt {
  id: string;
  qt_date: string;
  book: string;
  chapter: number;
  verse_start: number;
  verse_end: number;
  scripture_text: string;
  commentary: {
    background: string;
    key_message: string;
    context: string;
  };
  observation_general: { question: string; hint: string }[];
  observation_key: { word: string; question: string; hint: string }[];
  interpretation: { question: string; hint: string }[];
  application: { question: string; hint: string }[];
  prayer: string;
}

export interface Church {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  pastor_id: string;
  created_at: string;
}
