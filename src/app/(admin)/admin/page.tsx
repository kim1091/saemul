"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type AdminRole = "senior_pastor" | "associate_pastor" | "partner" | "admin";

const adminMenus = [
  { href: "/admin/church", icon: "⛪", title: "교회 설정", desc: "교회 정보 + 예배 유형 관리", color: "bg-[#3A5331]", finance: false },
  { href: "/admin/requests", icon: "✋", title: "가입 요청", desc: "성도 가입 요청 승인/거절", color: "bg-gold", finance: false },
  { href: "/admin/attendance", icon: "📋", title: "출석 관리", desc: "예배별 출석 체크 및 통계", color: "bg-green", finance: false },
  { href: "/admin/visitation", icon: "🏠", title: "심방 관리", desc: "심방 기록, 기도제목, 후속조치", color: "bg-gold", finance: false },
  { href: "/admin/finance", icon: "💰", title: "재정 관리", desc: "헌금, 예산, 지출, 보고서", color: "bg-green-dark", finance: true },
  { href: "/admin/newcomers", icon: "🙋", title: "새신자 관리", desc: "양육 단계 추적, 담당자 배정", color: "bg-[#8B6B3D]", finance: false },
  { href: "/admin/members", icon: "👥", title: "성도 관리", desc: "교인 명부, 부서별 관리", color: "bg-mid-gray", finance: false },
  { href: "/admin/report", icon: "📊", title: "교세 보고서", desc: "출석·재정·교인 통계 + 엑셀", color: "bg-green", finance: false },
  { href: "/admin/certificate", icon: "📜", title: "증명서 발급", desc: "교인·세례·전입전출 증명서", color: "bg-[#8B6B3D]", finance: false },
];

function formatWon(n: number) { return n.toLocaleString("ko-KR") + "원"; }

export default function AdminDashboard() {
  const supabase = createClient();
  const [stats, setStats] = useState({ weekAttendance: 0, monthOffering: 0, pendingRequests: 0, memberCount: 0 });
  const [loading, setLoading] = useState(true);
  const [adminRole, setAdminRole] = useState<AdminRole>("senior_pastor");

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles").select("church_id, role, is_admin").eq("id", user.id).single();
    if (!profile?.church_id) { setLoading(false); return; }

    // 역할 판별
    if (profile.is_admin) {
      setAdminRole("admin");
    } else if (profile.role === "pastor") {
      const { data: church } = await supabase.from("churches").select("pastor_id").eq("id", profile.church_id).single();
      setAdminRole(church?.pastor_id === user.id ? "senior_pastor" : "associate_pastor");
    } else {
      setAdminRole("partner");
    }

    const churchId = profile.church_id;
    const thisMonth = new Date().toISOString().slice(0, 7);

    // 이번 주 시작일 (일요일)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const [attendance, offerings, requests, members] = await Promise.all([
      supabase.from("attendance").select("id", { count: "exact", head: true })
        .eq("church_id", churchId).gte("attend_date", weekStartStr),
      supabase.from("offerings").select("amount")
        .eq("church_id", churchId).gte("offering_date", `${thisMonth}-01`),
      supabase.from("join_requests").select("id", { count: "exact", head: true })
        .eq("church_id", churchId).eq("status", "pending"),
      supabase.from("church_members").select("id", { count: "exact", head: true })
        .eq("church_id", churchId).eq("is_active", true),
    ]);

    setStats({
      weekAttendance: attendance.count || 0,
      monthOffering: (offerings.data || []).reduce((s, o) => s + o.amount, 0),
      pendingRequests: requests.count || 0,
      memberCount: members.count || 0,
    });
    setLoading(false);
  }

  return (
    <div className="px-5 pt-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-green-dark">교회 관리</h1>
        <p className="text-mid-gray text-sm mt-0.5">목회자 관리 대시보드</p>
      </div>

      {/* 요약 카드 */}
      {/* 역할 안내 */}
      {adminRole === "associate_pastor" && (
        <div className="bg-gold/10 rounded-xl p-3 mb-4">
          <p className="text-xs text-charcoal">부교역자 모드 — 재정 메뉴는 담임목사만 접근 가능합니다</p>
        </div>
      )}
      {adminRole === "partner" && (
        <div className="bg-green/10 rounded-xl p-3 mb-4">
          <p className="text-xs text-charcoal">재정관리자 모드 — 재정 관련 메뉴만 접근 가능합니다</p>
        </div>
      )}

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {adminRole !== "partner" && (
          <div className="bg-green-dark text-white rounded-xl p-4">
            <p className="text-gold text-xs">이번 주 출석</p>
            <p className="text-2xl font-bold mt-1">{loading ? "-" : stats.weekAttendance}명</p>
          </div>
        )}
        {(adminRole === "senior_pastor" || adminRole === "admin" || adminRole === "partner") && (
          <div className="bg-green-dark text-white rounded-xl p-4">
            <p className="text-gold text-xs">이번 달 헌금</p>
            <p className="text-2xl font-bold mt-1">{loading ? "-원" : formatWon(stats.monthOffering)}</p>
          </div>
        )}
        {adminRole !== "partner" && (
          <>
            <div className="bg-white border border-light-gray rounded-xl p-4">
              <p className="text-xs text-mid-gray">대기 중 가입 요청</p>
              <p className="text-2xl font-bold mt-1 text-gold">{loading ? "-" : stats.pendingRequests}건</p>
            </div>
            <div className="bg-white border border-light-gray rounded-xl p-4">
              <p className="text-xs text-mid-gray">전체 성도</p>
              <p className="text-2xl font-bold mt-1 text-green-dark">{loading ? "-" : stats.memberCount}명</p>
            </div>
          </>
        )}
      </div>

      {/* 메뉴 목록 — 역할별 필터 */}
      <div className="space-y-3">
        {adminMenus.filter((m) => {
          if (adminRole === "senior_pastor" || adminRole === "admin") return true;
          if (adminRole === "associate_pastor") return !m.finance; // 부교역자: 재정 제외
          if (adminRole === "partner") return m.finance; // 파트너: 재정만
          return false;
        }).map((m) => (
          <Link key={m.href} href={m.href}>
            <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition mb-3">
              <div className={`w-12 h-12 ${m.color} rounded-xl flex items-center justify-center text-2xl`}>
                {m.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-charcoal">{m.title}</h3>
                <p className="text-mid-gray text-xs mt-0.5">{m.desc}</p>
              </div>
              <span className="text-xs text-mid-gray">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
