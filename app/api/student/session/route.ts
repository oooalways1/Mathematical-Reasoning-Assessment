import { createStudentSession, db, jsonError, privateJson, sameOrigin, sessionCookie } from "../../_lib";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("잘못된 요청입니다.", 403);
  let body: { code?: unknown };
  try { body = await request.json() as typeof body; } catch { return jsonError("참여코드를 입력해 주세요."); }
  const code = typeof body.code === "string" ? body.code.replace(/[\s-]/g, "").toUpperCase() : "";
  if (!/^[A-F0-9]{16}$/.test(code)) return jsonError("선생님이 알려주신 참여코드 16자리를 확인해 주세요.", 401);
  try {
    const student = await db().prepare("SELECT id, name, grade, classroom FROM students WHERE access_code=?").bind(code).first<{ id: string; name: string; grade: number; classroom: string }>();
    if (!student) return jsonError("참여코드가 맞지 않습니다. 선생님께 확인해 주세요.", 401);
    const token = await createStudentSession(student.id);
    return privateJson({ student }, { headers: { "Set-Cookie": sessionCookie(token, 2 * 60 * 60, "student_session") } });
  } catch { return jsonError("접속하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503); }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return jsonError("잘못된 요청입니다.", 403);
  return privateJson({ ok: true }, { headers: { "Set-Cookie": sessionCookie("", 0, "student_session") } });
}
