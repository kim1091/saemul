"use client";

import { useState } from "react";
import Link from "next/link";

type Tool = "bulletin" | "series" | "youtube";

export default function SermonToolsPage() {
  const [tool, setTool] = useState<Tool>("bulletin");
  const [copied, setCopied] = useState(false);

  // 주보
  const [bl, setBl] = useState({ church: "", date: "", title: "", passage: "", preacher: "", hymn: "", message: "", points: "", apply: "" });
  // 시리즈
  const [sr, setSr] = useState({ title: "", theme: "", passage: "", weeks: "4", audience: "전체 회중", start: "" });
  // 유튜브
  const [yt, setYt] = useState({ title: "", passage: "", preacher: "", summary: "" });

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function genBulletin() {
    const t = `📰 ${bl.church || "○○교회"} 주보
━━━━━━━━━━━━━━━━━━
📅 ${bl.date || "2026년 ○월 ○일"}
🎤 설교: ${bl.title || "제목"} | ${bl.passage || "본문"}
👤 설교자: ${bl.preacher || "목사"}
${bl.hymn ? "🎵 찬송: " + bl.hymn : ""}

💡 한 줄 메시지
${bl.message || "메시지를 입력하세요"}

📌 핵심 포인트
${(bl.points || "").split(",").map((p, i) => `${i + 1}. ${p.trim()}`).join("\n")}
${bl.apply ? "\n✅ 이번 주 적용\n" + bl.apply : ""}
━━━━━━━━━━━━━━━━━━`;
    copyText(t);
  }

  function genSeries() {
    const prompt = `당신은 한국 교회 설교 기획 전문가입니다. 아래 정보로 연속 설교 시리즈를 기획해주세요.

## 시리즈 정보
- 시리즈 제목: ${sr.title || "미정"}
- 전체 주제: ${sr.theme || "미정"}
${sr.passage ? "- 시작 본문: " + sr.passage : ""}
- 총 주수: ${sr.weeks}주
- 청중: ${sr.audience}
${sr.start ? "- 시작 절기: " + sr.start : ""}

## 요청 사항
각 주차별로 다음을 포함해주세요:
1. 주차 제목 (부제)
2. 성경 본문
3. 핵심 메시지 (한 문장)
4. Big Idea
5. 소그룹 나눔 질문 2개

추가로:
- 시리즈 전체 소개 문구 (주보/홈페이지용)
- 시리즈 배너/그래픽 제안 (색상, 이미지 컨셉)
- 매주 연결되는 기도 포인트

표 형태로 정리해주세요.`;
    copyText(prompt);
  }

  function genYoutube() {
    const prompt = `당신은 교회 유튜브 콘텐츠 전문가입니다. 아래 설교 정보로 유튜브 메타데이터를 생성해주세요.

## 설교 정보
- 제목: ${yt.title || "미정"}
- 본문: ${yt.passage || "미정"}
- 설교자: ${yt.preacher || "미정"}
${yt.summary ? "- 요약: " + yt.summary : ""}

## 생성 요청
1. **썸네일 제목** 3가지 (20자 이내, 클릭 유도)
2. **영상 제목** 3가지 (SEO 최적화)
3. **영상 설명** (500자, 해시태그 포함)
4. **태그** 15개
5. **타임스탬프** 예시 (설교 구조 기반)
6. **숏폼 클립** 추천 구간 3개 (어떤 부분을 잘라서 shorts로 만들지)`;
    copyText(prompt);
  }

  return (
    <div className="px-5 pt-6 pb-8">
      <Link href="/sermon" className="text-sm text-mid-gray">← 설교</Link>
      <h1 className="text-xl font-bold text-green-dark mt-1 mb-4">설교 도구</h1>

      {/* 도구 탭 */}
      <div className="flex gap-2 mb-5">
        {([
          { key: "bulletin" as Tool, label: "📰 주보", },
          { key: "series" as Tool, label: "📚 시리즈" },
          { key: "youtube" as Tool, label: "▶️ 유튜브" },
        ]).map(t => (
          <button key={t.key} onClick={() => setTool(t.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
              tool === t.key ? "bg-green text-white" : "bg-white text-mid-gray border border-light-gray"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {copied && (
        <div className="bg-green/10 border border-green/30 rounded-xl p-3 mb-4 text-center">
          <p className="text-green text-sm font-medium">클립보드에 복사되었습니다!</p>
        </div>
      )}

      {/* ━━ 주보 ━━ */}
      {tool === "bulletin" && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-charcoal">주보 요약 생성</h3>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="교회명" value={bl.church} onChange={e => setBl({...bl, church: e.target.value})}
              className="px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            <input type="text" placeholder="날짜" value={bl.date} onChange={e => setBl({...bl, date: e.target.value})}
              className="px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="설교 제목" value={bl.title} onChange={e => setBl({...bl, title: e.target.value})}
              className="px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            <input type="text" placeholder="성경 본문" value={bl.passage} onChange={e => setBl({...bl, passage: e.target.value})}
              className="px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="설교자" value={bl.preacher} onChange={e => setBl({...bl, preacher: e.target.value})}
              className="px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            <input type="text" placeholder="찬송 (선택)" value={bl.hymn} onChange={e => setBl({...bl, hymn: e.target.value})}
              className="px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
          </div>
          <input type="text" placeholder="한 줄 메시지" value={bl.message} onChange={e => setBl({...bl, message: e.target.value})}
            className="w-full px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
          <input type="text" placeholder="핵심 포인트 (쉼표 구분)" value={bl.points} onChange={e => setBl({...bl, points: e.target.value})}
            className="w-full px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
          <input type="text" placeholder="이번 주 적용 (선택)" value={bl.apply} onChange={e => setBl({...bl, apply: e.target.value})}
            className="w-full px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
          <button onClick={genBulletin}
            className="w-full py-3 bg-green text-white font-bold rounded-xl">
            주보 텍스트 생성 + 복사
          </button>
        </div>
      )}

      {/* ━━ 시리즈 ━━ */}
      {tool === "series" && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-charcoal">연속 설교 시리즈 기획</h3>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="시리즈 제목" value={sr.title} onChange={e => setSr({...sr, title: e.target.value})}
              className="px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            <input type="text" placeholder="전체 주제" value={sr.theme} onChange={e => setSr({...sr, theme: e.target.value})}
              className="px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="시작 본문 (선택)" value={sr.passage} onChange={e => setSr({...sr, passage: e.target.value})}
              className="px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            <select value={sr.weeks} onChange={e => setSr({...sr, weeks: e.target.value})}
              className="px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green">
              <option value="4">4주</option><option value="5">5주</option>
              <option value="6">6주</option><option value="8">8주</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="시작 절기 (선택)" value={sr.start} onChange={e => setSr({...sr, start: e.target.value})}
              className="px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            <select value={sr.audience} onChange={e => setSr({...sr, audience: e.target.value})}
              className="px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green">
              <option>전체 회중</option><option>청년부</option><option>장년부</option><option>중고등부</option>
            </select>
          </div>
          <button onClick={genSeries}
            className="w-full py-3 bg-green text-white font-bold rounded-xl">
            시리즈 기획 프롬프트 복사
          </button>
          <p className="text-xs text-mid-gray text-center">복사한 프롬프트를 AI에 붙여넣어 사용하세요</p>
        </div>
      )}

      {/* ━━ 유튜브 ━━ */}
      {tool === "youtube" && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-charcoal">유튜브 메타데이터 생성</h3>
          <input type="text" placeholder="설교 제목" value={yt.title} onChange={e => setYt({...yt, title: e.target.value})}
            className="w-full px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="성경 본문" value={yt.passage} onChange={e => setYt({...yt, passage: e.target.value})}
              className="px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            <input type="text" placeholder="설교자" value={yt.preacher} onChange={e => setYt({...yt, preacher: e.target.value})}
              className="px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
          </div>
          <textarea placeholder="설교 요약 (선택)" value={yt.summary} onChange={e => setYt({...yt, summary: e.target.value})}
            rows={3}
            className="w-full px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green resize-none" />
          <button onClick={genYoutube}
            className="w-full py-3 bg-green text-white font-bold rounded-xl">
            유튜브 메타데이터 프롬프트 복사
          </button>
          <p className="text-xs text-mid-gray text-center">썸네일 제목, 영상 설명, 태그, 타임스탬프 등이 포함됩니다</p>
        </div>
      )}
    </div>
  );
}
