"use client";

import { useState } from "react";
import Link from "next/link";

interface Sharing {
  id: string;
  user_name: string;
  content: string;
  created_at: string;
  reactions: { amen: number; pray: number; love: number };
}

export default function GroupDetailPage() {
  const [newSharing, setNewSharing] = useState("");
  const [sharings] = useState<Sharing[]>([
    {
      id: "demo-1",
      user_name: "김성도",
      content: "오늘 본문을 통해 하나님의 사랑이 조건 없는 것임을 다시 깨달았습니다. 나도 주변 사람들에게 조건 없이 사랑을 베풀어야겠다고 결단합니다.",
      created_at: new Date().toISOString(),
      reactions: { amen: 3, pray: 1, love: 2 },
    },
    {
      id: "demo-2",
      user_name: "이집사",
      content: "심령이 가난한 자에 대해 묵상하며, 내가 스스로 의로운 척하고 있지는 않았는지 돌아보게 됩니다. 겸손한 하루가 되길 기도합니다.",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      reactions: { amen: 5, pray: 2, love: 1 },
    },
  ]);

  function handlePost() {
    if (!newSharing.trim()) return;
    // TODO: Supabase에 나눔 저장 + Realtime
    alert("나눔이 공유되었습니다! (Supabase 연동 후 실제 동작)");
    setNewSharing("");
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-light-gray bg-cream">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-green-dark">은혜 소그룹</h1>
            <p className="text-xs text-mid-gray">멤버 8명</p>
          </div>
          <Link href="/group" className="text-sm text-mid-gray">
            ← 목록
          </Link>
        </div>

        {/* 오늘의 본문 */}
        <div className="mt-3 bg-green-dark/5 rounded-lg px-3 py-2">
          <p className="text-xs text-gold font-medium">오늘의 본문</p>
          <p className="text-sm text-green-dark font-bold">마태복음 5:1-12</p>
        </div>
      </div>

      {/* 나눔 피드 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {sharings.map((s) => (
          <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-green text-white flex items-center justify-center text-xs font-bold">
                {s.user_name[0]}
              </div>
              <div>
                <p className="font-bold text-charcoal text-sm">{s.user_name}</p>
                <p className="text-xs text-mid-gray">
                  {new Date(s.created_at).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <p className="text-charcoal text-sm leading-6 mb-3">{s.content}</p>

            {/* 반응 */}
            <div className="flex gap-2">
              <button className="flex items-center gap-1 px-3 py-1 bg-cream rounded-full text-xs text-charcoal hover:bg-cream-dark transition">
                🙏 아멘 <span className="text-mid-gray">{s.reactions.amen}</span>
              </button>
              <button className="flex items-center gap-1 px-3 py-1 bg-cream rounded-full text-xs text-charcoal hover:bg-cream-dark transition">
                ❤️ 은혜 <span className="text-mid-gray">{s.reactions.love}</span>
              </button>
              <button className="flex items-center gap-1 px-3 py-1 bg-cream rounded-full text-xs text-charcoal hover:bg-cream-dark transition">
                🤲 기도 <span className="text-mid-gray">{s.reactions.pray}</span>
              </button>
            </div>
          </div>
        ))}
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
            disabled={!newSharing.trim()}
            className="self-end px-4 py-2 bg-green text-white rounded-xl text-sm font-medium disabled:opacity-40"
          >
            나눔
          </button>
        </div>
      </div>
    </div>
  );
}
