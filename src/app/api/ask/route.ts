import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const SYSTEM_PROMPT = `당신은 복음주의 신학에 기반한 성경 질문 도우미 "샘물 AI"입니다.

역할:
- 성경 본문에 대한 질문에 정확한 성경적 근거를 들어 답변합니다.
- 역사적, 문화적 배경을 함께 설명합니다.
- 실생활 적용을 돕습니다.
- 다양한 신학적 관점이 있을 때는 균형 있게 소개합니다.

규칙:
- 항상 관련 성경 구절을 인용하세요.
- 확실하지 않은 내용은 "여러 해석이 있습니다"라고 솔직히 말하세요.
- 답변은 명확하고 이해하기 쉽게 작성하세요.
- 한국어로 답변하세요.`;

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // 일일 질문 횟수 체크
    const { data: profile } = await supabase
      .from("profiles")
      .select("daily_ask_count, daily_ask_reset_at, subscription_tier")
      .eq("id", user.id)
      .single();

    if (profile) {
      const today = new Date().toISOString().split("T")[0];

      if (profile.daily_ask_reset_at !== today) {
        // 날짜가 바뀌었으면 카운트 리셋
        await supabase
          .from("profiles")
          .update({ daily_ask_count: 0, daily_ask_reset_at: today })
          .eq("id", user.id);
      } else if (
        profile.subscription_tier === "free" &&
        profile.daily_ask_count >= 3
      ) {
        return NextResponse.json(
          { error: "오늘의 무료 질문 횟수(3회)를 모두 사용했습니다." },
          { status: 429 }
        );
      }
    }

    const body = await request.json();
    const { message, conversationId } = body as {
      message: string;
      conversationId?: string;
    };

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "질문을 입력해주세요." }, { status: 400 });
    }

    // 대화 생성 또는 기존 대화 사용
    let convId = conversationId;
    if (!convId) {
      const { data: conv } = await supabase
        .from("ask_conversations")
        .insert({ user_id: user.id, title: message.slice(0, 50) })
        .select("id")
        .single();
      convId = conv?.id;
    }

    // 사용자 메시지 저장
    await supabase.from("ask_messages").insert({
      conversation_id: convId,
      role: "user",
      content: message,
    });

    // 이전 대화 기록 가져오기 (최근 10개)
    const { data: history } = await supabase
      .from("ask_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(10);

    const messages = (history || []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Claude API 호출
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages,
    });

    const assistantMessage =
      response.content[0].type === "text" ? response.content[0].text : "";

    // AI 응답 저장
    await supabase.from("ask_messages").insert({
      conversation_id: convId,
      role: "assistant",
      content: assistantMessage,
    });

    // 질문 횟수 증가
    await supabase
      .from("profiles")
      .update({ daily_ask_count: (profile?.daily_ask_count || 0) + 1 })
      .eq("id", user.id);

    return NextResponse.json({
      conversationId: convId,
      message: assistantMessage,
    });
  } catch (error) {
    console.error("Ask API error:", error);
    return NextResponse.json(
      { error: "답변을 생성하는 데 실패했습니다." },
      { status: 500 }
    );
  }
}
