"use client";

import { useState } from "react";
import Link from "next/link";

const WORSHIP_TYPES = ["주일1부", "주일2부", "수요예배", "금요기도", "새벽기도"];

const DEMO_MEMBERS = [
  { id: "1", name: "김성도", checked: true },
  { id: "2", name: "이집사", checked: true },
  { id: "3", name: "박권사", checked: false },
  { id: "4", name: "최집사", checked: true },
  { id: "5", name: "정성도", checked: false },
  { id: "6", name: "한집사", checked: true },
];

export default function AttendancePage() {
  const [selectedWorship, setSelectedWorship] = useState("주일1부");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [members, setMembers] = useState(DEMO_MEMBERS);

  const checkedCount = members.filter((m) => m.checked).length;

  function toggleMember(id: string) {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, checked: !m.checked } : m))
    );
  }

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
          {WORSHIP_TYPES.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
      </div>

      {/* QR 출석 버튼 */}
      <button className="w-full py-3 bg-gold text-charcoal font-bold rounded-xl mb-4 text-sm">
        📱 QR 출석 코드 생성
      </button>

      {/* 출석 체크 목록 */}
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
                {m.checked ? "✓" : m.name[0]}
              </div>
              <span className={`font-medium text-sm ${m.checked ? "text-green-dark" : "text-charcoal"}`}>
                {m.name}
              </span>
            </div>
            <span className={`text-xs ${m.checked ? "text-green" : "text-mid-gray"}`}>
              {m.checked ? "출석" : "미출석"}
            </span>
          </button>
        ))}
      </div>

      {/* 통계 */}
      <div className="mt-6 bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-charcoal text-sm mb-3">출석 통계</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-green">{checkedCount}</p>
            <p className="text-xs text-mid-gray">오늘 출석</p>
          </div>
          <div>
            <p className="text-lg font-bold text-charcoal">{Math.round((checkedCount / members.length) * 100)}%</p>
            <p className="text-xs text-mid-gray">출석률</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gold">0</p>
            <p className="text-xs text-mid-gray">장기결석</p>
          </div>
        </div>
      </div>
    </div>
  );
}
