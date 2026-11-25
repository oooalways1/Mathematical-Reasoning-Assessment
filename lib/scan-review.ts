import {choiceValue, matchingValue} from './evaluations';

export type ScanReviewItem = {id:string;number:number;type:'choice'|'short'|'matching';choiceCount?:number;multiple?:boolean;leftOptions?:string[];rightOptions?:string[]};
export type ReviewedAnswers = Record<string,{value:string;blank:boolean}>;

export function canConfirmScanAnswer(item:ScanReviewItem,value:string){
  if(!value.trim())return false;
  if(item.type==='matching')return matchingValue(value,item.leftOptions?.length??0)!==null;
  if(item.type==='choice'&&!item.multiple)return choiceValue(value,item.choiceCount??4)!==null;
  return true;
}
export function isScanAnswerReviewed(item:ScanReviewItem,answers:Record<string,string>,reviewed:ReviewedAnswers){
  const value=answers[item.id]??'',record=reviewed[item.id];
  return !!record&&record.value===value&&(value.trim()?canConfirmScanAnswer(item,value):record.blank);
}
export function scanReviewSummary(items:ScanReviewItem[],answers:Record<string,string>,reviewed:ReviewedAnswers){
  const remaining=items.filter(item=>!isScanAnswerReviewed(item,answers,reviewed));
  return {remaining:remaining.length,reviewed:items.length-remaining.length,blank:items.filter(item=>!(answers[item.id]??'').trim()).length,ready:items.length>0&&remaining.length===0};
}
