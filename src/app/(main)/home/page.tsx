import Link from "next/link";

export default function HomePage() {
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="px-5 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-green-dark">샘물</h1>
          <p className="text-mid-gray text-sm mt-0.5">{today}</p>
        </div>
        <Link
          href="/profile"
          className="w-10 h-10 rounded-full bg-green-dark text-white flex items-center justify-center text-lg"
        >
          ?
        </Link>
      </div>

      {/* 오늘의 큐티 카드 */}
      <Link href="/qt" className="block">
        <div className="bg-green-dark text-white rounded-2xl p-6 mb-4 shadow-md">
          <p className="text-gold text-xs tracking-wider mb-2">오늘의 큐티</p>
          <h2 className="text-xl font-bold mb-1">마태복음 5:1-12</h2>
          <p className="text-light-gray text-sm mb-4">팔복 - 참된 행복의 길</p>
          <span className="inline-block bg-gold text-charcoal text-sm font-bold px-4 py-2 rounded-lg">
            큐티하러 가기
          </span>
        </div>
      </Link>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link
          href="/ask"
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition"
        >
          <span className="text-2xl">💬</span>
          <p className="font-bold text-green-dark mt-2">AI 질문</p>
          <p className="text-mid-gray text-xs mt-0.5">성경 궁금증 해결</p>
        </Link>

        <Link
          href="/note"
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition"
        >
          <span className="text-2xl">📝</span>
          <p className="font-bold text-green-dark mt-2">묵상 노트</p>
          <p className="text-mid-gray text-xs mt-0.5">오늘의 깨달음 기록</p>
        </Link>

        <Link
          href="/plan"
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition"
        >
          <span className="text-2xl">📅</span>
          <p className="font-bold text-green-dark mt-2">읽기 플랜</p>
          <p className="text-mid-gray text-xs mt-0.5">성경 통독 계획</p>
        </Link>

        <Link
          href="/sermon/create"
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition"
        >
          <span className="text-2xl">🎤</span>
          <p className="font-bold text-green-dark mt-2">설교</p>
          <p className="text-mid-gray text-xs mt-0.5">5분 설교 만들기</p>
        </Link>
      </div>

      {/* 소그룹 미리보기 */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-green-dark">소그룹 나눔</h3>
          <Link href="/group" className="text-sm text-gold font-medium">
            전체보기
          </Link>
        </div>
        <p className="text-mid-gray text-sm">
          아직 소그룹에 참여하지 않았습니다.
        </p>
        <Link
          href="/group"
          className="inline-block mt-3 text-sm text-green font-medium"
        >
          소그룹 찾아보기 →
        </Link>
      </div>
    </div>
  );
}
