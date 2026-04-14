import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-full flex flex-col">
      {/* Hero */}
      <header className="bg-green-dark text-white px-6 pt-16 pb-12 text-center">
        <p className="text-gold text-sm tracking-widest mb-3">AI 기반 교회 종합 플랫폼</p>
        <h1 className="text-5xl font-bold mb-3">샘물</h1>
        <p className="text-light-gray text-lg max-w-md mx-auto leading-relaxed">
          매일 함께 묵상하고, 교회를 하나로 잇는 플랫폼
        </p>
        <Link
          href="/login"
          className="inline-block mt-8 px-8 py-3 bg-gold text-charcoal font-bold rounded-lg hover:opacity-90 transition"
        >
          시작하기
        </Link>
      </header>

      {/* Features */}
      <section className="px-6 py-12 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-green-dark text-center mb-8">
          하나의 앱으로 모든 것을
        </h2>

        <div className="grid gap-6">
          {[
            {
              icon: "📖",
              title: "AI 큐티",
              desc: "6단계 체계적 묵상 — 관찰, 해석, 적용까지 AI가 안내합니다",
            },
            {
              icon: "💬",
              title: "AI 질문답변",
              desc: "성경이 궁금할 때 언제든 질문하세요",
            },
            {
              icon: "👥",
              title: "소그룹 나눔",
              desc: "묵상을 소그룹과 실시간으로 나누세요",
            },
            {
              icon: "🎤",
              title: "설교 도구",
              desc: "목회자 설교 생성부터 성도 5분 나눔까지",
            },
            {
              icon: "📊",
              title: "교회 운영",
              desc: "출석, 심방, 재정, 새신자 관리를 한곳에서",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-4 bg-white rounded-xl p-5 shadow-sm"
            >
              <span className="text-3xl">{f.icon}</span>
              <div>
                <h3 className="font-bold text-green-dark text-lg">{f.title}</h3>
                <p className="text-mid-gray text-sm mt-1">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-dark text-white text-center px-6 py-12">
        <h2 className="text-2xl font-bold mb-3">교회의 디지털 미래를 함께</h2>
        <p className="text-light-gray mb-6">
          성도와 목회자 모두를 위한 통합 플랫폼
        </p>
        <Link
          href="/login"
          className="inline-block px-8 py-3 bg-gold text-charcoal font-bold rounded-lg hover:opacity-90 transition"
        >
          무료로 시작하기
        </Link>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-mid-gray text-sm">
        <p>샘물 &copy; 2026. 모든 권리 보유.</p>
      </footer>
    </div>
  );
}
