import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, setDoc } from 'firebase/firestore';
import { DayOfWeek } from '../types/index';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error("🔥 [Error] Project ID가 설정되지 않았습니다.");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

const SCHEDULE_CSV_PATH = path.join(process.cwd(), 'data', '기본틀_방학.csv');

const COL_INDEX_MAP: Record<number, DayOfWeek> = {
  5: 'MON', 6: 'MON', 
  7: 'TUE', 8: 'TUE', 
  9: 'WED', 10: 'WED',
  11: 'THU', 12: 'THU', 
  13: 'FRI', 14: 'FRI', 
  15: 'SAT', 16: 'SAT', 
  17: 'SUN', 18: 'SUN'
};

// 1. 강력한 문자열 정제 (제어 문자 제거)
function cleanString(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    // eslint-disable-next-line
    .replace(/[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/g, '') // 제어 문자 및 BOM 제거
    .trim();
}

// 2. 시간 포맷 정규화 ("9" -> "09:00", "9:00" -> "09:00")
function formatTime(time: string): string {
  let cleaned = cleanString(time).replace(/:00:00$/, ':00'); // 초 단위 제거
  
  if (!cleaned) return '';
  
  // 숫자만 있는 경우 (예: "9") -> "09:00"
  if (/^\d+$/.test(cleaned)) {
    cleaned = `${cleaned}:00`;
  }
  
  // "9:00" -> "09:00" (앞에 0 채우기)
  if (cleaned.includes(':')) {
    const [hh, mm] = cleaned.split(':');
    const padH = hh.padStart(2, '0');
    const padM = (mm || '00').padEnd(2, '0').slice(0, 2);
    return `${padH}:${padM}`;
  }
  
  return ''; // 형식이 맞지 않으면 빈 문자열 반환
}

async function uploadStudents() {
  console.log('🔧 설정된 Project ID:', firebaseConfig.projectId);

  if (!fs.existsSync(SCHEDULE_CSV_PATH)) {
    console.error(`❌ 파일 없음: ${SCHEDULE_CSV_PATH}`);
    return;
  }

  // 파일 읽기 및 메타데이터 태그 제거
  let fileContent = fs.readFileSync(SCHEDULE_CSV_PATH, 'utf-8');
  fileContent = fileContent.replace(/^\uFEFF/, ''); 
  fileContent = fileContent.replace(/\\s*/g, ''); 
  
  const records = parse(fileContent, {
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  console.log(`📂 데이터 파싱 시작 (${records.length}개 행 발견)`);
  
  let successCount = 0;
  let failCount = 0;

  for (const [index, row] of records.entries()) {
    const seatNumber = cleanString(row[0]);
    const name = cleanString(row[2]);

    // 유효성 검사
    if (!seatNumber || !name || !/^(독|대)-\d{3}/.test(seatNumber)) {
      continue;
    }

    // 문서 ID에 쓸 수 없는 문자 제거
    const safeDocId = seatNumber.replace(/[\.\/]/g, '');

    const schedules: any[] = [];

    try {
      // 스케줄 파싱
      for (let i = 5; i <= 17; i += 2) {
        const day = COL_INDEX_MAP[i];
        let rawStart = row[i];     
        let rawEnd = row[i + 1];   

        if (!day) continue;
        
        rawStart = cleanString(rawStart);
        if (!rawStart || ['미등원', '자율 등원', '', 'X', '-', '공석'].some(v => rawStart.includes(v))) continue;

        // 시간 분리 (콤마, 줄바꿈)
        const startTimes = rawStart.split(/,|\n|\r/).map(t => formatTime(t));
        const endTimes = (rawEnd && typeof rawEnd === 'string') 
          ? String(rawEnd).split(/,|\n|\r/).map(t => formatTime(t)) 
          : [];

        startTimes.forEach((startTime, idx) => {
          if (!startTime) return;
          const endTime = endTimes[idx] || ''; 
          
          if (startTime) {
             schedules.push({
              day: String(day),
              startTime: String(startTime),
              endTime: String(endTime)
             });
          }
        });
      }

      // 최종 데이터 객체 (모든 값을 String으로 감싸서 안전하게)
      const studentData = {
        id: safeDocId,
        seatNumber: safeDocId,
        name: String(name),
        school: cleanString(row[3]),
        grade: cleanString(row[4]),
        status: '재원',
        schedules: schedules,
        mentoringSessions: [],
        memo: ''
      };

      // 순수 JSON 객체로 변환 (undefined 제거)
      const payload = JSON.parse(JSON.stringify(studentData));

      await setDoc(doc(db, "students", safeDocId), payload);
      successCount++;

    } catch (err: any) {
      console.error(`🔥 [Fail] ${seatNumber} (${name}) 업로드 실패`);
      console.error('   -> Error Code:', err.code);
      console.error('   -> Error Msg:', err.message);
      
      // 실패한 데이터가 무엇인지 로그 출력
      console.log('   -> Failed Payload:', JSON.stringify({
        id: safeDocId,
        schedules: schedules
      }, null, 2));
      
      failCount++;
    }
  }

  console.log(`\n🎉 완료! 성공: ${successCount}건, 실패: ${failCount}건`);
}

uploadStudents().catch(console.error);