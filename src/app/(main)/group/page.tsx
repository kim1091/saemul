"use client";

import { useState } from "react";
import Link from "next/link";

export default function GroupPage() {
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  // TODO: Supabase에서 내 소그룹 목록 불러오기
  const groups: { id: string; name: string; member_count: number; description: string }[] = [];

  function handleJoin() {
    if (!inviteCode.trim()) return;
    // TODO: Supabase에 참여 요청
    alert(`초대코드 "${inviteCode}"로 참여 요청! (Supabase 연동 후 실제 동작)`);
    setInviteCode("");
    setShowJoin(false);
  }

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-green-dark">소그룹</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJoin(!showJoin)}
            className="px-3 py-2 border border-green text-green text-sm font-medium rounded-lg"
          >
            참여
          </button>
          <Link
            href="/group/create"
            className="px-3 py-2 bg-green text-white text-sm font-medium rounded-lg"
          >
            + 만들기
          </Link>
        </div>
      </div>

      {/* 초대코드 입력 */}
      {showJoin && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h3 className="font-bold text-charcoal mb-3">초대코드로 참여</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="6자리 초대코드 입력"
              maxLength={6}
              className="flex-1 px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-green"
            />
            <button
              onClick={handleJoin}
              disabled={inviteCode.length < 6}
              className="px-5 py-2.5 bg-green text-white rounded-lg text-sm font-medium disabled:opacity-40"
            >
              참여
            </button>
          </div>
        </div>
      )}

      {/* 소그룹 목록 */}
      {groups.length === 0 ? (
        <div className="text-center pt-12">
          <p className="text-4xl mb-3">👥</p>
          <h2 className="text-lg font-bold text-green-dark mb-2">
            아직 소그룹이 없습니다
          </h2>
          <p className="text-mid-gray text-sm mb-2">
            소그룹을 만들거나 초대코드로 참여하세요.
          </p>
          <p className="text-mid-gray text-xs">
            함께 큐티하고 묵상을 나눌 수 있습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <Link key={g.id} href={`/group/${g.id}`}>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-green-dark">{g.name}</h3>
                    <p className="text-mid-gray text-sm mt-0.5">{g.description}</p>
                  </div>
                  <span className="text-xs text-mid-gray bg-cream-dark px-2 py-1 rounded-full">
                    {g.member_count}명
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
