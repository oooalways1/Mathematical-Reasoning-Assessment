import { createTeacherSession, db, isTeacher, jsonError, privateJson, sameOrigin, sessionCookie } from "../../_lib";
import {administrator,adminToken,audit,ensureTenancy} from '../../_tenancy';
import {adminEmail,firebasePassword,firebaseIdentity} from '../../_firebase-auth';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("잘못된 요청입니다.", 403);
  let body: { password?: unknown;username?:unknown;idToken?:unknown };
  try { body = await request.json(); } catch { return jsonError("로그인 정보를 입력해 주세요."); }
  if (body.idToken===undefined&&(typeof body.password !== "string" || body.password.length > 128)) return jsonError("비밀번호를 확인해 주세요.", 401);
  // CF-Connecting-IP is set by Cloudflare; do not trust client supplied forwarding headers.
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('admin:' + ip));
  const bucket = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  try {
    const now = Date.now();
    const row = await db().prepare(`INSERT INTO admin_attempts (bucket, attempts, expires_at) VALUES (?, 1, ?)
      ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN expires_at<=? THEN 1 ELSE attempts+1 END,
      expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END
      RETURNING attempts, expires_at AS expiresAt`).bind(bucket, now + 15 * 60 * 1000, now, now).first<{ attempts: number; expiresAt: number }>();
    if (!row || row.attempts > 10) return privateJson({ error: '시도 횟수를 초과했습니다. 15분 후 다시 시도해 주세요.' }, { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil(((row?.expiresAt ?? now + 900000) - now) / 1000))) } });
    await db().prepare('DELETE FROM admin_attempts WHERE expires_at<?').bind(now).run();
  } catch { return jsonError('관리페이지 접속을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.', 503); }
  await ensureTenancy();
  if(typeof body.username==='string'||typeof body.idToken==='string'){
   if(typeof body.username==='string'&&body.username.length>150||typeof body.idToken==='string'&&body.idToken.length>10000)return jsonError('로그인 정보를 확인해 주세요.');
   try{const uid=typeof body.idToken==='string'?await firebaseIdentity(body.idToken):await firebasePassword(adminEmail(String(body.username).trim()),String(body.password));
    const row=uid?await db().prepare('SELECT id,session_version FROM administrators WHERE firebase_uid=? AND active=1').bind(uid).first<{id:string;session_version:number}>():null;
    if(!row)return jsonError('관리자 아이디와 비밀번호 또는 계정 활성 상태를 확인해 주세요.',401);
    const token=await adminToken(row.id,row.session_version);const response=privateJson({ok:true},{headers:{'Set-Cookie':sessionCookie(token,28800,'admin_session')}});
    await audit({id:row.id,role:'school',schools:[]},'admin.login',row.id,null);return response;
   }catch{return jsonError('관리자 인증 서비스를 확인하지 못했습니다.',503);}
  }
  const disabled=await db().prepare("SELECT value FROM app_settings WHERE key='legacy_admin_disabled'").first<{value:string}>();
  if(disabled?.value==='1')return jsonError('개인 관리자 아이디로 로그인해 주세요.',401);
  const token = await createTeacherSession(String(body.password));
  if (!token) return jsonError("비밀번호를 확인해 주세요.", 401);
  await audit({id:'legacy-owner',role:'super',schools:[]},'admin.legacy-login','legacy-owner',null);
  return privateJson({ ok: true }, { headers: { "Set-Cookie": sessionCookie(token) } });
}

export async function GET(request: Request) {
  const admin=await administrator(request);return privateJson({authenticated:Boolean(admin),admin});
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return jsonError("잘못된 요청입니다.", 403);
  const headers=new Headers();headers.append('Set-Cookie',sessionCookie('',0));headers.append('Set-Cookie',sessionCookie('',0,'admin_session'));return privateJson({ok:true},{headers});
}
