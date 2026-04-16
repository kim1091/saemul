import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// 성경 읽기 순서 (1년 통독 기준 샘플 — 추후 전체 확장)
const READING_SCHEDULE = [
  { book: "창세기", chapter: 1, verseStart: 1, verseEnd: 31 },
  { book: "창세기", chapter: 2, verseStart: 1, verseEnd: 25 },
  { book: "창세기", chapter: 3, verseStart: 1, verseEnd: 24 },
  { book: "창세기", chapter: 4, verseStart: 1, verseEnd: 26 },
  { book: "창세기", chapter: 6, verseStart: 1, verseEnd: 22 },
  { book: "창세기", chapter: 12, verseStart: 1, verseEnd: 20 },
  { book: "창세기", chapter: 22, verseStart: 1, verseEnd: 19 },
  { book: "출애굽기", chapter: 3, verseStart: 1, verseEnd: 22 },
  { book: "출애굽기", chapter: 14, verseStart: 1, verseEnd: 31 },
  { book: "출애굽기", chapter: 20, verseStart: 1, verseEnd: 21 },
  { book: "시편", chapter: 1, verseStart: 1, verseEnd: 6 },
  { book: "시편", chapter: 23, verseStart: 1, verseEnd: 6 },
  { book: "시편", chapter: 119, verseStart: 1, verseEnd: 16 },
  { book: "잠언", chapter: 1, verseStart: 1, verseEnd: 19 },
  { book: "이사야", chapter: 40, verseStart: 1, verseEnd: 31 },
  { book: "마태복음", chapter: 5, verseStart: 1, verseEnd: 12 },
  { book: "마태복음", chapter: 5, verseStart: 13, verseEnd: 48 },
  { book: "마태복음", chapter: 6, verseStart: 1, verseEnd: 34 },
  { book: "마태복음", chapter: 7, verseStart: 1, verseEnd: 29 },
  { book: "마가복음", chapter: 1, verseStart: 1, verseEnd: 20 },
  { book: "마가복음", chapter: 2, verseStart: 1, verseEnd: 17 },
  { book: "요한복음", chapter: 1, verseStart: 1, verseEnd: 18 },
  { book: "요한복음", chapter: 3, verseStart: 1, verseEnd: 21 },
  { book: "요한복음", chapter: 14, verseStart: 1, verseEnd: 27 },
  { book: "로마서", chapter: 8, verseStart: 1, verseEnd: 39 },
  { book: "고린도전서", chapter: 13, verseStart: 1, verseEnd: 13 },
  { book: "에베소서", chapter: 6, verseStart: 10, verseEnd: 20 },
  { book: "빌립보서", chapter: 4, verseStart: 4, verseEnd: 13 },
];

function getScheduleForDate(date: Date): (typeof READING_SCHEDULE)[0] {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return READING_SCHEDULE[dayOfYear % READING_SCHEDULE.length];
}

const QT_PROMPT = `당신은 경건하고 깊이 있는 성경 묵상 가이드입니다.
주어진 성경 본문에 대한 큐티(QT) 가이드를 작성해주세요.

반드시 다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):

{
  "commentary": {
    "background": "이 본문의 역사적/문화적 배경 설명 (3-4문장)",
    "key_message": "핵심 메시지 요약 (2-3문장)",
    "context": "전후 문맥 설명 (2-3문장)"
  },
  "observation_general": [
    {"question": "일반적 관찰 질문 1", "hint": "힌트"},
    {"question": "일반적 관찰 질문 2", "hint": "힌트"}
  ],
  "observation_key": [
    {"word": "핵심 단어/표현 1", "question": "이 단어에 대한 관찰 질문", "hint": "힌트"},
    {"word": "핵심 단어/표현 2", "question": "이 단어에 대한 관찰 질문", "hint": "힌트"}
  ],
  "interpretation": [
    {"question": "왜 ~했을까요? (해석 질문 1)", "hint": "힌트"},
    {"question": "왜 ~했을까요? (해석 질문 2)", "hint": "힌트"}
  ],
  "application": [
    {"question": "내 삶에 적용할 점 (적용 질문 1)", "hint": "힌트"},
    {"question": "이번 주 실천할 것 (적용 질문 2)", "hint": "힌트"}
  ],
  "prayer": "이 본문에 기반한 기도문 예시 (200자 내외)"
}

관찰 질문은 "본문에서 무엇이 보이나요?" 유형입니다.
해석 질문은 "왜?" 유형입니다.
적용 질문은 "나에게 어떤 의미인가요?" 유형입니다.`;

export async function POST(request: Request) {
  // CRON 시크릿 인증 (미설정 시 기본 차단 — 비용 도용 방지)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const days = (body as { days?: number }).days || 7;

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const results = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      // 이미 생성된 날짜는 스킵
      const { data: existing } = await supabase
        .from("daily_qt")
        .select("id")
        .eq("qt_date", dateStr)
        .single();

      if (existing) {
        results.push({ date: dateStr, status: "already_exists" });
        continue;
      }

      const schedule = getScheduleForDate(date);
      const reference = `${schedule.book} ${schedule.chapter}:${schedule.verseStart}-${schedule.verseEnd}`;

      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `${QT_PROMPT}\n\n성경 본문: ${reference}\n\n위 형식의 JSON만 응답하세요.`,
          },
        ],
      });

      const content = message.content[0];
      if (content.type !== "text") continue;

      let qtData;
      try {
        qtData = JSON.parse(content.text);
      } catch {
        // JSON 파싱 실패 시 텍스트에서 JSON 추출 시도
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          qtData = JSON.parse(jsonMatch[0]);
        } else {
          results.push({ date: dateStr, status: "parse_error" });
          continue;
        }
      }

      const { error } = await supabase.from("daily_qt").insert({
        qt_date: dateStr,
        book: schedule.book,
        chapter: schedule.chapter,
        verse_start: schedule.verseStart,
        verse_end: schedule.verseEnd,
        scripture_text: `${reference} 본문`, // 실제 성경 텍스트는 성경 API 연동 후 교체
        commentary: qtData.commentary,
        observation_general: qtData.observation_general,
        observation_key: qtData.observation_key,
        interpretation: qtData.interpretation,
        application: qtData.application,
        prayer: qtData.prayer,
      });

      results.push({
        date: dateStr,
        reference,
        status: error ? "error" : "created",
        error: error?.message,
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("QT batch generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate QT batch" },
      { status: 500 }
    );
  }
}
