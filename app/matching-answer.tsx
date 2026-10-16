'use client';
import {MATCH_LABELS} from '@/lib/evaluations';
export default function MatchingAnswer({number,leftOptions=[],rightOptions=[],value,onChange,disabled=false,teacher=false}:{number:number;leftOptions?:string[];rightOptions?:string[];value:string;onChange:(answer:string)=>void;disabled?:boolean;teacher?:boolean}){
  const entries=new Map(value.split(',').map(part=>part.split('-')).filter(parts=>parts.length===2).map(([a,b])=>[Number(a),b]));
  return <div className="matching-answer"><p>{teacher?'각 왼쪽 항목의 정답을 골라 주세요.':'왼쪽 항목과 알맞은 오른쪽 항목을 연결해 주세요.'} 각 항목은 한 번씩 사용합니다.</p>{leftOptions.map((text,i)=><label key={i}><span><b>{i+1}.</b> {text||`왼쪽 항목 ${i+1}`}</span><select aria-label={`${number}번 ${teacher?'정답 ':''}연결 ${i+1}`} disabled={disabled} value={entries.get(i+1)??''} onChange={e=>{const next=new Map(entries);if(e.target.value)next.set(i+1,e.target.value);else next.delete(i+1);onChange([...next].sort(([a],[b])=>a-b).map(([a,b])=>`${a}-${b}`).join(','));}}><option value="">연결할 항목 선택</option>{rightOptions.map((right,index)=><option key={index} value={MATCH_LABELS[index]}>{MATCH_LABELS[index]}. {right||`오른쪽 항목 ${index+1}`}</option>)}</select></label>)}</div>;
}
