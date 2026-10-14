"use client";
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ClipboardList, FileUp, ScanLine, ShieldCheck } from 'lucide-react';
import { GRADES, QUESTION_COUNT, questionBlueprints, type Grade } from '@/lib/diagnosis-blueprint';
import type { DiagnosisResult, StudentProfile } from '@/lib/diagnosis-model';
import { readAnswerFiles, type ScanResult } from '@/lib/scan-answers';
import type { PortalPage } from './student-portal';

export default function Diagnosis({ student, initialGrade, sessionLoading, onNavigate }: { student: StudentProfile | null; initialGrade: Grade; sessionLoading: boolean; onNavigate: (page: PortalPage) => void }) {
  const [previewGrade, setPreviewGrade] = useState(initialGrade);
  const grade = student?.grade ?? previewGrade;
  const [method, setMethod] = useState<'manual' | 'scan' | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ ready: boolean; keyVersion: string | null } | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(''), [scan, setScan] = useState<ScanResult | null>(null);
  const [files, setFiles] = useState<File[]>([]), [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const abortRef = useRef<AbortController | null>(null), postingRef = useRef(false);
  const items = questionBlueprints[grade];
  const answered = items.filter(item => answers[item.id]?.trim()).length;
  useEffect(() => {
    let active = true; setStatus(null);
    if (student) fetch('/api/diagnosis/status', { cache: 'no-store' }).then(async response => {
      const data = await response.json() as { ready: boolean; keyVersion: string | null; error?: string }; if (!response.ok) throw new Error(data.error || '진단 준비 상태를 확인하지 못했습니다.');
      if (active) setStatus(data);
    }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [student?.id]);
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!answered || result) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [answered, result]);
  async function recognize() {
    if (busy) return;
    setError(''); setBusy(true); setConfirmed(false); setScan(null);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const data = await readAnswerFiles(files, grade, setProgress, controller.signal);
      if (!controller.signal.aborted) { setScan(data); setAnswers(data.answers); }
    } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '답안을 읽지 못했어요. 수동 입력을 이용해 주세요.'); }
    finally { if (abortRef.current === controller) { setBusy(false); setProgress(''); abortRef.current = null; } }
  }
  async function submit() {
    if (postingRef.current) return;
    if (!student) { onNavigate('login'); return; }
    if (!status?.ready || !status.keyVersion) { setError('선생님이 정답표를 등록하면 채점할 수 있어요.'); return; }
    if (method === 'scan' && (!scan || !confirmed)) { setError('인식된 20문항의 답을 확인한 뒤 확인 항목을 선택해 주세요.'); return; }
    postingRef.current = true; setSubmitting(true); setError('');
    try {
      const response = await fetch('/api/diagnosis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: Object.fromEntries(items.map(item => [item.id, answers[item.id]?.trim() ?? ''])), method, keyVersion: status.keyVersion }) });
      const data = await response.json() as { result: DiagnosisResult; error?: string }; if (!response.ok) throw new Error(data.error || '결과를 저장하지 못했어요.');
      setResult(data.result);
    } catch (error) { setError(error instanceof Error ? error.message : '결과를 저장하지 못했어요.'); }
    finally { postingRef.current = false; setSubmitting(false); }
  }
  if (sessionLoading) return <section className="container diagnosis-content"><p role="status">가입한 학년을 확인하고 있어요.</p></section>;
  if (result) return <section className="container diagnosis-content"><div className="panel diagnosis-complete"><ShieldCheck size={44}/><p className="eyebrow">채점과 저장 완료</p><h1>{grade}학년 진단 결과</h1><strong className="diagnosis-score">{result.totalScore}<small> / {result.maxScore}점</small></strong><p>학생 계정에 결과를 저장했어요. 다시 로그인해도 나의 결과에서 확인할 수 있어요.</p><div className="result-areas">{Object.entries(result.domains).map(([domain, score]) => <span key={domain}>{domain}<strong>{score}%</strong></span>)}</div><button className="button button-primary" onClick={() => onNavigate('results')}>나의 결과 보기 <ArrowRight size={18}/></button></div></section>;
  return <section className="container diagnosis-content">
    <div className="page-intro"><p className="eyebrow">진단하기</p><h1>{student ? `${student.name}님의 ${grade}학년 진단` : '우리 학년의 진단을 시작해요.'}</h1><p>{student ? '가입한 학년이 자동으로 선택됐어요. 답안 제출 방법을 골라 주세요.' : '회원가입 또는 로그인하면 가입한 학년으로 진단할 수 있어요.'}</p></div>
    {!student && <><div className="button-row"><button className="button button-primary" onClick={() => onNavigate('login')}>로그인</button><button className="button button-outline" onClick={() => onNavigate('signup')}>회원가입</button></div><fieldset className="grade-grid"><legend>학년별 답안 미리보기</legend>{GRADES.map(value => <label key={value} className={`grade-card ${grade === value ? 'selected' : ''}`}><input type="radio" name="preview-grade" checked={grade === value} onChange={() => { setPreviewGrade(value); setAnswers({}); setScan(null); }}/><strong>{value}학년</strong></label>)}</fieldset></>}
    <div className="diagnosis-status"><span className="badge">{grade}학년 · 총 {QUESTION_COUNT}문항</span>{student && <span role="status">{status ? status.ready ? '정답표 등록 완료 · 제출하면 자동 채점해요' : '선생님의 정답표 등록을 기다리고 있어요' : '진단 준비 상태 확인 중…'}</span>}<a className="text-button" href={`/answer-sheet?grade=${grade}`} target="_blank" rel="noreferrer">답안지 양식 인쇄</a></div>
    <div className="submission-methods" aria-label="답안 제출 방법">
      <button disabled={busy || submitting} className={`panel method-card ${method === 'manual' ? 'selected' : ''}`} aria-pressed={method === 'manual'} onClick={() => { setMethod('manual'); setError(''); }}><ClipboardList size={30}/><small>방법 1</small><h2>직접 답안 입력</h2><p>문항 번호에 맞게 보기 번호나 답을 입력해요.</p></button>
      <button disabled={busy || submitting} className={`panel method-card ${method === 'scan' ? 'selected' : ''}`} aria-pressed={method === 'scan'} onClick={() => { setMethod('scan'); setError(''); }}><ScanLine size={30}/><small>방법 2</small><h2>파일로 답안 인식</h2><p>PDF·JPG·PNG를 읽고 답안을 확인한 뒤 자동 채점해요.</p></button>
    </div>
    {method === 'scan' && <div className="panel scan-panel"><h2>답안지 파일을 선택해요.</h2><p>문항 번호와 답이 한 줄씩 적힌 답안지를 사용하세요. 예: <b>1: ②</b>, <b>2: 15</b>. 시험지의 문제·보기만 있는 파일은 답안을 구분하기 어려워요.</p><p>손글씨·흐린 스캔·OMR 표시는 잘못 읽거나 읽지 못할 수 있어요. 인식되지 않은 답은 직접 입력해 주세요.</p><label className="file-picker"><FileUp size={27}/><span>PDF · JPG · PNG 선택</span><input aria-label="답안지 파일 선택" type="file" multiple accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" disabled={busy} onChange={event => { setFiles(Array.from(event.target.files ?? [])); setScan(null); setConfirmed(false); setError(''); }}/></label><small>총 20MB 이하 · 최대 8개 파일 / 8쪽 · 원본 파일은 기기 안에서 읽으며 서버에 보관하지 않아요.</small><p>{files.map(file => file.name).join(', ')}</p><div className="button-row"><button className="button button-primary" disabled={!files.length || busy} onClick={() => void recognize()}>{busy ? '답안 인식 중…' : '답안 자동 인식'}</button>{busy && <button className="button button-outline" onClick={() => abortRef.current?.abort()}>인식 취소</button>}</div>{progress && <p role="status">{progress}</p>}{scan && <><p className="success-message">{scan.pages}쪽에서 {Object.keys(scan.answers).length}문항을 찾았어요. 아래에서 원본과 비교해 주세요.{scan.conflicts.length > 0 && ` 중복되거나 서로 다른 답 ${scan.conflicts.length}개는 직접 확인해 주세요.`}</p><details><summary>원본 미리보기와 인식한 글자 보기</summary><div className="scan-previews">{scan.previews.map((image, index) => <img key={index} src={image} alt={`${index + 1}쪽 답안 원본`}/>)}</div><pre className="ocr-text">{scan.text}</pre></details></>}</div>}
    {method && <div className="panel numbered-answer-panel"><div className="section-heading"><h2>{method === 'scan' ? '인식한 답안을 확인해요.' : '문항 번호에 맞게 답을 입력해요.'}</h2><span>{answered} / 20 입력</span></div><p className="muted">선택형은 보기 번호를 선택하고, 단답형은 답을 적어요. 여러 답은 쉼표로 구분해 주세요. 비워 둔 문항은 오답으로 채점돼요.</p><div className="numbered-answers">{items.map(item => <label key={item.id}><span><b>{item.number}번</b><small>{item.type === 'choice' ? '선택형' : '단답형'}</small></span>{item.type === 'choice' ? <select aria-label={`${item.number}번 답`} value={answers[item.id] ?? ''} disabled={busy || submitting} onChange={event => { setAnswers(previous => ({ ...previous, [item.id]: event.target.value })); setConfirmed(false); }}><option value="">미입력</option>{[1,2,3,4].map(value => <option key={value} value={value}>{value}번</option>)}</select> : <input aria-label={`${item.number}번 답`} maxLength={100} value={answers[item.id] ?? ''} disabled={busy || submitting} placeholder="답 입력" onChange={event => { setAnswers(previous => ({ ...previous, [item.id]: event.target.value })); setConfirmed(false); }}/>}</label>)}</div>
      {method === 'scan' && <label className="check-note"><input type="checkbox" checked={confirmed} disabled={!scan || busy} onChange={event => setConfirmed(event.target.checked)}/>원본 답안지와 20문항의 인식 결과를 비교하고 수정했어요.</label>}
      {answered < 20 && <p className="form-note">미입력 {20 - answered}문항은 오답으로 처리합니다.</p>}
      <button className="button button-primary button-block" disabled={busy || submitting || (student ? !status?.ready : false) || (method === 'scan' && (!scan || !confirmed))} onClick={() => void submit()}>{submitting ? '채점하고 저장하는 중…' : student ? '제출하고 자동 채점하기' : '로그인하고 제출하기'} <ArrowRight size={18}/></button>
    </div>}
    {error && <p className="alert" role="alert">{error}</p>}
  </section>;
}
