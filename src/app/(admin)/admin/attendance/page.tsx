"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface ChurchMember {
  id: string;
  name: string;
  department: string | null;
  grade: string | null;
  relation: string | null;
  checked: boolean;
}

interface WorshipType {
  id: string;
  name: string;
}

const DEPARTMENTS = ["전체", "장년부", "청년부", "고등부", "중등부", "아동부", "유치부"];

export default function AttendancePage() {
  const [worships, setWorships] = useState<WorshipType[]>([]);
  const [selectedWorship, setSelectedWorship] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [members, setMembers] = useState<ChurchMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [pastorId, setPastorId] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState("전체");

  const supabase = createClient();

  useEffect(() => { loadInit(); }, []);
  useEffect(() => { if (selectedWorship) loadAttendance(); }, [selectedWorship, selectedDate]);

  async function loadInit() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setPastorId(user.id);

    const { data: profile } = await supabase
      .from("profiles").select("church_id").eq("id", user.id).single();
    if (!profile?.church_id) { setLoading(false); return; }
    setChurchId(profile.church_id);

    const { data: wt } = await supabase
      .from("worship_types").select("id, name")
      .eq("church_id", profile.church_id).eq("is_active", true)
      .order("day_of_week");

    setWorships(wt || []);
    if (wt && wt.length > 0) setSelectedWorship(wt[0].id);
    setLoading(false);
  }

  async function loadAttendance() {
    if (!churchId || !selectedWorship) return;

    // church_members 기반 교인 목록
    const { data: cms } = await supabase
      .from("church_members")
      .select("id, name, department, grade, relation")
      .eq("church_id", churchId)
      .eq("is_active", true)
      .order("department").order("name");

    // 해당 날짜/예배 출석 기록
    const { data: attendance } = await supabase
      .from("attendance")
      .select("member_id")
      .eq("church_id", churchId)
      .eq("worship_type_id", selectedWorship)
      .eq("attend_date", selectedDate);

    const checkedIds = new Set((attendance || []).map((a) => a.member_id));

    setMembers(
      (cms || []).map((m) => ({
        ...m,
        checked: checkedIds.has(m.id),
      }))
    );
  }

  async function toggleMember(memberId: string) {
    if (!churchId || !selectedWorship || !pastorId) return;
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    if (member.checked) {
      await supabase.from("attendance").delete()
        .eq("church_id", churchId)
        .eq("member_id", memberId)
        .eq("worship_type_id", selectedWorship)
        .eq("attend_date", selectedDate);
    } else {
      await supabase.from("attendance").insert({
        church_id: churchId,
        member_id: memberId,
        worship_type_id: selectedWorship,
        attend_date: selectedDate,
        check_method: "manual",
        checked_by: pastorId,
      });
    }
    loadAttendance();
  }

  // 전체 선택/해제
  async function toggleAll(check: boolean) {
    if (!churchId || !selectedWorship || !pastorId) return;
    const filtered = members.filter((m) => deptFilter === "전체" || m.department === deptFilter);

    for (const m of filtered) {
      if (check && !m.checked) {
        await supabase.from("attendance").insert({
          church_id: churchId,
          member_id: m.id,
          worship_type_id: selectedWorship,
          attend_date: selectedDate,
          check_method: "manual",
          checked_by: pastorId,
        });
      } else if (!check && m.checked) {
        await supabase.from("attendance").delete()
          .eq("church_id", churchId)
          .eq("member_id", m.id)
          .eq("worship_type_id", selectedWorship)
          .eq("attend_date", selectedDate);
      }
    }
    loadAttendance();
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

  const filtered = members.filter((m) => deptFilter === "전체" || m.department === deptFilter);
  const checkedCount = filtered.filter((m) => m.checked).length;
  const totalChecked = members.filter((m) => m.checked).length;

  // 부서별 카운트
  const deptCounts: Record<string, number> = {};
  members.forEach((m) => { deptCounts[m.department || "미분류"] = (deptCounts[m.department || "미분류"] || 0) + 1; });

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/admin" className="text-sm text-mid-gray">← 관리</Link>
          <h1 className="text-xl font-bold text-green-dark">출석 관리</h1>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-green">{totalChecked}</p>
          <p className="text-xs text-mid-gray">/ {members.length}명</p>
        </div>
      </div>

      {/* 날짜 + 예배 선택 */}
      <div className="flex gap-2 mb-3">
        <input type="date" value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 bg-white border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
        <select value={selectedWorship}
          onChange={(e) => setSelectedWorship(e.target.value)}
          className="flex-1 px-3 py-2 bg-white border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green">
          {worships.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {/* 부서 필터 */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {DEPARTMENTS.map((d) => (
          <button key={d} onClick={() => setDeptFilter(d)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
              deptFilter === d ? "bg-green text-white" : "bg-white text-mid-gray border border-light-gray"
            }`}>
            {d} {d === "전체" ? members.length : (deptCounts[d] || 0)}
          </button>
        ))}
      </div>

      {/* 전체 선택/해제 */}
      <div className="flex gap-2 mb-3">
        <button onClick={() => toggleAll(true)}
          className="flex-1 py-2 bg-green/10 text-green rounded-lg text-xs font-medium">
          {deptFilter === "전체" ? "전체" : deptFilter} 전원 출석
        </button>
        <button onClick={() => toggleAll(false)}
          className="flex-1 py-2 bg-light-gray text-mid-gray rounded-lg text-xs font-medium">
          전원 취소
        </button>
      </div>

      {/* 교인 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center pt-8 bg-white rounded-xl p-6">
          <p className="text-mid-gray text-sm">등록된 교인이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {filtered.map((m, i) => (
            <button key={m.id} onClick={() => toggleMember(m.id)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left transition ${
                i > 0 ? "border-t border-light-gray/50" : ""
              } ${m.checked ? "bg-green/5" : ""}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  m.checked ? "bg-green text-white" : "bg-light-gray text-mid-gray"
                }`}>
                  {m.checked ? "✓" : m.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-medium text-sm ${m.checked ? "text-green-dark" : "text-charcoal"}`}>{m.name}</span>
                    {m.grade && <span className="text-[10px] px-1.5 py-0.5 bg-gold/20 text-gold rounded-full">{m.grade}</span>}
                    {m.relation && m.relation !== "본인" && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-cream text-mid-gray rounded-full">{m.relation}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-mid-gray">{m.department}</p>
                </div>
              </div>
              <span className={`text-xs ${m.checked ? "text-green font-medium" : "text-mid-gray"}`}>
                {m.checked ? "출석" : "미출석"}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 통계 */}
      <div className="mt-4 bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-charcoal text-sm mb-3">
          {deptFilter === "전체" ? "전체" : deptFilter} 통계
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-green">{checkedCount}</p>
            <p className="text-xs text-mid-gray">출석</p>
          </div>
          <div>
            <p className="text-lg font-bold text-charcoal">
              {filtered.length > 0 ? Math.round((checkedCount / filtered.length) * 100) : 0}%
            </p>
            <p className="text-xs text-mid-gray">출석률</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gold">{filtered.length - checkedCount}</p>
            <p className="text-xs text-mid-gray">미출석</p>
          </div>
        </div>
      </div>
    </div>
  );
}
