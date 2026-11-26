import {db,jsonError} from '../../_lib';
import {originalAccess,originalBucket,originalsReady} from '../../_originals';
export async function GET(request:Request){
 try{const id=new URL(request.url).searchParams.get('id');if(!id)return jsonError('원본을 선택하세요.');await originalsReady();const row=await db().prepare("SELECT assessment_id,object_key,name,content_type FROM assessment_files WHERE id=? AND status='ready'").bind(id).first<{assessment_id:string;object_key:string;name:string;content_type:string}>();
 if(!row||!await originalAccess(request,row.assessment_id))return jsonError('원본을 찾지 못했습니다.',404);
 const bucket=originalBucket();if(!bucket)return jsonError('원본 보관소가 연결되지 않았습니다.',503);const object=await bucket.get(row.object_key);if(!object)return jsonError('원본 파일을 찾지 못했습니다. 관리자에게 문의하세요.',404);
 const download=new URL(request.url).searchParams.get('download')==='1';
 return new Response(object.body,{headers:{'Content-Type':row.content_type,'Content-Length':String(object.size),'Content-Disposition':(download?'attachment':'inline')+"; filename=answer-original; filename*=UTF-8''"+encodeURIComponent(row.name),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'; style-src 'unsafe-inline'",'Referrer-Policy':'no-referrer'}});
 }catch{return jsonError('원본을 열지 못했습니다. 다시 시도하세요.',503);}
}
