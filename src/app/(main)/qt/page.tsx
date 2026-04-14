"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { DailyQt } from "@/lib/types";

type QtStep = "scripture" | "commentary" | "observation" | "interpretation" | "application" | "prayer";

const STEPS: { key: QtStep; label: string; icon: string }[] = [
  { key: "scripture", label: "본문", icon: "📖" },
  { key: "commentary", label: "해설", icon: "💡" },
  { key: "observation", label: "관찰", icon: "🔍" },
  { key: "interpretation", label: "해석", icon: "🤔" },
  { key: "application", label: "적용", icon: "✋" },
  { key: "prayer", label: "기도", icon: "🙏" },
];

export default function QtPage() {
  const [qt, setQt] = useState<DailyQt | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<QtStep>("scripture");
  const [completed, setCompleted] = useState(false);

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  useEffect(() => {
    fetch("/api/qt/today")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setQt(null);
        else setQt(data);
      })
      .catch(() => setQt(null))
      .finally(() => setLoading(false));
  }, []);

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  function goNext() {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1].key);
    } else {
      setCompleted(true);
    }
  }

  function goPrev() {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].key);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-2xl mb-2">📖</p>
          <p className="text-mid-gray">큐티를 불러오고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (!qt) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center">
          <p className="text-4xl mb-4">🌿</p>
          <h2 className="text-xl font-bold text-green-dark mb-2">
            오늘의 큐티가 아직 준비되지 않았습니다
          </h2>
          <p className="text-mid-gray mb-6">
            관리자가 큐티를 생성하면 이곳에서 묵상할 수 있습니다.
          </p>
          <Link href="/home" className="text-green font-medium">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center">
          <p className="text-5xl mb-4">🙌</p>
          <h2 className="text-2xl font-bold text-green-dark mb-2">
            오늘의 큐티를 마쳤습니다!
          </h2>
          <p className="text-mid-gray mb-6">하나님과 동행하는 하루 되세요.</p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/note"
              className="px-5 py-2.5 bg-green text-white rounded-lg font-medium"
            >
              묵상 노트 쓰기
            </Link>
            <Link
              href="/home"
              className="px-5 py-2.5 bg-white border border-light-gray rounded-lg font-medium text-green-dark"
            >
              홈으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const reference = `${qt.book} ${qt.chapter}:${qt.verse_start}-${qt.verse_end}`;

  return (
    <div className="px-5 pt-4 pb-6">
      {/* Header */}
      <div className="mb-4">
        <p className="text-mid-gray text-sm">{today}</p>
        <h1 className="text-xl font-bold text-green-dark">{reference}</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex justify-between mb-6">
        {STEPS.map((step, i) => (
          <button
            key={step.key}
            onClick={() => setCurrentStep(step.key)}
            className={`flex flex-col items-center gap-1 transition-all ${
              i === currentStepIndex
                ? "opacity-100 scale-105"
                : i < currentStepIndex
                ? "opacity-60"
                : "opacity-30"
            }`}
          >
            <span
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${
                i === currentStepIndex
                  ? "bg-green text-white"
                  : i < currentStepIndex
                  ? "bg-green/20 text-green"
                  : "bg-light-gray text-mid-gray"
              }`}
            >
              {step.icon}
            </span>
            <span className="text-[10px] text-mid-gray">{step.label}</span>
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl shadow-sm p-6 min-h-[300px]">
        {currentStep === "scripture" && (
          <div>
            <h2 className="text-lg font-bold text-green-dark mb-4">
              📖 오늘의 본문
            </h2>
            <p className="text-gold text-sm font-medium mb-3">{reference}</p>
            <div className="font-bible text-charcoal leading-8 text-base whitespace-pre-line">
              {qt.scripture_text}
            </div>
          </div>
        )}

        {currentStep === "commentary" && (
          <div>
            <h2 className="text-lg font-bold text-green-dark mb-4">
              💡 AI 해설
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gold mb-1">배경</h3>
                <p className="text-charcoal leading-7">
                  {qt.commentary.background}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gold mb-1">핵심 메시지</h3>
                <p className="text-charcoal leading-7">
                  {qt.commentary.key_message}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gold mb-1">문맥</h3>
                <p className="text-charcoal leading-7">
                  {qt.commentary.context}
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStep === "observation" && (
          <div>
            <h2 className="text-lg font-bold text-green-dark mb-4">
              🔍 관찰 질문
            </h2>
            <p className="text-mid-gray text-sm mb-4">
              본문에서 무엇이 보이나요?
            </p>

            <div className="mb-5">
              <h3 className="text-sm font-bold text-green mb-3">
                일반 단어 관찰
              </h3>
              <div className="space-y-3">
                {qt.observation_general.map((q, i) => (
                  <div key={i} className="bg-cream rounded-xl p-4">
                    <p className="font-medium text-charcoal mb-1">
                      {q.question}
                    </p>
                    <p className="text-mid-gray text-sm">💡 {q.hint}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-green mb-3">
                핵심 단어 관찰
              </h3>
              <div className="space-y-3">
                {qt.observation_key.map((q, i) => (
                  <div key={i} className="bg-cream rounded-xl p-4">
                    <span className="inline-block bg-gold/20 text-gold text-xs font-bold px-2 py-0.5 rounded mb-2">
                      {q.word}
                    </span>
                    <p className="font-medium text-charcoal mb-1">
                      {q.question}
                    </p>
                    <p className="text-mid-gray text-sm">💡 {q.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === "interpretation" && (
          <div>
            <h2 className="text-lg font-bold text-green-dark mb-4">
              🤔 해석 질문
            </h2>
            <p className="text-mid-gray text-sm mb-4">왜 그런가요?</p>
            <div className="space-y-4">
              {qt.interpretation.map((q, i) => (
                <div key={i} className="bg-cream rounded-xl p-5">
                  <p className="font-bold text-charcoal text-base mb-2">
                    질문 {i + 1}
                  </p>
                  <p className="text-charcoal leading-7 mb-2">{q.question}</p>
                  <p className="text-mid-gray text-sm">💡 {q.hint}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === "application" && (
          <div>
            <h2 className="text-lg font-bold text-green-dark mb-4">
              ✋ 적용 질문
            </h2>
            <p className="text-mid-gray text-sm mb-4">
              나에게 어떤 의미인가요?
            </p>
            <div className="space-y-4">
              {qt.application.map((q, i) => (
                <div key={i} className="bg-cream rounded-xl p-5">
                  <p className="font-bold text-charcoal text-base mb-2">
                    적용 {i + 1}
                  </p>
                  <p className="text-charcoal leading-7 mb-2">{q.question}</p>
                  <p className="text-mid-gray text-sm">💡 {q.hint}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === "prayer" && (
          <div>
            <h2 className="text-lg font-bold text-green-dark mb-4">
              🙏 기도문
            </h2>
            <p className="text-mid-gray text-sm mb-4">
              오늘 말씀을 묵상하며 기도합니다
            </p>
            <div className="bg-cream rounded-xl p-6">
              <p className="font-bible text-charcoal leading-8 text-base whitespace-pre-line">
                {qt.prayer}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={goPrev}
          disabled={currentStepIndex === 0}
          className="px-5 py-2.5 bg-white border border-light-gray rounded-lg font-medium text-charcoal disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← 이전
        </button>
        <span className="text-mid-gray text-sm self-center">
          {currentStepIndex + 1} / {STEPS.length}
        </span>
        <button
          onClick={goNext}
          className="px-5 py-2.5 bg-green text-white rounded-lg font-medium"
        >
          {currentStepIndex === STEPS.length - 1 ? "완료 🙌" : "다음 →"}
        </button>
      </div>
    </div>
  );
}
