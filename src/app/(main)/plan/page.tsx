"use client";

import { useState } from "react";

const PLANS = [
  {
    id: "1year",
    name: "1년 통독",
    description: "매일 3-4장씩 읽어 1년 안에 성경 전체를 통독합니다",
    duration: 365,
    icon: "📚",
  },
  {
    id: "6month",
    name: "6개월 통독",
    description: "매일 6-7장씩 집중적으로 읽는 통독 플랜",
    duration: 180,
    icon: "⚡",
  },
  {
    id: "newtest90",
    name: "신약 90일",
    description: "90일 동안 신약 27권을 완독하는 플랜",
    duration: 90,
    icon: "✝️",
  },
  {
    id: "psalms30",
    name: "시편 30일",
    description: "30일 동안 시편을 묵상하는 플랜",
    duration: 30,
    icon: "🎵",
  },
];

export default function PlanPage() {
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  function startPlan(planId: string) {
    setActivePlan(planId);
    setProgress(0);
    // TODO: Supabase에 저장
  }

  const active = PLANS.find((p) => p.id === activePlan);

  return (
    <div className="px-5 pt-6">
      <h1 className="text-xl font-bold text-green-dark mb-6">성경 읽기 플랜</h1>

      {/* Active Plan */}
      {active && (
        <div className="bg-green-dark text-white rounded-2xl p-5 mb-6 shadow-md">
          <p className="text-gold text-xs tracking-wider mb-1">진행 중인 플랜</p>
          <h2 className="text-lg font-bold mb-2">
            {active.icon} {active.name}
          </h2>

          <div className="bg-white/10 rounded-full h-3 mb-2">
            <div
              className="bg-gold rounded-full h-3 transition-all"
              style={{ width: `${(progress / active.duration) * 100}%` }}
            />
          </div>
          <p className="text-light-gray text-sm">
            {progress} / {active.duration}일 완료 (
            {Math.round((progress / active.duration) * 100)}%)
          </p>

          <button
            onClick={() => setProgress((p) => Math.min(p + 1, active.duration))}
            className="mt-4 px-5 py-2 bg-gold text-charcoal text-sm font-bold rounded-lg"
          >
            오늘 읽기 완료 ✓
          </button>
        </div>
      )}

      {/* Plan List */}
      <h2 className="text-base font-bold text-charcoal mb-3">
        {activePlan ? "다른 플랜" : "플랜을 선택하세요"}
      </h2>

      <div className="space-y-3">
        {PLANS.filter((p) => p.id !== activePlan).map((plan) => (
          <div key={plan.id} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{plan.icon}</span>
              <div className="flex-1">
                <h3 className="font-bold text-green-dark">{plan.name}</h3>
                <p className="text-mid-gray text-sm mt-0.5">
                  {plan.description}
                </p>
                <p className="text-xs text-gold mt-1">{plan.duration}일</p>
              </div>
              <button
                onClick={() => startPlan(plan.id)}
                className="px-3 py-1.5 border border-green text-green text-sm font-medium rounded-lg hover:bg-green hover:text-white transition"
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
