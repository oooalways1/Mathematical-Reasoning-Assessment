import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const sql = new DatabaseSync(':memory:');
sql.exec(`PRAGMA foreign_keys=ON;
CREATE TABLE students (id TEXT PRIMARY KEY,name TEXT NOT NULL,grade INTEGER NOT NULL,classroom TEXT NOT NULL,access_code TEXT,firebase_uid TEXT UNIQUE,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE assessments (id TEXT PRIMARY KEY,student_id TEXT,total_score INTEGER,completed_at TEXT);
CREATE TABLE admin_attempts (bucket TEXT PRIMARY KEY,attempts INTEGER,expires_at INTEGER);`);
function statement(query, bindings=[]) {
  return {bind(...values){return statement(query,values);},
    async first(){return sql.prepare(query).get(...bindings) ?? null;},
    async all(){return {results:sql.prepare(query).all(...bindings)};},
    async run(){const r=sql.prepare(query).run(...bindings);return {meta:{changes:Number(r.changes)}};},
    query,bindings};
}
globalThis.schoolTestEnv={DB:{prepare:statement,async batch(items){sql.exec('BEGIN');try{const r=[];for(const item of items)r.push(await item.run());sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}},SESSION_SECRET:'local-test-signing-secret',TEACHER_PASSWORD:'test-teacher',FIREBASE_API_KEY:'mock-key'};
const built=await build({stdin:{contents:`export * as admin from './app/api/admin/schools/route'; export * as publicSchools from './app/api/schools/route'; export * as students from './app/api/students/route'; export * as signup from './app/api/auth/signup/route'; export * as login from './app/api/auth/login/route'; export * as session from './app/api/student/session/route'; export * as auth from './app/api/_lib'; export * as schools from './app/api/_schools';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'test-env',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env=globalThis.schoolTestEnv;export function waitUntil(){}'}));}}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const origin='https://school.test';
const teacher=await api.auth.createTeacherSession('test-teacher');
function req(path,method='GET',body,role='teacher',requestOrigin=origin){return new Request(origin+path,{method,headers:{Origin:requestOrigin,'Content-Type':'application/json',...(role==='teacher'?{Cookie:'teacher_session='+teacher}:role.startsWith('student_session=')?{Cookie:role}:{})},...(body?{body:JSON.stringify(body)}:{})});}
let calls=0,deleted=0;
globalThis.fetch=async(url,init)=>{
  calls++;
  if(url.includes('accounts:delete')){deleted++;return Response.json({});}
  if(url.includes('accounts:signInWithPassword'))return Response.json({localId:'fixture-uid'});
  return Response.json({localId:'fixture-uid',idToken:'fixture-token'});
};
assert.equal((await api.admin.GET(req('/api/admin/schools','GET',null,'guest'))).status,401);
assert.equal((await api.admin.POST(req('/api/admin/schools','POST',{name:'학교'},'guest'))).status,401);
assert.equal((await api.students.PATCH(req('/api/students','PATCH',{studentId:'x',schoolId:'x'},'guest'))).status,401);
assert.equal((await api.admin.POST(req('/api/admin/schools','POST',{name:'학교'},'teacher','https://other.test'))).status,403);
assert.deepEqual((await (await api.publicSchools.GET()).json()).schools,[]);
const create=await api.admin.POST(req('/api/admin/schools','POST',{name:'  테스트초등학교 ',region:'서울'}));assert.equal(create.status,201);const {id}=await create.json();
assert.equal((await api.admin.POST(req('/api/admin/schools','POST',{name:'테스트초등학교',region:'서울'}))).status,409);
assert.equal((await api.admin.POST(req('/api/admin/schools','POST',{name:'테스트초등학교',region:'부산'}))).status,201);
const visible=(await (await api.publicSchools.GET()).json()).schools;assert.equal(visible.length,2);assert.equal('studentCount' in visible[0],false);
const body={name:'검증 학생',grade:2,classroom:'1',username:'schooltest',password:'fixture-password'};
assert.equal((await api.signup.POST(req('/api/auth/signup','POST',body,'guest'))).status,400);assert.equal(calls,0);
assert.equal((await api.signup.POST(req('/api/auth/signup','POST',{...body,schoolId:'fake'},'guest'))).status,400);assert.equal(calls,0);
const signup=await api.signup.POST(req('/api/auth/signup','POST',{...body,schoolId:id},'guest'));assert.equal(signup.status,201);const student=(await signup.json()).student;assert.equal(student.schoolId,id);
const cookie=signup.headers.get('set-cookie').split(';')[0];
assert.equal((await (await api.session.GET(req('/api/student/session','GET',null,cookie))).json()).student.schoolName,'테스트초등학교');
assert.equal((await api.students.PATCH(req('/api/students','PATCH',{studentId:student.id,schoolId:id},cookie))).status,401);
assert.equal((await api.admin.PATCH(req('/api/admin/schools','PATCH',{id,name:'새이름초등학교',region:'서울',active:false}))).status,200);
assert.equal((await (await api.publicSchools.GET()).json()).schools.length,1);
const before=calls;assert.equal((await api.signup.POST(req('/api/auth/signup','POST',{...body,schoolId:id},'guest'))).status,400);assert.equal(calls,before);
const login=await api.login.POST(req('/api/auth/login','POST',{username:'schooltest',password:'fixture-password'},'guest'));assert.equal(login.status,200);assert.equal((await login.json()).student.schoolName,'새이름초등학교');
sql.prepare('INSERT INTO students (id,name,grade,classroom) VALUES (?,?,?,?)').run('legacy','기존학생',1,'2');
assert.equal((await api.schools.withSchools([{id:'legacy'}]))[0].schoolId,null);
const second=visible.find(s=>s.id!==id).id;
assert.equal((await api.students.PATCH(req('/api/students','PATCH',{studentId:'legacy',schoolId:second}))).status,200);
assert.equal((await api.schools.withSchools([{id:'legacy'}]))[0].schoolId,second);
// School disabled between preflight and assignment must roll back the entire new profile.
await assert.rejects(()=>globalThis.schoolTestEnv.DB.batch([statement('INSERT INTO students (id,name,grade,classroom) VALUES (?,?,?,?)').bind('rollback','학생',1,''),api.schools.schoolAssignment('rollback',id)]));
assert.equal(sql.prepare("SELECT id FROM students WHERE id='rollback'").get(),undefined);
// Failure after Firebase creation cleans up only that new account.
const oldFetch=globalThis.fetch;
globalThis.fetch=async(url,init)=>{if(url.includes('accounts:signUp')){sql.prepare('UPDATE schools SET active=0 WHERE id=?').run(second);return Response.json({localId:'rollback-uid',idToken:'new-only-token'});}return oldFetch(url,init);};
assert.equal((await api.signup.POST(req('/api/auth/signup','POST',{...body,username:'otherstudent',schoolId:second},'guest'))).status,503);
assert.equal(deleted,1);assert.equal(sql.prepare("SELECT id FROM students WHERE firebase_uid='rollback-uid'").get(),undefined);
// The deployment migration remains safe to apply after automatic initialization.
sql.exec(readFileSync('drizzle/0007_school_directory.sql','utf8'));sql.exec(readFileSync('drizzle/0007_school_directory.sql','utf8'));
assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM students').get().n,2);
console.log('PASS: school permissions, directory privacy, duplicates, signup validation, school persistence, legacy assignment, hidden-school login, atomic rollback, Firebase cleanup, idempotent migration');
