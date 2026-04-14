"use client";

import { useState } from "react";
import Link from "next/link";

export default function SermonCreatePage() {
  const [book, setBook] = useState("마태복음");
  const [chapter, setChapter] = useState("5");
  const [verseStart, setVerseStart] = useState("1");
  const [verseEnd, setVerseEnd] = useState("12");
  const [sermonType, setSermonType] = useState<"quick" | "full">("quick");
  const [audience, setAudience] = useState("구역모임");
  const [duration, setDuration] = useState("5");
  const [tone, setTone] = useState("따뜻한");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ title: string; content: string } | null>(null);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/sermon/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book,
          chapter: parseInt(chapter),
          verseStart: parseInt(verseStart),
          verseEnd: parseInt(verseEnd),
          sermonType,
          durationMinutes: parseInt(duration),
          audience,
          tone: sermonType === "full" ? tone : undefined,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-green-dark">설교 완성</h1>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            sermonType === "quick" ? "bg-gold/20 text-gold" : "bg-green/10 text-green"
          }`}>
            {sermonType === "quick" ? "5분 설교" : `${duration}분 설교`}
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <p className="text-gold text-sm font-medium mb-1">
            {book} {chapter}:{verseStart}-{verseEnd}
          </p>
          <h2 className="text-lg font-bold text-charcoal mb-4">{result.title}</h2>
          <div className="text-charcoal leading-8 whitespace-pre-line text-[15px]">
            {result.content}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setResult(null)}
            className="flex-1 px-4 py-3 bg-white border border-light-gray rounded-lg font-medium text-charcoal"
          >
            다시 만들기
          </button>
          <Link
            href="/sermon"
            className="flex-1 px-4 py-3 bg-green text-white rounded-lg font-medium text-center"
          >
            목록으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6">
      <h1 className="text-xl font-bold text-green-dark mb-6">설교 만들기</h1>

      {/* 설교 유형 선택 */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => { setSermonType("quick"); setDuration("5"); }}
          className={`flex-1 p-4 rounded-xl border-2 transition ${
            sermonType === "quick"
              ? "border-green bg-green/5"
              : "border-light-gray bg-white"
          }`}
        >
          <p className="text-2xl mb-1">⚡</p>
          <p className={`font-bold text-sm ${sermonType === "quick" ? "text-green" : "text-charcoal"}`}>
            5분 설교
          </p>
          <p className="text-xs text-mid-gray mt-0.5">구역/신우회용</p>
        </button>
        <button
          onClick={() => { setSermonType("full"); setDuration("20"); }}
          className={`flex-1 p-4 rounded-xl border-2 transition ${
            sermonType === "full"
              ? "border-green bg-green/5"
              : "border-light-gray bg-white"
          }`}
        >
          <p className="text-2xl mb-1">🎤</p>
          <p className={`font-bold text-sm ${sermonType === "full" ? "text-green" : "text-charcoal"}`}>
            일반 설교
          </p>
          <p className="text-xs text-mid-gray mt-0.5">목회자/승인 필요</p>
        </button>
      </div>

      {/* 본문 입력 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 space-y-3">
        <h3 className="font-bold text-charcoal">성경 본문</h3>
        <input
          type="text"
          value={book}
          onChange={(e) => setBook(e.target.value)}
          placeholder="책 이름 (예: 마태복음)"
          className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
        />
        <div className="flex gap-2">
          <input
            type="number"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            placeholder="장"
            className="flex-1 px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
          />
          <input
            type="number"
            value={verseStart}
            onChange={(e) => setVerseStart(e.target.value)}
            placeholder="시작 절"
            className="flex-1 px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
          />
          <input
            type="number"
            value={verseEnd}
            onChange={(e) => setVerseEnd(e.target.value)}
            placeholder="끝 절"
            className="flex-1 px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
          />
        </div>
      </div>

      {/* 옵션 */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 space-y-3">
        <h3 className="font-bold text-charcoal">설교 옵션</h3>

        <div>
          <label className="text-sm text-mid-gray block mb-1">청중</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
          >
            <option>구역모임</option>
            <option>신우회</option>
            <option>청년부</option>
            <option>장년부</option>
            <option>중고등부</option>
            <option>전체</option>
          </select>
        </div>

        {sermonType === "full" && (
          <>
            <div>
              <label className="text-sm text-mid-gray block mb-1">설교 길이</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
              >
                <option value="10">10분</option>
                <option value="20">20분</option>
                <option value="30">30분</option>
                <option value="40">40분</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-mid-gray block mb-1">톤</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
              >
                <option>따뜻한</option>
                <option>도전적인</option>
                <option>위로하는</option>
                <option>학문적인</option>
              </select>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading || !book || !chapter}
        className="w-full py-3.5 bg-green text-white font-bold rounded-xl text-base disabled:opacity-50 transition"
      >
        {loading ? "설교를 작성하고 있습니다..." : "설교 생성하기"}
      </button>
    </div>
  );
}
