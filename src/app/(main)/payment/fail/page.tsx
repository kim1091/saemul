"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function PaymentFailPage() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";
  const message = searchParams.get("message") || "결제가 취소되었습니다.";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl mb-4">
        ✕
      </div>
      <h2 className="text-lg font-bold text-charcoal mb-2">결제 실패</h2>
      <p className="text-sm text-mid-gray text-center mb-1">{message}</p>
      {code && (
        <p className="text-xs text-mid-gray/60 mb-6">오류 코드: {code}</p>
      )}

      <div className="flex gap-3">
        <Link
          href="/payment"
          className="px-5 py-2.5 bg-green-dark text-white rounded-xl text-sm font-medium"
        >
          다시 시도
        </Link>
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
