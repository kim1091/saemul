import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getPlanByTier, generateOrderId } from "@/lib/payment";

/**
 * POST /api/payment/prepare
 * 결제 주문 생성 → Toss 위젯에 넘길 파라미터 반환
 *
 * Body: { tier: string, months?: number }
 * Response: { orderId, amount, orderName, customerEmail, customerName }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { tier, months = 1 } = body as { tier: string; months?: number };

    // 요금제 검증
    const plan = getPlanByTier(tier);
    if (!plan) {
      return NextResponse.json({ error: "유효하지 않은 요금제입니다." }, { status: 400 });
    }

    // 이미 같은 티어이면 중복 결제 방지
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, name")
      .eq("id", user.id)
      .single();

    if (profile?.subscription_tier === tier) {
      return NextResponse.json({ error: "이미 해당 요금제를 사용 중입니다." }, { status: 400 });
    }

    const orderId = generateOrderId();
    const amount = plan.price * months;
    const orderName = `샘물 ${plan.label} ${months > 1 ? `${months}개월` : "월간"} 구독`;

    // DB에 pending 주문 기록
    const { error: insertError } = await supabase
      .from("payment_orders")
      .insert({
        user_id: user.id,
        order_id: orderId,
        tier,
        amount,
        months,
        status: "pending",
      });

    if (insertError) {
      console.error("Payment order insert error:", insertError);
      return NextResponse.json({ error: "주문 생성에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({
      orderId,
      amount,
      orderName,
      customerEmail: user.email || "",
      customerName: profile?.name || user.email?.split("@")[0] || "사용자",
    });
  } catch (error) {
    console.error("Payment prepare error:", error);
    return NextResponse.json({ error: "주문 준비 중 오류가 발생했습니다." }, { status: 500 });
  }
}
