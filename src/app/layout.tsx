import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: {
    default: "艾倫數位書坊 Alan's AI Press｜精選 AI 協作原創電子書與實戰指南",
    template: "%s｜艾倫數位書坊 Alan's AI Press",
  },
  description:
    '精選 AI 協作原創電子書與實戰指南。支援線上防拷章節閱讀器、個人專屬動態浮水印 PDF 下載，以及老訂戶原購價 1/10 改版優惠升級機制。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant-TW">
      <body className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
