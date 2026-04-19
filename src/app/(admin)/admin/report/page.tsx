"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface DeptStat { department: string; count: number; }
interface MonthAttendance { month: string; count: number; }
interface MonthFinance { month: string; offering: number; expense: number; }

export default function ReportPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [churchName, setChurchName] = useState("");
  const [loading, setLoading] = useState(true);

  // 통계 데이터
  const [totalMembers, setTotalMembers] = useState(0);
  const [deptStats, setDeptStats] = useState<DeptStat[]>([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<MonthAttendance[]>([]);
  const [monthlyFinance, setMonthlyFinance] = useState<MonthFinance[]>([]);
  const [newcomerCount, setNewcomerCount] = useState(0);
  const [visitCount, setVisitCount] = useState(0);

  const supabase = createClient();

  useEffect(() => { loadInit(); }, []);
  useEffect(() => { if (churchId) loadReport(); }, [churchId, year]);

  async function loadInit() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: profile } = await supabase
      .from("profiles").select("church_id").eq("id", user.id).single();
    if (!profile?.church_id) { setLoading(false); return; }
    setChurchId(profile.church_id);
    const { data: church } = await supabase
      .from("churches").select("name").eq("id", profile.church_id).single();
    setChurchName(church?.name || "");
    setLoading(false);
  }

  async function loadReport() {
    if (!churchId) return;

    // 1. 교인 수 + 부서별
    const { data: members } = await supabase
      .from("church_members").select("department")
      .eq("church_id", churchId).eq("is_active", true);

    const mList = members || [];
    setTotalMembers(mList.length);

    const depts: Record<string, number> = {};
    mList.forEach((m) => { const d = m.department || "미분류"; depts[d] = (depts[d] || 0) + 1; });
    setDeptStats(Object.entries(depts).map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count));

    // 2. 월별 출석
    const { data: atts } = await supabase
      .from("attendance").select("attend_date")
      .eq("church_id", churchId)
      .gte("attend_date", `${year}-01-01`).lte("attend_date", `${year}-12-31`);

    const attByMonth: Record<string, number> = {};
    (atts || []).forEach((a) => {
      const m = a.attend_date.substring(0, 7);
      attByMonth[m] = (attByMonth[m] || 0) + 1;
    });
    setMonthlyAttendance(
      Array.from({ length: 12 }, (_, i) => {
        const key = `${year}-${String(i + 1).padStart(2, "0")}`;
        return { month: `${i + 1}월`, count: attByMonth[key] || 0 };
      })
    );

    // 3. 월별 재정
    const [{ data: ofs }, { data: exs }] = await Promise.all([
      supabase.from("offerings").select("offering_date, amount")
        .eq("church_id", churchId).gte("offering_date", `${year}-01-01`).lte("offering_date", `${year}-12-31`),
      supabase.from("expenses").select("expense_date, amount")
        .eq("church_id", churchId).gte("expense_date", `${year}-01-01`).lte("expense_date", `${year}-12-31`),
    ]);

    const finByMonth: Record<string, { offering: number; expense: number }> = {};
    (ofs || []).forEach((o) => {
      const m = o.offering_date.substring(0, 7);
      if (!finByMonth[m]) finByMonth[m] = { offering: 0, expense: 0 };
      finByMonth[m].offering += o.amount;
    });
    (exs || []).forEach((e) => {
      const m = e.expense_date.substring(0, 7);
      if (!finByMonth[m]) finByMonth[m] = { offering: 0, expense: 0 };
      finByMonth[m].expense += e.amount;
    });
    setMonthlyFinance(
      Array.from({ length: 12 }, (_, i) => {
        const key = `${year}-${String(i + 1).padStart(2, "0")}`;
        return { month: `${i + 1}월`, ...(finByMonth[key] || { offering: 0, expense: 0 }) };
      })
    );

    // 4. 새신자 + 심방
    const [{ count: nc }, { count: vc }] = await Promise.all([
      supabase.from("newcomers").select("id", { count: "exact", head: true })
        .eq("church_id", churchId).gte("first_visit_date", `${year}-01-01`),
      supabase.from("visitations").select("id", { count: "exact", head: true })
        .eq("church_id", churchId).gte("visit_date", `${year}-01-01`),
    ]);
    setNewcomerCount(nc || 0);
    setVisitCount(vc || 0);
  }

  function exportCSV() {
    let csv = "\uFEFF"; // BOM for Excel Korean
    csv += `${churchName} ${year}년 교세 현황 보고서\n\n`;

    csv += "부서별 현황\n부서,인원\n";
    deptStats.forEach((d) => { csv += `${d.department},${d.count}\n`; });
    csv += `합계,${totalMembers}\n\n`;

    csv += "월별 출석 현황\n월,출석 수\n";
    monthlyAttendance.forEach((a) => { csv += `${a.month},${a.count}\n`; });
    csv += "\n";

    csv += "월별 재정 현황\n월,헌금,지출,잔액\n";
    monthlyFinance.forEach((f) => { csv += `${f.month},${f.offering},${f.expense},${f.offering - f.expense}\n`; });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${churchName}_${year}년_교세보고서.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatWon(n: number) { return n.toLocaleString("ko-KR"); }

  const totalOffering = monthlyFinance.reduce((s, f) => s + f.offering, 0);
  const totalExpense = monthlyFinance.reduce((s, f) => s + f.expense, 0);
  const totalAttendance = monthlyAttendance.reduce((s, a) => s + a.count, 0);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-mid-gray">불러오는 중...</p></div>;

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="mb-4 print:hidden">
        <Link href="/admin" className="text-sm text-mid-gray">← 관리</Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-green-dark">교세 보고서</h1>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-3 py-2 bg-white border border-light-gray rounded-lg text-sm">
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
        </div>
        <p className="text-xs text-gold mt-0.5">⛪ {churchName}</p>
      </div>

      {/* 인쇄/내보내기 */}
      <div className="flex gap-2 mb-4 print:hidden">
        <button onClick={() => window.print()} className="flex-1 py-2.5 bg-green text-white font-medium rounded-xl text-sm">
          인쇄 / PDF
        </button>
        <button onClick={exportCSV} className="flex-1 py-2.5 bg-gold text-charcoal font-medium rounded-xl text-sm">
          엑셀 내보내기
        </button>
      </div>

      {/* 인쇄 제목 */}
      <div className="hidden print:block text-center mb-6">
        <h2 className="text-2xl font-bold">{churchName} {year}년 교세 현황 보고서</h2>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-dark text-white rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{totalMembers}명</p>
          <p className="text-xs text-gold mt-1">전체 교인</p>
        </div>
        <div className="bg-green-dark text-white rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{totalAttendance}회</p>
          <p className="text-xs text-gold mt-1">연간 총 출석</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-green">{formatWon(totalOffering)}원</p>
          <p className="text-xs text-mid-gray mt-1">연간 헌금</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gold">{newcomerCount}명</p>
          <p className="text-xs text-mid-gray mt-1">새신자</p>
        </div>
      </div>

      {/* 부서별 현황 */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h3 className="font-bold text-charcoal text-sm mb-3">부서별 현황</h3>
        {deptStats.map((d) => (
          <div key={d.department} className="flex items-center justify-between py-1.5">
            <span className="text-sm text-charcoal">{d.department}</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-light-gray rounded-full overflow-hidden">
                <div className="h-full bg-green rounded-full" style={{ width: `${(d.count / totalMembers) * 100}%` }} />
              </div>
              <span className="text-xs font-bold text-charcoal w-8 text-right">{d.count}명</span>
            </div>
          </div>
        ))}
      </div>

      {/* 월별 출석 */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h3 className="font-bold text-charcoal text-sm mb-3">월별 출석 현황</h3>
        <div className="flex items-end gap-1 h-24">
          {monthlyAttendance.map((a) => {
            const max = Math.max(...monthlyAttendance.map((x) => x.count), 1);
            return (
              <div key={a.month} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-green/20 rounded-t" style={{ height: `${(a.count / max) * 80}px` }}>
                  <div className="w-full bg-green rounded-t" style={{ height: `${(a.count / max) * 80}px` }} />
                </div>
                <span className="text-[9px] text-mid-gray mt-1">{a.month.replace("월", "")}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 월별 재정 */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h3 className="font-bold text-charcoal text-sm mb-3">월별 재정 현황</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-cream">
                <th className="px-2 py-1.5 text-left">월</th>
                <th className="px-2 py-1.5 text-right">헌금</th>
                <th className="px-2 py-1.5 text-right">지출</th>
                <th className="px-2 py-1.5 text-right">잔액</th>
              </tr>
            </thead>
            <tbody>
              {monthlyFinance.map((f) => (
                <tr key={f.month} className="border-b border-light-gray/50">
                  <td className="px-2 py-1.5">{f.month}</td>
                  <td className="px-2 py-1.5 text-right text-green">{f.offering > 0 ? formatWon(f.offering) : "-"}</td>
                  <td className="px-2 py-1.5 text-right text-red-500">{f.expense > 0 ? formatWon(f.expense) : "-"}</td>
                  <td className="px-2 py-1.5 text-right font-medium">{f.offering || f.expense ? formatWon(f.offering - f.expense) : "-"}</td>
                </tr>
              ))}
              <tr className="font-bold bg-cream">
                <td className="px-2 py-2">합계</td>
                <td className="px-2 py-2 text-right text-green">{formatWon(totalOffering)}</td>
                <td className="px-2 py-2 text-right text-red-500">{formatWon(totalExpense)}</td>
                <td className="px-2 py-2 text-right">{formatWon(totalOffering - totalExpense)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 부가 정보 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-lg font-bold text-charcoal">{visitCount}건</p>
          <p className="text-xs text-mid-gray mt-1">심방 기록</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-lg font-bold text-charcoal">{newcomerCount}명</p>
          <p className="text-xs text-mid-gray mt-1">새신자 등록</p>
        </div>
      </div>
    </div>
  );
}
