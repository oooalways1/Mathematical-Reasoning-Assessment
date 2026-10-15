// A fixed, non-deliverable namespace keeps Firebase password authentication
// while students only need to remember their chosen username.
const LOGIN_DOMAIN = "students.soori-270e0.invalid";
export const USERNAME_PATTERN = /^[a-z][a-z0-9_]{3,19}$/;
export const USERNAME_GUIDE = "영문으로 시작하는 영문·숫자·밑줄(_) 4~20자리";

export function normalizeUsername(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function usernameEmail(username: string) {
  if (!USERNAME_PATTERN.test(username)) throw new Error("Invalid username");
  return `${username}@${LOGIN_DOMAIN}`;
}

export function loginEmail(value: unknown) {
  const id = normalizeUsername(value);
  if (USERNAME_PATTERN.test(id)) return usernameEmail(id);
  // Previously registered email accounts continue to use the same identity.
  if (id.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)) return id;
  return null;
}

export function usernameFromEmail(email: string) {
  const suffix = `@${LOGIN_DOMAIN}`;
  return email.endsWith(suffix) ? email.slice(0, -suffix.length) : email;
}
