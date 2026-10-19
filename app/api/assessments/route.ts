import { db, isTeacher, jsonError, privateJson, sameOrigin, studentSessionId } from "../_lib";
import { domains, questions as key } from "@/lib/assessment";
import {administrator,canStudent,studentSchool} from '../_tenancy';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("잘못된 요청입니다.", 403);
  let body: { studentId?: unknown; answers?: unknown };
  try { body = await request.json() as typeof body; } catch { return jsonError("진단 답변을 확인해 주세요."); }
  const studentId = typeof body.studentId === "string" ? body.studentId : "";
  const answers = body.answers;
  if (!studentId || !answers || typeof answers !== "object" || Array.isArray(answers)) return jsonError("학생과 답변 정보를 확인해 주세요.");
  const actor=await administrator(request);if(actor?!await canStudent(actor,studentId):await studentSessionId(request)!==studentId)return jsonError('이 학생에 접근할 수 없습니다.',403);
  const answerMap = answers as Record<string, unknown>;
  if (key.some((q) => !Number.isInteger(answerMap[q.id]) || Number(answerMap[q.id]) < 0 || Number(answerMap[q.id]) > 3)) return jsonError("모든 문항에 답변해 주세요.");
  try {
    const student = await db().prepare("SELECT id FROM students WHERE id=?").bind(studentId).first();
    if (!student) return jsonError("등록된 학생을 찾을 수 없습니다.", 404);
    const correctByDomain = Object.fromEntries(domains.map((domain) => [domain, 0])) as Record<string, number>;
    for (const q of key) if (answerMap[q.id] === q.answer) correctByDomain[q.domain] += 1;
    const domainScores = Object.fromEntries(domains.map((domain) => [domain, Math.round(correctByDomain[domain] / key.filter((question) => question.domain === domain).length * 100)]));
    const totalScore = Math.round(key.reduce((total, q) => total + (answerMap[q.id] === q.answer ? 1 : 0), 0) / key.length * 100);
    const id = crypto.randomUUID();
    const completedAt = new Date().toISOString();
    await db().batch([db().prepare("INSERT INTO assessments (id, student_id, total_score, max_score, domains, answers, completed_at) VALUES (?, ?, ?, 100, ?, ?, ?)")
      .bind(id, studentId, totalScore, JSON.stringify(domainScores), JSON.stringify(answerMap), completedAt),db().prepare('INSERT INTO assessment_schools(assessment_id,school_id) VALUES(?,?)').bind(id,await studentSchool(studentId))]);
    return privateJson({ result: { id, studentId, totalScore, maxScore: 100, domains: domainScores, completedAt } }, { status: 201 });
  } catch (error) {
    console.error("Could not save assessment", error);
    return jsonError("진단 결과를 저장하지 못했습니다. 데이터베이스를 확인해 주세요.", 503);
  }
}
