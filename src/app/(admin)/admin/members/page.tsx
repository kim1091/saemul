"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface ChurchMember {
  id: string;
  name: string;
  birth_date: string | null;
  gender: string | null;
  phone: string | null;
  relation: string | null;
  department: string | null;
  grade: string | null;
  profile_id: string | null;
  registered_by: string | null;
  is_active: boolean;
  is_partner: boolean;
}

const DEPARTMENTS = ["전체", "가족별", "장년부", "청년부", "고등부", "중등부", "아동부", "유치부"];
const GENDER: Record<string, string> = { male: "남", female: "여" };

export default function MembersPage() {
  const [members, setMembers] = useState<ChurchMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [pastorId, setPastorId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("전체");

  // 교인 추가 폼
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", birth_date: "", gender: "", phone: "", relation: "본인" });

  // 수정 모드
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", birth_date: "", gender: "", phone: "", relation: "" });
  const [isPastor, setIsPastor] = useState(false);

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

    // 목회자 여부 확인 (파트너 지정 권한)
    const { data: church } = await supabase
      .from("churches")
      .select("pastor_id")
      .eq("id", profile.church_id)
      .single();
    setIsPastor(church?.pastor_id === user.id);

    // is_partner 컬럼 존재 여부에 따라 안전하게 쿼리
    const { data, error: queryErr } = await supabase
      .from("church_members")
      .select("id, name, birth_date, gender, phone, relation, department, grade, profile_id, registered_by, is_active, is_partner")
      .eq("church_id", profile.church_id)
      .eq("is_active", true)
      .order("department")
      .order("name");

    if (queryErr) {
      // is_partner 컬럼이 아직 없는 경우 폴백
      const { data: fallback } = await supabase
        .from("church_members")
        .select("id, name, birth_date, gender, phone, relation, department, grade, profile_id, registered_by, is_active")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .order("department")
        .order("name");
      setMembers((fallback || []).map(m => ({ ...m, is_partner: false })));
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  }

  async function handleAddMember() {
    if (!form.name.trim() || !churchId || !pastorId) return;
    const { error } = await supabase.from("church_members").insert({
      church_id: churchId,
      registered_by: pastorId,
      name: form.name.trim(),
      birth_date: form.birth_date || null,
      gender: form.gender || null,
      phone: form.phone || null,
      relation: form.relation,
    });
    if (error) { alert("추가 실패: " + error.message); return; }
    setForm({ name: "", birth_date: "", gender: "", phone: "", relation: "본인" });
    setShowForm(false);
    loadData();
  }

  function startEdit(m: ChurchMember) {
    setEditingId(m.id);
    setEditForm({
      name: m.name,
      birth_date: m.birth_date || "",
      gender: m.gender || "",
      phone: m.phone || "",
      relation: m.relation || "본인",
    });
  }

  async function handleSaveEdit() {
    if (!editingId || !editForm.name.trim()) return;
    const { error } = await supabase.from("church_members").update({
      name: editForm.name.trim(),
      birth_date: editForm.birth_date || null,
      gender: editForm.gender || null,
      phone: editForm.phone || null,
      relation: editForm.relation,
    }).eq("id", editingId);
    if (error) { alert("수정 실패: " + error.message); return; }
    setEditingId(null);
    loadData();
  }

  async function handleTogglePartner(m: ChurchMember) {
    if (!m.profile_id) { alert("앱에 가입한 성도만 파트너로 지정할 수 있습니다."); return; }
    const action = m.is_partner ? "파트너 해제" : "파트너 지정";
    if (!confirm(`${m.name}님을 ${action}할까요?\n파트너는 교회 관리 메뉴에 접근할 수 있습니다.`)) return;
    const { error } = await supabase.from("church_members").update({ is_partner: !m.is_partner }).eq("id", m.id);
    if (error) { alert(action + " 실패: " + error.message); return; }
    loadData();
  }

  async function handleToggleActive(id: string) {
    if (!confirm("이 교인을 비활성화할까요?")) return;
    await supabase.from("church_members").update({ is_active: false }).eq("id", id);
    loadData();
  }

  function getAge(birthDate: string | null) {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
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

  // 부서별 카운트
  const deptCounts: Record<string, number> = {};
  members.forEach((m) => {
    const d = m.department || "미분류";
    deptCounts[d] = (deptCounts[d] || 0) + 1;
  });

  const filtered = members.filter((m) => {
    if (deptFilter !== "전체" && deptFilter !== "가족별" && m.department !== deptFilter) return false;
    if (search && !m.name.includes(search) && !(m.phone || "").includes(search)) return false;
    return true;
  });

  // 그룹핑: 부서별 또는 가족별
  const grouped: Record<string, ChurchMember[]> = {};
  if (deptFilter === "가족별") {
    // registered_by 기준으로 가족 묶기
    filtered.forEach((m) => {
      const head = m.relation === "본인" ? m.name : null;
      const key = m.registered_by || m.id;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });
    // 그룹 키를 "본인" 이름으로 변환
    const renamed: Record<string, ChurchMember[]> = {};
    Object.values(grouped).forEach((family) => {
      const head = family.find((m) => m.relation === "본인");
      const label = (head?.name || family[0]?.name || "미분류") + " 가족";
      renamed[label] = family;
    });
    Object.keys(grouped).forEach((k) => delete grouped[k]);
    Object.assign(grouped, renamed);
  } else {
    filtered.forEach((m) => {
      const dept = m.department || "미분류";
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push(m);
    });
  }

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-mid-gray">← 관리</Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-green-dark">성도 관리</h1>
            <p className="text-mid-gray text-xs mt-0.5">전체 {members.length}명</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-green text-white text-sm font-medium rounded-lg"
          >
            {showForm ? "닫기" : "+ 교인 추가"}
          </button>
        </div>
      </div>

      {/* 교인 추가 폼 */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 space-y-3">
          <input type="text" placeholder="이름 *" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-mid-gray block mb-1">생년월일</label>
              <input type="date" value={form.birth_date}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                className="w-full px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            </div>
            <div className="w-24">
              <label className="text-xs text-mid-gray block mb-1">성별</label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green">
                <option value="">-</option>
                <option value="male">남</option>
                <option value="female">여</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <input type="tel" placeholder="전화번호" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="flex-1 px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
            <select value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })}
              className="w-28 px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green">
              <option>본인</option>
              <option>배우자</option>
              <option>자녀</option>
              <option>부모</option>
              <option>형제/자매</option>
            </select>
          </div>
          <button onClick={handleAddMember} disabled={!form.name.trim()}
            className="w-full py-2.5 bg-green text-white rounded-lg font-medium text-sm disabled:opacity-40">
            추가
          </button>
        </div>
      )}

      {/* 부서 필터 */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {DEPARTMENTS.map((d) => (
          <button key={d}
            onClick={() => setDeptFilter(d)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
              deptFilter === d ? "bg-green text-white" : "bg-white text-mid-gray border border-light-gray"
            }`}
          >
            {d} {d === "전체" ? members.length : d === "가족별" ? new Set(members.map(m => m.registered_by || m.id)).size : (deptCounts[d] || 0)}
          </button>
        ))}
      </div>

      {/* 검색 */}
      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="이름 또는 전화번호 검색..."
        className="w-full px-4 py-2.5 bg-white border border-light-gray rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-green" />

      {/* 부서별 그룹 표시 */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center pt-8 bg-white rounded-xl p-6">
          <p className="text-mid-gray text-sm">{search ? "검색 결과가 없습니다." : "등록된 교인이 없습니다."}</p>
        </div>
      ) : (
        Object.entries(grouped).map(([dept, list]) => (
          <div key={dept} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-bold text-green-dark">{dept}</h3>
              <span className="text-xs text-mid-gray">{list.length}명</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm divide-y divide-light-gray/50">
              {list.map((m) => {
                const age = getAge(m.birth_date);
                const isEditing = editingId === m.id;
                return (
                  <div key={m.id} className="px-4 py-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-3 py-2 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
                        <div className="flex gap-2">
                          <input type="date" value={editForm.birth_date} onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })}
                            className="flex-1 px-3 py-2 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
                          <select value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                            className="w-16 px-2 py-2 bg-cream border border-light-gray rounded-lg text-sm">
                            <option value="">-</option><option value="male">남</option><option value="female">여</option>
                          </select>
                          <select value={editForm.relation} onChange={(e) => setEditForm({ ...editForm, relation: e.target.value })}
                            className="w-20 px-2 py-2 bg-cream border border-light-gray rounded-lg text-sm">
                            <option>본인</option><option>배우자</option><option>자녀</option><option>부모</option><option>형제/자매</option>
                          </select>
                        </div>
                        <input type="tel" placeholder="전화번호" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="w-full px-3 py-2 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
                        <div className="flex gap-2">
                          <button onClick={handleSaveEdit} className="flex-1 py-2 bg-green text-white rounded-lg text-sm font-medium">저장</button>
                          <button onClick={() => setEditingId(null)} className="flex-1 py-2 bg-white border border-light-gray rounded-lg text-sm">취소</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                          m.profile_id ? "bg-green text-white" : "bg-light-gray text-mid-gray"
                        }`}>
                          {m.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-sm text-charcoal">{m.name}</span>
                            {m.grade && <span className="text-[10px] px-1.5 py-0.5 bg-gold/20 text-gold rounded-full">{m.grade}</span>}
                            {m.relation && m.relation !== "본인" && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-cream text-mid-gray rounded-full">{m.relation}</span>
                            )}
                            {m.is_partner && <span className="text-[10px] px-1.5 py-0.5 bg-green/20 text-green rounded-full font-bold">파트너</span>}
                            {m.profile_id && !m.is_partner && <span className="text-[10px] text-green">앱</span>}
                          </div>
                          <p className="text-xs text-mid-gray">
                            {[
                              m.gender ? GENDER[m.gender] : null,
                              age !== null ? `${age}세` : null,
                              m.phone,
                            ].filter(Boolean).join(" · ") || "정보 없음"}
                          </p>
                        </div>
                        {isPastor && m.profile_id && m.relation === "본인" && (
                          <button onClick={() => handleTogglePartner(m)}
                            className={`text-xs mr-1 ${m.is_partner ? "text-gold hover:text-red-400" : "text-mid-gray hover:text-green"}`}>
                            {m.is_partner ? "해제" : "파트너"}
                          </button>
                        )}
                        <button onClick={() => startEdit(m)} className="text-xs text-green hover:text-green-dark mr-1">수정</button>
                        <button onClick={() => handleToggleActive(m.id)} className="text-xs text-mid-gray hover:text-red-500">제거</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
