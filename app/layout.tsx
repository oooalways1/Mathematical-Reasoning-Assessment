import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "수리력 한걸음 | 수리력 진단·분석",
  description: "학생별 수리력 진단과 성장 기록, 교사용 분석을 제공하는 수학과 문해력 프로그램",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
