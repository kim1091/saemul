"use client";

import { useState } from "react";
import Link from "next/link";

export default function QtArchivePage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const isPast = (day: number) => new Date(year, month, day) < today;

  return (
    <div className="px-5 pt-6">
      <h1 className="text-xl font-bold text-green-dark mb-6">큐티 아카이브</h1>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 text-mid-gray text-lg">
          ←
        </button>
        <h2 className="text-lg font-bold text-charcoal">
          {year}년 {month + 1}월
        </h2>
        <button onClick={nextMonth} className="p-2 text-mid-gray text-lg">
          →
        </button>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 mb-2">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="text-center text-xs text-mid-gray font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;

          return (
            <button
              key={day}
              className={`aspect-square flex items-center justify-center rounded-xl text-sm transition ${
                isToday(day)
                  ? "bg-green text-white font-bold"
                  : isPast(day)
                  ? "bg-white text-charcoal hover:bg-cream-dark"
                  : "text-light-gray"
              }`}
              disabled={!isPast(day) && !isToday(day)}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Info */}
      <div className="mt-6 bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3 text-sm">
          <span className="w-4 h-4 rounded bg-green" />
          <span className="text-charcoal">오늘</span>
          <span className="w-4 h-4 rounded bg-white border border-light-gray ml-3" />
          <span className="text-charcoal">큐티 가능</span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <Link href="/qt" className="text-green font-medium text-sm">
          오늘의 큐티 하러 가기 →
        </Link>
      </div>
    </div>
  );
}
