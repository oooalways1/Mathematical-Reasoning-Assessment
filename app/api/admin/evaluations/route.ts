import { db,isTeacher,jsonError,privateJson,sameOrigin } from '../../_lib';
import { ensureEvaluations,listEvaluations,getEvaluation } from '../../_evaluations';
import { validateEvaluation } from '@/lib/evaluations';
import {administrator,canSchool,requestedSchool,audit} from '../../_tenancy';
export async function GET(request:Request){const actor=await administrator(request);if(!actor)return jsonError('교사 인증이 필요합니다.',401);try{const school=requestedSchool(request,actor),all=await listEvaluations(undefined,false,true);return privateJson({evaluations:all.filter(f=>canSchool(actor,f.schoolId??null)&&(!school||f.schoolId===school)),templates:all.filter(f=>!f.schoolId&&!f.trashed),admin:actor});}catch{return jsonError('평가 목록을 불러오지 못했습니다.',503);}}
async function save(request:Request,creating:boolean){
  if(!sameOrigin(request))return jsonError('잘못된 요청입니다.',403);
  const actor=await administrator(request);if(!actor)return jsonError('교사 인증이 필요합니다.',401);
  if(Number(request.headers.get('Content-Length'))>250000)return jsonError('평가 내용이 너무 큽니다.',413);
  let body:{definition?:unknown;id?:unknown;expectedVersion?:unknown;status?:unknown;confirmed?:unknown;schoolId?:unknown};
  try{body=await request.json();}catch{return jsonError('평가 내용을 확인해 주세요.');}
  if(!['draft','active','archived'].includes(String(body.status)))return jsonError('공개 상태를 확인해 주세요.');
  const status=String(body.status);
  if(status==='active'&&body.confirmed!==true)return jsonError('문항과 정답표 확인 항목을 선택해 주세요.');
  let definition;try{definition=validateEvaluation(body.definition,status==='active');}catch(error){return jsonError(error instanceof Error?error.message:'문항을 확인해 주세요.');}
  try{
    await ensureEvaluations();
    const current=creating?null:typeof body.id==='string'?await getEvaluation(body.id):null;
    if(!creating&&!current)return jsonError('평가를 찾지 못했습니다.',404);
    const schoolId=current?.schoolId??(typeof body.schoolId==='string'&&body.schoolId?body.schoolId:requestedSchool(request,actor));
    if(!canSchool(actor,current?current.schoolId??null:schoolId)||current&&body.schoolId!==undefined&&body.schoolId!==current.schoolId)return jsonError('담당 학교의 평가만 수정할 수 있습니다.',403);
    if(schoolId&&!await db().prepare('SELECT id FROM schools WHERE id=? AND active=1').bind(schoolId).first())return jsonError('활성 학교를 선택하세요.');
    if(current?.trashed)return jsonError('삭제된 평가입니다. 먼저 복구한 뒤 수정해 주세요.',409);
    if(current&&current.version!==body.expectedVersion)return jsonError('다른 곳에서 변경됐습니다. 목록을 새로 불러온 뒤 수정해 주세요.',409);
    if(current&&current.grade!==definition.grade)return jsonError('기존 평가의 학년은 바꿀 수 없습니다. 다른 학년은 복사하여 새 평가로 등록해 주세요.');
    const id=current?.id??crypto.randomUUID(),version=crypto.randomUUID(),now=new Date().toISOString();
    // Guarded update followed by a conditional revision INSERT in a single transaction.
    const update=current?db().prepare('UPDATE evaluation_forms SET title=?,code=?,status=?,version=?,definition=?,updated_at=? WHERE id=? AND version=? AND NOT EXISTS(SELECT 1 FROM evaluation_trash t WHERE t.form_id=evaluation_forms.id)').bind(definition.title,definition.code,status,version,JSON.stringify(definition),now,id,current.version)
      :db().prepare('INSERT INTO evaluation_forms (id,title,code,grade,status,version,definition,updated_at,school_id) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,definition.title,definition.code,definition.grade,status,version,JSON.stringify(definition),now,schoolId);
    const results=await db().batch([update,db().prepare('INSERT INTO evaluation_revisions (version,form_id,title,code,grade,definition,created_at) SELECT version,id,title,code,grade,definition,updated_at FROM evaluation_forms WHERE id=? AND version=?').bind(id,version)]);
    if(results[0].meta.changes!==1)return jsonError('다른 곳에서 변경됐습니다. 새로고침 후 다시 저장해 주세요.',409);
    await audit(actor,creating?'evaluation.create':'evaluation.update',id,schoolId,{version,status});
    return privateJson({evaluation:await getEvaluation(id)},{status:creating?201:200});
  }catch(error){if(String(error).includes('UNIQUE constraint'))return jsonError('같은 학년의 검사지 구분 이름이 이미 있습니다. 다른 이름을 쓰거나 삭제된 평가를 확인해 주세요.',409);return jsonError('평가를 저장하지 못했습니다.',503);}
}
export function POST(r:Request){return save(r,true);}export function PUT(r:Request){return save(r,false);}

async function trash(request:Request,restore:boolean){
  if(!sameOrigin(request))return jsonError('잘못된 요청입니다.',403);
  const actor=await administrator(request);if(!actor)return jsonError('교사 인증이 필요합니다.',401);
  let body:{id?:unknown;expectedVersion?:unknown};try{body=await request.json();}catch{return jsonError('평가를 선택해 주세요.');}
  if(typeof body.id!=='string'||typeof body.expectedVersion!=='string')return jsonError('평가 정보를 확인해 주세요.');
  try{
    const current=await getEvaluation(body.id);if(!current)return jsonError('평가를 찾지 못했습니다.',404);
    if(!canSchool(actor,current.schoolId??null))return jsonError('평가를 찾지 못했습니다.',404);
    if(current.version!==body.expectedVersion)return jsonError('평가가 변경됐습니다. 새로고침 후 다시 시도해 주세요.',409);
    const now=new Date().toISOString();
    if(!restore){
      const result=await db().prepare('INSERT OR IGNORE INTO evaluation_trash (form_id,deleted_at) SELECT id,? FROM evaluation_forms WHERE id=? AND version=?').bind(now,current.id,current.version).run();
      if(result.meta.changes!==1)return jsonError('이미 삭제됐거나 변경된 평가입니다. 새로고침해 주세요.',409);
    }else{
      const version=crypto.randomUUID();
      const results=await db().batch([
        db().prepare("UPDATE evaluation_forms SET status='draft',version=?,updated_at=? WHERE id=? AND version=? AND EXISTS(SELECT 1 FROM evaluation_trash t WHERE t.form_id=evaluation_forms.id)").bind(version,now,current.id,current.version),
        db().prepare('INSERT INTO evaluation_revisions (version,form_id,title,code,grade,definition,created_at) SELECT version,id,title,code,grade,definition,updated_at FROM evaluation_forms WHERE id=? AND version=?').bind(current.id,version),
        db().prepare('DELETE FROM evaluation_trash WHERE form_id IN (SELECT id FROM evaluation_forms WHERE id=? AND version=?)').bind(current.id,version),
      ]);
      if(results[0].meta.changes!==1)return jsonError('복구 상태가 변경됐습니다. 새로고침해 주세요.',409);
    }
    await audit(actor,restore?'evaluation.restore':'evaluation.trash',current.id,current.schoolId??null);return privateJson({ok:true});
  }catch{return jsonError(restore?'평가를 복구하지 못했습니다.':'평가를 삭제하지 못했습니다.',503);}
}
export function DELETE(request:Request){return trash(request,false);}export function PATCH(request:Request){return trash(request,true);}
