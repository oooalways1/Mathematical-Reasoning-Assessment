import { db, isTeacher, jsonError, privateJson } from "../../_lib";

export async function GET(request: Request) {
  if (!await isTeacher(request)) return jsonError("교사 인증이 필요합니다.", 401);
  try {
    const database = db();
    const [studentRows, assessmentRows, statsRow] = await Promise.all([
      database.prepare(`SELECT s.id, s.name, s.grade, s.classroom, s.access_code AS accessCode, s.created_at AS createdAt,
        (SELECT a.total_score FROM assessments a WHERE a.student_id=s.id ORDER BY a.completed_at DESC LIMIT 1) AS latestScore,
        (SELECT COUNT(*) FROM assessments a WHERE a.student_id=s.id) AS assessmentCount FROM students s ORDER BY s.name COLLATE NOCASE ASC`).all<Record<string, unknown>>(),
      database.prepare("SELECT id, student_id AS studentId, total_score AS totalScore, max_score AS maxScore, domains, completed_at AS completedAt FROM assessments ORDER BY completed_at DESC").all<Record<string, unknown>>(),
      database.prepare("SELECT COUNT(*) AS assessmentCount, COALESCE(ROUND(AVG(total_score)),0) AS average FROM assessments").first<{ assessmentCount: number; average: number }>(),
    ]);
    const assessments = assessmentRows.results.map((row) => ({ ...row, domains: typeof row.domains === "string" ? JSON.parse(row.domains) as Record<string, number> : {} }));
    const scores = assessmentRows.results.map((row) => Number(row.totalScore));
    const growth = scores.length > 1 ? scores[0] - scores[scores.length - 1] : 0;
    return privateJson({ students: studentRows.results, assessments, stats: { students: studentRows.results.length, assessments: statsRow?.assessmentCount ?? 0, average: statsRow?.average ?? 0, growth } });
  } catch (error) {
    console.error("Could not read admin overview", error);
    return jsonError("관리 데이터를 불러오지 못했습니다.", 503);
  }
}
