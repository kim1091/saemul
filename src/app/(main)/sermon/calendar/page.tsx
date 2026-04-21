"use client";

import { useState } from "react";
import Link from "next/link";

const CALENDAR = [
  { s: "교회력 시작", n: "대강절 1주", d: "11월 말~12월 초", e: "🕯️", t: "기다림과 소망", desc: "메시아를 기다리는 기대와 소망" },
  { s: "교회력 시작", n: "대강절 2~4주", d: "12월 초~중순", e: "🕯️", t: "회개와 준비", desc: "주님 오심을 준비하는 회개" },
  { s: "성탄", n: "성탄 주일", d: "12월 25일 주간", e: "⭐", t: "성육신의 기쁨", desc: "하나님이 인간이 되심 — 임마누엘" },
  { s: "새해", n: "신년 주일", d: "1월 첫째 주", e: "🎊", t: "새로운 시작", desc: "하나님과 함께하는 새해 결단" },
  { s: "주현절", n: "주현절", d: "1월 6일 주간", e: "✨", t: "빛으로 오신 그리스도", desc: "이방인에게 나타나신 주님" },
  { s: "사순절", n: "재의 수요일", d: "2~3월", e: "⛪", t: "회개와 돌이킴", desc: "사순절 시작 — 재로 돌아감" },
  { s: "사순절", n: "사순절 기간", d: "부활 40일 전", e: "✝️", t: "광야의 훈련", desc: "예수님의 광야 40일 따라가기" },
  { s: "고난주간", n: "종려주일", d: "부활절 전 주", e: "🌿", t: "예루살렘 입성", desc: "왕으로 오셨지만 섬기러 오심" },
  { s: "고난주간", n: "성목요일", d: "고난주간 목요일", e: "🍞", t: "최후의 만찬", desc: "성찬 제정과 섬김의 본" },
  { s: "고난주간", n: "성금요일", d: "고난주간 금요일", e: "⚫", t: "십자가", desc: "십자가의 고난과 사랑" },
  { s: "부활절", n: "부활절 주일", d: "3~4월 (이동)", e: "🌅", t: "부활의 기쁨", desc: "죽음을 이기신 예수님의 부활" },
  { s: "부활절", n: "부활절 이후", d: "부활 후 7주", e: "🌱", t: "부활의 삶", desc: "부활 신앙으로 살아가는 일상" },
  { s: "성령강림절", n: "승천주일", d: "부활 후 40일", e: "☁️", t: "승천과 약속", desc: "승천과 보혜사 성령 약속" },
  { s: "성령강림절", n: "성령강림절 (오순절)", d: "부활 후 50일", e: "🔥", t: "성령의 강림", desc: "교회 탄생과 성령의 역사" },
  { s: "연중주일", n: "어버이·스승의날", d: "5월", e: "💝", t: "공경과 감사", desc: "부모님·스승에 대한 감사" },
  { s: "연중주일", n: "맥추감사절", d: "7월 첫째 주", e: "🌾", t: "첫 열매 감사", desc: "상반기 하나님 은혜에 감사" },
  { s: "연중주일", n: "종교개혁주일", d: "10월 마지막 주", e: "📜", t: "오직 믿음·성경·은혜", desc: "루터의 종교개혁 — 복음의 핵심" },
  { s: "감사절", n: "추수감사절", d: "11월 셋째 주", e: "🍂", t: "풍성한 감사", desc: "한 해의 하나님 은혜에 감사" },
];

export default function CalendarPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const seasons = [...new Set(CALENDAR.map(c => c.s))];

  function handleCopyPrompt(item: typeof CALENDAR[0]) {
    const prompt = `# ${item.e} ${item.n} 설교 작성 요청

- 절기: ${item.n}
- 기간: ${item.d}
- 핵심 주제: ${item.t}
- 절기 의미: ${item.desc}

## 요청

### 1. 본문 후보 추천
- 구약 5~8개, 신약 5~8개 (본문·핵심주제·연결이유)

### 2. 설교문 작성
본문 선택 후 아래 구조:
아이스브레이크 → 서론 예화 → 본론 입문 → 본문 깊이 → 대지(2~3) → 호흡·쉼 → 대속사 → 결단기도 → 결론 + 축도

### 필수 포함
- 개역개정 + 난해 구절 새번역 풀이
- 각 대지: 구약·신약 성경 구절 각 1개
- 기억할 한 문장
- 이번 주 할 한 가지
- 예수님 대속사 (본문↔십자가)
- 결단 기도문
- 축도·축복

---
**${item.n}** 절기 의미가 풍성히 전달되는 최고의 설교로 만들어 주세요!`;

    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <Link href="/sermon" className="text-sm text-mid-gray">← 설교</Link>
          <h1 className="text-xl font-bold text-green-dark mt-1">교회력 절기 달력</h1>
        </div>
      </div>

      {seasons.map(season => (
        <div key={season} className="mb-5">
          <h2 className="text-sm font-bold text-gold mb-2 border-l-3 border-gold pl-2">{season}</h2>
          <div className="space-y-2">
            {CALENDAR.filter(c => c.s === season).map((item, i) => {
              const idx = CALENDAR.indexOf(item);
              const isOpen = selected === idx;
              return (
                <div key={i}
                  onClick={() => setSelected(isOpen ? null : idx)}
                  className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer transition ${
                    isOpen ? "ring-2 ring-green" : ""
                  }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.e}</span>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm text-charcoal">{item.n}</h3>
                      <p className="text-xs text-mid-gray mt-0.5">{item.d}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-gold/10 text-gold rounded-full">{item.t}</span>
                  </div>

                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-light-gray">
                      <p className="text-sm text-charcoal mb-3">{item.desc}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCopyPrompt(item); }}
                          className="px-4 py-2 bg-green text-white text-xs font-medium rounded-lg">
                          {copied ? "복사됨!" : "설교 프롬프트 복사"}
                        </button>
                        <Link
                          href={`/sermon/create?memo=${encodeURIComponent(item.n)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-4 py-2 bg-gold/10 text-gold text-xs font-medium rounded-lg">
                          설교 만들기
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
