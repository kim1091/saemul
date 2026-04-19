"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface Attendance {
  id: string;
  attend_date: string;
  worship_type_id: string;
  worship_name?: string;
}

function CheckInForm() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const supabase = createClient();

  // QR에서 자동 체크인
  useEffect(() => {
    if (searchParams.get("code")) {
      handleCheckIn(searchParams.get("code")!);
    }
  }, []);

  async function handleCheckIn(inputCode?: string) {
    const c = (inputCode || code).trim();
    if (c.length !== 4) { setResult({ ok: false, message: "4자리 코드를 입력하세요." }); return; }
    setChecking(true);
    setResult(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setResult({ ok: false, message: "로그인이 필요합니다." }); setChecking(false); return; }

    const { data: profile } = await supabase
      .from("profiles").select("church_id").eq("id", user.id).single();
    if (!profile?.church_id) { setResult({ ok: false, message: "교회에 가입해주세요." }); setChecking(false); return; }

    // 코드로 세션 찾기
    const { data: session } = await supabase
      .from("attendance_sessions")
      .select("id, church_id, worship_type_id, attend_date, is_open")
      .eq("church_id", profile.church_id)
      .eq("code", c)
      .eq("is_open", true)
      .maybeSingle();

    if (!session) { setResult({ ok: false, message: "유효하지 않은 코드이거나 출석이 마감되었습니다." }); setChecking(false); return; }

    // church_members에서 내 member_id 찾기
    const { data: member } = await supabase
      .from("church_members")
      .select("id")
      .eq("church_id", profile.church_id)
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!member) { setResult({ ok: false, message: "교인 명부에 등록되지 않았습니다." }); setChecking(false); return; }

    // 중복 체크
    const { data: existing } = await supabase
      .from("attendance")
      .select("id")
      .eq("church_id", session.church_id)
      .eq("member_id", member.id)
      .eq("worship_type_id", session.worship_type_id)
      .eq("attend_date", session.attend_date)
      .maybeSingle();

    if (existing) { setResult({ ok: true, message: "이미 출석이 확인되었습니다!" }); setChecking(false); return; }

    // 출석 등록
    const { error } = await supabase.from("attendance").insert({
      church_id: session.church_id,
      member_id: member.id,
      user_id: user.id,
      worship_type_id: session.worship_type_id,
      attend_date: session.attend_date,
      check_method: "self",
      checked_by: user.id,
    });

    if (error) { setResult({ ok: false, message: "출석 등록 실패: " + error.message }); }
    else { setResult({ ok: true, message: "출석이 완료되었습니다!" }); setCode(""); }
    setChecking(false);
  }

  return (
    <div className="bg-green-dark rounded-2xl p-5 mb-6 text-white">
      <p className="text-gold text-xs mb-1">셀프 출석 체크인</p>
      <p className="text-sm mb-3">예배 시 안내된 4자리 코드를 입력하세요</p>
      <div className="flex gap-2">
        <input
          type="text" inputMode="numeric" maxLength={4} placeholder="코드 4자리"
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && handleCheckIn()}
          className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-center text-xl font-bold tracking-[0.5em] placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-gold"
        />
        <button onClick={() => handleCheckIn()} disabled={checking || code.length !== 4}
          className="px-5 py-3 bg-gold text-charcoal font-bold rounded-xl disabled:opacity-40">
          {checking ? "..." : "출석"}
        </button>
      </div>
      {result && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${result.ok ? "bg-green/30" : "bg-red-500/30"}`}>
          {result.ok ? "✅ " : "❌ "}{result.message}
        </div>
      )}
    </div>
  );
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
      .from("profiles").select("church_id, church_name").eq("id", user.id).single();

    setChurchName(profile?.church_name || null);
    if (!profile?.church_id) { setLoading(false); return; }

    // member_id로 출석 조회
    const { data: member } = await supabase
      .from("church_members").select("id")
      .eq("church_id", profile.church_id).eq("profile_id", user.id).maybeSingle();

    if (member) {
      const { data: atts } = await supabase
        .from("attendance")
        .select("id, attend_date, worship_type_id, worship_types(name)")
        .eq("member_id", member.id)
        .order("attend_date", { ascending: false })
        .limit(100);

      setAttendances((atts || []).map((a) => ({
        id: a.id,
        attend_date: a.attend_date,
        worship_type_id: a.worship_type_id,
        worship_name: (a as { worship_types?: { name?: string } }).worship_types?.name,
      })));
    }

    setLoading(false);
  }

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthCount = attendances.filter((a) => a.attend_date.startsWith(thisMonth)).length;
  const last4Weeks = attendances.filter((a) => {
    const diff = (Date.now() - new Date(a.attend_date).getTime()) / (1000 * 60 * 60 * 24);
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

      {/* 셀프 체크인 */}
      <Suspense>
        <CheckInForm />
      </Suspense>

      {/* 통계 */}
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
          <p className="text-xs text-mid-gray mt-2">위의 코드를 입력하거나 QR을 스캔해 출석하세요.</p>
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
