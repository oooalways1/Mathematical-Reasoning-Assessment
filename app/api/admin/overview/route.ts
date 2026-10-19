import { db, isTeacher, jsonError, privateJson } from "../../_lib";
import { withSchools } from '../../_schools';
import {ensureEvaluations} from '../../_evaluations';
import {administrator,requestedSchool,schoolFilter,studentSchoolSql,assessmentSchoolSql} from '../../_tenancy';

export async function GET(request: Request) {
  const admin=await administrator(request);if(!admin)return jsonError('교사 인증이 필요합니다.',401);
  try {
    await ensureEvaluations();
    const selected=requestedSchool(request,admin),sf=schoolFilter(admin,selected,studentSchoolSql()),af=schoolFilter(admin,selected,assessmentSchoolSql());
    const database = db();
    const [studentRows, assessmentRows, statsRow] = await Promise.all([
      database.prepare(`SELECT s.id, s.name, s.grade, s.classroom, s.access_code AS accessCode, s.created_at AS createdAt,
        (SELECT a.total_score FROM assessments a WHERE a.student_id=s.id AND ${af.sql} ORDER BY a.completed_at DESC LIMIT 1) AS latestScore,
        (SELECT COUNT(*) FROM assessments a WHERE a.student_id=s.id AND ${af.sql}) AS assessmentCount FROM students s WHERE ${sf.sql} ORDER BY s.name COLLATE NOCASE ASC`).bind(...af.values,...af.values,...sf.values).all<Record<string, unknown>>(),
      database.prepare(`SELECT a.id, a.student_id AS studentId, a.total_score AS totalScore, a.max_score AS maxScore, a.domains, a.completed_at AS completedAt,a.key_version AS keyVersion,e.form_id AS evaluationId,e.title AS evaluationTitle,e.code AS evaluationCode FROM assessments a LEFT JOIN evaluation_revisions e ON e.version=a.key_version WHERE ${af.sql} ORDER BY a.completed_at DESC`).bind(...af.values).all<Record<string, unknown>>(),
      database.prepare(`SELECT COUNT(*) AS assessmentCount, COALESCE(ROUND(AVG(total_score)),0) AS average FROM assessments a WHERE ${af.sql}`).bind(...af.values).first<{ assessmentCount: number; average: number }>(),
    ]);
    const assessments = assessmentRows.results.map((row) => ({ ...row, domains: typeof row.domains === "string" ? JSON.parse(row.domains) as Record<string, number> : {} }));
    const scores = assessmentRows.results.map((row) => Number(row.totalScore));
    const growth = scores.length > 1 ? scores[0] - scores[scores.length - 1] : 0;
    const students = await withSchools(studentRows.results.map(row => ({...row,id:String(row.id)})));
    return privateJson({ students, assessments, stats: { students: studentRows.results.length, assessments: statsRow?.assessmentCount ?? 0, average: statsRow?.average ?? 0, growth } });
  } catch (error) {
    if(error instanceof Error&&error.message==='FORBIDDEN')return jsonError('담당 학교만 조회할 수 있습니다.',403);
    console.error("Could not read admin overview", error);
    return jsonError("관리 데이터를 불러오지 못했습니다.", 503);
  }
}
