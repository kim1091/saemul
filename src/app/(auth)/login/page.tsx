"use client";

import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const ERROR_KO: Record<string, string> = {
  "Invalid login credentials": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "Email not confirmed": "이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.",
  "User already registered": "이미 가입된 이메일입니다. 로그인해주세요.",
  "Password should be at least 6 characters": "비밀번호는 6자 이상이어야 합니다.",
  "Signup requires a valid password": "유효한 비밀번호를 입력해주세요.",
  "Email rate limit exceeded": "너무 많은 시도입니다. 잠시 후 다시 시도해주세요.",
  "For security purposes, you can only request this after": "보안을 위해 잠시 후 다시 시도해주세요.",
};

function toKorean(msg: string): string {
  for (const [en, ko] of Object.entries(ERROR_KO)) {
    if (msg.includes(en)) return ko;
  }
  return "오류가 발생했습니다. 다시 시도해주세요.";
}

function SessionExpiredBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("reason") !== "session-expired") return null;
  return (
    <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 text-center">
      <p className="text-sm text-charcoal font-medium">
        로그인 세션이 만료되었습니다
      </p>
      <p className="text-xs text-mid-gray mt-1">
        다시 로그인해주세요
      </p>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  async function handleKakaoLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(toKorean(error.message));
      else window.location.href = "/onboarding";
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(toKorean(error.message));
      else window.location.href = "/home";
    }
    setLoading(false);
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12 bg-cream">
      <Link href="/" className="mb-8">
        <h1 className="text-4xl font-bold text-green-dark">샘물</h1>
        <p className="text-mid-gray text-sm text-center mt-1">교회 종합 플랫폼</p>
      </Link>

      <div className="w-full max-w-sm space-y-4">
        <Suspense>
          <SessionExpiredBanner />
        </Suspense>

        {/* Email Login */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-white border border-light-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-green"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 bg-white border border-light-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-green"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green text-white font-bold py-3 rounded-lg hover:bg-green-dark transition disabled:opacity-50"
          >
            {loading ? "처리 중..." : isSignUp ? "회원가입" : "이메일로 로그인"}
          </button>
        </form>

        {message && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-sm text-red-700">{message}</p>
          </div>
        )}

        <button
          onClick={() => { setIsSignUp(!isSignUp); setMessage(""); }}
          className="w-full text-center text-sm text-mid-gray hover:text-green-dark transition"
        >
          {isSignUp ? "이미 계정이 있으신가요? 로그인" : "계정이 없으신가요? 회원가입"}
        </button>
      </div>
    </div>
  );
}
