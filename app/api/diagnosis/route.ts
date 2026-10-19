import {db,jsonError,privateJson,sameOrigin,studentSessionId} from '../_lib';
import {isGrade} from '@/lib/diagnosis-blueprint';
import {getEvaluation} from '../_evaluations';
import {evaluationFeedback,scoreEvaluation} from '@/lib/evaluations';
import type {ItemFeedback} from '@/lib/diagnosis-model';
import {readLearning} from '../learning/data';
import {studentSchool} from '../_tenancy';
import {env,waitUntil} from 'cloudflare:workers';
import {generateFeedback} from '../_ai';
import {activeSchool} from '../_schools';
export async function GET(request:Request){const id=await studentSessionId(request);if(!id)return jsonError('로그인 후 결과를 확인해 주세요.',401);try{return privateJson(await readLearning(id,false));}catch{return jsonError('결과를 불러오지 못했습니다.',503);}}
export async function POST(request:Request){
  if(!sameOrigin(request))return jsonError('잘못된 요청입니다.',403);
  const id=await studentSessionId(request);if(!id)return jsonError('로그인 후 답안을 제출해 주세요.',401);
  if(Number(request.headers.get('Content-Length'))>30000)return jsonError('답안 크기를 확인해 주세요.',413);
  let body:{answers?:unknown;method?:unknown;keyVersion?:unknown;formId?:unknown};
  try{body=await request.json();}catch{return jsonError('답안을 확인해 주세요.');}
  if(typeof body.formId!=='string'||!body.answers||typeof body.answers!=='object'||Array.isArray(body.answers)||!['manual','scan'].includes(String(body.method)))return jsonError('평가 유형을 선택하고 답안을 확인해 주세요. 화면을 새로 열어 주세요.',409);
  try{
    const database=db(),student=await database.prepare('SELECT grade FROM students WHERE id=?').bind(id).first<{grade:number}>();
    if(!student||!isGrade(student.grade))return jsonError('가입한 학년을 확인해 주세요.');
    const form=await getEvaluation(body.formId);
    const school=await studentSchool(id);if(form&&(form.schoolId??null)!==school)return jsonError('소속 학교의 평가를 선택하세요.',403);
    if(school&&!await activeSchool(school))return jsonError('현재 학교에서 새 평가를 진행할 수 없습니다. 선생님께 확인해 주세요.',403);
    if(!form||form.trashed||form.grade!==student.grade||form.status!=='active')return jsonError('현재 참여할 수 없는 평가입니다. 평가 목록을 다시 불러와 주세요.',409);
    if(body.keyVersion!==form.version)return jsonError('평가 문항 또는 정답표가 변경됐습니다. 평가 목록을 다시 불러온 뒤 답안을 확인해 주세요.',409);
    const entries=Object.entries(body.answers),items=form.items;
    if(entries.length!==items.length||entries.some(([key,value])=>!items.some(item=>item.id===key)||typeof value!=='string'||value.length>100))return jsonError('선택한 평가의 '+items.length+'문항 답안을 확인해 주세요.');
    const answers=body.answers as Record<string,string>,score=scoreEvaluation(form,answers),resultId=crypto.randomUUID(),completedAt=new Date().toISOString();
    const previous=await database.prepare('SELECT feedback FROM assessments WHERE student_id=? AND grade=? AND key_version=? AND feedback IS NOT NULL ORDER BY completed_at DESC,id DESC LIMIT 1').bind(id,student.grade,form.version).first<{feedback:string}>();
    const feedback=evaluationFeedback(form,answers,{previous:previous?JSON.parse(previous.feedback) as ItemFeedback[]:undefined,method:String(body.method),seed:resultId});
    const savedRows=await database.batch([database.prepare("INSERT INTO assessments (id,student_id,total_score,max_score,domains,answers,completed_at,grade,submission_method,key_version,feedback) SELECT ?,?,?,?,?,?,?,?,?,?,? FROM evaluation_forms WHERE id=? AND version=? AND status='active' AND NOT EXISTS(SELECT 1 FROM evaluation_trash t WHERE t.form_id=evaluation_forms.id)").bind(resultId,id,score.totalScore,score.maxScore,JSON.stringify(score.domains),JSON.stringify(answers),completedAt,student.grade,String(body.method),form.version,JSON.stringify(feedback),form.id,form.version),database.prepare('INSERT INTO assessment_schools(assessment_id,school_id) SELECT id,? FROM assessments WHERE id=?').bind(school,resultId),database.prepare("INSERT INTO grading_reviews(assessment_id,question_id,raw_answer,normalized_answer,status,reason) SELECT ?,json_extract(value,'$.id'),json_extract(value,'$.raw'),json_extract(value,'$.normalized'),json_extract(value,'$.status'),json_extract(value,'$.reason') FROM json_each(?) WHERE EXISTS(SELECT 1 FROM assessments WHERE id=?)").bind(resultId,JSON.stringify(form.items.map(item=>({id:item.id,raw:answers[item.id],...score.reviews[item.id]}))),resultId)]);const saved=savedRows[0];
    if(saved.meta.changes!==1)return jsonError('제출 중 평가가 변경됐습니다. 평가 목록을 다시 불러와 주세요.',409);
    if(env.AI_ENABLED==='true'&&env.AI_FREE_PLAN_CONFIRMED==='true'&&env.AI){try{waitUntil(generateFeedback(resultId).catch(()=>null));}catch{/* Scoring remains saved even if background scheduling is unavailable. */}}
    return privateJson({result:{id:resultId,studentId:id,grade:student.grade,totalScore:score.totalScore,maxScore:score.maxScore,domains:score.domains,completedAt,submissionMethod:body.method,keyVersion:form.version,evaluationId:form.id,evaluationTitle:form.title,evaluationCode:form.code},correct:score.correct},{status:201});
  }catch{return jsonError('채점 결과를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',503);}
}
