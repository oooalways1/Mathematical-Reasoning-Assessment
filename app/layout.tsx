import type { Metadata } from "next";
import "./globals.css";
import "./portal.css";

export const metadata: Metadata = {
  title: "수리력 한걸음 | 수리력 진단·분석",
  description: "초등 1·2·3학년을 위한 학년별 20문항 수리력 진단. 나의 강점을 찾고 다음 배움을 준비해요.",
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

