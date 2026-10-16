import { db, jsonError, privateJson } from '../_lib';
import { ensureSchools } from '../_schools';

export async function GET() {
  try {
    await ensureSchools();
    const rows = await db().prepare('SELECT id,name,region FROM schools WHERE active=1 ORDER BY name,region').all();
    return privateJson({schools: rows.results});
  } catch { return jsonError('학교 목록을 불러오지 못했습니다. 다시 시도해 주세요.',503); }
}
