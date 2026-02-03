import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, writeBatch } from 'firebase/firestore';
import { DayOfWeek } from '../types/index';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

const SCHEDULE_CSV_PATH = path.join(process.cwd(), 'data', '기본틀_방학.csv');

const COL_INDEX_MAP: Record<number, DayOfWeek> = {
  5: 'MON', 6: 'MON', 7: 'TUE', 8: 'TUE', 9: 'WED', 10: 'WED',
  11: 'THU', 12: 'THU', 13: 'FRI', 14: 'FRI', 15: 'SAT', 16: 'SAT', 17: 'SUN', 18: 'SUN'
};

// 안전하게 undefined 제거하는 함수
function sanitize(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

async function uploadStudents() {
  if (!fs.existsSync(SCHEDULE_CSV_PATH)) {
    console.error(`❌ 파일 없음: ${SCHEDULE_CSV_PATH}`);
    return;
  }

  const csvContent = fs.readFileSync(SCHEDULE_CSV_PATH, 'utf-8');
  const records = parse(csvContent, {
    from_line: 4,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  const batch = writeBatch(db);
  let count = 0;

  console.log(`📂 데이터 파싱 시작 (${records.length}개 행 발견)`);

  for (const [index, row] of records.entries()) {
    try {
      const seatNumber = row[0]?.trim();
      const name = row[2]?.trim();
      
      if (!seatNumber || !name || seatNumber === '좌석번호' || seatNumber.startsWith('좌석')) continue;

      const schedules: any[] = [];

      // F열(5) ~ S열(17) 순회
      for (let i = 5; i <= 17; i += 2) {
        const day = COL_INDEX_MAP[i];
        let rawStart = row[i];     // 등원 시간
        let rawEnd = row[i + 1];   // 하원 시간

        // 1. 값 유효성 체크
        if (!day) continue;
        if (!rawStart || typeof rawStart !== 'string') continue;
        
        rawStart = rawStart.trim();
        if (['미등원', '자율 등원', '', 'X'].includes(rawStart)) continue;

        // 2. 다중 시간표 처리 (콤마 분리)
        const startTimes = rawStart.split(',').map(t => t.trim().replace(/:00$/, ''));
        const endTimes = (rawEnd && typeof rawEnd === 'string') 
          ? rawEnd.split(',').map(t => t.trim().replace(/:00$/, '')) 
          : [];

        startTimes.forEach((startTime, idx) => {
          if (!startTime) return;
          
          // 하원 시간이 없으면 빈 문자열로 처리 (undefined 방지)
          const endTime = endTimes[idx] || ''; 
          
          schedules.push({
            day,
            startTime,
            endTime
          });
        });
      }

      // 3. 최종 데이터 객체 생성 (undefined 원천 차단)
      const studentData = {
        id: seatNumber,
        seatNumber: seatNumber || '',
        name: name || '',
        school: row[3] || '',
        grade: row[4] || '',
        status: '재원',
        schedules: schedules, // 여기서 undefined가 포함될 수 없음
        mentoringSessions: [],
        memo: ''
      };

      // 4. JSON 변환을 통한 2차 세탁 (가장 중요)
      const safeData = sanitize(studentData);

      batch.set(doc(db, "students", seatNumber), safeData);
      count++;

    } catch (err) {
      console.error(`❌ ${index + 4}행 처리 중 오류:`, err);
    }
  }

  try {
    await batch.commit();
    console.log(`✅ 총 ${count}명의 학생 데이터가 성공적으로 업로드되었습니다!`);
  } catch (error) {
    console.error("🔥 Firestore 업로드 실패 (Batch Commit Error):", error);
  }
}

uploadStudents().catch(console.error);