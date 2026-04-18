"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface Sermon {
  id: string;
  book: string;
  chapter: number;
  verse_start: number;
  verse_end: number;
  title: string | null;
  content: string;
  sermon_type: string;
  duration_minutes: number;
  audience: string | null;
  created_at: string;
}

interface Scores {
  scripture_fidelity: number;
  structure: number;
  application: number;
  delivery: number;
  depth: number;
  overall: number;
}

interface Analysis {
  id: string;
  scores: Scores;
  feedback: string;
  details?: Record<string, string>;
}

const SCORE_LABELS: Record<string, string> = {
  scripture_fidelity: "성경 충실도",
  structure: "구조/흐름",
  application: "적용/실천",
  delivery: "전달력",
  depth: "신학적 깊이",
  overall: "종합",
};

const SCORE_COLORS: Record<string, string> = {
  scripture_fidelity: "bg-blue-500",
  structure: "bg-green",
  application: "bg-gold",
  delivery: "bg-purple-500",
  depth: "bg-red-500",
  overall: "bg-green-dark",
};

export default function SermonDetailPage() {
  const params = useParams();
  const sermonId = params.id as string;
  const supabase = createClient();

  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSermon();
  }, [sermonId]);

  async function loadSermon() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: s } = await supabase
      .from("sermons")
      .select("id, book, chapter, verse_start, verse_end, title, content, sermon_type, duration_minutes, audience, created_at")
      .eq("id", sermonId)
      .single();

    if (s) setSermon(s);

    // 기존 분석 로드
    const { data: a } = await supabase
      .from("sermon_analyses")
      .select("id, scores, feedback")
      .eq("sermon_id", sermonId)
      .maybeSingle();

    if (a) {
      let parsed = { feedback: "", details: {} as Record<string, string> };
      try {
        parsed = typeof a.feedback === "string" ? JSON.parse(a.feedback) : a.feedback;
      } catch {
        parsed = { feedback: a.feedback as string, details: {} };
      }
      setAnalysis({
        id: a.id,
        scores: a.scores as Scores,
        feedback: parsed.feedback || (a.feedback as string),
        details: parsed.details,
      });
    }

    setLoading(false);
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setError("");

    try {
      const res = await fetch("/api/sermon/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sermonId }),
      });

      const data = await res.json();

      if (res.status === 409 && data.analysis) {
        // 이미 분석 있음
        setAnalysis(data.analysis);
      } else if (data.error) {
        setError(data.error);
      } else {
        setAnalysis(data);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }

    setAnalyzing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-mid-gray">불러오는 중...</p>
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center">
          <p className="text-4xl mb-3">❌</p>
          <h2 className="text-lg font-bold text-green-dark mb-2">설교를 찾을 수 없습니다</h2>
          <Link href="/sermon" className="text-green font-medium text-sm">목록으로 →</Link>
        </div>
      </div>
    );
  }

  const reference = sermon.book
    ? `${sermon.book} ${sermon.chapter}:${sermon.verse_start}-${sermon.verse_end}`
    : sermon.title || "본문 미정";

  return (
    <div className="px-5 pt-6 pb-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/sermon" className="text-sm text-mid-gray">← 목록</Link>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          sermon.sermon_type === "quick" ? "bg-gold/20 text-gold" : "bg-green/10 text-green"
        }`}>
          {sermon.sermon_type === "quick" ? "5분 설교" : `${sermon.duration_minutes}분 설교`}
        </span>
      </div>

      {/* 설교 본문 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <p className="text-gold text-sm font-medium mb-1">{reference}</p>
        <h1 className="text-lg font-bold text-charcoal mb-1">{sermon.title || "제목 없음"}</h1>
        <p className="text-xs text-mid-gray mb-4">
          {sermon.audience && `${sermon.audience} · `}
          {new Date(sermon.created_at).toLocaleDateString("ko-KR")}
        </p>
        <div className="text-charcoal leading-8 whitespace-pre-line text-[15px]">
          {sermon.content}
        </div>
      </div>

      {/* 분석 섹션 */}
      {analysis ? (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-green-dark mb-4">AI 설교 분석</h2>

          {/* 종합 점수 */}
          <div className="flex items-center gap-4 mb-5 p-4 bg-green-dark/5 rounded-xl">
            <div className="w-16 h-16 rounded-full bg-green-dark text-white flex items-center justify-center text-2xl font-bold">
              {analysis.scores.overall}
            </div>
            <div>
              <p className="text-sm font-bold text-green-dark">종합 점수</p>
              <p className="text-xs text-mid-gray mt-0.5">
                {analysis.scores.overall >= 8 ? "훌륭한 설교입니다!" :
                 analysis.scores.overall >= 6 ? "좋은 설교입니다. 개선 여지가 있습니다." :
                 "개선이 필요한 부분이 있습니다."}
              </p>
            </div>
          </div>

          {/* 항목별 점수 바 */}
          <div className="space-y-3 mb-5">
            {Object.entries(analysis.scores).filter(([k]) => k !== "overall").map(([key, score]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-charcoal">{SCORE_LABELS[key]}</span>
                  <span className="text-xs font-bold text-charcoal">{score}/10</span>
                </div>
                <div className="w-full h-2 bg-light-gray rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${SCORE_COLORS[key] || "bg-green"}`}
                    style={{ width: `${(score as number) * 10}%` }}
                  />
                </div>
                {analysis.details?.[key] && (
                  <p className="text-xs text-mid-gray mt-1">{analysis.details[key]}</p>
                )}
              </div>
            ))}
          </div>

          {/* 피드백 */}
          <div className="bg-cream rounded-xl p-4">
            <p className="text-sm font-bold text-charcoal mb-2">총평</p>
            <p className="text-sm text-charcoal leading-6">{analysis.feedback}</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
          <p className="text-3xl mb-3">📊</p>
          <h3 className="font-bold text-green-dark mb-2">AI 설교 분석</h3>
          <p className="text-sm text-mid-gray mb-4">
            AI가 성경 충실도, 구조, 적용, 전달력, 깊이를 분석합니다
          </p>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="px-6 py-3 bg-green text-white font-bold rounded-xl disabled:opacity-50"
          >
            {analyzing ? "분석 중..." : "설교 분석하기"}
          </button>
        </div>
      )}
    </div>
  );
}
