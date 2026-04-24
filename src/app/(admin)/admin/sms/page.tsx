"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface Member {
  id: string;
  name: string;
  phone: string | null;
  department: string | null;
  relation: string | null;
}

interface SmsRecord {
  id: string;
  recipient_type: string;
  recipient_filter: string | null;
  recipient_count: number;
  message: string;
  msg_type: string;
  status: string;
  created_at: string;
}

const DEPARTMENTS = ["전체", "장년부", "청년부", "고등부", "중등부", "아동부"];

export default function SmsPage() {
  const supabase = createClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [history, setHistory] = useState<SmsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // 발송 폼
  const [targetType, setTargetType] = useState<"all" | "department" | "individual">("all");
  const [targetDept, setTargetDept] = useState("장년부");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"compose" | "history">("compose");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles").select("church_id").eq("id", user.id).single();
    if (!profile?.church_id) { setLoading(false); return; }

    const [membersRes, historyRes] = await Promise.all([
      supabase.from("church_members")
        .select("id, name, phone, department, relation")
        .eq("church_id", profile.church_id)
        .eq("is_active", true)
        .not("phone", "is", null)
        .order("name"),
      supabase.from("sms_messages")
        .select("id, recipient_type, recipient_filter, recipient_count, message, msg_type, status, created_at")
        .eq("church_id", profile.church_id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setMembers(membersRes.data || []);
    setHistory(historyRes.data || []);
    setLoading(false);
  }

  function getRecipients(): { name: string; phone: string }[] {
    let targets = members;
    if (targetType === "department") {
      targets = members.filter((m) => m.department === targetDept);
    } else if (targetType === "individual") {
      targets = members.filter((m) => selectedIds.has(m.id));
    }
    return targets
      .filter((m) => m.phone)
      .map((m) => ({ name: m.name, phone: m.phone! }));
  }

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const byteLength = Buffer.from(message).length;
  const msgType = byteLength <= 90 ? "SMS" : "LMS";
  const recipientList = getRecipients();

  async function handleSend() {
    if (!message.trim() || recipientList.length === 0) return;
    if (!confirm(`${recipientList.length}명에게 ${msgType} 발송하시겠습니까?\n\n"${message.slice(0, 50)}..."`)) return;

    setSending(true);
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: recipientList,
          message,
          recipientType: targetType,
          recipientFilter: targetType === "department" ? targetDept : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`${data.sent}명에게 ${data.msgType} 발송 완료!`);
        setMessage("");
        loadData();
        setTab("history");
      } else {
        alert("발송 실패: " + (data.error || "알 수 없는 오류"));
      }
    } catch {
      alert("네트워크 오류");
    }
    setSending(false);
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-mid-gray">불러오는 중...</p></div>;

  return (
    <div className="px-5 pt-6 pb-8">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-mid-gray">← 관리</Link>
        <h1 className="text-xl font-bold text-green-dark">문자 발송</h1>
        <p className="text-mid-gray text-xs mt-0.5">전화번호 등록된 성도: {members.length}명</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab("compose")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "compose" ? "bg-green text-white" : "bg-cream text-charcoal"}`}>
          작성
        </button>
        <button onClick={() => setTab("history")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "history" ? "bg-green text-white" : "bg-cream text-charcoal"}`}>
          발송 내역 ({history.length})
        </button>
      </div>

      {tab === "compose" && (
        <>
          {/* 수신자 선택 */}
          <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
            <h3 className="font-bold text-charcoal text-sm mb-3">수신자</h3>
            <div className="flex gap-2 mb-3">
              {([
                { key: "all" as const, label: "전체" },
                { key: "department" as const, label: "부서별" },
                { key: "individual" as const, label: "개별 선택" },
              ]).map((t) => (
                <button key={t.key} onClick={() => setTargetType(t.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    targetType === t.key ? "bg-green text-white border-green" : "bg-white text-charcoal border-light-gray"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {targetType === "department" && (
              <div className="flex flex-wrap gap-2 mb-3">
                {DEPARTMENTS.filter(d => d !== "전체").map((d) => (
                  <button key={d} onClick={() => setTargetDept(d)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                      targetDept === d ? "bg-gold text-charcoal border-gold" : "bg-white text-charcoal border-light-gray"
                    }`}>
                    {d} ({members.filter(m => m.department === d).length})
                  </button>
                ))}
              </div>
            )}

            {targetType === "individual" && (
              <div className="max-h-48 overflow-y-auto space-y-1 border border-light-gray rounded-lg p-2">
                {members.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-cream rounded-lg cursor-pointer">
                    <input type="checkbox" checked={selectedIds.has(m.id)}
                      onChange={() => toggleMember(m.id)}
                      className="accent-green" />
                    <span className="text-sm text-charcoal">{m.name}</span>
                    {m.department && <span className="text-[10px] text-mid-gray">{m.department}</span>}
                    <span className="text-[10px] text-mid-gray ml-auto">{m.phone}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-3 bg-cream rounded-lg px-3 py-2">
              <p className="text-xs text-charcoal">
                수신 대상: <span className="font-bold text-green">{recipientList.length}명</span>
              </p>
            </div>
          </div>

          {/* 메시지 작성 */}
          <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-charcoal text-sm">메시지</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                msgType === "SMS" ? "bg-green/20 text-green" : "bg-gold/20 text-gold"
              }`}>
                {msgType} ({byteLength}byte)
              </span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="문자 내용을 입력하세요..."
              rows={5}
              className="w-full px-4 py-3 bg-cream border border-light-gray rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green"
            />
            <p className="text-[10px] text-mid-gray mt-1">
              SMS: 90byte(한글 약 45자) 이하 · LMS: 2,000byte(한글 약 1,000자) 이하
            </p>
          </div>

          {/* 발송 버튼 */}
          <button
            onClick={handleSend}
            disabled={sending || !message.trim() || recipientList.length === 0}
            className="w-full py-3 bg-green-dark text-white rounded-xl text-sm font-bold disabled:opacity-40"
          >
            {sending ? "발송 중..." : `${recipientList.length}명에게 ${msgType} 발송`}
          </button>

          <p className="text-[10px] text-mid-gray text-center mt-2">
            SMS 약 20원/건 · LMS 약 50원/건 (Solapi 요금 기준)
          </p>
        </>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-xl">
              <p className="text-mid-gray text-sm">발송 내역이 없습니다.</p>
            </div>
          ) : (
            history.map((h) => {
              const statusMap: Record<string, { label: string; color: string }> = {
                sent: { label: "발송", color: "bg-green/20 text-green" },
                failed: { label: "실패", color: "bg-red-100 text-red-600" },
                partial: { label: "일부실패", color: "bg-yellow-100 text-yellow-700" },
              };
              const s = statusMap[h.status] || { label: h.status, color: "bg-gray-100 text-gray-600" };
              const targetLabel = h.recipient_type === "all" ? "전체" :
                h.recipient_type === "department" ? h.recipient_filter || "부서" : "개별";
              return (
                <div key={h.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-cream text-charcoal rounded-full">{targetLabel}</span>
                      <span className="text-xs text-mid-gray">{h.recipient_count}명</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-cream text-mid-gray rounded-full">{h.msg_type}</span>
                    </div>
                  </div>
                  <p className="text-sm text-charcoal line-clamp-2">{h.message}</p>
                  <p className="text-[10px] text-mid-gray mt-2">
                    {new Date(h.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
