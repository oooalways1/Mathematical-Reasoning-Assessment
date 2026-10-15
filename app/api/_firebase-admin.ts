import { env } from 'cloudflare:workers';

type ServiceAccount = { project_id: string; client_email: string; private_key: string };
const PROJECT_ID = 'soori-270e0';
const encoder = new TextEncoder();

function base64url(bytes: Uint8Array) {
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
    .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function firebaseAdminConfigured() {
  return Boolean(env.FIREBASE_SERVICE_ACCOUNT_JSON);
}

async function adminToken() {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) throw new Error('Firebase admin is not configured');
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON) as ServiceAccount;
  if (account.project_id !== PROJECT_ID || !account.client_email?.endsWith('.iam.gserviceaccount.com') || !account.private_key) {
    throw new Error('Invalid Firebase admin configuration');
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(encoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = base64url(encoder.encode(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/identitytoolkit',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  })));
  const pem = account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), character => character.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const input = `${header}.${claims}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(input));
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${input}.${base64url(new Uint8Array(signature))}` }),
  });
  const payload = await response.json() as { access_token?: string };
  if (!response.ok || !payload.access_token) throw new Error('Firebase admin authorization failed');
  return payload.access_token;
}

export async function lookupFirebaseAccount(uid: string) {
  const token = await adminToken();
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId: [uid] }),
  });
  const payload = await response.json() as { users?: { localId: string; email?: string }[] };
  if (!response.ok) throw new Error('Firebase account lookup failed');
  return payload.users?.find(user => user.localId === uid) ?? null;
}

export async function updateFirebaseAccount(uid: string, password: string, email?: string) {
  const token = await adminToken();
  const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:update', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetProjectId: PROJECT_ID, localId: uid, password, ...(email ? { email } : {}), validSince: String(Math.floor(Date.now() / 1000)) }),
  });
  const payload = await response.json() as { localId?: string; error?: { message?: string } };
  if (!response.ok || payload.localId !== uid) {
    if (payload.error?.message === 'EMAIL_EXISTS') return 'duplicate' as const;
    throw new Error('Firebase account update failed');
  }
  return 'updated' as const;
}
