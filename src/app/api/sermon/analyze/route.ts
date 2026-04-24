import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { canAccessWorkshop } from "@/lib/sermon-guard";

const ANALYZE_SYSTEM = `당신은 설교학 전문가입니다. 주어진 설교문을 아래 8가지 항목으로 분석하고, 반드시 유효한 JSON만 출력하세요. 설명 텍스트, 마크다운 코드블록, 기타 내용은 절대 포함하지 마세요.

출력 형식:
{
  "total_score": <8개 항목 합산 점수, 숫자>,
  "items": [
    {"name": "항목명", "score": <0~10 정수>, "comment": "현재 상태 1~2문장", "suggestion": "개선 제안 1문장"},
    ...
  ],
  "overall": "전체 평가 2~3문장",
  "strengths": ["강점1", "강점2", "강점3"],
  "improvements": ["개선점1", "개선점2", "개선점3"]
}

8가지 분석 항목 (각 0~10점):
1. Big Idea 명확성 - 설교 전체를 관통하는 단 하나의 중심 사상이 명확하게 제시되었는가
2. FCF 연결 - 인간의 근본 문제(FCF)가 서론에서 드러나고 복음으로 해결되는가
3. 대지 논리 - 각 대지가 Big Idea를 향해 논리적으로 전개되는가
4. 예화 적절성 - 예화가 구체적이고 본문 주제와 연결되는가 (가짜 예화, 모호한 인물 감점)
5. 적용 구체성 - 청중이 이번 주 실천할 수 있는 구체적 적용이 제시되는가
6. 원어 사용 정확도 - 원어가 사용된 경우 발음·의미가 적절한가 (미사용 시 5점)
7. 청중 공감도 - 청중의 삶과 연결되는 언어와 사례를 사용하는가
8. 복음 중심성 - 십자가·예수님의 대속이 설교 중심에 있는가`;

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // 유료 확인
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, subscription_tier, subscription_expires_at, is_admin")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 403 });
    }

    if (!canAccessWorkshop(profile)) {
      return NextResponse.json(
        { error: "설교공방은 목회자 전용 기능입니다. 부목사/전도사는 Pastor 플랜(₩19,900/월)으로 이용 가능합니다." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 두 가지 모드: sermonId로 DB에서 가져오기 OR sermon_text 직접 전달
    let sermonText = "";
    let sermonId: string | null = null;

    if (body.sermonId) {
      sermonId = body.sermonId;
      const { data: sermon } = await supabase
        .from("sermons")
        .select("content, sermon_text")
        .eq("id", sermonId)
        .eq("user_id", user.id)
        .single();

      if (!sermon) {
        return NextResponse.json({ error: "설교를 찾을 수 없습니다." }, { status: 404 });
      }

      sermonText = sermon.content || sermon.sermon_text || "";
    } else if (body.sermon_text) {
      sermonText = typeof body.sermon_text === "string" ? body.sermon_text.trim() : "";
    }

    if (!sermonText) {
      return NextResponse.json({ error: "설교문을 입력해주세요" }, { status: 400 });
    }

    if (sermonText.length > 20000) {
      return NextResponse.json({ error: "설교문은 최대 20,000자까지 분석할 수 있습니다" }, { status: 400 });
    }

    // 이미 분석된 설교인지 확인 (sermonId가 있는 경우)
    if (sermonId) {
      const { data: existing } = await supabase
        .from("sermon_analyses")
        .select("id, scores, feedback")
        .eq("sermon_id", sermonId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: "이미 분석이 완료된 설교입니다.", analysis: existing },
          { status: 409 }
        );
      }
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: [{ type: "text", text: ANALYZE_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{
        role: "user",
        content: `다음 설교문을 분석해주세요:\n\n${sermonText.slice(0, 18000)}`,
      }],
    });

    const raw = response.content?.[0]?.type === "text" ? response.content[0].text.trim() : "";

    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: "분석 결과를 처리할 수 없습니다" }, { status: 502 });
      }
    }

    // DB 저장 (sermonId가 있는 경우)
    if (sermonId) {
      await supabase
        .from("sermon_analyses")
        .insert({
          sermon_id: sermonId,
          scores: result.items || result.scores,
          feedback: JSON.stringify({
            total_score: result.total_score,
            overall: result.overall,
            strengths: result.strengths,
            improvements: result.improvements,
          }),
        });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
