import {env} from 'cloudflare:workers';
import {db,jsonError,privateJson,sameOrigin} from '../../_lib';
import {ensureTenancy} from '../../_tenancy';
import {ensureSchools,activeSchool} from '../../_schools';
import {adminEmail} from '../../_firebase-auth';
import {classroomKey} from '@/lib/teacher-scope';
export async function POST(request:Request){
 if(!sameOrigin(request))return jsonError('잘못된 요청입니다.',403);
 if(Number(request.headers.get('content-length'))>6000)return jsonError('입력이 너무 깁니다.',413);
 let b:Record<string,unknown>;try{b=await request.json();}catch{return jsonError('가입 정보를 확인하세요.');}
 const loginId=typeof b.loginId==='string'?b.loginId.trim().toLowerCase():'',name=typeof b.name==='string'?b.name.trim():'',mode=b.requestedScope,grade=Number(b.grade),classroom=typeof b.classroom==='string'?classroomKey(b.classroom):'';
 if(!/^[a-z][a-z0-9_]{3,19}$/.test(loginId)||!name||name.length>40||typeof b.password!=='string'||b.password.length<10||b.password.length>128||!['school','class'].includes(String(mode))||(mode==='class'&&(![1,2,3].includes(grade)||!classroom||classroom.length>30)))return jsonError('이름, 아이디(영문 시작 4~20자), 비밀번호(10자리 이상), 담당 범위를 확인하세요.');
 let freshToken:string|undefined;
 try{
  await ensureSchools();await ensureTenancy();
  const school=await activeSchool(b.schoolId);if(!school)return jsonError('가입 가능한 학교를 선택하세요.');
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('teacher-signup:'+(request.headers.get('CF-Connecting-IP')||'local'))),bucket=Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join(''),now=Date.now();
  const limit=await db().prepare('INSERT INTO admin_attempts(bucket,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN expires_at<=? THEN 1 ELSE attempts+1 END,expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING attempts').bind(bucket,now+3600000,now,now).first<{attempts:number}>();
  if(!limit||limit.attempts>5)return jsonError('신청 횟수를 초과했습니다. 한 시간 후 다시 시도하세요.',429);
  if(!env.FIREBASE_API_KEY)return jsonError('가입 서비스를 준비 중입니다.',503);
  if(await db().prepare('SELECT id FROM administrators WHERE login_id=?').bind(loginId).first())return jsonError('사용 중인 아이디입니다.',409);
  const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key='+encodeURIComponent(env.FIREBASE_API_KEY),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:adminEmail(loginId),password:b.password,returnSecureToken:true})});
  const data=await response.json() as {localId?:string;idToken?:string;error?:{message?:string}};
  if(!response.ok||!data.localId||!data.idToken)return jsonError(data.error?.message==='EMAIL_EXISTS'?'사용 중인 아이디입니다.':'가입 정보를 확인하거나 잠시 후 다시 시도하세요.',data.error?.message==='EMAIL_EXISTS'?409:503);
  freshToken=data.idToken;const adminId=crypto.randomUUID(),id=crypto.randomUUID(),created=new Date().toISOString();
  await db().batch([db().prepare("INSERT INTO administrators(id,firebase_uid,login_id,role,active,created_at) VALUES(?,?,?,'school',0,?)").bind(adminId,data.localId,loginId,created),db().prepare('INSERT INTO teacher_applications(id,admin_id,name,school_id,requested_scope,grade,classroom,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,adminId,name,school.id,String(mode),mode==='class'?grade:null,mode==='class'?classroom:'',created)]);
  freshToken=undefined;return privateJson({ok:true,status:'pending'},{status:201});
 }catch{
  if(freshToken&&env.FIREBASE_API_KEY){try{await fetch('https://identitytoolkit.googleapis.com/v1/accounts:delete?key='+encodeURIComponent(env.FIREBASE_API_KEY),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:freshToken})});}catch{/* No credentials are logged or retained. */}}
  return jsonError('가입 신청을 저장하지 못했습니다. 잠시 후 다시 시도하세요.',503);
 }
}
