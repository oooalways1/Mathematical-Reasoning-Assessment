import { env } from 'cloudflare:workers';
import { db, isTeacher, jsonError, privateJson, sameOrigin } from '../../_lib';
import { firebaseAdminConfigured, lookupFirebaseAccount, updateFirebaseAccount } from '../../_firebase-admin';
import { allowAccountAction } from '../../_auth-limits';
import { normalizeUsername, usernameEmail, usernameFromEmail, USERNAME_PATTERN, USERNAME_GUIDE } from '@/lib/student-login';
import {administrator,canStudent,audit,studentSchool} from '../../_tenancy';
import {firebasePassword,adminEmail} from '../../_firebase-auth';

export async function GET(request: Request) {
  if (!await isTeacher(request)) return jsonError('교사 인증이 필요합니다.', 401);
  if (!firebaseAdminConfigured()) return privateJson({ ready: false });
  const studentId = new URL(request.url).searchParams.get('studentId');
  if (!studentId || studentId.length > 100) return jsonError('학생을 선택해 주세요.');
  const actor=await administrator(request);if(!actor||!await canStudent(actor,studentId))return jsonError('학생을 찾지 못했습니다.',404);
  try {
    if (!await allowAccountAction(request, 'account-lookup', 120)) return jsonError('요청이 많습니다. 잠시 후 다시 시도해 주세요.', 429);
    const student = await db().prepare('SELECT firebase_uid FROM students WHERE id=?').bind(studentId).first<{ firebase_uid: string | null }>();
    if (!student?.firebase_uid) return privateJson({ ready: true, registered: false });
    const account = await lookupFirebaseAccount(student.firebase_uid);
    if (!account) return jsonError('Firebase 계정을 찾지 못했습니다. 관리자 설정을 확인해 주세요.', 404);
    return privateJson({ ready: true, registered: true, loginId: usernameFromEmail(account.email ?? '') });
  } catch { return jsonError('계정을 확인하지 못했습니다. Firebase 관리자 권한 설정을 확인해 주세요.', 503); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError('잘못된 요청입니다.', 403);
  if (!await isTeacher(request)) return jsonError('교사 인증이 필요합니다.', 401);
  if (!firebaseAdminConfigured()) return jsonError('Cloudflare에 FIREBASE_SERVICE_ACCOUNT_JSON 시크릿을 먼저 등록해 주세요.', 503);
  let body: { studentId?: unknown; password?: unknown; username?: unknown; teacherPassword?: unknown };
  try { body = await request.json() as typeof body; } catch { return jsonError('입력 정보를 확인해 주세요.'); }
  const studentId = typeof body.studentId === 'string' ? body.studentId : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const username = normalizeUsername(body.username);
  if (!studentId || studentId.length > 100 || password.length < 6 || password.length > 128) return jsonError('학생과 최소 6자리 비밀번호를 확인해 주세요.');
  if (username && !USERNAME_PATTERN.test(username)) return jsonError(`새 아이디는 ${USERNAME_GUIDE}로 입력해 주세요.`);
  try {
    if (!await allowAccountAction(request, 'account-reset', 10)) return jsonError('시도 횟수를 초과했습니다. 15분 후 다시 시도해 주세요.', 429);
    const actor=await administrator(request);if(!actor||!await canStudent(actor,studentId))return jsonError('학생을 찾지 못했습니다.',404);
    if(actor.legacy){if(!env.TEACHER_PASSWORD||body.teacherPassword!==env.TEACHER_PASSWORD)return jsonError('관리자 비밀번호를 확인해 주세요.',401);}
    else{const account=await db().prepare('SELECT login_id,firebase_uid FROM administrators WHERE id=? AND active=1').bind(actor.id).first<{login_id:string;firebase_uid:string}>();if(!account||typeof body.teacherPassword!=='string'||await firebasePassword(adminEmail(account.login_id),body.teacherPassword)!==account.firebase_uid)return jsonError('현재 관리자 비밀번호로 다시 인증해 주세요.',401);}
    const student = await db().prepare('SELECT firebase_uid FROM students WHERE id=?').bind(studentId).first<{ firebase_uid: string | null }>();
    if (!student?.firebase_uid) return jsonError('회원가입이 완료된 학생만 비밀번호를 변경할 수 있습니다.', 404);
    // Invalidate existing app sessions before changing Firebase credentials.
    // A failed Firebase call may sign the student out, but cannot leave old
    // app sessions usable after a successful password change.
    const now = Date.now();
    await db().prepare(`INSERT INTO admin_attempts (bucket, attempts, expires_at) VALUES (?, ?, ?)
      ON CONFLICT(bucket) DO UPDATE SET attempts=excluded.attempts, expires_at=excluded.expires_at`)
      .bind(`student-revocation:${studentId}`, now, now + 2 * 60 * 60 * 1000).run();
    const outcome = await updateFirebaseAccount(student.firebase_uid, password, username ? usernameEmail(username) : undefined);
    if (outcome === 'duplicate') return jsonError('이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.', 409);
    await audit(actor,'student.credentials-reset',studentId,await studentSchool(studentId));return privateJson({ ok: true, message: username ? '아이디와 비밀번호를 변경했습니다. 학생에게 새 로그인 정보를 알려 주세요.' : '비밀번호를 변경했습니다. 학생에게 새 비밀번호를 알려 주세요.' });
  } catch { return jsonError('변경을 완료하지 못했습니다. Firebase 관리자 권한을 확인한 뒤 다시 시도해 주세요.', 503); }
}
