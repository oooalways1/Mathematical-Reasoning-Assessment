'use client';
import { useEffect, useState, type FormEvent } from 'react';
import SchoolSelect, { schoolLabel, type School } from './school-select';

export default function SchoolManager({onChanged}:{onChanged:()=>void}) {
  const [schools,setSchools]=useState<School[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [edit,setEdit]=useState<School|null>(null);
  const [name,setName]=useState('');
  const [region,setRegion]=useState('');
  const [active,setActive]=useState(true);
  const [revision,setRevision]=useState(0);
  const [query,setQuery]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);
    fetch('/api/admin/schools',{cache:'no-store',signal:controller.signal}).then(async response=>{
      const data=await response.json() as {schools:School[];error?:string};if(!response.ok)throw new Error(data.error);setSchools(data.schools);
    }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[revision]);
  function reset(){setEdit(null);setName('');setRegion('');setActive(true);}
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/admin/schools',{method:edit?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:edit?.id,name,region,active})});
      const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error);
      setNotice(edit?'학교 정보를 수정했습니다.':'학교를 추가했습니다. 이제 회원가입 목록에서 선택할 수 있습니다.');reset();setRevision(n=>n+1);onChanged();
    }catch(e){setError(e instanceof Error?e.message:'저장하지 못했습니다.');}finally{setBusy(false);}
  }
  return <section className="panel dashboard-panel">
    <div className="panel-heading"><div><h2>학교 관리</h2><p>등록한 학교만 회원가입 목록에 표시됩니다. 동명 학교는 지역으로 구분하세요.</p></div><button className="button button-outline" onClick={()=>{setError('');setRevision(n=>n+1);}}>새로고침</button></div>
    <form className="form-stack" onSubmit={save}>
      <h3>{edit?'학교 정보 수정':'초등학교 추가'}</h3>
      <div className="form-columns"><label>학교명<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="예: 한걸음초등학교"/></label><label>지역 <small>선택</small><input maxLength={80} value={region} onChange={e=>setRegion(e.target.value)} placeholder="예: 서울 강동구"/></label></div>
      {edit&&<label>회원가입 목록 표시<select value={active?'on':'off'} onChange={e=>setActive(e.target.value==='on')}><option value="on">표시 · 신규 가입 허용</option><option value="off">숨김 · 신규 가입 중지</option></select></label>}
      <p className="form-note">학교를 숨겨도 기존 학생의 로그인과 학습 기록은 유지됩니다. 학교명을 수정하면 학생 화면에도 반영됩니다.</p>
      <div className="button-row"><button className="button button-primary" disabled={busy}>{busy?'저장 중…':edit?'변경 저장':'학교 추가'}</button>{edit&&<button type="button" className="button button-outline" disabled={busy} onClick={reset}>수정 취소</button>}</div>
      {error&&<p role="alert" className="alert">{error}</p>}{notice&&<p role="status" className="success-message">{notice}</p>}
    </form>
    <div className="panel-toolbar"><h3>등록 학교 {schools.length}개</h3><label>학교 검색<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="학교명 또는 지역"/></label></div>
    {loading?<p role="status">학교 목록을 불러오는 중…</p>:<div className="table-scroll"><table className="data-table"><thead><tr><th>학교명</th><th>지역</th><th>학생 수</th><th>가입 상태</th><th>관리</th></tr></thead><tbody>{schools.filter(s=>schoolLabel(s).includes(query.trim())).map(s=><tr key={s.id}><td>{s.name}</td><td>{s.region||'—'}</td><td>{s.studentCount}명</td><td>{s.active?'가입 가능':'목록에서 숨김'}</td><td><button className="button button-outline" disabled={busy} onClick={()=>{setEdit(s);setName(s.name);setRegion(s.region);setActive(Boolean(s.active));setNotice('');setError('');}}>수정</button></td></tr>)}</tbody></table>{!schools.length&&<p className="empty-state">첫 학교를 등록해 주세요. 등록 즉시 학생들이 선택할 수 있어요.</p>}</div>}
  </section>;
}

export function StudentSchoolEditor({student,onSaved}:{student:{id:string;name:string;schoolName?:string|null;schoolRegion?:string|null};onSaved:()=>void}){
  const [schoolId,setSchoolId]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;setBusy(true);setError('');
    try{
      const response=await fetch('/api/students',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({studentId:student.id,schoolId})});
      const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error);onSaved();
    }catch(e){setError(e instanceof Error?e.message:'학교를 저장하지 못했습니다.');}finally{setBusy(false);}
  }
  return <form className="form-stack" onSubmit={save}><p>{student.name} · 현재 학교: {student.schoolName?schoolLabel({name:student.schoolName,region:student.schoolRegion}):'미지정'}</p><SchoolSelect value={schoolId} onChange={setSchoolId}/><p className="form-note">학교를 변경해도 아이디와 기존 학습 기록은 유지됩니다.</p>{error&&<p role="alert" className="alert">{error}</p>}<button className="button button-primary" disabled={busy||!schoolId}>{busy?'저장 중…':'학교 배정 저장'}</button></form>;
}
