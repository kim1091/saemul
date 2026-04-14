"use client";

import Link from "next/link";

const adminMenus = [
  {
    href: "/admin/church",
    icon: "⛪",
    title: "교회 설정",
    desc: "교회 정보 + 예배 유형 관리",
    stat: "시작하기",
    color: "bg-[#3A5331]",
  },
  {
    href: "/admin/requests",
    icon: "✋",
    title: "가입 요청",
    desc: "성도 가입 요청 승인/거절",
    stat: "확인 필요",
    color: "bg-gold",
  },
  {
    href: "/admin/attendance",
    icon: "📋",
    title: "출석 관리",
    desc: "예배별 출석 체크 및 통계",
    stat: "오늘 출석: -",
    color: "bg-green",
  },
  {
    href: "/admin/visitation",
    icon: "🏠",
    title: "심방 관리",
    desc: "심방 기록, 기도제목, 후속조치",
    stat: "이번 달: -건",
    color: "bg-gold",
  },
  {
    href: "/admin/finance",
    icon: "💰",
    title: "재정 관리",
    desc: "헌금, 예산, 지출, 보고서",
    stat: "이번 달 헌금: -",
    color: "bg-green-dark",
  },
  {
    href: "/admin/newcomers",
    icon: "🙋",
    title: "새신자 관리",
    desc: "양육 단계 추적, 담당자 배정",
    stat: "양육 중: -명",
    color: "bg-[#8B6B3D]",
  },
  {
    href: "/admin/members",
    icon: "👥",
    title: "성도 관리",
    desc: "교인 정보, 설교 권한 승인",
    stat: "전체: -명",
    color: "bg-mid-gray",
  },
];

export default function AdminDashboard() {
  return (
    <div className="px-5 pt-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-green-dark">교회 관리</h1>
        <p className="text-mid-gray text-sm mt-0.5">목회자 관리 대시보드</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-green-dark text-white rounded-xl p-4">
          <p className="text-gold text-xs">이번 주 출석</p>
          <p className="text-2xl font-bold mt-1">-명</p>
        </div>
        <div className="bg-green-dark text-white rounded-xl p-4">
          <p className="text-gold text-xs">이번 달 헌금</p>
          <p className="text-2xl font-bold mt-1">-원</p>
        </div>
      </div>

      {/* 메뉴 목록 */}
      <div className="space-y-3">
        {adminMenus.map((m) => (
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
