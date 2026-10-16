import { db,isTeacher,jsonError,privateJson,sameOrigin } from '../../_lib';
import { ensureEvaluations,listEvaluations,getEvaluation } from '../../_evaluations';
import { validateEvaluation } from '@/lib/evaluations';
export async function GET(request:Request){if(!await isTeacher(request))return jsonError('교사 인증이 필요합니다.',401);try{return privateJson({evaluations:await listEvaluations()});}catch{return jsonError('평가 목록을 불러오지 못했습니다.',503);}}
async function save(request:Request,creating:boolean){
  if(!sameOrigin(request))return jsonError('잘못된 요청입니다.',403);
  if(!await isTeacher(request))return jsonError('교사 인증이 필요합니다.',401);
  if(Number(request.headers.get('Content-Length'))>250000)return jsonError('평가 내용이 너무 큽니다.',413);
  let body:{definition?:unknown;id?:unknown;expectedVersion?:unknown;status?:unknown;confirmed?:unknown};
  try{body=await request.json();}catch{return jsonError('평가 내용을 확인해 주세요.');}
  if(!['draft','active','archived'].includes(String(body.status)))return jsonError('공개 상태를 확인해 주세요.');
  const status=String(body.status);
  if(status==='active'&&body.confirmed!==true)return jsonError('문항과 정답표 확인 항목을 선택해 주세요.');
  let definition;try{definition=validateEvaluation(body.definition,status==='active');}catch(error){return jsonError(error instanceof Error?error.message:'문항을 확인해 주세요.');}
  try{
    await ensureEvaluations();
    const current=creating?null:typeof body.id==='string'?await getEvaluation(body.id):null;
    if(!creating&&!current)return jsonError('평가를 찾지 못했습니다.',404);
    if(current&&current.version!==body.expectedVersion)return jsonError('다른 곳에서 변경됐습니다. 목록을 새로 불러온 뒤 수정해 주세요.',409);
    if(current&&current.grade!==definition.grade)return jsonError('기존 평가의 학년은 바꿀 수 없습니다. 다른 학년은 복사하여 새 평가로 등록해 주세요.');
    const id=current?.id??crypto.randomUUID(),version=crypto.randomUUID(),now=new Date().toISOString();
    // Guarded update followed by a conditional revision INSERT in a single transaction.
    const update=current?db().prepare('UPDATE evaluation_forms SET title=?,code=?,status=?,version=?,definition=?,updated_at=? WHERE id=? AND version=?').bind(definition.title,definition.code,status,version,JSON.stringify(definition),now,id,current.version)
      :db().prepare('INSERT INTO evaluation_forms (id,title,code,grade,status,version,definition,updated_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,definition.title,definition.code,definition.grade,status,version,JSON.stringify(definition),now);
    const results=await db().batch([update,db().prepare('INSERT INTO evaluation_revisions (version,form_id,title,code,grade,definition,created_at) SELECT version,id,title,code,grade,definition,updated_at FROM evaluation_forms WHERE id=? AND version=?').bind(id,version)]);
    if(results[0].meta.changes!==1)return jsonError('다른 곳에서 변경됐습니다. 새로고침 후 다시 저장해 주세요.',409);
    return privateJson({evaluation:await getEvaluation(id)},{status:creating?201:200});
  }catch(error){if(String(error).includes('UNIQUE constraint'))return jsonError('같은 학년의 유형 코드가 이미 있습니다. 다른 코드로 저장해 주세요.',409);return jsonError('평가를 저장하지 못했습니다.',503);}
}
export function POST(r:Request){return save(r,true);}export function PUT(r:Request){return save(r,false);}
