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
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else window.location.href = "/home";
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
