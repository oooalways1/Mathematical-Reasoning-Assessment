import { domains, type Domain } from './assessment';
import { isGrade, questionBlueprints, type Grade } from './diagnosis-blueprint';
import { normalizeAnswer, type AnswerKey, type ItemFeedback, type Practice } from './diagnosis-model';
import { createFeedback } from './learning-support';

export type EvaluationItem = {id:string;number:number;topic:string;domain:Domain;type:'choice'|'short';choiceCount:number;answers:string[];guidance:string;standardId?:string;practice?:Practice};
export type EvaluationDefinition = {title:string;code:string;grade:Grade;items:EvaluationItem[]};
export type EvaluationRecord = EvaluationDefinition & {id:string;version:string;status:'draft'|'active'|'archived';updatedAt:string};
export type PublicEvaluation = {id:string;title:string;code:string;grade:Grade;version:string;items:Pick<EvaluationItem,'id'|'number'|'type'|'choiceCount'>[]};
export function evaluationLabel(value:{title:string;code:string}) {return `${value.title} · ${value.code}`;}
export function templateEvaluation(grade:Grade,answers:AnswerKey={}):EvaluationDefinition {
  return {title:`${grade}학년 기본 진단`,code:'기본형',grade,items:questionBlueprints[grade].map(item=>({...item,choiceCount:4,answers:answers[item.id]??[],guidance:'',standardId:item.id}))};
}
export function publicEvaluation(form:EvaluationRecord):PublicEvaluation {
  return {id:form.id,title:form.title,code:form.code,grade:form.grade,version:form.version,items:form.items.map(({id,number,type,choiceCount})=>({id,number,type,choiceCount}))};
}
export function choiceValue(value:string,count:number) {const answer=normalizeAnswer(value).replace(/^\(([1-5])\)$/, '$1');return new RegExp(`^[1-${count}]$`).test(answer)?answer:null;}
export function validateEvaluation(value:unknown,publish:boolean):EvaluationDefinition {
  if(!value||typeof value!=='object')throw new Error('평가 정보를 확인해 주세요.');
  const input=value as Record<string,unknown>;
  const title=typeof input.title==='string'?input.title.trim():'';
  const code=typeof input.code==='string'?input.code.trim():'';
  const grade=Number(input.grade);
  if(!title||title.length>100||!code||code.length>40||!isGrade(grade))throw new Error('평가명(100자 이내), 유형 코드(40자 이내), 학년을 입력해 주세요.');
  if(!Array.isArray(input.items)||!input.items.length||input.items.length>60)throw new Error('문항은 1~60개로 구성해 주세요.');
  const ids=new Set<string>();
  const items=input.items.map((raw,index):EvaluationItem=>{
    if(!raw||typeof raw!=='object')throw new Error('문항 정보를 확인해 주세요.');
    const item=raw as EvaluationItem;
    const number=index+1;
    if(typeof item.id!=='string'||!/^[a-zA-Z0-9_-]{1,30}$/.test(item.id)||ids.has(item.id))throw new Error(`${number}번 문항 식별자가 올바르지 않습니다.`);
    ids.add(item.id);
    if(!['choice','short'].includes(item.type)||!domains.includes(item.domain)||typeof item.topic!=='string'||item.topic.trim().length>300||(publish&&!item.topic.trim()))throw new Error(`${number}번 문항의 내용, 영역, 답안 형식을 확인해 주세요.`);
    const count=item.type==='choice'?Number(item.choiceCount):4;
    if(!Number.isInteger(count)||count<2||count>5)throw new Error(`${number}번 보기 수는 2~5개입니다.`);
    if(!Array.isArray(item.answers)||item.answers.length>10||item.answers.some(a=>typeof a!=='string'||!a.trim()||a.length>100||(item.type==='choice'&&!choiceValue(a,count)))||(publish&&!item.answers.length))throw new Error(`${number}번 정답을 확인해 주세요.`);
    if(typeof item.guidance!=='string'||item.guidance.length>1000)throw new Error(`${number}번 풀이 안내는 1000자 이내로 입력해 주세요.`);
    let practice:Practice|undefined;
    if(item.practice){
      const p=item.practice;
      if(typeof p.prompt!=='string'||!p.prompt.trim()||p.prompt.length>1000||!Array.isArray(p.accepted)||!p.accepted.length||p.accepted.length>10||p.accepted.some(a=>typeof a!=='string'||!a.trim()||a.length>100)||typeof p.hint!=='string'||p.hint.length>1000||typeof p.explanation!=='string'||p.explanation.length>1000)throw new Error(`${number}번 복습 문제와 정답을 확인해 주세요.`);
      practice={prompt:p.prompt.trim(),accepted:p.accepted.map(a=>a.trim()),hint:p.hint.trim(),explanation:p.explanation.trim(),version:1};
    }
    const standard=questionBlueprints[grade].find(p=>p.id===item.standardId&&p.topic===item.topic.trim()&&p.domain===item.domain&&p.type===item.type&&(item.type!=='choice'||count===4));
    return {id:item.id,number,topic:item.topic.trim(),domain:item.domain,type:item.type,choiceCount:count,answers:item.answers.map(a=>a.trim()),guidance:item.guidance.trim(),...(standard?{standardId:standard.id}:{}),...(practice?{practice}:{})};
  });
  return {title,code,grade,items};
}
export function scoreEvaluation(form:EvaluationDefinition,answers:Record<string,string>){
  const correct:Record<string,boolean>={},area:Record<string,{n:number;correct:number}>={};let n=0;
  for(const item of form.items){const answer=item.type==='choice'?choiceValue(answers[item.id]??'',item.choiceCount):normalizeAnswer(answers[item.id]??'');const ok=!!answer&&item.answers.some(a=>(item.type==='choice'?choiceValue(a,item.choiceCount):normalizeAnswer(a))===answer);correct[item.id]=ok;n+=Number(ok);const d=area[item.domain]??={n:0,correct:0};d.n++;d.correct+=Number(ok);}
  return {totalScore:Math.round(n/form.items.length*100),maxScore:100,correct,domains:Object.fromEntries(Object.entries(area).map(([name,v])=>[name,Math.round(v.correct/v.n*100)]))};
}
export function evaluationFeedback(form:EvaluationDefinition,answers:Record<string,string>,context:{previous?:ItemFeedback[];method:string;seed:string}):ItemFeedback[]{
  const score=scoreEvaluation(form,answers);
  const template=templateEvaluation(form.grade);
  const key=Object.fromEntries(template.items.map(item=>[item.id,form.items.find(i=>i.standardId===item.id)?.answers??['__unanswered__']]));
  const baselineAnswers=Object.fromEntries(form.items.filter(item=>item.standardId).map(item=>[item.standardId!,answers[item.id]??'']));
  const standard=createFeedback(form.grade,baselineAnswers,key,context);
  return form.items.map(item=>{
    const baseline=item.standardId?standard.find(p=>p.id===item.standardId):undefined;
    const correct=score.correct[item.id],given=answers[item.id]??'';
    if(baseline)return {...baseline,id:item.id,number:item.number,given,correct,blank:!given.trim(),expected:item.answers,...(item.guidance?{teacherGuidance:item.guidance}:{}),...(item.practice?{practice:item.practice}: {})};
    return {id:item.id,number:item.number,topic:item.topic,domain:item.domain,given,expected:item.answers,correct,blank:!given.trim(),custom:true,
      guidance:item.guidance||(correct?'잘 해결했어요. 풀이 과정을 말로 설명해 보세요.':!given.trim()?'답이 비어 있어요. 문제의 조건을 확인하고 다시 풀어 보세요.':`등록된 정답과 답이 달라요. ${item.topic}에서 묻는 내용과 검사지의 조건을 다시 확인해 보세요.`),
      practice:item.practice??{enabled:false,prompt:'선생님이 아직 관련 복습 문제를 등록하지 않았어요.',accepted:[],hint:'검사지와 문항별 풀이 안내를 다시 살펴보세요.',explanation:'',version:1}};
  });
}
