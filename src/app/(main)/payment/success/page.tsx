"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [result, setResult] = useState<{
    tier?: string;
    expiresAt?: string;
    receiptUrl?: string;
  }>({});
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    confirmPayment();
  }, []);

  async function confirmPayment() {
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amount = searchParams.get("amount");

    if (!paymentKey || !orderId || !amount) {
      setErrorMsg("결제 정보가 올바르지 않습니다.");
      setStatus("error");
      return;
    }

    try {
      const res = await fetch("/api/payment/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount: Number(amount),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "결제 승인에 실패했습니다.");
        setStatus("error");
        return;
      }

      setResult(data);
      setStatus("success");
    } catch {
      setErrorMsg("결제 승인 중 오류가 발생했습니다.");
      setStatus("error");
    }
  }

  const tierLabels: Record<string, string> = {
    premium: "Premium",
    premium_plus: "Premium+",
    pastor: "Pastor",
    church: "Church",
  };

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="w-12 h-12 border-4 border-green border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-charcoal font-medium">결제 승인 중...</p>
        <p className="text-xs text-mid-gray mt-1">잠시만 기다려주세요</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl mb-4">
          !
        </div>
        <h2 className="text-lg font-bold text-charcoal mb-2">결제 실패</h2>
        <p className="text-sm text-mid-gray text-center mb-6">{errorMsg}</p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/payment")}
            className="px-5 py-2.5 bg-green-dark text-white rounded-xl text-sm font-medium"
          >
            다시 시도
          </button>
          <Link
            href="/profile"
            className="px-5 py-2.5 border border-light-gray rounded-xl text-sm text-mid-gray"
          >
            프로필로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center text-3xl mb-4">
        ✓
      </div>
      <h2 className="text-lg font-bold text-charcoal mb-1">결제 완료!</h2>
      <p className="text-sm text-mid-gray mb-6">
        <span className="font-medium text-green">{tierLabels[result.tier || ""] || result.tier}</span> 요금제가 활성화되었습니다.
      </p>

      {result.expiresAt && (
        <p className="text-xs text-mid-gray mb-4">
          만료일: {new Date(result.expiresAt).toLocaleDateString("ko-KR")}
        </p>
      )}

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Link
          href="/home"
          className="w-full py-3 bg-green-dark text-white text-center rounded-xl text-sm font-bold"
        >
          홈으로 가기
        </Link>
        {result.receiptUrl && (
          <a
            href={result.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 border border-light-gray text-center rounded-xl text-sm text-mid-gray"
          >
            영수증 보기
          </a>
        )}
      </div>
    </div>
  );
}
