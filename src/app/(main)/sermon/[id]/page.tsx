"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface Sermon {
  id: string;
  book: string | null;
  chapter: number | null;
  verse_start: number | null;
  verse_end: number | null;
  title: string | null;
  content: string | null;
  sermon_text: string | null;
  passage: string | null;
  sermon_type: string;
  duration_minutes: number;
  audience: string | null;
  created_at: string;
}

interface AnalysisItem {
  name: string;
  score: number;
  comment: string;
  suggestion: string;
}

interface AnalysisResult {
  total_score: number;
  items: AnalysisItem[];
  overall: string;
  strengths: string[];
  improvements: string[];
}

// 낭독 시간 계산 (한글 기준)
function calcReadingTime(text: string, speed: number = 300) {
  const cleaned = text.replace(/[#*\-_=\n\r]/g, " ").replace(/\s+/g, " ").trim();
  const charCount = cleaned.length;
  const minutes = Math.round(charCount / speed);
  return { charCount, minutes };
}

const ITEM_COLORS = [
  "bg-blue-500", "bg-green", "bg-gold", "bg-purple-500",
  "bg-red-500", "bg-teal-500", "bg-orange-500", "bg-green-dark",
];

export default function SermonDetailPage() {
  const params = useParams();
  const sermonId = params.id as string;
  const supabase = createClient();

  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadSermon(); }, [sermonId]);

  async function loadSermon() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: s } = await supabase
      .from("sermons")
      .select("id, book, chapter, verse_start, verse_end, title, content, sermon_text, passage, sermon_type, duration_minutes, audience, created_at")
      .eq("id", sermonId)
      .single();

    if (s) setSermon(s as Sermon);

    // 기존 분석 로드
    const { data: a } = await supabase
      .from("sermon_analyses")
      .select("id, scores, feedback")
      .eq("sermon_id", sermonId)
      .maybeSingle();

    if (a) {
      try {
        const feedbackData = typeof a.feedback === "string" ? JSON.parse(a.feedback) : a.feedback;
        const scores = a.scores as AnalysisItem[] | Record<string, number>;

        // 새 8항목 형식 or 구 6항목 형식 분기
        if (Array.isArray(scores)) {
          setAnalysis({
            total_score: feedbackData.total_score || scores.reduce((s: number, i: AnalysisItem) => s + i.score, 0),
            items: scores,
            overall: feedbackData.overall || feedbackData.feedback || "",
            strengths: feedbackData.strengths || [],
            improvements: feedbackData.improvements || [],
          });
        } else {
          // 구 형식 → 새 형식으로 변환
          const labels: Record<string, string> = {
            scripture_fidelity: "성경 충실도", structure: "구조/흐름",
            application: "적용/실천", delivery: "전달력",
            depth: "신학적 깊이", overall: "종합",
          };
          const items = Object.entries(scores)
            .filter(([k]) => k !== "overall")
            .map(([k, v]) => ({ name: labels[k] || k, score: v as number, comment: "", suggestion: "" }));
          setAnalysis({
            total_score: items.reduce((s, i) => s + i.score, 0),
            items,
            overall: feedbackData.feedback || feedbackData.overall || "",
            strengths: [], improvements: [],
          });
        }
      } catch {
        // 파싱 실패 시 무시
      }
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
      if (data.error && !data.analysis) {
        setError(data.error);
      } else {
        const result = data.analysis || data;
        setAnalysis({
          total_score: result.total_score || 0,
          items: result.items || [],
          overall: result.overall || "",
          strengths: result.strengths || [],
          improvements: result.improvements || [],
        });
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }

    setAnalyzing(false);
  }

  function handleCopy() {
    if (!sermonContent) return;
    navigator.clipboard.writeText(sermonContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // 설교 내용 (content 또는 sermon_text)
  const sermonContent = sermon?.content || sermon?.sermon_text || "";

  // 본문 참조
  const reference = sermon?.book
    ? `${sermon.book} ${sermon.chapter}:${sermon.verse_start}-${sermon.verse_end}`
    : sermon?.passage || sermon?.title || "본문 미정";

  // 낭독 시간
  const readingTime = useMemo(() => {
    if (!sermonContent) return null;
    return calcReadingTime(sermonContent);
  }, [sermonContent]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-mid-gray">불러오는 중...</p></div>;
  }

  if (!sermon) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center">
          <p className="text-4xl mb-3">&#10060;</p>
          <h2 className="text-lg font-bold text-green-dark mb-2">설교를 찾을 수 없습니다</h2>
          <Link href="/sermon" className="text-green font-medium text-sm">목록으로</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/sermon" className="text-sm text-mid-gray">← 목록</Link>
        <div className="flex items-center gap-2">
          {readingTime && (
            <span className="text-xs px-2 py-1 rounded-full bg-cream text-mid-gray">
              ~{readingTime.minutes}분 ({readingTime.charCount.toLocaleString()}자)
            </span>
          )}
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            sermon.sermon_type === "quick" ? "bg-gold/20 text-gold" : "bg-green/10 text-green"
          }`}>
            {sermon.sermon_type === "quick" ? "5분 설교" : `${sermon.duration_minutes}분`}
          </span>
        </div>
      </div>

      {/* 설교 본문 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <p className="text-gold text-sm font-medium mb-1">{reference}</p>
        <h1 className="text-lg font-bold text-charcoal mb-1">{sermon.title || "설교공방 설교"}</h1>
        <p className="text-xs text-mid-gray mb-4">
          {sermon.audience && `${sermon.audience} · `}
          {new Date(sermon.created_at).toLocaleDateString("ko-KR")}
        </p>
        <div className="text-charcoal leading-8 whitespace-pre-line text-[15px]">
          {sermonContent}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2 mb-4">
        <button onClick={handleCopy}
          className="flex-1 py-2.5 bg-white border border-light-gray rounded-lg text-sm font-medium text-charcoal">
          {copied ? "복사됨!" : "복사"}
        </button>
        {!analysis && (
          <button onClick={handleAnalyze} disabled={analyzing}
            className="flex-1 py-2.5 bg-green text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {analyzing ? "분석 중..." : "AI 분석"}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 분석 결과 (8항목 80점) */}
      {analysis && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-green-dark mb-4">AI 설교 분석</h2>

          {/* 총점 */}
          <div className="flex items-center gap-4 mb-5 p-4 bg-green-dark/5 rounded-xl">
            <div className="w-16 h-16 rounded-full bg-green-dark text-white flex items-center justify-center text-xl font-bold">
              {analysis.total_score}
            </div>
            <div>
              <p className="text-sm font-bold text-green-dark">총점 / 80점</p>
              <p className="text-xs text-mid-gray mt-0.5">
                {analysis.total_score >= 64 ? "훌륭한 설교입니다!" :
                 analysis.total_score >= 48 ? "좋은 설교입니다. 개선 여지가 있습니다." :
                 "핵심 영역의 보강이 필요합니다."}
              </p>
            </div>
          </div>

          {/* 항목별 점수 */}
          <div className="space-y-3 mb-5">
            {analysis.items.map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-charcoal">{item.name}</span>
                  <span className="text-xs font-bold text-charcoal">{item.score}/10</span>
                </div>
                <div className="w-full h-2 bg-light-gray rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${ITEM_COLORS[i % ITEM_COLORS.length]}`}
                    style={{ width: `${item.score * 10}%` }} />
                </div>
                {item.comment && (
                  <p className="text-xs text-mid-gray mt-1">{item.comment}</p>
                )}
                {item.suggestion && (
                  <p className="text-xs text-green mt-0.5">→ {item.suggestion}</p>
                )}
              </div>
            ))}
          </div>

          {/* 강점 / 개선점 */}
          {analysis.strengths.length > 0 && (
            <div className="bg-green/5 rounded-xl p-4 mb-3">
              <p className="text-sm font-bold text-green mb-2">강점</p>
              <ul className="space-y-1">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-charcoal flex gap-1.5">
                    <span className="text-green shrink-0">+</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.improvements.length > 0 && (
            <div className="bg-gold/5 rounded-xl p-4 mb-3">
              <p className="text-sm font-bold text-gold mb-2">개선점</p>
              <ul className="space-y-1">
                {analysis.improvements.map((s, i) => (
                  <li key={i} className="text-xs text-charcoal flex gap-1.5">
                    <span className="text-gold shrink-0">!</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 총평 */}
          {analysis.overall && (
            <div className="bg-cream rounded-xl p-4">
              <p className="text-sm font-bold text-charcoal mb-2">총평</p>
              <p className="text-sm text-charcoal leading-6">{analysis.overall}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
