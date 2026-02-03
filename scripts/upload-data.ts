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

// 1. 문자열 정제 (줄바꿈 문자는 보존하고, 기타 제어 문자만 제거)
function cleanString(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    // 줄바꿈(\n, \r)은 남기고 나머지 제어 문자만 제거
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/g, '') 
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
    const parts = cleaned.split(':');
    const hh = parts[0].padStart(2, '0');
    // 분이 없으면 00으로 처리
    const mm = (parts[1] || '00').padEnd(2, '0').slice(0, 2);
    return `${hh}:${mm}`;
  }
  
  return ''; 
}

async function uploadStudents() {
  console.log('🔧 설정된 Project ID:', firebaseConfig.projectId);

  if (!fs.existsSync(SCHEDULE_CSV_PATH)) {
    console.error(`❌ 파일 없음: ${SCHEDULE_CSV_PATH}`);
    return;
  }

  // 파일 읽기 및 BOM 제거 (불필요한 전체 공백 제거 로직 삭제함)
  let fileContent = fs.readFileSync(SCHEDULE_CSV_PATH, 'utf-8');
  fileContent = fileContent.replace(/^\uFEFF/, ''); 
  
  const records = parse(fileContent, {
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  console.log(`📂 데이터 파싱 시작 (${records.length}개 행 발견)`);
  
  let successCount = 0;
  let failCount = 0;

  for (const [index, row] of records.entries()) {
    // 헤더 행이거나 데이터가 없는 행 건너뛰기
    if (index === 0 && (row[0] === '' || row[0].includes('source'))) continue;

    const seatNumber = cleanString(row[0]);
    const name = cleanString(row[2]); // C열: 이름

    // 유효성 검사 (좌석번호 형식 확인)
    if (!seatNumber || !name || !/^(독|대)-\d{3}/.test(seatNumber)) {
      continue;
    }

    const safeDocId = seatNumber.replace(/[\.\/]/g, '');
    const schedules: any[] = [];

    try {
      // 스케줄 파싱 (F열 ~ R열)
      for (let i = 5; i <= 17; i += 2) {
        const day = COL_INDEX_MAP[i];
        if (!day) continue;

        let rawStart = cleanString(row[i]);     
        let rawEnd = cleanString(row[i + 1]);   

        // "미등원" 등 제외 키워드 체크
        if (!rawStart || ['미등원', '자율 등원', 'X', '-', '공석'].some(v => rawStart.includes(v))) continue;

        // 시간 분리 (콤마, 줄바꿈으로 구분된 여러 시간대 처리)
        // 예: "09:00, 14:00"
        const startTimes = rawStart.split(/,|\n|\r/).map(t => formatTime(t)).filter(t => t);
        const endTimes = rawEnd ? rawEnd.split(/,|\n|\r/).map(t => formatTime(t)) : [];

        startTimes.forEach((startTime, idx) => {
          const endTime = endTimes[idx] || (endTimes.length > 0 ? endTimes[endTimes.length - 1] : '');
          
          schedules.push({
            day: String(day),
            startTime: String(startTime),
            endTime: String(endTime)
          });
        });
      }

      // 최종 데이터 객체
      const studentData = {
        id: safeDocId,
        seatNumber: safeDocId,
        name: String(name),
        school: cleanString(row[3]),
        grade: cleanString(row[4]),
        status: '재원',
        schedules: schedules,
        // 멘토링 세션: 현재 CSV에는 멘토링 정보가 없으므로 빈 배열입니다.
        // 만약 멘토링 정보가 있다면 위 스케줄 파싱처럼 별도 컬럼에서 읽어야 합니다.
        mentoringSessions: [], 
        memo: ''
      };

      // Firestore에 업로드 (merge: true 옵션 사용 고려 가능)
      // 여기서는 기존 데이터를 덮어씁니다.
      const payload = JSON.parse(JSON.stringify(studentData));
      await setDoc(doc(db, "students", safeDocId), payload);
      
      // 디버깅용: 스케줄이 비어있으면 경고
      if (schedules.length === 0) {
        console.warn(`⚠️ [Warning] ${seatNumber} ${name}: 스케줄이 0개입니다.`);
      }

      successCount++;

    } catch (err: any) {
      console.error(`🔥 [Fail] ${seatNumber} (${name}) 업로드 실패:`, err.message);
      failCount++;
    }
  }

  console.log(`\n🎉 완료! 성공: ${successCount}건, 실패: ${failCount}건`);
}

uploadStudents().catch(console.error);