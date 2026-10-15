import { db, jsonError, privateJson, sameOrigin, studentSessionId } from '../_lib';
import { isGrade, questionBlueprints } from '@/lib/diagnosis-blueprint';
import { scoreDiagnosis, type AnswerKey, type ItemFeedback } from '@/lib/diagnosis-model';
import { createFeedback } from '@/lib/learning-support';
import { readLearning } from '../learning/data';

export async function GET(request: Request) {
  const id = await studentSessionId(request);
  if (!id) return jsonError('로그인 후 결과를 확인해 주세요.', 401);
  try {
    return privateJson(await readLearning(id, false));
  } catch { return jsonError('결과를 불러오지 못했습니다.', 503); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError('잘못된 요청입니다.', 403);
  const id = await studentSessionId(request);
  if (!id) return jsonError('로그인 후 답안을 제출해 주세요.', 401);
  if (Number(request.headers.get('Content-Length')) > 20000) return jsonError('답안 크기를 확인해 주세요.', 413);
  let body: { answers?: unknown; method?: unknown; keyVersion?: unknown };
  try { body = await request.json(); } catch { return jsonError('답안을 확인해 주세요.'); }
  if (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers) || !['manual', 'scan'].includes(String(body.method))) return jsonError('답안과 제출 방법을 확인해 주세요.');
  try {
    const database = db();
    const student = await database.prepare('SELECT grade FROM students WHERE id=?').bind(id).first<{ grade: number }>();
    if (!student || !isGrade(student.grade)) return jsonError('가입한 학년 정보를 확인해 주세요.', 400);
    const grade = student.grade;
    const row = await database.prepare('SELECT answers, version FROM diagnosis_keys WHERE grade=?').bind(grade).first<{ answers: string; version: string }>();
    if (!row) return jsonError('선생님이 이 학년의 정답표를 등록하면 채점할 수 있어요.', 409);
    if (body.keyVersion !== row.version) return jsonError('정답표가 변경됐습니다. 진단 화면을 다시 열어 주세요.', 409);
    const entries = Object.entries(body.answers);
    const items = questionBlueprints[grade];
    if (entries.length !== items.length || entries.some(([key, value]) => !items.some(item => item.id === key) || typeof value !== 'string' || value.length > 100)) return jsonError('우리 학년의 20문항 답안을 확인해 주세요.');
    const answers = body.answers as Record<string, string>;
    const key = JSON.parse(row.answers) as AnswerKey;
    const score = scoreDiagnosis(grade, answers, key);
    const resultId = crypto.randomUUID(), completedAt = new Date().toISOString();
    const previous = await database.prepare('SELECT feedback FROM assessments WHERE student_id=? AND grade=? AND key_version=? AND feedback IS NOT NULL ORDER BY completed_at DESC, id DESC LIMIT 1').bind(id, grade, row.version).first<{ feedback: string }>();
    const feedback = createFeedback(grade, answers, key, { previous: previous ? JSON.parse(previous.feedback) as ItemFeedback[] : undefined, method: String(body.method), seed: resultId });
    await database.prepare('INSERT INTO assessments (id, student_id, total_score, max_score, domains, answers, completed_at, grade, submission_method, key_version, feedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(resultId, id, score.totalScore, score.maxScore, JSON.stringify(score.domains), JSON.stringify(answers), completedAt, grade, String(body.method), row.version, JSON.stringify(feedback)).run();
    return privateJson({ result: { id: resultId, studentId: id, grade, totalScore: score.totalScore, maxScore: score.maxScore, domains: score.domains, completedAt, submissionMethod: body.method, keyVersion: row.version }, correct: score.correct }, { status: 201 });
  } catch { return jsonError('채점 결과를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 503); }
}
