"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface Note {
  id: string;
  qt_date: string | null;
  book: string | null;
  chapter: number | null;
  content: string;
  tags: string[] | null;
  created_at: string;
}

export default function NotePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteReference, setNoteReference] = useState("");
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setNotes(data || []);
    setLoading(false);
  }

  async function handleSave() {
    if (!noteContent.trim()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    // 본문 참조 파싱 (예: "마태복음 5:1-12")
    let book = null, chapter = null, verseStart = null, verseEnd = null;
    const match = noteReference.match(/(.+?)\s*(\d+):(\d+)-?(\d+)?/);
    if (match) {
      book = match[1].trim();
      chapter = parseInt(match[2]);
      verseStart = parseInt(match[3]);
      verseEnd = match[4] ? parseInt(match[4]) : verseStart;
    }

    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      content: noteContent,
      book,
      chapter,
      verse_start: verseStart,
      verse_end: verseEnd,
      qt_date: new Date().toISOString().split("T")[0],
    });

    if (!error) {
      setNoteContent("");
      setNoteReference("");
      setShowEditor(false);
      loadNotes();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await supabase.from("notes").delete().eq("id", id);
    loadNotes();
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
        <h1 className="text-xl font-bold text-green-dark">묵상 노트</h1>
        <button
          onClick={() => setShowEditor(!showEditor)}
          className="px-4 py-2 bg-green text-white text-sm font-medium rounded-lg"
        >
          {showEditor ? "닫기" : "+ 새 노트"}
        </button>
      </div>

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
            <button onClick={() => setShowEditor(false)} className="px-4 py-2 text-sm text-mid-gray">
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !noteContent.trim()}
              className="px-5 py-2 bg-green text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="text-center pt-12">
          <p className="text-4xl mb-3">📝</p>
          <h2 className="text-lg font-bold text-green-dark mb-2">아직 묵상 노트가 없습니다</h2>
          <p className="text-mid-gray text-sm mb-4">큐티 후 깨달은 점을 기록해보세요.</p>
          <Link href="/qt" className="text-green font-medium text-sm">큐티하러 가기 →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="bg-white rounded-xl p-4 shadow-sm">
              {note.book && (
                <p className="text-xs text-gold font-medium mb-1">
                  {note.book} {note.chapter}장
                </p>
              )}
              <p className="text-charcoal text-sm leading-6 whitespace-pre-line">
                {note.content}
              </p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-mid-gray text-xs">
                  {new Date(note.created_at).toLocaleDateString("ko-KR")}
                </p>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="text-xs text-mid-gray hover:text-red-500 transition"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
