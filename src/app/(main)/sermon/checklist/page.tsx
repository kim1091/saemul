"use client";

import { useState } from "react";
import Link from "next/link";

const CHECKLIST = [
  { cat: "설교학 핵심 — Big Idea & FCF", items: [
    "Big Idea(중심 사상)가 한 문장으로 명확히 설정됨",
    "FCF(인간의 근본 문제)가 식별되어 서론에서 드러남",
    "모든 대지가 Big Idea를 향해 수렴함",
    "복음(예수님)이 FCF의 유일한 해답으로 제시됨",
    "설교 구조 유형(연역/귀납/내러티브/강해)이 일관됨",
  ]},
  { cat: "본문 준비 — 주해", items: [
    "개역개정 본문 전체 정확히 인용",
    "난해 구절 새번역으로 풀이 후 개역개정 안내",
    "시대적·문화적·정치적 배경 설명 포함",
    "원어(헬라어/히브리어) 활용 수준에 맞게 사용",
    "본문의 문학 장르(시·역사·서신·예언 등) 특성 반영",
    "오늘날과 연결 포인트 명확히 제시",
  ]},
  { cat: "아이스브레이크", items: [
    "회중 참여 유도 문장 포함 (손들기·질문·나누기)",
    "첫 문장이 질문 또는 공감 유도로 시작",
    "FCF와 연결되는 공감 포인트로 마무리",
    "2~3분 목표 분량",
  ]},
  { cat: "서론·예화", items: [
    "구체적 디테일 1~2개 포함 (이름·날짜·장소)",
    "검증 가능한 출처 명시 (저자·제목·연도)",
    "AI가 임의로 만든 가짜 통계·인용 없음 (확인 필수!)",
    "FCF(인간 근본 문제)를 생생하게 드러내는 예화",
    "청중 눈높이에 맞는 예화 유형",
    "언어의 감각성 (시각·청각·감정 활용)",
  ]},
  { cat: "대지 — 내용", items: [
    "대지 2~3개 명확히 구분",
    "각 대지: Big Idea와의 연결 명시",
    "각 대지: 구약 성경 구절 1개 포함",
    "각 대지: 신약 성경 구절 1개 포함",
    "각 대지: 감정 정명 최소 1회",
    '각 대지: "오늘 나에게 하는 한 마디" 포함',
    '각 대지: 예상 질문 처리 ("왜?" "그럼 나는?")',
    "각 대지: 청중 저항 처리 + 복음적 답변",
    '대지 소제목 구두 안내 ("첫 번째, ___")',
    "각 챕터 끝 연결 문장 포함",
  ]},
  { cat: "신학적 균형", items: [
    "은혜와 진리의 균형 (지나친 위안도, 지나친 정죄도 없음)",
    "하나님의 성품 (사랑·공의·거룩·긍휼)이 균형 있게 반영됨",
    "행위가 아닌 복음(은혜)이 동기로 제시됨",
    "예수님이 단순한 모델이 아닌 구원자로 제시됨",
    "죄의 심각성과 복음의 충분함이 함께 선포됨",
    '청중이 "해야 한다"보다 "하고 싶다"로 반응하도록 유도',
  ]},
  { cat: "호흡·쉼 & 대속사", items: [
    "대속사 직전 호흡·쉼 최소 1회",
    "침묵 묵상 유도 문장 포함 (10~15초)",
    "본문 ↔ 십자가 연결 한두 문장",
    "대속사가 설교 FCF에 대한 복음적 해답으로 제시됨",
    "대속사 끝 소화 유도 문장",
  ]},
  { cat: "결론 — SMART 적용", items: [
    "기억할 한 문장 (Big Idea를 청중 언어로)",
    "회중과 함께 소리내어 읽기 안내",
    "이번 주 할 한 가지 — Specific(구체적) 확인",
    "이번 주 할 한 가지 — Achievable(실천 가능) 확인",
    "이번 주 할 한 가지 — Time-bound(이번 주 내) 확인",
    '"한 가지만 골라도 된다" 명시',
    "설교자 본인 실천 예시 포함",
  ]},
  { cat: "기도·마무리", items: [
    "결단 기도문이 Big Idea와 직결됨",
    "결단 기도문이 SMART 적용과 연결됨",
    "축도·축복 문장으로 마무리",
    "정죄 없는 언어 전체 확인",
    '2인칭 사용 일관성 확인 ("여러분")',
  ]},
  { cat: "참고·메타 검증", items: [
    "참고 자료·출처 섹션 완성",
    "출처 검증 가능 여부 실제 확인 (구글 검색 등)",
    "낭독 시간 측정 완료 (목표 범위 내)",
    "소그룹 나눔 질문 포함 (선택)",
    "찬양 추천 연결됨 (선택)",
  ]},
];

export default function ChecklistPage() {
  const totalItems = CHECKLIST.reduce((s, c) => s + c.items.length, 0);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function reset() {
    if (confirm("체크리스트를 초기화할까요?")) setChecked(new Set());
  }

  const progress = totalItems > 0 ? Math.round((checked.size / totalItems) * 100) : 0;

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <Link href="/sermon" className="text-sm text-mid-gray">← 설교</Link>
          <h1 className="text-xl font-bold text-green-dark mt-1">설교 완성도 체크리스트</h1>
        </div>
        <span className="text-sm font-bold text-gold">{checked.size} / {totalItems}</span>
      </div>

      {/* 진행 바 */}
      <div className="w-full h-2.5 bg-light-gray rounded-full mb-5 overflow-hidden">
        <div className="h-full bg-green rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }} />
      </div>

      {/* 카테고리별 체크리스트 */}
      {CHECKLIST.map((cat, ci) => {
        const catChecked = cat.items.filter((_, ii) => checked.has(`${ci}-${ii}`)).length;
        return (
          <div key={ci} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xs font-bold text-gold border-l-2 border-gold pl-2">{cat.cat}</h2>
              <span className="text-[10px] text-mid-gray">{catChecked}/{cat.items.length}</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm divide-y divide-light-gray/50">
              {cat.items.map((item, ii) => {
                const key = `${ci}-${ii}`;
                const isChecked = checked.has(key);
                return (
                  <button key={ii} onClick={() => toggle(key)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition ${
                      isChecked ? "bg-green/5" : ""
                    }`}>
                    <div className={`w-5 h-5 shrink-0 mt-0.5 rounded border-2 flex items-center justify-center transition ${
                      isChecked ? "bg-green border-green" : "border-light-gray"
                    }`}>
                      {isChecked && <span className="text-white text-xs font-bold">&#10003;</span>}
                    </div>
                    <span className={`text-sm leading-relaxed ${
                      isChecked ? "text-mid-gray line-through" : "text-charcoal"
                    }`}>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* 초기화 버튼 */}
      <button onClick={reset}
        className="w-full py-2.5 bg-white border border-light-gray rounded-lg text-sm text-mid-gray font-medium mt-2">
        초기화
      </button>
    </div>
  );
}
