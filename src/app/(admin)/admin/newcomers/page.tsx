"use client";

import { useState } from "react";
import Link from "next/link";

const STAGES = [
  { value: "first_visit", label: "첫방문", color: "bg-gold/20 text-gold" },
  { value: "newcomer_class", label: "새가족반", color: "bg-blue-100 text-blue-600" },
  { value: "settling", label: "정착", color: "bg-green/10 text-green" },
  { value: "assigned", label: "구역배정", color: "bg-green text-white" },
];

const DEMO_NEWCOMERS = [
  { id: "1", name: "홍길동", phone: "010-1234-5678", first_visit_date: "2026-04-07", stage: "newcomer_class", assigned_to: "김목사", referrer: "이집사" },
  { id: "2", name: "김신자", phone: "010-9876-5432", first_visit_date: "2026-04-14", stage: "first_visit", assigned_to: null, referrer: "직접 방문" },
  { id: "3", name: "박새벽", phone: "010-5555-1234", first_visit_date: "2026-03-15", stage: "settling", assigned_to: "박전도사", referrer: "최집사" },
];

export default function NewcomersPage() {
  const [showForm, setShowForm] = useState(false);
  const [newcomers] = useState(DEMO_NEWCOMERS);
  const [formData, setFormData] = useState({
    name: "", phone: "", referrer: "", interests: "",
  });

  function handleSave() {
    if (!formData.name) return;
    alert("새신자가 등록되었습니다! (Supabase 연동 후 실제 저장)");
    setShowForm(false);
  }

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/admin" className="text-sm text-mid-gray">← 관리</Link>
          <h1 className="text-xl font-bold text-green-dark">새신자 관리</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-green text-white text-sm font-medium rounded-lg"
        >
          {showForm ? "닫기" : "+ 등록"}
        </button>
      </div>

      {/* 양육 단계 요약 */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {STAGES.map((s) => {
          const count = newcomers.filter((n) => n.stage === s.value).length;
          return (
            <div key={s.value} className="flex-shrink-0 bg-white rounded-xl px-4 py-3 shadow-sm text-center min-w-[80px]">
              <p className="text-lg font-bold text-charcoal">{count}</p>
              <p className="text-xs text-mid-gray">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* 등록 폼 */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 space-y-3">
          <input
            type="text" placeholder="이름"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
          />
          <input
            type="tel" placeholder="전화번호"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
          />
          <input
            type="text" placeholder="소개자"
            value={formData.referrer}
            onChange={(e) => setFormData({ ...formData, referrer: e.target.value })}
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
          />
          <button onClick={handleSave} className="w-full py-2.5 bg-green text-white rounded-lg font-medium text-sm">
            등록
          </button>
        </div>
      )}

      {/* 새신자 목록 */}
      <div className="space-y-3">
        {newcomers.map((n) => {
          const stage = STAGES.find((s) => s.value === n.stage);
          return (
            <div key={n.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-green-dark text-white flex items-center justify-center text-sm font-bold">
                    {n.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-charcoal text-sm">{n.name}</p>
                    <p className="text-xs text-mid-gray">{n.phone}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${stage?.color}`}>
                  {stage?.label}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-mid-gray">
                <span>첫방문: {n.first_visit_date}</span>
                <span>소개: {n.referrer}</span>
                {n.assigned_to && <span>담당: {n.assigned_to}</span>}
              </div>

              {/* 양육 진행바 */}
              <div className="flex gap-1 mt-3">
                {STAGES.map((s, i) => {
                  const currentIdx = STAGES.findIndex((st) => st.value === n.stage);
                  return (
                    <div
                      key={s.value}
                      className={`flex-1 h-1.5 rounded-full ${
                        i <= currentIdx ? "bg-green" : "bg-light-gray"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
