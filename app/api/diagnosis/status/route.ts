import { db,isTeacher,jsonError,privateJson,studentSessionId } from '../../_lib';
import { isGrade } from '@/lib/diagnosis-blueprint';
import { getEvaluation,listEvaluations } from '../../_evaluations';
import { publicEvaluation } from '@/lib/evaluations';
export async function GET(request:Request){
  const id=await studentSessionId(request),formId=new URL(request.url).searchParams.get('formId');
  try{
    if(formId&&await isTeacher(request)){const form=await getEvaluation(formId);return form?privateJson({evaluations:[publicEvaluation(form)]}):jsonError('평가를 찾지 못했습니다.',404);}
    if(!id){
      return jsonError('로그인 후 진단을 시작해 주세요.',401);
    }
    const student=await db().prepare('SELECT grade FROM students WHERE id=?').bind(id).first<{grade:number}>();
    if(!student||!isGrade(student.grade))return jsonError('학년 정보를 확인해 주세요.');
    return privateJson({grade:student.grade,evaluations:(await listEvaluations(student.grade,true)).map(publicEvaluation)});
  }catch{return jsonError('평가 목록을 확인하지 못했습니다.',503);}
}
