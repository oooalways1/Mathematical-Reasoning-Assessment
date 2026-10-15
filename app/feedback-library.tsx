"use client";
import { useState } from 'react';
import { GRADES, questionBlueprints, type Grade } from '@/lib/diagnosis-blueprint';
import { feedbackCases } from '@/lib/feedback-cases';
import { getSkillGuide } from '@/lib/skill-guides';
import { renderCoaching } from '@/lib/adaptive-feedback';
import { applicableFeedbackCases, feedbackCatalogStats } from '@/lib/feedback-applicability';

export default function FeedbackLibrary() {
  const [grade,setGrade]=useState<Grade>(1), [number,setNumber]=useState(1), [caseId,setCaseId]=useState(feedbackCases[0].id);
  const item=questionBlueprints[grade].find(item=>item.number===number)!;
  const cases=applicableFeedbackCases(item);
  const skill=getSkillGuide(item), situation=cases.find(entry=>entry.id===caseId) ?? cases[0];
  const feedback=renderCoaching(situation.id,skill,'library-preview');
  return <section className="panel feedback-library"><div className="panel-heading"><div><h2>상황별 피드백 자료</h2><p>학생 답안과 학습 기록에 맞춰 제공할 안내를 미리 살펴보세요.</p></div><span className="badge">외부 AI 호출 없이 제공</span></div><div className="feedback-library-counts"><span><strong>54</strong>학습 내용 카드</span><span><strong>{feedbackCases.length}</strong>진단·연습 상황</span><span><strong>{feedbackCatalogStats.combinations}</strong>학습 내용 × 상황 × 문구 조합</span></div><p className="form-note">각 상황에 두 가지 문구와 학습 내용별 풀이·확인·도전 활동을 준비했습니다. 문항 유형에 적용 가능한 조합만 제공합니다. 상황 선택은 실제 기록으로 판단하며, 오답 원인을 단정하지 않습니다.</p><div className="library-selectors"><label>학년<select value={grade} onChange={event=>setGrade(Number(event.target.value) as Grade)}>{GRADES.map(value=><option key={value} value={value}>{value}학년</option>)}</select></label><label>연결 문항<select value={number} onChange={event=>setNumber(Number(event.target.value))}>{questionBlueprints[grade].map(value=><option key={value.id} value={value.number}>{value.number}번 · {value.topic}</option>)}</select></label><label>피드백 상황<select value={situation.id} onChange={event=>setCaseId(event.target.value)}>{cases.map(entry=><option key={entry.id} value={entry.id}>{entry.phase==='diagnosis'?'진단':'연습'} · {entry.title}</option>)}</select></label></div><div className="library-condition"><h3>{situation.title}</h3><p><b>선택 조건</b> {situation.condition}</p><p><b>학습 내용</b> {skill.label}</p></div><div className="library-variants">{situation.variants.map((text,index)=><article className="coaching-panel" key={index}><span className="eyebrow">학생 안내 예시 {index+1}</span><p>{text} {skill.focus}</p><p className="coaching-next"><b>다음 한 걸음</b> {feedback.nextStep}</p></article>)}</div><div className="library-skill"><h3>단계별 생각하는 방법</h3><ol>{skill.steps.map(step=><li key={step}>{step}</li>)}</ol><p><b>풀이 확인</b> {skill.check}</p><p><b>쉬운 활동</b> {skill.easier}</p><p><b>다음 도전</b> {skill.challenge}</p><p><b>교사 관찰 질문</b> {skill.teacherProbe}</p></div></section>;
}
