"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function JoinChurchPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [currentChurch, setCurrentChurch] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    checkCurrent();
  }, []);

  async function checkCurrent() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("church_name")
      .eq("id", user.id)
      .single();
    if (data?.church_name) setCurrentChurch(data.church_name);
  }

  async function handleJoin() {
    if (code.length < 4) return;
    setLoading(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("로그인이 필요합니다.");
      setLoading(false);
      return;
    }

    // 교회 조회
    const { data: church, error } = await supabase
      .from("churches")
      .select("id, name")
      .eq("invite_code", code.toUpperCase())
      .single();

    if (error || !church) {
      setMessage("유효하지 않은 교회 코드입니다.");
      setLoading(false);
      return;
    }

    // profiles 업데이트
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ church_id: church.id, church_name: church.name })
      .eq("id", user.id);

    if (updateError) {
      setMessage("가입 실패: " + updateError.message);
      setLoading(false);
      return;
    }

    setMessage(`"${church.name}"에 가입되었습니다!`);
    setTimeout(() => router.push("/profile"), 1500);
  }

  return (
    <div className="px-5 pt-6">
      <h1 className="text-xl font-bold text-green-dark mb-6">교회 가입</h1>

      {currentChurch && (
        <div className="bg-green-dark/5 rounded-xl p-4 mb-4">
          <p className="text-sm text-mid-gray">현재 소속 교회</p>
          <p className="font-bold text-green-dark">{currentChurch}</p>
          <p className="text-xs text-mid-gray mt-1">
            새 교회 코드를 입력하면 변경됩니다.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <h2 className="font-bold text-charcoal mb-3">교회 코드 입력</h2>
        <p className="text-mid-gray text-sm mb-4">
          목사님에게 받은 6자리 교회 코드를 입력하세요.
        </p>

        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="6자리 교회 코드"
          maxLength={6}
          className="w-full px-4 py-3 bg-cream border border-light-gray rounded-lg text-center tracking-widest font-mono text-lg focus:outline-none focus:ring-2 focus:ring-green"
        />

        {message && (
          <p
            className={`text-sm text-center mt-3 p-3 rounded-lg ${
              message.includes("가입되었")
                ? "bg-green/10 text-green-dark"
                : "bg-gold/10 text-gold"
            }`}
          >
            {message}
          </p>
        )}

        <button
          onClick={handleJoin}
          disabled={loading || code.length < 4}
          className="w-full mt-4 py-3 bg-green text-white font-bold rounded-lg disabled:opacity-50"
        >
          {loading ? "확인 중..." : "교회 가입"}
        </button>
      </div>

      <div className="bg-gold/10 rounded-xl p-4">
        <h3 className="font-bold text-gold text-sm mb-2">📱 QR로 가입</h3>
        <p className="text-charcoal text-sm">
          목사님이 보여주는 QR 코드를 스마트폰 카메라로 스캔하세요.
          자동으로 이 페이지로 이동해 가입됩니다.
        </p>
      </div>

      <div className="mt-6 text-center">
        <Link href="/profile" className="text-mid-gray text-sm">
          ← 프로필로 돌아가기
        </Link>
      </div>
    </div>
  );
}
