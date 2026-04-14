import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "샘물 — 교회 종합 플랫폼",
  description: "AI 기반 신앙생활 + 교회운영 올인원 플랫폼",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#4A6741",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full bg-cream text-charcoal">{children}</body>
    </html>
  );
}
