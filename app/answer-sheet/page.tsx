"use client";
import { useEffect,useState } from 'react';
import type {PublicEvaluation} from '@/lib/evaluations';
export default function AnswerSheet(){
  const [grade,setGrade]=useState(1),[form,setForm]=useState<PublicEvaluation|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{const controller=new AbortController(),params=new URLSearchParams(window.location.search),value=Number(params.get('grade')),id=params.get('formId');if([1,2,3].includes(value))setGrade(value);
    if(!id){setLoading(false);return;}
    fetch('/api/diagnosis/status?formId='+encodeURIComponent(id),{cache:'no-store',signal:controller.signal}).then(async response=>{
      const data=await response.json() as {evaluations:PublicEvaluation[];error?:string};if(!response.ok)throw new Error(data.error);const selected=data.evaluations.find(f=>f.id===id);if(!selected)throw new Error('현재 인쇄할 수 없는 평가입니다. 평가 선택 화면으로 돌아가 주세요.');setForm(selected);setGrade(selected.grade);
    }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
  },[]);
  const count=form?.items.length??20;
  return <main className="printable-answer-sheet"><div className="sheet-actions"><button className="button button-primary" disabled={loading||!!error} onClick={()=>window.print()}>인쇄 / PDF로 저장</button><a href="/" className="button button-outline">사이트로 돌아가기</a></div>{loading?<p>평가 정보를 확인하고 있어요.</p>:error?<p role="alert">{error}</p>:<><h1>수리력 한걸음 · {grade}학년 답안지</h1><h2>{form?form.title+' · '+form.code:'기본 양식'}</h2>{form&&<p>평가 기준: {form.version.slice(0,8)} · 총 {count}문항</p>}<p>학교: __________________ 이름: ______________ 학년·반: ______</p><p>선택형은 보기 번호, 단답형은 답을 적습니다. 여러 답은 쉼표로 구분합니다.</p><div className="sheet-rows">{Array.from({length:count},(_,i)=><div key={i}>{String(i+1).padStart(2,'0')}: <span>________________________________</span></div>)}</div></>}<style>{`.printable-answer-sheet {width:min(100%,700px);padding:30px;margin:auto;background:white;color:black}.printable-answer-sheet h1 {font-size:25px;margin:22px 0 15px}.printable-answer-sheet h2 {font-size:20px}.printable-answer-sheet p {font-size:15px;margin:8px 0}.sheet-actions {display:flex;gap:12px;flex-wrap:wrap}.sheet-rows {margin-top:24px;font-size:22px;font-family:Arial,sans-serif}.sheet-rows>div {height:35px;break-inside:avoid}.sheet-rows span {color:#555}@media print {@page{size:A4;margin:15mm}body{background:white}.sheet-actions{display:none}.printable-answer-sheet{width:100%;padding:0}.sheet-rows>div{height:9mm}}`}</style></main>;
}
