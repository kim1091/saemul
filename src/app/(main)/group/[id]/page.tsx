"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface Sharing {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name?: string;
}

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.id as string;
  const supabase = createClient();

  const [group, setGroup] = useState<{ name: string; invite_code: string } | null>(null);
  const [sharings, setSharings] = useState<Sharing[]>([]);
  const [newSharing, setNewSharing] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [groupId]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    // 그룹 정보
    const { data: g } = await supabase
      .from("groups")
      .select("name, invite_code")
      .eq("id", groupId)
      .single();
    setGroup(g);

    // 나눔 목록
    await loadSharings();
    setLoading(false);
  }

  async function loadSharings() {
    const { data } = await supabase
      .from("group_sharings")
      .select("id, content, created_at, user_id")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(50);

    const list = data || [];
    // 작성자 이름 조회
    const userIds = Array.from(new Set(list.map((s) => s.user_id)));
    const nameMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);
      (profs || []).forEach((p: { id: string; name?: string; email?: string }) => {
        nameMap[p.id] = p.name || p.email?.split("@")[0] || "멤버";
      });
    }

    setSharings(list.map((s) => ({ ...s, user_name: nameMap[s.user_id] })));
  }

  async function handlePost() {
    if (!newSharing.trim() || !userId) return;
    setPosting(true);

    const { error } = await supabase.from("group_sharings").insert({
      group_id: groupId,
      user_id: userId,
      content: newSharing.trim(),
    });

    if (!error) {
      setNewSharing("");
      loadSharings();
    }
    setPosting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-mid-gray">불러오는 중...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center">
          <p className="text-4xl mb-3">❌</p>
          <h2 className="text-lg font-bold text-green-dark mb-2">소그룹을 찾을 수 없습니다</h2>
          <Link href="/group" className="text-green font-medium text-sm">목록으로 →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-light-gray bg-cream">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-green-dark">{group.name}</h1>
            <p className="text-xs text-mid-gray">초대코드: {group.invite_code}</p>
          </div>
          <Link href="/group" className="text-sm text-mid-gray">← 목록</Link>
        </div>
      </div>

      {/* 나눔 피드 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {sharings.length === 0 ? (
          <div className="text-center pt-8">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-mid-gray text-sm">아직 나눔이 없습니다. 첫 묵상을 나눠보세요!</p>
          </div>
        ) : (
          sharings.map((s) => {
            const displayName = s.user_id === userId ? "나" : (s.user_name || "멤버");
            const initial = (s.user_name || (s.user_id === userId ? "나" : "?"))[0];
            return (
            <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-green text-white flex items-center justify-center text-xs font-bold">
                  {initial}
                </div>
                <div>
                  <p className="font-bold text-charcoal text-sm">
                    {displayName}
                  </p>
                  <p className="text-xs text-mid-gray">
                    {new Date(s.created_at).toLocaleString("ko-KR", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <p className="text-charcoal text-sm leading-6 whitespace-pre-line">{s.content}</p>
            </div>
            );
          })
        )}
      </div>

      {/* 나눔 입력 */}
      <div className="px-5 py-3 border-t border-light-gray bg-white">
        <div className="flex gap-2">
          <textarea
            value={newSharing}
            onChange={(e) => setNewSharing(e.target.value)}
            placeholder="오늘의 묵상을 나눠주세요..."
            rows={2}
            className="flex-1 px-4 py-2 bg-cream border border-light-gray rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green"
          />
          <button
            onClick={handlePost}
            disabled={!newSharing.trim() || posting}
            className="self-end px-4 py-2 bg-green text-white rounded-xl text-sm font-medium disabled:opacity-40"
          >
            {posting ? "..." : "나눔"}
          </button>
        </div>
      </div>
    </div>
  );
}
