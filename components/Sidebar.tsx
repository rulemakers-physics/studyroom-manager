import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 p-4 print:hidden">
      <h1 className="text-xl font-bold mb-8">독서실 관리 시스템</h1>
      <nav className="space-y-2">
        <Link href="/" className="block p-3 rounded hover:bg-gray-800">🏠 대시보드</Link>
        <Link href="/patrol" className="block p-3 rounded hover:bg-gray-800">📋 순찰일지 (인쇄)</Link>
        <Link href="/students" className="block p-3 rounded hover:bg-gray-800">👨‍🎓 학생 관리</Link>
        <Link href="/lunch" className="block p-3 rounded hover:bg-gray-800">🍱 도시락 관리</Link>
      </nav>
    </aside>
  );
}