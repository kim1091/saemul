"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface SearchResult {
  id: string;
  name: string;
  address: string | null;
}

interface MyRequest {
  id: string;
  status: string;
  church_id: string;
  church_name?: string;
  created_at: string;
}

export default function JoinChurchPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"search" | "code">("search");

  // 검색 탭
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);

  // 코드 탭
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [currentChurch, setCurrentChurch] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    checkCurrent();
    loadMyRequests();
  }, []);

  async function checkCurrent() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("church_name")
      .eq("id", user.id)
      .single();
    if (data?.church_name) setCurrentChurch(data.church_name);
  }

  async function loadMyRequests() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("join_requests")
      .select("id, status, church_id, created_at, churches(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setMyRequests(
      (data || []).map((r) => ({
        ...r,
        church_name: (r as { churches?: { name?: string } }).churches?.name,
      })) as MyRequest[]
    );
  }

  async function handleSearch() {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from("churches")
      .select("id, name, address")
      .ilike("name", `%${query.trim()}%`)
      .limit(20);
    setResults(data || []);
    setSearching(false);
  }

  async function requestJoin(churchId: string, churchName: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("로그인이 필요합니다."); return; }

    const { error } = await supabase.from("join_requests").insert({
      church_id: churchId,
      user_id: user.id,
      status: "pending",
    });

    if (error?.code === "23505") {
      setMessage("이미 해당 교회에 가입 요청을 보냈습니다.");
    } else if (error) {
      setMessage("요청 실패: " + error.message);
    } else {
      setMessage(`"${churchName}"에 가입 요청을 보냈습니다. 목사님 승인을 기다려주세요.`);
      loadMyRequests();
    }
  }

  async function handleCodeJoin() {
    if (code.length < 4) return;
    setLoading(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: church, error } = await supabase
      .from("churches")
      .select("id, name")
      .eq("invite_code", code.toUpperCase())
      .single();

    if (error || !church) {
      setMessage("유효하지 않은 교회 코드입니다.");
      setLoading(false);
      return;
    }

    await supabase
      .from("profiles")
      .update({ church_id: church.id, church_name: church.name })
      .eq("id", user.id);

    setMessage(`"${church.name}"에 가입되었습니다!`);
    setTimeout(() => router.push("/profile"), 1500);
  }

  const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    pending: { label: "승인 대기", color: "bg-gold/20 text-gold" },
    approved: { label: "승인됨", color: "bg-green/20 text-green" },
    rejected: { label: "거절됨", color: "bg-red-100 text-red-600" },
  };

  return (
    <div className="px-5 pt-6">
      <h1 className="text-xl font-bold text-green-dark mb-6">교회 찾기</h1>

      {currentChurch && (
        <div className="bg-green-dark/5 rounded-xl p-4 mb-4">
          <p className="text-sm text-mid-gray">현재 소속 교회</p>
          <p className="font-bold text-green-dark">{currentChurch}</p>
        </div>
      )}

      {/* 내 요청 현황 */}
      {myRequests.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h3 className="font-bold text-charcoal text-sm mb-2">내 가입 요청</h3>
          {myRequests.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0 border-light-gray/50">
              <span className="text-sm text-charcoal">{r.church_name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABEL[r.status]?.color}`}>
                {STATUS_LABEL[r.status]?.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 탭 */}
      <div className="flex bg-white rounded-xl p-1 mb-4 shadow-sm">
        <button
          onClick={() => setTab("search")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            tab === "search" ? "bg-green text-white" : "text-mid-gray"
          }`}
        >
          🔍 이름으로 검색
        </button>
        <button
          onClick={() => setTab("code")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            tab === "code" ? "bg-green text-white" : "text-mid-gray"
          }`}
        >
          🔑 초대 코드
        </button>
      </div>

      {tab === "search" && (
        <div>
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <p className="text-mid-gray text-sm mb-3">
              교회 이름을 검색한 후, 가입 요청을 보내면 목사님이 승인합니다.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="교회 이름 검색 (2자 이상)"
                className="flex-1 px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
              />
              <button
                onClick={handleSearch}
                disabled={query.trim().length < 2 || searching}
                className="px-4 py-2.5 bg-green text-white rounded-lg text-sm font-medium disabled:opacity-40"
              >
                {searching ? "..." : "검색"}
              </button>
            </div>
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((c) => (
                <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="font-bold text-charcoal">{c.name}</p>
                    {c.address && <p className="text-xs text-mid-gray mt-0.5">{c.address}</p>}
                  </div>
                  <button
                    onClick={() => requestJoin(c.id, c.name)}
                    className="px-3 py-1.5 bg-green text-white text-xs font-medium rounded-lg"
                  >
                    가입 요청
                  </button>
                </div>
              ))}
            </div>
          )}

          {query.trim().length >= 2 && !searching && results.length === 0 && (
            <div className="bg-white rounded-xl p-6 text-center">
              <p className="text-mid-gray text-sm">검색 결과가 없습니다.</p>
              <p className="text-xs text-mid-gray mt-1">목사님에게 초대 코드를 받아 가입해주세요.</p>
            </div>
          )}
        </div>
      )}

      {tab === "code" && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <p className="text-mid-gray text-sm mb-4">
            목사님에게 받은 6자리 교회 코드를 입력하세요.
            <span className="block text-xs text-green mt-1">※ 코드 입력은 즉시 가입됩니다 (승인 불필요)</span>
          </p>

          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="6자리 교회 코드"
            maxLength={6}
            className="w-full px-4 py-3 bg-cream border border-light-gray rounded-lg text-center tracking-widest font-mono text-lg focus:outline-none focus:ring-2 focus:ring-green"
          />

          <button
            onClick={handleCodeJoin}
            disabled={loading || code.length < 4}
            className="w-full mt-4 py-3 bg-green text-white font-bold rounded-lg disabled:opacity-50"
          >
            {loading ? "확인 중..." : "교회 가입"}
          </button>
        </div>
      )}

      {message && (
        <p
          className={`text-sm text-center mt-3 p-3 rounded-lg ${
            message.includes("가입되었") || message.includes("요청을 보냈")
              ? "bg-green/10 text-green-dark"
              : "bg-gold/10 text-gold"
          }`}
        >
          {message}
        </p>
      )}

      <div className="mt-6 text-center">
        <Link href="/profile" className="text-mid-gray text-sm">← 프로필로</Link>
      </div>
    </div>
  );
}
