"use client";

import { useState } from "react";
import Link from "next/link";

const OFFERING_TYPES = [
  { value: "tithe", label: "십일조" },
  { value: "thanksgiving", label: "감사헌금" },
  { value: "mission", label: "선교헌금" },
  { value: "building", label: "건축헌금" },
  { value: "special", label: "특별헌금" },
  { value: "other", label: "기타" },
];

const BUDGET_CATEGORIES = [
  { category: "salary", label: "인건비", budget: 3000000, spent: 3000000 },
  { category: "ministry", label: "사역비", budget: 1000000, spent: 620000 },
  { category: "mission", label: "선교비", budget: 500000, spent: 300000 },
  { category: "facility", label: "시설관리", budget: 800000, spent: 450000 },
  { category: "education", label: "교육비", budget: 300000, spent: 180000 },
];

export default function FinancePage() {
  const [tab, setTab] = useState<"offering" | "budget" | "expense">("offering");
  const [showOfferingForm, setShowOfferingForm] = useState(false);
  const [offeringData, setOfferingData] = useState({
    name: "", amount: "", type: "tithe", date: new Date().toISOString().split("T")[0], memo: "",
  });

  const totalBudget = BUDGET_CATEGORIES.reduce((s, c) => s + c.budget, 0);
  const totalSpent = BUDGET_CATEGORIES.reduce((s, c) => s + c.spent, 0);

  function handleSaveOffering() {
    if (!offeringData.amount) return;
    alert("헌금이 기록되었습니다! (Supabase 연동 후 실제 저장)");
    setShowOfferingForm(false);
    setOfferingData({ name: "", amount: "", type: "tithe", date: new Date().toISOString().split("T")[0], memo: "" });
  }

  function formatWon(n: number) {
    return n.toLocaleString("ko-KR") + "원";
  }

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/admin" className="text-sm text-mid-gray">← 관리</Link>
          <h1 className="text-xl font-bold text-green-dark">재정 관리</h1>
        </div>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-dark text-white rounded-xl p-4">
          <p className="text-gold text-xs">이번 달 헌금</p>
          <p className="text-xl font-bold mt-1">5,620,000원</p>
        </div>
        <div className="bg-green-dark text-white rounded-xl p-4">
          <p className="text-gold text-xs">이번 달 지출</p>
          <p className="text-xl font-bold mt-1">{formatWon(totalSpent)}</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex bg-white rounded-xl p-1 mb-4 shadow-sm">
        {[
          { key: "offering" as const, label: "헌금" },
          { key: "budget" as const, label: "예산" },
          { key: "expense" as const, label: "지출" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key ? "bg-green text-white" : "text-mid-gray"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 헌금 탭 */}
      {tab === "offering" && (
        <div>
          <button
            onClick={() => setShowOfferingForm(!showOfferingForm)}
            className="w-full py-2.5 bg-gold text-charcoal font-bold rounded-xl mb-4 text-sm"
          >
            {showOfferingForm ? "닫기" : "+ 헌금 기록"}
          </button>

          {showOfferingForm && (
            <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 space-y-3">
              <input
                type="text" placeholder="성도 이름 (익명이면 비워두세요)"
                value={offeringData.name}
                onChange={(e) => setOfferingData({ ...offeringData, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
              />
              <div className="flex gap-2">
                <input
                  type="number" placeholder="금액"
                  value={offeringData.amount}
                  onChange={(e) => setOfferingData({ ...offeringData, amount: e.target.value })}
                  className="flex-1 px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
                />
                <select
                  value={offeringData.type}
                  onChange={(e) => setOfferingData({ ...offeringData, type: e.target.value })}
                  className="px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
                >
                  {OFFERING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <button onClick={handleSaveOffering} className="w-full py-2.5 bg-green text-white rounded-lg font-medium text-sm">
                저장
              </button>
            </div>
          )}

          {/* 헌금 유형별 합계 */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-bold text-charcoal text-sm mb-3">이번 달 유형별</h3>
            {[
              { label: "십일조", amount: 3200000 },
              { label: "감사헌금", amount: 1500000 },
              { label: "선교헌금", amount: 520000 },
              { label: "특별헌금", amount: 400000 },
            ].map((o) => (
              <div key={o.label} className="flex justify-between py-2 border-b border-light-gray/50 last:border-0">
                <span className="text-sm text-charcoal">{o.label}</span>
                <span className="text-sm font-medium text-green-dark">{formatWon(o.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 예산 탭 */}
      {tab === "budget" && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl p-4 shadow-sm mb-2">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-bold text-charcoal">전체 예산</span>
              <span className="text-sm text-mid-gray">{formatWon(totalSpent)} / {formatWon(totalBudget)}</span>
            </div>
            <div className="bg-light-gray rounded-full h-2.5">
              <div className="bg-green rounded-full h-2.5" style={{ width: `${(totalSpent / totalBudget) * 100}%` }} />
            </div>
            <p className="text-xs text-mid-gray mt-1 text-right">{Math.round((totalSpent / totalBudget) * 100)}% 집행</p>
          </div>

          {BUDGET_CATEGORIES.map((c) => {
            const pct = Math.round((c.spent / c.budget) * 100);
            return (
              <div key={c.category} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-sm text-charcoal">{c.label}</span>
                  <span className="text-xs text-mid-gray">{pct}%</span>
                </div>
                <div className="bg-light-gray rounded-full h-2 mb-1">
                  <div
                    className={`rounded-full h-2 ${pct >= 100 ? "bg-red-400" : pct >= 80 ? "bg-gold" : "bg-green"}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-mid-gray">{formatWon(c.spent)}</span>
                  <span className="text-xs text-mid-gray">{formatWon(c.budget)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 지출 탭 */}
      {tab === "expense" && (
        <div>
          <button className="w-full py-2.5 bg-gold text-charcoal font-bold rounded-xl mb-4 text-sm">
            + 지출 기록
          </button>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            {[
              { desc: "교회 전기세", amount: 180000, date: "2026-04-10", cat: "시설관리" },
              { desc: "주일학교 교재", amount: 85000, date: "2026-04-08", cat: "교육비" },
              { desc: "선교사 후원금", amount: 300000, date: "2026-04-05", cat: "선교비" },
            ].map((e, i) => (
              <div key={i} className={`flex justify-between py-3 ${i > 0 ? "border-t border-light-gray/50" : ""}`}>
                <div>
                  <p className="text-sm font-medium text-charcoal">{e.desc}</p>
                  <p className="text-xs text-mid-gray">{e.date} | {e.cat}</p>
                </div>
                <span className="text-sm font-bold text-red-500">-{formatWon(e.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
