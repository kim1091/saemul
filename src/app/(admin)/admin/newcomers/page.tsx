"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const STAGES = [
  { value: "first_visit", label: "첫방문", color: "bg-gold/20 text-gold" },
  { value: "newcomer_class", label: "새가족반", color: "bg-blue-100 text-blue-600" },
  { value: "settling", label: "정착", color: "bg-green/10 text-green" },
  { value: "assigned", label: "구역배정", color: "bg-green text-white" },
];

interface Newcomer {
  id: string;
  name: string;
  phone: string | null;
  first_visit_date: string;
  referrer: string | null;
  stage: string;
}

export default function NewcomersPage() {
  const [newcomers, setNewcomers] = useState<Newcomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "", phone: "", referrer: "",
    first_visit_date: new Date().toISOString().split("T")[0],
  });

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles").select("church_id").eq("id", user.id).single();

    if (!profile?.church_id) { setLoading(false); return; }
    setChurchId(profile.church_id);

    const { data } = await supabase
      .from("newcomers")
      .select("*")
      .eq("church_id", profile.church_id)
      .order("first_visit_date", { ascending: false });

    setNewcomers(data || []);
    setLoading(false);
  }

  async function handleSave() {
    if (!formData.name || !churchId) return;

    const { error } = await supabase.from("newcomers").insert({
      church_id: churchId,
      name: formData.name,
      phone: formData.phone || null,
      referrer: formData.referrer || null,
      first_visit_date: formData.first_visit_date,
    });

    if (error) { alert("등록 실패: " + error.message); return; }
    setFormData({ name: "", phone: "", referrer: "", first_visit_date: new Date().toISOString().split("T")[0] });
    setShowForm(false);
    loadData();
  }

  async function updateStage(id: string, stage: string) {
    await supabase.from("newcomers").update({ stage }).eq("id", id);
    loadData();
  }

  const [editingNC, setEditingNC] = useState<string | null>(null);
  const [editNC, setEditNC] = useState({ name: "", phone: "", referrer: "", first_visit_date: "" });

  async function handleUpdateNC() {
    if (!editingNC) return;
    await supabase.from("newcomers").update({
      name: editNC.name, phone: editNC.phone || null,
      referrer: editNC.referrer || null, first_visit_date: editNC.first_visit_date,
    }).eq("id", editingNC);
    setEditingNC(null);
    loadData();
  }

  async function handleDeleteNC(id: string) {
    if (!confirm("이 새신자 기록을 삭제할까요?")) return;
    await supabase.from("newcomers").delete().eq("id", id);
    loadData();
  }

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

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 space-y-3">
          <input type="text" placeholder="이름 *" value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
          <input type="tel" placeholder="전화번호" value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
          <input type="text" placeholder="소개자" value={formData.referrer}
            onChange={(e) => setFormData({ ...formData, referrer: e.target.value })}
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
          <input type="date" value={formData.first_visit_date}
            onChange={(e) => setFormData({ ...formData, first_visit_date: e.target.value })}
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green" />
          <button onClick={handleSave} disabled={!formData.name} className="w-full py-2.5 bg-green text-white rounded-lg font-medium text-sm disabled:opacity-40">
            등록
          </button>
        </div>
      )}

      {newcomers.length === 0 ? (
        <div className="text-center pt-8 bg-white rounded-xl p-6">
          <p className="text-mid-gray text-sm">아직 새신자가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {newcomers.map((n) => {
            const stage = STAGES.find((s) => s.value === n.stage);
            const currentIdx = STAGES.findIndex((st) => st.value === n.stage);
            return (
              <div key={n.id} className="bg-white rounded-xl p-4 shadow-sm">
                {editingNC === n.id ? (
                  <div className="space-y-2">
                    <input type="text" value={editNC.name} onChange={(e) => setEditNC({ ...editNC, name: e.target.value })}
                      placeholder="이름" className="w-full px-3 py-2 bg-cream border border-light-gray rounded-lg text-sm" />
                    <div className="flex gap-2">
                      <input type="tel" value={editNC.phone} onChange={(e) => setEditNC({ ...editNC, phone: e.target.value })}
                        placeholder="전화번호" className="flex-1 px-3 py-2 bg-cream border border-light-gray rounded-lg text-sm" />
                      <input type="date" value={editNC.first_visit_date} onChange={(e) => setEditNC({ ...editNC, first_visit_date: e.target.value })}
                        className="px-3 py-2 bg-cream border border-light-gray rounded-lg text-sm" />
                    </div>
                    <input type="text" value={editNC.referrer} onChange={(e) => setEditNC({ ...editNC, referrer: e.target.value })}
                      placeholder="소개자" className="w-full px-3 py-2 bg-cream border border-light-gray rounded-lg text-sm" />
                    <div className="flex gap-2">
                      <button onClick={handleUpdateNC} className="flex-1 py-1.5 bg-green text-white rounded-lg text-xs">저장</button>
                      <button onClick={() => setEditingNC(null)} className="flex-1 py-1.5 bg-white border border-light-gray rounded-lg text-xs">취소</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-green-dark text-white flex items-center justify-center text-sm font-bold">
                          {n.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-charcoal text-sm">{n.name}</p>
                          <p className="text-xs text-mid-gray">{n.phone || "전화번호 없음"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={n.stage} onChange={(e) => updateStage(n.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full font-medium ${stage?.color} border-0 focus:outline-none`}>
                          {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <button onClick={() => { setEditingNC(n.id); setEditNC({ name: n.name, phone: n.phone || "", referrer: n.referrer || "", first_visit_date: n.first_visit_date }); }}
                          className="text-[10px] text-green">수정</button>
                        <button onClick={() => handleDeleteNC(n.id)} className="text-[10px] text-mid-gray hover:text-red-500">삭제</button>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-mid-gray">
                      <span>첫방문: {n.first_visit_date}</span>
                      {n.referrer && <span>소개: {n.referrer}</span>}
                    </div>
                    <div className="flex gap-1 mt-3">
                      {STAGES.map((s, i) => (
                        <div key={s.value} className={`flex-1 h-1.5 rounded-full ${i <= currentIdx ? "bg-green" : "bg-light-gray"}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
