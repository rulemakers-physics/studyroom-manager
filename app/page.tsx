'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Student } from '@/types';

// 날짜 포맷 (YYYY-MM-DD) - 로컬 시간 기준
const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [todayStr, setTodayStr] = useState('');

  // 1. 초기화 및 시계
  useEffect(() => {
    setTodayStr(getTodayStr());
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Firebase 데이터 실시간 구독
  useEffect(() => {
    const q = query(collection(db, 'students'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: Student[] = [];
      snapshot.forEach((doc) => {
        loaded.push(doc.data() as Student);
      });
      setStudents(loaded);
    });
    return () => unsubscribe();
  }, []);

  // 3. 데이터 집계 (useMemo로 성능 최적화)
  const stats = useMemo(() => {
    const totalSeats = 100; // 전체 좌석 수 (필요시 수정)
    const activeStudents = students.filter(s => s.status === '재원');
    const lunchOrderCount = students.filter(s => s.lunchDates?.includes(todayStr)).length;
    
    // 특이사항이 있는 학생 (메모가 있거나 상태가 특이한 경우)
    const issueStudents = students.filter(s => 
      ['이석', '외출', '결석'].includes(s.status) || (s.memo && s.memo.length > 0)
    );

    // 메모에 '상담' 키워드가 있는 학생
    const consultingCount = students.filter(s => s.memo?.includes('상담')).length;

    return {
      currentCount: activeStudents.length,
      totalSeats,
      lunchCount: lunchOrderCount,
      issueCount: issueStudents.length,
      issues: issueStudents,
      consultingCount
    };
  }, [students, todayStr]);

  return (
    <div className="space-y-6">
      {/* 1. 상단 헤더 & 시계 */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
          <p className="text-gray-500 mt-1">샤인독서실 실시간 현황입니다.</p>
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
          <div className="text-gray-500 text-sm font-medium mb-1">현재 재원 인원</div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-gray-900">{stats.currentCount}</span>
            <span className="text-gray-400 mb-1">/ {stats.totalSeats}명</span>
          </div>
          <div className="mt-4 w-full bg-gray-100 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${(stats.currentCount / stats.totalSeats) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* 카드 2: 순찰 이슈 (외출/이석/결석 등) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
          <div className="text-gray-500 text-sm font-medium mb-1">특이사항 (외출/결석)</div>
          <div className="flex items-end gap-2">
            <span className={`text-4xl font-bold ${stats.issueCount > 0 ? 'text-red-500' : 'text-gray-900'}`}>
              {stats.issueCount}
            </span>
            <span className="text-gray-400 mb-1">건</span>
          </div>
          <p className="text-xs text-red-400 mt-2">
            {stats.issueCount > 0 ? '▲ 확인 필요' : '- 특이사항 없음'}
          </p>
        </div>

        {/* 카드 3: 도시락 신청 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
          <div className="text-gray-500 text-sm font-medium mb-1">오늘 도시락 신청</div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-green-600">{stats.lunchCount}</span>
            <span className="text-gray-400 mb-1">개</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">마감 시간: 10:30 AM</p>
        </div>

        {/* 카드 4: 상담 일정 (메모 기반) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition">
          <div className="text-gray-500 text-sm font-medium mb-1">상담/특이 메모</div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-purple-600">{stats.consultingCount}</span>
            <span className="text-gray-400 mb-1">건</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">메모에 '상담' 포함</p>
        </div>
      </div>

      {/* 3. 하단 영역: 바로가기 & 실시간 이슈 로그 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 빠른 실행 메뉴 */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">🚀 바로가기</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="font-bold text-gray-900 group-hover:text-purple-600">학생 조회 (DB)</div>
              <div className="text-sm text-gray-500">신규 등록 및 정보 수정</div>
            </Link>
            <div className="block p-4 border rounded-lg bg-gray-50 opacity-70 cursor-not-allowed">
              <div className="text-2xl mb-2">📢</div>
              <div className="font-bold text-gray-900">전체 공지 발송</div>
              <div className="text-sm text-gray-500">문자 메시지 서비스 (준비중)</div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 실시간 상태 이슈 (DB 연동) */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">🔔 실시간 현황 (이석/외출)</h2>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {stats.issues.length > 0 ? (
              stats.issues.map((student) => (
                <div key={student.id} className="flex gap-3 items-start pb-3 border-b border-gray-100 last:border-0">
                  <div className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap
                    ${student.status === '결석' ? 'bg-red-100 text-red-600' : 
                      student.status === '외출' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}
                  `}>
                    {student.status}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">
                      {student.name} <span className="text-gray-400 font-normal">({student.seatNumber})</span>
                    </p>
                    {student.memo && <p className="text-xs text-blue-500 truncate mt-0.5">📝 {student.memo}</p>}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                현재 특이사항이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}