import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

// ═══ 웹 검색 (Tavily) ═══
async function searchIllustrations(passage: string, memo: string): Promise<string> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return "";
  const queries: string[] = [];
  if (passage) queries.push(passage + " 설교 예화 실화 간증");
  if (memo) queries.push(memo + " 기독교 실화 사례 뉴스");
  if (queries.length === 0) return "";

  let all: Array<{ title?: string; url: string; content?: string }> = [];
  for (const q of queries.slice(0, 2)) {
    try {
      const r = await fetch("https://api.tavily.com/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: key, query: q, search_depth: "basic", max_results: 3, include_answer: false, include_raw_content: false }),
      });
      if (r.ok) { const d = await r.json(); if (d.results) all.push(...d.results); }
    } catch (e: unknown) { console.warn("Search failed:", q, e instanceof Error ? e.message : e); }
  }
  if (all.length === 0) return "";
  const seen = new Set<string>();
  const uniq = all.filter(r => { if (seen.has(r.url)) return false; seen.add(r.url); return true; }).slice(0, 6);
  let s = "\n\n## 예화 참고 자료 (실제 웹 검색 결과)\n아래는 실제 웹에서 검색한 자료입니다. 예화 작성 시 이 자료를 **우선 활용**하고, 각주에 출처를 명시하세요.\n\n";
  uniq.forEach((r, i) => { s += `### 자료 ${i + 1}: ${r.title || ""}\n- URL: ${r.url}\n${r.content ? "- 내용: " + r.content.slice(0, 400) + "\n" : ""}\n`; });
  return s;
}

// ═══ 예화 원칙 (모든 방법론 공통) ═══
const ILLUS_RULES = `

## 예화 원칙 (절대 규칙)
1. **AI가 지어낸 이야기·인물·사건 절대 금지. 위반 시 설교 전체가 무효.**
2. 허용되는 예화 출처만 사용:
   - 위 '참고 자료'에서 검색된 실제 기사/도서 (최우선)
   - 널리 알려진 역사적 사실 (출처 명시 가능한 것만)
   - 설교자 본인 경험 → "[설교자 경험]"으로 표시
3. 출처를 확신할 수 없는 예화는 절대 쓰지 마라. 대신:
   → "[설교자 예화 삽입 — 주제: ○○에 관한 경험]"으로 빈칸을 남겨라.
4. **모든 예화에 각주 필수**:
   ¹ 저자, 『도서명』(출판사, 연도), pp.XX
   ² 「기사 제목」, 매체명, YYYY.MM.DD, URL
   ³ 설교자 개인 경험
5. "제가 아는 한 목사님/선교사님" 같은 모호한 가짜 인물 절대 금지
6. 예화 소재 가족 편중 금지 — 직장·역사·사회·자연·문화 다양하게
7. 참고 자료가 없으면 예화 자체를 쓰지 말고 빈칸("[설교자 예화]")으로 남겨라`;

// ── 5분 나눔용 프롬프트 (기존 유지) ──
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

