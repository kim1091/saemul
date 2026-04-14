"use client";

import Link from "next/link";

export default function SermonListPage() {
  // TODO: Supabase에서 내 설교 목록 불러오기
  const sermons: { id: string; title: string; book: string; chapter: number; sermon_type: string; created_at: string }[] = [];

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-green-dark">내 설교</h1>
        <Link
          href="/sermon/create"
          className="px-4 py-2 bg-green text-white text-sm font-medium rounded-lg"
        >
          + 새 설교
        </Link>
      </div>

      {sermons.length === 0 ? (
        <div className="text-center pt-12">
          <p className="text-4xl mb-3">🎤</p>
          <h2 className="text-lg font-bold text-green-dark mb-2">
            아직 설교가 없습니다
          </h2>
          <p className="text-mid-gray text-sm mb-4">
            큐티 본문으로 5분 설교를 만들어보세요.
          </p>
          <Link
            href="/sermon/create"
            className="inline-block px-5 py-2.5 bg-green text-white rounded-lg font-medium text-sm"
          >
            설교 만들기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sermons.map((s) => (
            <Link key={s.id} href={`/sermon/${s.id}`}>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.sermon_type === "quick"
                      ? "bg-gold/20 text-gold"
                      : "bg-green/10 text-green"
                  }`}>
                    {s.sermon_type === "quick" ? "5분" : "일반"}
                  </span>
                  <span className="text-xs text-mid-gray">
                    {s.book} {s.chapter}장
                  </span>
                </div>
                <h3 className="font-bold text-charcoal">{s.title}</h3>
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
