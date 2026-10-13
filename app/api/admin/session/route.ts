import { createTeacherSession, isTeacher, isTeacherAccount, jsonError, privateJson, sameOrigin, sessionCookie } from "../../_lib";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("잘못된 요청입니다.", 403);
  if (!isTeacherAccount(request)) return jsonError("등록된 교사 ChatGPT 계정으로 먼저 로그인해 주세요.", 403);
  let body: { password?: unknown };
  try { body = await request.json() as { password?: unknown }; } catch { return jsonError("비밀번호를 입력해 주세요."); }
  if (typeof body.password !== "string" || body.password.length > 100) return jsonError("비밀번호를 확인해 주세요.", 401);
  const token = await createTeacherSession(body.password);
  if (!token) return jsonError("비밀번호를 확인해 주세요.", 401);
  return privateJson({ ok: true }, { headers: { "Set-Cookie": sessionCookie(token) } });
}

export async function GET(request: Request) {
  return privateJson({ authenticated: await isTeacher(request), teacherAccount: isTeacherAccount(request) });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return jsonError("잘못된 요청입니다.", 403);
  return privateJson({ ok: true }, { headers: { "Set-Cookie": sessionCookie("", 0) } });
}
