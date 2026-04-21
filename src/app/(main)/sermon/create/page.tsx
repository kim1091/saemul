"use client";

import { useState } from "react";
import Link from "next/link";

type Mode = "quick" | "workshop";
type Step = "input" | "generating" | "result";

export default function SermonCreatePage() {
  // 모드 & 단계
  const [mode, setMode] = useState<Mode>("quick");
  const [step, setStep] = useState<Step>("input");

  // 공통 입력
  const [passage, setPassage] = useState("");
  const [memo, setMemo] = useState("");
  const [audience, setAudience] = useState("전체 회중");
  const [length, setLength] = useState("25");
  const [tone, setTone] = useState("");

  // 대지 (설교공방)
  const [point1, setPoint1] = useState("");
  const [point2, setPoint2] = useState("");
  const [point3, setPoint3] = useState("");
  const [showPoints, setShowPoints] = useState(false);

  // BigIdea 분석
  const [bigIdeas, setBigIdeas] = useState<Array<{b:string;f:string;p1:string;p2:string;p3:string;angle:string}>>([]);
  const [loadingBigIdea, setLoadingBigIdea] = useState(false);

  // 5분 설교 입력
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [verseStart, setVerseStart] = useState("");
  const [verseEnd, setVerseEnd] = useState("");

  // 생성 상태
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [firstHalf, setFirstHalf] = useState("");
  const [fullSermon, setFullSermon] = useState("");
  const [error, setError] = useState("");
  const [trialCount, setTrialCount] = useState<number | null>(null);

  // ── 5분 설교 생성 ──
  async function handleQuickGenerate() {
    if (!book || !chapter) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sermon/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sermonType: "quick",
          book, chapter: parseInt(chapter),
          verseStart: parseInt(verseStart) || 1,
          verseEnd: parseInt(verseEnd) || parseInt(verseStart) || 1,
          audience,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setFullSermon(data.content || data.sermon || "");
        setStep("result");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // ── 설교공방 2단계 생성 ──
  async function handleWorkshopGenerate() {
    if (!passage && !memo) return;
    setLoading(true);
    setError("");
    setStage(1);
    setStep("generating");

    try {
      // Stage 1: 전반부
      const res1 = await fetch("/api/sermon/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sermonType: "full",
          passage, memo, audience, length, tone,
          point1, point2, point3,
          stage: 1,
        }),
      });

      const data1 = await res1.json();
      if (data1.error) {
        setError(data1.error);
        if (data1.exhausted) setTrialCount(data1.trial_count);
        setStep("input");
        setLoading(false);
        return;
      }

      setFirstHalf(data1.sermon);
      if (data1.trial_count !== undefined) setTrialCount(data1.trial_count);
      setStage(2);

      // Stage 2: 후반부 자동 연속
      const res2 = await fetch("/api/sermon/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sermonType: "full",
          passage, memo, audience, length, tone,
          point1, point2, point3,
          stage: 2,
          firstHalf: data1.sermon,
        }),
      });

      const data2 = await res2.json();
      if (data2.error) {
        // 1단계는 성공했으므로 전반부만이라도 보여주기
        setFullSermon(data1.sermon);
        setError("후반부 생성 실패. 전반부만 표시됩니다: " + data2.error);
      } else {
        setFullSermon(data1.sermon + "\n\n" + data2.sermon);
      }

      setStep("result");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setStep("input");
    } finally {
      setLoading(false);
    }
  }

  // ── BigIdea 심층 분석 ──
  async function handleBigIdea() {
    if (!passage) return;
    setLoadingBigIdea(true);

    try {
      const res = await fetch("/api/sermon/bigidea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passage }),
      });

      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setBigIdeas(data.ideas || []);
      }
    } catch {
      alert("BigIdea 분석 중 오류가 발생했습니다.");
    } finally {
      setLoadingBigIdea(false);
    }
  }

  function applyBigIdea(idea: typeof bigIdeas[0]) {
    setPoint1(idea.p1);
    setPoint2(idea.p2);
    setPoint3(idea.p3);
    setShowPoints(true);
    setBigIdeas([]);
  }

  function handleCopy() {
    navigator.clipboard.writeText(fullSermon);
    alert("설교문이 클립보드에 복사되었습니다.");
  }

  // ── 결과 화면 ──
  if (step === "result") {
    return (
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-green-dark">설교 완성</h1>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            mode === "quick" ? "bg-gold/20 text-gold" : "bg-green/10 text-green"
          }`}>
            {mode === "quick" ? "5분 설교" : `${length}분 설교`}
          </span>
        </div>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
            <p className="text-yellow-700 text-sm">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <p className="text-gold text-sm font-medium mb-3">
            {passage || `${book} ${chapter}:${verseStart}-${verseEnd}`}
          </p>
          <div className="text-charcoal leading-8 whitespace-pre-line text-[15px] sermon-content">
            {fullSermon}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 px-4 py-3 bg-white border border-light-gray rounded-lg font-medium text-charcoal"
          >
            복사
          </button>
          <button
            onClick={() => { setStep("input"); setFullSermon(""); setFirstHalf(""); setStage(0); setError(""); }}
            className="flex-1 px-4 py-3 bg-white border border-light-gray rounded-lg font-medium text-charcoal"
          >
            다시 만들기
          </button>
          <Link
            href="/sermon"
            className="flex-1 px-4 py-3 bg-green text-white rounded-lg font-medium text-center"
          >
            목록
          </Link>
        </div>
      </div>
    );
  }

  // ── 생성 중 화면 ──
  if (step === "generating") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">{stage === 1 ? "✍️" : "🎯"}</div>
          <h2 className="text-lg font-bold text-green-dark mb-2">
            {stage === 1 ? "설교 전반부를 작성하고 있습니다..." : "설교 후반부를 완성하고 있습니다..."}
          </h2>
          <p className="text-mid-gray text-sm">
            {stage === 1
              ? "Big Idea, 아이스브레이크, 서론, 본문, 대지를 작성 중"
              : "대속사, 결론, 기도문, 축도, 부록을 작성 중"}
          </p>

          {/* 진행 바 */}
          <div className="w-64 mx-auto mt-6 bg-light-gray rounded-full h-2">
            <div
              className="bg-green h-2 rounded-full transition-all duration-1000"
              style={{ width: stage === 1 ? "40%" : "80%" }}
            />
          </div>
          <p className="text-xs text-mid-gray mt-2">{stage}/2 단계</p>
        </div>
      </div>
    );
  }

  // ── 입력 화면 ──
  return (
    <div className="px-5 pt-6 pb-8">
      <h1 className="text-xl font-bold text-green-dark mb-5">설교 만들기</h1>

      {/* 모드 선택 */}
      <div className="flex gap-3 mb-5">
        <button
          onClick={() => setMode("quick")}
          className={`flex-1 p-4 rounded-xl border-2 transition ${
            mode === "quick" ? "border-green bg-green/5" : "border-light-gray bg-white"
          }`}
        >
          <p className="text-2xl mb-1">⚡</p>
          <p className={`font-bold text-sm ${mode === "quick" ? "text-green" : "text-charcoal"}`}>5분 설교</p>
          <p className="text-xs text-mid-gray mt-0.5">구역/신우회용</p>
        </button>
        <button
          onClick={() => setMode("workshop")}
          className={`flex-1 p-4 rounded-xl border-2 transition ${
            mode === "workshop" ? "border-green bg-green/5" : "border-light-gray bg-white"
          }`}
        >
          <p className="text-2xl mb-1">🔨</p>
          <p className={`font-bold text-sm ${mode === "workshop" ? "text-green" : "text-charcoal"}`}>설교 공방</p>
          <p className="text-xs text-mid-gray mt-0.5">본격 설교 제작</p>
        </button>
      </div>

      {/* ━━ Quick 모드 입력 ━━ */}
      {mode === "quick" && (
        <>
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 space-y-3">
            <h3 className="font-bold text-charcoal">성경 본문</h3>
            <input type="text" value={book} onChange={(e) => setBook(e.target.value)}
              placeholder="책 이름 (예: 마태복음)"
              className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            <div className="flex gap-2">
              <input type="number" value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="장"
                className="flex-1 px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
              <input type="number" value={verseStart} onChange={(e) => setVerseStart(e.target.value)} placeholder="시작 절"
                className="flex-1 px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
              <input type="number" value={verseEnd} onChange={(e) => setVerseEnd(e.target.value)} placeholder="끝 절"
                className="flex-1 px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            </div>
          </div>

          <button onClick={handleQuickGenerate} disabled={loading || !book || !chapter}
            className="w-full py-3.5 bg-green text-white font-bold rounded-xl text-base disabled:opacity-50 transition">
            {loading ? "생성 중..." : "5분 설교 만들기"}
          </button>
        </>
      )}

      {/* ━━ Workshop 모드 입력 ━━ */}
      {mode === "workshop" && (
        <>
          {/* 기본 정보 */}
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 space-y-3">
            <h3 className="font-bold text-charcoal">기본 정보</h3>
            <div>
              <label className="text-xs text-mid-gray block mb-1">성경 본문</label>
              <input type="text" value={passage} onChange={(e) => setPassage(e.target.value)}
                placeholder="예: 요한복음 3:16-21"
                className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            </div>
            <div>
              <label className="text-xs text-mid-gray block mb-1">설교자 메모 (선택)</label>
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)}
                placeholder="절기, 예배 유형, 특별한 상황 등 (예: 부활절 감사예배, 청년부 대상)"
                rows={2}
                className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green resize-none" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-mid-gray block mb-1">청중</label>
                <select value={audience} onChange={(e) => setAudience(e.target.value)}
                  className="w-full px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green">
                  <option>전체 회중</option>
                  <option>장년부</option>
                  <option>청년부</option>
                  <option>중고등부</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-mid-gray block mb-1">설교 길이</label>
                <select value={length} onChange={(e) => setLength(e.target.value)}
                  className="w-full px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green">
                  <option value="20">20분</option>
                  <option value="25">25분</option>
                  <option value="30">30분</option>
                  <option value="40">40분</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-mid-gray block mb-1">톤 (선택)</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "", label: "자동" },
                  { key: "warm", label: "따뜻한" },
                  { key: "strong", label: "강한" },
                  { key: "conversational", label: "대화체" },
                  { key: "poetic", label: "시적인" },
                ].map((t) => (
                  <button key={t.key} onClick={() => setTone(t.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      tone === t.key ? "bg-green text-white" : "bg-cream text-mid-gray border border-light-gray"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 설교 방향 (대지) */}
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-charcoal">설교 방향 (선택)</h3>
              <button onClick={() => setShowPoints(!showPoints)}
                className="text-xs text-green font-medium">
                {showPoints ? "접기" : "대지 직접 입력"}
              </button>
            </div>

            {!showPoints && (
              <p className="text-xs text-mid-gray">대지를 입력하지 않으면 AI가 자동으로 2개의 대지를 설정합니다.</p>
            )}

            {showPoints && (
              <div className="space-y-2 mb-3">
                <input type="text" value={point1} onChange={(e) => setPoint1(e.target.value)}
                  placeholder="대지 1 (필수)"
                  className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
                <input type="text" value={point2} onChange={(e) => setPoint2(e.target.value)}
                  placeholder="대지 2 (선택)"
                  className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
                <input type="text" value={point3} onChange={(e) => setPoint3(e.target.value)}
                  placeholder="대지 3 (선택)"
                  className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
              </div>
            )}

            {/* BigIdea 분석 버튼 */}
            {passage && (
              <button onClick={handleBigIdea} disabled={loadingBigIdea}
                className="w-full py-2.5 bg-gold/10 text-gold border border-gold/30 rounded-lg text-sm font-medium disabled:opacity-50 mt-2">
                {loadingBigIdea ? "분석 중..." : "AI 심층 분석 (10가지 관점)"}
              </button>
            )}

            {/* BigIdea 결과 */}
            {bigIdeas.length > 0 && (
              <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
                <p className="text-xs text-mid-gray font-medium">관점을 선택하면 대지에 자동 입력됩니다:</p>
                {bigIdeas.map((idea, i) => (
                  <button key={i} onClick={() => applyBigIdea(idea)}
                    className="w-full text-left bg-cream rounded-xl p-3 hover:bg-green/5 transition">
                    <p className="text-xs text-gold font-medium mb-1">{idea.angle}</p>
                    <p className="text-sm font-bold text-charcoal mb-1">{idea.b}</p>
                    <p className="text-xs text-mid-gray">{idea.f}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 에러 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* 체험 횟수 안내 */}
          {trialCount !== null && trialCount >= 0 && (
            <div className="bg-gold/10 border border-gold/30 rounded-xl p-3 mb-4">
              <p className="text-gold text-sm">무료 체험 {trialCount}/3회 사용</p>
            </div>
          )}

          {/* 생성 버튼 */}
          <button onClick={handleWorkshopGenerate} disabled={loading || (!passage && !memo)}
            className="w-full py-3.5 bg-green text-white font-bold rounded-xl text-base disabled:opacity-50 transition">
            설교 생성하기 (2단계 자동)
          </button>
          <p className="text-xs text-mid-gray text-center mt-2">
            AI가 전반부와 후반부를 순차적으로 작성합니다 (약 30~40초)
          </p>
        </>
      )}
    </div>
  );
}
