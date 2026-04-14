"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const VISIT_TYPES = [
  { value: "regular", label: "정기 심방" },
  { value: "patient", label: "환자 심방" },
  { value: "newcomer", label: "새신자 심방" },
  { value: "comfort", label: "위로 심방" },
  { value: "other", label: "기타" },
];

interface Visit {
  id: string;
  visitee_name: string | null;
  visit_type: string;
  visit_date: string;
  content: string;
  prayer_requests: string | null;
  follow_up_done: boolean;
}

export default function VisitationPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    visitee_name: "",
    visit_type: "regular",
    visit_date: new Date().toISOString().split("T")[0],
    content: "",
    prayer_requests: "",
  });

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setVisitorId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("church_id")
      .eq("id", user.id)
      .single();

    if (!profile?.church_id) { setLoading(false); return; }
    setChurchId(profile.church_id);

    const { data } = await supabase
      .from("visitations")
      .select("*")
      .eq("church_id", profile.church_id)
      .order("visit_date", { ascending: false });

    setVisits(data || []);
    setLoading(false);
  }

  async function handleSave() {
    if (!formData.visitee_name || !formData.content || !churchId || !visitorId) return;

    const { error } = await supabase.from("visitations").insert({
      church_id: churchId,
      visitor_id: visitorId,
      visitee_name: formData.visitee_name,
      visit_type: formData.visit_type,
      visit_date: formData.visit_date,
      content: formData.content,
      prayer_requests: formData.prayer_requests || null,
    });

    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }

    setFormData({
      visitee_name: "", visit_type: "regular",
      visit_date: new Date().toISOString().split("T")[0],
      content: "", prayer_requests: "",
    });
    setShowForm(false);
    loadData();
  }

  async function toggleFollowUp(id: string, current: boolean) {
    await supabase
      .from("visitations")
      .update({ follow_up_done: !current })
      .eq("id", id);
    loadData();
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-mid-gray">불러오는 중...</p></div>;

  if (!churchId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center">
          <p className="text-4xl mb-3">⛪</p>
          <h2 className="text-lg font-bold text-green-dark mb-2">먼저 교회를 등록해주세요</h2>
          <Link href="/admin/church" className="inline-block mt-4 px-5 py-2.5 bg-green text-white rounded-lg font-medium text-sm">
            교회 등록하기
          </Link>
        </div>
      </div>
    );
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

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 space-y-3">
          <input
            type="text" placeholder="대상 성도 이름 *"
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
            placeholder="심방 내용 *" rows={3} value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full px-4 py-3 bg-cream border border-light-gray rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green"
          />
          <input
            type="text" placeholder="기도 제목" value={formData.prayer_requests}
            onChange={(e) => setFormData({ ...formData, prayer_requests: e.target.value })}
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
          />
          <button
            onClick={handleSave}
            disabled={!formData.visitee_name || !formData.content}
            className="w-full py-2.5 bg-green text-white rounded-lg font-medium text-sm disabled:opacity-40"
          >
            저장
          </button>
        </div>
      )}

      {/* 기도 제목 모아보기 */}
      {visits.some((v) => v.prayer_requests) && (
        <div className="bg-gold/10 rounded-xl p-4 mb-4">
          <h3 className="font-bold text-gold text-sm mb-2">🙏 기도 제목</h3>
          {visits.filter((v) => v.prayer_requests).slice(0, 3).map((v) => (
            <p key={v.id} className="text-charcoal text-sm mb-1">
              <span className="font-medium">{v.visitee_name}</span>: {v.prayer_requests}
            </p>
          ))}
        </div>
      )}

      {visits.length === 0 ? (
        <div className="text-center pt-8 bg-white rounded-xl p-6">
          <p className="text-mid-gray text-sm">아직 심방 기록이 없습니다.</p>
        </div>
      ) : (
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
                <button
                  onClick={() => toggleFollowUp(v.id, v.follow_up_done)}
                  className={`text-xs font-medium ${v.follow_up_done ? "text-green" : "text-gold"}`}
                >
                  {v.follow_up_done ? "완료" : "진행중"}
                </button>
              </div>
              <p className="text-mid-gray text-xs">{v.visit_date}</p>
              <p className="text-sm text-charcoal mt-2">{v.content}</p>
              {v.prayer_requests && (
                <p className="text-sm text-gold mt-2">🙏 {v.prayer_requests}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
