"use client";

import { useState } from "react";
import Link from "next/link";

const VISIT_TYPES = [
  { value: "regular", label: "정기 심방" },
  { value: "patient", label: "환자 심방" },
  { value: "newcomer", label: "새신자 심방" },
  { value: "comfort", label: "위로 심방" },
  { value: "other", label: "기타" },
];

interface Visit {
  id: string;
  visitee_name: string;
  visit_type: string;
  visit_date: string;
  prayer_requests: string;
  follow_up_done: boolean;
}

const DEMO_VISITS: Visit[] = [
  { id: "1", visitee_name: "박권사", visit_type: "patient", visit_date: "2026-04-12", prayer_requests: "수술 후 회복을 위해", follow_up_done: false },
  { id: "2", visitee_name: "최집사", visit_type: "regular", visit_date: "2026-04-10", prayer_requests: "자녀 진학 문제", follow_up_done: true },
];

export default function VisitationPage() {
  const [showForm, setShowForm] = useState(false);
  const [visits] = useState<Visit[]>(DEMO_VISITS);
  const [formData, setFormData] = useState({
    visitee_name: "", visit_type: "regular", visit_date: new Date().toISOString().split("T")[0],
    content: "", prayer_requests: "", follow_up: "", follow_up_date: "",
  });

  function handleSave() {
    if (!formData.visitee_name || !formData.content) return;
    alert("심방 기록이 저장되었습니다! (Supabase 연동 후 실제 저장)");
    setShowForm(false);
  }

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/admin" className="text-sm text-mid-gray">← 관리</Link>
          <h1 className="text-xl font-bold text-green-dark">심방 관리</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-green text-white text-sm font-medium rounded-lg"
        >
          {showForm ? "닫기" : "+ 심방 기록"}
        </button>
      </div>

      {/* 심방 기록 폼 */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 space-y-3">
          <input
            type="text" placeholder="대상 성도 이름"
            value={formData.visitee_name}
            onChange={(e) => setFormData({ ...formData, visitee_name: e.target.value })}
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
          />
          <div className="flex gap-2">
            <select
              value={formData.visit_type}
              onChange={(e) => setFormData({ ...formData, visit_type: e.target.value })}
              className="flex-1 px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
            >
              {VISIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input
              type="date" value={formData.visit_date}
              onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
              className="px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
            />
          </div>
          <textarea
            placeholder="심방 내용" rows={3} value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full px-4 py-3 bg-cream border border-light-gray rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green"
          />
          <input
            type="text" placeholder="기도 제목" value={formData.prayer_requests}
            onChange={(e) => setFormData({ ...formData, prayer_requests: e.target.value })}
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
          />
          <button onClick={handleSave} className="w-full py-2.5 bg-green text-white rounded-lg font-medium text-sm">
            저장
          </button>
        </div>
      )}

      {/* 기도 제목 모아보기 */}
      <div className="bg-gold/10 rounded-xl p-4 mb-4">
        <h3 className="font-bold text-gold text-sm mb-2">🙏 기도 제목</h3>
        {visits.filter((v) => v.prayer_requests).map((v) => (
          <p key={v.id} className="text-charcoal text-sm mb-1">
            <span className="font-medium">{v.visitee_name}</span>: {v.prayer_requests}
          </p>
        ))}
      </div>

      {/* 심방 기록 목록 */}
      <div className="space-y-3">
        {visits.map((v) => (
          <div key={v.id} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-charcoal">{v.visitee_name}</span>
                <span className="text-xs px-2 py-0.5 bg-cream-dark rounded-full text-mid-gray">
                  {VISIT_TYPES.find((t) => t.value === v.visit_type)?.label}
                </span>
              </div>
              <span className={`text-xs font-medium ${v.follow_up_done ? "text-green" : "text-gold"}`}>
                {v.follow_up_done ? "완료" : "진행중"}
              </span>
            </div>
            <p className="text-mid-gray text-xs">{v.visit_date}</p>
            {v.prayer_requests && (
              <p className="text-sm text-charcoal mt-2">🙏 {v.prayer_requests}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
