import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
const journal=JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8'));
for(const row of journal.entries)sql.exec(readFileSync('drizzle/'+row.tag+'.sql','utf8'));
function prepare(query,values=[]){return {query,values,bind(...v){return prepare(query,v);},async first(){return sql.prepare(query).get(...values)??null;},async all(){return {results:sql.prepare(query).all(...values)};},async run(){return {meta:{changes:Number(sql.prepare(query).run(...values).changes)}};}};}
globalThis.evaluationTestEnv={DB:{prepare,async batch(items){sql.exec('BEGIN');try{const rows=[];for(const item of items)rows.push(await item.run());sql.exec('COMMIT');return rows;}catch(e){sql.exec('ROLLBACK');throw e;}}},SESSION_SECRET:'evaluation-fixture-key',TEACHER_PASSWORD:'fixture-teacher'};
const bundle=await build({stdin:{contents:`export * as admin from './app/api/admin/evaluations/route';export * as status from './app/api/diagnosis/status/route';export * as diagnosis from './app/api/diagnosis/route';export * as learning from './app/api/learning/route';export * as auth from './app/api/_lib';export * as models from './lib/evaluations';export * as data from './app/api/learning/data';export * as forms from './app/api/_evaluations';export * as scan from './lib/scan-answers';export * as examples from './lib/evaluation-examples';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',external:['pdfjs-dist','tesseract.js'],plugins:[{name:'test-env',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env=globalThis.evaluationTestEnv;'}));}}]});
// Scan imports stay lazy. None of the tests use OCR or make external requests.
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
globalThis.fetch=()=>{throw new Error('Unexpected network access');};
const old=api.models.templateEvaluation(2);for(const item of old.items)item.answers=[item.type==='choice'?'1':'5'];
sql.prepare('INSERT INTO diagnosis_keys (grade,answers,version,updated_at) VALUES (?,?,?,?)').run(2,JSON.stringify(Object.fromEntries(old.items.map(i=>[i.id,i.answers]))),'legacy-key-version','2026-10-15T01:00:00Z');
for(const [id,grade]of [['student-a',1],['student-b',2]])sql.prepare('INSERT INTO students (id,name,grade,classroom) VALUES (?,?,?,?)').run(id,'검증 학생',grade,'1');
const teacher=await api.auth.createTeacherSession('fixture-teacher'),student=await api.auth.createStudentSession('student-a');
const origin='https://evaluations.test';
function request(path,method='GET',body,role='teacher',site=origin){return new Request(origin+path,{method,headers:{Origin:site,'Content-Type':'application/json',...(role==='teacher'?{Cookie:'teacher_session='+teacher}:role==='student'?{Cookie:'student_session='+student}:{})},...(body?{body:JSON.stringify(body)}:{})});}
const detail=async r=>{const d=await r.json();assert.ok(r.ok,JSON.stringify(d));return d;};
assert.equal((await api.admin.GET(request('/api/admin/evaluations','GET',null,'guest'))).status,401);
assert.equal((await api.admin.POST(request('/api/admin/evaluations','POST',{},'student'))).status,401);
assert.equal((await api.admin.POST(request('/api/admin/evaluations','POST',{},'teacher','https://other.test'))).status,403);
const seeded=(await detail(await api.admin.GET(request('/api/admin/evaluations')))).evaluations;assert.equal(seeded.length,3);assert.equal(seeded.find(f=>f.grade===2).version,'legacy-key-version');assert.equal(seeded.find(f=>f.grade===2).status,'active');assert.equal(seeded.find(f=>f.grade===1).status,'draft');
const bothSessions=new Request(origin+'/api/diagnosis/status?formId=legacy-g2',{headers:{Cookie:'teacher_session='+teacher+'; student_session='+student}});assert.equal((await detail(await api.status.GET(bothSessions))).evaluations[0].grade,2);
const definition={title:'1차 진단',code:'A형',grade:1,items:[{id:'q1',number:1,topic:'수의 합',domain:'수와 연산',type:'short',choiceCount:4,answers:['2'],guidance:'수를 차례로 세어 보세요.'},{id:'q2',number:2,topic:'다섯 번째 보기',domain:'도형과 측정',type:'choice',choiceCount:5,answers:['5'],guidance:''}]};
const publish=(def)=>({definition:def,status:'active',confirmed:true});
assert.equal((await api.admin.POST(request('/api/admin/evaluations','POST',{...publish(definition),confirmed:false}))).status,400);
assert.equal((await api.admin.POST(request('/api/admin/evaluations','POST',publish({...definition,items:[{...definition.items[0],answers:[]}]})))).status,400);
const A=(await detail(await api.admin.POST(request('/api/admin/evaluations','POST',publish(definition))))).evaluation;
assert.equal((await api.admin.POST(request('/api/admin/evaluations','POST',publish(definition)))).status,409);
const B=(await detail(await api.admin.POST(request('/api/admin/evaluations','POST',publish({...definition,title:'2차 진단',code:'B형',items:definition.items.map(i=>({...i,answers:[i.id==='q1'?'9':'2']}))}))))).evaluation;
let publicData=await detail(await api.status.GET(request('/api/diagnosis/status','GET',null,'student')));assert.equal(publicData.evaluations.length,2);assert.ok(publicData.evaluations.every(f=>f.grade===1));
for(const forbidden of ['answers','accepted','guidance','practice','standardId'])assert.ok(!JSON.stringify(publicData).includes('"'+forbidden+'"'));
const submit=(form,answers={q1:'2',q2:'⑤'})=>api.diagnosis.POST(request('/api/diagnosis','POST',{formId:form.id,keyVersion:form.version,method:'manual',answers},'student'));
const resultA=await detail(await submit(A));assert.equal(resultA.result.totalScore,100);assert.equal(resultA.result.evaluationCode,'A형');
const resultB=await detail(await submit(B));assert.equal(resultB.result.totalScore,0);
assert.equal((await submit({...B,version:A.version})).status,409);
const grade2=seeded.find(f=>f.grade===2);assert.equal((await submit(grade2)).status,409);
assert.equal((await api.diagnosis.POST(request('/api/diagnosis','POST',{keyVersion:A.version,method:'manual',answers:{q1:'2',q2:'5'}},'student'))).status,409);
// Editing A creates a new immutable revision; the previously graded A remains unchanged.
const changed={...definition,title:'수정한 A형',items:definition.items.map(i=>({...i,answers:[i.id==='q1'?'9':'2']}))};
const edited=(await detail(await api.admin.PUT(request('/api/admin/evaluations','PUT',{...publish(changed),id:A.id,expectedVersion:A.version})))).evaluation;
assert.notEqual(edited.version,A.version);assert.equal((await submit(A)).status,409);assert.equal((await api.admin.PUT(request('/api/admin/evaluations','PUT',{...publish(changed),id:A.id,expectedVersion:A.version}))).status,409);
const history=await api.data.readLearning('student-a',false);assert.equal(history.results.find(r=>r.id===resultA.result.id).totalScore,100);assert.equal(history.results.find(r=>r.id===resultA.result.id).evaluationTitle,'1차 진단');assert.equal(history.results.find(r=>r.id===resultB.result.id).evaluationCode,'B형');
assert.equal(history.results.find(r=>r.id===resultB.result.id).feedback[0].custom,true);assert.equal(history.results.find(r=>r.id===resultB.result.id).feedback[0].skill,undefined);
assert.equal((await api.learning.POST(request('/api/learning','POST',{assessmentId:resultB.result.id,questionId:'q1',answer:'2'},'student'))).status,409);
// Custom practice keeps its own answer/hint/explanation and must not expose answers before an attempt.
const C=(await detail(await api.admin.POST(request('/api/admin/evaluations','POST',publish({...definition,code:'C형',items:[{...definition.items[0],practice:{prompt:'3+3은?',accepted:['6'],hint:'3을 두 번 더해요.',explanation:'3+3=6',version:1}}]}))))).evaluation;
const resultC=await detail(await submit(C,{q1:'1'}));
const before=(await api.data.readLearning('student-a',false)).results.find(r=>r.id===resultC.result.id);assert.deepEqual(before.feedback[0].practice.accepted,[]);
const practiced=await detail(await api.learning.POST(request('/api/learning','POST',{assessmentId:resultC.result.id,questionId:'q1',answer:'6'},'student')));assert.equal(practiced.results.find(r=>r.id===resultC.result.id).progress[0].correct,true);
const archived=(await detail(await api.admin.PUT(request('/api/admin/evaluations','PUT',{definition:edited,id:edited.id,expectedVersion:edited.version,status:'archived'})))).evaluation;assert.equal((await submit(archived)).status,409);
publicData=await detail(await api.status.GET(request('/api/diagnosis/status','GET',null,'student')));assert.ok(!publicData.evaluations.some(f=>f.id===A.id));assert.ok((await api.data.readLearning('student-a',true)).results.some(r=>r.id===resultA.result.id));
// Dynamic scan parser follows the selected form's item IDs and supports 5 choices.
assert.deepEqual(api.scan.parseNumberedAnswers('1: 2\n2: ⑤',1,A.items).answers,{q1:'2',q2:'5'});
assert.equal(Object.keys(api.scan.parseNumberedAnswers('1: 2\n1: 3',1,A.items).answers).length,0);
assert.equal(sql.prepare('SELECT COUNT(*) n FROM evaluation_revisions WHERE form_id=?').get(A.id).n,3);
sql.exec(readFileSync('drizzle/0008_evaluation_versions.sql','utf8'));assert.equal(sql.prepare('SELECT COUNT(*) n FROM assessments').get().n,3);

// Deletion is recoverable, removes student access, and never rewrites historical grading.
assert.equal((await api.admin.DELETE(request('/api/admin/evaluations','DELETE',{id:B.id,expectedVersion:B.version},'student'))).status,401);
assert.equal((await api.admin.DELETE(request('/api/admin/evaluations','DELETE',{id:B.id,expectedVersion:'old-version'}))).status,409);
await detail(await api.admin.DELETE(request('/api/admin/evaluations','DELETE',{id:B.id,expectedVersion:B.version})));
assert.equal((await api.forms.getEvaluation(B.id)).trashed,true);
assert.equal((await submit(B)).status,409);
assert.ok(!(await detail(await api.status.GET(request('/api/diagnosis/status','GET',null,'student')))).evaluations.some(f=>f.id===B.id));
assert.equal((await api.data.readLearning('student-a',false)).results.find(r=>r.id===resultB.result.id).totalScore,0);
assert.ok((await detail(await api.admin.GET(request('/api/admin/evaluations')))).evaluations.find(f=>f.id===B.id).trashed);
assert.equal((await api.admin.PUT(request('/api/admin/evaluations','PUT',{...publish(B),id:B.id,expectedVersion:B.version}))).status,409);
await detail(await api.admin.PATCH(request('/api/admin/evaluations','PATCH',{id:B.id,expectedVersion:B.version})));
const restored=await api.forms.getEvaluation(B.id);assert.equal(restored.trashed,false);assert.equal(restored.status,'draft');assert.notEqual(restored.version,B.version);
assert.equal((await submit(B)).status,409);
// Matching keys are bijections, order-independent, and cannot reveal their mapping in the public form.
const matching={...definition,title:'연결형 검증',code:'연결 연습',items:[{...definition.items[0],type:'matching',leftOptions:['1+1','2+2','3+3'],rightOptions:['6','2','4'],answers:['1-나,2-다,3-가']}]};
const matched=(await detail(await api.admin.POST(request('/api/admin/evaluations','POST',publish(matching))))).evaluation;
assert.equal((await detail(await submit(matched,{q1:'3-가,1-나,2-다'}))).result.totalScore,100);
assert.equal((await detail(await submit(matched,{q1:'1-나,2-나,3-가'}))).result.totalScore,0);
assert.equal((await detail(await submit(matched,{q1:'1-나'}))).result.totalScore,0);
assert.equal((await api.admin.POST(request('/api/admin/evaluations','POST',publish({...matching,code:'잘못된 연결',items:[{...matching.items[0],answers:['1-나,2-나,3-가']}]})))).status,400);
const matchingPublic=(await detail(await api.status.GET(request('/api/diagnosis/status','GET',null,'student')))).evaluations.find(f=>f.id===matched.id);
assert.deepEqual(matchingPublic.items[0].leftOptions,['1+1','2+2','3+3']);assert.ok(!JSON.stringify(matchingPublic).includes('1-나'));
assert.equal(api.scan.parseNumberedAnswers('1: 3-가,1-나,2-다',1,matched.items).answers.q1,'1-나,2-다,3-가');
// Check examples against independent arithmetic and ensure known test items are never guessed.
for(const grade of [1,2,3])for(const type of ['short','choice','matching'])for(let i=0;i<10;i++){
  const base={id:'sample',number:1,topic:'',domain:'수와 연산',type,choiceCount:i%2?2:5,answers:[],guidance:''};
  const item=api.examples.exampleItem(grade,base,i);api.models.validateEvaluation({title:'예시',code:'예시',grade,items:[item]},true);
  if(type==='matching'){const connections=new Map(item.answers[0].split(',').map(s=>s.split('-')));for(let n=0;n<item.leftOptions.length;n++){const [a,b]=item.leftOptions[n].split('+').map(Number);const right=api.models.MATCH_LABELS.indexOf(connections.get(String(n+1)));assert.equal(Number(item.rightOptions[right]),a+b);}}
  else{const [,a,b]=item.topic.match(/(\d+)\+(\d+)/);const expected=Number(a)+Number(b);if(type==='short')assert.equal(Number(item.answers[0]),expected);else{const number=Number(item.answers[0]);const found=item.topic.match(new RegExp(number+'\\) (-?\\d+)'));assert.equal(Number(found[1]),expected);}}
  const [,p,q]=item.practice.prompt.match(/(\d+)\+(\d+)/);assert.equal(Number(item.practice.accepted[0]),Number(p)+Number(q));
}
const known={...definition.items[0],answers:[]},blank={...known,id:'blank',number:2,topic:'',guidance:'',standardId:undefined};
const fill=api.examples.fillBlankExamples({title:'',code:'',grade:1,items:[known,blank]});assert.equal(fill.filled,1);assert.deepEqual(fill.definition.items[0],known);assert.equal(fill.definition.items[1].example,true);assert.ok(fill.definition.title&&fill.definition.code);
sql.exec(readFileSync('drizzle/0009_evaluation_trash.sql','utf8'));

console.log('PASS: evaluation versions, recoverable deletion and restoration, preserved history, matching grading and privacy, dynamic scan parsing, independently checked examples, non-destructive blank filling');
