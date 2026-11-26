import {db,jsonError,privateJson,sameOrigin} from '../../_lib';
import {administrator} from '../../_tenancy';
import {validateClassScopes} from '@/lib/teacher-scope';
export async function GET(request:Request){const actor=await administrator(request);if(!actor)return jsonError('교사 인증이 필요합니다.',401);if(actor.role!=='super')return jsonError('최고관리자만 조회할 수 있습니다.',403);const rows=await db().prepare('SELECT t.id,t.name,t.school_id AS schoolId,s.name AS schoolName,t.requested_scope AS requestedScope,t.grade,t.classroom,t.status,t.reason,t.revision,t.created_at AS createdAt,t.reviewed_at AS reviewedAt,a.login_id AS loginId FROM teacher_applications t JOIN administrators a ON a.id=t.admin_id JOIN schools s ON s.id=t.school_id ORDER BY t.created_at DESC').all();return privateJson({applications:rows.results});}
export async function PATCH(request:Request){
 if(!sameOrigin(request))return jsonError('잘못된 요청입니다.',403);const actor=await administrator(request);if(!actor)return jsonError('인증이 필요합니다.',401);if(actor.role!=='super')return jsonError('최고관리자만 승인할 수 있습니다.',403);
 let b:Record<string,unknown>;try{b=await request.json();}catch{return jsonError('신청을 선택하세요.');}
 if(typeof b.id!=='string'||!Number.isInteger(b.revision)||!['approve','reject'].includes(String(b.action))||typeof b.reason!=='string'||b.reason.length>500)return jsonError('신청과 검토 내용을 확인하세요.');
 const row=await db().prepare('SELECT admin_id,school_id,status FROM teacher_applications WHERE id=?').bind(b.id).first<{admin_id:string;school_id:string;status:string}>();
 if(!row||row.status!=='pending')return jsonError('처리 가능한 신청이 없습니다. 새로 불러오세요.',409);
 if(row.admin_id===actor.id)return jsonError('본인 신청을 승인할 수 없습니다.',403);
 const approve=b.action==='approve',mode=b.scopeMode;
 if(approve&&!['school','class'].includes(String(mode)))return jsonError('승인할 권한 범위를 선택하세요.');
 if(approve&&!await db().prepare('SELECT id FROM schools WHERE id=? AND active=1').bind(row.school_id).first())return jsonError('현재 활성화된 학교가 아닙니다.',409);
 let classes;try{classes=approve&&mode==='class'?validateClassScopes(b.classes,[row.school_id]):[];if(approve&&mode==='class'&&!classes.length)throw Error('담당 학급을 지정하세요.');}catch(e){return jsonError((e as Error).message);}
 const marker=crypto.randomUUID(),now=new Date().toISOString(),gate='EXISTS(SELECT 1 FROM teacher_applications WHERE id=? AND decision_marker=?)';
 try{const result=await db().batch([
 db().prepare("UPDATE teacher_applications SET status=?,reason=?,reviewed_by=?,reviewed_at=?,revision=revision+1,decision_marker=? WHERE id=? AND revision=? AND status='pending' AND (?=1 OR EXISTS(SELECT 1 FROM administrators WHERE id=? AND active=1 AND role='super'))").bind(approve?'approved':'rejected',b.reason.trim(),actor.id,now,marker,b.id,Number(b.revision),Number(Boolean(actor.legacy)),actor.id),
 db().prepare("UPDATE administrators SET active=?,role='school',session_version=session_version+1 WHERE id=? AND "+gate).bind(Number(approve),row.admin_id,b.id,marker),
 db().prepare('DELETE FROM administrator_schools WHERE admin_id=? AND '+gate).bind(row.admin_id,b.id,marker),
 db().prepare('DELETE FROM administrator_classes WHERE admin_id=? AND '+gate).bind(row.admin_id,b.id,marker),
 db().prepare('INSERT INTO administrator_access(admin_id,mode) SELECT ?,? WHERE '+gate+' ON CONFLICT(admin_id) DO UPDATE SET mode=excluded.mode').bind(row.admin_id,approve?String(mode):'class',b.id,marker),
 ...(approve?[db().prepare('INSERT INTO administrator_schools(admin_id,school_id) SELECT ?,? WHERE '+gate).bind(row.admin_id,row.school_id,b.id,marker)]:[]),
 ...classes.map(c=>db().prepare('INSERT INTO administrator_classes(admin_id,school_id,grade,classroom) SELECT ?,?,?,? WHERE '+gate).bind(row.admin_id,c.schoolId,c.grade,c.classroom,b.id,marker)),
 db().prepare('INSERT INTO audit_log(id,actor_id,action,school_id,target_id,details,created_at) SELECT ?,?,?,?,?,?,? WHERE '+gate).bind(marker,actor.id,approve?'teacher.approve':'teacher.reject',row.school_id,row.admin_id,JSON.stringify({scopeMode:mode??null,classes,reason:b.reason.trim()}),now,b.id,marker)
 ]);if(result[0].meta.changes!==1)return jsonError('다른 화면에서 처리했습니다. 새로 불러오세요.',409);return privateJson({ok:true});}catch{return jsonError('승인 상태를 저장하지 못했습니다.',503);}
}
