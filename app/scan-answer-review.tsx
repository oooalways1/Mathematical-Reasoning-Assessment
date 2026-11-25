'use client';
import {useState} from 'react';
import {itemTypeLabel} from '@/lib/evaluations';
import {canConfirmScanAnswer,isScanAnswerReviewed,scanReviewSummary,type ReviewedAnswers,type ScanReviewItem} from '@/lib/scan-review';
import type {ScanResult} from '@/lib/scan-answers';
import MatchingAnswer from './matching-answer';

export default function ScanAnswerReview({scan,items,answers,reviewed,disabled,onChange,onReview}:{scan:ScanResult;items:ScanReviewItem[];answers:Record<string,string>;reviewed:ReviewedAnswers;disabled:boolean;onChange:(id:string,value:string)=>void;onReview:(id:string,blank:boolean)=>void}){
  const [page,setPage]=useState(0),[zoom,setZoom]=useState(100),[onlyRemaining,setOnlyRemaining]=useState(false);
  const summary=scanReviewSummary(items,answers,reviewed);
  const visible=items.filter(item=>!onlyRemaining||!isScanAnswerReviewed(item,answers,reviewed));
  return <section className="panel scan-review" aria-labelledby="scan-review-heading">
    <div className="section-heading"><div><p className="eyebrow">2단계 · 사람이 원본과 비교해요</p><h2 id="scan-review-heading">자동 입력한 답을 확인하고 고쳐요.</h2></div><strong role="status">확인 완료 {summary.reviewed} / {items.length}문항</strong></div>
    <p className="scan-review-intro">자동으로 채운 답도 틀릴 수 있어요. 학생이나 선생님이 원본의 <b>문항 번호와 답</b>을 함께 확인해 주세요. 여기에는 정답이 아니라 <b>학생이 쓴 답</b>을 입력해요.</p>
    <div className="scan-review-summary"><span>원본 확인 필요 {summary.remaining}문항</span><span>현재 빈칸 {summary.blank}문항</span><span>확인 전에는 채점하지 않아요.</span></div>
    <div className="scan-review-columns">
      <aside className="scan-review-original" aria-label="답안지 원본 비교">
        <h3>업로드한 원본</h3>
        <div className="scan-review-tools"><label>쪽 선택<select aria-label="원본 쪽 선택" value={page} onChange={e=>setPage(Number(e.target.value))}>{scan.previews.map((_,index)=><option key={index} value={index}>{index+1}쪽</option>)}</select></label><label>원본 크기<select aria-label="원본 크기" value={zoom} onChange={e=>setZoom(Number(e.target.value))}><option value={100}>기본</option><option value={150}>1.5배 확대</option><option value={200}>2배 확대</option></select></label></div>
        <div className="scan-review-image">{scan.previews.length?<img src={scan.previews[page]??scan.previews[0]} alt={`${page+1}쪽 업로드한 답안지 원본`} style={{width:`${zoom}%`,maxWidth:'none'}}/>:<p>원본 미리보기를 표시할 수 없어요. 가지고 있는 답안지를 보고 확인해 주세요.</p>}</div>
        <p className="muted">원본은 기기 안에서만 표시해요. 확대하면 안쪽을 가로·세로로 움직여 볼 수 있어요.</p>
        <details><summary>자동 인식한 글자 전체 보기</summary><pre className="ocr-text">{scan.text}</pre></details>
      </aside>
      <div className="scan-review-answers"><div className="scan-review-filter"><h3>학생이 쓴 답</h3><label><input type="checkbox" checked={onlyRemaining} onChange={e=>setOnlyRemaining(e.target.checked)}/>확인할 문항만 보기</label></div>
        {visible.map(item=>{const value=answers[item.id]??'',done=isScanAnswerReviewed(item,answers,reviewed),empty=!value.trim(),flagged=scan.uncertain.includes(item.id)||scan.conflicts.includes(item.id),edited=value!==(scan.answers[item.id]??'');
          return <article key={item.id} className={`scan-review-item ${done?'is-reviewed':empty||flagged?'needs-attention':''}`} aria-label={`${item.number}번 답안 확인`}>
            <div className="scan-review-item-heading"><h4>{item.number}번 <small>{itemTypeLabel(item.type)}</small></h4><span className="scan-review-badge">{done?empty?'원본도 빈칸 · 확인 완료':'원본 확인 완료':empty?'직접 입력 필요':flagged?'다르게 읽힌 답 · 확인 필요':edited?'수정한 답 · 확인 필요':'자동 입력 · 확인 필요'}</span></div>
            {item.type==='matching'?<MatchingAnswer number={item.number} leftOptions={item.leftOptions} rightOptions={item.rightOptions} value={value} disabled={disabled} onChange={v=>onChange(item.id,v)}/>:item.type==='choice'&&!item.multiple?<label className="scan-review-field">학생이 고른 보기<select aria-label={`${item.number}번 답`} value={value} disabled={disabled} onChange={e=>onChange(item.id,e.target.value)}><option value="">답을 골라 주세요</option>{Array.from({length:item.choiceCount??4},(_,i)=><option key={i+1} value={i+1}>{i+1}번</option>)}</select></label>:<label className="scan-review-field">학생이 쓴 답<input aria-label={`${item.number}번 답`} maxLength={100} value={value} disabled={disabled} placeholder="원본을 보고 답을 입력해 주세요" onChange={e=>onChange(item.id,e.target.value)}/></label>}
            {empty?<p className="scan-review-help">읽지 못했거나 답이 비어 있어요. 원본에 답이 있으면 위 칸에 입력해 주세요.</p>:<p className="scan-review-help">{edited?<>처음 인식한 답: <samp>{scan.answers[item.id]||'미인식'}</samp> · {done?'수정 후 원본 확인 완료':'수정한 답을 다시 확인해 주세요.'}</>:'문항 번호가 같은지, 숫자·부호·소수점이 원본과 같은지 확인해 주세요.'}</p>}
            <div className="scan-review-item-actions">{empty?<label className="check-note"><input type="checkbox" aria-label={`${item.number}번 원본도 빈칸`} checked={done} disabled={disabled} onChange={()=>onReview(item.id,true)}/>원본에도 답이 없어요. 미응답으로 제출해요.</label>:<button type="button" className={`button ${done?'button-outline':'button-primary'}`} disabled={disabled||!canConfirmScanAnswer(item,value)} aria-pressed={done} onClick={()=>onReview(item.id,false)}>{done?'확인 취소':'원본과 같아요'} <span className="sr-only">{item.number}번</span></button>}</div>
          </article>;
        })}
        {!visible.length&&<p className="success-message">모든 문항을 확인했어요. 아래에서 최종 확인 후 제출해 주세요.</p>}
      </div>
    </div>
  </section>;
}
