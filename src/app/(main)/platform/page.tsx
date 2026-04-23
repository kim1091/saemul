"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

interface UserRow {
  id: string;
  name: string | null;
  role: string;
  subscription_tier: string | null;
  is_admin: boolean;
  church_name: string | null;
  created_at: string;
  onboarded: boolean;
}

interface ChurchRow {
  id: string;
  name: string;
  address: string | null;
  pastor_id: string;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  totalChurches: number;
  totalSermons: number;
  totalAsks: number;
  tierCounts: Record<string, number>;
  roleCounts: Record<string, number>;
  users: UserRow[];
  churches: ChurchRow[];
}

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: "Free", color: "bg-gray-200 text-gray-700" },
  premium: { label: "Premium", color: "bg-yellow-100 text-yellow-800" },
  premium_plus: { label: "Premium+", color: "bg-yellow-200 text-yellow-900" },
  pastor: { label: "Pastor", color: "bg-green-100 text-green-800" },
  church: { label: "Church", color: "bg-green-200 text-green-900" },
};

export default function PlatformPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "users" | "churches">("overview");

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/stats");
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "접근 권한이 없습니다.");
        setLoading(false);
        return;
      }
      setStats(await res.json());
    } catch {
      setError("데이터를 불러올 수 없습니다.");
    }
    setLoading(false);
  }

  async function updateUser(userId: string, field: "subscription_tier" | "role", value: string) {
    setUpdating(userId);
    try {
      const res = await fetch("/api/platform/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, [field]: value }),
      });
      if (res.ok) {
        await loadStats();
      } else {
        const d = await res.json();
        alert(d.error || "업데이트 실패");
      }
    } catch {
      alert("네트워크 오류");
    }
    setUpdating(null);
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-mid-gray">불러오는 중...</p></div>;
  if (error) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-red-500">{error}</p></div>;
  if (!stats) return null;

  const filteredUsers = search
    ? stats.users.filter(u => (u.name || "").includes(search) || (u.church_name || "").includes(search))
    : stats.users;

  return (
    <div className="px-5 pt-6 pb-8">
      <h1 className="text-xl font-bold text-green-dark mb-1">플랫폼 관리</h1>
      <p className="text-xs text-mid-gray mb-5">샘물 전체 관리자 대시보드</p>

      {/* 탭 */}
      <div className="flex gap-2 mb-5">
        {([
          { key: "overview" as const, label: "통계" },
          { key: "users" as const, label: `사용자 (${stats.totalUsers})` },
          { key: "churches" as const, label: `교회 (${stats.totalChurches})` },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? "bg-green text-white" : "bg-cream text-charcoal"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ━━ 통계 탭 ━━ */}
      {tab === "overview" && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: "전체 사용자", value: stats.totalUsers, icon: "👤", color: "text-green" },
              { label: "교회", value: stats.totalChurches, icon: "⛪", color: "text-gold" },
              { label: "설교 생성", value: stats.totalSermons, icon: "✍️", color: "text-green-dark" },
              { label: "AI 질문", value: stats.totalAsks, icon: "💬", color: "text-blue-500" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-2xl mb-1">{s.icon}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-mid-gray">{s.label}</p>
              </div>
            ))}
          </div>

          {/* 구독 분포 */}
          <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
            <h3 className="font-bold text-charcoal mb-3">구독 분포</h3>
            <div className="space-y-2">
              {Object.entries(stats.tierCounts).sort((a, b) => b[1] - a[1]).map(([tier, count]) => {
                const t = TIER_LABELS[tier] || { label: tier, color: "bg-gray-100 text-gray-600" };
                const pct = Math.round((count / stats.totalUsers) * 100);
                return (
                  <div key={tier} className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.color}`}>{t.label}</span>
                    <div className="flex-1 bg-light-gray rounded-full h-2">
                      <div className="bg-green h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-bold text-charcoal">{count}명</span>
                    <span className="text-xs text-mid-gray">({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 역할 분포 */}
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-charcoal mb-3">역할 분포</h3>
            <div className="flex gap-4">
              {Object.entries(stats.roleCounts).map(([role, count]) => (
                <div key={role} className="text-center">
                  <p className="text-2xl font-bold text-green-dark">{count}</p>
                  <p className="text-xs text-mid-gray">{role === "pastor" ? "목회자" : role === "admin" ? "관리자" : "성도"}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ━━ 사용자 탭 ━━ */}
      {tab === "users" && (
        <>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 또는 교회명 검색..."
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-green" />

          <div className="space-y-2">
            {filteredUsers.map(u => {
              const tier = u.subscription_tier || "free";
              const t = TIER_LABELS[tier] || { label: tier, color: "bg-gray-100" };
              return (
                <div key={u.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-charcoal text-sm">
                        {u.name || "이름없음"}
                        {u.is_admin && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">ADMIN</span>}
                      </p>
                      <p className="text-xs text-mid-gray">{u.church_name || "교회 미등록"} · {u.role === "pastor" ? "목회자" : "성도"}</p>
                      <p className="text-[10px] text-mid-gray mt-0.5">가입: {new Date(u.created_at).toLocaleDateString("ko-KR")}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.color}`}>{t.label}</span>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <select value={tier}
                      onChange={(e) => updateUser(u.id, "subscription_tier", e.target.value)}
                      disabled={updating === u.id}
                      className="flex-1 px-2 py-1.5 bg-cream border border-light-gray rounded-lg text-xs">
                      <option value="free">Free</option>
                      <option value="premium">Premium ₩4,900</option>
                      <option value="premium_plus">Premium+ ₩9,900</option>
                      <option value="pastor">Pastor ₩19,900</option>
                      <option value="church">Church ₩99,000</option>
                    </select>
                    <select value={u.role}
                      onChange={(e) => updateUser(u.id, "role", e.target.value)}
                      disabled={updating === u.id}
                      className="px-2 py-1.5 bg-cream border border-light-gray rounded-lg text-xs">
                      <option value="member">성도</option>
                      <option value="pastor">목회자</option>
                      <option value="admin">관리자</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredUsers.length === 0 && (
            <p className="text-center text-mid-gray text-sm py-8">검색 결과가 없습니다.</p>
          )}
        </>
      )}

      {/* ━━ 교회 탭 ━━ */}
      {tab === "churches" && (
        <div className="space-y-2">
          {stats.churches.map(c => (
            <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm">
              <p className="font-bold text-charcoal text-sm">{c.name}</p>
              {c.address && <p className="text-xs text-mid-gray mt-0.5">{c.address}</p>}
              <p className="text-[10px] text-mid-gray mt-1">등록: {new Date(c.created_at).toLocaleDateString("ko-KR")}</p>
            </div>
          ))}
          {stats.churches.length === 0 && (
            <p className="text-center text-mid-gray text-sm py-8">등록된 교회가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
