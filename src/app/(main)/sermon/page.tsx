"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface Sermon {
  id: string;
  title: string | null;
  book: string | null;
  chapter: number | null;
  verse_start: number | null;
  verse_end: number | null;
  passage: string | null;
  sermon_type: string;
  duration_minutes: number;
  created_at: string;
  user_id: string;
}

export default function SermonListPage() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"mine" | "pastor">("mine");
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadSermons();
  }, [tab]);

  async function loadSermons() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
    if (!user) { setLoading(false); return; }

    let query = supabase
      .from("sermons")
      .select("id, title, book, chapter, verse_start, verse_end, passage, sermon_type, duration_minutes, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(50);

    if (tab === "mine") {
      query = query.eq("user_id", user.id);
    } else {
      // 목회자 설교 (full type, 나 이외)
      query = query.eq("sermon_type", "full").neq("user_id", user.id);
    }

    const { data } = await query;
    setSermons(data || []);
    setLoading(false);
  }

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-green-dark">설교</h1>
        <Link
          href="/sermon/create"
          className="px-4 py-2 bg-green text-white text-sm font-medium rounded-lg"
        >
          + 새 설교
        </Link>
      </div>

      {/* 보조 도구 */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        <Link href="/sermon/calendar" className="shrink-0 px-3 py-2 bg-white border border-light-gray rounded-lg text-xs font-medium text-mid-gray hover:border-green hover:text-green transition">
          📅 절기달력
        </Link>
        <Link href="/sermon/checklist" className="shrink-0 px-3 py-2 bg-white border border-light-gray rounded-lg text-xs font-medium text-mid-gray hover:border-green hover:text-green transition">
          ✅ 체크리스트
        </Link>
      </div>

      {/* 탭: 내 설교 / 목회자 설교 */}
      <div className="flex bg-white rounded-xl p-1 mb-4 shadow-sm">
        <button
          onClick={() => setTab("mine")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            tab === "mine" ? "bg-green text-white" : "text-mid-gray"
          }`}
        >
          내 설교
        </button>
        <button
          onClick={() => setTab("pastor")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            tab === "pastor" ? "bg-green text-white" : "text-mid-gray"
          }`}
        >
          목회자 설교
        </button>
      </div>

      {loading ? (
        <div className="text-center pt-12">
          <p className="text-mid-gray text-sm">불러오는 중...</p>
        </div>
      ) : sermons.length === 0 ? (
        <div className="text-center pt-12">
          <p className="text-4xl mb-3">🎤</p>
          <h2 className="text-lg font-bold text-green-dark mb-2">
            {tab === "mine" ? "아직 작성한 설교가 없습니다" : "공개된 목회자 설교가 없습니다"}
          </h2>
          {tab === "mine" && (
            <>
              <p className="text-mid-gray text-sm mb-4">큐티 본문으로 5분 설교를 만들어보세요.</p>
              <Link
                href="/sermon/create"
                className="inline-block px-5 py-2.5 bg-green text-white rounded-lg font-medium text-sm"
              >
                설교 만들기
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sermons.map((s) => (
            <Link key={s.id} href={`/sermon/${s.id}`} className="block">
              <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.sermon_type === "quick"
                      ? "bg-gold/20 text-gold"
                      : "bg-green/10 text-green"
                  }`}>
                    {s.duration_minutes}분
                  </span>
                  <span className="text-xs text-mid-gray">
                    {s.book
                      ? `${s.book} ${s.chapter}:${s.verse_start}-${s.verse_end}`
                      : s.passage || ""}
                  </span>
                </div>
                <h3 className="font-bold text-charcoal">{s.title || "제목 없음"}</h3>
                <p className="text-xs text-mid-gray mt-1">
                  {new Date(s.created_at).toLocaleDateString("ko-KR")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
