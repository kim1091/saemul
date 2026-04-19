"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const OFFERING_TYPES = [
  { value: "tithe", label: "십일조" },
  { value: "sunday", label: "주일헌금" },
  { value: "thanksgiving", label: "감사헌금" },
  { value: "mission", label: "선교헌금" },
  { value: "building", label: "건축헌금" },
  { value: "easter", label: "부활절감사헌금" },
  { value: "maechu", label: "맥추감사헌금" },
  { value: "harvest", label: "추수감사헌금" },
  { value: "christmas", label: "성탄감사헌금" },
  { value: "purpose", label: "목적헌금 (이름 입력)" },
  { value: "district", label: "구역헌금" },
  { value: "special", label: "특별헌금" },
  { value: "other", label: "기타" },
];

interface Offering {
  id: string;
  user_id: string | null;
  offering_date: string;
  amount: number;
  offering_type: string;
  custom_name: string | null;
  memo: string | null;
}

interface Expense {
  id: string;
  expense_date: string;
  amount: number;
  description: string;
}

export default function FinancePage() {
  const [tab, setTab] = useState<"offering" | "expense">("offering");
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [pastorId, setPastorId] = useState<string | null>(null);

  // 헌금 폼
  const [showOfferingForm, setShowOfferingForm] = useState(false);
  const [offeringData, setOfferingData] = useState({
    amount: "", type: "tithe", custom_name: "",
    date: new Date().toISOString().split("T")[0],
    memo: "", offerer_name: "",
  });

  // 지출 폼
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseData, setExpenseData] = useState({
    amount: "", description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [memberNames, setMemberNames] = useState<string[]>([]);

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setPastorId(user.id);

    const { data: profile } = await supabase
      .from("profiles").select("church_id").eq("id", user.id).single();

    if (!profile?.church_id) { setLoading(false); return; }
    setChurchId(profile.church_id);

    const { data: cms } = await supabase.from("church_members").select("name")
      .eq("church_id", profile.church_id).eq("is_active", true).order("name");
    setMemberNames((cms || []).map((m) => m.name));

    const [{ data: ofs }, { data: exs }] = await Promise.all([
      supabase.from("offerings")
        .select("*").eq("church_id", profile.church_id)
        .order("offering_date", { ascending: false }).limit(50),
      supabase.from("expenses")
        .select("*").eq("church_id", profile.church_id)
        .order("expense_date", { ascending: false }).limit(50),
    ]);

    setOfferings(ofs || []);
    setExpenses(exs || []);
    setLoading(false);
  }

  async function handleSaveOffering() {
    if (!offeringData.amount || !churchId || !pastorId) return;
    if (offeringData.type === "purpose" && !offeringData.custom_name.trim()) {
      alert("목적헌금의 이름을 입력해주세요 (예: 건축, 장학)");
      return;
    }
    const { error } = await supabase.from("offerings").insert({
      church_id: churchId,
      offering_date: offeringData.date,
      amount: parseInt(offeringData.amount),
      offering_type: offeringData.type,
      custom_name: offeringData.type === "purpose" ? offeringData.custom_name.trim() : null,
      memo: [offeringData.offerer_name, offeringData.memo].filter(Boolean).join(" | ") || null,
      recorded_by: pastorId,
    });
    if (error) { alert("저장 실패: " + error.message); return; }
    setOfferingData({ amount: "", type: "tithe", custom_name: "", date: new Date().toISOString().split("T")[0], memo: "", offerer_name: "" });
    setShowOfferingForm(false);
    loadData();
  }

  async function handleSaveExpense() {
    if (!expenseData.amount || !expenseData.description || !churchId || !pastorId) return;
    const { error } = await supabase.from("expenses").insert({
      church_id: churchId,
      expense_date: expenseData.date,
      amount: parseInt(expenseData.amount),
      description: expenseData.description,
      recorded_by: pastorId,
    });
    if (error) { alert("저장 실패: " + error.message); return; }
    setExpenseData({ amount: "", description: "", date: new Date().toISOString().split("T")[0] });
    setShowExpenseForm(false);
    loadData();
  }

  function formatWon(n: number) { return n.toLocaleString("ko-KR") + "원"; }

  // 월 필터
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const filteredOfferings = offerings.filter((o) => o.offering_date.startsWith(selectedMonth));
  const filteredExpenses = expenses.filter((e) => e.expense_date.startsWith(selectedMonth));
  const monthOffer = filteredOfferings.reduce((s, o) => s + o.amount, 0);
  const monthExp = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-mid-gray">불러오는 중...</p></div>;

  if (!churchId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center">
          <p className="text-4xl mb-3">⛪</p>
          <h2 className="text-lg font-bold text-green-dark mb-2">먼저 교회를 등록해주세요</h2>
          <Link href="/admin/church" className="inline-block mt-4 px-5 py-2.5 bg-green text-white rounded-lg font-medium text-sm">교회 등록하기</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-mid-gray">← 관리</Link>
        <h1 className="text-xl font-bold text-green-dark">재정 관리</h1>
      </div>

      {/* 월 선택 */}
      <div className="mb-3">
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
        />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-green-dark text-white rounded-xl p-4">
          <p className="text-gold text-xs">헌금</p>
          <p className="text-lg font-bold mt-1">{formatWon(monthOffer)}</p>
        </div>
        <div className="bg-green-dark text-white rounded-xl p-4">
          <p className="text-gold text-xs">지출</p>
          <p className="text-lg font-bold mt-1">{formatWon(monthExp)}</p>
        </div>
        <div className={`rounded-xl p-4 ${monthOffer - monthExp >= 0 ? "bg-green/10" : "bg-red-50"}`}>
          <p className="text-xs text-mid-gray">잔액</p>
          <p className={`text-lg font-bold mt-1 ${monthOffer - monthExp >= 0 ? "text-green-dark" : "text-red-500"}`}>
            {formatWon(monthOffer - monthExp)}
          </p>
        </div>
      </div>

      <Link href="/admin/finance/receipt" className="block w-full py-2.5 bg-white border border-green text-green font-medium rounded-xl mb-3 text-sm text-center">
        📄 기부금 영수증 발급
      </Link>

      <div className="flex bg-white rounded-xl p-1 mb-4 shadow-sm">
        {[
          { key: "offering" as const, label: "헌금" },
          { key: "expense" as const, label: "지출" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? "bg-green text-white" : "text-mid-gray"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

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
              <select
                value={offeringData.type}
                onChange={(e) => setOfferingData({ ...offeringData, type: e.target.value })}
                className="w-full px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
              >
                {OFFERING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>

              {offeringData.type === "purpose" && (
                <input
                  type="text" placeholder="목적헌금 이름 * (예: 장학, 구제, 선교지원)"
                  value={offeringData.custom_name}
                  onChange={(e) => setOfferingData({ ...offeringData, custom_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gold/10 border border-gold/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                />
              )}

              <div className="flex gap-2">
                <input
                  type="number" placeholder="금액 *"
                  value={offeringData.amount}
                  onChange={(e) => setOfferingData({ ...offeringData, amount: e.target.value })}
                  className="flex-1 px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
                />
                <input
                  type="date" value={offeringData.date}
                  onChange={(e) => setOfferingData({ ...offeringData, date: e.target.value })}
                  className="px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
                />
              </div>

              <input
                type="text" placeholder="성도 이름 (선택, 익명이면 비워두기)" list="offerer-names"
                value={offeringData.offerer_name}
                onChange={(e) => setOfferingData({ ...offeringData, offerer_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
              />
              <datalist id="offerer-names">
                {memberNames.map((n, i) => <option key={i} value={n} />)}
              </datalist>
              <input
                type="text" placeholder="메모 (선택)"
                value={offeringData.memo}
                onChange={(e) => setOfferingData({ ...offeringData, memo: e.target.value })}
                className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
              />
              <button onClick={handleSaveOffering} disabled={!offeringData.amount} className="w-full py-2.5 bg-green text-white rounded-lg font-medium text-sm disabled:opacity-40">
                저장
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl p-4 shadow-sm">
            {filteredOfferings.length === 0 ? (
              <p className="text-center text-mid-gray text-sm py-4">{selectedMonth} 헌금 기록이 없습니다.</p>
            ) : (
              filteredOfferings.map((o, i) => (
                <div key={o.id} className={`flex justify-between py-2 ${i > 0 ? "border-t border-light-gray/50" : ""}`}>
                  <div>
                    <p className="text-sm font-medium text-charcoal">
                      {o.offering_type === "purpose" && o.custom_name
                        ? `목적 · ${o.custom_name}`
                        : OFFERING_TYPES.find((t) => t.value === o.offering_type)?.label}
                    </p>
                    <p className="text-xs text-mid-gray">{o.offering_date}{o.memo && ` | ${o.memo}`}</p>
                  </div>
                  <span className="text-sm font-bold text-green-dark">{formatWon(o.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "expense" && (
        <div>
          <button
            onClick={() => setShowExpenseForm(!showExpenseForm)}
            className="w-full py-2.5 bg-gold text-charcoal font-bold rounded-xl mb-4 text-sm"
          >
            {showExpenseForm ? "닫기" : "+ 지출 기록"}
          </button>

          {showExpenseForm && (
            <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 space-y-3">
              <input
                type="text" placeholder="지출 내용 *"
                value={expenseData.description}
                onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
              />
              <div className="flex gap-2">
                <input
                  type="number" placeholder="금액 *"
                  value={expenseData.amount}
                  onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                  className="flex-1 px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
                />
                <input
                  type="date" value={expenseData.date}
                  onChange={(e) => setExpenseData({ ...expenseData, date: e.target.value })}
                  className="px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
                />
              </div>
              <button onClick={handleSaveExpense} disabled={!expenseData.amount || !expenseData.description} className="w-full py-2.5 bg-green text-white rounded-lg font-medium text-sm disabled:opacity-40">
                저장
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl p-4 shadow-sm">
            {filteredExpenses.length === 0 ? (
              <p className="text-center text-mid-gray text-sm py-4">{selectedMonth} 지출 기록이 없습니다.</p>
            ) : (
              filteredExpenses.map((e, i) => (
                <div key={e.id} className={`flex justify-between py-2 ${i > 0 ? "border-t border-light-gray/50" : ""}`}>
                  <div>
                    <p className="text-sm font-medium text-charcoal">{e.description}</p>
                    <p className="text-xs text-mid-gray">{e.expense_date}</p>
                  </div>
                  <span className="text-sm font-bold text-red-500">-{formatWon(e.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
