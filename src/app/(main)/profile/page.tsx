"use client";

import { useState } from "react";
import Link from "next/link";

export default function ProfilePage() {
  const [profile] = useState({
    display_name: "사용자",
    role: "member" as const,
    subscription_tier: "free" as const,
    qt_streak: 0,
    qt_total_days: 0,
    church_name: null as string | null,
  });

  const tierLabels = {
    free: { label: "무료", color: "bg-mid-gray" },
    premium: { label: "프리미엄", color: "bg-gold" },
    pastor: { label: "목회자", color: "bg-green" },
    church: { label: "교회", color: "bg-green-dark" },
  };

  const tier = tierLabels[profile.subscription_tier];

  return (
    <div className="px-5 pt-6">
      <h1 className="text-xl font-bold text-green-dark mb-6">프로필</h1>

      {/* 프로필 카드 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 text-center">
        <div className="w-20 h-20 rounded-full bg-green-dark text-white flex items-center justify-center text-3xl font-bold mx-auto mb-3">
          {profile.display_name[0]}
        </div>
        <h2 className="text-lg font-bold text-charcoal">{profile.display_name}</h2>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className={`text-xs px-2 py-0.5 rounded-full text-white font-medium ${tier.color}`}>
            {tier.label}
          </span>
          {profile.church_name && (
            <span className="text-xs text-mid-gray">{profile.church_name}</span>
          )}
        </div>
      </div>

      {/* 큐티 통계 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
        <h3 className="font-bold text-charcoal text-sm mb-3">큐티 통계</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green">{profile.qt_streak}</p>
            <p className="text-xs text-mid-gray">연속 일수</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gold">{profile.qt_total_days}</p>
            <p className="text-xs text-mid-gray">총 큐티 일수</p>
          </div>
        </div>
      </div>

      {/* 구독 */}
      {profile.subscription_tier === "free" && (
        <div className="bg-green-dark text-white rounded-2xl p-5 mb-4">
          <h3 className="font-bold mb-1">프리미엄으로 업그레이드</h3>
          <p className="text-light-gray text-sm mb-3">
            무제한 AI 질문, 소그룹 생성, 무제한 설교
          </p>
          <button className="px-5 py-2 bg-gold text-charcoal font-bold rounded-lg text-sm">
            월 4,900원으로 시작
          </button>
        </div>
      )}

      {/* 메뉴 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
        {[
          { href: "/my/attendance", label: "내 출석 현황", icon: "📋" },
          { href: "/my/offering", label: "내 헌금 내역", icon: "💰" },
          { href: "/plan", label: "읽기 플랜", icon: "📅" },
          { href: "/note", label: "묵상 노트", icon: "📝" },
        ].map((item, i) => (
          <Link key={item.href} href={item.href}>
            <div className={`flex items-center justify-between px-5 py-3.5 ${
              i > 0 ? "border-t border-light-gray/50" : ""
            }`}>
              <div className="flex items-center gap-3">
                <span>{item.icon}</span>
                <span className="text-sm text-charcoal">{item.label}</span>
              </div>
              <span className="text-mid-gray text-xs">→</span>
            </div>
          </Link>
        ))}
      </div>

      {/* 로그아웃 */}
      <button className="w-full py-3 text-mid-gray text-sm border border-light-gray rounded-xl">
        로그아웃
      </button>
    </div>
  );
}
