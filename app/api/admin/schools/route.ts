import { db, isTeacher, jsonError, privateJson, sameOrigin } from '../../_lib';
import { ensureSchools } from '../../_schools';

export async function GET(request: Request) {
  if (!await isTeacher(request)) return jsonError('교사 인증이 필요합니다.',401);
  try {
    await ensureSchools();
    const rows = await db().prepare(`SELECT s.id,s.name,s.region,s.active,(SELECT COUNT(*) FROM student_schools ss WHERE ss.school_id=s.id) AS studentCount FROM schools s ORDER BY s.active DESC,s.name,s.region`).all();
    return privateJson({schools: rows.results});
  } catch { return jsonError('학교 목록을 불러오지 못했습니다.',503); }
}
async function save(request: Request, creating: boolean) {
  if (!sameOrigin(request)) return jsonError('잘못된 요청입니다.',403);
  if (!await isTeacher(request)) return jsonError('교사 인증이 필요합니다.',401);
  let body: {id?: unknown;name?: unknown;region?: unknown;active?: unknown};
  try { body = await request.json(); } catch { return jsonError('학교 정보를 확인해 주세요.'); }
  const name = typeof body.name === 'string' ? body.name.normalize('NFKC').trim().replace(/\s+/g,' ') : '';
  const region = typeof body.region === 'string' ? body.region.normalize('NFKC').trim().replace(/\s+/g,' ') : '';
  if (!name || name.length > 80 || region.length > 80) return jsonError('학교명은 1~80자, 지역은 80자 이내로 입력해 주세요.');
  if (!creating && (typeof body.id !== 'string' || typeof body.active !== 'boolean')) return jsonError('수정할 학교와 상태를 확인해 주세요.');
  try {
    await ensureSchools();
    const id = creating ? crypto.randomUUID() : String(body.id);
    if (creating) await db().prepare('INSERT INTO schools (id,name,region) VALUES (?,?,?)').bind(id,name,region).run();
    else {
      const result = await db().prepare('UPDATE schools SET name=?,region=?,active=? WHERE id=?').bind(name,region,body.active ? 1 : 0,id).run();
      if (!result.meta.changes) return jsonError('학교를 찾지 못했습니다.',404);
    }
    return privateJson({ok:true,id},{status:creating ? 201 : 200});
  } catch (error) {
    if (String(error).includes('UNIQUE constraint')) return jsonError('같은 학교명과 지역이 이미 등록되어 있습니다. 기존 학교를 확인해 주세요.',409);
    return jsonError('학교를 저장하지 못했습니다. 다시 시도해 주세요.',503);
  }
}
export function POST(request: Request) { return save(request,true); }
export function PATCH(request: Request) { return save(request,false); }
