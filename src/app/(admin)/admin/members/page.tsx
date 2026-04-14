"use client";

import Link from "next/link";

const DEMO_MEMBERS = [
  { id: "1", name: "김성도", role: "member", phone: "010-1111-2222", sermon_perm: false },
  { id: "2", name: "이집사", role: "member", phone: "010-3333-4444", sermon_perm: true },
  { id: "3", name: "박권사", role: "member", phone: "010-5555-6666", sermon_perm: false },
  { id: "4", name: "최집사", role: "member", phone: "010-7777-8888", sermon_perm: false },
  { id: "5", name: "정전도사", role: "pastor", phone: "010-9999-0000", sermon_perm: true },
];

export default function MembersPage() {
  function handleTogglePermission(memberId: string) {
    alert(`설교 권한 변경! (Supabase 연동 후 실제 동작) - ID: ${memberId}`);
  }

  return (
    <div className="px-5 pt-6">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-mid-gray">← 관리</Link>
        <h1 className="text-xl font-bold text-green-dark">성도 관리</h1>
        <p className="text-mid-gray text-xs mt-0.5">총 {DEMO_MEMBERS.length}명</p>
      </div>

      {/* 검색 */}
      <input
        type="text"
        placeholder="이름으로 검색..."
        className="w-full px-4 py-2.5 bg-white border border-light-gray rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-green"
      />

      {/* 성도 목록 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {DEMO_MEMBERS.map((m, i) => (
          <div
            key={m.id}
            className={`flex items-center justify-between px-5 py-3.5 ${
              i > 0 ? "border-t border-light-gray/50" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                m.role === "pastor" ? "bg-gold text-charcoal" : "bg-green text-white"
              }`}>
                {m.name[0]}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm text-charcoal">{m.name}</span>
                  {m.role === "pastor" && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-gold/20 text-gold rounded-full font-medium">
                      목회자
                    </span>
                  )}
                </div>
                <p className="text-xs text-mid-gray">{m.phone}</p>
              </div>
            </div>

            {m.role === "member" && (
              <button
                onClick={() => handleTogglePermission(m.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  m.sermon_perm
                    ? "bg-green/10 text-green border border-green/30"
                    : "bg-light-gray text-mid-gray"
                }`}
              >
                {m.sermon_perm ? "설교 승인됨" : "설교 승인"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
