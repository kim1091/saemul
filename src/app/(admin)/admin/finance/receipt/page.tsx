"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface OfferingSummary {
  name: string;
  total: number;
  monthly: number[];
}

interface DonorInfo {
  name: string;
  phone: string | null;
}

export default function ReceiptPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [churchId, setChurchId] = useState<string | null>(null);
  const [churchInfo, setChurchInfo] = useState<{ name: string; address: string | null; phone: string | null } | null>(null);
  const [donors, setDonors] = useState<{ name: string; total: number }[]>([]);
  const [selectedDonor, setSelectedDonor] = useState("");
  const [donorDetail, setDonorDetail] = useState<{ info: DonorInfo; items: OfferingSummary[]; grandTotal: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => { loadInit(); }, []);
  useEffect(() => { if (churchId) loadDonors(); }, [churchId, year]);

  async function loadInit() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles").select("church_id").eq("id", user.id).single();
    if (!profile?.church_id) { setLoading(false); return; }
    setChurchId(profile.church_id);

    const { data: church } = await supabase
      .from("churches").select("name, address, phone").eq("id", profile.church_id).single();
    setChurchInfo(church);
    setLoading(false);
  }

  async function loadDonors() {
    if (!churchId) return;
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data } = await supabase
      .from("offerings")
      .select("memo, amount")
      .eq("church_id", churchId)
      .gte("offering_date", startDate)
      .lte("offering_date", endDate);

    // memo에서 이름 추출 (형식: "이름 | 메모" 또는 "이름")
    const byDonor: Record<string, number> = {};
    (data || []).forEach((o) => {
      const name = o.memo?.split("|")[0]?.trim() || "익명";
      byDonor[name] = (byDonor[name] || 0) + o.amount;
    });

    const list = Object.entries(byDonor)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    setDonors(list);
  }

  async function loadDonorDetail(donorName: string) {
    if (!churchId) return;
    setSelectedDonor(donorName);

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data } = await supabase
      .from("offerings")
      .select("offering_date, amount, offering_type, memo")
      .eq("church_id", churchId)
      .gte("offering_date", startDate)
      .lte("offering_date", endDate);

    // 해당 헌금자 데이터만 필터
    const filtered = (data || []).filter((o) => {
      const name = o.memo?.split("|")[0]?.trim() || "익명";
      return name === donorName;
    });

    // 헌금 유형별 월별 집계
    const TYPES: Record<string, string> = {
      tithe: "십일조", sunday: "주일헌금", thanksgiving: "감사헌금",
      mission: "선교헌금", building: "건축헌금", easter: "부활절감사헌금",
      maechu: "맥추감사헌금", harvest: "추수감사헌금", christmas: "성탄감사헌금",
      purpose: "목적헌금", district: "구역헌금", special: "특별헌금", other: "기타",
    };

    const byType: Record<string, number[]> = {};
    filtered.forEach((o) => {
      const typeName = TYPES[o.offering_type] || o.offering_type;
      if (!byType[typeName]) byType[typeName] = new Array(12).fill(0);
      const month = parseInt(o.offering_date.split("-")[1]) - 1;
      byType[typeName][month] += o.amount;
    });

    const items: OfferingSummary[] = Object.entries(byType).map(([name, monthly]) => ({
      name,
      total: monthly.reduce((s, v) => s + v, 0),
      monthly,
    }));

    const grandTotal = items.reduce((s, i) => s + i.total, 0);

    // 교인 정보 찾기
    const { data: member } = await supabase
      .from("church_members")
      .select("name, phone")
      .eq("church_id", churchId)
      .eq("name", donorName)
      .maybeSingle();

    setDonorDetail({
      info: member || { name: donorName, phone: null },
      items,
      grandTotal,
    });
  }

  function handlePrint() {
    window.print();
  }

  function formatWon(n: number) { return n.toLocaleString("ko-KR"); }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-mid-gray">불러오는 중...</p></div>;

  return (
    <div className="px-5 pt-6 pb-8">
      {/* 헤더 (인쇄 시 숨김) */}
      <div className="mb-4 print:hidden">
        <Link href="/admin/finance" className="text-sm text-mid-gray">← 재정 관리</Link>
        <h1 className="text-xl font-bold text-green-dark">기부금 영수증</h1>
      </div>

      {/* 연도 + 헌금자 선택 */}
      <div className="flex gap-2 mb-4 print:hidden">
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
          className="px-3 py-2 bg-white border border-light-gray rounded-lg text-sm">
          {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select value={selectedDonor} onChange={(e) => loadDonorDetail(e.target.value)}
          className="flex-1 px-3 py-2 bg-white border border-light-gray rounded-lg text-sm">
          <option value="">헌금자 선택</option>
          {donors.map((d) => (
            <option key={d.name} value={d.name}>{d.name} ({formatWon(d.total)}원)</option>
          ))}
        </select>
      </div>

      {/* 영수증 */}
      {donorDetail && (
        <>
          <button onClick={handlePrint} className="w-full py-3 bg-green text-white font-bold rounded-xl mb-4 print:hidden">
            영수증 인쇄 / PDF 저장
          </button>

          <div ref={printRef} className="bg-white rounded-xl shadow-sm p-6 print:shadow-none print:p-8 print:rounded-none">
            {/* 제목 */}
            <div className="text-center mb-6 border-b-2 border-charcoal pb-4">
              <h2 className="text-2xl font-bold text-charcoal">기부금 납입 증명서</h2>
              <p className="text-sm text-mid-gray mt-1">(소득세법 제34조, 법인세법 제24조 관련)</p>
            </div>

            {/* 기부자 정보 */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-charcoal mb-2 bg-cream px-3 py-1.5 rounded">1. 기부자</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-light-gray">
                    <td className="py-2 px-3 font-medium text-mid-gray w-24">성 명</td>
                    <td className="py-2 px-3 text-charcoal font-bold">{donorDetail.info.name}</td>
                  </tr>
                  {donorDetail.info.phone && (
                    <tr className="border-b border-light-gray">
                      <td className="py-2 px-3 font-medium text-mid-gray">연락처</td>
                      <td className="py-2 px-3 text-charcoal">{donorDetail.info.phone}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 단체 정보 */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-charcoal mb-2 bg-cream px-3 py-1.5 rounded">2. 기부금 단체</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-light-gray">
                    <td className="py-2 px-3 font-medium text-mid-gray w-24">단체명</td>
                    <td className="py-2 px-3 text-charcoal font-bold">{churchInfo?.name}</td>
                  </tr>
                  {churchInfo?.address && (
                    <tr className="border-b border-light-gray">
                      <td className="py-2 px-3 font-medium text-mid-gray">소재지</td>
                      <td className="py-2 px-3 text-charcoal">{churchInfo.address}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 기부 내역 */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-charcoal mb-2 bg-cream px-3 py-1.5 rounded">3. 기부금 내역 ({year}년)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-light-gray/50">
                      <th className="border border-light-gray px-2 py-1.5 text-left">구분</th>
                      {Array.from({ length: 12 }, (_, i) => (
                        <th key={i} className="border border-light-gray px-1 py-1.5 text-center">{i + 1}월</th>
                      ))}
                      <th className="border border-light-gray px-2 py-1.5 text-right font-bold">합계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donorDetail.items.map((item) => (
                      <tr key={item.name}>
                        <td className="border border-light-gray px-2 py-1.5 font-medium">{item.name}</td>
                        {item.monthly.map((v, i) => (
                          <td key={i} className="border border-light-gray px-1 py-1.5 text-center text-[10px]">
                            {v > 0 ? formatWon(v) : "-"}
                          </td>
                        ))}
                        <td className="border border-light-gray px-2 py-1.5 text-right font-bold">{formatWon(item.total)}</td>
                      </tr>
                    ))}
                    <tr className="bg-green-dark/5 font-bold">
                      <td className="border border-light-gray px-2 py-2">합 계</td>
                      {Array.from({ length: 12 }, (_, i) => {
                        const monthTotal = donorDetail.items.reduce((s, item) => s + item.monthly[i], 0);
                        return (
                          <td key={i} className="border border-light-gray px-1 py-2 text-center text-[10px]">
                            {monthTotal > 0 ? formatWon(monthTotal) : "-"}
                          </td>
                        );
                      })}
                      <td className="border border-light-gray px-2 py-2 text-right text-green-dark">
                        {formatWon(donorDetail.grandTotal)}원
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 확인문 */}
            <div className="text-center mb-8">
              <p className="text-sm text-charcoal leading-6">
                위 금액을 기부금으로 납입하였음을 증명합니다.
              </p>
              <p className="text-sm text-mid-gray mt-4">
                {year}년 {new Date().getMonth() + 1}월 {new Date().getDate()}일
              </p>
            </div>

            {/* 발급자 */}
            <div className="text-right">
              <p className="text-sm text-charcoal">
                발급자: <span className="font-bold">{churchInfo?.name}</span>
              </p>
              <p className="text-xs text-mid-gray mt-1">(직인)</p>
            </div>
          </div>
        </>
      )}

      {/* 헌금자가 없을 때 */}
      {!selectedDonor && donors.length === 0 && (
        <div className="text-center pt-8 bg-white rounded-xl p-6">
          <p className="text-3xl mb-3">📄</p>
          <p className="text-mid-gray text-sm">{year}년 헌금 기록이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
