import type { Metadata } from "next";
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: "샤인독서실 관리 시스템", // 브라우저 탭 제목 변경
  description: "샤인독서실을 위한 통합 행정 업무 관리 시스템",
  icons: {
    icon: '/favicon.ico', // 명시적 아이콘 지정 (app/favicon.ico 자동 매핑됨)
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="flex bg-gray-50 text-gray-900">
        <Sidebar />
        <main className="ml-64 w-full min-h-screen p-8 print:ml-0 print:p-0">
          {children}
        </main>
      </body>
    </html>
  );
}