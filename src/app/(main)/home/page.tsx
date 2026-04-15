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

export default function HomePage() {
  const [displayName, setDisplayName] = useState("");
  const [churchName, setChurchName] = useState<string | null>(null);
  const [todayQt, setTodayQt] = useState<TodayQt | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("name, church_name")
        .eq("id", user.id)
        .single();
      const n = data?.name || user.email?.split("@")[0] || "사용자";
      setDisplayName(n);
      setChurchName(data?.church_name || null);
    }

    // 오늘의 큐티
    const res = await fetch("/api/qt/today");
    if (res.ok) {
      const qt = await res.json();
      setTodayQt(qt);
    }

    setLoading(false);
  }

  return (
    <div className="px-5 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-green-dark">샘물</h1>
          <p className="text-mid-gray text-sm mt-0.5">{today}</p>
          {churchName && (
            <p className="text-xs text-gold mt-1">⛪ {churchName}</p>
          )}
        </div>
        <Link
          href="/profile"
          className="w-10 h-10 rounded-full bg-green-dark text-white flex items-center justify-center text-lg font-bold"
        >
          {displayName ? displayName[0].toUpperCase() : "?"}
        </Link>
      </div>

      {/* 교회 가입 안내 (소속 없을 때만) */}
      {!loading && !churchName && (
        <Link href="/join" className="block">
          <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⛪</span>
              <div className="flex-1">
                <p className="font-bold text-gold text-sm">교회에 가입하세요</p>
                <p className="text-charcoal text-xs mt-0.5">
                  교회 이름 검색 또는 초대 코드로 쉽게 가입
                </p>
              </div>
              <span className="text-gold">→</span>
            </div>
          </div>
        </Link>
      )}

      {/* 오늘의 큐티 카드 */}
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
              <p className="text-light-gray text-sm mb-4">
                AI가 준비한 큐티를 묵상해보세요
              </p>
            </>
          )}
          <span className="inline-block bg-gold text-charcoal text-sm font-bold px-4 py-2 rounded-lg">
            큐티하러 가기
          </span>
        </div>
      </Link>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link
          href="/ask"
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition"
        >
          <span className="text-2xl">💬</span>
          <p className="font-bold text-green-dark mt-2">AI 질문</p>
          <p className="text-mid-gray text-xs mt-0.5">성경 궁금증 해결</p>
        </Link>

        <Link
          href="/note"
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition"
        >
          <span className="text-2xl">📝</span>
          <p className="font-bold text-green-dark mt-2">묵상 노트</p>
          <p className="text-mid-gray text-xs mt-0.5">오늘의 깨달음 기록</p>
        </Link>

        <Link
          href="/plan"
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition"
        >
          <span className="text-2xl">📅</span>
          <p className="font-bold text-green-dark mt-2">읽기 플랜</p>
          <p className="text-mid-gray text-xs mt-0.5">성경 통독 계획</p>
        </Link>

        <Link
          href="/sermon/create"
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition"
        >
          <span className="text-2xl">🎤</span>
          <p className="font-bold text-green-dark mt-2">설교</p>
          <p className="text-mid-gray text-xs mt-0.5">5분 설교 만들기</p>
        </Link>
      </div>

      {/* 소그룹 미리보기 */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-green-dark">소그룹 나눔</h3>
          <Link href="/group" className="text-sm text-gold font-medium">
            전체보기
          </Link>
        </div>
        <p className="text-mid-gray text-sm">
          아직 소그룹에 참여하지 않았습니다.
        </p>
        <Link
          href="/group"
          className="inline-block mt-3 text-sm text-green font-medium"
        >
          소그룹 찾아보기 →
        </Link>
      </div>
    </div>
  );
}