// ── 설교공방 2단계 시스템 프롬프트 ──
const WORKSHOP_SYSTEM = `당신은 20년 경력의 한국 교회 설교자입니다. "잘 쓴 글"이 아니라 "회중의 심장을 두드리는 말씀"을 작성하세요.

## 핵심 철학
이 설교는 AI가 대신 쓰는 카피가 아닙니다. **설교자가 본문을 씨름하고, 대지를 정하고, 방향을 잡은 위에 AI가 살을 붙이는 콜라보**입니다.

## 설교 전체 감정 곡선 (반드시 따르라)
아이스브레이크(호기심/웃음) → 서론 예화(공감/아픔) → 본문 깊이(경이/발견) → 대지1(위로 또는 긴장) → 대지2(도전 또는 해방) → 호흡(고요/경건) → 대속사(감동/울컥) → 결론(결단/소망) → 축도(평안/파송)
**인접한 두 섹션이 같은 감정이면 안 된다. 감정의 고저차가 설교의 생명이다.**

## 절대 금지 사항
1. "제가 아는 한 목사님/선교사님" 같은 모호한 가짜 예화
2. 매 대지를 "여러분,"으로 시작하는 것
3. 아이스브레이크를 항상 질문으로 시작하는 것
4. "~했습니다. ~했습니다. ~했습니다." 같은 문장 동어반복
5. 적용에서 "핸드폰에 저장하기, 하루 한 번 읽기" 매번 반복
6. 감정 없는 정보 나열 (강의가 아니라 설교임을 잊지 마라)
7. 출처 불확실한 통계, 인용 날조
8. 모든 예화를 가족(아내, 자녀) 이야기로만 채우는 것 - 직장, 역사, 사회, 자연 등 다양하게
9. 설교 전체가 같은 감정(위로만, 도전만)으로 흐르는 것 - 감정의 곡선을 만들라
10. 찬송가 번호 날조 - 확실하지 않으면 번호 생략하고 곡명만 기재
11. 보조 성경 인용 시 본문과 무관한 구절 사용 - 반드시 해당 대지의 핵심 주제와 직접 연결되는 구절만
12. 대속사에서 추상적 신학 진술로만 끝내는 것 - 반드시 감각적 장면(소리, 빛, 눈물, 손 등)을 그려라

## 출력 형식
설교단에서 바로 낭독할 수 있는 완전 원고. 마크다운 제목(#, ##)으로 구분.`;

// ── 원포인트 시스템 프롬프트 ──
const ONEPOINT_SYSTEM = `당신은 20년 경력의 한국 교회 설교자입니다. **원포인트 설교**를 작성합니다.

## 원포인트 설교
본문에서 **단 하나의 핵심 진리**만 추출, Head(이해)·Heart(감동)·Hand(실천) 세 각도로 비추어 각인시키는 방법론.

## 원칙
1. 하나만 말하라 — Big Idea가 곧 대지이자 결론
2. 핵심 문장 3~4회 반복, 매번 다른 표현
3. 감정 곡선: 도입(호기심) → Head(경이) → Heart(아픔) → Hand(도전) → 대속사(감동) → 착지(결단) → 파송(평안)

## 금지: 대지 2개 이상, 가짜 예화, 동어반복, 출처 날조, 대속사 추상 진술

## 출력: 낭독용 완전 원고. 마크다운(#, ##) 구분.`;

// ── 네페이지 시스템 프롬프트 ──
const FOURPAGE_SYSTEM = `당신은 20년 경력의 한국 교회 설교자입니다. **네페이지 설교(Four-Page Sermon)**를 작성합니다.

## 네페이지 설교 (Paul Scott Wilson)
Page1: 본문 속 문제 → Page2: 삶 속 문제 → 전환점 → Page3: 본문 속 은혜 → Page4: 삶 속 은혜

## 원칙
1. 각 페이지 ~25% 균형
2. 전환점(The Turn) — 최소 3~5문장, 가장 공들여 쓰라
3. 은혜 > 문제
4. Page2↔4 거울 — 같은 장면, 다른 눈

## 감정 곡선
도입(호기심) → P1(긴장) → P2(아픔) → Turn(고요→경이) → P3(감동) → P4(소망) → 파송(평안)

## 금지: 대지 나열, P1·2에서 해결책, 전환점 한 줄, 가짜 예화, P4에서 P2와 다른 새 상황

## 출력: 낭독용 완전 원고. ## Page 1 등으로 구분.`;

