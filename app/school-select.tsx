'use client';
import { useEffect, useState } from 'react';

export type School = {id:string;name:string;region:string;active?:number;studentCount?:number};
export function schoolLabel(school: {name:string;region?:string|null}) { return school.region ? `${school.name} (${school.region})` : school.name; }
export default function SchoolSelect({value,onChange}: {value:string;onChange:(id:string)=>void}) {
  const [schools,setSchools] = useState<School[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [retry,setRetry] = useState(0);
  const [query,setQuery] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);setError('');
    fetch('/api/schools',{cache:'no-store',signal:controller.signal}).then(async response => {
      const data = await response.json() as {schools:School[];error?:string};
      if (!response.ok) throw new Error(data.error || '학교 목록을 불러오지 못했어요.');
      setSchools(data.schools);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  },[retry]);
  const filtered = schools.filter(school => school.id === value || schoolLabel(school).includes(query.trim()));
  return <div className="form-stack school-select">
    {schools.length > 8 && <label>학교 검색<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="학교명 또는 지역 검색"/></label>}
    <label>초등학교<select name="schoolId" required value={value} onChange={event=>onChange(event.target.value)} aria-describedby="school-selection-help">
      <option value="">{loading ? '학교 목록을 불러오는 중…' : '학교를 선택해 주세요'}</option>
      {filtered.map(school => <option key={school.id} value={school.id}>{schoolLabel(school)}</option>)}
    </select></label>
    <small id="school-selection-help">{!loading && !error && !schools.length ? '아직 등록된 학교가 없어요. 선생님께 학교 등록을 요청해 주세요.' : '목록에 우리 학교가 없다면 선생님께 알려 주세요.'}</small>
    {error && <div role="alert"><p className="alert">{error}</p><button type="button" className="text-button" onClick={()=>setRetry(n=>n+1)}>학교 목록 다시 불러오기</button></div>}
  </div>;
}
