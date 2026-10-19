// Firebase accepts Korean email local parts. Keep older encoded aliases usable.
const LOGIN_DOMAIN = "students.soori-270e0.invalid";
const LEGACY_USERNAME_PATTERN = /^[a-z][a-z0-9_]{3,19}$/;
const READABLE_USERNAME_PATTERN = /^[\p{L}\p{N}_-]{1,40}$/u;
// Empty/invisible IDs and @ are excluded so old email logins stay unambiguous.
export const USERNAME_PATTERN = /^(?!\s*$)[^@\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]{1,40}$/;
export const USERNAME_GUIDE = "한글·숫자도 사용할 수 있어요 (예: 민수, 1234)";
export const USERNAME_ERROR = "아이디를 입력해 주세요. 40자 이내로 입력하고 @와 보이지 않는 문자는 빼 주세요.";
const alphabet = "abcdefghijklmnopqrstuvwxyz234567";

function encodeId(value: string) {
  let bits=0,buffer=0,result='';
  for(const byte of new TextEncoder().encode(value)){buffer=(buffer<<8)|byte;bits+=8;while(bits>=5){bits-=5;result+=alphabet[(buffer>>>bits)&31];}}
  if(bits)result+=alphabet[(buffer<<(5-bits))&31];
  return result;
}

function decodeId(value: string) {
  let bits=0,buffer=0;const bytes:number[]=[];
  for(const char of value){const n=alphabet.indexOf(char);if(n<0)throw Error('Invalid alias');buffer=(buffer<<5)|n;bits+=5;if(bits>=8){bits-=8;bytes.push((buffer>>>bits)&255);}}
  return new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(bytes));
}

export function normalizeUsername(value: unknown) {
  return typeof value === "string" ? value.normalize('NFC').trim().toLowerCase() : "";
}

export function usernameEmail(username: string) {
  if (!USERNAME_PATTERN.test(username)) throw new Error("Invalid username");
  if(READABLE_USERNAME_PATTERN.test(username)&&!username.startsWith('u-'))return `${username}@${LOGIN_DOMAIN}`;
  return legacyUsernameEmail(username);
}

export function legacyUsernameEmail(username: string) {
  if (!USERNAME_PATTERN.test(username)) throw new Error("Invalid username");
  // Preserve every old ASCII ID's exact Firebase identity.
  if(LEGACY_USERNAME_PATTERN.test(username))return `${username}@${LOGIN_DOMAIN}`;
  // Lowercase base32 survives Firebase email canonicalization. Long IDs use
  // bounded domain labels to keep the local part and total email within limits.
  const encoded=encodeId(username),tail=encoded.slice(60).match(/.{1,50}/g);
  return `u-${encoded.slice(0,60)}@${tail?tail.join('.')+'.':''}${LOGIN_DOMAIN}`;
}

export function loginEmail(value: unknown) {
  const id = normalizeUsername(value);
  if (USERNAME_PATTERN.test(id)) return usernameEmail(id);
  // Previously registered email accounts continue to use the same identity.
  if (id.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)) return id;
  return null;
}

export function loginEmails(value: unknown) {
  const id=normalizeUsername(value),preferred=loginEmail(value);
  if(!preferred)return [];
  return USERNAME_PATTERN.test(id)?[...new Set([preferred,legacyUsernameEmail(id)])]:[preferred];
}

export function usernameFromEmail(email: string) {
  const normalized=email.toLowerCase(),at=normalized.lastIndexOf('@'),local=normalized.slice(0,at),domain=normalized.slice(at+1);
  if(domain===LOGIN_DOMAIN&&!local.startsWith('u-')&&USERNAME_PATTERN.test(local))return local;
  if(local.startsWith('u-')&&(domain===LOGIN_DOMAIN||domain.endsWith('.'+LOGIN_DOMAIN))){
    try{const tail=domain===LOGIN_DOMAIN?'':domain.slice(0,-LOGIN_DOMAIN.length-1).replaceAll('.','');const id=decodeId(local.slice(2)+tail);if(USERNAME_PATTERN.test(id)&&legacyUsernameEmail(id)===normalized)return id;}catch{/* Existing email accounts remain readable. */}
  }
  return email;
}
