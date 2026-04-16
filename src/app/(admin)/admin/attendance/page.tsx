"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface Member {
  id: string;
  display_name: string;
  checked: boolean;
}

interface WorshipType {
  id: string;
  name: string;
}

export default function AttendancePage() {
  const [worships, setWorships] = useState<WorshipType[]>([]);
  const [selectedWorship, setSelectedWorship] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [pastorId, setPastorId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadInit();
  }, []);

  useEffect(() => {
    if (selectedWorship) loadAttendance();
  }, [selectedWorship, selectedDate]);

  async function loadInit() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setPastorId(user.id);

    // 내 프로필 → church_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("church_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.church_id) {
      setLoading(false);
      return;
    }
    setChurchId(profile.church_id);

    // 예배 유형 로드
    const { data: wt } = await supabase
      .from("worship_types")
      .select("id, name")
      .eq("church_id", profile.church_id)
      .eq("is_active", true)
      .order("day_of_week");

    setWorships(wt || []);
    if (wt && wt.length > 0) setSelectedWorship(wt[0].id);
    setLoading(false);
  }

  async function loadAttendance() {
    if (!churchId || !selectedWorship) return;

    // 같은 교회 성도들
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("church_id", churchId);

    // 해당 예배 출석 기록
    const { data: attendance } = await supabase
      .from("attendance")
      .select("user_id")
      .eq("church_id", churchId)
      .eq("worship_type_id", selectedWorship)
      .eq("attend_date", selectedDate);

    const checkedIds = new Set((attendance || []).map((a) => a.user_id));

    setMembers(
      (profs || []).map((p) => ({
        id: p.id,
        display_name: p.name || p.email?.split("@")[0] || "이름 없음",
        checked: checkedIds.has(p.id),
      }))
    );
  }

  async function toggleMember(memberId: string) {
    if (!churchId || !selectedWorship || !pastorId) return;

    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    if (member.checked) {
      // 출석 취소
      await supabase
        .from("attendance")
        .delete()
        .eq("church_id", churchId)
        .eq("user_id", memberId)
        .eq("worship_type_id", selectedWorship)
        .eq("attend_date", selectedDate);
    } else {
      // 출석 체크
      await supabase.from("attendance").insert({
        church_id: churchId,
        user_id: memberId,
        worship_type_id: selectedWorship,
        attend_date: selectedDate,
        check_method: "manual",
        checked_by: pastorId,
      });
    }

    loadAttendance();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-mid-gray">불러오는 중...</p>
      </div>
    );
  }

  if (!churchId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center">
          <p className="text-4xl mb-3">⛪</p>
          <h2 className="text-lg font-bold text-green-dark mb-2">
            먼저 교회를 등록해주세요
          </h2>
          <Link
            href="/admin/church"
            className="inline-block mt-4 px-5 py-2.5 bg-green text-white rounded-lg font-medium text-sm"
          >
            교회 등록하기
          </Link>
        </div>
      </div>
    );
  }

  const checkedCount = members.filter((m) => m.checked).length;

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/admin" className="text-sm text-mid-gray">← 관리</Link>
          <h1 className="text-xl font-bold text-green-dark">출석 관리</h1>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-green">{checkedCount}</p>
          <p className="text-xs text-mid-gray">/ {members.length}명</p>
        </div>
      </div>

      {/* 날짜 + 예배 선택 */}
      <div className="flex gap-2 mb-4">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 bg-white border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
        />
        <select
          value={selectedWorship}
          onChange={(e) => setSelectedWorship(e.target.value)}
          className="flex-1 px-3 py-2 bg-white border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
        >
          {worships.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {members.length === 0 ? (
        <div className="text-center pt-8 bg-white rounded-xl p-6">
          <p className="text-mid-gray text-sm">아직 교회에 등록된 성도가 없습니다.</p>
          <p className="text-mid-gray text-xs mt-2">성도가 프로필에서 교회를 설정하면 여기 표시됩니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {members.map((m, i) => (
            <button
              key={m.id}
              onClick={() => toggleMember(m.id)}
              className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition ${
                i > 0 ? "border-t border-light-gray/50" : ""
              } ${m.checked ? "bg-green/5" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  m.checked ? "bg-green text-white" : "bg-light-gray text-mid-gray"
                }`}>
                  {m.checked ? "✓" : m.display_name[0]}
                </div>
                <span className={`font-medium text-sm ${m.checked ? "text-green-dark" : "text-charcoal"}`}>
                  {m.display_name}
                </span>
              </div>
              <span className={`text-xs ${m.checked ? "text-green" : "text-mid-gray"}`}>
                {m.checked ? "출석" : "미출석"}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-charcoal text-sm mb-3">통계</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-green">{checkedCount}</p>
            <p className="text-xs text-mid-gray">출석</p>
          </div>
          <div>
            <p className="text-lg font-bold text-charcoal">
              {members.length > 0 ? Math.round((checkedCount / members.length) * 100) : 0}%
            </p>
            <p className="text-xs text-mid-gray">출석률</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gold">{members.length - checkedCount}</p>
            <p className="text-xs text-mid-gray">미출석</p>
          </div>
        </div>
      </div>
    </div>
  );
}
