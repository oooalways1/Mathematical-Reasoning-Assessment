export type ClassScope={schoolId:string;grade:number;classroom:string};
export function classroomKey(value:string){return value.normalize('NFKC').replace(/\s+/g,'').replace(/반$/,'').toLowerCase();}
export function validateClassScopes(value:unknown,schools:string[]):ClassScope[]{
 if(!Array.isArray(value)||value.length>30)throw Error('담당 학급은 최대 30개까지 지정하세요.');
 const scopes=value.map(raw=>{const v=raw as ClassScope;if(!v||!schools.includes(v.schoolId)||![1,2,3].includes(v.grade)||typeof v.classroom!=='string')throw Error('담당 학교·학년·반을 확인하세요.');const classroom=classroomKey(v.classroom);if(!classroom||classroom.length>30)throw Error('반을 입력하세요.');return{schoolId:v.schoolId,grade:v.grade,classroom};});
 return [...new Map(scopes.map(s=>[JSON.stringify(s),s])).values()];
}
export function classroomSql(expression:string){let clean=expression;for(const cp of [9,10,11,12,13,32,160,5760,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8232,8233,8239,8287,12288,65279])clean=`replace(${clean},char(${cp}),'')`;clean=`lower(${clean})`;for(let i=0;i<10;i++)clean=`replace(${clean},'${String.fromCharCode(0xff10+i)}','${i}')`;return `(CASE WHEN substr(${clean},-1)='반' THEN substr(${clean},1,length(${clean})-1) ELSE ${clean} END)`;}
