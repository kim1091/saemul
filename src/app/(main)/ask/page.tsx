"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "오늘 본문에서 이해 안 되는 부분이 있어요",
  "구약과 신약의 차이가 뭔가요?",
  "기도할 때 어떤 자세가 좋을까요?",
  "십일조는 꼭 해야 하나요?",
];

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [remainingQuestions, setRemainingQuestions] = useState(3);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: messageText }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          conversationId,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${data.error}` },
        ]);
      } else {
        if (data.conversationId) setConversationId(data.conversationId);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ]);
        setRemainingQuestions((prev) => Math.max(0, prev - 1));
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ 네트워크 오류가 발생했습니다." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-light-gray bg-cream">
        <h1 className="text-lg font-bold text-green-dark">AI 질문답변</h1>
        <p className="text-xs text-mid-gray">
          남은 질문: {remainingQuestions}/3 (무료)
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center pt-8">
            <p className="text-4xl mb-3">💬</p>
            <h2 className="text-lg font-bold text-green-dark mb-2">
              성경이 궁금하신가요?
            </h2>
            <p className="text-mid-gray text-sm mb-6">
              무엇이든 질문해보세요. AI가 성경적 근거와 함께 답변합니다.
            </p>

            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="block w-full text-left bg-white rounded-xl px-4 py-3 text-sm text-charcoal shadow-sm hover:bg-cream-dark transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                msg.role === "user"
                  ? "bg-green text-white rounded-br-md"
                  : "bg-white text-charcoal shadow-sm rounded-bl-md"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <p className="text-mid-gray text-sm animate-pulse">
                답변을 준비하고 있습니다...
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-3 border-t border-light-gray bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="성경에 대해 질문하세요..."
            className="flex-1 px-4 py-2.5 bg-cream border border-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-green text-white rounded-xl font-medium text-sm disabled:opacity-40"
          >
            전송
          </button>
        </form>
      </div>
    </div>
  );
}
