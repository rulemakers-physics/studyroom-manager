'use client';
import { useState } from 'react';

export default function LunchPage() {
  const [selectedDate, setSelectedDate] = useState('');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">🍱 도시락 주문 현황</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 주문 통계 카드 */}
        <div className="bg-white p-6 rounded shadow border">
          <h2 className="text-lg font-bold mb-4">오늘의 주문 (2월 3일)</h2>
          <div className="text-4xl font-bold text-orange-600 mb-2">15개</div>
          <p className="text-gray-500 text-sm">마감 시간: 10:30 AM</p>
          <ul className="mt-4 space-y-2 border-t pt-4">
             {/* 더미 리스트 */}
             <li className="flex justify-between">
               <span>A-01 김철수</span>
               <span className="font-bold">일반</span>
             </li>
             <li className="flex justify-between">
               <span>B-03 이영희</span>
               <span className="font-bold text-green-600">샐러드</span>
             </li>
          </ul>
        </div>

        {/* 수동 주문 추가 (관리자용) */}
        <div className="bg-white p-6 rounded shadow border">
          <h2 className="text-lg font-bold mb-4">수동 주문 추가</h2>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="학생 이름 또는 좌석번호" 
              className="border p-2 rounded w-full"
            />
            <button className="bg-gray-900 text-white px-4 rounded">검색</button>
          </div>
          <div className="space-y-2">
            <button className="w-full bg-orange-100 text-orange-800 p-3 rounded font-bold hover:bg-orange-200">
              🍱 일반 도시락 추가
            </button>
            <button className="w-full bg-green-100 text-green-800 p-3 rounded font-bold hover:bg-green-200">
              🥗 샐러드 추가
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}