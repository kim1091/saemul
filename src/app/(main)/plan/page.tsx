"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

interface ReadingPlan {
  id: string;
  name: string;
  description: string | null;
  duration_days: number;
  schedule: Record<string, unknown>;
}

interface UserPlan {
  id: string;
  plan_id: string;
  current_day: number;
  is_active: boolean;
  started_at: string;
}

const PLAN_ICONS: Record<string, string> = {
  "1년 통독": "📚",
  "6개월 통독": "⚡",
  "신약 90일": "✝️",
  "시편 30일": "🎵",
};

export default function PlanPage() {
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [userPlan, setUserPlan] = useState<(UserPlan & { plan: ReadingPlan }) | null>(null);
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    // 공개 플랜 목록
    const { data: publicPlans } = await supabase
      .from("reading_plans")
      .select("*")
      .eq("is_public", true)
      .order("duration_days", { ascending: false });
    setPlans(publicPlans || []);

    // 내 활성 플랜
    if (user) {
      const { data: myPlan } = await supabase
        .from("user_plans")
        .select("*, plan:reading_plans(*)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (myPlan) {
        setUserPlan(myPlan as typeof userPlan);

        // 완료한 일수
        const { data: progress } = await supabase
          .from("plan_progress")
          .select("day_number")
          .eq("user_plan_id", myPlan.id);
        setCompletedDays((progress || []).map((p) => p.day_number));
      }
    }

    setLoading(false);
  }

  async function startPlan(planId: string) {
    if (!userId) return;

    // 기존 활성 플랜 비활성화
    if (userPlan) {
      await supabase
        .from("user_plans")
        .update({ is_active: false })
        .eq("id", userPlan.id);
    }

    await supabase.from("user_plans").insert({
      user_id: userId,
      plan_id: planId,
      is_active: true,
    });

    loadData();
  }

  async function markTodayDone() {
    if (!userPlan) return;

    const today = userPlan.current_day;
    if (completedDays.includes(today)) return;

    await supabase.from("plan_progress").insert({
      user_plan_id: userPlan.id,
      day_number: today,
    });

    await supabase
      .from("user_plans")
      .update({ current_day: today + 1 })
      .eq("id", userPlan.id);

    loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-mid-gray">불러오는 중...</p>
      </div>
    );
  }

  const progress = userPlan
    ? (completedDays.length / userPlan.plan.duration_days) * 100
    : 0;

  return (
    <div className="px-5 pt-6">
      <h1 className="text-xl font-bold text-green-dark mb-6">성경 읽기 플랜</h1>

      {userPlan && (
        <div className="bg-green-dark text-white rounded-2xl p-5 mb-6 shadow-md">
          <p className="text-gold text-xs tracking-wider mb-1">진행 중인 플랜</p>
          <h2 className="text-lg font-bold mb-2">
            {PLAN_ICONS[userPlan.plan.name] || "📖"} {userPlan.plan.name}
          </h2>

          <div className="bg-white/10 rounded-full h-3 mb-2">
            <div
              className="bg-gold rounded-full h-3 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-light-gray text-sm">
            {completedDays.length} / {userPlan.plan.duration_days}일 완료 (
            {Math.round(progress)}%)
          </p>

          <button
            onClick={markTodayDone}
            disabled={completedDays.includes(userPlan.current_day)}
            className="mt-4 px-5 py-2 bg-gold text-charcoal text-sm font-bold rounded-lg disabled:opacity-50"
          >
            {completedDays.includes(userPlan.current_day)
              ? "오늘 완료 ✓"
              : `${userPlan.current_day}일차 읽기 완료`}
          </button>
        </div>
      )}

      <h2 className="text-base font-bold text-charcoal mb-3">
        {userPlan ? "다른 플랜" : "플랜을 선택하세요"}
      </h2>

      <div className="space-y-3">
        {plans
          .filter((p) => p.id !== userPlan?.plan_id)
          .map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{PLAN_ICONS[plan.name] || "📖"}</span>
                <div className="flex-1">
                  <h3 className="font-bold text-green-dark">{plan.name}</h3>
                  <p className="text-mid-gray text-sm mt-0.5">{plan.description}</p>
                  <p className="text-xs text-gold mt-1">{plan.duration_days}일</p>
                </div>
                <button
                  onClick={() => startPlan(plan.id)}
                  disabled={!userId}
                  className="px-3 py-1.5 border border-green text-green text-sm font-medium rounded-lg hover:bg-green hover:text-white transition disabled:opacity-40"
                >
                  시작
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
