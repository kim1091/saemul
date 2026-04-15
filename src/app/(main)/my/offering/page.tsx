"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface Offering {
  id: string;
  offering_date: string;
  amount: number;
  offering_type: string;
  custom_name: string | null;
  memo: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  tithe: "십일조",
  sunday: "주일헌금",
  thanksgiving: "감사헌금",
  mission: "선교헌금",
  building: "건축헌금",
  purpose: "목적헌금",
  easter: "부활절감사헌금",
  maechu: "맥추감사헌금",
  harvest: "추수감사헌금",
  christmas: "성탄감사헌금",
  special: "특별헌금",
  other: "기타",
};

export default function MyOfferingPage() {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [churchName, setChurchName] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());

  const supabase = createClient();

  useEffect(() => { load(); }, [year]);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("church_name")
      .eq("id", user.id)
      .single();
    setChurchName(profile?.church_name || null);

    const { data: ofs } = await supabase
      .from("offerings")
      .select("*")
      .eq("user_id", user.id)
      .gte("offering_date", `${year}-01-01`)
      .lte("offering_date", `${year}-12-31`)
      .order("offering_date", { ascending: false });

    setOfferings((ofs || []) as Offering[]);
    setLoading(false);
  }

  function formatWon(n: number) { return n.toLocaleString("ko-KR") + "원"; }

  // 연간 합계
  const yearlyTotal = offerings.reduce((s, o) => s + o.amount, 0);

  // 유형별 합계
  const byType: Record<string, number> = {};
  offerings.forEach((o) => {
    const key = o.offering_type === "purpose" && o.custom_name ? o.custom_name : TYPE_LABEL[o.offering_type] || "기타";
    byType[key] = (byType[key] || 0) + o.amount;
  });

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-mid-gray">불러오는 중...</p></div>;

  return (
    <div className="px-5 pt-6">
      <div className="mb-4">
        <Link href="/profile" className="text-sm text-mid-gray">← 프로필</Link>
        <h1 className="text-xl font-bold text-green-dark">내 헌금 내역</h1>
        {churchName && <p className="text-xs text-gold mt-0.5">⛪ {churchName}</p>}
      </div>

      {/* 연도 선택 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setYear(year - 1)}
          className="px-3 py-2 bg-white border border-light-gray rounded-lg text-sm"
        >←</button>
        <div className="flex-1 px-4 py-2 bg-green-dark text-white rounded-lg text-center text-sm font-bold">
          {year}년
        </div>
        <button
          onClick={() => setYear(year + 1)}
          disabled={year >= new Date().getFullYear()}
          className="px-3 py-2 bg-white border border-light-gray rounded-lg text-sm disabled:opacity-40"
        >→</button>
      </div>

      {/* 연간 합계 */}
      <div className="bg-green-dark text-white rounded-xl p-5 mb-4 text-center">
        <p className="text-gold text-xs mb-1">{year}년 총 헌금</p>
        <p className="text-2xl font-bold">{formatWon(yearlyTotal)}</p>
        <p className="text-xs text-light-gray mt-1">{offerings.length}건</p>
      </div>

      {/* 유형별 요약 */}
      {Object.keys(byType).length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h3 className="font-bold text-charcoal text-sm mb-3">유형별 합계</h3>
          {Object.entries(byType).map(([type, amount]) => (
            <div key={type} className="flex justify-between py-2 border-b border-light-gray/50 last:border-0">
              <span className="text-sm text-charcoal">{type}</span>
              <span className="text-sm font-medium text-green-dark">{formatWon(amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* 상세 내역 */}
      <h3 className="font-bold text-charcoal text-sm mb-2">상세 내역</h3>
      {offerings.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center">
          <p className="text-mid-gray text-sm">{year}년 헌금 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {offerings.map((o, i) => (
            <div key={o.id} className={`flex items-center justify-between px-5 py-3 ${i > 0 ? "border-t border-light-gray/50" : ""}`}>
              <div>
                <p className="text-sm font-medium text-charcoal">
                  {o.offering_type === "purpose" && o.custom_name ? o.custom_name : TYPE_LABEL[o.offering_type]}
                </p>
                <p className="text-xs text-mid-gray">{o.offering_date}{o.memo ? ` | ${o.memo}` : ""}</p>
              </div>
              <span className="text-sm font-bold text-green-dark">{formatWon(o.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-gold/10 rounded-xl p-4 text-center">
        <p className="text-xs text-charcoal">
          💡 연말정산용 기부금영수증 발급은 목사님께 문의해주세요.
        </p>
      </div>
    </div>
  );
}
