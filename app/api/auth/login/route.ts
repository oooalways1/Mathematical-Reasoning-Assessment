import { env } from "cloudflare:workers";
import { createStudentSession, db, jsonError, privateJson, sameOrigin, sessionCookie } from "../../_lib";
import { loginEmails, usernameEmail, usernameFromEmail, USERNAME_PATTERN } from "@/lib/student-login";
import { allowAccountAction } from '../../_auth-limits';
import { withSchools } from '../../_schools';
import {updateFirebaseIdentity} from '../../_firebase-admin';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("잘못된 요청입니다.", 403);
  const apiKey = env.FIREBASE_API_KEY;
  if (!apiKey) return jsonError("Firebase 이메일 인증 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.", 503);
  let body: { username?: unknown; email?: unknown; password?: unknown };
  try { body = await request.json() as typeof body; } catch { return jsonError("로그인 정보를 확인해 주세요."); }
  const emails = loginEmails(body.username ?? body.email),email=emails[0];
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password || password.length > 128) return jsonError("아이디와 비밀번호를 확인해 주세요.");
  try {
    if (!await allowAccountAction(request, 'student-login', 1200) || !await allowAccountAction(request, `student-login:${email}`, 20)) return jsonError('로그인 시도가 많습니다. 15분 후 다시 시도해 주세요.', 429);
    let firebase:{localId?:string;idToken?:string;email?:string;displayName?:string}|undefined;
    for(const candidate of emails){
      const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:candidate,password,returnSecureToken:true})});
      const data=await response.json() as {localId?:string;idToken?:string;email?:string;displayName?:string;error?:{message?:string}};
      if(response.ok&&data.localId){firebase=data;break;}
      if(data.error?.message==='TOO_MANY_ATTEMPTS_TRY_LATER')return jsonError('로그인 요청이 많습니다. 잠시 후 다시 시도해 주세요.',429);
    }
    if(!firebase?.localId)return jsonError('아이디 또는 비밀번호를 확인해 주세요.',401);
    const student = await db().prepare("SELECT id, name, grade, classroom, created_at AS createdAt FROM students WHERE firebase_uid=?").bind(firebase.localId).first<Record<string, unknown>>();
    if (!student) return jsonError("계정 인증은 확인됐지만 현재 사이트에 학생 정보가 연결되지 않았습니다. 선생님께 기존 학생 정보 복원을 요청해 주세요.", 409);
    // Migrate only the successfully authenticated, linked identity. An email
    // collision leaves its old alias intact; profile sync must not block login.
    if(firebase.email&&firebase.idToken){const id=usernameFromEmail(firebase.email);if(USERNAME_PATTERN.test(id)){
      const preferred=usernameEmail(id);
      if(firebase.email!==preferred)try{await updateFirebaseIdentity(firebase.localId,preferred,id);}catch{/* Keep the old identity on conflict or configuration failure. */}
      else if(firebase.displayName!==id)try{await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(apiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:firebase.idToken,displayName:id,returnSecureToken:true})});}catch{/* Keep successful login available. */}
    }}
    const session = await createStudentSession(String(student.id));
    const [profile] = await withSchools([{...student,id:String(student.id)}]);
    return privateJson({ student: { ...profile, latestScore: null, assessmentCount: 0 } }, { headers: { "Set-Cookie": sessionCookie(session, 2 * 60 * 60, "student_session") } });
  } catch (error) { console.error("Could not sign in student", error); return jsonError("로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.", 503); }
}
