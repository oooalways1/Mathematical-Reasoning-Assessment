import {db,jsonError,privateJson,sameOrigin,studentSessionId} from '../../_lib';
import {administrator} from '../../_tenancy';
import {originalAccess,originalBucket,originalsReady,originalType,originalName,FILE_LIMIT,STUDENT_LIMIT,APP_LIMIT} from '../../_originals';
export async function GET(request:Request){try{const id=new URL(request.url).searchParams.get('assessmentId');if(!id||!await originalAccess(request,id))return jsonError('진단 기록을 찾지 못했습니다.',404);await originalsReady();const rows=await db().prepare("SELECT id,name,content_type AS contentType,size,created_at AS createdAt FROM assessment_files WHERE assessment_id=? AND status='ready' ORDER BY created_at,id").bind(id).all();return privateJson({files:rows.results,available:Boolean(originalBucket())});}catch{return jsonError('원본 목록을 불러오지 못했습니다.',503);}}
export async function POST(request:Request){
 if(!sameOrigin(request))return jsonError('잘못된 요청입니다.',403);
 if(!await studentSessionId(request)&&!await administrator(request))return jsonError('로그인이 필요합니다.',401);
 const bucket=originalBucket();if(!bucket)return jsonError('원본 보관소가 아직 연결되지 않았습니다. 채점 기록은 그대로 유지됩니다.',503);
 const limit=FILE_LIMIT+65536;if(Number(request.headers.get('Content-Length'))>limit)return jsonError('원본 파일은 20MB 이하로 올려 주세요.',413);
 let reserved:string|undefined,key:string|undefined;
 try{
  // Bound the actual stream before multipart parsing, including chunked requests.
  const reader=request.body?.getReader();if(!reader)return jsonError('파일을 선택하세요.');const chunks:Uint8Array[]=[];let size=0;
  while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>limit){await reader.cancel();return jsonError('원본 파일은 20MB 이하로 올려 주세요.',413);}chunks.push(next.value);}
  const body=new Uint8Array(size);let offset=0;for(const part of chunks){body.set(part,offset);offset+=part.length;}
  const form=await new Response(body,{headers:{'Content-Type':request.headers.get('Content-Type')??''}}).formData(),assessmentId=form.get('assessmentId'),uploadId=form.get('uploadId'),file=form.get('file');
  if(typeof assessmentId!=='string'||typeof uploadId!=='string'||!/^[a-f0-9-]{36}$/i.test(uploadId)||!(file instanceof File)||file.size===0||file.size>FILE_LIMIT)return jsonError('진단과 원본 파일(PDF·JPG·PNG, 20MB 이하)을 확인하세요.');
  const access=await originalAccess(request,assessmentId);if(!access)return jsonError('진단 기록을 찾지 못했습니다.',404);
  const bytes=new Uint8Array(await file.arrayBuffer()),type=originalType(bytes);if(!type)return jsonError('PDF, JPG, PNG 원본만 올릴 수 있습니다.',415);
  await originalsReady();
  const existing=await db().prepare('SELECT assessment_id,status FROM assessment_files WHERE id=?').bind(uploadId).first<{assessment_id:string;status:string}>();
  if(existing)return existing.assessment_id===assessmentId&&existing.status==='ready'?privateJson({ok:true,id:uploadId,alreadySaved:true}):jsonError('파일 저장 중입니다. 잠시 후 목록을 확인해 주세요.',409);
  key='originals/'+crypto.randomUUID();const created=new Date().toISOString();
  const reservation=await db().prepare("INSERT OR IGNORE INTO assessment_files(id,assessment_id,student_id,object_key,name,content_type,size,status,uploader_id,created_at) SELECT ?,?,?,?,?,?,?,'uploading',?,? WHERE (SELECT COALESCE(SUM(size),0) FROM assessment_files)+?<=? AND (SELECT COALESCE(SUM(size),0) FROM assessment_files WHERE student_id=?)+?<=? AND (SELECT COUNT(*) FROM assessment_files WHERE assessment_id=?)<80").bind(uploadId,assessmentId,access.studentId,key,originalName(file.name),type,file.size,access.uploaderId,created,file.size,APP_LIMIT,access.studentId,file.size,STUDENT_LIMIT,assessmentId).run();
  if(reservation.meta.changes!==1)return jsonError('원본 보관 한도에 도달했거나 같은 파일을 저장 중입니다. 관리자에게 문의하세요.',409);
  reserved=uploadId;
  await bucket.put(key,bytes,{httpMetadata:{contentType:type}});
  const saved=await db().prepare("UPDATE assessment_files SET status='ready' WHERE id=? AND status='uploading'").bind(uploadId).run();if(saved.meta.changes!==1)throw Error('Reservation lost');
  reserved=undefined;return privateJson({ok:true,id:uploadId},{status:201});
 }catch{
  if(reserved&&key){try{await bucket.delete(key);await db().prepare("DELETE FROM assessment_files WHERE id=? AND status='uploading'").bind(reserved).run();}catch{/* Keep reservation if object deletion failed, so quota remains conservative. */}}
  return jsonError('원본을 저장하지 못했습니다. 채점은 유지됩니다. 원본 목록에서 다시 첨부해 주세요.',503);
 }
}
