'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Student } from '@/types';
import StudentModal from '@/components/StudentModal';

export default function StudentManagementPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // 실시간 데이터 로드
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
      const loadedStudents: Student[] = [];
      snapshot.forEach((doc) => {
        loadedStudents.push(doc.data() as Student);
      });
      // 좌석번호 순으로 정렬
      loadedStudents.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber));
      setStudents(loadedStudents);
    });
    return () => unsubscribe();
  }, []);

  // 검색 필터링
  const filteredStudents = students.filter(student => 
    student.name.includes(searchTerm) || 
    student.seatNumber.includes(searchTerm) ||
    student.school?.includes(searchTerm)
  );

  // 삭제 핸들러
  const handleDelete = async (id: string) => {
    if (confirm('정말 이 학생 데이터를 삭제하시겠습니까? (복구 불가)')) {
      await deleteDoc(doc(db, 'students', id));
    }
  };

  // 모달 열기
  const openModal = (student?: Student) => {
    setEditingStudent(student || null);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        
        {/* 헤더 */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🎓 학생 관리 (DB)</h1>
            <p className="text-gray-500 mt-1">총 {students.length}명의 학생 데이터가 있습니다.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="이름, 좌석, 학교 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-full md:w-64"
            />
            <button 
              onClick={() => openModal()} 
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-blue-700 whitespace-nowrap shadow-sm"
            >
              + 학생 등록
            </button>
          </div>
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 text-gray-600 text-sm uppercase">
                <tr>
                  <th className="p-4 border-b">좌석</th>
                  <th className="p-4 border-b">이름</th>
                  <th className="p-4 border-b">학교(학년)</th>
                  <th className="p-4 border-b">상태</th>
                  <th className="p-4 border-b">스케줄/멘토링</th>
                  <th className="p-4 border-b text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-bold text-gray-700">{student.seatNumber}</td>
                    <td className="p-4 font-medium text-gray-900">{student.name}</td>
                    <td className="p-4 text-gray-600">{student.school} <span className="text-xs text-gray-400">({student.grade})</span></td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold
                        ${student.status === '재원' ? 'bg-green-100 text-green-700' : 
                          student.status === '퇴원' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}
                      `}>
                        {student.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                      <div>🗓️ 스케줄: {student.schedules?.length || 0}개</div>
                      <div>👨‍🏫 멘토링: {student.mentoringSessions?.length || 0}개</div>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => openModal(student)}
                        className="text-blue-600 hover:text-blue-800 font-medium mr-3"
                      >
                        수정
                      </button>
                      <button 
                        onClick={() => handleDelete(student.id)}
                        className="text-red-400 hover:text-red-600 text-sm"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 모달 컴포넌트 */}
      <StudentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        studentToEdit={editingStudent} 
      />
    </div>
  );
}