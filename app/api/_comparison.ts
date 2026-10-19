import type {EvaluationDefinition} from '@/lib/evaluations';

// Include all frozen item fields. Copies retain their criteria; even a guidance edit
// conservatively starts a new comparison group. Never expose answer keys in this value.
export async function criteriaFingerprint(definition:string|null|undefined){
  if(!definition)return undefined;
  try{
    const form=JSON.parse(definition) as EvaluationDefinition;
    const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):value;
    const bytes=new TextEncoder().encode(JSON.stringify(canonical({grade:form.grade,items:form.items})));
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  }catch{return undefined;}
}
