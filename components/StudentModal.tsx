'use client';

import { useState, useEffect } from 'react';
import { Student, DayOfWeek, TimeSlot, MentoringSession } from '@/types';
import { doc, setDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studentToEdit?: Student | null; // null이면 신규 등록
}

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const EMPTY_STUDENT: Omit<Student, 'id'> = {
  seatNumber: '',
  name: '',
  school: '',
  grade: '',
  status: '재원',
  schedules: [],
  mentoringSessions: [],
  memo: ''
};

export default function StudentModal({ isOpen, onClose, studentToEdit }: Props) {
  const [formData, setFormData] = useState<Student | any>(EMPTY_STUDENT);

  // 모달 열릴 때 데이터 초기화
  useEffect(() => {
    if (studentToEdit) {
      setFormData(studentToEdit);
    } else {
      setFormData(EMPTY_STUDENT);
    }
  }, [studentToEdit, isOpen]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  // --- 스케줄 관리 로직 ---
  const addSchedule = () => {
    setFormData((prev: any) => ({
      ...prev,
      schedules: [...(prev.schedules || []), { day: 'MON', startTime: '09:00', endTime: '12:00' }]
    }));
  };

  const removeSchedule = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      schedules: prev.schedules.filter((_: any, i: number) => i !== index)
    }));
  };

  const updateSchedule = (index: number, field: keyof TimeSlot, value: string) => {
    const newSchedules = [...(formData.schedules || [])];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setFormData((prev: any) => ({ ...prev, schedules: newSchedules }));
  };

  // --- 멘토링 관리 로직 ---
  const addMentoring = () => {
    setFormData((prev: any) => ({
      ...prev,
      mentoringSessions: [...(prev.mentoringSessions || []), { day: 'WED', startTime: '19:00', endTime: '19:30', mentorName: '조승형' }]
    }));
  };

  const removeMentoring = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      mentoringSessions: prev.mentoringSessions.filter((_: any, i: number) => i !== index)
    }));
  };

  const updateMentoring = (index: number, field: keyof MentoringSession, value: string) => {
    const newSessions = [...(formData.mentoringSessions || [])];
    newSessions[index] = { ...newSessions[index], [field]: value };
    setFormData((prev: any) => ({ ...prev, mentoringSessions: newSessions }));
  };

  // --- 저장 ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.seatNumber || !formData.name) return alert('좌석번호와 이름은 필수입니다.');

      // 좌석번호를 ID로 사용 (고유값 보장 필요)
      await setDoc(doc(db, 'students', formData.seatNumber), {
        ...formData,
        id: formData.seatNumber // ID 필드 명시
      });
      
      onClose();
      alert('저장되었습니다.');
    } catch (error) {
      console.error(error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {studentToEdit ? '학생 정보 수정' : '신규 학생 등록'}
            </h2>
            <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2">기본 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">좌석 번호 (ID)</label>
                  <input
                    type="text"
                    required
                    value={formData.seatNumber}
                    onChange={(e) => handleChange('seatNumber', e.target.value)}
                    className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 독-001"
                    disabled={!!studentToEdit} // 수정 시 ID 변경 불가
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">상태</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full border rounded p-2"
                  >
                    <option value="재원">재원</option>
                    <option value="휴원">휴원</option>
                    <option value="퇴원">퇴원</option>
                    <option value="대기">대기</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">이름</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full border rounded p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">학교</label>
                  <input
                    type="text"
                    value={formData.school}
                    onChange={(e) => handleChange('school', e.target.value)}
                    className="w-full border rounded p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">학년</label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e) => handleChange('grade', e.target.value)}
                    className="w-full border rounded p-2"
                    placeholder="예: 2, N수"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">메모 (특이사항)</label>
                <textarea
                  value={formData.memo}
                  onChange={(e) => handleChange('memo', e.target.value)}
                  className="w-full border rounded p-2 h-20 resize-none"
                />
              </div>
            </div>

            {/* 스케줄 및 멘토링 */}
            <div className="space-y-6">
              {/* 정규 등원 스케줄 */}
              <div>
                <div className="flex justify-between items-center border-b pb-2 mb-3">
                  <h3 className="font-semibold text-gray-700">등/하원 시간표</h3>
                  <button type="button" onClick={addSchedule} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200">
                    + 시간 추가
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                  {formData.schedules?.map((sch: TimeSlot, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={sch.day}
                        onChange={(e) => updateSchedule(idx, 'day', e.target.value as DayOfWeek)}
                        className="w-16 border rounded p-1 text-sm bg-gray-50"
                      >
                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <input
                        type="time"
                        value={sch.startTime}
                        onChange={(e) => updateSchedule(idx, 'startTime', e.target.value)}
                        className="border rounded p-1 text-sm"
                      />
                      <span className="text-gray-400">~</span>
                      <input
                        type="time"
                        value={sch.endTime}
                        onChange={(e) => updateSchedule(idx, 'endTime', e.target.value)}
                        className="border rounded p-1 text-sm"
                      />
                      <button type="button" onClick={() => removeSchedule(idx)} className="text-red-400 hover:text-red-600">×</button>
                    </div>
                  ))}
                  {formData.schedules?.length === 0 && <p className="text-xs text-gray-400 text-center py-2">등록된 스케줄이 없습니다.</p>}
                </div>
              </div>

              {/* 멘토링 스케줄 */}
              <div>
                <div className="flex justify-between items-center border-b pb-2 mb-3">
                  <h3 className="font-semibold text-gray-700">멘토링 시간</h3>
                  <button type="button" onClick={addMentoring} className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded hover:bg-purple-200">
                    + 멘토링 추가
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                  {formData.mentoringSessions?.map((session: MentoringSession, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center flex-wrap">
                       <select
                        value={session.day}
                        onChange={(e) => updateMentoring(idx, 'day', e.target.value as DayOfWeek)}
                        className="w-16 border rounded p-1 text-sm bg-gray-50"
                      >
                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <input
                        type="time"
                        value={session.startTime}
                        onChange={(e) => updateMentoring(idx, 'startTime', e.target.value)}
                        className="border rounded p-1 text-sm"
                      />
                      <input
                        type="text"
                        value={session.mentorName}
                        onChange={(e) => updateMentoring(idx, 'mentorName', e.target.value)}
                        className="w-16 border rounded p-1 text-sm"
                        placeholder="멘토명"
                      />
                      <button type="button" onClick={() => removeMentoring(idx)} className="text-red-400 hover:text-red-600">×</button>
                    </div>
                  ))}
                  {formData.mentoringSessions?.length === 0 && <p className="text-xs text-gray-400 text-center py-2">등록된 멘토링이 없습니다.</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">취소</button>
            <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm">
              {studentToEdit ? '수정사항 저장' : '학생 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}