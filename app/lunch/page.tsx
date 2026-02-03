'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Student } from '@/types';

// 날짜 포맷 헬퍼 (YYYY-MM-DD)
const formatDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function LunchManagerPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [viewMode, setViewMode] = useState<'DAILY' | 'BULK'>('DAILY');
  
  // 실시간 데이터 로드
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
      const loaded: Student[] = [];
      snapshot.forEach((doc) => loaded.push(doc.data() as Student));
      loaded.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber));
      setStudents(loaded);
    });
    return () => unsubscribe();
  }, []);

  // --- 일별 관리 로직 ---
  // 선택한 날짜의 신청자 목록
  const applicants = useMemo(() => 
    students.filter(s => s.lunchDates?.includes(selectedDate)), 
  [students, selectedDate]);

  // 미신청자 목록 (추가용)
  const nonApplicants = useMemo(() => 
    students.filter(s => !s.lunchDates?.includes(selectedDate) && s.status === '재원'), 
  [students, selectedDate]);

  const toggleLunch = async (studentId: string, isApplying: boolean) => {
    const ref = doc(db, 'students', studentId);
    if (isApplying) {
      await updateDoc(ref, { lunchDates: arrayUnion(selectedDate) });
    } else {
      await updateDoc(ref, { lunchDates: arrayRemove(selectedDate) });
    }
  };

  // --- 캘린더 데이터 계산 ---
  const getDailyCount = (dateStr: string) => {
    return students.filter(s => s.lunchDates?.includes(dateStr)).length;
  };

  // 이번 달 달력 생성
  const generateCalendar = () => {
    const today = new Date(selectedDate);
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    // 빈 칸 채우기 (요일 맞추기)
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    // 날짜 채우기
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push(dateStr);
    }
    return days;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🍱 도시락 관리</h1>
            <p className="text-gray-500 mt-1">매일 점심 도시락 신청 현황 및 발주 수량 확인</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-1 border">
            <button 
              onClick={() => setViewMode('DAILY')}
              className={`px-4 py-2 rounded-md text-sm font-bold ${viewMode === 'DAILY' ? 'bg-orange-100 text-orange-700' : 'text-gray-500'}`}
            >
              📅 일별 관리
            </button>
            <button 
              onClick={() => setViewMode('BULK')}
              className={`px-4 py-2 rounded-md text-sm font-bold ${viewMode === 'BULK' ? 'bg-orange-100 text-orange-700' : 'text-gray-500'}`}
            >
              📝 일괄 신청
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 왼쪽: 달력 (월별 현황) */}
          <div className="bg-white rounded-xl shadow p-6 lg:col-span-1 h-fit">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">{selectedDate.substring(0, 7)} 현황</h2>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded p-1 text-sm"
              />
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-gray-400">
              <div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {generateCalendar().map((dateStr, idx) => {
                if (!dateStr) return <div key={idx} className="h-10"></div>;
                
                const count = getDailyCount(dateStr);
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === formatDate(new Date());

                return (
                  <div 
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`
                      h-14 border rounded flex flex-col items-center justify-center cursor-pointer transition relative
                      ${isSelected ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'border-gray-100 hover:bg-gray-50'}
                      ${isToday ? 'font-bold' : ''}
                    `}
                  >
                    <span className={`text-sm ${isToday ? 'text-orange-600' : 'text-gray-700'}`}>
                      {parseInt(dateStr.split('-')[2])}
                    </span>
                    {count > 0 && (
                      <span className="mt-1 bg-gray-800 text-white text-[10px] px-1.5 rounded-full">
                        {count}개
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-100">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">{selectedDate} 발주 수량</p>
                <p className="text-4xl font-black text-gray-800">{applicants.length}<span className="text-lg font-normal text-gray-500 ml-1">개</span></p>
              </div>
            </div>
          </div>

          {/* 오른쪽: 상세 명단 관리 */}
          <div className="bg-white rounded-xl shadow p-6 lg:col-span-2">
            {viewMode === 'DAILY' ? (
              <>
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    {selectedDate} 신청 명단 ({applicants.length}명)
                  </h2>
                  <button 
                    onClick={() => window.print()}
                    className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
                  >
                    🖨️ 명단 인쇄
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* 신청자 목록 (취소 가능) */}
                  <div>
                    <h3 className="text-sm font-bold text-blue-600 mb-3 bg-blue-50 p-2 rounded">
                      ✅ 신청 완료 (클릭 시 취소)
                    </h3>
                    <div className="grid grid-cols-2 gap-2 max-h-[500px] overflow-y-auto content-start">
                      {applicants.map(student => (
                        <div 
                          key={student.id}
                          onClick={() => toggleLunch(student.id, false)}
                          className="flex justify-between items-center p-3 rounded border border-blue-100 bg-white hover:bg-red-50 hover:border-red-200 cursor-pointer group transition"
                        >
                          <div>
                            <span className="font-bold text-gray-700">{student.name}</span>
                            <span className="text-xs text-gray-400 ml-1">{student.seatNumber}</span>
                          </div>
                          <span className="text-xs text-red-400 opacity-0 group-hover:opacity-100 font-bold">취소</span>
                        </div>
                      ))}
                      {applicants.length === 0 && <p className="text-gray-400 text-sm py-4 text-center col-span-2">신청자가 없습니다.</p>}
                    </div>
                  </div>

                  {/* 미신청자 목록 (추가 가능) */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-500 mb-3 bg-gray-100 p-2 rounded">
                      ⬜ 미신청 재원생 (클릭 시 추가)
                    </h3>
                    <div className="mb-3">
                      <input type="text" placeholder="이름 검색..." className="w-full border rounded p-2 text-sm" id="searchNon" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-[500px] overflow-y-auto content-start">
                      {nonApplicants.map(student => (
                        <div 
                          key={student.id}
                          onClick={() => toggleLunch(student.id, true)}
                          className="flex justify-between items-center p-3 rounded border border-gray-100 bg-gray-50 hover:bg-green-50 hover:border-green-200 cursor-pointer group transition opacity-70 hover:opacity-100"
                        >
                          <div>
                            <span className="font-bold text-gray-600">{student.name}</span>
                            <span className="text-xs text-gray-400 ml-1">{student.seatNumber}</span>
                          </div>
                          <span className="text-xs text-green-600 opacity-0 group-hover:opacity-100 font-bold">추가</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <BulkLunchForm students={students} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 일괄 신청 컴포넌트 ---
function BulkLunchForm({ students }: { students: Student[] }) {
  const [targetStudentId, setTargetStudentId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleBulkApply = async () => {
    if (!targetStudentId || !startDate || !endDate) return alert('모든 항목을 입력해주세요.');
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const datesToAdd: string[] = [];

    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
      // 주말 제외 로직 (선택사항)
      const day = d.getDay();
      if (day !== 0 && day !== 6) { 
        datesToAdd.push(formatDate(new Date(d)));
      }
    }

    if (datesToAdd.length === 0) return alert('선택한 기간에 평일이 없습니다.');
    if (!confirm(`${datesToAdd.length}일치 도시락을 신청하시겠습니까?`)) return;

    await updateDoc(doc(db, 'students', targetStudentId), {
      lunchDates: arrayUnion(...datesToAdd)
    });
    
    alert('신청 완료되었습니다.');
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h2 className="text-xl font-bold mb-6 text-center">📅 기간 일괄 신청</h2>
      <div className="space-y-4 bg-gray-50 p-6 rounded-xl border">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">학생 선택</label>
          <select 
            className="w-full border rounded p-2"
            value={targetStudentId}
            onChange={(e) => setTargetStudentId(e.target.value)}
          >
            <option value="">학생을 선택하세요</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.seatNumber})</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">시작일</label>
            <input type="date" className="w-full border rounded p-2" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">종료일</label>
            <input type="date" className="w-full border rounded p-2" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-gray-500">* 주말(토, 일)은 자동으로 제외됩니다.</p>
        
        <button 
          onClick={handleBulkApply}
          className="w-full bg-orange-500 text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition shadow-sm mt-4"
        >
          기간 신청하기
        </button>
      </div>
    </div>
  );
}