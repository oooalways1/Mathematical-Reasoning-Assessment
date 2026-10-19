export type Verdict='correct'|'incorrect'|'review';
export type AnswerRule={type:'choice'|'short'|'matching';answers:string[];choiceCount:number;answerMode?:'exact'|'labels';orderMatters?:boolean;multiple?:boolean};
export function mathematicalText(value:string){return value.normalize('NFKC').trim().toLowerCase().replace(/[−–]/g,'-').replace(/\s*([+\-×÷=<>])\s*/g,'$1').replace(/\s+/g,' ');}
export function labelText(value:string,ordered=true){const v=value.normalize('NFKC').toLowerCase().trim();if(!/^[가나다라마바사아a-h1-8\s,，、;·]+$/.test(v))return null;const tokens=v.replace(/[\s,，、;·]/g,'').split('');if(!tokens.length||tokens.length>8||new Set(tokens).size!==tokens.length)return null;return (ordered?tokens:tokens.sort()).join(',');}
export function compareAnswer(rule:AnswerRule,value:string):{status:Verdict;normalized:string|null;reason:string}{
 if(!value.trim())return {status:'incorrect',normalized:'',reason:'미응답'};
 if(!rule.answers.length)return {status:'review',normalized:null,reason:'정답 기준 없음'};
 const inferLabels=rule.answerMode==='labels'||rule.multiple||rule.answers.every(a=>/^[가나다라마바사아](?:[\s,，、;·]*[가나다라마바사아])*$/.test(a.trim()));
 if(inferLabels){const normalized=labelText(value,rule.orderMatters!==false);if(!normalized)return {status:'review',normalized:null,reason:'선택지를 확실하게 구분할 수 없음'};return {status:rule.answers.some(a=>labelText(a,rule.orderMatters!==false)===normalized)?'correct':'incorrect',normalized,reason:rule.orderMatters===false?'선택지 집합 비교':'선택지 순서 비교'};}
 const normalized=mathematicalText(value);if(rule.answers.some(a=>mathematicalText(a)===normalized))return {status:'correct',normalized,reason:'허용 답안 일치'};
 if(/[?？�]/.test(value)||/답[은는:]|정답|입니다/.test(value)||rule.type==='choice'&&!/^\(?[1-5]\)?$/.test(normalized))return {status:'review',normalized,reason:'불확실한 답안 표현'};
 return {status:'incorrect',normalized,reason:'등록된 허용 답안과 다름'};
}
