"use client";
import {useState} from 'react';
import SchoolSelect from './school-select';
export default function TeacherSignup({onLogin}:{onLogin:()=>void}){
 const [form,setForm]=useState({name:'',loginId:'',password:'',confirm:'',schoolId:'',requestedScope:'class',grade:1,classroom:''}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 if(done)return <section className="form-stack"><h2>교사 가입 신청을 접수했어요.</h2><p role="status">최고관리자 승인 후 교사 관리페이지를 이용할 수 있습니다. 승인 전에는 학생 정보와 답안 원본을 볼 수 없습니다.</p><button className="button button-primary" onClick={onLogin}>교사 로그인으로</button></section>;
 return <form className="form-stack" onSubmit={async e=>{e.preventDefault();if(busy)return;if(form.password!==form.confirm){setError('비밀번호 확인이 일치하지 않습니다.');return;}setBusy(true);setError('');try{const response=await fetch('/api/teacher/applications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,confirm:undefined})}),data=await response.json() as {error?:string};if(!response.ok)throw Error(data.error||'신청하지 못했습니다.');setForm({...form,password:'',confirm:''});setDone(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
 <h2>교사 가입 신청</h2><p className="muted">학교와 담당 학급을 알려 주세요. 최고관리자가 확인하고 권한을 승인합니다.</p>
 <label>선생님 이름<input required maxLength={40} autoComplete="name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
 <SchoolSelect value={form.schoolId} onChange={schoolId=>setForm({...form,schoolId})}/>
 <label>교사 아이디<input required pattern="[a-z0-9_]{4,20}" autoComplete="username" value={form.loginId} onChange={e=>setForm({...form,loginId:e.target.value.toLowerCase()})}/><small>4~20자 · 영문, 숫자, 밑줄 사용 가능 · 숫자만 입력해도 돼요</small></label>
 <label>비밀번호<input required type="password" minLength={4} maxLength={128} autoComplete="new-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><small>4자리 이상</small></label>
 <label>비밀번호 확인<input required type="password" autoComplete="new-password" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})}/></label>
 <label>신청할 담당 범위<select value={form.requestedScope} onChange={e=>setForm({...form,requestedScope:e.target.value})}><option value="class">우리 학급</option><option value="school">학교 전체</option></select></label>
 {form.requestedScope==='class'&&<div className="form-columns"><label>학년<select value={form.grade} onChange={e=>setForm({...form,grade:Number(e.target.value)})}>{[1,2,3].map(g=><option key={g} value={g}>{g}학년</option>)}</select></label><label>반<input required maxLength={30} placeholder="예: 1반" value={form.classroom} onChange={e=>setForm({...form,classroom:e.target.value})}/></label></div>}
 <p className="form-note">가입 가능한 학교가 없다면 최고관리자에게 학교 등록을 요청하세요. 최종 담당 범위는 승인 시 결정됩니다.</p>
 {error&&<p role="alert" className="alert">{error}</p>}<button className="button button-primary" disabled={busy}>{busy?'신청 중…':'승인 요청하기'}</button><button type="button" className="button button-outline" onClick={onLogin}>이미 신청했어요 · 교사 로그인</button>
 </form>;
}
