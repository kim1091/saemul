"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";

// ─── 타입 ───────────────────────────────────────────────
type ReactionType = "amen" | "pray" | "love";

interface ReactionCounts {
  amen: number;
  pray: number;
  love: number;
  myReactions: Set<string>;
  [key: string]: number | Set<string>;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name?: string;
}

interface Sharing {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name?: string;
  reactions: ReactionCounts;
  commentCount: number;
}

const REACTION_EMOJI: Record<string, string> = {
  amen: "🙏",
  pray: "✝️",
  love: "❤️",
};

const REACTION_LABEL: Record<string, string> = {
  amen: "아멘",
  pray: "기도",
  love: "사랑",
};

// ─── 메인 컴포넌트 ─────────────────────────────────────
export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.id as string;
  const supabase = createClient();
  const feedRef = useRef<HTMLDivElement>(null);

  const [group, setGroup] = useState<{ name: string; invite_code: string; leader_id: string } | null>(null);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [sharings, setSharings] = useState<Sharing[]>([]);
  const [newSharing, setNewSharing] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // 댓글 관련
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [postingComment, setPostingComment] = useState<string | null>(null);

  // 이름 캐시
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  // QR/공유/참여
  const [showQR, setShowQR] = useState(false);
  const [isMember, setIsMember] = useState(true);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  // ─── 초기 로딩 ───────────────────────────────────────
  useEffect(() => {
    loadData();
  }, [groupId]);

  // ─── Realtime 구독 ──────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_sharings", filter: `group_id=eq.${groupId}` },
        (payload) => {
          const s = payload.new as { id: string; content: string; created_at: string; user_id: string };
          const newItem: Sharing = {
            ...s,
            user_name: nameMap[s.user_id] || "멤버",
            reactions: { amen: 0, pray: 0, love: 0, myReactions: new Set() },
            commentCount: 0,
          };
          setSharings((prev) => [newItem, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "group_sharings" },
        (payload) => {
          const oldId = (payload.old as { id: string }).id;
          setSharings((prev) => prev.filter((s) => s.id !== oldId));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sharing_reactions" },
        (payload) => {
          const r = payload.new as { sharing_id: string; reaction_type: string; user_id: string };
          setSharings((prev) =>
            prev.map((s) => {
              if (s.id !== r.sharing_id) return s;
              const updated = { ...s, reactions: { ...s.reactions } };
              updated.reactions[r.reaction_type as keyof typeof REACTION_EMOJI] =
                (updated.reactions[r.reaction_type as keyof typeof REACTION_EMOJI] as number) + 1;
              if (r.user_id === userId) {
                updated.reactions.myReactions = new Set(s.reactions.myReactions);
                updated.reactions.myReactions.add(r.reaction_type);
              }
              return updated;
            })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "sharing_reactions" },
        (payload) => {
          const r = payload.old as { sharing_id: string; reaction_type: string; user_id: string };
          setSharings((prev) =>
            prev.map((s) => {
              if (s.id !== r.sharing_id) return s;
              const updated = { ...s, reactions: { ...s.reactions } };
              updated.reactions[r.reaction_type as keyof typeof REACTION_EMOJI] = Math.max(
                0,
                (updated.reactions[r.reaction_type as keyof typeof REACTION_EMOJI] as number) - 1
              );
              if (r.user_id === userId) {
                updated.reactions.myReactions = new Set(s.reactions.myReactions);
                updated.reactions.myReactions.delete(r.reaction_type);
              }
              return updated;
            })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sharing_comments" },
        (payload) => {
          const c = payload.new as { id: string; sharing_id: string; content: string; created_at: string; user_id: string };
          // 댓글 수 증가
          setSharings((prev) =>
            prev.map((s) => (s.id === c.sharing_id ? { ...s, commentCount: s.commentCount + 1 } : s))
          );
          // 이미 열려있는 댓글 목록에 추가
          setCommentsMap((prev) => {
            if (!prev[c.sharing_id]) return prev;
            return {
              ...prev,
              [c.sharing_id]: [
                ...prev[c.sharing_id],
                { ...c, user_name: nameMap[c.user_id] || "멤버" },
              ],
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, userId, nameMap]);

  // ─── 데이터 로딩 ─────────────────────────────────────
  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const { data: g } = await supabase
      .from("groups")
      .select("name, invite_code, leader_id")
      .eq("id", groupId)
      .single();
    setGroup(g);

    // 멤버 목록
    const { data: memberData } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);
    const memberIds = (memberData || []).map((m) => m.user_id);
    setIsMember(user ? memberIds.includes(user.id) : false);

    // 이름 캐시 구축
    const nMap: Record<string, string> = {};
    if (memberIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", memberIds);
      (profs || []).forEach((p: { id: string; name?: string; email?: string }) => {
        nMap[p.id] = p.name || p.email?.split("@")[0] || "멤버";
      });
    }
    setNameMap(nMap);
    setMembers(memberIds.map((id) => ({ id, name: nMap[id] || "멤버" })));

    await loadSharings(user?.id || null, nMap);
    setLoading(false);
  }

  async function loadSharings(currentUserId: string | null, nMap: Record<string, string>) {
    const { data } = await supabase
      .from("group_sharings")
      .select("id, content, created_at, user_id")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(50);

    const list = data || [];
    const sharingIds = list.map((s) => s.id);

    // 반응 일괄 로딩
    let reactionMap: Record<string, ReactionCounts> = {};
    if (sharingIds.length > 0) {
      const { data: reactions } = await supabase
        .from("sharing_reactions")
        .select("sharing_id, reaction_type, user_id")
        .in("sharing_id", sharingIds);

      (reactions || []).forEach((r) => {
        if (!reactionMap[r.sharing_id]) {
          reactionMap[r.sharing_id] = { amen: 0, pray: 0, love: 0, myReactions: new Set() };
        }
        const key = r.reaction_type as keyof typeof REACTION_EMOJI;
        (reactionMap[r.sharing_id][key] as number)++;
        if (r.user_id === currentUserId) {
          reactionMap[r.sharing_id].myReactions.add(r.reaction_type);
        }
      });
    }

    // 댓글 수 일괄 로딩
    let commentCountMap: Record<string, number> = {};
    if (sharingIds.length > 0) {
      const { data: comments } = await supabase
        .from("sharing_comments")
        .select("sharing_id")
        .in("sharing_id", sharingIds);
      (comments || []).forEach((c) => {
        commentCountMap[c.sharing_id] = (commentCountMap[c.sharing_id] || 0) + 1;
      });
    }

    setSharings(
      list.map((s) => ({
        ...s,
        user_name: nMap[s.user_id] || "멤버",
        reactions: reactionMap[s.id] || { amen: 0, pray: 0, love: 0, myReactions: new Set() },
        commentCount: commentCountMap[s.id] || 0,
      }))
    );
  }

  // ─── 나눔 작성 ───────────────────────────────────────
  async function handlePost() {
    if (!newSharing.trim() || !userId) return;
    setPosting(true);

    const { error } = await supabase.from("group_sharings").insert({
      group_id: groupId,
      user_id: userId,
      content: newSharing.trim(),
    });

    if (!error) setNewSharing("");
    setPosting(false);
    // Realtime이 자동 반영하므로 수동 reload 불필요
  }

  // ─── 나눔 삭제 (본인만) ──────────────────────────────
  async function handleDeleteSharing(sharingId: string) {
    if (!confirm("이 나눔을 삭제할까요?")) return;
    await supabase.from("group_sharings").delete().eq("id", sharingId);
    // Realtime DELETE 이벤트가 자동 반영
  }

  // ─── 반응 토글 ───────────────────────────────────────
  async function toggleReaction(sharingId: string, type: string) {
    if (!userId) return;
    const sharing = sharings.find((s) => s.id === sharingId);
    if (!sharing) return;

    const hasReacted = sharing.reactions.myReactions.has(type);

    if (hasReacted) {
      await supabase
        .from("sharing_reactions")
        .delete()
        .eq("sharing_id", sharingId)
        .eq("user_id", userId)
        .eq("reaction_type", type);
    } else {
      await supabase.from("sharing_reactions").insert({
        sharing_id: sharingId,
        user_id: userId,
        reaction_type: type,
      });
    }
    // Realtime이 자동 반영
  }

  // ─── 댓글 토글 (펼치기/접기) ─────────────────────────
  async function toggleComments(sharingId: string) {
    const next = new Set(expandedComments);
    if (next.has(sharingId)) {
      next.delete(sharingId);
    } else {
      next.add(sharingId);
      // 첫 펼침 시 댓글 로드
      if (!commentsMap[sharingId]) {
        const { data } = await supabase
          .from("sharing_comments")
          .select("id, content, created_at, user_id")
          .eq("sharing_id", sharingId)
          .order("created_at", { ascending: true });
        setCommentsMap((prev) => ({
          ...prev,
          [sharingId]: (data || []).map((c) => ({ ...c, user_name: nameMap[c.user_id] || "멤버" })),
        }));
      }
    }
    setExpandedComments(next);
  }

  // ─── 댓글 작성 ───────────────────────────────────────
  async function handlePostComment(sharingId: string) {
    const text = (commentInputs[sharingId] || "").trim();
    if (!text || !userId) return;
    setPostingComment(sharingId);

    await supabase.from("sharing_comments").insert({
      sharing_id: sharingId,
      user_id: userId,
      content: text,
    });

    setCommentInputs((prev) => ({ ...prev, [sharingId]: "" }));
    setPostingComment(null);
    // Realtime이 자동 반영
  }

  // ─── 렌더링 ──────────────────────────────────────────
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
            <p className="text-xs text-mid-gray">
              {members.length}명 참여 · 초대코드: {group.invite_code}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowQR(true)} className="text-lg" title="QR 코드">📱</button>
            <button onClick={async () => {
              const url = `${window.location.origin}/group/${groupId}`;
              if (navigator.share) {
                await navigator.share({ title: `${group.name} 소그룹`, text: `${group.name} 소그룹에 참여하세요!`, url });
              } else {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }} className="text-lg" title="공유">{copied ? "✅" : "🔗"}</button>
            <Link href="/group" className="text-sm text-mid-gray">← 목록</Link>
          </div>
        </div>
      </div>

      {/* QR 모달 */}
      {showQR && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-6 mx-6 text-center max-w-xs" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-green-dark mb-1">{group.name}</h3>
            <p className="text-xs text-mid-gray mb-4">QR 코드를 스캔하면 소그룹에 참여할 수 있습니다</p>
            <div className="flex justify-center mb-4">
              <QRCodeSVG value={`${window.location.origin}/group/${groupId}`} size={200} level="M" />
            </div>
            <p className="text-xs text-mid-gray mb-3">초대코드: <span className="font-bold text-charcoal">{group.invite_code}</span></p>
            <button onClick={() => setShowQR(false)} className="w-full py-2.5 bg-green text-white rounded-lg text-sm font-medium">닫기</button>
          </div>
        </div>
      )}

      {/* 비멤버 참여 배너 */}
      {!isMember && (
        <div className="px-5 py-3 bg-gold/10 border-b border-gold/30">
          <div className="flex items-center justify-between">
            <p className="text-sm text-charcoal">이 소그룹에 참여하시겠어요?</p>
            <button
              onClick={async () => {
                if (!userId) return;
                setJoining(true);
                const { error } = await supabase.from("group_members").insert({ group_id: groupId, user_id: userId, role: "member" });
                if (!error) {
                  setIsMember(true);
                  setMembers((prev) => [...prev, { id: userId, name: nameMap[userId] || "나" }]);
                }
                setJoining(false);
              }}
              disabled={joining}
              className="px-4 py-1.5 bg-green text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >{joining ? "참여 중..." : "참여하기"}</button>
          </div>
        </div>
      )}

      {/* 나눔 피드 */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {sharings.length === 0 ? (
          <div className="text-center pt-8">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-mid-gray text-sm">아직 나눔이 없습니다. 첫 묵상을 나눠보세요!</p>
          </div>
        ) : (
          sharings.map((s) => {
            const isMe = s.user_id === userId;
            const displayName = isMe ? "나" : (s.user_name || "멤버");
            const initial = (s.user_name || (isMe ? "나" : "?"))[0];
            const isExpanded = expandedComments.has(s.id);
            const comments = commentsMap[s.id] || [];

            return (
              <div key={s.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* 나눔 본문 */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green text-white flex items-center justify-center text-xs font-bold">
                        {initial}
                      </div>
                      <div>
                        <p className="font-bold text-charcoal text-sm">{displayName}</p>
                        <p className="text-xs text-mid-gray">
                          {new Date(s.created_at).toLocaleString("ko-KR", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    {isMe && (
                      <button
                        onClick={() => handleDeleteSharing(s.id)}
                        className="text-xs text-mid-gray hover:text-red-500"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <p className="text-charcoal text-sm leading-6 whitespace-pre-line">{s.content}</p>
                </div>

                {/* 반응 버튼 */}
                <div className="px-4 pb-2 flex items-center gap-1">
                  {(["amen", "pray", "love"] as const).map((type) => {
                    const count = s.reactions[type] as number;
                    const active = s.reactions.myReactions.has(type);
                    return (
                      <button
                        key={type}
                        onClick={() => toggleReaction(s.id, type)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          active
                            ? "bg-green/10 text-green border border-green/30"
                            : "bg-cream text-mid-gray border border-transparent hover:bg-cream-dark"
                        }`}
                      >
                        <span>{REACTION_EMOJI[type]}</span>
                        <span>{REACTION_LABEL[type]}</span>
                        {count > 0 && <span className="ml-0.5 font-bold">{count}</span>}
                      </button>
                    );
                  })}

                  {/* 댓글 토글 */}
                  <button
                    onClick={() => toggleComments(s.id)}
                    className={`ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${
                      isExpanded ? "bg-green/10 text-green" : "bg-cream text-mid-gray hover:bg-cream-dark"
                    }`}
                  >
                    <span>💬</span>
                    <span>댓글</span>
                    {s.commentCount > 0 && <span className="font-bold">{s.commentCount}</span>}
                  </button>
                </div>

                {/* 댓글 섹션 (펼침) */}
                {isExpanded && (
                  <div className="border-t border-light-gray bg-cream/50 px-4 py-3">
                    {/* 댓글 목록 */}
                    {comments.length > 0 ? (
                      <div className="space-y-2 mb-3">
                        {comments.map((c) => {
                          const cName = c.user_id === userId ? "나" : (c.user_name || "멤버");
                          return (
                            <div key={c.id} className="flex gap-2">
                              <div className="w-6 h-6 rounded-full bg-mid-gray/20 text-mid-gray flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                {(c.user_name || "?")[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs">
                                  <span className="font-bold text-charcoal">{cName}</span>
                                  <span className="text-mid-gray ml-2">
                                    {new Date(c.created_at).toLocaleString("ko-KR", {
                                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                                    })}
                                  </span>
                                </p>
                                <p className="text-sm text-charcoal leading-5 mt-0.5">{c.content}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-mid-gray text-center py-2 mb-2">아직 댓글이 없습니다</p>
                    )}

                    {/* 댓글 입력 */}
                    <div className="flex gap-2">
                      <input
                        value={commentInputs[s.id] || ""}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({ ...prev, [s.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handlePostComment(s.id);
                          }
                        }}
                        placeholder="댓글을 남겨주세요..."
                        className="flex-1 px-3 py-2 bg-white border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green"
                      />
                      <button
                        onClick={() => handlePostComment(s.id)}
                        disabled={!(commentInputs[s.id] || "").trim() || postingComment === s.id}
                        className="px-3 py-2 bg-green text-white rounded-lg text-xs font-medium disabled:opacity-40"
                      >
                        {postingComment === s.id ? "..." : "전송"}
                      </button>
                    </div>
                  </div>
                )}
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
