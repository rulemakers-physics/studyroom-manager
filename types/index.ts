export interface Schedule {
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
  startTime: string; // "08:00"
  endTime: string;   // "22:00"
}

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export interface TimeSlot {
  day: DayOfWeek;
  startTime: string; // "18:00"
  endTime: string;   // "22:00"
}

export interface MentoringSession {
  day: DayOfWeek;
  startTime: string; // "19:00"
  endTime: string;   // "19:30"
  mentorName: string; // "조승형"
  subject?: string;   // "수학"
}

export interface Student {
  id: string;             // Firebase Doc ID (자동 생성 or 좌석번호 활용)
  seatNumber: string;     // "독-001" (고유 ID로 사용 권장)
  name: string;           // "김채민"
  school: string;         // "한민고"
  grade: string;          // "2" (학년)
  phoneNumber?: string;   // 연락처 (신규퇴원현황 등에서 매핑 가능 시)
  status: '재원' | '휴원' | '퇴원' | '대기';
  
  // 정규 등하원 스케줄 (기본틀 파일 F열~ 참조)
  schedules: TimeSlot[]; 
  
  // 멘토링 스케줄 (멘토링배치 파일 참조)
  mentoringSessions: MentoringSession[];
  
  memo?: string; // 특이사항
}

export interface PatrolLog {
  id: string;
  timestamp: Date;
  checker: string;
  round: number; // 14시, 15시...
  issues: {
    studentId: string;
    seatNumber: string;
    status: '수면' | '이석' | '결석';
    note?: string;
  }[];
}