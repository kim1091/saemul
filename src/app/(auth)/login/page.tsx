"use client";

import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useState } from "react";

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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
      });
      if (error) setMessage(error.message);
      else setMessage("확인 이메일을 보냈습니다. 이메일을 확인해주세요.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
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
        {/* Social Login */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-light-gray rounded-lg px-4 py-3 font-medium hover:bg-cream-dark transition"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google로 로그인
        </button>

        <button
          onClick={handleKakaoLogin}
          className="w-full flex items-center justify-center gap-3 bg-[#FEE500] rounded-lg px-4 py-3 font-medium hover:opacity-90 transition"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#000" d="M12 3C6.48 3 2 6.36 2 10.5c0 2.62 1.76 4.93 4.41 6.29l-1.12 4.12c-.1.36.28.65.6.46l4.87-3.22c.41.04.82.06 1.24.06 5.52 0 10-3.36 10-7.5S17.52 3 12 3z"/>
          </svg>
          카카오로 로그인
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-light-gray" />
          <span className="text-mid-gray text-sm">또는</span>
          <div className="flex-1 h-px bg-light-gray" />
        </div>

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
          <p className="text-sm text-center text-mid-gray bg-cream-dark rounded-lg p-3">
            {message}
          </p>
        )}

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-center text-sm text-mid-gray hover:text-green-dark transition"
        >
          {isSignUp ? "이미 계정이 있으신가요? 로그인" : "계정이 없으신가요? 회원가입"}
        </button>
      </div>
    </div>
  );
}
