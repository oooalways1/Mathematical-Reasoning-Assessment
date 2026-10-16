import { db } from './_lib';

// Additive and idempotent: also supports existing deployments without a CLI migration.
export const schoolSchema = [
  `CREATE TABLE IF NOT EXISTS schools (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, region TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1 CONSTRAINT schools_active_check CHECK(active IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS schools_name_region_idx ON schools(name,region)`,
  `CREATE TABLE IF NOT EXISTS student_schools (student_id TEXT PRIMARY KEY NOT NULL REFERENCES students(id) ON DELETE CASCADE, school_id TEXT NOT NULL REFERENCES schools(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS student_schools_school_idx ON student_schools(school_id)`,
  // One-time cleanup of the disposable account created during rollout verification.
  `DELETE FROM students WHERE id='519f86f5-e8d2-40a0-a0fb-f7e2949096f2' AND firebase_uid='VNlG9iBA5FbMEtqqyThiGpbKmMG2' AND name='학교 검증' AND NOT EXISTS (SELECT 1 FROM assessments WHERE student_id=students.id) AND NOT EXISTS (SELECT 1 FROM student_schools WHERE student_id=students.id)`,
];
let ready: Promise<unknown> | undefined;
export async function ensureSchools() {
  if (!ready) ready = db().batch(schoolSchema.map(sql => db().prepare(sql))).catch(error => { ready = undefined; throw error; });
  await ready;
}
export async function activeSchool(id: unknown) {
  await ensureSchools();
  if (typeof id !== 'string' || id.length > 64) return null;
  return db().prepare('SELECT id, name, region FROM schools WHERE id=? AND active=1').bind(id).first<{id: string; name: string; region: string}>();
}
export function schoolAssignment(studentId: string, schoolId: string) {
  // If a school was disabled after validation, fail the transaction instead of assigning it.
  return db().prepare(`INSERT INTO student_schools (student_id,school_id) VALUES (?,(SELECT id FROM schools WHERE id=? AND active=1)) ON CONFLICT(student_id) DO UPDATE SET school_id=excluded.school_id,updated_at=CURRENT_TIMESTAMP`).bind(studentId,schoolId);
}
export async function withSchools<T extends { id: unknown }>(students: T[]) {
  await ensureSchools();
  if (!students.length) return [];
  const result: (T & {schoolId: string | null; schoolName: string | null; schoolRegion: string | null})[] = [];
  // Stay below D1's bound parameter limit and read only the requested students.
  for (let start = 0; start < students.length; start += 80) {
    const chunk = students.slice(start, start + 80);
    const rows = await db().prepare(`SELECT ss.student_id AS studentId,s.id AS schoolId,s.name AS schoolName,s.region AS schoolRegion FROM student_schools ss JOIN schools s ON s.id=ss.school_id WHERE ss.student_id IN (${chunk.map(() => '?').join(',')})`).bind(...chunk.map(student => String(student.id))).all<{studentId: string;schoolId: string;schoolName: string;schoolRegion: string}>();
    const map = new Map(rows.results.map(row => [row.studentId,row]));
    result.push(...chunk.map(student => { const school = map.get(String(student.id)); return {...student, schoolId: school?.schoolId ?? null, schoolName: school?.schoolName ?? null, schoolRegion: school?.schoolRegion ?? null}; }));
  }
  return result;
}
