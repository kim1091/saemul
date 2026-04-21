import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase-server";

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
      .select("role, subscription_tier, is_admin")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 403 });
    }

    const paid = profile.is_admin || profile.role === "pastor" ||
      (profile.subscription_tier !== "free" && !!profile.subscription_tier);

    if (!paid) {
      return NextResponse.json({ error: "유료 회원만 이용 가능한 기능입니다" }, { status: 403 });
    }

    const body = await request.json();
    const passage = typeof body.passage === "string" ? body.passage.trim() : "";

    if (!passage || passage.length > 200) {
      return NextResponse.json({ error: "성경 본문을 입력해주세요 (최대 200자)" }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: `당신은 한국 교회 설교학 전문가입니다. 아래 성경 본문을 심도 있게 분석하여 서로 다른 관점의 Big Idea를 10개 이상 제시해주세요.

## 성경 본문
${passage}

## 요구사항
각 Big Idea마다 다음을 포함해주세요:
1. **Big Idea**: 설교 전체를 관통하는 단 하나의 중심 문장 (주어+술어, 구체적 명제)
2. **FCF**: 이 본문이 다루는 인간의 근본 문제 (청중의 현실적 고민)
3. **대지 1**: 첫 번째 핵심 포인트
4. **대지 2**: 두 번째 핵심 포인트
5. **대지 3**: 세 번째 핵심 포인트
6. **접근 방식**: 어떤 관점에서 본문을 바라보는지 한 줄 설명

## 다양한 관점 예시
- 구속사적 관점 (이 본문이 예수 그리스도를 어떻게 가리키는가)
- 목회적 관점 (상처받은 성도에게 위로)
- 선교적 관점 (세상을 향한 파송)
- 윤리적 관점 (삶의 실천)
- 예배적 관점 (하나님께 드리는 응답)
- 공동체적 관점 (교회의 역할)
- 시대적·문화적 관점 (원래 독자의 상황)
- 종말론적 관점 (하나님 나라의 완성)
- 개인 영성 관점 (내면의 변화)
- 가정/관계 관점 (일상의 적용)

## 출력 형식 (반드시 JSON 배열)
[
  {
    "b": "Big Idea 문장",
    "f": "FCF 문장",
    "p1": "대지 1",
    "p2": "대지 2",
    "p3": "대지 3",
    "angle": "접근 방식 한 줄"
  }
]

최소 10개, 최대 15개를 제시해주세요. JSON만 출력하세요.`,
      }],
    });

    const text = response.content?.[0]?.type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      return NextResponse.json({ error: "응답 파싱 실패" }, { status: 502 });
    }

    const ideas = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ ideas });
  } catch (error) {
    console.error("BigIdea error:", error);
    return NextResponse.json({ error: "AI 분석 중 오류가 발생했습니다" }, { status: 500 });
  }
}
