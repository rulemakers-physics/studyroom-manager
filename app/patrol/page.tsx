'use client';

import { useState } from 'react';
import { ALL_STUDENTS } from '@/lib/students';
import { Student } from '@/types';

// 순찰일지.csv와 완전히 동일한 2차원 배열 구조
// BIG_GAP: 독-088 라인과 나머지 좌석 사이의 큰 간격
// null: 좌석 사이의 작은 간격 (복도 등)
const SEAT_LAYOUT: (string | null | 'BIG_GAP')[] [] = [
  // Row 1: 독-088 | (큰간격) | 독-042 ~ 독-035 (역순)
  ['독-088', 'BIG_GAP', '독-042', '독-041', '독-040', '독-039', '독-038', '독-037', '독-036', '독-035'],
  
  // Row 2: 독-089 | (큰간격) | 독-043 ~ 독-049
  ['독-089', 'BIG_GAP', '독-043', '독-044', '독-045', '독-046', '독-047', '독-048', '독-049'],
  
  // Row 3: 독-090 | (큰간격) | 독-056 ~ 독-050 (역순)
  ['독-090', 'BIG_GAP', '독-056', '독-055', '독-054', '독-053', '독-052', '독-051', '독-050'],
  
  // Row 4: 독-091 | (큰간격) | 독-057 ~ 독-061
  ['독-091', 'BIG_GAP', '독-057', '독-058', '독-059', '독-060', '독-061'],
  
  // Row 5: 독-092 | (큰간격) | 독-067 ~ 독-062 (역순)
  ['독-092', 'BIG_GAP', '독-067', '독-066', '독-065', '독-064', '독-063', '독-062'],
  
  // Row 6: 독-093 | (큰간격) | 독-068 ~ 독-077
  ['독-093', 'BIG_GAP', '독-068', '독-069', '독-070', '독-071', '독-072', '독-073', '독-074', '독-075', '독-076', '독-077'],
  
  // Row 7: 독-094 (단독)
  ['독-094'],
  
  // Row 8: 독-095 | (큰간격) | 독-087 ~ 독-078 (역순)
  ['독-095', 'BIG_GAP', '독-087', '독-086', '독-085', '독-084', '독-083', '독-082', '독-081', '독-080', '독-079', '독-078'],
  
  // Row 9: 독-096 (단독)
  ['독-096'],
  
  // Row 10: 독-097 | (큰간격) | 독-028 | (작은간격) | 독-009 ~ 독-001 (역순)
  ['독-097', 'BIG_GAP', '독-028', null, '독-009', '독-008', '독-007', '독-006', '독-005', '독-004', '독-003', '독-002', '독-001'],
  
  // Row 11: 독-098 | (큰간격) | 독-010 ~ 독-018
  ['독-098', 'BIG_GAP', '독-010', '독-011', '독-012', '독-013', '독-014', '독-015', '독-016', '독-017', '독-018'],
  
  // Row 12: 독-099 | (큰간격) | 독-027 ~ 독-019 (역순)
  ['독-099', 'BIG_GAP', '독-027', '독-026', '독-025', '독-024', '독-023', '독-022', '독-021', '독-020', '독-019'],
  
  // Row 13: 독-100 | (큰간격) | 독-029 ~ 독-034
  ['독-100', 'BIG_GAP', '독-029', '독-030', '독-031', '독-032', '독-033', '독-034'],
];

const WAITING_SEATS = [
  '대-001', '대-002', '대-003', '대-004', '대-005', '대-006', '대-007', 
  '대-008', '대-009', '대-010', '대-011', '대-012', '대-013'
];

