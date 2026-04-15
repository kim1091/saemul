"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: string;
  rank: string | null;
  services: string[] | null;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  marital_status: string | null;
  address: string | null;
  baptism_date: string | null;
  registration_date: string | null;
  district: string | null;
  family: { relation: string; name: string; birth_date: string }[] | null;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [pastorId, setPastorId] = useState<string | null>(null);
  const [permMap, setPermMap] = useState<Record<string, boolean>>({});

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setPastorId(user.id);

    const { data: profile } = await supabase
      .from("profiles").select("church_id").eq("id", user.id).single();
    if (!profile?.church_id) { setLoading(false); return; }
    setChurchId(profile.church_id);

    // 같은 교회 모든 성도
    const { data } = await supabase
      .from("profiles")
      .select("id, name, role, rank, services, phone, birth_date, gender, marital_status, address, baptism_date, registration_date, district, family")
      .eq("church_id", profile.church_id);

    // email은 profiles에 있으니 직접 가져오기
    const { data: withEmail } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("church_id", profile.church_id);

    const emailMap: Record<string, string> = {};
    (withEmail || []).forEach((p: { id: string; email?: string }) => { emailMap[p.id] = p.email || ""; });

    const list: Member[] = (data || []).map((p) => ({
      ...p,
      email: emailMap[p.id] || "",
    })) as Member[];

    setMembers(list);

    // 설교 권한 조회
    const userIds = list.filter((m) => m.role === "member").map((m) => m.id);
    if (userIds.length > 0) {
      const { data: perms } = await supabase
        .from("sermon_permissions")
        .select("user_id, is_active")
        .in("user_id", userIds)
        .eq("permission_type", "full_sermon");
      const map: Record<string, boolean> = {};
      (perms || []).forEach((p) => { map[p.user_id] = p.is_active; });
      setPermMap(map);
    }

    setLoading(false);
  }

  async function togglePermission(memberId: string) {
    if (!pastorId) return;
    const current = permMap[memberId];
    if (current) {
      await supabase.from("sermon_permissions")
        .update({ is_active: false })
        .eq("user_id", memberId)
        .eq("permission_type", "full_sermon");
    } else {
      // UPSERT
      await supabase.from("sermon_permissions").upsert({
        user_id: memberId,
        granted_by: pastorId,
        permission_type: "full_sermon",
        is_active: true,
      }, { onConflict: "user_id,permission_type" });
    }
    loadData();
  }

  const GENDER: Record<string, string> = { male: "남성", female: "여성" };
  const MARITAL: Record<string, string> = { single: "미혼", married: "기혼", widowed: "사별", divorced: "이혼" };

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

  const filtered = members.filter((m) =>
    !search || m.name?.includes(search) || m.email.includes(search)
  );

  return (
    <div className="px-5 pt-6">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-mid-gray">← 관리</Link>
        <h1 className="text-xl font-bold text-green-dark">성도 관리</h1>
        <p className="text-mid-gray text-xs mt-0.5">총 {members.length}명</p>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="이름 또는 이메일 검색..."
        className="w-full px-4 py-2.5 bg-white border border-light-gray rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-green"
      />

      {filtered.length === 0 ? (
        <div className="text-center pt-8 bg-white rounded-xl p-6">
          <p className="text-mid-gray text-sm">
            {search ? "검색 결과가 없습니다." : "아직 교회에 소속된 성도가 없습니다."}
          </p>
          <p className="text-mid-gray text-xs mt-2">성도가 가입 신청 → 승인하면 여기 표시됩니다.</p>
          <Link href="/admin/requests" className="inline-block mt-4 text-green text-sm font-medium">
            가입 요청 확인 →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <div key={m.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    m.role === "pastor" ? "bg-gold text-charcoal" : "bg-green text-white"
                  }`}>
                    {(m.name || m.email || "?")[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm text-charcoal">{m.name || m.email.split("@")[0]}</span>
                      {m.role === "pastor" && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gold/20 text-gold rounded-full font-medium">목회자</span>
                      )}
                      {m.rank && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green/10 text-green rounded-full font-medium">{m.rank}</span>
                      )}
                    </div>
                    <p className="text-xs text-mid-gray">{m.phone || m.email}</p>
                  </div>
                </div>

                {m.role === "member" && (
                  <button
                    onClick={() => togglePermission(m.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                      permMap[m.id]
                        ? "bg-green/10 text-green border border-green/30"
                        : "bg-light-gray text-mid-gray"
                    }`}
                  >
                    {permMap[m.id] ? "설교✓" : "설교승인"}
                  </button>
                )}
              </div>

              <button
                onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                className="mt-2 text-xs text-mid-gray"
              >
                {expandedId === m.id ? "▲ 접기" : "▼ 상세정보"}
              </button>

              {expandedId === m.id && (
                <div className="bg-cream rounded-xl p-3 mt-2 text-xs space-y-1">
                  {m.birth_date && <p><b>생년월일:</b> {m.birth_date}</p>}
                  {m.gender && <p><b>성별:</b> {GENDER[m.gender]}</p>}
                  {m.marital_status && <p><b>결혼:</b> {MARITAL[m.marital_status]}</p>}
                  {m.address && <p><b>주소:</b> {m.address}</p>}
                  {m.baptism_date && <p><b>세례일:</b> {m.baptism_date}</p>}
                  {m.registration_date && <p><b>등록일:</b> {m.registration_date}</p>}
                  {m.district && <p><b>구역:</b> {m.district}</p>}
                  {m.services && m.services.length > 0 && <p><b>봉사:</b> {m.services.join(", ")}</p>}
                  {m.family && m.family.length > 0 && (
                    <div>
                      <b>가족:</b>
                      <ul className="ml-3 mt-1">
                        {m.family.map((f, i) => (
                          <li key={i}>- {f.relation}: {f.name}{f.birth_date ? ` (${f.birth_date})` : ""}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
