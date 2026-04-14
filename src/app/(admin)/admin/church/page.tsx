"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase";

interface Church {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  pastor_id: string;
  invite_code: string | null;
}

interface WorshipType {
  id: string;
  name: string;
  day_of_week: number | null;
  time: string | null;
  is_active: boolean;
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function ChurchSetupPage() {
  const [church, setChurch] = useState<Church | null>(null);
  const [worshipTypes, setWorshipTypes] = useState<WorshipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 교회 등록 폼
  const [showChurchForm, setShowChurchForm] = useState(false);
  const [churchName, setChurchName] = useState("");
  const [churchAddress, setChurchAddress] = useState("");
  const [churchPhone, setChurchPhone] = useState("");

  // 예배 유형 폼
  const [showWorshipForm, setShowWorshipForm] = useState(false);
  const [worshipName, setWorshipName] = useState("");
  const [worshipDay, setWorshipDay] = useState("0");
  const [worshipTime, setWorshipTime] = useState("11:00");

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    // 내가 담당하는 교회 찾기
    const { data: churches } = await supabase
      .from("churches")
      .select("*")
      .eq("pastor_id", user.id);

    if (churches && churches.length > 0) {
      const c = churches[0];
      setChurch(c);

      // 예배 유형 로드
      const { data: types } = await supabase
        .from("worship_types")
        .select("*")
        .eq("church_id", c.id)
        .order("day_of_week");
      setWorshipTypes(types || []);
    } else {
      setShowChurchForm(true);
    }

    setLoading(false);
  }

  async function createChurch() {
    if (!churchName.trim() || !userId) return;

    const { data, error } = await supabase
      .from("churches")
      .insert({
        name: churchName,
        address: churchAddress || null,
        phone: churchPhone || null,
        pastor_id: userId,
      })
      .select()
      .single();

    if (error) {
      alert("교회 등록 실패: " + error.message);
      return;
    }

    // 내 프로필도 pastor로 업데이트 + church_id 연결
    await supabase
      .from("profiles")
      .update({ role: "pastor", church_id: data.id, church_name: churchName })
      .eq("id", userId);

    setChurch(data);
    setShowChurchForm(false);

    // 기본 예배 유형 추가
    const defaults = [
      { name: "주일 1부", day_of_week: 0, time: "09:00" },
      { name: "주일 2부", day_of_week: 0, time: "11:00" },
      { name: "수요예배", day_of_week: 3, time: "19:30" },
      { name: "금요기도", day_of_week: 5, time: "21:00" },
      { name: "새벽기도", day_of_week: 1, time: "05:30" },
    ];
    for (const w of defaults) {
      await supabase.from("worship_types").insert({
        church_id: data.id,
        name: w.name,
        day_of_week: w.day_of_week,
        time: w.time,
      });
    }
    loadData();
  }

  async function addWorshipType() {
    if (!worshipName.trim() || !church) return;

    await supabase.from("worship_types").insert({
      church_id: church.id,
      name: worshipName,
      day_of_week: parseInt(worshipDay),
      time: worshipTime,
    });

    setWorshipName("");
    setShowWorshipForm(false);
    loadData();
  }

  async function deleteWorshipType(id: string) {
    if (!confirm("예배를 삭제하시겠습니까?")) return;
    await supabase.from("worship_types").delete().eq("id", id);
    loadData();
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
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-mid-gray">← 관리</Link>
        <h1 className="text-xl font-bold text-green-dark">교회 설정</h1>
      </div>

      {/* 교회 정보 */}
      {!church && showChurchForm && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4 space-y-3">
          <h2 className="font-bold text-charcoal">교회를 등록해주세요</h2>
          <p className="text-sm text-mid-gray">교회 등록 후 출석/심방/재정을 관리할 수 있습니다.</p>
          <input
            type="text" placeholder="교회 이름 *"
            value={churchName}
            onChange={(e) => setChurchName(e.target.value)}
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
          />
          <input
            type="text" placeholder="주소"
            value={churchAddress}
            onChange={(e) => setChurchAddress(e.target.value)}
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
          />
          <input
            type="tel" placeholder="전화번호"
            value={churchPhone}
            onChange={(e) => setChurchPhone(e.target.value)}
            className="w-full px-4 py-2.5 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
          />
          <button
            onClick={createChurch}
            disabled={!churchName.trim()}
            className="w-full py-2.5 bg-green text-white rounded-lg font-medium text-sm disabled:opacity-40"
          >
            교회 등록 + 기본 예배 5개 생성
          </button>
        </div>
      )}

