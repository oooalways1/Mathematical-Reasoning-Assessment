import {questionBlueprints,type Grade} from './diagnosis-blueprint';
import {practiceFor} from './learning-support';
import type {Practice} from './diagnosis-model';
export function recommendedPractice(grade:Grade,topic:string,concept?:string,level=0):Practice|null{
 const exact=questionBlueprints[grade].find(i=>i.id===concept||i.topic===topic);if(exact&&level===0)return practiceFor(exact);
 const text=exact?.topic??topic;
 const operation=/덧셈|더하|더하기/.test(text)?'+':/뺄셈|빼기|빼요/.test(text)?'-':null;
 if(!operation)return null;
 const stage=Math.min(2,Math.max(0,level)),a=grade===1?[3,5,8][stage]:grade===2?[12,27,48][stage]:[120,238,456][stage],b=grade===1?[2,3,4][stage]:grade===2?[3,15,26][stage]:[15,127,238][stage],answer=operation==='+'?a+b:a-b;
 return {prompt:`${['기초','기본','심화'][stage]} 연습: ${a}${operation}${b}은 얼마인가요?`,accepted:[String(answer)],hint:operation==='+'?'같은 자리끼리 더하고 10이 되면 묶어 보세요.':'같은 자리끼리 빼고 부족하면 윗자리에서 가져와 보세요.',explanation:`${a}${operation}${b}=${answer}`,version:stage+1};
}
