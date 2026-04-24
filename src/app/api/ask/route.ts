import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getMonthlyAskLimit } from "@/lib/sermon-guard";

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

    const body = await request.json();
    const { message, conversationId } = body as {
      message: string;
      conversationId?: string;
    };

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "질문을 입력해주세요." }, { status: 400 });
    }

    // 프로필 조회 → 티어별 쿼터 분기
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, subscription_tier, subscription_expires_at, is_admin")
      .eq("id", user.id)
      .single();

    const askLimit = getMonthlyAskLimit(profile || {});
    let dailyCount: number | undefined;
    let monthlyCount: number | undefined;

    if (askLimit === 0) {
      // Free: 기존 일별 3회 RPC
      const { data: quota, error: quotaErr } = await supabase.rpc(
        "try_use_daily_ask",
        { p_user_id: user.id }
      );

      if (quotaErr) {
        console.error("try_use_daily_ask RPC error:", quotaErr);
        return NextResponse.json(
          { error: "질문 횟수 확인에 실패했습니다." },
          { status: 500 }
        );
      }

      if (!quota?.allowed) {
        if (quota?.error === "limit_exceeded") {
          return NextResponse.json(
            { error: "오늘의 무료 질문 횟수(3회)를 모두 사용했습니다. Premium 플랜으로 업그레이드하면 월 30회 이용 가능합니다." },
            { status: 429 }
          );
        }
        return NextResponse.json(
          { error: "질문 권한을 확인할 수 없습니다." },
          { status: 403 }
        );
      }
      dailyCount = quota.count;
    } else if (askLimit > 0) {
      // Premium: 월간 대화 세션 수 제한 (새 대화만 카운트, 후속 질문은 무제한)
      if (!conversationId) {
        const now = new Date();
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstNow = new Date(now.getTime() + kstOffset);
        const startOfMonth = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), 1) - kstOffset);

        const { count } = await supabase
          .from("ask_conversations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", startOfMonth.toISOString());

        monthlyCount = (count || 0) + 1;
        if ((count || 0) >= askLimit) {
          return NextResponse.json(
            { error: `이번 달 AI 질문 ${askLimit}회를 모두 사용하셨습니다. Premium+로 업그레이드하면 무제한 이용 가능합니다.`, monthly_used: count, monthly_limit: askLimit },
            { status: 429 }
          );
        }
      }
    }
    // askLimit === -1: 무제한 (Premium+/Pastor/Church) — 쿼터 체크 없음

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
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages,
    });

    const assistantMessage =
      response.content?.[0]?.type === "text" ? response.content[0].text : "";

    if (!assistantMessage) {
      return NextResponse.json(
        { error: "빈 응답을 받았습니다. 다시 시도해주세요." },
        { status: 502 }
      );
    }

    // AI 응답 저장
    await supabase.from("ask_messages").insert({
      conversation_id: convId,
      role: "assistant",
      content: assistantMessage,
    });

    // 카운트는 이미 RPC에서 원자적으로 증가됨 — 여기선 추가 작업 없음

    return NextResponse.json({
      conversationId: convId,
      message: assistantMessage,
      dailyCount,
      monthlyCount,
      monthlyLimit: askLimit > 0 ? askLimit : undefined,
    });
  } catch (error) {
    console.error("Ask API error:", error);
    return NextResponse.json(
      { error: "답변을 생성하는 데 실패했습니다." },
      { status: 500 }
    );
  }
}
