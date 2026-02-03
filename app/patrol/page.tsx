'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc, Timestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Student, DayOfWeek } from '@/types';

// --- 상수 및 레이아웃 정의 (기존과 동일하게 유지) ---
const SEAT_LAYOUT: (string | null | 'BIG_GAP')[][] = [
  ['독-088', 'BIG_GAP', '독-042', '독-041', '독-040', '독-039', '독-038', '독-037', '독-036', '독-035'],
  ['독-089', 'BIG_GAP', '독-043', '독-044', '독-045', '독-046', '독-047', '독-048', '독-049'],
  ['독-090', 'BIG_GAP', '독-056', '독-055', '독-054', '독-053', '독-052', '독-051', '독-050'],
  ['독-091', 'BIG_GAP', '독-057', '독-058', '독-059', '독-060', '독-061'],
  ['독-092', 'BIG_GAP', '독-067', '독-066', '독-065', '독-064', '독-063', '독-062'],
  ['독-093', 'BIG_GAP', '독-068', '독-069', '독-070', '독-071', '독-072', '독-073', '독-074', '독-075', '독-076', '독-077'],
  ['독-094'],
  ['독-095', 'BIG_GAP', '독-087', '독-086', '독-085', '독-084', '독-083', '독-082', '독-081', '독-080', '독-079', '독-078'],
  ['독-096'],
  ['독-097', 'BIG_GAP', '독-028', null, '독-009', '독-008', '독-007', '독-006', '독-005', '독-004', '독-003', '독-002', '독-001'],
  ['독-098', 'BIG_GAP', '독-010', '독-011', '독-012', '독-013', '독-014', '독-015', '독-016', '독-017', '독-018'],
  ['독-099', 'BIG_GAP', '독-027', '독-026', '독-025', '독-024', '독-023', '독-022', '독-021', '독-020', '독-019'],
  ['독-100', 'BIG_GAP', '독-029', '독-030', '독-031', '독-032', '독-033', '독-034'],
];

const WAITING_SEATS = [
  '대-001', '대-002', '대-003', '대-004', '대-005', '대-006', '대-007', 
  '대-008', '대-009', '대-010', '대-011', '대-012', '대-013'
];

// 헬퍼 함수: 현재 상태 분석 (다중 스케줄 지원)
const getStudentStatus = (student: Student, day: DayOfWeek, time: string) => {
  // 1. 멘토링 체크 (최우선)
  const mentoring = student.mentoringSessions?.find(s => 
    s.day === day && time >= s.startTime && time <= s.endTime
  );
  if (mentoring) {
    return { type: 'MENTORING', label: `멘토:${mentoring.mentorName}`, color: 'bg-purple-100 text-purple-900 border-purple-300' };
  }

  // 2. 오늘의 모든 정규 스케줄 가져오기
  const todaySchedules = student.schedules?.filter(s => s.day === day) || [];
  
  if (todaySchedules.length === 0) {
    return { type: 'FREE', label: '자율', color: 'bg-gray-50 text-gray-500 border-gray-200' };
  }

  // 3. 현재 시간이 스케줄에 포함되는지 확인 (학습중 판별)
  const activeSchedule = todaySchedules.find(s => {
    const isAfterStart = time >= s.startTime;
    const isBeforeEnd = s.endTime ? time <= s.endTime : true;
    return isAfterStart && isBeforeEnd;
  });

  if (activeSchedule) {
    if (student.status === '이석' || student.status === '외출') {
      return { type: 'AWAY', label: student.status, color: 'bg-yellow-100 text-yellow-800 border-yellow-300 ring-2 ring-yellow-400' };
    }
    return { type: 'STUDY', label: '학습중', color: 'bg-green-100 text-green-900 border-green-300 ring-1 ring-green-500' };
  }

  // 4. 스케줄 사이(중간 텀)이거나 등원 전인지 확인
  // 시간순 정렬
  todaySchedules.sort((a, b) => a.startTime.localeCompare(b.startTime));

  // 가장 빠른 등원 시간보다 전인가?
  if (time < todaySchedules[0].startTime) {
    return { type: 'BEFORE', label: `등원전(${todaySchedules[0].startTime})`, color: 'bg-blue-50 text-blue-400 border-blue-100' };
  }

  // 모든 하원 시간보다 후인가?
  const lastSchedule = todaySchedules[todaySchedules.length - 1];
  if (lastSchedule.endTime && time > lastSchedule.endTime) {
    return { type: 'AFTER', label: '하원완료', color: 'bg-gray-100 text-gray-400 border-gray-200' };
  }

  // 위 케이스에 안 걸리면 "스케줄 사이(밥 먹으러 감 등)"임
  // 다음 등원 시간을 찾아서 보여줌
  const nextSchedule = todaySchedules.find(s => time < s.startTime);
  if (nextSchedule) {
     return { type: 'BREAK', label: `재등원대기(${nextSchedule.startTime})`, color: 'bg-orange-50 text-orange-400 border-orange-200' };
  }

  return { type: 'FREE', label: '대기', color: 'bg-gray-50 text-gray-400' };
};

