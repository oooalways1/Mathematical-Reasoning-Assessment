import { createTeacherSession, db, isTeacher, jsonError, privateJson, sameOrigin, sessionCookie } from "../../_lib";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("잘못된 요청입니다.", 403);
  let body: { password?: unknown };
  try { body = await request.json() as { password?: unknown }; } catch { return jsonError("비밀번호를 입력해 주세요."); }
  if (typeof body.password !== "string" || body.password.length > 100) return jsonError("비밀번호를 확인해 주세요.", 401);
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
  const token = await createTeacherSession(body.password);
  if (!token) return jsonError("비밀번호를 확인해 주세요.", 401);
  return privateJson({ ok: true }, { headers: { "Set-Cookie": sessionCookie(token) } });
}

export async function GET(request: Request) {
  return privateJson({ authenticated: await isTeacher(request) });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return jsonError("잘못된 요청입니다.", 403);
  return privateJson({ ok: true }, { headers: { "Set-Cookie": sessionCookie("", 0) } });
}