export default function PatrolPage() {
  const [currentTime] = useState<string>(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
  const [patrolStatus, setPatrolStatus] = useState<Record<string, string>>({});

  const handleSeatClick = (seatId: string, student: Student | undefined) => {
    if (!student) {
      alert(`[${seatId}] 공석입니다.`);
      return;
    }
    const currentStatus = patrolStatus[student.id] || student.status;
    const result = prompt(`[${seatId} ${student.name}] 상태 변경 (현재: ${currentStatus})`, "수면, 이석, 결석, 하원, 외출");
    
    if (result) {
      setPatrolStatus(prev => ({
        ...prev,
        [student.id]: result
      }));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderSeat = (seatId: string) => {
    const student = ALL_STUDENTS.find(s => s.seatNumber === seatId);
    const displayStatus = student ? (patrolStatus[student.id] || student.status) : null;

    let bgColor = 'bg-white';
    let borderColor = 'border-gray-300';
    let textColor = 'text-gray-900';

    if (student) {
      if (['결석', '휴원', '퇴원'].includes(displayStatus || '')) {
        bgColor = 'bg-red-50';
        borderColor = 'border-red-200';
        textColor = 'text-red-600';
      } else if (['지각', '수면', '이석', '외출', '조퇴'].includes(displayStatus || '')) {
        bgColor = 'bg-yellow-50';
        borderColor = 'border-yellow-200';
        textColor = 'text-yellow-700';
      } else {
        bgColor = 'bg-blue-50';
        borderColor = 'border-blue-200';
        textColor = 'text-blue-900';
      }
    } else {
      bgColor = 'bg-gray-50';
      textColor = 'text-gray-400';
    }

    // 좌석 번호에서 '독-' 접두사 제거 (시각적 깔끔함)
    const seatLabel = seatId.replace('독-', '');

    return (
      <div 
        key={seatId}
        onClick={() => handleSeatClick(seatId, student)}
        className={`
          flex flex-col justify-between p-1 m-0.5 rounded border transition cursor-pointer hover:shadow-md
          w-[95px] h-[65px] flex-shrink-0 
          print:w-[85px] print:h-[55px] print:text-xs print:border-gray-400
          ${bgColor} ${borderColor}
        `}
      >
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-bold text-gray-500">{seatLabel}</span>
          {student && displayStatus !== '재원' && displayStatus !== '등원' && (
            <span className="text-[9px] font-bold px-1 rounded bg-white border border-gray-200">
              {displayStatus}
            </span>
          )}
        </div>
        <div className="text-center">
          {student ? (
            <>
              <div className={`font-bold text-sm truncate ${textColor}`}>{student.name}</div>
              {student.school && <div className="text-[9px] text-gray-500 truncate">{student.school}</div>}
            </>
          ) : (
            <div className="text-xs text-gray-300">-</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 overflow-x-auto print:bg-white print:p-0">
      <div className="min-w-max mx-auto bg-white rounded-xl shadow-lg p-8 print:shadow-none print:p-0">
        
        {/* 상단 헤더 */}
        <div className="flex justify-between items-center mb-8 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">독서실 순찰일지</h1>
            <p className="text-gray-500 mt-1">현재 시각: {currentTime}</p>
          </div>
          <button 
            onClick={handlePrint} 
            className="bg-gray-900 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-gray-800 transition flex items-center gap-2 shadow-sm"
          >
            🖨️ 인쇄하기
          </button>
        </div>

        {/* 인쇄용 헤더 (화면엔 숨김) */}
        <div className="hidden print:block mb-6">
          <h2 className="text-2xl font-bold border-b-2 border-black pb-2 mb-2 text-center">독서실 순찰 기록표</h2>
          <div className="flex justify-between text-sm px-2">
            <span>점검 일자: ____________________</span>
            <span>점검자: ____________________ (인)</span>
          </div>
        </div>

        {/* 좌석 배치도 본문 */}
        <div className="flex flex-col gap-1.5">
          {SEAT_LAYOUT.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="flex items-center">
              {row.map((item, idx) => {
                // 큰 간격 (독-088 등과 나머지 사이)
                if (item === 'BIG_GAP') {
                  return <div key={`gap-${idx}`} className="w-16 print:w-12 flex-shrink-0"></div>;
                }
                // 작은 간격 (독-028과 독-009 사이 등)
                if (item === null) {
                  return <div key={`gap-${idx}`} className="w-6 print:w-4 flex-shrink-0"></div>;
                }
                // 실제 좌석 렌더링
                return renderSeat(item as string);
              })}
            </div>
          ))}
        </div>
        
        {/* 구분선 */}
        <div className="my-8 border-t-2 border-dashed border-gray-300 print:my-6"></div>
        
        {/* 대기석 */}
        <div>
          <h3 className="text-lg font-bold mb-3 text-gray-700 print:text-base print:mb-2 px-1">대기 좌석 (Lobby)</h3>
          <div className="flex flex-wrap gap-1.5">
            {WAITING_SEATS.map((seatId) => renderSeat(seatId))}
          </div>
        </div>

        {/* 하단 범례 */}
        <div className="mt-8 flex gap-6 text-sm text-gray-600 print:text-xs print:mt-6 px-2 bg-gray-50 p-4 rounded-lg print:bg-transparent print:p-0">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div> 
            <span>등원/재원</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div> 
            <span>지각/이석/수면</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div> 
            <span>결석</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 border border-gray-300 rounded"></div> 
            <span>공석</span>
          </div>
        </div>

      </div>
    </div>
  );
}