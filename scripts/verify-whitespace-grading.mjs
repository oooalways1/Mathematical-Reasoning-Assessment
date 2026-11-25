import assert from 'node:assert/strict';
import {build} from 'esbuild';

const bundle=await build({stdin:{contents:"export {compareAnswer} from './lib/grading'; export {normalizeAnswer,choiceAnswer} from './lib/diagnosis-model'; export {scoreEvaluation,matchingValue} from './lib/evaluations'; export {parseNumberedAnswers} from './lib/scan-answers';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',external:['pdfjs-dist','tesseract.js']});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const separators=[' ','  ','\t','\n','\r\n','\u00a0','\u3000','\u200b','\u200c','\u200d','\u2060','\ufeff'];
let checks=0;
for(const space of separators){
 for(const answer of ['12','6,10','1/2','-3','1.5','3+4','삼각형']){
  const input=space+[...answer].join(space)+space;
  const item={id:'q',number:1,type:'short',topic:'공백 검증',domain:'수와 연산',guidance:'',answers:[answer],choiceCount:4};
  const form={title:'공백 검증',code:'spacing',grade:1,items:[item]};
  assert.equal(api.scoreEvaluation(form,{q:input}).reviews.q.status,'correct',JSON.stringify({answer,space}));
  assert.equal(api.scoreEvaluation({...form,items:[{...item,answers:[input]}]},{q:answer}).reviews.q.status,'correct');
  assert.equal(api.normalizeAnswer(input),answer);
  checks+=3;
 }
 assert.equal(api.choiceAnswer(space+'('+space+'2'+space+')'+space),'2');
 assert.equal(api.matchingValue(`1${space}-${space}가,${space}2${space}→${space}나`,2),'1-가,2-나');
 const labels={type:'short',answers:[`나${space}라`],choiceCount:4,answerMode:'labels',orderMatters:false};
 assert.equal(api.compareAnswer(labels,'라 나').status,'correct');
 assert.equal(api.compareAnswer({...labels,orderMatters:true},'라 나').status,'incorrect');
 assert.equal(api.compareAnswer(labels,'나 나 라').status,'review');
 checks+=5;
}
for(const [expected,input] of [['-3','3'],['1.5','15'],['6,10','610'],['3+4','34'],['12','21']]){
 assert.equal(api.compareAnswer({type:'short',answers:[expected],choiceCount:4},input).status,'incorrect');checks++;
}
assert.equal(api.compareAnswer({type:'short',answers:['12'],choiceCount:4},' \n\t ').status,'incorrect');checks++;
const scannedItems=[1,2,3,4].map(number=>({id:'q'+number,number,type:'short'}));
const scanned=api.parseNumberedAnswers('1: 6,10\n1: 6, 10\n2: 가 나\n2: 가나\n3: 1 / 2\n3: 1/2\n4: -3\n4: 3',1,scannedItems);
assert.equal(scanned.answers.q1,'6, 10');assert.equal(scanned.answers.q2,'가나');assert.equal(scanned.answers.q3,'1/2');assert.equal(scanned.answers.q4,undefined);assert.deepEqual(scanned.conflicts,['q4']);checks+=5;
console.log(`PASS: ${checks} whitespace and grading checks (both input and answer key, choice, matching, labels, negative and decimal safeguards).`);