// ── 아이스브레이커 스타일 7종 ──
const ALL_ICEBREAKERS = [
  { style: '【상상 유도형】 "지금 이런 장면을 상상해 보세요..."로 시작. 회중이 머릿속에 그림을 그리게 한 뒤, 그 장면과 본문의 FCF를 연결하라.', exclude: [] as string[] },
  { style: '【뉴스/시사형】 최근 실제 뉴스, 사회 현상, 트렌드를 언급하며 시작. "요즘 ○○라는 말이 유행입니다"처럼 시대의 언어로 FCF에 진입하라.', exclude: ['장례예배','추도예배'] },
  { style: '【개인 고백형】 설교자 본인의 솔직한 약함, 실패, 고민을 짧게 고백하며 시작. "솔직히 이번 주 저도..."로 시작해 회중과 같은 눈높이에 서라.', exclude: [] as string[] },
  { style: '【숫자/통계형】 놀라운 숫자나 통계로 시작. "한 조사에 따르면 ○○%의 사람들이..."로 시작해 호기심을 자극하고 FCF로 연결하라. 단, 실제 검증 가능한 통계만 사용.', exclude: ['장례예배','결혼예배','추도예배'] },
  { style: '【대화 재현형】 실제 있을 법한 대화를 재현하며 시작. "지난주에 한 분이 이런 말씀을 하셨어요. \'목사님, 저는요...\'"처럼 생생한 현장감으로 시작하라.', exclude: [] as string[] },
  { style: '【침묵/묵상형】 "잠시 눈을 감아 보시겠어요?"로 시작. 10초 침묵 후 조용한 질문을 던져 내면을 열게 하라. 가장 조용하지만 가장 강력한 시작.', exclude: [] as string[] },
  { style: '【일상 관찰형】 "오늘 아침 교회 오는 길에..." 또는 "어제 저녁에 TV를 보다가..." 등 일상의 한 장면에서 시작해 자연스럽게 본문 주제로 이끌라.', exclude: ['장례예배','추도예배'] },
];

// ── 적용 스타일 6종 ──
const APPLICATIONS = [
  '【도전형】 "이번 주, 한 걸음 내딛어 봅시다" - 구체적 실천 행동을 제시. 두렵지만 해볼 만한 도전. 설교자도 함께 도전하겠다고 선언.',
  '【위로형】 "괜찮습니다. 지금 그 자리에서도 주님은 함께하십니다" - 지친 자에게 쉼과 은혜를 선포. 아무것도 안 해도 된다는 복음의 위로.',
  '【결단형】 "오늘, 이 자리에서 결단합시다" - 구체적 결단을 촉구. 회중에게 선택의 순간을 만들어줌.',
  '【감사형】 "이 은혜를 기억합시다" - 본문에서 발견한 하나님의 은혜를 세어보게 함. 감사 제목을 구체적으로 떠올리게 안내.',
  '【선포형】 "우리는 ○○한 백성입니다" - 정체성을 선언. 하나님이 우리를 어떤 존재로 부르셨는지 선포.',
  '【관계형】 "이번 주, 한 사람에게..." - 배운 말씀을 관계 속에서 실천. 용서, 화해, 격려, 섬김 등 구체적 관계 행동을 제안.',
];

// ── 톤 매핑 ──
const TONE_MAP: Record<string, string> = {
  warm: '따뜻하고 부드러운 톤. 위로와 공감 중심.',
  strong: '강하고 선포적인 톤. 도전과 확신 중심.',
  conversational: '친구에게 말하듯 편안한 대화체. "~요" 체 사용.',
  poetic: '시적이고 감성적인 톤. 이미지와 은유를 풍부하게.',
};

