import { db, isTeacher, jsonError, privateJson, sameOrigin } from '../../_lib';
import { GRADES } from '@/lib/diagnosis-blueprint';

export async function GET(request: Request) {
  if (!await isTeacher(request)) return jsonError('교사 인증이 필요합니다.', 401);
  try {
    const result = await db().prepare('SELECT grade, answers, version, updated_at AS updatedAt FROM diagnosis_keys').all<{ grade: number; answers: string; version: string; updatedAt: string }>();
    return privateJson({ keys: result.results.map(row => ({ ...row, answers: JSON.parse(row.answers) })), grades: GRADES });
  } catch { return jsonError('정답표를 불러오지 못했습니다.', 503); }
}
export async function PUT(request:Request) {
  if(!sameOrigin(request))return jsonError('잘못된 요청입니다.',403);
  if(!await isTeacher(request))return jsonError('교사 인증이 필요합니다.',401);
  return jsonError('평가별 정답 설정으로 변경되었습니다. 페이지를 새로고침하고 평가 유형을 선택해 수정해 주세요.',409);
}
