'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // 시계 기능 (Hydration 에러 방지를 위해 useEffect 사용)
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. 상단 헤더 & 시계 */}
      <header className="flex justify-between items-end border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
          <p className="text-gray-500 mt-1">오늘 하루도 힘내세요!</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-bold text-blue-600">
            {currentTime ? currentTime.toLocaleTimeString('ko-KR') : '--:--:--'}
          </div>
          <div className="text-gray-400 text-sm">
            {currentTime ? currentTime.toLocaleDateString('ko-KR', { dateStyle: 'full' }) : ''}
          </div>
        </div>
      </header>

      {/* 2. 주요 현황 카드 (4개 그리드) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 카드 1: 출석률 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
          <div className="text-gray-500 text-sm font-medium mb-1">현재 재실 인원</div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-gray-900">84</span>
            <span className="text-gray-400 mb-1">/ 120명</span>
          </div>
          <div className="mt-4 w-full bg-gray-100 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '70%' }}></div>
          </div>
        </div>

        {/* 카드 2: 순찰 이슈 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
          <div className="text-gray-500 text-sm font-medium mb-1">오늘의 벌점/지적</div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-red-500">3</span>
            <span className="text-gray-400 mb-1">건</span>
          </div>
          <p className="text-xs text-red-400 mt-2">▲ 지난주 대비 증가</p>
        </div>

        {/* 카드 3: 도시락 신청 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
          <div className="text-gray-500 text-sm font-medium mb-1">오늘 도시락 신청</div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-green-600">15</span>
            <span className="text-gray-400 mb-1">개</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">마감 시간: 10:30 AM</p>
        </div>

        {/* 카드 4: 상담 일정 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
          <div className="text-gray-500 text-sm font-medium mb-1">상담 예정</div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-purple-600">1</span>
            <span className="text-gray-400 mb-1">건</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">16:00 (김민준 학생)</p>
        </div>
      </div>

      {/* 3. 하단 영역: 바로가기 & 최근 알림 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 빠른 실행 메뉴 */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">🚀 바로가기</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/patrol" className="block p-4 border rounded-lg hover:bg-blue-50 transition group">
              <div className="text-2xl mb-2">📋</div>
              <div className="font-bold text-gray-900 group-hover:text-blue-600">순찰 일지 작성</div>
              <div className="text-sm text-gray-500">학생 상태 체크 및 인쇄</div>
            </Link>
            <Link href="/lunch" className="block p-4 border rounded-lg hover:bg-green-50 transition group">
              <div className="text-2xl mb-2">🍱</div>
              <div className="font-bold text-gray-900 group-hover:text-green-600">도시락 주문 관리</div>
              <div className="text-sm text-gray-500">신청 내역 확인 및 마감</div>
            </Link>
            <Link href="/students" className="block p-4 border rounded-lg hover:bg-purple-50 transition group">
              <div className="text-2xl mb-2">👨‍🎓</div>
              <div className="font-bold text-gray-900 group-hover:text-purple-600">학생 조회</div>
              <div className="text-sm text-gray-500">연락처 및 상담 기록</div>
            </Link>
            <button className="block p-4 border rounded-lg hover:bg-orange-50 transition group text-left">
              <div className="text-2xl mb-2">📢</div>
              <div className="font-bold text-gray-900 group-hover:text-orange-600">전체 공지 발송</div>
              <div className="text-sm text-gray-500">문자 메시지 보내기 (준비중)</div>
            </button>
          </div>
        </div>

        {/* 오른쪽: 실시간 이슈 로그 (더미 데이터) */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">🔔 실시간 이슈</h2>
          <div className="space-y-4">
            {/* 로그 아이템 1 */}
            <div className="flex gap-3 items-start pb-3 border-b border-gray-100 last:border-0">
              <div className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">수면</div>
              <div>
                <p className="text-sm font-bold text-gray-800">김철수 (A-01)</p>
                <p className="text-xs text-gray-500">14:30 순찰 시 적발</p>
              </div>
            </div>
            {/* 로그 아이템 2 */}
            <div className="flex gap-3 items-start pb-3 border-b border-gray-100 last:border-0">
              <div className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">외출</div>
              <div>
                <p className="text-sm font-bold text-gray-800">이영희 (B-05)</p>
                <p className="text-xs text-gray-500">병원 진료 (어머니 확인)</p>
              </div>
            </div>
            {/* 로그 아이템 3 */}
            <div className="flex gap-3 items-start pb-3 border-b border-gray-100 last:border-0">
              <div className="bg-green-100 text-green-600 text-xs font-bold px-2 py-1 rounded">복귀</div>
              <div>
                <p className="text-sm font-bold text-gray-800">박민수 (C-12)</p>
                <p className="text-xs text-gray-500">15:10 학원 복귀 완료</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}