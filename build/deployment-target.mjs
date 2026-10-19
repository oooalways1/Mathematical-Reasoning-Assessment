const productionId='0204db2f-5e94-49fa-b102-c2dadc48ace1';
export function deploymentTarget(environment,command){
  const preview=environment.NUMERACY_DEPLOY_TARGET==='preview';
  if(command==='build'&&environment.WORKERS_CI_BRANCH&&environment.WORKERS_CI_BRANCH!=='main'&&!preview)throw Error('Preview deployment blocked: use a separate Worker, D1 database and secrets.');
  if(!preview)return {preview:false,name:'math-literacy',databaseName:'numeracy-db',databaseId:productionId};
  const databaseId=environment.NUMERACY_PREVIEW_DATABASE_ID;
  if(!databaseId||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(databaseId)||[productionId,'00000000-0000-4000-8000-000000000000'].includes(databaseId.toLowerCase()))throw Error('Preview requires an isolated D1 database ID; production and placeholder IDs are forbidden.');
  return {preview:true,name:'math-literacy-validation',databaseName:'numeracy-validation-db',databaseId};
}
