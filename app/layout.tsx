import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App 生产工厂",
  description: "把一个 App 想法生产成完整项目方案的 AI 软件工厂"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
