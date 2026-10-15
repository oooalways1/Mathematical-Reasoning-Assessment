import { questionBlueprints, type QuestionBlueprint } from './diagnosis-blueprint';
import { feedbackCases } from './feedback-cases';
import { practiceFor } from './learning-support';
const numericDiagnosticSkills = new Set(['1-1','1-2','1-9','1-10','1-17','2-8','3-1','3-10','3-20']);
const numericAnswer = /^-?\d+(?:\.\d+)?(?:cm|mm|km|m|kg|g|ml|l|센티미터|밀리미터|킬로미터|미터|킬로그램|그램|밀리리터|리터|개|명|일|분|시간|배)?$/;
const unitAnswer = /^-?\d+(?:\.\d+)?(?:cm|mm|km|m|kg|g|ml|l|센티미터|밀리미터|킬로미터|미터|킬로그램|그램|밀리리터|리터|개|명|일|분|시간|배)$/;
export function applicableFeedbackCases(item: QuestionBlueprint) {
  const practice = practiceFor(item), choice = /[①②③④]/.test(practice.prompt);
  return feedbackCases.filter(entry => {
    if(entry.id==='d-choice-review') return item.type==='choice';
    if(entry.id==='d-short-review') return item.type==='short';
    if(entry.id==='d-one-away'||entry.id==='d-format-review') return item.type==='short' && numericDiagnosticSkills.has(`${item.sourceGrade}-${item.sourceNumber}`);
    if(entry.id==='p-comparison') return practice.accepted.some(answer=>answer==='<'||answer==='>');
    if(entry.id==='p-operation') return !choice && /\d+\s*[+\-]\s*\d+/.test(practice.prompt);
    if(entry.id==='p-place-order') return !choice && practice.accepted.some(answer=>/^\d{2}$/.test(answer) && answer[0]!==answer[1]);
    if(entry.id==='p-unit') return !choice && practice.accepted.some(answer=>unitAnswer.test(answer));
    if(entry.id==='p-one-away') return !choice && practice.accepted.some(answer=>numericAnswer.test(answer));
    return true;
  });
}
export const uniqueSkillItems = [...new Map(Object.values(questionBlueprints).flat().map(item=>[`${item.sourceGrade}-${item.sourceNumber}`,item])).values()];
export const feedbackCatalogStats = { skills: uniqueSkillItems.length, situations: feedbackCases.length, combinations: uniqueSkillItems.reduce((sum,item)=>sum+applicableFeedbackCases(item).length*2,0) };
