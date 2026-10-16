"use client";
import {useEffect,useState} from 'react';
import {GRADES,type Grade} from '@/lib/diagnosis-blueprint';
import {domains} from '@/lib/assessment';
import {templateEvaluation,type EvaluationDefinition,type EvaluationItem,type EvaluationRecord} from '@/lib/evaluations';
const emptyItem=(number:number):EvaluationItem=>({id:'q'+crypto.randomUUID().replaceAll('-','').slice(0,20),number,topic:'',domain:'수와 연산',type:'short',choiceCount:4,answers:[],guidance:''});
export default function AnswerKeyEditor(){
  const [forms,setForms]=useState<EvaluationRecord[]>([]),[grade,setGrade]=useState<Grade>(1),[selected,setSelected]=useState('');
  const [definition,setDefinition]=useState<EvaluationDefinition|null>(null),[version,setVersion]=useState<string|null>(null),[status,setStatus]=useState('draft');
  const [dirty,setDirty]=useState(false),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [newCount,setNewCount]=useState(20);
  async function load(){setLoading(true);setError('');try{const response=await fetch('/api/admin/evaluations',{cache:'no-store'});const data=await response.json() as {evaluations:EvaluationRecord[];error?:string};if(!response.ok)throw new Error(data.error);setForms(data.evaluations);return data.evaluations;}catch(e){setError(e instanceof Error?e.message:'평가 목록을 불러오지 못했습니다.');return null;}finally{setLoading(false);}}
  useEffect(()=>{void load();},[]);
  useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  function mayLeave(){return !dirty||window.confirm('저장하지 않은 수정 내용이 있습니다. 버리고 이동할까요?');}
  function open(form:EvaluationRecord){setSelected(form.id);setDefinition(structuredClone(form));setVersion(form.version);setStatus(form.status);setDirty(false);setConfirmed(false);setError('');setNotice('');}
  function start(template:boolean,copy=false){if(!mayLeave())return;const next=copy&&definition?{...structuredClone(definition),title:definition.title+' 복사',code:definition.code+'-복사'}:template?templateEvaluation(grade):{title:'',code:'',grade,items:Array.from({length:Math.max(1,Math.min(60,newCount||1))},(_,i)=>emptyItem(i+1))};setDefinition(next);setSelected('');setVersion(null);setStatus('draft');setConfirmed(false);setDirty(true);setError('');setNotice('새 평가입니다. 평가명과 유형 코드를 지정한 뒤 저장하세요.');}
  function change(value:Partial<EvaluationDefinition>){setDefinition(d=>d?{...d,...value}:d);setDirty(true);setConfirmed(false);setNotice('');}
  function itemChange(index:number,value:Partial<EvaluationItem>){if(!definition)return;change({items:definition.items.map((item,i)=>i===index?{...item,...value,...(('topic'in value||'domain'in value||'type'in value)?{standardId:undefined}:{})}:item)});}
  function remove(index:number){if(!definition||definition.items.length<=1)return;if(!window.confirm((index+1)+'번 문항을 삭제하고 이후 번호를 다시 매길까요?'))return;change({items:definition.items.filter((_,i)=>i!==index).map((item,i)=>({...item,number:i+1}))});}
  function move(index:number,direction:number){if(!definition)return;const items=[...definition.items],other=index+direction;if(other<0||other>=items.length)return;[items[index],items[other]]=[items[other],items[index]];change({items:items.map((item,i)=>({...item,number:i+1}))});}
  async function save(nextStatus:string){if(!definition||busy)return;setBusy(true);setError('');setNotice('');try{
    const response=await fetch('/api/admin/evaluations',{method:selected?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:selected,definition,expectedVersion:version,status:nextStatus,confirmed})});
    const data=await response.json() as {evaluation?:EvaluationRecord;error?:string};if(!response.ok||!data.evaluation)throw new Error(data.error||'저장하지 못했습니다.');
    await load();open(data.evaluation);setNotice(nextStatus==='active'?'평가와 정답표를 공개했습니다. 학생이 이 유형을 선택할 수 있습니다. 이전 채점 기록은 유지됩니다.':nextStatus==='archived'?'평가를 종료했습니다. 누적 기록은 유지됩니다.':'비공개로 저장했습니다. 공개하면 학생이 선택할 수 있습니다.');
  }catch(e){setError(e instanceof Error?e.message:'저장하지 못했습니다.');}finally{setBusy(false);}}
  const visible=forms.filter(form=>form.grade===grade);
  return <section className="panel numbered-answer-panel evaluation-editor">
    <div className="section-heading"><div><h2>평가별 문항 · 정답 설정</h2><p>평가를 A형·B형처럼 구분하고, 문항과 정답표를 자유롭게 수정하세요.</p></div><button className="button button-outline" disabled={busy||loading} onClick={()=>{if(mayLeave()){setDefinition(null);setSelected('');setDirty(false);void load();}}}>목록 새로고침</button></div>
    <label className="answer-key-grade">학년<select value={grade} disabled={busy} onChange={e=>{if(mayLeave()){setGrade(Number(e.target.value) as Grade);setDefinition(null);setSelected('');setDirty(false);}}}>{GRADES.map(g=><option key={g} value={g}>{g}학년</option>)}</select></label>
    <div className="evaluation-list">{visible.map(form=><button className={'evaluation-list-item '+(selected===form.id?'selected':'')} key={form.id} disabled={busy} onClick={()=>{if(mayLeave())open(form);}}><strong>{form.title}</strong><span>{form.code} · {form.items.length}문항 · {form.status==='active'?'공개 중':form.status==='archived'?'종료':'비공개'}</span><small>수정 {new Date(form.updatedAt).toLocaleString('ko-KR')}</small></button>)}</div>
    {loading&&<p role="status">평가 목록을 불러오는 중…</p>}
    <div className="evaluation-create"><label>새 평가 문항 수<input type="number" min={1} max={60} value={newCount} onChange={e=>setNewCount(Number(e.target.value))}/></label><button className="button button-primary" disabled={busy||loading} onClick={()=>start(false)}>빈 평가 만들기</button><button className="button button-outline" disabled={busy||loading} onClick={()=>start(true)}>기존 20문항으로 새 평가</button></div>
    {definition&&<fieldset disabled={busy} className="evaluation-fields">
      <div className="form-columns"><label>평가명<input maxLength={100} value={definition.title} onChange={e=>change({title:e.target.value})} placeholder="예: 2026 1학기 수리력 진단"/></label><label>유형 코드<input maxLength={40} value={definition.code} onChange={e=>change({code:e.target.value})} placeholder="예: A형 / B형 / 2026-2차"/></label></div>
      <p className="form-note">{definition.grade}학년 · {definition.items.length}문항 · 문항별 동일 비중, 100점 만점 · {status==='active'?'현재 공개 중':status==='archived'?'종료된 평가':'비공개 평가'} {dirty&&' · 저장하지 않은 수정 있음'}</p>
      <div className="button-row"><button type="button" className="button button-outline" onClick={()=>start(false,true)}>다른 유형으로 복사</button>{selected&&<a className="text-button" target="_blank" rel="noreferrer" href={'/answer-sheet?formId='+encodeURIComponent(selected)+'&grade='+definition.grade}>이 평가 답안지 인쇄</a>}</div>
      <p className="readiness-note">선택형은 보기 번호, 단답형은 답을 입력하세요. 허용하는 다른 표기는 |로 구분합니다(예: 6,10|10,6). 새 문항은 풀이 안내와 복습 문제를 직접 등록할 수 있습니다. 수정 후 공개하면 새 버전으로 저장됩니다.</p>
      <div className="evaluation-items">{definition.items.map((item,index)=><details className="evaluation-item" key={item.id} open={definition.items.length===1}>
        <summary><strong>{index+1}번 · {item.type==='choice'?'선택형':'단답형'}</strong><span>{item.topic||'문항 내용을 입력해 주세요'}</span><small>{item.answers.length?'정답 등록':'정답 미입력'}</small></summary>
        <div className="section-heading"><h3>{index+1}번</h3><div className="button-row"><button type="button" className="text-button" disabled={!index} onClick={()=>move(index,-1)} aria-label={(index+1)+'번 위로 이동'}>↑</button><button type="button" className="text-button" disabled={index===definition.items.length-1} onClick={()=>move(index,1)} aria-label={(index+1)+'번 아래로 이동'}>↓</button><button type="button" className="text-button" disabled={definition.items.length===1} onClick={()=>remove(index)}>문항 삭제</button></div></div>
        <div className="form-columns"><label>답안 형식<select value={item.type} onChange={e=>itemChange(index,{type:e.target.value as 'choice'|'short',answers:[]})}><option value="short">단답형</option><option value="choice">선택형</option></select></label><label>평가 영역<select value={item.domain} onChange={e=>itemChange(index,{domain:e.target.value as EvaluationItem['domain']})}>{domains.map(d=><option key={d}>{d}</option>)}</select></label></div>
        {item.type==='choice'&&<label>보기 수<select value={item.choiceCount} onChange={e=>itemChange(index,{choiceCount:Number(e.target.value),answers:[]})}>{[2,3,4,5].map(n=><option key={n} value={n}>{n}개</option>)}</select></label>}
        <label>문항 내용 · 학습 주제<input aria-label={(index+1)+'번 문항 내용'} maxLength={300} value={item.topic} onChange={e=>itemChange(index,{topic:e.target.value})} placeholder="예: 두 자리 수의 덧셈"/></label>
        <label>정답<input aria-label={(index+1)+'번 정답'} value={item.answers.join('|')} maxLength={1000} onChange={e=>itemChange(index,{answers:e.target.value?e.target.value.split('|'):[]})} placeholder={item.type==='choice'?'예: 2':'허용 답은 |로 구분'}/></label>
        <label>풀이 안내 · 피드백 <small>선택</small><textarea rows={2} maxLength={1000} value={item.guidance} onChange={e=>itemChange(index,{guidance:e.target.value})} placeholder="채점 후 학생에게 보여줄 풀이 방법이나 확인할 내용을 적어 주세요."/></label>
        {item.standardId&&<p className="form-note">기존 문항의 학습지원 자료가 연결되어 있습니다. 내용·영역·형식을 바꾸면 연결이 해제됩니다.</p>}
        <details><summary>별도 복습 문제 {item.practice?'등록됨':'등록하기'}</summary>
          <label>복습 문제<input maxLength={1000} value={item.practice?.prompt??''} onChange={e=>itemChange(index,{practice:{prompt:e.target.value,accepted:item.practice?.accepted??[],hint:item.practice?.hint??'',explanation:item.practice?.explanation??'',version:1}})}/></label>
          <label>복습 정답<input maxLength={1000} value={item.practice?.accepted.join('|')??''} onChange={e=>itemChange(index,{practice:{prompt:item.practice?.prompt??'',accepted:e.target.value?e.target.value.split('|'):[],hint:item.practice?.hint??'',explanation:item.practice?.explanation??'',version:1}})}/></label>
          <label>힌트<input maxLength={1000} value={item.practice?.hint??''} onChange={e=>itemChange(index,{practice:{prompt:item.practice?.prompt??'',accepted:item.practice?.accepted??[],hint:e.target.value,explanation:item.practice?.explanation??'',version:1}})}/></label>
          <label>복습 해설<textarea maxLength={1000} value={item.practice?.explanation??''} onChange={e=>itemChange(index,{practice:{prompt:item.practice?.prompt??'',accepted:item.practice?.accepted??[],hint:item.practice?.hint??'',explanation:e.target.value,version:1}})}/></label>
          {item.practice&&<button type="button" className="text-button" onClick={()=>itemChange(index,{practice:undefined})}>별도 복습 문제 제거</button>}
        </details>
      </details>)}</div>
      <button type="button" className="button button-outline" disabled={definition.items.length>=60} onClick={()=>change({items:[...definition.items,emptyItem(definition.items.length+1)]})}>문항 추가 (최대 60개)</button>
      <label className="check-note"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>평가 유형, 문항 순서와 모든 정답을 확인했습니다.</label>
      <div className="button-row"><button type="button" className="button button-outline" onClick={()=>void save('draft')}>비공개로 저장</button><button type="button" className="button button-primary" disabled={!confirmed} onClick={()=>void save('active')}>{busy?'저장 중…':'저장하고 학생에게 공개'}</button>{selected&&<button type="button" className="button button-outline" onClick={()=>{if(window.confirm('신규 참여를 종료할까요? 기존 결과는 유지됩니다.'))void save('archived');}}>평가 종료</button>}</div>
    </fieldset>}
    {error&&<p className="alert" role="alert">{error}</p>}{notice&&<p className="success-message" role="status">{notice}</p>}
    <p className="form-note">동일 학년에서 유형 코드는 서로 달라야 합니다. A형과 B형의 결과는 각각의 정답표 버전과 연결되며, 이전 결과를 소급하여 다시 채점하지 않습니다.</p>
  </section>;
}
