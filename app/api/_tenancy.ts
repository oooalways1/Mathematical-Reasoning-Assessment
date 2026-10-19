import {db, legacyTeacher, signSession, verifySession, readCookie} from './_lib';
export type Admin = {id:string;role:'super'|'school';schools:string[];legacy?:boolean};
export const tenancySchema=[
 `CREATE TABLE IF NOT EXISTS administrators(id TEXT PRIMARY KEY,firebase_uid TEXT NOT NULL UNIQUE,login_id TEXT NOT NULL UNIQUE,role TEXT NOT NULL CHECK(role IN ('super','school')),active INTEGER NOT NULL DEFAULT 1,session_version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS administrator_schools(admin_id TEXT NOT NULL REFERENCES administrators(id),school_id TEXT NOT NULL REFERENCES schools(id),PRIMARY KEY(admin_id,school_id))`,
 `CREATE TABLE IF NOT EXISTS app_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS audit_log(id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,action TEXT NOT NULL,school_id TEXT,target_id TEXT NOT NULL,details TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS audit_school_date ON audit_log(school_id,created_at)`,
 `CREATE TABLE IF NOT EXISTS assessment_schools(assessment_id TEXT PRIMARY KEY REFERENCES assessments(id),school_id TEXT REFERENCES schools(id))`,
 `CREATE TABLE IF NOT EXISTS grading_reviews(assessment_id TEXT NOT NULL REFERENCES assessments(id),question_id TEXT NOT NULL,raw_answer TEXT NOT NULL,normalized_answer TEXT,status TEXT NOT NULL CHECK(status IN ('correct','incorrect','review')),reason TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(assessment_id,question_id))`,
 `CREATE TABLE IF NOT EXISTS grading_history(id TEXT PRIMARY KEY,assessment_id TEXT NOT NULL,question_id TEXT NOT NULL,actor_id TEXT NOT NULL,before_value TEXT NOT NULL,after_value TEXT NOT NULL,reason TEXT NOT NULL,created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS grading_state(assessment_id TEXT PRIMARY KEY REFERENCES assessments(id),revision INTEGER NOT NULL DEFAULT 1)`,
 `CREATE TABLE IF NOT EXISTS ai_feedback(assessment_id TEXT PRIMARY KEY REFERENCES assessments(id),status TEXT NOT NULL,content TEXT,model TEXT NOT NULL,teacher_content TEXT,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS ai_requests(id TEXT PRIMARY KEY,assessment_id TEXT NOT NULL,student_id TEXT NOT NULL,day TEXT NOT NULL,status TEXT NOT NULL,reserved_neurons INTEGER NOT NULL,created_at TEXT NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS ai_request_day ON ai_requests(day,student_id)`,
 `CREATE TABLE IF NOT EXISTS learning_overrides(assessment_id TEXT NOT NULL,question_id TEXT NOT NULL,practice TEXT,roadmap_note TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(assessment_id,question_id))`,
 `CREATE TABLE IF NOT EXISTS practice_attempt_details(attempt_id TEXT PRIMARY KEY REFERENCES learning_attempts(id),practice_json TEXT NOT NULL)`,
];
let ready:Promise<void>|undefined;
export async function ensureTenancy(){
 if(!ready)ready=(async()=>{await db().batch(tenancySchema.map(q=>db().prepare(q)));})();
 try{await ready;}catch(e){ready=undefined;throw e;}
}
export async function administrator(request:Request):Promise<Admin|null>{
 await ensureTenancy();
 const token=readCookie(request,'admin_session');
 if(token){const [id,version,expiry,signature,extra]=token.split('.');
  if(extra===undefined&&id&&/^\d+$/.test(version??'')&&/^\d+$/.test(expiry??'')&&Number(expiry)>Date.now()&&await verifySession(`admin.${id}.${version}.${expiry}`,signature??'')){
   const row=await db().prepare('SELECT id,role FROM administrators WHERE id=? AND active=1 AND session_version=?').bind(id,Number(version)).first<{id:string;role:Admin['role']}>();
   if(row){const schools=await db().prepare('SELECT m.school_id AS id FROM administrator_schools m JOIN schools s ON s.id=m.school_id WHERE m.admin_id=? AND s.active=1').bind(id).all<{id:string}>();return {...row,schools:schools.results.map(s=>s.id)};}
  }
  return null;
 }
 const setting=await db().prepare("SELECT value FROM app_settings WHERE key='legacy_admin_disabled'").first<{value:string}>();
 return setting?.value!=='1'&&await legacyTeacher(request)?{id:'legacy-owner',role:'super',schools:[],legacy:true}:null;
}
export async function adminToken(id:string,version:number){const expiry=Date.now()+8*3600000;const value=`${id}.${version}.${expiry}`;return `${value}.${await signSession('admin.'+value)}`;}
export function canSchool(admin:Admin,schoolId:string|null){return admin.role==='super'||Boolean(schoolId&&admin.schools.includes(schoolId));}
export function requestedSchool(request:Request,admin:Admin){const id=new URL(request.url).searchParams.get('schoolId')||readCookie(request,'school_scope')||null;if(id&&!canSchool(admin,id))throw new Error('FORBIDDEN');return id;}
export function schoolFilter(admin:Admin,selected:string|null,expression:string){return {sql:`(?=1 OR ${expression} IN (SELECT value FROM json_each(?)))`,values:[Number(admin.role==='super'&&!selected),JSON.stringify(selected?[selected]:admin.schools)]};}
export const studentSchoolSql=(alias='s')=>`(SELECT school_id FROM student_schools WHERE student_id=${alias}.id)`;
export const assessmentSchoolSql=(alias='a')=>`CASE WHEN EXISTS(SELECT 1 FROM assessment_schools z WHERE z.assessment_id=${alias}.id) THEN (SELECT school_id FROM assessment_schools z WHERE z.assessment_id=${alias}.id) ELSE (SELECT school_id FROM student_schools WHERE student_id=${alias}.student_id) END`;
export async function studentSchool(id:string){return (await db().prepare('SELECT school_id FROM student_schools WHERE student_id=?').bind(id).first<{school_id:string}>())?.school_id??null;}
export async function canStudent(admin:Admin,id:string){const row=await db().prepare('SELECT s.id,ss.school_id FROM students s LEFT JOIN student_schools ss ON ss.student_id=s.id WHERE s.id=?').bind(id).first<{id:string;school_id:string|null}>();return !!row&&canSchool(admin,row.school_id);}
export async function assessmentSchool(id:string){const row=await db().prepare('SELECT school_id FROM assessment_schools WHERE assessment_id=?').bind(id).first<{school_id:string|null}>();if(row)return row.school_id;return (await db().prepare('SELECT ss.school_id FROM assessments a LEFT JOIN student_schools ss ON ss.student_id=a.student_id WHERE a.id=?').bind(id).first<{school_id:string|null}>())?.school_id??null;}
export async function canAssessment(admin:Admin,id:string){return canSchool(admin,await assessmentSchool(id));}
export async function audit(admin:Admin,action:string,target:string,schoolId:string|null,details:Record<string,unknown>={}){await db().prepare('INSERT INTO audit_log(id,actor_id,action,school_id,target_id,details,created_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),admin.id,action,schoolId,target,JSON.stringify(details),new Date().toISOString()).run();}
