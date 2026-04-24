import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

/**
 * POST /api/payment/confirm
 * Toss 결제 승인 → DB 업데이트 → 티어 업그레이드
 *
 * Body: { paymentKey, orderId, amount }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { paymentKey, orderId, amount } = body as {
      paymentKey: string;
      orderId: string;
      amount: number;
    };

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ error: "필수 파라미터가 누락되었습니다." }, { status: 400 });
    }

    // 1) DB에서 주문 조회 — 본인 주문인지 + amount 일치 확인
    const { data: order } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("order_id", orderId)
      .eq("user_id", user.id)
      .single();

    if (!order) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }
    if (order.status !== "pending") {
      return NextResponse.json({ error: "이미 처리된 주문입니다." }, { status: 400 });
    }
    if (order.amount !== amount) {
      return NextResponse.json({ error: "결제 금액이 일치하지 않습니다." }, { status: 400 });
    }

    // 2) Toss API로 결제 승인
    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      console.error("TOSS_SECRET_KEY not configured");
      return NextResponse.json({ error: "결제 설정 오류" }, { status: 500 });
    }

    const tossResponse = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(secretKey + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const tossData = await tossResponse.json();

    const svc = createServiceRoleClient();

    // 3) 결제 실패 처리
    if (!tossResponse.ok) {
      await svc.from("payment_orders").update({
        status: "failed",
        failed_at: new Date().toISOString(),
        fail_reason: tossData.message || "결제 승인 실패",
        updated_at: new Date().toISOString(),
      }).eq("id", order.id);

      return NextResponse.json({
        error: tossData.message || "결제 승인에 실패했습니다.",
        code: tossData.code,
      }, { status: 400 });
    }

    // 4) 결제 성공 → 주문 업데이트
    const now = new Date().toISOString();
    await svc.from("payment_orders").update({
      status: "paid",
      payment_key: paymentKey,
      toss_order_id: tossData.orderId,
      method: tossData.method,
      receipt_url: tossData.receipt?.url || null,
      paid_at: tossData.approvedAt || now,
      updated_at: now,
    }).eq("id", order.id);

    // 5) 프로필 티어 업그레이드 + 만료일 설정
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (order.months || 1));

    await svc.from("profiles").update({
      subscription_tier: order.tier,
      subscription_expires_at: expiresAt.toISOString(),
      updated_at: now,
    }).eq("id", user.id);

    return NextResponse.json({
      success: true,
      tier: order.tier,
      expiresAt: expiresAt.toISOString(),
      receiptUrl: tossData.receipt?.url || null,
    });
  } catch (error) {
    console.error("Payment confirm error:", error);
    return NextResponse.json({ error: "결제 승인 중 오류가 발생했습니다." }, { status: 500 });
  }
}
