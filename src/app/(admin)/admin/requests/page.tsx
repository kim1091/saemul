"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface Family { relation: string; name: string; birth_date: string }

interface JoinRequestDetail {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  snapshot?: {
    name?: string; phone?: string; rank?: string; services?: string[];
    baptism_date?: string; registration_date?: string;
  };
  profile: {
    name: string | null;
    phone: string | null;
    birth_date: string | null;
    gender: string | null;
    address: string | null;
    marital_status: string | null;
    rank: string | null;
    services: string[] | null;
    baptism_date: string | null;
    registration_date: string | null;
    district: string | null;
    family: Family[] | null;
  };
}

export default function JoinRequestsPage() {
  const [requests, setRequests] = useState<JoinRequestDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [churchName, setChurchName] = useState("");
  const [pastorId, setPastorId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setPastorId(user.id);

    const { data: church } = await supabase.from("churches")
      .select("id, name").eq("pastor_id", user.id).single();
    if (!church) { setLoading(false); return; }
    setChurchId(church.id);
    setChurchName(church.name);

    const { data } = await supabase.from("join_requests")
      .select("id, user_id, status, created_at, snapshot")
      .eq("church_id", church.id)
      .order("created_at", { ascending: false });

    // 각 요청의 성도 프로필 상세 로드
    const detailed: JoinRequestDetail[] = [];
    for (const r of data || []) {
      const { data: p } = await supabase.from("profiles")
        .select("name, phone, birth_date, gender, address, marital_status, rank, services, baptism_date, registration_date, district, family")
        .eq("id", r.user_id).single();
      detailed.push({ ...r, profile: p || {} as JoinRequestDetail["profile"] });
    }

    setRequests(detailed);
    setLoading(false);
  }

  async function approve(req: JoinRequestDetail) {
    if (!churchId || !pastorId) return;
    if (!confirm(`${req.profile.name || "성도"}님의 가입을 승인하시겠습니까?`)) return;

    await supabase.from("join_requests").update({
      status: "approved", responded_at: new Date().toISOString(), responded_by: pastorId,
    }).eq("id", req.id);

    await supabase.from("profiles").update({
      church_id: churchId, church_name: churchName,
    }).eq("id", req.user_id);

    loadData();
  }

  async function reject(req: JoinRequestDetail) {
    if (!pastorId) return;
    if (!confirm(`${req.profile.name || "성도"}님의 가입을 거절하시겠습니까?`)) return;

    await supabase.from("join_requests").update({
      status: "rejected", responded_at: new Date().toISOString(), responded_by: pastorId,
    }).eq("id", req.id);

    loadData();
  }

  const GENDER: Record<string,string> = { male: "남성", female: "여성" };
  const MARITAL: Record<string,string> = { single: "미혼", married: "기혼", widowed: "사별", divorced: "이혼" };

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

      {pending.length > 0 && (
        <>
          <h3 className="font-bold text-charcoal text-sm mb-2">대기 중 ({pending.length})</h3>
          <div className="space-y-3 mb-6">
            {pending.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-green-dark text-white flex items-center justify-center text-sm font-bold">
                      {(r.profile.name || "?")[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-charcoal text-sm">{r.profile.name || "이름 없음"}</p>
                        {r.profile.rank && (
                          <span className="text-xs px-2 py-0.5 bg-gold/20 text-gold rounded-full font-medium">
                            {r.profile.rank}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-mid-gray">{new Date(r.created_at).toLocaleDateString("ko-KR")} 요청</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    className="text-xs text-mid-gray"
                  >
                    {expandedId === r.id ? "접기" : "상세"}
                  </button>
                </div>

                {/* 상세 정보 펼침 */}
                {expandedId === r.id && (
                  <div className="bg-cream rounded-xl p-3 mb-3 text-xs space-y-1">
                    {r.profile.phone && <p><b>전화:</b> {r.profile.phone}</p>}
                    {r.profile.birth_date && <p><b>생년월일:</b> {r.profile.birth_date}</p>}
                    {r.profile.gender && <p><b>성별:</b> {GENDER[r.profile.gender]}</p>}
                    {r.profile.marital_status && <p><b>결혼:</b> {MARITAL[r.profile.marital_status]}</p>}
                    {r.profile.address && <p><b>주소:</b> {r.profile.address}</p>}
                    {r.profile.baptism_date && <p><b>세례일:</b> {r.profile.baptism_date}</p>}
                    {r.profile.registration_date && <p><b>등록일:</b> {r.profile.registration_date}</p>}
                    {r.profile.district && <p><b>구역:</b> {r.profile.district}</p>}
                    {r.profile.services && r.profile.services.length > 0 && (
                      <p><b>봉사:</b> {r.profile.services.join(", ")}</p>
                    )}
                    {r.profile.family && r.profile.family.length > 0 && (
                      <div>
                        <b>가족:</b>
                        <ul className="ml-3 mt-1">
                          {r.profile.family.map((f, i) => (
                            <li key={i}>- {f.relation}: {f.name} ({f.birth_date})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => approve(r)} className="flex-1 py-2 bg-green text-white text-sm font-medium rounded-lg">승인</button>
                  <button onClick={() => reject(r)} className="flex-1 py-2 bg-white border border-light-gray text-charcoal text-sm font-medium rounded-lg">거절</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {processed.length > 0 && (
        <>
          <h3 className="font-bold text-charcoal text-sm mb-2">처리 완료</h3>
          <div className="bg-white rounded-xl p-2 shadow-sm">
            {processed.map((r, i) => (
              <div key={r.id} className={`flex items-center justify-between p-3 ${i > 0 ? "border-t border-light-gray/50" : ""}`}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-light-gray text-mid-gray flex items-center justify-center text-xs font-bold">
                    {(r.profile.name || "?")[0]}
                  </div>
                  <span className="text-sm text-charcoal">{r.profile.name || "이름 없음"}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === "approved" ? "bg-green/20 text-green" : "bg-red-100 text-red-600"}`}>
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
