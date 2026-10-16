import { createAccessCode, db, isTeacher, jsonError, privateJson, sameOrigin, studentSessionId } from "../_lib";
import { activeSchool, schoolAssignment, withSchools } from '../_schools';

export async function GET(request: Request) {
  const teacher = await isTeacher(request);
  const studentId = teacher ? null : await studentSessionId(request);
  if (!teacher && !studentId) return privateJson({ students: [], role: "guest" });
  try {
    const database = db();
    if (!teacher) {
      const student = await database.prepare(`SELECT s.id, s.name, s.grade, s.classroom, s.created_at AS createdAt,
        (SELECT a.total_score FROM assessments a WHERE a.student_id=s.id ORDER BY a.completed_at DESC LIMIT 1) AS latestScore,
        (SELECT COUNT(*) FROM assessments a WHERE a.student_id=s.id) AS assessmentCount
        FROM students s WHERE s.id=?`).bind(studentId).first<{id:string}>();
      return privateJson({ students: student ? await withSchools([student]) : [], role: student ? "student" : "guest" });
    }
    const [studentRows, statsRow] = await Promise.all([
      database.prepare(`
      SELECT s.id, s.name, s.grade, s.classroom, s.access_code AS accessCode, s.created_at AS createdAt,
        (SELECT a.total_score FROM assessments a WHERE a.student_id=s.id ORDER BY a.completed_at DESC LIMIT 1) AS latestScore,
        (SELECT COUNT(*) FROM assessments a WHERE a.student_id=s.id) AS assessmentCount
      FROM students s ORDER BY s.name COLLATE NOCASE ASC
    `).all<Record<string, unknown>>(),
      database.prepare("SELECT COUNT(*) AS assessments, COALESCE(ROUND(AVG(total_score)),0) AS average FROM assessments").first<{ assessments: number; average: number }>(),
    ]);
    return privateJson({ students: await withSchools(studentRows.results.map(row => ({...row,id:String(row.id)}))), role: "teacher", stats: { students: studentRows.results.length, assessments: statsRow?.assessments ?? 0, average: statsRow?.average ?? 0, growth: 0 } });
  } catch (error) {
    console.error("Could not read students", error);
    return jsonError("학생 정보를 불러오지 못했습니다.", 503);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("잘못된 요청입니다.", 403);
  if (!await isTeacher(request)) return jsonError("교사 인증이 필요합니다.", 401);
  let body: { name?: unknown; grade?: unknown; classroom?: unknown; schoolId?: unknown };
  try { body = await request.json() as typeof body; } catch { return jsonError("학생 정보를 확인해 주세요."); }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
  const grade = Number(body.grade);
  const classroom = typeof body.classroom === "string" ? body.classroom.trim().slice(0, 30) : "";
  if (!name || !Number.isInteger(grade) || grade < 1 || grade > 3) return jsonError("이름과 1~3학년 정보를 입력해 주세요.");
  const id = crypto.randomUUID();
  const accessCode = createAccessCode();
  try {
    const school = await activeSchool(body.schoolId);
    if (!school) return jsonError('목록에서 가입 가능한 학교를 선택해 주세요.');
    await db().batch([
      db().prepare("INSERT INTO students (id, name, grade, classroom, access_code) VALUES (?, ?, ?, ?, ?)").bind(id, name, grade, classroom, accessCode),
      schoolAssignment(id,school.id),
    ]);
    return privateJson({ student: { id, name, grade, classroom, schoolId:school.id,schoolName:school.name,schoolRegion:school.region, accessCode, createdAt: new Date().toISOString(), latestScore: null, assessmentCount: 0 } }, { status: 201 });
  } catch (error) {
    console.error("Could not create student", error);
    return jsonError("학생을 등록하지 못했습니다.", 503);
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return jsonError('잘못된 요청입니다.',403);
  if (!await isTeacher(request)) return jsonError('교사 인증이 필요합니다.',401);
  let body: {studentId?:unknown;schoolId?:unknown};
  try { body = await request.json(); } catch { return jsonError('학생과 학교를 확인해 주세요.'); }
  if (typeof body.studentId !== 'string') return jsonError('학생을 선택해 주세요.');
  try {
    const school = await activeSchool(body.schoolId);
    if (!school) return jsonError('가입 가능한 학교를 선택해 주세요.');
    const student = await db().prepare('SELECT id FROM students WHERE id=?').bind(body.studentId).first();
    if (!student) return jsonError('학생을 찾지 못했습니다.',404);
    await schoolAssignment(body.studentId,school.id).run();
    return privateJson({ok:true});
  } catch { return jsonError('학교 배정을 저장하지 못했습니다.',503); }
}
