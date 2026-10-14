import { db, isTeacher, jsonError, privateJson, sameOrigin } from '../../_lib';
import { GRADES, isGrade, questionBlueprints } from '@/lib/diagnosis-blueprint';
import { choiceAnswer, type AnswerKey } from '@/lib/diagnosis-model';

export async function GET(request: Request) {
  if (!await isTeacher(request)) return jsonError('교사 인증이 필요합니다.', 401);
  try {
    const result = await db().prepare('SELECT grade, answers, version, updated_at AS updatedAt FROM diagnosis_keys').all<{ grade: number; answers: string; version: string; updatedAt: string }>();
    return privateJson({ keys: result.results.map(row => ({ ...row, answers: JSON.parse(row.answers) })), grades: GRADES });
  } catch { return jsonError('정답표를 불러오지 못했습니다.', 503); }
}
export async function PUT(request: Request) {
  if (!sameOrigin(request)) return jsonError('잘못된 요청입니다.', 403);
  if (!await isTeacher(request)) return jsonError('교사 인증이 필요합니다.', 401);
  let body: { grade?: unknown; answers?: unknown; confirmed?: unknown; expectedVersion?: unknown };
  try { body = await request.json(); } catch { return jsonError('정답표를 확인해 주세요.'); }
  const grade = Number(body.grade);
  if (!isGrade(grade) || body.confirmed !== true || !body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) return jsonError('학년과 정답표 확인 항목을 선택해 주세요.');
  const values = body.answers as Record<string, unknown>;
  const answers: AnswerKey = {};
  for (const item of questionBlueprints[grade]) {
    const candidates = values[item.id];
    if (!Array.isArray(candidates) || !candidates.length || candidates.length > 10 || candidates.some(value => typeof value !== 'string' || !value.trim() || value.length > 100 || (item.type === 'choice' && !choiceAnswer(value)))) return jsonError(`${item.number}번 정답을 확인해 주세요. 선택형은 1~4번, 단답형은 답을 입력합니다.`);
    answers[item.id] = candidates as string[];
  }
  try {
    const version = crypto.randomUUID(), updatedAt = new Date().toISOString();
    const current = await db().prepare('SELECT version FROM diagnosis_keys WHERE grade=?').bind(grade).first<{ version: string }>();
    if ((current?.version ?? null) !== (body.expectedVersion ?? null)) return jsonError('다른 곳에서 정답표가 변경됐습니다. 새로고침 후 다시 저장해 주세요.', 409);
    const statement = current
      ? db().prepare('UPDATE diagnosis_keys SET answers=?, version=?, updated_at=? WHERE grade=? AND version=?').bind(JSON.stringify(answers), version, updatedAt, grade, current.version)
      : db().prepare('INSERT OR IGNORE INTO diagnosis_keys (answers, version, updated_at, grade) VALUES (?, ?, ?, ?)').bind(JSON.stringify(answers), version, updatedAt, grade);
    const result = await statement.run();
    if (result.meta.changes !== 1) return jsonError('정답표가 변경됐습니다. 새로고침 후 다시 저장해 주세요.', 409);
    return privateJson({ version, updatedAt });
  } catch { return jsonError('정답표를 저장하지 못했습니다.', 503); }
}
