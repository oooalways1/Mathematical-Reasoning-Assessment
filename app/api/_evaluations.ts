import { db } from './_lib';
import { GRADES } from '@/lib/diagnosis-blueprint';
import { templateEvaluation, type EvaluationRecord, type EvaluationDefinition } from '@/lib/evaluations';
import type { AnswerKey } from '@/lib/diagnosis-model';
import {ensureSchools} from './_schools';
import {ensureTenancy} from './_tenancy';
export const evaluationSchema=[
  `CREATE TABLE IF NOT EXISTS evaluation_forms (id TEXT PRIMARY KEY NOT NULL,title TEXT NOT NULL,code TEXT NOT NULL,grade INTEGER NOT NULL,status TEXT NOT NULL CONSTRAINT evaluation_forms_status_check CHECK(status IN ('draft','active','archived')),version TEXT NOT NULL,definition TEXT NOT NULL,updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS evaluation_revisions (version TEXT PRIMARY KEY NOT NULL,form_id TEXT NOT NULL REFERENCES evaluation_forms(id),title TEXT NOT NULL,code TEXT NOT NULL,grade INTEGER NOT NULL,definition TEXT NOT NULL,created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS evaluation_revision_form_idx ON evaluation_revisions(form_id)`,
  `CREATE TABLE IF NOT EXISTS evaluation_trash (form_id TEXT PRIMARY KEY NOT NULL REFERENCES evaluation_forms(id),deleted_at TEXT NOT NULL)`,
];
let ready:Promise<unknown>|undefined;
export async function ensureEvaluations(){
  if(!ready)ready=(async()=>{
    await db().batch(evaluationSchema.map(sql=>db().prepare(sql)));
    await ensureSchools();await ensureTenancy();
    const columns=await db().prepare('PRAGMA table_info(evaluation_forms)').all<{name:string}>();
    if(!columns.results.some(c=>c.name==='school_id')){try{await db().prepare('ALTER TABLE evaluation_forms ADD COLUMN school_id TEXT REFERENCES schools(id)').run();}catch(e){const recheck=await db().prepare('PRAGMA table_info(evaluation_forms)').all<{name:string}>();if(!recheck.results.some(c=>c.name==='school_id'))throw e;}}
    await db().batch([db().prepare('DROP INDEX IF EXISTS evaluation_grade_code_idx'),db().prepare("CREATE UNIQUE INDEX IF NOT EXISTS evaluation_school_grade_code_idx ON evaluation_forms(COALESCE(school_id,''),grade,code)"),db().prepare("INSERT OR IGNORE INTO assessment_schools(assessment_id,school_id) SELECT a.id,ss.school_id FROM assessments a LEFT JOIN student_schools ss ON ss.student_id=a.student_id WHERE NOT EXISTS(SELECT 1 FROM app_settings WHERE key='assessment_school_snapshot_done')"),db().prepare("INSERT OR IGNORE INTO app_settings(key,value) VALUES('assessment_school_snapshot_done','1')")]);
    const old=await db().prepare('SELECT grade,answers,version,updated_at AS updatedAt FROM diagnosis_keys').all<{grade:number;answers:string;version:string;updatedAt:string}>();
    for(const grade of GRADES){
      const legacy=old.results.find(k=>k.grade===grade),id=`legacy-g${grade}`;
      const form=templateEvaluation(grade,legacy?JSON.parse(legacy.answers) as AnswerKey:{}),version=legacy?.version??`legacy-g${grade}-draft`,now=legacy?.updatedAt??new Date().toISOString();
      // Copy only once. Later edits are independent of the retired single-key table.
      await db().batch([
        db().prepare('INSERT OR IGNORE INTO evaluation_forms (id,title,code,grade,status,version,definition,updated_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,form.title,form.code,grade,legacy?'active':'draft',version,JSON.stringify(form),now),
        db().prepare('INSERT OR IGNORE INTO evaluation_revisions (version,form_id,title,code,grade,definition,created_at) SELECT version,id,title,code,grade,definition,updated_at FROM evaluation_forms WHERE id=?').bind(id),
      ]);
    }
    // Preserve published legacy evaluations in each existing active school, exactly once.
    await db().batch([db().prepare("INSERT OR IGNORE INTO evaluation_forms(id,title,code,grade,status,version,definition,updated_at,school_id)\nSELECT 'school-'||s.id||'-'||f.id,f.title,f.code,f.grade,f.status,'school-'||s.id||'-'||f.version,f.definition,f.updated_at,s.id\nFROM evaluation_forms f CROSS JOIN schools s WHERE f.school_id IS NULL AND f.status='active' AND s.active=1\nAND NOT EXISTS(SELECT 1 FROM evaluation_trash t WHERE t.form_id=f.id)\nAND NOT EXISTS(SELECT 1 FROM app_settings WHERE key='school_evaluation_copy_done')"),db().prepare("INSERT OR IGNORE INTO evaluation_revisions(version,form_id,title,code,grade,definition,created_at)\nSELECT version,id,title,code,grade,definition,updated_at FROM evaluation_forms WHERE school_id IS NOT NULL\nAND NOT EXISTS(SELECT 1 FROM app_settings WHERE key='school_evaluation_copy_done')"),db().prepare("INSERT OR IGNORE INTO app_settings(key,value) VALUES('school_evaluation_copy_done','1')")]);
  })().catch(error=>{ready=undefined;throw error;});
  await ready;
}
type Row={id:string;title:string;code:string;grade:number;status:EvaluationRecord['status'];version:string;definition:string;updatedAt:string;trashed?:number;school_id?:string|null};
export function decodeEvaluation(row:Row):EvaluationRecord{return {...JSON.parse(row.definition) as EvaluationDefinition,id:row.id,status:row.status,version:row.version,updatedAt:row.updatedAt,trashed:Boolean(row.trashed),schoolId:row.school_id??null};}
export async function getEvaluation(id:string){await ensureEvaluations();const row=await db().prepare('SELECT f.*,f.updated_at AS updatedAt,EXISTS(SELECT 1 FROM evaluation_trash t WHERE t.form_id=f.id) AS trashed FROM evaluation_forms f WHERE f.id=?').bind(id).first<Row>();return row?decodeEvaluation(row):null;}
export async function listEvaluations(grade?:number,active=false,includeDeleted=false){
  await ensureEvaluations();
  const rows=await db().prepare(`SELECT f.*,f.updated_at AS updatedAt,EXISTS(SELECT 1 FROM evaluation_trash t WHERE t.form_id=f.id) AS trashed FROM evaluation_forms f WHERE (? IS NULL OR grade=?) AND (?=0 OR status='active') AND (?=1 OR NOT EXISTS(SELECT 1 FROM evaluation_trash t WHERE t.form_id=f.id)) ORDER BY updated_at DESC,id`).bind(grade??null,grade??null,active?1:0,includeDeleted&&!active?1:0).all<Row>();return rows.results.map(decodeEvaluation);
}
