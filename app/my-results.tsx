"use client";
import type { StudentProfile } from '@/lib/diagnosis-model';
import type { PortalPage } from './student-portal';
import LearningJourney from './learning-journey';
export default function MyResults({ student, onNavigate }: { student: StudentProfile | null; onNavigate: (page: PortalPage) => void }) {
  return <section className="container results-content">{student ? <LearningJourney key={student.id} student={student} onDiagnose={() => onNavigate('diagnosis')}/> : <div className="page-intro"><p className="eyebrow">나의 학습</p><h1>로그인하고 나의 배움 기록을 확인해요.</h1><p>진단 결과, 오답 분석과 연습 기록을 이어 볼 수 있어요.</p><button className="button button-primary" onClick={() => onNavigate('login')}>로그인</button></div>}</section>;
}
