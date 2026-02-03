'use client';

import { useState, useEffect } from 'react';

// --- [1. 타입 정의] ---
type SeatStatus = 'EMPTY' | 'SCHEDULED' | 'EXCEPTION' | 'ISSUE';

interface Student {
  id: string;
  name: string;
  seatNumber: string;
  schedules: { startTime: string; endTime: string }[];
}

// 특이사항 타입 (병원, 가족행사 등)
interface DailyException {
  studentId: string;
  type: string; // '병원', '가족행사', '지각', '조퇴'
  note: string;
  startTime?: string;
  endTime?: string;
}

// 좌석 데이터 (배치도를 위해 좌표 x, y 사용 가능, 여기선 단순 그리드로 구현)
const SEAT_LAYOUT = [
  // A열 (창가 쪽 예시)
  { id: 'A-01' }, { id: 'A-02' }, { id: 'A-03' }, { id: 'A-04' },
  // B열
  { id: 'B-01' }, { id: 'B-02' }, { id: 'B-03' }, { id: 'B-04' },
  // C열
  { id: 'C-01' }, { id: 'C-02' }, { id: 'C-03' }, { id: 'C-04' },
  // D열
  { id: 'D-01' }, { id: 'D-02' }, { id: 'D-03' }, { id: 'D-04' },
];

// --- [2. 더미 데이터] ---
const MOCK_STUDENTS: Student[] = [
  { id: '1', name: '김철수', seatNumber: 'A-01', schedules: [{ startTime: '09:00', endTime: '22:00' }] },
  { id: '2', name: '이영희', seatNumber: 'A-03', schedules: [{ startTime: '14:00', endTime: '22:00' }] }, // 오후 등원
  { id: '3', name: '박민수', seatNumber: 'B-02', schedules: [{ startTime: '09:00', endTime: '22:00' }] },
  { id: '4', name: '최지우', seatNumber: 'C-04', schedules: [{ startTime: '09:00', endTime: '22:00' }] },
];

// [핵심] 오늘의 특이사항 데이터 (DB에서 가져올 내용)
const MOCK_EXCEPTIONS: DailyException[] = [
  { studentId: '3', type: '병원', note: '치과 진료', startTime: '14:00', endTime: '16:00' }, // 박민수 학생
  { studentId: '4', type: '지각', note: '학교 상담', startTime: '09:00', endTime: '17:00' }, // 최지우 학생
];

export default function PatrolPage() {
  const [currentTime, setCurrentTime] = useState<string>('14:30'); // 테스트용 고정 시간 (실제론 new Date())
  
  // 상태 변경 핸들러 (순찰 중 클릭 시)
  const handleSeatClick = (seatId: string, studentName: string | undefined) => {
    if (!studentName) return;
    const result = confirm(`[${seatId} ${studentName}] 학생의 상태를 변경하시겠습니까?\n(확인: 수면 적발 / 취소: 닫기)`);
    if (result) alert('수면 상태로 기록되었습니다.');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* 상단 컨트롤러 */}
      <div className="flex justify-between items-center mb-8 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">실시간 순찰 배치도</h1>
          <p className="text-gray-500">현재 적용 시간: {currentTime} (특이사항 자동 반영)</p>
        </div>
        <button 
          onClick={handlePrint}
          className="bg-gray-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-700 transition"
        >
          🖨️ 배치도 인쇄
        </button>
      </div>

      {/* 인쇄/화면 영역 */}
      <div className="bg-white p-6 rounded-xl border shadow-sm print:shadow-none print:border-none print:p-0">
        
        {/* 인쇄용 헤더 */}
        <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
          <h2 className="text-2xl font-bold">독서실 순찰 기록표</h2>
          <div className="flex justify-between mt-2 text-sm">
            <span>점검 시간: _____ 시 _____ 분</span>
            <span>담당자: (인) _____________</span>
          </div>
        </div>

        {/* [핵심] 좌석 그리드 (4열 배치 예시) */}
        <div className="grid grid-cols-4 gap-4 print:gap-2">
          {SEAT_LAYOUT.map((seat) => {
            // 1. 이 좌석의 학생 찾기
            const student = MOCK_STUDENTS.find(s => s.seatNumber === seat.id);
            
            // 2. 이 학생의 오늘 '특이사항' 찾기
            const exception = student 
              ? MOCK_EXCEPTIONS.find(e => e.studentId === student.id) 
              : null;

            // 3. 상태 결정 로직
            let status: SeatStatus = 'EMPTY';
            let displayNote = '';
            let bgColor = 'bg-gray-50'; // 기본 공석 색상
            let borderColor = 'border-gray-200';

            if (student) {
              // 특이사항이 있는가? (가장 우선순위 높음)
              if (exception) {
                status = 'EXCEPTION';
                displayNote = exception.type; // "병원", "지각" 등
                bgColor = 'bg-purple-100 print:bg-gray-100'; // 특이사항은 보라색
                borderColor = 'border-purple-300';
              } 
              // 스케줄 상 등원해야 하는 시간인가?
              else if (
                student.schedules.some(s => s.startTime <= currentTime && s.endTime >= currentTime)
              ) {
                status = 'SCHEDULED';
                displayNote = '입실 예정';
                bgColor = 'bg-green-50 print:bg-white'; // 정상 등원은 초록색 (인쇄시는 흰색)
                borderColor = 'border-green-400';
              }
              // 스케줄 외 시간 (아직 등원 전 or 하원 후)
              else {
                 displayNote = '스케줄 없음';
              }
            }

            return (
              <div 
                key={seat.id}
                onClick={() => handleSeatClick(seat.id, student?.name)}
                className={`
                  relative h-32 p-3 rounded-lg border-2 flex flex-col justify-between cursor-pointer transition hover:shadow-md
                  print:h-28 print:shadow-none
                  ${bgColor} ${borderColor}
                `}
              >
                {/* 좌석 번호 */}
                <div className="flex justify-between items-start">
                  <span className="text-sm font-bold text-gray-400">{seat.id}</span>
                  {/* 상태 뱃지 (특이사항 있을 때만 표시) */}
                  {status === 'EXCEPTION' && (
                    <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-bold print:text-black print:border print:border-black print:bg-white">
                      {displayNote}
                    </span>
                  )}
                </div>

                {/* 학생 정보 영역 */}
                <div className="text-center">
                  {student ? (
                    <>
                      <div className="text-lg font-bold text-gray-900">
                        {student.name}
                      </div>
                      {/* 특이사항 상세 내용 */}
                      {status === 'EXCEPTION' ? (
                        <div className="text-xs text-purple-700 mt-1 font-medium">
                          ({exception?.note})
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 mt-1">
                          {status === 'SCHEDULED' ? '학습중' : '-'}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-300 text-sm">공석</div>
                  )}
                </div>

                {/* 인쇄 시 체크박스 영역 (화면엔 안 보임) */}
                <div className="hidden print:flex justify-end mt-2">
                   <div className="w-4 h-4 border border-black rounded-sm"></div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-8 text-sm text-gray-500 print:block hidden">
            * 범례: [병원/지각] 등 특이사항이 있는 좌석은 점검 대상에서 제외하거나 사유를 확인하십시오.
        </div>
      </div>
    </div>
  );
}