import { env } from "cloudflare:workers";
import { createStudentSession, db, jsonError, privateJson, sameOrigin, sessionCookie } from "../../_lib";

type Body = { name?: unknown; grade?: unknown; classroom?: unknown; email?: unknown; password?: unknown };
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("잘못된 요청입니다.", 403);
  const apiKey = env.FIREBASE_API_KEY;
  if (!apiKey) return jsonError("Firebase 이메일 인증 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.", 503);
  let body: Body;
  try { body = await request.json() as Body; } catch { return jsonError("회원가입 정보를 확인해 주세요."); }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
  const grade = Number(body.grade);
  const classroom = typeof body.classroom === "string" ? body.classroom.trim().slice(0, 30) : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!name || !Number.isInteger(grade) || grade < 1 || grade > 3) return jsonError("이름과 1~3학년 정보를 입력해 주세요.");
  if (!validEmail(email) || email.length > 254) return jsonError("올바른 이메일 주소를 입력해 주세요.");
  if (password.length < 6 || password.length > 128) return jsonError("비밀번호는 6~128자로 입력해 주세요.");
  let createdToken: string | undefined;
  let profileSaved = false;
  try {
    const database = db();
    await database.prepare("SELECT firebase_uid FROM students LIMIT 1").first();
    const id = crypto.randomUUID();
    const session = await createStudentSession(id);
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
    const firebase = await response.json() as { localId?: string; idToken?: string; error?: { message?: string } };
    if (!response.ok || !firebase.localId || !firebase.idToken) {
      if (firebase.error?.message === "EMAIL_EXISTS") return jsonError("이미 가입된 이메일입니다. 로그인해 주세요.", 409);
      if (firebase.error?.message?.startsWith("WEAK_PASSWORD")) return jsonError("비밀번호는 6자 이상 입력해 주세요.");
      if (firebase.error?.message === "OPERATION_NOT_ALLOWED" || firebase.error?.message === "PASSWORD_LOGIN_DISABLED") return jsonError("이메일 회원가입 설정이 꺼져 있습니다. 관리자에게 문의해 주세요.", 503);
      if (firebase.error?.message === "TOO_MANY_ATTEMPTS_TRY_LATER") return jsonError("요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429);
      return jsonError("이메일 회원가입을 완료하지 못했습니다. 입력 정보를 확인해 주세요.");
    }
    createdToken = firebase.idToken;
    await database.prepare("INSERT INTO students (id, name, grade, classroom, firebase_uid) VALUES (?, ?, ?, ?, ?)").bind(id, name, grade, classroom, firebase.localId).run();
    profileSaved = true;
    return privateJson({ student: { id, name, grade, classroom, createdAt: new Date().toISOString(), latestScore: null, assessmentCount: 0 } }, { status: 201, headers: { "Set-Cookie": sessionCookie(session, 2 * 60 * 60, "student_session") } });
  } catch {
    if (createdToken && !profileSaved) {
      try {
        const cleanup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: createdToken }) });
        if (!cleanup.ok) console.error("Signup profile save and new-account rollback failed");
      } catch { console.error("Signup new-account rollback unavailable"); }
    }
    return jsonError("회원가입을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
  }
}
