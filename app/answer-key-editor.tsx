"use client";
import { useEffect, useState } from 'react';
import { GRADES, questionBlueprints, type Grade } from '@/lib/diagnosis-blueprint';
import type { AnswerKey } from '@/lib/diagnosis-model';
type KeyRecord = { grade: Grade; answers: AnswerKey; version: string; updatedAt: string };
export default function AnswerKeyEditor() {
  const [grade, setGrade] = useState<Grade>(1), [keys, setKeys] = useState<KeyRecord[]>([]), [values, setValues] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false), [saving, setSaving] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('');
  async function load() {
    setLoading(true); setError('');
    try { const response = await fetch('/api/admin/answer-keys', { cache: 'no-store' }); const data = await response.json() as { keys: KeyRecord[]; error?: string }; if (!response.ok) throw new Error(data.error); setKeys(data.keys); } catch (error) { setError(error instanceof Error ? error.message : '정답표를 불러오지 못했습니다.'); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { const key = keys.find(key => key.grade === grade); setValues(Object.fromEntries(Object.entries(key?.answers ?? {}).map(([id, values]) => [id, values.join('|')]))); setConfirmed(false); setNotice(''); }, [grade, keys]);
  async function save() {
    if (saving) return; setSaving(true); setError(''); setNotice('');
    try {
      const answers = Object.fromEntries(questionBlueprints[grade].map(item => [item.id, (values[item.id] ?? '').split('|').map(answer => answer.trim()).filter(Boolean)]));
      const response = await fetch('/api/admin/answer-keys', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grade, answers, confirmed, expectedVersion: keys.find(key => key.grade === grade)?.version ?? null }) });
      const data = await response.json() as { error?: string }; if (!response.ok) throw new Error(data.error);
      await load(); setNotice(`${grade}학년 정답표를 저장했습니다. 학생 답안을 자동 채점할 수 있습니다.`);
    } catch (error) { setError(error instanceof Error ? error.message : '정답표를 저장하지 못했습니다.'); } finally { setSaving(false); }
  }
  return <section className="panel numbered-answer-panel"><div className="section-heading"><div><h2>학년별 정답 설정</h2><p>최종 검사지의 번호와 정답을 확인한 후 등록하세요. 정답은 학생 화면에 공개되지 않습니다.</p></div><button className="button button-outline" disabled={saving} onClick={() => void load()}>새로고침</button></div><label className="answer-key-grade">학년<select value={grade} disabled={saving} onChange={event => setGrade(Number(event.target.value) as Grade)}>{GRADES.map(grade => <option key={grade} value={grade}>{grade}학년</option>)}</select></label><p className="readiness-note">선택형은 1~4번을 입력합니다. 단답형의 복수 답은 <b>6,10</b>처럼 한 답으로 입력하고, 같은 의미의 허용 답은 <b>6,10|10,6</b>처럼 <b>|</b>로 구분합니다. 일치하는 완전한 답만 정답 처리하며 부분 점수는 부여하지 않습니다.</p>{loading ? <p role="status">정답표를 불러오는 중…</p> : <><div className="answer-key-list">{questionBlueprints[grade].map(item => <label key={item.id}><span><b>{item.number}번 · {item.type === 'choice' ? '선택형' : '단답형'}</b><small>{item.topic}</small></span><input aria-label={`${item.number}번 정답`} value={values[item.id] ?? ''} maxLength={1000} disabled={saving} placeholder={item.type === 'choice' ? '예: 2' : '정답 입력'} onChange={event => { setValues(previous => ({ ...previous, [item.id]: event.target.value })); setConfirmed(false); }}/></label>)}</div><label className="check-note"><input type="checkbox" checked={confirmed} disabled={saving} onChange={event => setConfirmed(event.target.checked)}/>{grade}학년 최종 검사지의 20문항 번호와 모든 정답을 확인했습니다.</label><button className="button button-primary" disabled={!confirmed || saving} onClick={() => void save()}>{saving ? '저장 중…' : '정답표 확정하고 저장'}</button></>}{error && <p className="alert" role="alert">{error}</p>}{notice && <p className="success-message" role="status">{notice}</p>}</section>;
}
