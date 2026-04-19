"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface MemberInfo {
  id: string;
  name: string;
  birth_date: string | null;
  gender: string | null;
  department: string | null;
  grade: string | null;
  relation: string | null;
  phone: string | null;
}

type CertType = "member" | "baptism" | "transfer";

const CERT_TITLES: Record<CertType, string> = {
  member: "교인 증명서",
  baptism: "세례 증명서",
  transfer: "전입/전출 확인서",
};

export default function CertificatePage() {
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [churchInfo, setChurchInfo] = useState<{ name: string; address: string | null; phone: string | null } | null>(null);
  const [pastorName, setPastorName] = useState("");

  const [selectedMember, setSelectedMember] = useState<MemberInfo | null>(null);
  const [certType, setCertType] = useState<CertType>("member");
  const [baptismDate, setBaptismDate] = useState("");
  const [baptismChurch, setBaptismChurch] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [transferTo, setTransferTo] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const supabase = createClient();

  useEffect(() => { loadInit(); }, []);

  async function loadInit() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles").select("church_id, name").eq("id", user.id).single();
    if (!profile?.church_id) { setLoading(false); return; }
    setChurchId(profile.church_id);
    setPastorName(profile.name || "");

    const { data: church } = await supabase
      .from("churches").select("name, address, phone").eq("id", profile.church_id).single();
    setChurchInfo(church);

    const { data: cms } = await supabase
      .from("church_members").select("id, name, birth_date, gender, department, grade, relation, phone")
      .eq("church_id", profile.church_id).eq("is_active", true).order("name");
    setMembers(cms || []);

    // 세례일 정보 가져오기 (profiles에서)
    setLoading(false);
  }

  function handleSelectMember(id: string) {
    const m = members.find((m) => m.id === id);
    setSelectedMember(m || null);
    setShowPreview(false);
  }

  function handlePreview() {
    if (!selectedMember) return;
    setShowPreview(true);
  }

  const GENDER: Record<string, string> = { male: "남", female: "여" };
  const today = new Date();
  const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-mid-gray">불러오는 중...</p></div>;

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="mb-4 print:hidden">
        <Link href="/admin" className="text-sm text-mid-gray">← 관리</Link>
        <h1 className="text-xl font-bold text-green-dark">증명서 발급</h1>
      </div>

      {/* 설정 */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-4 space-y-3 print:hidden">
        {/* 증명서 유형 */}
        <div className="flex gap-2">
          {(["member", "baptism", "transfer"] as CertType[]).map((t) => (
            <button key={t} onClick={() => { setCertType(t); setShowPreview(false); }}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
                certType === t ? "bg-green text-white" : "bg-cream text-mid-gray"
              }`}>
              {CERT_TITLES[t]}
            </button>
          ))}
        </div>

        {/* 교인 선택 */}
        <select onChange={(e) => handleSelectMember(e.target.value)} value={selectedMember?.id || ""}
          className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm">
          <option value="">교인 선택</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} {m.department ? `(${m.department})` : ""} {m.relation && m.relation !== "본인" ? `[${m.relation}]` : ""}
            </option>
          ))}
        </select>

        {/* 세례 증명서 추가 정보 */}
        {certType === "baptism" && (
          <div className="flex gap-2">
            <input type="date" value={baptismDate} onChange={(e) => setBaptismDate(e.target.value)}
              placeholder="세례 일자" className="flex-1 px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm" />
            <input type="text" value={baptismChurch} onChange={(e) => setBaptismChurch(e.target.value)}
              placeholder="세례 교회 (현 교회면 비워두기)" className="flex-1 px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm" />
          </div>
        )}

        {/* 전입/전출 추가 정보 */}
        {certType === "transfer" && (
          <div className="flex gap-2">
            <input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)}
              className="flex-1 px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm" />
            <input type="text" value={transferTo} onChange={(e) => setTransferTo(e.target.value)}
              placeholder="전출 교회명 (전입이면 비워두기)" className="flex-1 px-3 py-2.5 bg-cream border border-light-gray rounded-lg text-sm" />
          </div>
        )}

        <button onClick={handlePreview} disabled={!selectedMember}
          className="w-full py-2.5 bg-green text-white font-medium rounded-lg text-sm disabled:opacity-40">
          미리보기
        </button>
      </div>

      {/* 인쇄 버튼 */}
      {showPreview && (
        <button onClick={() => window.print()}
          className="w-full py-3 bg-green text-white font-bold rounded-xl mb-4 print:hidden">
          인쇄 / PDF 저장
        </button>
      )}

      {/* 증명서 미리보기 */}
      {showPreview && selectedMember && (
        <div className="bg-white rounded-xl shadow-sm p-8 print:shadow-none print:rounded-none print:p-12">
          {/* 제목 */}
          <div className="text-center mb-8 border-b-2 border-charcoal pb-6">
            <h2 className="text-3xl font-bold text-charcoal tracking-wider">{CERT_TITLES[certType]}</h2>
            <p className="text-sm text-mid-gray mt-2">{churchInfo?.name}</p>
          </div>

          {/* 본문 */}
          <div className="mb-8">
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className="border-b border-light-gray">
                  <td className="py-3 px-4 font-bold text-mid-gray w-28 bg-cream/50">성 명</td>
                  <td className="py-3 px-4 text-charcoal font-bold text-lg">{selectedMember.name}</td>
                </tr>
                {selectedMember.birth_date && (
                  <tr className="border-b border-light-gray">
                    <td className="py-3 px-4 font-bold text-mid-gray bg-cream/50">생년월일</td>
                    <td className="py-3 px-4 text-charcoal">{selectedMember.birth_date}</td>
                  </tr>
                )}
                {selectedMember.gender && (
                  <tr className="border-b border-light-gray">
                    <td className="py-3 px-4 font-bold text-mid-gray bg-cream/50">성 별</td>
                    <td className="py-3 px-4 text-charcoal">{GENDER[selectedMember.gender]}</td>
                  </tr>
                )}
                {selectedMember.phone && (
                  <tr className="border-b border-light-gray">
                    <td className="py-3 px-4 font-bold text-mid-gray bg-cream/50">연락처</td>
                    <td className="py-3 px-4 text-charcoal">{selectedMember.phone}</td>
                  </tr>
                )}
                {selectedMember.department && (
                  <tr className="border-b border-light-gray">
                    <td className="py-3 px-4 font-bold text-mid-gray bg-cream/50">소속 부서</td>
                    <td className="py-3 px-4 text-charcoal">{selectedMember.department} {selectedMember.grade || ""}</td>
                  </tr>
                )}

                {/* 세례 증명서 전용 */}
                {certType === "baptism" && (
                  <>
                    <tr className="border-b border-light-gray">
                      <td className="py-3 px-4 font-bold text-mid-gray bg-cream/50">세례 일자</td>
                      <td className="py-3 px-4 text-charcoal">{baptismDate || "미기재"}</td>
                    </tr>
                    <tr className="border-b border-light-gray">
                      <td className="py-3 px-4 font-bold text-mid-gray bg-cream/50">세례 교회</td>
                      <td className="py-3 px-4 text-charcoal">{baptismChurch || churchInfo?.name}</td>
                    </tr>
                  </>
                )}

                {/* 전입/전출 전용 */}
                {certType === "transfer" && (
                  <>
                    <tr className="border-b border-light-gray">
                      <td className="py-3 px-4 font-bold text-mid-gray bg-cream/50">{transferTo ? "전출일" : "전입일"}</td>
                      <td className="py-3 px-4 text-charcoal">{transferDate}</td>
                    </tr>
                    {transferTo && (
                      <tr className="border-b border-light-gray">
                        <td className="py-3 px-4 font-bold text-mid-gray bg-cream/50">전출 교회</td>
                        <td className="py-3 px-4 text-charcoal">{transferTo}</td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* 확인문 */}
          <div className="text-center mb-10">
            <p className="text-sm text-charcoal leading-7">
              {certType === "member" && "위 사람은 본 교회의 교인임을 증명합니다."}
              {certType === "baptism" && "위 사람이 세례를 받았음을 증명합니다."}
              {certType === "transfer" && (transferTo
                ? `위 사람이 본 교회에서 ${transferTo}(으)로 전출하였음을 확인합니다.`
                : "위 사람이 본 교회로 전입하였음을 확인합니다."
              )}
            </p>
          </div>

          {/* 날짜 + 서명 */}
          <div className="text-center mb-8">
            <p className="text-sm text-mid-gray">{todayStr}</p>
          </div>

          <div className="text-center space-y-2">
            <p className="text-lg font-bold text-charcoal">{churchInfo?.name}</p>
            {churchInfo?.address && <p className="text-xs text-mid-gray">{churchInfo.address}</p>}
            {churchInfo?.phone && <p className="text-xs text-mid-gray">TEL. {churchInfo.phone}</p>}
            <div className="mt-4">
              <p className="text-sm text-charcoal">담임목사 <span className="font-bold text-lg ml-2">{pastorName}</span> <span className="text-mid-gray ml-2">(직인)</span></p>
            </div>
          </div>
        </div>
      )}

      {/* 안내 */}
      {!showPreview && (
        <div className="text-center pt-4">
          <p className="text-mid-gray text-xs">증명서 유형 선택 → 교인 선택 → 미리보기 → 인쇄/PDF</p>
        </div>
      )}
    </div>
  );
}
