import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Anthropic from "@anthropic-ai/sdk";

const ANALYZE_PROMPT = `당신은 설교 분석 전문가입니다. 주어진 설교를 6개 항목으로 분석하세요.

반드시 다음 JSON 형식으로만 응답하세요:

{
  "scores": {
    "scripture_fidelity": 8,
    "structure": 7,
    "application": 8,
    "delivery": 7,
    "depth": 8,
    "overall": 8
  },
  "feedback": "전체 피드백 (3-5문장, 강점과 개선점 포함)",
  "details": {
    "scripture_fidelity": "성경 본문에 대한 충실도 평가 (1-2문장)",
    "structure": "설교 구조와 흐름 평가 (1-2문장)",
    "application": "삶에 적용 가능한 실천 포인트 평가 (1-2문장)",
    "delivery": "전달력과 청중 소통 평가 (1-2문장)",
    "depth": "신학적 깊이와 통찰 평가 (1-2문장)"
  }
}

점수는 1-10 사이 정수입니다.
- scripture_fidelity: 성경 충실도 (본문을 정확히 반영하는가)
- structure: 구조/흐름 (서론-본론-결론 전개)
- application: 적용/실천 (구체적 적용점이 있는가)
- delivery: 전달력 (이해하기 쉽고 설득력 있는가)
- depth: 신학적 깊이 (피상적이지 않은 통찰)
- overall: 종합 평가`;

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const { sermonId } = await request.json();

    // 설교 조회 (본인 것만) — 설교공방 호환: passage/sermon_text 포함
    const { data: sermon, error: sermonErr } = await supabase
      .from("sermons")
      .select("id, book, chapter, verse_start, verse_end, title, content, sermon_type, audience, duration_minutes, passage, sermon_text")
      .eq("id", sermonId)
      .eq("user_id", user.id)
      .single();

    if (sermonErr || !sermon) {
      return NextResponse.json({ error: "설교를 찾을 수 없습니다: " + (sermonErr?.message || "not found") }, { status: 404 });
    }

    // 이미 분석이 있는지 확인
    const { data: existing } = await supabase
      .from("sermon_analyses")
      .select("id, scores, feedback")
      .eq("sermon_id", sermonId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "이미 분석이 완료된 설교입니다.", analysis: existing }, { status: 409 });
    }

    // 설교공방 호환: book/chapter가 null이면 passage 사용
    const reference = sermon.book
      ? `${sermon.book} ${sermon.chapter}:${sermon.verse_start}-${sermon.verse_end}`
      : (sermon as Record<string, unknown>).passage as string || "본문 미정";

    // 설교 내용 (설교공방: sermon_text, 샘물: content)
    const sermonContent = sermon.content || (sermon as Record<string, unknown>).sermon_text as string || "";

    // 너무 긴 설교는 앞부분만 분석 (Vercel 타임아웃 방지)
    const trimmed = sermonContent.length > 4000 ? sermonContent.substring(0, 4000) + "\n\n(이하 생략)" : sermonContent;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `${ANALYZE_PROMPT}\n\n--- 분석 대상 설교 ---\n본문: ${reference}\n제목: ${sermon.title || "없음"}\n유형: ${sermon.sermon_type === "quick" ? "5분 설교" : "일반 설교"} (${sermon.duration_minutes}분)\n청중: ${sermon.audience || "전체"}\n\n설교 내용:\n${trimmed}`,
      }],
    });

    const text = message.content[0];
    if (text.type !== "text") {
      return NextResponse.json({ error: "분석 생성에 실패했습니다." }, { status: 502 });
    }

    let analysisData;
    try {
      analysisData = JSON.parse(text.text);
    } catch {
      const jsonMatch = text.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: "분석 결과 파싱 실패" }, { status: 502 });
      }
    }

    // DB 저장
    const { data: saved, error: saveErr } = await supabase
      .from("sermon_analyses")
      .insert({
        sermon_id: sermonId,
        scores: analysisData.scores,
        feedback: JSON.stringify({ feedback: analysisData.feedback, details: analysisData.details }),
      })
      .select()
      .single();

    if (saveErr) {
      return NextResponse.json({ error: "분석 저장 실패: " + saveErr.message }, { status: 500 });
    }

    return NextResponse.json({
      id: saved.id,
      scores: analysisData.scores,
      feedback: analysisData.feedback,
      details: analysisData.details,
    });
  } catch (error) {
    console.error("Sermon analysis error:", error);
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
