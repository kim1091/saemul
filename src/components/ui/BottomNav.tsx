"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const memberTabs: NavItem[] = [
  { href: "/home", label: "홈", icon: "🏠" },
  { href: "/qt", label: "큐티", icon: "📖" },
  { href: "/ask", label: "질문", icon: "💬" },
  { href: "/sermon", label: "설교", icon: "🎤" },
  { href: "/profile", label: "MY", icon: "👤" },
];

const pastorTabs: NavItem[] = [
  { href: "/home", label: "홈", icon: "🏠" },
  { href: "/qt", label: "큐티", icon: "📖" },
  { href: "/sermon", label: "설교", icon: "🎤" },
  { href: "/admin", label: "관리", icon: "⚙️" },
  { href: "/profile", label: "MY", icon: "👤" },
];

export default function BottomNav({ role = "member" }: { role?: string }) {
  const pathname = usePathname();
  const tabs = role === "pastor" || role === "admin" ? pastorTabs : memberTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-light-gray z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname?.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                isActive ? "text-green" : "text-mid-gray"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className={`text-xs ${isActive ? "font-bold" : ""}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
