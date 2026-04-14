"use client";

import { useState } from "react";
import Link from "next/link";

interface Note {
  id: string;
  qt_date: string;
  book: string;
  chapter: number;
  content: string;
  created_at: string;
}

export default function NotePage() {
  const [notes] = useState<Note[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteReference, setNoteReference] = useState("");

  function handleSave() {
    if (!noteContent.trim()) return;
    // TODO: Supabase에 저장
    alert("묵상 노트가 저장되었습니다! (Supabase 연동 후 실제 저장)");
    setNoteContent("");
    setNoteReference("");
    setShowEditor(false);
  }

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-green-dark">묵상 노트</h1>
        <button
          onClick={() => setShowEditor(!showEditor)}
          className="px-4 py-2 bg-green text-white text-sm font-medium rounded-lg"
        >
          {showEditor ? "닫기" : "+ 새 노트"}
        </button>
      </div>

      {/* Editor */}
      {showEditor && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <input
            type="text"
            placeholder="성경 본문 (예: 마태복음 5:1-12)"
            value={noteReference}
            onChange={(e) => setNoteReference(e.target.value)}
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-green"
          />
          <textarea
            placeholder="오늘 말씀을 통해 깨달은 것, 느낀 것, 결단한 것을 기록하세요..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 bg-cream border border-light-gray rounded-lg text-sm leading-7 resize-none focus:outline-none focus:ring-2 focus:ring-green"
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setShowEditor(false)}
              className="px-4 py-2 text-sm text-mid-gray"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-green text-white text-sm font-medium rounded-lg"
            >
              저장
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center pt-12">
          <p className="text-4xl mb-3">📝</p>
          <h2 className="text-lg font-bold text-green-dark mb-2">
            아직 묵상 노트가 없습니다
          </h2>
          <p className="text-mid-gray text-sm mb-4">
            큐티 후 깨달은 점을 기록해보세요.
          </p>
          <Link href="/qt" className="text-green font-medium text-sm">
            큐티하러 가기 →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gold font-medium mb-1">
                {note.book} {note.chapter}장
              </p>
              <p className="text-charcoal text-sm leading-6 line-clamp-3">
                {note.content}
              </p>
              <p className="text-mid-gray text-xs mt-2">
                {new Date(note.created_at).toLocaleDateString("ko-KR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
