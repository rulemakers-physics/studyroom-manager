import './globals.css';
import Sidebar from '@/components/Sidebar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="flex bg-gray-50 text-gray-900">
        <Sidebar />
        {/* 인쇄 시 margin-left 제거를 위해 print:ml-0 추가 */}
        <main className="ml-64 w-full min-h-screen p-8 print:ml-0 print:p-0">
          {children}
        </main>
      </body>
    </html>
  );
}