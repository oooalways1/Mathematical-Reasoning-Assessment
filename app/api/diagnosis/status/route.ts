import { db, jsonError, privateJson, studentSessionId } from '../../_lib';
import { isGrade } from '@/lib/diagnosis-blueprint';

export async function GET(request: Request) {
  const id = await studentSessionId(request);
  if (!id) return jsonError('로그인 후 진단을 시작해 주세요.', 401);
  try {
    const student = await db().prepare('SELECT grade FROM students WHERE id=?').bind(id).first<{ grade: number }>();
    if (!student || !isGrade(student.grade)) return jsonError('학년 정보를 확인해 주세요.');
    const key = await db().prepare('SELECT version FROM diagnosis_keys WHERE grade=?').bind(student.grade).first<{ version: string }>();
    return privateJson({ grade: student.grade, ready: !!key, keyVersion: key?.version ?? null });
  } catch { return jsonError('진단 준비 상태를 확인하지 못했습니다.', 503); }
}
