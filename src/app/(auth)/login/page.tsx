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

        {/* 구분선 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-light-gray" />
          <span className="text-xs text-mid-gray">또는</span>
          <div className="flex-1 h-px bg-light-gray" />
        </div>

        {/* OAuth */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-light-gray py-3 rounded-lg hover:bg-cream transition"
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          <span className="text-sm font-medium text-charcoal">Google로 계속</span>
        </button>
        <button
          onClick={handleKakaoLogin}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-lg hover:opacity-90 transition"
          style={{ backgroundColor: "#FEE500" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.61 1.74 4.9 4.36 6.2l-1.1 4.07c-.1.35.3.64.6.44l4.85-3.22c.42.04.85.07 1.29.07 5.52 0 10-3.36 10-7.56S17.52 3 12 3z" fill="#3C1E1E"/></svg>
          <span className="text-sm font-medium" style={{ color: "#3C1E1E" }}>카카오로 계속</span>
        </button>
      </div>
    </div>
  );
}
