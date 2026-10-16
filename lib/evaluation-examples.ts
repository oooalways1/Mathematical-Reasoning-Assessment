import type {Grade} from './diagnosis-blueprint';
import type {EvaluationDefinition,EvaluationItem} from './evaluations';

// Authored examples, generated locally from checked arithmetic. Never infer the key of an existing test.
export function exampleItem(grade:Grade,item:EvaluationItem,index:number):EvaluationItem{
  const a=grade===1?2+index%3:grade===2?12+index%7:120+index%17;
  const b=grade===1?1+index%2:grade===2?3+index%4:12+index%6;
  const total=a+b;
  const base={...item,domain:'수와 연산' as const,standardId:undefined,example:true,
    guidance:`${a}에 ${b}를 더하면 ${total}입니다. 각 수가 나타내는 양을 확인하고 계산해 보세요.`,
    practice:{prompt:`${a}+${b+1}은 얼마인가요?`,accepted:[String(total+1)],hint:`${a}+${b}의 결과보다 1 큽니다.`,explanation:`${a}+${b+1}=${total+1}입니다.`,version:1}};
  if(item.type==='matching'){
    const leftOptions=[`${a}+${b}`,`${a}+${b+1}`,`${a}+${b+2}`];
    return {...base,topic:'계산식과 알맞은 값을 연결하세요.',leftOptions,rightOptions:[String(total+2),String(total),String(total+1)],answers:['1-나,2-다,3-가'],guidance:`${leftOptions[0]}=${total}, ${leftOptions[1]}=${total+1}, ${leftOptions[2]}=${total+2}이므로 1-나, 2-다, 3-가로 연결합니다.`};
  }
  if(item.type==='choice'){
    const count=item.choiceCount||4,correct=index%count;
    const values=Array.from({length:count},(_,i)=>total+i-correct);
    return {...base,topic:`${a}+${b}의 값은? ${values.map((value,i)=>`${i+1}) ${value}`).join('  ')}`,answers:[String(correct+1)],leftOptions:undefined,rightOptions:undefined};
  }
  return {...base,topic:`${a}+${b}은 얼마인가요?`,answers:[String(total)],leftOptions:undefined,rightOptions:undefined};
}
export function fillBlankExamples(form:EvaluationDefinition){
  let filled=0;
  const items=form.items.map((item,i)=>{
    // A known topic with a missing answer belongs to the teacher's real paper. Do not guess it.
    if(item.topic.trim()||item.answers.length||item.guidance.trim()||item.practice||item.standardId)return item;
    filled++;return exampleItem(form.grade,item,i);
  });
  return {definition:{...form,title:form.title.trim()||`${form.grade}학년 연습용 예시 평가`,code:form.code.trim()||'연습용 예시',items},filled};
}
