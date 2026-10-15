import { db } from './_lib';

export async function allowAccountAction(request: Request, action: string, limit: number) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${action}:${ip}`));
  const bucket = `auth:${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')}`;
  const now = Date.now();
  const row = await db().prepare(`INSERT INTO admin_attempts (bucket, attempts, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN expires_at<=? THEN 1 ELSE attempts+1 END,
    expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END
    RETURNING attempts`).bind(bucket, now + 15 * 60 * 1000, now, now).first<{ attempts: number }>();
  return Boolean(row && row.attempts <= limit);
}
