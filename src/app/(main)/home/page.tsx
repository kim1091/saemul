"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface TodayQt {
  book: string;
  chapter: number;
  verse_start: number;
  verse_end: number;
  commentary?: { key_message?: string };
}

interface MyGroup {
  id: string;
  name: string;
  latestSharing?: string;
  latestAuthor?: string;
}

export default function HomePage() {
  const [displayName, setDisplayName] = useState("");
  const [churchName, setChurchName] = useState<string | null>(null);
  const [role, setRole] = useState<string>("member");
  const [tier, setTier] = useState<string>("free");
  const [todayQt, setTodayQt] = useState<TodayQt | null>(null);
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }

    const { data } = await supabase
      .from("profiles")
      .select("name, church_name, onboarded, role, subscription_tier")
      .eq("id", user.id)
      .single();

    if (data && !data.onboarded) { window.location.href = "/onboarding"; return; }

    setDisplayName(data?.name || user.email?.split("@")[0] || "사용자");
    setChurchName(data?.church_name || null);
    setRole(data?.role || "member");
    setTier(data?.subscription_tier || "free");

    // 오늘의 큐티
    try {
      const res = await fetch("/api/qt/today");
      if (res.ok) setTodayQt(await res.json());
    } catch {}

    // 내 소그룹
    try {
      const { data: memberships } = await supabase
        .from("group_members").select("group_id").eq("user_id", user.id);
      const groupIds = (memberships || []).map((m) => m.group_id);

      if (groupIds.length > 0) {
        const { data: groups } = await supabase
          .from("groups").select("id, name").in("id", groupIds);

        const result: MyGroup[] = [];
        for (const g of groups || []) {
          const { data: latest } = await supabase
            .from("group_sharings").select("content, user_id")
            .eq("group_id", g.id).order("created_at", { ascending: false }).limit(1);
          const sharing = latest?.[0];
          let authorName = "";
          if (sharing) {
            const { data: prof } = await supabase
              .from("profiles").select("name").eq("id", sharing.user_id).single();
            authorName = prof?.name || "";
          }
          result.push({ id: g.id, name: g.name, latestSharing: sharing?.content, latestAuthor: authorName });
        }
        setMyGroups(result);
      }
    } catch {}

    setLoading(false);
  }

  const isPastor = role === "pastor" || role === "admin";

  return (
    <div className="px-5 pt-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-green-dark">샘물</h1>
          <p className="text-mid-gray text-sm mt-0.5">{today}</p>
          {churchName && <p className="text-xs text-gold mt-1">⛪ {churchName}</p>}
        </div>
        <Link href="/profile"
          className="w-10 h-10 rounded-full bg-green-dark text-white flex items-center justify-center text-lg font-bold">
          {displayName ? displayName[0].toUpperCase() : "?"}
        </Link>
      </div>

      {/* 교회 가입 안내 */}
      {!loading && !churchName && (
        <Link href="/join" className="block">
          <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⛪</span>
              <div className="flex-1">
                <p className="font-bold text-gold text-sm">교회에 가입하세요</p>
                <p className="text-charcoal text-xs mt-0.5">교회 이름 검색 또는 초대 코드로 쉽게 가입</p>
              </div>
              <span className="text-gold">→</span>
            </div>
          </div>
        </Link>
      )}

      {/* ━━ 목회자: 설교공방 섹션 ━━ */}
      {isPastor && (
        <>
          {/* 설교공방 대시보드 */}
          <div className="bg-gradient-to-br from-[#4a3728] to-[#2d1a10] text-white rounded-2xl p-5 mb-4 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[#c9a84c] text-xs tracking-wider">설교 공방</p>
                <h2 className="text-lg font-bold mt-0.5">설교를 준비하세요</h2>
              </div>
              <span className="text-3xl">🔨</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <Link href="/sermon/create"
                className="bg-white/10 rounded-xl p-3 hover:bg-white/20 transition text-center">
                <span className="text-xl">✍️</span>
                <p className="text-xs font-medium mt-1">설교 만들기</p>
              </Link>
              <Link href="/sermon"
                className="bg-white/10 rounded-xl p-3 hover:bg-white/20 transition text-center">
                <span className="text-xl">📚</span>
                <p className="text-xs font-medium mt-1">설교함</p>
              </Link>
              <Link href="/sermon/calendar"
                className="bg-white/10 rounded-xl p-3 hover:bg-white/20 transition text-center">
                <span className="text-xl">📅</span>
                <p className="text-xs font-medium mt-1">절기 달력</p>
              </Link>
              <Link href="/sermon/checklist"
                className="bg-white/10 rounded-xl p-3 hover:bg-white/20 transition text-center">
                <span className="text-xl">✅</span>
                <p className="text-xs font-medium mt-1">체크리스트</p>
              </Link>
            </div>

            <Link href="/admin"
              className="block w-full text-center py-2 bg-[#c9a84c] text-[#2d1a10] rounded-lg text-sm font-bold">
              교회 관리 →
            </Link>
          </div>
        </>
      )}

      {/* ━━ 오늘의 큐티 카드 (모든 역할) ━━ */}
      <Link href="/qt" className="block">
        <div className="bg-green-dark text-white rounded-2xl p-6 mb-4 shadow-md">
          <p className="text-gold text-xs tracking-wider mb-2">오늘의 큐티</p>
          {todayQt ? (
            <>
              <h2 className="text-xl font-bold mb-1">
                {todayQt.book} {todayQt.chapter}:{todayQt.verse_start}-{todayQt.verse_end}
              </h2>
              <p className="text-light-gray text-sm mb-4 line-clamp-2">
                {todayQt.commentary?.key_message || "오늘의 묵상을 시작하세요"}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-1">오늘의 말씀</h2>
              <p className="text-light-gray text-sm mb-4">AI가 준비한 큐티를 묵상해보세요</p>
            </>
          )}
          <span className="inline-block bg-gold text-charcoal text-sm font-bold px-4 py-2 rounded-lg">
            큐티하러 가기
          </span>
        </div>
      </Link>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link href="/ask" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition">
          <span className="text-2xl">💬</span>
          <p className="font-bold text-green-dark mt-2">AI 질문</p>
          <p className="text-mid-gray text-xs mt-0.5">성경 궁금증 해결</p>
        </Link>
        <Link href="/note" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition">
          <span className="text-2xl">📝</span>
          <p className="font-bold text-green-dark mt-2">묵상 노트</p>
          <p className="text-mid-gray text-xs mt-0.5">오늘의 깨달음 기록</p>
        </Link>
        {!isPastor && (
          <>
            <Link href="/plan" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition">
              <span className="text-2xl">📅</span>
              <p className="font-bold text-green-dark mt-2">읽기 플랜</p>
              <p className="text-mid-gray text-xs mt-0.5">성경 통독 계획</p>
            </Link>
            {tier !== "free" ? (
              <Link href="/sermon/create" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition">
                <span className="text-2xl">🎤</span>
                <p className="font-bold text-green-dark mt-2">설교</p>
                <p className="text-mid-gray text-xs mt-0.5">5분 설교 만들기</p>
              </Link>
            ) : (
              <Link href="/profile" className="bg-cream rounded-xl p-4 shadow-sm hover:shadow-md transition border border-light-gray">
                <span className="text-2xl">🎤</span>
                <p className="font-bold text-gold mt-2">5분 설교</p>
                <p className="text-mid-gray text-xs mt-0.5">Premium부터 이용</p>
              </Link>
            )}
          </>
        )}
        {isPastor && (
          <>
            <Link href="/plan" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition">
              <span className="text-2xl">📅</span>
              <p className="font-bold text-green-dark mt-2">읽기 플랜</p>
              <p className="text-mid-gray text-xs mt-0.5">성경 통독 계획</p>
            </Link>
            <Link href="/sermon/tools" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition">
              <span className="text-2xl">🛠️</span>
              <p className="font-bold text-green-dark mt-2">설교 도구</p>
              <p className="text-mid-gray text-xs mt-0.5">주보·시리즈·유튜브</p>
            </Link>
          </>
        )}
      </div>

      {/* 소그룹 나눔 (모든 역할) */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-green-dark">소그룹 나눔</h3>
          <Link href="/group" className="text-sm text-gold font-medium">전체보기</Link>
        </div>
        {myGroups.length > 0 ? (
          <div className="space-y-3">
            {myGroups.map((g) => (
              <Link key={g.id} href={`/group/${g.id}`} className="block">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green/10 text-green flex items-center justify-center text-sm font-bold shrink-0">
                    {g.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-charcoal">{g.name}</p>
                    {g.latestSharing ? (
                      <p className="text-xs text-mid-gray mt-0.5 line-clamp-1">
                        {g.latestAuthor}: {g.latestSharing}
                      </p>
                    ) : (
                      <p className="text-xs text-mid-gray mt-0.5">아직 나눔이 없습니다</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <>
            <p className="text-mid-gray text-sm">아직 소그룹에 참여하지 않았습니다.</p>
            <Link href="/group" className="inline-block mt-3 text-sm text-green font-medium">
              소그룹 찾아보기 →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