// ── 예배/절기 자동감지 ──
const WORSHIP_TYPES: Record<string, string> = {
  '헌신':'헌신예배','새벽':'새벽예배','수요':'수요예배','금요':'금요기도회',
  '심야':'심야예배','부흥':'부흥회','전도':'전도집회','임직':'임직예배',
  '취임':'취임예배','장례':'장례예배','결혼':'결혼예배','추도':'추도예배',
  '감사':'감사예배','송구영신':'송구영신예배','세례':'세례예배','입교':'입교예배',
};
const SEASONS: Record<string, string> = {
  '부활':'부활절','성탄':'성탄절','크리스마스':'성탄절','사순':'사순절',
  '대강':'대강절','고난':'고난주간','추수감사':'추수감사절','맥추':'맥추감사절',
  '성령강림':'성령강림절','종교개혁':'종교개혁주일','어버이':'어버이주일',
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function detectFromMemo(memo: string) {
  let worship = '', season = '';
  for (const [k, v] of Object.entries(WORSHIP_TYPES)) { if (memo.includes(k)) { worship = v; break; } }
  for (const [k, v] of Object.entries(SEASONS)) { if (memo.includes(k)) { season = v; break; } }
  return { worship, season };
}

function isPaid(profile: { role?: string; subscription_tier?: string; is_admin?: boolean }): boolean {
  if (profile.is_admin) return true;
  if (profile.role === 'pastor') return true;
  return profile.subscription_tier !== 'free' && !!profile.subscription_tier;
}

// ── 설교공방 스타일 프롬프트 빌더 ──
function buildWorkshopPrompt(opts: {
  passage?: string; audience: string; length: string; memo: string;
  point1: string; point2: string; point3: string;
  tone?: string; worship: string; season: string;
}) {
  const { passage, audience, length, memo, point1, point2, point3, tone, worship, season } = opts;
  const hasPassage = passage && passage.trim().length > 0;
  const hasPoints = !!point1;
  const safeTone = (tone && TONE_MAP[tone]) || '상황에 맞게 톤을 자유롭게 조절. 한 설교 안에서도 부드러움→긴장→감동→도전으로 감정의 흐름을 만들어라.';

  // 아이스브레이커 선택 (예배 유형에 따라 필터)
  const filtered = ALL_ICEBREAKERS.filter(i => !i.exclude.includes(worship));
  const iceStyle = pickRandom(filtered.length > 0 ? filtered : ALL_ICEBREAKERS).style;
  const appStyle = pickRandom(APPLICATIONS);

  const prompt = `## 기본 정보
${hasPassage ? '- 성경 본문: ' + passage : '- 본문 자동 선정: 아래 주제에 가장 적합한 본문을 선택하고 이유를 밝히세요'}
- 청중: ${audience}
- 목표: ${length}분${worship ? '\n- 예배: ' + worship : ''}${season ? '\n- 절기: ' + season : ''}
${memo ? '- 설교자 메모: ' + memo : ''}
- 설교 톤: ${safeTone}

${hasPoints ? `## 설교자가 정한 대지 (반드시 이 대지를 사용하세요!)
- 대지 1: ${point1}
${point2 ? '- 대지 2: ' + point2 : ''}
${point3 ? '- 대지 3: ' + point3 : ''}
이 대지는 설교자가 본문을 묵상하며 직접 정한 것입니다. AI는 이 대지의 방향을 존중하되, 성경적 근거·예화·적용을 풍성하게 채워주세요.
` : ''}## 작성 지침

### [Big Idea & FCF]
설교 맨 처음에 다음을 명시하세요:
- **Big Idea**: 이 설교 전체를 관통하는 단 하나의 문장 (주어+술어 완성형)
- **FCF**: 이 본문이 다루는 인간의 근본 문제. "이 말씀이 없으면 청중은 어떤 결핍에 처하는가?"

### [아이스브레이크] 2~3분
${iceStyle}
- 절대 "여러분, ○○해 본 적 있으신가요?" 같은 진부한 질문으로 시작하지 마라.
- 첫 두 문장 안에 회중의 호기심 또는 감정을 잡아야 한다.
- 아이스브레이크 끝에서 FCF로 자연스럽게 진입.

### [서론 예화] 2~3분
- **절대 "제가 아는 한 목사님" 같은 모호한 인물을 만들지 마라.**
- 설교자 본인의 경험(1인칭)으로 쓰거나, 역사적 실존 인물/사건을 사용하라.
- 또는 "[여기에 설교자님의 경험을 넣으세요]"로 빈칸을 남기되, **(AI 대안 예화)** 헤더로 같은 FCF를 드러내는 실존 인물/사건 예화를 작성하라.
- 예화에 시각·청각·촉각 등 감각 묘사를 넣어 생생하게.
- **서론 예화는 아이스브레이크와 다른 소재·장면·영역을 사용하라.**

### [본문 낭독] 1~2분
- 개역개정 본문 전체 인용. 난해한 구절은 새번역으로 보충.
- 핵심 구절에 강조 표시.

### [본문 깊이] 2~3분
- 역사·문화·정치적 배경 중 **회중이 "오!" 할 만한 것 1~2개만** 선별.
- 원어는 발음+의미 수준. 학문적 나열 금지.
- 반드시 "그래서 오늘 우리에게는..."으로 현대 연결.

### [대지] - 설교의 심장 (전체의 55~65%)
${hasPoints ? '설교자가 정한 대지를 그대로 사용하되, 각 대지에 아래 요소를 채우세요:' : '본문에서 자연스럽게 도출되는 대지 2개를 설정하되, 뻔하지 않은 각도를 찾으세요.'}
각 대지 필수 요소:
- **도입**: 이 대지의 핵심을 한 문장으로 선언
- **본문 근거**: 해당 구절이 왜 이 대지를 지지하는지
- **보조 성경**: 구약 1절 + 신약 1절 (개역개정). **반드시 해당 대지와 직접 연결되는 구절만. 선택 이유 한 문장.**
- **예화/적용**: 회중의 삶에서 어떻게 작동하는지. **소재는 가족에 편중하지 말고 직장·역사·사회·자연·문화 등 다양하게.**
- **감정 전환**: 대지마다 감정 색깔을 다르게 (대지1 위로 → 대지2 도전)
- **청중 저항 처리**: 구체적 반론 + 복음적 답변
- **"오늘 나에게 하는 한 마디"**: 2인칭으로 전달

### [호흡·쉼]
- 대속사 직전, 10~15초 침묵. 창의적으로.

### [대속사 - 십자가 연결] 2~3분
- "예수님이 대신 죽으셨습니다" 공식 반복 금지. 이 본문만의 고유한 복음 연결점을 찾으라.
- **클라이맥스 한 문장은 반드시 감각적 장면을 그려라.**

### [결론 & 적용] 3~4분
${appStyle}
- "이번 주 할 한 가지"를 3개 나열하되, 매번 같은 포맷 금지.

### [결단 기도문] 7~10문장
- Big Idea와 직결. 이 설교를 들은 사람만 드릴 수 있는 구체적 기도.

### [축도·파송]
- 본문의 언어를 사용한 축복.

### [부록]
- 찬양 추천: 설교 전 2~3곡 + 설교 후 1~2곡. 번호 불확실하면 곡명만.
- 소그룹 나눔 질문 4~5개`;

  return { prompt, appStyle, hasPoints, numPoints: [point1, point2, point3].filter(Boolean).length };
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { sermonType } = body as { sermonType: string };

    // ━━ Quick (5분 나눔) ━━
    if (sermonType === "quick") {
      return handleQuickSermon(supabase, user.id, body);
    }

    // ━━ Workshop (설교공방 2단계) ━━
    return handleWorkshopSermon(supabase, user.id, body);
  } catch (error) {
    console.error("Sermon generation error:", error);
    return NextResponse.json({ error: "설교 생성에 실패했습니다." }, { status: 500 });
  }
}

