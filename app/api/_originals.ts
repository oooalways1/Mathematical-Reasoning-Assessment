import {env} from 'cloudflare:workers';
import {db,studentSessionId} from './_lib';
import {administrator,canAssessment} from './_tenancy';
export const originalSchema=[
 "CREATE TABLE IF NOT EXISTS assessment_files(id TEXT PRIMARY KEY,assessment_id TEXT NOT NULL REFERENCES assessments(id),student_id TEXT NOT NULL REFERENCES students(id),object_key TEXT NOT NULL UNIQUE,name TEXT NOT NULL,content_type TEXT NOT NULL,size INTEGER NOT NULL CHECK(size>0),status TEXT NOT NULL CHECK(status IN ('uploading','ready')),uploader_id TEXT NOT NULL,created_at TEXT NOT NULL)",
 'CREATE INDEX IF NOT EXISTS assessment_files_assessment ON assessment_files(assessment_id,created_at)',
 'CREATE INDEX IF NOT EXISTS assessment_files_student ON assessment_files(student_id)'
];
export const FILE_LIMIT=20*1024*1024,STUDENT_LIMIT=200*1024*1024,APP_LIMIT=8*1024*1024*1024;
let ready:Promise<void>|undefined;
export async function originalsReady(){if(!ready)ready=db().batch(originalSchema.map(q=>db().prepare(q))).then(()=>{});try{await ready;}catch(e){ready=undefined;throw e;}}
export async function originalAccess(request:Request,assessmentId:string){
 const student=await studentSessionId(request),actor=await administrator(request);
 const row=await db().prepare('SELECT student_id FROM assessments WHERE id=?').bind(assessmentId).first<{student_id:string}>();
 if(!row)return null;
 // A simultaneously signed-in teacher cannot use a broader student session to bypass their scope.
 if(actor?await canAssessment(actor,assessmentId):student===row.student_id)return {studentId:row.student_id,uploaderId:actor?.id??student!};
 return null;
}
export function originalBucket(){return env.BUCKET;}
export function originalType(bytes:Uint8Array){if(bytes.length>=5&&new TextDecoder().decode(bytes.subarray(0,5))==='%PDF-')return 'application/pdf';if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';return null;}
export function originalName(name:string){return name.split(/[\\/]/).pop()!.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,180)||'답안 원본';}
