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
}

export default function GroupPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [message, setMessage] = useState("");

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);

    if (memberships && memberships.length > 0) {
      const groupIds = memberships.map((m) => m.group_id);
      const { data } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds);
      setGroups(data || []);
    }
    setLoading(false);
  }

  async function handleJoin() {
    if (inviteCode.length < 4) return;
    setMessage("");

    const { data: group } = await supabase
      .from("groups")
      .select("id, name")
      .eq("invite_code", inviteCode.toUpperCase())
      .single();

    if (!group) {
      setMessage("유효하지 않은 초대코드입니다.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: user.id,
      role: "member",
    });

    if (error?.code === "23505") {
      setMessage("이미 참여 중인 소그룹입니다.");
    } else if (error) {
      setMessage("참여에 실패했습니다.");
    } else {
      setInviteCode("");
      setShowJoin(false);
      setMessage("");
      loadGroups();
    }
  }

  async function handleCreate() {
    if (!newGroupName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // UUID를 클라이언트에서 미리 생성 → SELECT 불필요 (RLS 차단 회피)
    const groupId = crypto.randomUUID();

    const { error: insertErr } = await supabase
      .from("groups")
      .insert({
        id: groupId,
        name: newGroupName,
        description: newGroupDesc || null,
        invite_code: code,
        leader_id: user.id,
      });

    if (insertErr) {
      console.error("Group create error:", insertErr);
      if (insertErr.code === "23505") {
        setMessage("초대코드 충돌, 다시 시도해주세요.");
      } else {
        setMessage("생성에 실패했습니다: " + (insertErr.message || ""));
      }
      return;
    }

    // 리더를 멤버로 등록
    await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: user.id,
      role: "leader",
    });

    setNewGroupName("");
    setNewGroupDesc("");
    setShowCreate(false);
    // 생성 후 바로 해당 소그룹으로 이동
    router.push(`/group/${groupId}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-mid-gray">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-green-dark">소그룹</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowJoin(!showJoin); setShowCreate(false); }}
            className="px-3 py-2 border border-green text-green text-sm font-medium rounded-lg"
          >
            참여
          </button>
          <button
            onClick={() => { setShowCreate(!showCreate); setShowJoin(false); }}
            className="px-3 py-2 bg-green text-white text-sm font-medium rounded-lg"
          >
            + 만들기
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-cream-dark rounded-xl p-3 mb-4">
          <p className="text-sm text-charcoal text-center">{message}</p>
        </div>
      )}

      {showJoin && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h3 className="font-bold text-charcoal mb-3">초대코드로 참여</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="초대코드 입력"
              maxLength={6}
              className="flex-1 px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-green"
            />
            <button
              onClick={handleJoin}
              disabled={inviteCode.length < 4}
              className="px-5 py-2.5 bg-green text-white rounded-lg text-sm font-medium disabled:opacity-40"
            >
              참여
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 space-y-3">
          <h3 className="font-bold text-charcoal">새 소그룹 만들기</h3>
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="소그룹 이름"
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

      {groups.length === 0 ? (
        <div className="text-center pt-12">
          <p className="text-4xl mb-3">👥</p>
          <h2 className="text-lg font-bold text-green-dark mb-2">아직 소그룹이 없습니다</h2>
          <p className="text-mid-gray text-sm">소그룹을 만들거나 초대코드로 참여하세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <Link key={g.id} href={`/group/${g.id}`}>
              <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-green-dark">{g.name}</h3>
                    {g.description && (
                      <p className="text-mid-gray text-sm mt-0.5">{g.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-mid-gray bg-cream-dark px-2 py-1 rounded-full">
                    코드: {g.invite_code}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
