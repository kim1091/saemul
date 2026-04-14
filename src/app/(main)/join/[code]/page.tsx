"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function JoinByCodePage() {
  const router = useRouter();
  const params = useParams();
  const code = String(params.code || "").toUpperCase();
  const [loading, setLoading] = useState(true);
  const [church, setChurch] = useState<{ id: string; name: string } | null>(null);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  useEffect(() => {
    loadChurch();
  }, [code]);

  async function loadChurch() {
    const { data, error } = await supabase
      .from("churches")
      .select("id, name")
      .eq("invite_code", code)
      .single();

    if (error || !data) {
      setMessage("유효하지 않은 교회 코드입니다.");
    } else {
      setChurch(data);
    }
    setLoading(false);
  }

  async function handleConfirm() {
    if (!church) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ church_id: church.id, church_name: church.name })
      .eq("id", user.id);

    if (error) {
      setMessage("가입 실패: " + error.message);
      setLoading(false);
      return;
    }

    setMessage(`"${church.name}"에 가입되었습니다!`);
    setTimeout(() => router.push("/home"), 1500);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-mid-gray">확인 중...</p>
      </div>
    );
  }

  if (!church) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center">
          <p className="text-4xl mb-3">❌</p>
          <h2 className="text-lg font-bold text-green-dark mb-2">
            유효하지 않은 교회 코드
          </h2>
          <p className="text-mid-gray text-sm mb-4">
            코드: {code}
          </p>
          <Link
            href="/join"
            className="inline-block px-5 py-2.5 bg-green text-white rounded-lg font-medium text-sm"
          >
            다시 입력하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 text-center">
        <p className="text-4xl mb-4">⛪</p>
        <p className="text-gold text-sm font-medium mb-1">교회 가입</p>
        <h2 className="text-2xl font-bold text-green-dark mb-2">
          {church.name}
        </h2>
        <p className="text-mid-gray text-sm mb-6">
          이 교회에 가입하시겠어요?
        </p>

        {message && (
          <p
            className={`text-sm mb-4 p-3 rounded-lg ${
              message.includes("가입되었")
                ? "bg-green/10 text-green-dark"
                : "bg-red-50 text-red-600"
            }`}
          >
            {message}
          </p>
        )}

        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full py-3 bg-green text-white font-bold rounded-lg disabled:opacity-50 mb-2"
        >
          {loading ? "가입 중..." : "가입 확인"}
        </button>

        <Link
          href="/home"
          className="block w-full py-3 text-mid-gray text-sm"
        >
          취소
        </Link>
      </div>
    </div>
  );
}
