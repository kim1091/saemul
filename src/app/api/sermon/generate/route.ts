import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const QUICK_SERMON_PROMPT = `당신은 경험 많은 설교 작성 도우미입니다.
주어진 성경 본문으로 5분 분량(약 800-1000자)의 짧은 나눔/설교를 작성해주세요.

구조:
1. 도입 (2-3문장) — 일상에서 끌어온 도입부
2. 본문 설명 (핵심 메시지 해설)
3. 적용 (우리 삶에 어떻게 적용할 수 있는지)
4. 마무리 (1-2문장 결론 + 기도)

톤은 따뜻하고 친근하게, 신우회/구역 모임에서 나눌 수 있는 수준으로 작성하세요.
제목도 함께 제시하세요.

JSON 형식으로 응답하세요:
{"title": "설교 제목", "content": "설교 전문"}`;

const FULL_SERMON_PROMPT = `당신은 신학적으로 깊이 있는 설교 작성 전문가입니다.
주어진 성경 본문으로 설교를 작성해주세요.

구조:
1. 서론 — 흥미로운 도입, 본문과의 연결
2. 본론 — 본문 해설 (원어 설명 포함), 2-3개 포인트
3. 적용 — 구체적 삶의 적용
4. 결론 — 핵심 메시지 요약, 도전, 기도

JSON 형식으로 응답하세요:
{"title": "설교 제목", "content": "설교 전문"}`;

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const {
      book, chapter, verseStart, verseEnd,
      sermonType, durationMinutes, audience, tone,
    } = body as {
      book: string; chapter: number; verseStart: number; verseEnd: number;
      sermonType: "quick" | "full"; durationMinutes: number;
      audience?: string; tone?: string;
    };

    // 권한 체크
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, subscription_tier")
      .eq("id", user.id)
      .single();

    if (sermonType === "full" && profile?.role === "member") {
      // 성도는 sermon_permissions 확인
      const { data: perm } = await supabase
        .from("sermon_permissions")
        .select("id, is_active, expires_at")
        .eq("user_id", user.id)
        .eq("permission_type", "full_sermon")
        .eq("is_active", true)
        .single();

      if (!perm) {
        return NextResponse.json(
          { error: "일반 설교 권한이 없습니다. 목회자에게 권한을 요청하세요." },
          { status: 403 }
        );
      }

      if (perm.expires_at && new Date(perm.expires_at) < new Date()) {
        return NextResponse.json(
          { error: "설교 권한이 만료되었습니다." },
          { status: 403 }
        );
      }
    }

    const reference = `${book} ${chapter}:${verseStart}-${verseEnd}`;
    const isQuick = sermonType === "quick";

    let prompt = isQuick ? QUICK_SERMON_PROMPT : FULL_SERMON_PROMPT;
    prompt += `\n\n성경 본문: ${reference}`;
    if (audience) prompt += `\n청중: ${audience}`;
    if (!isQuick && tone) prompt += `\n톤: ${tone}`;
    if (!isQuick) prompt += `\n설교 길이: 약 ${durationMinutes}분 분량`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: isQuick ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-5-20250514",
      max_tokens: isQuick ? 1500 : 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    let sermonData;
    try {
      sermonData = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      sermonData = match ? JSON.parse(match[0]) : { title: reference, content: text };
    }

    // DB 저장 (설교공방 기존 컬럼 호환: passage/length/sermon_text)
    const { data: sermon, error } = await supabase
      .from("sermons")
      .insert({
        user_id: user.id,
        sermon_type: sermonType,
        book, chapter,
        verse_start: verseStart,
        verse_end: verseEnd,
        title: sermonData.title,
        content: sermonData.content,
        duration_minutes: durationMinutes || 5,
        audience: audience || null,
        tone: tone || null,
        // 설교공방 호환 컬럼 (NOT NULL 제약 있음)
        passage: reference,
        sermon_text: sermonData.content,
        length: `${durationMinutes || 5}분`,
        memo: "",
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: "저장에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({
      id: sermon?.id,
      title: sermonData.title,
      content: sermonData.content,
    });
  } catch (error) {
    console.error("Sermon generation error:", error);
    return NextResponse.json(
      { error: "설교 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
