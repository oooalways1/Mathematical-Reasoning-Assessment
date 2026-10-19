import assert from 'node:assert/strict';import{build}from'esbuild';
const result=await build({entryPoints:['lib/student-login.ts'],bundle:true,write:false,format:'esm',platform:'node'}),ids=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
for(const value of ['가','민수','1234','1','1반 민수','민수-1','학생!','한'.repeat(40),'😀'.repeat(20),'a'.repeat(40),' AbCd_1 ','민수']){
 const name=ids.normalizeUsername(value);assert.ok(ids.USERNAME_PATTERN.test(name));const email=ids.usernameEmail(name);assert.equal(ids.usernameFromEmail(email.toUpperCase()),name);assert.equal(ids.loginEmail(value),email);assert.ok(email.length<=254);assert.ok(email.split('@')[0].length<=64);assert.ok(email.split('@')[1].split('.').every(s=>s.length<=63));
}
for(const name of ['abcd','schooltest','math1234','a_12'])assert.equal(ids.usernameEmail(name),name+'@students.soori-270e0.invalid');
for(const value of ['','   ','@','a\nb','\u200b','한'.repeat(41)])assert.equal(ids.USERNAME_PATTERN.test(ids.normalizeUsername(value)),false);
assert.equal(ids.loginEmail('OLD@naver.com'),'old@naver.com');assert.equal(ids.usernameFromEmail('old@naver.com'),'old@naver.com');
console.log('PASS: Korean/numeric/one-character IDs, reversible bounded Firebase aliases, legacy IDs/emails unchanged, invalid/empty IDs rejected.');
