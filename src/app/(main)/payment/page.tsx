"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { createClient } from "@/lib/supabase";

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "";

interface Plan {
  tier: string;
  label: string;
  price: number;
  description: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
    tier: "premium",
    label: "Premium",
    price: 4_900,
    description: "성도를 위한 AI 성경 도우미",
    features: ["5분 설교 월 4회", "AI 질문 월 30회", "소그룹 생성"],
  },
  {
    tier: "premium_plus",
    label: "Premium+",
    price: 9_900,
    description: "더 깊은 성경 공부",
    features: ["5분 설교 월 10회", "AI 질문 무제한", "Big Idea 분석 월 10회"],
  },
  {
    tier: "pastor",
    label: "Pastor",
    price: 19_900,
    description: "부목사·전도사를 위한 설교공방",
    features: ["설교공방 무제한", "AI 질문 무제한", "Big Idea·설교 분석 무제한"],
  },
  {
    tier: "church",
    label: "Church",
    price: 99_000,
    description: "교회 통합 관리 플랫폼",
    features: [
      "담임목사 설교공방 무제한",
      "교회 관리 (출석·심방·재정)",
      "다수 관리자 지정",
    ],
  },
];

export default function PaymentPage() {
  const router = useRouter();
  const [currentTier, setCurrentTier] = useState<string>("free");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();
      if (data) setCurrentTier(data.subscription_tier);
    })();
  }, []);

  async function handlePayment(plan: Plan) {
    setError(null);
    setLoading(plan.tier);

    try {
      // 1) 서버에서 주문 생성
      const res = await fetch("/api/payment/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: plan.tier }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "주문 생성 실패");
        setLoading(null);
        return;
      }

      // 2) Toss 결제 위젯 호출
      const { data: { user } } = await supabase.auth.getUser();
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({
        customerKey: user?.id || "anonymous",
      });

      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: data.amount },
        orderId: data.orderId,
        orderName: data.orderName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
      });
    } catch (err: unknown) {
      // 사용자가 결제창 닫으면 여기로 옴
      const message = err instanceof Error ? err.message : "결제가 취소되었습니다.";
      if (!message.includes("PAY_PROCESS_CANCELED")) {
        setError(message);
      }
      setLoading(null);
    }
  }

  // 현재 티어 순서 (업그레이드 가능 여부 판단)
  const tierOrder = ["free", "premium", "premium_plus", "pastor", "church"];
  const currentIdx = tierOrder.indexOf(currentTier);

  return (
    <div className="px-5 pt-6 pb-8">
      <button
        onClick={() => router.back()}
        className="text-mid-gray text-sm mb-4 flex items-center gap-1"
      >
        ← 돌아가기
      </button>

      <h1 className="text-xl font-bold text-green-dark mb-1">요금제 선택</h1>
      <p className="text-sm text-mid-gray mb-6">
        현재: <span className="font-medium text-charcoal">
          {currentTier === "free" ? "무료" : currentTier.replace("_", " ").toUpperCase()}
        </span>
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {PLANS.map((plan) => {
          const planIdx = tierOrder.indexOf(plan.tier);
          const isCurrent = plan.tier === currentTier;
          const isDowngrade = planIdx <= currentIdx;
          const isPopular = plan.tier === "premium_plus";

          return (
            <div
              key={plan.tier}
              className={`relative bg-white rounded-2xl shadow-sm border-2 p-5 transition-all ${
                isPopular ? "border-gold" : isCurrent ? "border-green" : "border-transparent"
              }`}
            >
              {isPopular && (
                <span className="absolute -top-3 left-4 bg-gold text-white text-xs font-bold px-3 py-1 rounded-full">
                  인기
                </span>
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-charcoal text-lg">{plan.label}</h3>
                  <p className="text-xs text-mid-gray">{plan.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-dark">
                    ₩{plan.price.toLocaleString()}
                  </p>
                  <p className="text-xs text-mid-gray">/월</p>
                </div>
              </div>

              <ul className="space-y-1.5 mb-4">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-charcoal flex items-start gap-2">
                    <span className="text-green mt-0.5 text-xs">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full py-2.5 text-center text-sm font-medium text-green bg-green/10 rounded-xl">
                  현재 사용 중
                </div>
              ) : isDowngrade ? (
                <div className="w-full py-2.5 text-center text-sm text-mid-gray">
                  현재 요금제보다 낮은 등급
                </div>
              ) : (
                <button
                  onClick={() => handlePayment(plan)}
                  disabled={loading !== null}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    isPopular
                      ? "bg-gold text-charcoal hover:bg-gold/90"
                      : "bg-green-dark text-white hover:bg-green-dark/90"
                  } disabled:opacity-50`}
                >
                  {loading === plan.tier ? "결제 준비 중..." : `${plan.label} 시작하기`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-mid-gray text-center mt-6 leading-relaxed">
        결제는 토스페이먼츠를 통해 안전하게 처리됩니다.<br />
        구독은 결제일로부터 30일간 유효합니다.
      </p>
    </div>
  );
}