// ── Quick 5분 설교 ──
async function handleQuickSermon(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  body: Record<string, unknown>,
) {
  const { book, chapter, verseStart, verseEnd, audience } = body as {
    book: string; chapter: number; verseStart: number; verseEnd: number; audience?: string;
  };

  const reference = `${book} ${chapter}:${verseStart}-${verseEnd}`;
  let prompt = QUICK_SERMON_PROMPT + `\n\n성경 본문: ${reference}`;
  if (audience) prompt += `\n청중: ${audience}`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content?.[0]?.type === "text" ? response.content[0].text : "";
  if (!text) return NextResponse.json({ error: "빈 응답입니다." }, { status: 502 });

  let sermonData: { title: string; content: string };
  try {
    sermonData = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    sermonData = match ? JSON.parse(match[0]) : { title: reference, content: text };
  }

  const { data: sermon } = await supabase
    .from("sermons")
    .insert({
      user_id: userId, sermon_type: "quick",
      book, chapter, verse_start: verseStart, verse_end: verseEnd,
      title: sermonData.title, content: sermonData.content,
      duration_minutes: 5, audience: audience || null,
      passage: reference, sermon_text: sermonData.content, length: "5분", memo: "",
    })
    .select("id")
    .single();

  return NextResponse.json({ id: sermon?.id, title: sermonData.title, content: sermonData.content });
}

