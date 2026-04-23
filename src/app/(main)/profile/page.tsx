"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Role = "member" | "pastor" | "admin";
type Tier = "free" | "premium" | "premium_plus" | "pastor" | "church";

interface Profile {
  name: string | null;
  role: Role;
  subscription_tier: Tier;
  qt_streak: number;
  qt_total_days: number;
  church_name: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setEmail(user.email || "");

    const { data } = await supabase
      .from("profiles")
      .select("name, role, subscription_tier, qt_streak, qt_total_days, church_name")
      .eq("id", user.id)
      .single();

    if (data) setProfile(data as Profile);
    setLoading(false);
  }

  async function handleLogout() {
    if (!confirm("로그아웃 하시겠습니까?")) return;
    await supabase.auth.signOut();
    router.push("/login");
  }

  const tierLabels: Record<Tier, { label: string; color: string }> = {
    free: { label: "무료", color: "bg-mid-gray" },
    premium: { label: "Premium", color: "bg-gold" },
    premium_plus: { label: "Premium+", color: "bg-gold" },
    pastor: { label: "Pastor", color: "bg-green" },
    church: { label: "Church", color: "bg-green-dark" },
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-mid-gray">불러오는 중...</p></div>;

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center">
          <p className="text-mid-gray text-sm mb-4">로그인이 필요합니다.</p>
          <Link href="/login" className="inline-block px-5 py-2.5 bg-green text-white rounded-lg font-medium text-sm">로그인</Link>
        </div>
      </div>
    );
  }

  const tier = tierLabels[profile.subscription_tier];
  const displayName = profile.name || email.split("@")[0] || "사용자";

  return (
    <div className="px-5 pt-6">
      <h1 className="text-xl font-bold text-green-dark mb-6">프로필</h1>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 text-center">
        <div className="w-20 h-20 rounded-full bg-green-dark text-white flex items-center justify-center text-3xl font-bold mx-auto mb-3">
          {displayName[0]}
        </div>
        <h2 className="text-lg font-bold text-charcoal">{displayName}</h2>
        <p className="text-xs text-mid-gray mt-1">{email}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full text-white font-medium ${tier.color}`}>
            {tier.label}
          </span>
          {profile.role === "pastor" && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gold/20 text-gold font-medium">
              목회자
            </span>
          )}
          {profile.church_name && (
            <span className="text-xs text-mid-gray">{profile.church_name}</span>
          )}
        </div>
      </div>

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

      {(profile.subscription_tier === "free" || profile.subscription_tier === "premium") && (
        <div className="bg-green-dark text-white rounded-2xl p-5 mb-4">
          {profile.subscription_tier === "free" ? (
            <>
              <h3 className="font-bold mb-1">Premium으로 업그레이드</h3>
              <p className="text-light-gray text-sm mb-3">
                5분 설교 월 4회, AI 질문 월 30회, 소그룹 생성
              </p>
              <button className="px-5 py-2 bg-gold text-charcoal font-bold rounded-lg text-sm">
                월 4,900원으로 시작
              </button>
            </>
          ) : (
            <>
              <h3 className="font-bold mb-1">Premium+로 업그레이드</h3>
              <p className="text-light-gray text-sm mb-3">
                5분 설교 월 10회, AI 질문 무제한
              </p>
              <button className="px-5 py-2 bg-gold text-charcoal font-bold rounded-lg text-sm">
                월 9,900원으로 업그레이드
              </button>
            </>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
        {[
          { href: "/join", label: profile.church_name ? "교회 변경" : "교회 가입", icon: "⛪" },
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

      {profile.role === "pastor" && (
        <Link
          href="/admin"
          className="block w-full py-3 mb-3 bg-green text-white text-center rounded-xl text-sm font-medium"
        >
          ⚙️ 관리 대시보드로 이동
        </Link>
      )}

      <button
        onClick={handleLogout}
        className="w-full py-3 text-mid-gray text-sm border border-light-gray rounded-xl"
      >
        로그아웃
      </button>
    </div>
  );
}