      {church && (
        <>
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <h2 className="text-lg font-bold text-green-dark">{church.name}</h2>
            {church.address && <p className="text-sm text-mid-gray mt-1">{church.address}</p>}
            {church.phone && <p className="text-sm text-mid-gray">{church.phone}</p>}
          </div>

          {/* 초대 코드 + QR */}
          {church.invite_code && (
            <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
              <h3 className="font-bold text-charcoal mb-3">성도 초대</h3>
              <p className="text-sm text-mid-gray mb-4">
                아래 코드를 성도에게 공유하거나 QR 코드를 보여주세요.
              </p>

              <div className="bg-cream rounded-xl p-4 mb-4 text-center">
                <p className="text-xs text-mid-gray mb-1">교회 코드</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-3xl font-bold tracking-widest font-mono text-green-dark">
                    {church.invite_code}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(church.invite_code!);
                      alert("코드가 복사되었습니다!");
                    }}
                    className="px-2 py-1 bg-green text-white text-xs rounded-lg"
                  >
                    복사
                  </button>
                </div>
              </div>

              <div className="bg-white border-2 border-green/20 rounded-xl p-4 flex flex-col items-center">
                <p className="text-xs text-mid-gray mb-2">QR 코드로 바로 가입</p>
                <QRCodeSVG
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/join/${church.invite_code}`}
                  size={180}
                  level="M"
                />
                <p className="text-xs text-mid-gray mt-3 text-center">
                  성도가 카메라로 스캔하면 바로 가입 페이지로 이동합니다.
                </p>
              </div>
            </div>
          )}

          {/* 예배 유형 */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-charcoal">예배 유형 ({worshipTypes.length})</h3>
            <button
              onClick={() => setShowWorshipForm(!showWorshipForm)}
              className="px-3 py-1.5 bg-green text-white text-xs font-medium rounded-lg"
            >
              {showWorshipForm ? "닫기" : "+ 추가"}
            </button>
          </div>

          {showWorshipForm && (
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4 space-y-2">
              <input
                type="text" placeholder="예배 이름 (예: 청년예배)"
                value={worshipName}
                onChange={(e) => setWorshipName(e.target.value)}
                className="w-full px-3 py-2 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
              />
              <div className="flex gap-2">
                <select
                  value={worshipDay}
                  onChange={(e) => setWorshipDay(e.target.value)}
                  className="flex-1 px-3 py-2 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
                >
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}요일</option>)}
                </select>
                <input
                  type="time" value={worshipTime}
                  onChange={(e) => setWorshipTime(e.target.value)}
                  className="px-3 py-2 bg-cream border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green"
                />
              </div>
              <button
                onClick={addWorshipType}
                disabled={!worshipName.trim()}
                className="w-full py-2 bg-green text-white rounded-lg text-sm font-medium disabled:opacity-40"
              >
                추가
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {worshipTypes.length === 0 ? (
              <p className="text-center py-8 text-sm text-mid-gray">예배가 없습니다. 추가해주세요.</p>
            ) : (
              worshipTypes.map((w, i) => (
                <div
                  key={w.id}
                  className={`flex items-center justify-between px-5 py-3 ${i > 0 ? "border-t border-light-gray/50" : ""}`}
                >
                  <div>
                    <p className="font-medium text-sm text-charcoal">{w.name}</p>
                    <p className="text-xs text-mid-gray">
                      {w.day_of_week !== null && `${DAYS[w.day_of_week]}요일 `}
                      {w.time && w.time.slice(0, 5)}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteWorshipType(w.id)}
                    className="text-xs text-mid-gray hover:text-red-500"
                  >
                    삭제
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