// ── Workshop 설교공방 2단계 설교 ──
async function handleWorkshopSermon(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  body: Record<string, unknown>,
) {
  // 프로필 조회
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, subscription_tier, is_admin, trial_count")
    .eq("id", userId)
    .single();

  if (!profile) return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 403 });

  const paid = isPaid(profile);

  // 체험 쿼터 (유료가 아닌 경우 3회 제한)
  const currentCount = (profile.trial_count as number) || 0;
  if (!paid && currentCount >= 3) {
    return NextResponse.json(
      { error: "무료 체험 3회를 모두 사용하셨습니다", trial_count: currentCount, exhausted: true },
      { status: 403 }
    );
  }

  // 입력 검증
  const passage = typeof body.passage === "string" ? body.passage.slice(0, 200) : "";
  const memo = typeof body.memo === "string" ? body.memo.slice(0, 500) : "";
  const point1 = typeof body.point1 === "string" ? body.point1.slice(0, 200) : "";
  const point2 = typeof body.point2 === "string" ? body.point2.slice(0, 200) : "";
  const point3 = typeof body.point3 === "string" ? body.point3.slice(0, 200) : "";
  const tone = typeof body.tone === "string" ? body.tone : undefined;

  if (!passage && !memo) {
    return NextResponse.json({ error: "성경 본문 또는 메모를 입력해주세요" }, { status: 400 });
  }

  const ALLOWED_AUDIENCES = ["전체 회중", "장년부", "청년부", "중고등부"];
  const audience = ALLOWED_AUDIENCES.includes(body.audience as string) ? (body.audience as string) : "전체 회중";
  const ALLOWED_LENGTHS = ["20", "25", "30", "40"];
  const length = ALLOWED_LENGTHS.includes(String(body.length)) ? String(body.length) : "25";

  const { worship, season } = memo ? detectFromMemo(memo) : { worship: "", season: "" };
  const structure = typeof body.structure === "string" ? body.structure : "default";

  // 웹 검색 (1단계에서만)
  const stage = (body.stage as number) || 1;
  const firstHalf = (body.firstHalf as string) || "";
  const searchContext = stage === 1 ? await searchIllustrations(passage, memo) : "";

  const { prompt: basePrompt, appStyle, hasPoints, numPoints } = buildWorkshopPrompt({
    passage, audience, length, memo, point1, point2, point3, tone, worship, season,
  });

  // 방법론별 프롬프트 + 시스템 프롬프트 결정
  const iceStyle = pickRandom(ALL_ICEBREAKERS.filter(i => !i.exclude.includes(worship)) || ALL_ICEBREAKERS).style;
  const appPick = pickRandom(APPLICATIONS);

  let systemPrompt: string;
  let prompt: string;
  let messages: Anthropic.MessageParam[];

  if (structure === "onepoint") {
    // ━━ 원포인트 ━━
    systemPrompt = ONEPOINT_SYSTEM + ILLUS_RULES;
    const corePoint = point1 || "";
    prompt = `## 기본 정보\n${passage ? "- 성경 본문: " + passage : "- 본문 자동 선정"}\n- 청중: ${audience}\n- 목표: ${length}분${worship ? "\n- 예배: " + worship : ""}${season ? "\n- 절기: " + season : ""}${memo ? "\n- 설교자 메모: " + memo : ""}` +
      (corePoint ? `\n\n## 설교자가 정한 핵심 진리\n> "${corePoint}"` : "") + searchContext +
      `\n\n## 원포인트 구조\n### [Big Idea]\n${corePoint ? "위 핵심 진리를 Big Idea로." : "단 하나의 핵심 진리 제시."}\n### [도입] 2~3분\n${iceStyle}\n"오늘 이것 하나만 말씀드리겠습니다." 본문 낭독.\n### [핵심 선언] 1분\nBig Idea 정면 선포.\n### [각도① Head] ~20%\n본문 배경 핵심 1개. 🔁 1차 반복(발견 톤)\n### [각도② Heart] ~20%\n삶의 장면. 예화(참고 자료+각주). 청중 저항. 🔁 2차 반복(위로 톤)\n### [각도③ Hand] ~20%\n변화·초대. 보조 성경 1절. 🔁 3차 반복(도전 톤)\n### [대속사] 2~3분\n십자가 연결. 감각적 클라이맥스.\n### [착지] 2~3분\n${appPick} "이것 하나만" 실천 1가지. 🔁 최종 반복(선포 톤)\n### [결단 기도문] 5~7문장\n### [파송 축복]\n### [부록] 찬양 + 소그룹 질문 3개`;

    if (stage === 2 && firstHalf) {
      messages = [{ role: "user", content: prompt }, { role: "assistant", content: firstHalf },
        { role: "user", content: `후반부: 대속사(감각적 클라이맥스) → 착지(${appPick} 🔁최종 반복) → 기도문 → 파송 → 부록. **부록까지 완성.**` }];
    } else {
      messages = [{ role: "user", content: prompt + "\n\n**[1단계] Big Idea, 도입, 핵심 선언, 각도①②③까지만. 핵심 문장 3회 반복 확인. 완전한 문장으로 마무리.**" }];
    }

  } else if (structure === "fourpage") {
    // ━━ 네페이지 ━━
    systemPrompt = FOURPAGE_SYSTEM + ILLUS_RULES;
    prompt = `## 기본 정보\n${passage ? "- 성경 본문: " + passage : "- 본문 자동 선정"}\n- 청중: ${audience}\n- 목표: ${length}분${worship ? "\n- 예배: " + worship : ""}${season ? "\n- 절기: " + season : ""}${memo ? "\n- 설교자 메모: " + memo : ""}` +
      (point1 ? `\n\n## 설교자 방향\n- 문제(Trouble): ${point1}` : "") + (point2 ? `\n- 은혜(Grace): ${point2}` : "") + searchContext +
      `\n\n## 네페이지 구조\n### [Big Idea & FCF & Grace]\nBig Idea, FCF, Grace 제시.\n### [도입] 2~3분\n${iceStyle}\n"오늘 본문에는 문제와 답이 함께 있습니다." 본문 낭독.\n### [Page 1 — 본문 속 문제] ~20%\n본문 갈등·한계. **해결하지 마라.**\n### [Page 2 — 삶 속 문제] ~25%\n현대 삶으로. 예화(참고 자료+각주). **바닥까지.** ⚠️ 구체적 인물/상황(P4 거울용). 마지막: "그런데..."\n### [전환점 The Turn] 1~2분\n**클라이맥스.** 어둠 응축→침묵→은혜의 첫 빛. 짧은 문장 3~5개.\n### [Page 3 — 본문 속 은혜] ~25%\n하나님 응답. 보조 성경 1절. 십자가 연결. 감각적 클라이맥스.\n### [Page 4 — 삶 속 은혜] ~20%\n⚠️ **P2 같은 장면 거울 필수.** ${appPick}\n### [결단 기도문] 7~10문장\n### [파송 축복]\n### [부록] 찬양(전2곡+후1~2곡) + 소그룹 질문 4~5개`;

    if (stage === 2 && firstHalf) {
      messages = [{ role: "user", content: prompt }, { role: "assistant", content: firstHalf },
        { role: "user", content: `후반부: 전환점(가장 공들여, 짧은 문장 3~5개) → Page 3(은혜, 감각적 클라이맥스) → Page 4(⚠️ P2 거울 필수, ${appPick}) → 기도문 → 파송 → 부록. **P4에서 반드시 P2 같은 장면 거울. 부록까지 완성.**` }];
    } else {
      messages = [{ role: "user", content: prompt + "\n\n**[1단계] Big Idea·FCF·Grace, 도입, Page 1, Page 2까지만. P1·2에서 해결책 금지. P2에 구체적 인물/상황(P4 거울용). 완전한 문장으로 마무리.**" }];
    }

  } else {
    // ━━ 연역적/귀납적/내러티브/강해/기본 ━━
    const structureInstructions: Record<string, string> = {
      deductive: "\n\n## 설교 구조: 연역적\n결론(Big Idea)을 서론에서 먼저 선언하고, 본문·예화·적용으로 증명한 뒤 결단으로 마무리하라.",
      inductive: "\n\n## 설교 구조: 귀납적\n질문·문제·현상에서 출발하여 본문을 탐구하며, 결론(Big Idea)은 설교 후반부에 드러내라. 청중이 스스로 발견하게 이끌라.",
      narrative: "\n\n## 설교 구조: 내러티브\n이야기 흐름으로 전개하라. 발단→전개→위기→절정→결말 구조. 절정에서 핵심 진리(Big Idea)를 드러내고, 청중이 이야기 속에 자신을 대입하게 하라.",
      textual: "\n\n## 설교 구조: 강해\n본문의 순서를 그대로 따라 단락별로 해설하고 적용하라. 각 단락의 핵심을 Big Idea와 연결하라.",
    };
    const structureNote = structureInstructions[structure] || "";
    systemPrompt = WORKSHOP_SYSTEM + (hasPoints ? " 설교자가 직접 정한 대지를 반드시 존중하세요." : "") + structureNote + ILLUS_RULES;
    prompt = basePrompt + searchContext;

    if (stage === 2 && firstHalf) {
      messages = [
        { role: "user", content: prompt },
        { role: "assistant", content: firstHalf },
        { role: "user", content: `위 설교문의 전반부를 이어서 후반부를 작성해 주세요:
1. [호흡·쉼] 2. [대속사] **감각적 클라이맥스** 3. [결론 & 적용] ${appStyle} 4. [결단 기도문] 7~10문장 5. [축도·파송] 6. [부록] 찬양+소그룹 질문
**전반부의 Big Idea, FCF, 톤을 이어가세요. 반드시 부록까지 완성.**` },
      ];
    } else {
      const pointRule = hasPoints ? `설교자가 정한 ${numPoints}개 대지 사용.` : "대지 2개.";
      messages = [
        { role: "user", content: prompt + `\n\n**[1단계] Big Idea·FCF, 아이스브레이크, 서론 예화, 본문 낭독, 본문 깊이, 대지 전체. ${pointRule} 완전한 문장으로 마무리.**` },
      ];
    }
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const maxTokens = stage === 2 ? 6144 : 5120;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  const sermon = response.content?.[0]?.type === "text" ? response.content[0].text : "";
  if (!sermon) return NextResponse.json({ error: "빈 응답입니다." }, { status: 502 });

  const truncated = response.stop_reason === "max_tokens";
  if (truncated) console.warn(`Stage ${stage} output truncated (max_tokens)`);

  // 1단계 성공 시 체험 카운트 증가 (유료는 제외)
  let newTrialCount = currentCount;
  if (stage === 1 && !paid) {
    const serviceClient = createServiceRoleClient();
    const { data: rpcResult } = await serviceClient.rpc("increment_trial_for_user", { p_user_id: userId });
    if (typeof rpcResult === "number" && rpcResult >= 0) newTrialCount = rpcResult;
  }

  return NextResponse.json({ sermon, stage, truncated, trial_count: newTrialCount });
}
