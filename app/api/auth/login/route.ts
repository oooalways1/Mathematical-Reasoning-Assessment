import { env } from "cloudflare:workers";
import { createStudentSession, db, jsonError, privateJson, sameOrigin, sessionCookie } from "../../_lib";
import { loginEmail } from "@/lib/student-login";
import { allowAccountAction } from '../../_auth-limits';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("잘못된 요청입니다.", 403);
  const apiKey = env.FIREBASE_API_KEY;
  if (!apiKey) return jsonError("Firebase 이메일 인증 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.", 503);
  let body: { username?: unknown; email?: unknown; password?: unknown };
  try { body = await request.json() as typeof body; } catch { return jsonError("로그인 정보를 확인해 주세요."); }
  const email = loginEmail(body.username ?? body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password || password.length > 128) return jsonError("아이디와 비밀번호를 확인해 주세요.");
  try {
    if (!await allowAccountAction(request, 'student-login', 1200) || !await allowAccountAction(request, `student-login:${email}`, 20)) return jsonError('로그인 시도가 많습니다. 15분 후 다시 시도해 주세요.', 429);
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
    const firebase = await response.json() as { localId?: string };
    if (!response.ok || !firebase.localId) return jsonError("아이디 또는 비밀번호를 확인해 주세요.", 401);
    const student = await db().prepare("SELECT id, name, grade, classroom, created_at AS createdAt FROM students WHERE firebase_uid=?").bind(firebase.localId).first<Record<string, unknown>>();
    if (!student) return jsonError("계정 인증은 확인됐지만 현재 사이트에 학생 정보가 연결되지 않았습니다. 선생님께 기존 학생 정보 복원을 요청해 주세요.", 409);
    const session = await createStudentSession(String(student.id));
    return privateJson({ student: { ...student, latestScore: null, assessmentCount: 0 } }, { headers: { "Set-Cookie": sessionCookie(session, 2 * 60 * 60, "student_session") } });
  } catch (error) { console.error("Could not sign in student", error); return jsonError("로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.", 503); }
}