export default function PatrolPage() {
  const [students, setStudents] = useState<Record<string, Student>>({});
  const [now, setNow] = useState(new Date());
  
  // 현재 요일 및 시간 문자열 (HH:mm)
  const currentDay = useMemo(() => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days[now.getDay()] as DayOfWeek;
  }, [now]);

  const currentTime = useMemo(() => {
    return now.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' });
  }, [now]);

  // 1. Firebase 실시간 구독
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
      const studentMap: Record<string, Student> = {};
      snapshot.forEach((doc) => {
        studentMap[doc.id] = doc.data() as Student;
      });
      setStudents(studentMap);
    });

    // 2. 1분마다 시계 업데이트
    const timer = setInterval(() => setNow(new Date()), 60000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  // 좌석 클릭 핸들러 (상태 변경)
  const handleSeatClick = async (seatId: string) => {
    const student = students[seatId];
    
    if (!student) {
      const name = prompt(`[${seatId}] 신규 학생 등록 이름:`);
      if (name) {
        // 간편 등록 (추후 상세 페이지에서 수정 권장)
        await setDoc(doc(db, 'students', seatId), {
          id: seatId,
          seatNumber: seatId,
          name,
          status: '재원',
          schedules: [],
          mentoringSessions: []
        });
      }
      return;
    }

    // 상태 변경 메뉴
    const action = prompt(
      `[${student.name}] 상태 변경\n현재: ${student.status}\n\n1. 이석/외출\n2. 복귀(학습중)\n3. 하원/결석\n4. 메모 수정`, 
    );

    if (action === '1') {
      await updateDoc(doc(db, 'students', seatId), { status: '외출' });
    } else if (action === '2') {
      await updateDoc(doc(db, 'students', seatId), { status: '재원' });
    } else if (action === '3') {
      await updateDoc(doc(db, 'students', seatId), { status: '결석' });
    } else if (action === '4') {
      const newMemo = prompt('메모 입력:', student.memo || '');
      await updateDoc(doc(db, 'students', seatId), { memo: newMemo });
    }
  };

  const renderSeat = (seatId: string) => {
    const student = students[seatId];
    // 좌석 번호 라벨 (독- 제거)
    const seatLabel = seatId.replace('독-', '').replace('대-', '대기');
    
    // 학생이 없는 경우
    if (!student) {
      return (
        <div 
          key={seatId}
          onClick={() => handleSeatClick(seatId)}
          className="flex flex-col justify-center items-center w-[95px] h-[65px] m-0.5 rounded border border-gray-200 bg-gray-50 text-gray-300 cursor-pointer hover:bg-gray-100 transition"
        >
          <span className="text-xs">{seatLabel}</span>
          <span className="text-[10px]">-</span>
        </div>
      );
    }

    // 학생 상태 분석
    const statusInfo = getStudentStatus(student, currentDay, currentTime);
    
    // 퇴원생 처리 (순찰일지에서 흐리게 표시하거나 숨김)
    if (student.status === '퇴원') {
      return (
        <div key={seatId} className="w-[95px] h-[65px] m-0.5 border border-red-100 bg-red-50 flex flex-col justify-center items-center opacity-50">
          <span className="text-xs text-red-300">{seatLabel} (퇴원)</span>
        </div>
      );
    }

    return (
      <div 
        key={seatId}
        onClick={() => handleSeatClick(seatId)}
        className={`
          relative flex flex-col justify-between p-1.5 m-0.5 rounded-lg border transition cursor-pointer hover:shadow-md
          w-[95px] h-[65px] flex-shrink-0
          ${statusInfo.color}
        `}
      >
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-bold opacity-70">{seatLabel}</span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/50 border border-black/5 shadow-sm">
             {statusInfo.type === 'MENTORING' ? '멘토링' : statusInfo.label}
          </span>
        </div>
        
        <div className="text-center mt-1">
          <div className="font-bold text-sm truncate leading-tight">{student.name}</div>
          <div className="text-[9px] opacity-70 truncate">{student.school} {student.grade && `(${student.grade})`}</div>
        </div>

        {/* 특이사항(메모)이 있으면 점 표시 */}
        {student.memo && (
          <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-red-400 ring-1 ring-white" title={student.memo} />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 overflow-x-auto print:bg-white print:p-0">
      <div className="min-w-max mx-auto bg-white rounded-xl shadow-xl p-6 print:shadow-none print:p-0">
        
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🔍 실시간 순찰 현황판</h1>
            <p className="text-gray-500 text-sm mt-1">
              {now.toLocaleDateString('ko-KR')} ({currentDay}) {currentTime} 기준 
              <span className="ml-2 text-blue-600 font-bold">
                 • 재원생: {Object.values(students).filter(s => s.status === '재원').length}명
              </span>
            </p>
          </div>
          <div className="flex gap-3">
             <button 
              onClick={() => window.print()} 
              className="bg-gray-800 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-gray-700 transition shadow-sm flex items-center gap-2"
            >
              🖨️ 순찰일지 인쇄
            </button>
          </div>
        </div>

        {/* 인쇄용 헤더 */}
        <div className="hidden print:block mb-4 text-center">
          <h2 className="text-2xl font-bold border-b-2 border-black pb-2 mb-2">독서실 순찰 기록표</h2>
          <div className="flex justify-between text-sm px-4">
            <span>점검 일자: {now.toLocaleDateString()}</span>
            <span>점검자: ________________ (인)</span>
          </div>
        </div>

        {/* 좌석 배치도 */}
        <div className="flex flex-col gap-1 select-none">
          {SEAT_LAYOUT.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="flex items-center">
              {row.map((item, idx) => {
                if (item === 'BIG_GAP') return <div key={`gap-${rowIndex}-${idx}`} className="w-16 print:w-8 flex-shrink-0" />;
                if (item === null) return <div key={`gap-${rowIndex}-${idx}`} className="w-6 print:w-4 flex-shrink-0" />;
                return renderSeat(item as string);
              })}
            </div>
          ))}
        </div>

        {/* 구분선 */}
        <div className="my-6 border-t-2 border-dashed border-gray-200 print:my-4"></div>

        {/* 대기석 */}
        <div>
          <h3 className="text-md font-bold mb-3 text-gray-600 px-1 flex items-center gap-2">
            <span>🛋️ 로비 대기석</span>
            <span className="text-xs font-normal text-gray-400">(자율 학습 및 대기)</span>
          </h3>
          <div className="flex flex-wrap gap-1">
            {WAITING_SEATS.map((seatId) => renderSeat(seatId))}
          </div>
        </div>

        {/* 범례 (Legend) */}
        <div className="mt-8 flex flex-wrap gap-4 text-xs text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-100 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-100 border border-green-300 ring-1 ring-green-500 rounded"></div> 
            <span>학습중 (정규시간)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div> 
            <span>멘토링 진행중</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 ring-2 ring-yellow-400 rounded"></div> 
            <span>이석/외출/잠시비움</span>
          </div>
           <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-50 border border-blue-100 rounded"></div> 
            <span>등원 전</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div> 
            <span>특이사항 메모 있음</span>
          </div>
        </div>

      </div>
    </div>
  );
}