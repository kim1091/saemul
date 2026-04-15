"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface Attendance {
  id: string;
  attend_date: string;
  worship_type_id: string;
  worship_name?: string;
}

export default function MyAttendancePage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [churchName, setChurchName] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("church_id, church_name")
      .eq("id", user.id)
      .single();

    setChurchName(profile?.church_name || null);
    if (!profile?.church_id) { setLoading(false); return; }

    const { data: atts } = await supabase
      .from("attendance")
      .select("id, attend_date, worship_type_id, worship_types(name)")
      .eq("user_id", user.id)
      .order("attend_date", { ascending: false })
      .limit(100);

    const list = (atts || []).map((a) => ({
      id: a.id,
      attend_date: a.attend_date,
      worship_type_id: a.worship_type_id,
      worship_name: (a as { worship_types?: { name?: string } }).worship_types?.name,
    }));

    setAttendances(list);
    setLoading(false);
  }

  // 이번 달 출석 수
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthCount = attendances.filter((a) => a.attend_date.startsWith(thisMonth)).length;

  // 연속 일수는 간단히 계산 (최근 4주 주일)
  const last4Weeks = attendances.filter((a) => {
    const d = new Date(a.attend_date);
    const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff < 28;
  }).length;

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-mid-gray">불러오는 중...</p></div>;

  return (
    <div className="px-5 pt-6">
      <div className="mb-4">
        <Link href="/profile" className="text-sm text-mid-gray">← 프로필</Link>
        <h1 className="text-xl font-bold text-green-dark">내 출석 현황</h1>
        {churchName && <p className="text-xs text-gold mt-0.5">⛪ {churchName}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-green-dark text-white rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{thisMonthCount}</p>
          <p className="text-xs text-gold mt-1">이번 달</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-green">{last4Weeks}</p>
          <p className="text-xs text-mid-gray mt-1">최근 4주</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gold">{attendances.length}</p>
          <p className="text-xs text-mid-gray mt-1">전체</p>
        </div>
      </div>

      <h3 className="font-bold text-charcoal text-sm mb-3">최근 출석 기록</h3>

      {attendances.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center">
          <p className="text-mid-gray text-sm">아직 출석 기록이 없습니다.</p>
          <p className="text-xs text-mid-gray mt-2">
            목사님이 출석을 체크하면 여기 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {attendances.map((a, i) => (
            <div key={a.id} className={`flex items-center justify-between px-5 py-3 ${i > 0 ? "border-t border-light-gray/50" : ""}`}>
              <div>
                <p className="text-sm font-medium text-charcoal">{a.worship_name || "예배"}</p>
                <p className="text-xs text-mid-gray">{a.attend_date}</p>
              </div>
              <span className="text-xs text-green font-medium">✓ 출석</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
