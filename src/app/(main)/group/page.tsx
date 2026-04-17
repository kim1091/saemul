"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  church_id: string | null;
  member_count?: number;
}

export default function GroupPage() {
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [churchGroups, setChurchGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [message, setMessage] = useState("");
  const [churchName, setChurchName] = useState("");
  const [joining, setJoining] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // 내 프로필 (church_id 확인)
    const { data: profile } = await supabase
      .from("profiles")
      .select("church_id")
      .eq("id", user.id)
      .single();

    // 교회 이름
    if (profile?.church_id) {
      const { data: church } = await supabase
        .from("churches")
        .select("name")
        .eq("id", profile.church_id)
        .single();
      if (church) setChurchName(church.name);
    }

    // 내가 참여 중인 그룹 ID 목록
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);
    const myGroupIds = (memberships || []).map((m) => m.group_id);

    // 내가 참여 중인 그룹 상세
    const myList: Group[] = [];
    if (myGroupIds.length > 0) {
      const { data } = await supabase
        .from("groups")
        .select("id, name, description, invite_code, church_id")
        .in("id", myGroupIds);
      if (data) {
        for (const g of data) {
          const { count } = await supabase
            .from("group_members")
            .select("id", { count: "exact", head: true })
            .eq("group_id", g.id);
          myList.push({ ...g, member_count: count || 0 });
        }
      }
    }
    setMyGroups(myList);

    // 같은 교회의 다른 소그룹 (내가 아직 안 들어간 것)
    if (profile?.church_id) {
      const { data: allChurch } = await supabase
        .from("groups")
        .select("id, name, description, invite_code, church_id")
        .eq("church_id", profile.church_id);

      const churchList: Group[] = [];
      for (const g of (allChurch || [])) {
        if (myGroupIds.includes(g.id)) continue; // 이미 참여 중이면 제외
        const { count } = await supabase
          .from("group_members")
          .select("id", { count: "exact", head: true })
          .eq("group_id", g.id);
        churchList.push({ ...g, member_count: count || 0 });
      }
      setChurchGroups(churchList);
    }

    setLoading(false);
  }

  // 바로 참여 (초대코드 불필요)
  async function handleQuickJoin(groupId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setJoining(groupId);

    const { error } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: user.id,
      role: "member",
    });

    if (error?.code === "23505") {
      setMessage("이미 참여 중입니다.");
    } else if (error) {
      setMessage("참여에 실패했습니다: " + error.message);
    } else {
      router.push(`/group/${groupId}`);
      return;
    }
    setJoining(null);
  }

  // 소그룹 만들기
  async function handleCreate() {
    if (!newGroupName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("church_id")
      .eq("id", user.id)
      .single();

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const groupId = crypto.randomUUID();

    const { error: insertErr } = await supabase
      .from("groups")
      .insert({
        id: groupId,
        name: newGroupName,
        description: newGroupDesc || null,
        invite_code: code,
        leader_id: user.id,
        church_id: profile?.church_id || null,
      });

    if (insertErr) {
      console.error("Group create error:", insertErr);
      setMessage("생성 실패: " + insertErr.message);
      return;
    }

    const { error: memberErr } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: user.id,
      role: "leader",
    });

    if (memberErr) {
      console.error("Member insert error:", memberErr);
      setMessage("멤버 등록 실패: " + memberErr.message);
      return;
    }

    setNewGroupName("");
    setNewGroupDesc("");
    setShowCreate(false);
    router.push(`/group/${groupId}`);
  }

  // 검색 필터
  const filterFn = (g: Group) =>
    !search || g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.description || "").toLowerCase().includes(search.toLowerCase());

  const filteredMy = myGroups.filter(filterFn);
  const filteredChurch = churchGroups.filter(filterFn);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-mid-gray">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-24">
      {/* 헤더 + 검색 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-green-dark">소그룹</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-2 bg-green text-white text-sm font-medium rounded-lg"
        >
          + 만들기
        </button>
      </div>

      {/* 검색바 */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 소그룹 검색..."
          className="w-full px-4 py-2.5 bg-white border border-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green"
        />
      </div>

      {message && (
        <div className="bg-cream-dark rounded-xl p-3 mb-4">
          <p className="text-sm text-charcoal text-center">{message}</p>
        </div>
      )}

      {/* 만들기 폼 */}
      {showCreate && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 space-y-3">
          <h3 className="font-bold text-charcoal">새 소그룹 만들기</h3>
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="소그룹 이름 (예: 1구역, 청년부 셀)"
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
          />
          <input
            type="text"
            value={newGroupDesc}
            onChange={(e) => setNewGroupDesc(e.target.value)}
            placeholder="소그룹 설명 (선택)"
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
          />
          <button
            onClick={handleCreate}
            disabled={!newGroupName.trim()}
            className="w-full py-2.5 bg-green text-white rounded-lg font-medium text-sm disabled:opacity-40"
          >
            소그룹 만들기
          </button>
        </div>
      )}

      {/* 📌 내 소그룹 */}
      {filteredMy.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-mid-gray mb-3 flex items-center gap-1">
            📌 내 소그룹
          </h2>
          <div className="space-y-3">
            {filteredMy.map((g) => (
              <Link key={g.id} href={`/group/${g.id}`}>
                <div className="bg-white rounded-xl p-4 shadow-sm mb-2 active:bg-cream transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-green-dark">{g.name}</h3>
                      {g.description && (
                        <p className="text-mid-gray text-xs mt-0.5">{g.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-mid-gray bg-cream-dark px-2 py-1 rounded-full">
                      👥 {g.member_count}명
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 🏛️ 교회 소그룹 (미참여) */}
      {filteredChurch.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-mid-gray mb-3 flex items-center gap-1">
            🏛️ {churchName || "교회"} 소그룹
          </h2>
          <div className="space-y-3">
            {filteredChurch.map((g) => (
              <div key={g.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-green-dark">{g.name}</h3>
                    {g.description && (
                      <p className="text-mid-gray text-xs mt-0.5">{g.description}</p>
                    )}
                    <p className="text-xs text-mid-gray mt-1">👥 {g.member_count}명 참여 중</p>
                  </div>
                  <button
                    onClick={() => handleQuickJoin(g.id)}
                    disabled={joining === g.id}
                    className="px-4 py-2 bg-green text-white rounded-lg text-sm font-medium disabled:opacity-40"
                  >
                    {joining === g.id ? "..." : "참여"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {filteredMy.length === 0 && filteredChurch.length === 0 && !search && (
        <div className="text-center pt-8">
          <p className="text-4xl mb-3">👥</p>
          <h2 className="text-lg font-bold text-green-dark mb-2">아직 소그룹이 없습니다</h2>
          <p className="text-mid-gray text-sm">위의 &quot;+ 만들기&quot; 버튼으로 첫 소그룹을 만들어보세요!</p>
        </div>
      )}

      {/* 검색 결과 없음 */}
      {search && filteredMy.length === 0 && filteredChurch.length === 0 && (
        <div className="text-center pt-8">
          <p className="text-mid-gray text-sm">&quot;{search}&quot; 검색 결과가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
