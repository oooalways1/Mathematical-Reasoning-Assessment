"use client";
import { useEffect, useState } from 'react';
import type { DiagnosisResult, StudentProfile } from '@/lib/diagnosis-model';
import type { PortalPage } from './student-portal';
export default function MyResults({ student, onNavigate }: { student: StudentProfile | null; onNavigate: (page: PortalPage) => void }) {
  const [results, setResults] = useState<DiagnosisResult[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!student) return; let active = true; setLoading(true);
    fetch('/api/diagnosis', { cache: 'no-store' }).then(async response => { const data = await response.json() as { results: DiagnosisResult[]; error?: string }; if (!response.ok) throw new Error(data.error); if (active) setResults(data.results); }).catch(error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [student?.id]);
  return <section className="container results-content"><div className="page-intro"><p className="eyebrow">나의 결과</p><h1>{student ? `${student.name}님의 배움 기록` : '로그인하고 나의 결과를 확인해요.'}</h1><p>저장한 결과는 다시 로그인해도 확인할 수 있어요.</p></div>{!student ? <button className="button button-primary" onClick={() => onNavigate('login')}>로그인</button> : <>{loading && <p role="status">진단 결과를 불러오고 있어요.</p>}{error && <p className="alert" role="alert">{error}</p>}{!loading && !error && !results.length && <div className="panel results-empty"><h2>아직 제출한 진단이 없어요.</h2><button className="button button-primary" onClick={() => onNavigate('diagnosis')}>진단하기</button></div>}<div className="saved-results">{results.map(result => <article className="panel" key={result.id}><p className="eyebrow">{result.grade}학년 · {result.submissionMethod === 'scan' ? '파일 답안' : '직접 입력'}</p><h2>{result.totalScore} / {result.maxScore}점</h2><p>{new Date(result.completedAt).toLocaleString('ko-KR')}</p><div className="result-areas">{Object.entries(result.domains).map(([domain, score]) => <span key={domain}>{domain}<strong>{score}%</strong></span>)}</div><small>해당 진단에서 다룬 영역의 점수를 표시합니다.</small></article>)}</div></>}</section>;
}
