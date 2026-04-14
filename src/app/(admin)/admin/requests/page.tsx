"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface JoinRequest {
  id: string;
  user_id: string;
  status: string;
  message: string | null;
  created_at: string;
  user_name: string;
  user_email: string;
}

export default function JoinRequestsPage() {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [churchName, setChurchName] = useState("");
  const [pastorId, setPastorId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setPastorId(user.id);

    const { data: church } = await supabase
      .from("churches")
      .select("id, name")
      .eq("pastor_id", user.id)
      .single();

    if (!church) { setLoading(false); return; }
    setChurchId(church.id);
    setChurchName(church.name);

    // 가입 요청 + 요청자 프로필 조인
    const { data } = await supabase
      .from("join_requests")
      .select("id, user_id, status, message, created_at, profiles(display_name)")
      .eq("church_id", church.id)
      .order("created_at", { ascending: false });

    // email은 auth.users에서 따로 필요 — 현재는 profiles.display_name만 표시
    setRequests(
      (data || []).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        status: r.status,
        message: r.message,
        created_at: r.created_at,
        user_name: (r as { profiles?: { display_name?: string } }).profiles?.display_name || "이름 없음",
        user_email: "",
      }))
    );

    setLoading(false);
  }

  async function approve(req: JoinRequest) {
    if (!churchId || !pastorId) return;
    if (!confirm(`${req.user_name}님의 가입을 승인하시겠습니까?`)) return;

    // 1. 요청 상태 변경
    await supabase
      .from("join_requests")
      .update({
        status: "approved",
        responded_at: new Date().toISOString(),
        responded_by: pastorId,
      })
      .eq("id", req.id);

    // 2. 성도 프로필 업데이트
    await supabase
      .from("profiles")
      .update({ church_id: churchId, church_name: churchName })
      .eq("id", req.user_id);

    loadData();
  }

  async function reject(req: JoinRequest) {
    if (!pastorId) return;
    if (!confirm(`${req.user_name}님의 가입을 거절하시겠습니까?`)) return;

    await supabase
      .from("join_requests")
      .update({
        status: "rejected",
        responded_at: new Date().toISOString(),
        responded_by: pastorId,
      })
      .eq("id", req.id);

    loadData();
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-mid-gray">불러오는 중...</p></div>;

  if (!churchId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center">
          <p className="text-4xl mb-3">⛪</p>
          <h2 className="text-lg font-bold text-green-dark mb-2">먼저 교회를 등록해주세요</h2>
          <Link href="/admin/church" className="inline-block mt-4 px-5 py-2.5 bg-green text-white rounded-lg font-medium text-sm">교회 등록하기</Link>
        </div>
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === "pending");
  const processed = requests.filter((r) => r.status !== "pending");

  return (
    <div className="px-5 pt-6">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-mid-gray">← 관리</Link>
        <h1 className="text-xl font-bold text-green-dark">가입 요청</h1>
        <p className="text-xs text-mid-gray mt-0.5">대기 {pending.length}건 · 전체 {requests.length}건</p>
      </div>

      {/* 대기 중 */}
      {pending.length > 0 && (
        <>
          <h3 className="font-bold text-charcoal text-sm mb-2">대기 중 ({pending.length})</h3>
          <div className="space-y-2 mb-6">
            {pending.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-green-dark text-white flex items-center justify-center text-sm font-bold">
                      {r.user_name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-charcoal text-sm">{r.user_name}</p>
                      <p className="text-xs text-mid-gray">
                        {new Date(r.created_at).toLocaleDateString("ko-KR")} 요청
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approve(r)}
                    className="flex-1 py-2 bg-green text-white text-sm font-medium rounded-lg"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => reject(r)}
                    className="flex-1 py-2 bg-white border border-light-gray text-charcoal text-sm font-medium rounded-lg"
                  >
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 처리됨 */}
      {processed.length > 0 && (
        <>
          <h3 className="font-bold text-charcoal text-sm mb-2">처리 완료</h3>
          <div className="bg-white rounded-xl p-2 shadow-sm">
            {processed.map((r, i) => (
              <div key={r.id} className={`flex items-center justify-between p-3 ${i > 0 ? "border-t border-light-gray/50" : ""}`}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-light-gray text-mid-gray flex items-center justify-center text-xs font-bold">
                    {r.user_name[0]}
                  </div>
                  <span className="text-sm text-charcoal">{r.user_name}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  r.status === "approved" ? "bg-green/20 text-green" : "bg-red-100 text-red-600"
                }`}>
                  {r.status === "approved" ? "승인됨" : "거절됨"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {requests.length === 0 && (
        <div className="text-center pt-8 bg-white rounded-xl p-6">
          <p className="text-mid-gray text-sm">아직 가입 요청이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
