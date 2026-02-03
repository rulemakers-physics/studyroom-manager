export interface Schedule {
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
  startTime: string; // "08:00"
  endTime: string;   // "22:00"
}

export interface Student {
  id: string;        // Firebase Doc ID
  name: string;
  seatNumber: string; // "A-01"
  school?: string;
  status: '재원' | '휴원';
  schedules: Schedule[]; // 요일별 스케줄
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