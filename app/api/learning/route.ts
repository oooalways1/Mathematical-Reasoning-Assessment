import { db, isTeacher, jsonError, privateJson, sameOrigin, studentSessionId } from '../_lib';
import { readLearning } from './data';
import { practiceCorrect } from '@/lib/learning-support';
import type { ItemFeedback, PracticeAttempt } from '@/lib/diagnosis-model';
import { practiceCoaching } from '@/lib/adaptive-feedback';

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get('studentId');
  const teacher = requested ? await isTeacher(request) : false;
  if (requested && !teacher) return jsonError('교사 인증이 필요합니다.', 401);
  const id = requested || await studentSessionId(request);
  if (!id) return jsonError('로그인 후 학습 기록을 확인해 주세요.', 401);
  try { return privateJson(await readLearning(id, teacher)); }
  catch { return jsonError('학습 기록을 불러오지 못했습니다.', 503); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError('잘못된 요청입니다.', 403);
  if (Number(request.headers.get('Content-Length')) > 8000) return jsonError('입력 크기를 확인해 주세요.', 413);
  let body: { assessmentId?: unknown; questionId?: unknown; answer?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return jsonError('입력을 확인해 주세요.'); }
  if (typeof body.assessmentId !== 'string' || typeof body.questionId !== 'string' || body.assessmentId.length > 100 || body.questionId.length > 30) return jsonError('학습 항목을 확인해 주세요.');
  const teacher = body.note !== undefined;
  const id = teacher ? null : await studentSessionId(request);
  if (teacher ? !await isTeacher(request) : !id) return jsonError('로그인이 필요합니다.', 401);
  if (teacher ? typeof body.note !== 'string' || body.note.length > 1000 : typeof body.answer !== 'string' || !body.answer.trim() || body.answer.length > 100) return jsonError('답안 또는 지도 의견을 확인해 주세요.');
  try {
    const database = db();
    const row = await database.prepare('SELECT student_id AS studentId, feedback FROM assessments WHERE id=?').bind(body.assessmentId).first<{ studentId: string; feedback: string | null }>();
    if (!row || (!teacher && row.studentId !== id)) return jsonError('학습 기록을 찾을 수 없습니다.', 404);
    const item = (row.feedback ? JSON.parse(row.feedback) as ItemFeedback[] : []).find(item => item.id === body.questionId);
    if (!item) return jsonError('이전 진단은 문항별 학습 정보가 없습니다. 새 진단을 진행해 주세요.', 409);
    const now = new Date().toISOString();
    if (teacher) {
      await database.prepare(`INSERT INTO learning_progress (id, assessment_id, question_id, teacher_note, updated_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(assessment_id,question_id) DO UPDATE SET teacher_note=excluded.teacher_note, updated_at=excluded.updated_at`).bind(crypto.randomUUID(), body.assessmentId, body.questionId, String(body.note).trim(), now).run();
    } else {
      const correct = practiceCorrect(item.practice, String(body.answer));
      const past = await database.prepare('SELECT id, question_id AS questionId, answer, correct, attempted_at AS attemptedAt FROM learning_attempts WHERE assessment_id=? AND question_id=? ORDER BY attempted_at DESC, id DESC').bind(body.assessmentId, body.questionId).all<PracticeAttempt>();
      const attemptId = crypto.randomUUID();
      const coaching = practiceCoaching(item, [{ id: attemptId, questionId: item.id, answer: String(body.answer).trim(), correct, attemptedAt: now }, ...past.results.map(attempt => ({ ...attempt, correct: Boolean(attempt.correct) }))], `${body.assessmentId}:${item.id}`);
      const update = database.prepare(`INSERT INTO learning_progress (id, assessment_id, question_id, attempts, latest_answer, correct, completed_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?, ?, ?) ON CONFLICT(assessment_id,question_id) DO UPDATE SET attempts=attempts+1,
        latest_answer=excluded.latest_answer, correct=excluded.correct, completed_at=CASE WHEN excluded.correct=1 THEN COALESCE(completed_at,excluded.completed_at) ELSE completed_at END,
        updated_at=excluded.updated_at`).bind(crypto.randomUUID(), body.assessmentId, body.questionId, String(body.answer).trim(), Number(correct), correct ? now : null, now);
      const attempt = database.prepare('INSERT INTO learning_attempts (id, assessment_id, question_id, answer, correct, attempted_at, coaching) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(attemptId, body.assessmentId, body.questionId, String(body.answer).trim(), Number(correct), now, coaching ? JSON.stringify(coaching) : null);
      await database.batch([update, attempt]);
    }
    return privateJson(await readLearning(row.studentId, teacher));
  } catch { return jsonError('학습 기록을 저장하지 못했습니다.', 503); }
}
