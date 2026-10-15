import { env } from "cloudflare:workers";

export function db() {
  if (!env.DB) throw new Error("The D1 database is not configured.");
  return env.DB;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

async function verify(value: string, signature: string) {
  if (!env.SESSION_SECRET || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const bytes = Uint8Array.from(atob(signature.replaceAll("-", "+").replaceAll("_", "/") + "="), (character) => character.charCodeAt(0));
  return crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(value));
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("Cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return cookie?.slice(name.length + 1);
}

export async function isTeacher(request: Request) {
  const token = cookieValue(request, "teacher_session");
  if (!token) return false;
  const [expiresAt, signature, extra] = token.split(".");
  if (extra !== undefined) return false;
  if (!expiresAt || !signature || !/^\d+$/.test(expiresAt) || Number(expiresAt) < Date.now()) return false;
  return verify("teacher." + expiresAt, signature);
}

export async function createTeacherSession(password: string) {
  const secret = env.TEACHER_PASSWORD;
  if (!secret || !env.SESSION_SECRET || password !== secret) return null;
  const expiresAt = String(Date.now() + 8 * 60 * 60 * 1000);
  return `${expiresAt}.${await sign("teacher." + expiresAt, env.SESSION_SECRET)}`;
}

export function isTeacherAccount(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email");
  const id = request.headers.get("oai-authenticated-user-id");
  return Boolean(id && email && env.TEACHER_EMAIL && email.toLowerCase() === env.TEACHER_EMAIL.toLowerCase());
}

export function sessionCookie(token: string, maxAge = 60 * 60 * 8, name = "teacher_session") {
  return `${name}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function createAccessCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export async function createStudentSession(studentId: string) {
  if (!env.SESSION_SECRET) throw new Error("Session signing secret is not configured.");
  const value = `${studentId}.${Date.now() + 2 * 60 * 60 * 1000}`;
  return `${value}.${await sign("student." + value, env.SESSION_SECRET)}`;
}

export async function studentSessionId(request: Request) {
  const token = cookieValue(request, "student_session");
  if (!token) return null;
  const [id, expiresAt, signature, extra] = token.split(".");
  if (!id || !expiresAt || !signature || extra !== undefined || !/^\d+$/.test(expiresAt) || Number(expiresAt) <= Date.now()) return null;
  return await verify(`student.${id}.${expiresAt}`, signature) ? id : null;
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

export function privateJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store");
  return Response.json(body, { ...init, headers });
}

export function jsonError(message: string, status = 400) {
  return privateJson({ error: message }, { status });
}
