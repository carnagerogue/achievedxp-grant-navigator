const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const quote='State governments are eligible applicants for correctional education activities.';
const opportunity={source:'grants_gov',source_id:'123',title:'Corrections education',status:'posted',source_url:'https://www.grants.gov/example',synopsis:quote,close_date:'12/01/2099'};
const feed={opportunities:[opportunity],last_synced_at:'2026-11-04T07:00:00Z'};
const request={task:'eligibility',opportunity_key:'opportunity:grants_gov:123',profile:{agencyName:'Test DOC',stateCode:'MI',contactEmail:'private@example.invalid'},budget:{gapCost:12345,gapNotes:'private notes'},include_budget:false};
const output=()=>({summary:'Review the full notice before deciding eligibility.',route:'direct_review',findings:[{requirement:'Applicant type',assessment:'supported',explanation:'The supplied text includes state governments. Confirm the DOC lead and remaining requirements.',evidence:[{source_id:'S1',quote}]}],next_actions:['Read the complete current notice.'],draft_sections:[],missing_information:['Confirm match requirements.']});
const response=analysis=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(analysis)}]}]});

test('AI context uses server source records, whitelists agency fields, and requires budget opt-in',async()=>{
  const {prepareAnalysis}=await import('../../server/ai.mjs');
  const prepared=prepareAnalysis({...request,opportunity:{...opportunity,synopsis:'Untrusted replacement'}},feed);
  assert.equal(prepared.evidence.source.synopsis,quote);
  assert.equal(prepared.evidence.agency_budget,undefined);
  assert.ok(!JSON.stringify(prepared.evidence).includes('private@example.invalid'));
  assert.ok(!JSON.stringify(prepared.evidence).includes('private notes'));
  assert.equal(prepareAnalysis({...request,include_budget:true},feed).evidence.agency_budget.total,12345);
  assert.throws(()=>prepareAnalysis({...request,opportunity_key:'missing'},feed),/no longer/);
  assert.throws(()=>prepareAnalysis({...request,notice_excerpt:{text:'Rules',url:'javascript:alert(1)',section:'1'}},feed),/HTTPS/);
});
test('AI citations must quote an existing evidence source and cannot manufacture support',async()=>{
  const {prepareAnalysis,validateAnalysis}=await import('../../server/ai.mjs');
  const refs=prepareAnalysis(request,feed).references;
  assert.equal(validateAnalysis(output(),refs).findings[0].evidence[0].url,opportunity.source_url);
  const wrong=output();wrong.findings[0].evidence[0].quote='All DOC agencies automatically qualify.';
  assert.throws(()=>validateAnalysis(wrong,refs),/could not be verified/);
  const invented=output();invented.findings[0].evidence[0].source_id='S2';
  assert.throws(()=>validateAnalysis(invented,refs),/could not be verified/);
  const unsupported=output();unsupported.findings[0].evidence=[];
  assert.throws(()=>validateAnalysis(unsupported,refs),/could not be verified/);
  const priced=output();priced.summary='Nucleos costs $800 per learner.';
  assert.throws(()=>validateAnalysis(priced,refs),/could not be verified/);
});
test('OpenAI requests are server authenticated, structured, not stored, and validated before release',async()=>{
  const {prepareAnalysis,runAnalysis}=await import('../../server/ai.mjs');
  let sent;
  const result=await runAnalysis(prepareAnalysis(request,feed),{apiKey:'test-provider-key',model:'configured-test-model',fetchImpl:async(url,init)=>{sent={url,headers:init.headers,body:JSON.parse(init.body)};return response(output());}});
  assert.equal(sent.url,'https://api.openai.com/v1/responses');assert.equal(sent.headers.Authorization,'Bearer test-provider-key');
  assert.equal(sent.body.store,false);assert.equal(sent.body.text.format.strict,true);assert.equal(sent.body.text.format.type,'json_schema');
  assert.ok(!sent.body.input.includes('contactEmail'));assert.ok(!sent.body.input.includes('gapNotes'));
  assert.equal(result.requires_human_review,true);assert.equal(result.analysis.findings[0].evidence[0].quote,quote);
  assert.ok(!JSON.stringify(result).includes('test-provider-key'));
});
test('provider failures, refusals, and incomplete outputs cannot masquerade as successful analysis',async()=>{
  const {prepareAnalysis,runAnalysis}=await import('../../server/ai.mjs');
  const prepared=prepareAnalysis(request,feed),config={apiKey:'secret-for-test',model:'test'};
  for(const [value,pattern] of [[new Response('',{status:429}),/usage limit/],[Response.json({status:'incomplete'}),/incomplete/],[Response.json({status:'completed',output:[{type:'message',content:[{type:'refusal'}]}]}),/could not analyze/],[Response.json({status:'completed',output:[]}),/not a structured/]]){
    await assert.rejects(()=>runAnalysis(prepared,{...config,fetchImpl:async()=>value}),pattern);
  }
  await assert.rejects(()=>runAnalysis(prepared,{...config,fetchImpl:async()=>{throw new Error('private upstream error');}}),error=>error.status===503&&!error.message.includes('private'));
});

async function invoke(app,{method='POST',url='/api/ai/analyze',body=request,headers={},raw,remoteAddress='127.0.0.1'}={}){
  const req=Readable.from([Buffer.from(raw??JSON.stringify(body))]);req.url=url;req.method=method;req.headers={'content-type':'application/json',...headers};
  req.socket={remoteAddress};
  const response={status:0,headers:{},body:''};
  const res={headersSent:false,writeHead(status,values){response.status=status;response.headers=values;this.headersSent=true;},end(value){response.body=value?value.toString():'';}};
  await app.listeners('request')[0](req,res);return response;
}
test('AI gateway rejects disabled access, cross-origin requests, bad tokens, oversized input, and rate overflow',async()=>{
  const {createApp,aiConfig}=await import('../../server/index.mjs');
  assert.equal(aiConfig({GRANT_AI_KEY:'x',GRANT_AI_MODEL:'test'}).enabled,false);
  assert.equal(aiConfig({GRANT_AI_KEY:'x',GRANT_AI_MODEL:'test',GRANT_AI_ACCESS_TOKEN:'a'.repeat(40),GRANT_AI_ORIGIN:'http://public.example'}).enabled,false);
  const config={enabled:true,apiKey:'server-provider-secret',model:'test',accessToken:'a'.repeat(40),origin:'https://workspace.example'};
  let calls=0;
  const app=createApp({config,serveStatic:false,loadFeed:async()=>feed,maxRequests:1,analyze:async()=>{calls++;return {ok:true};}});
  const headers={origin:config.origin,authorization:'Bearer '+config.accessToken};
  assert.equal((await invoke(createApp({config:{enabled:false},serveStatic:false}))).status,503);
  assert.equal((await invoke(app,{headers:{...headers,origin:'https://evil.example'}})).status,403);
  assert.equal((await invoke(app,{headers:{...headers,authorization:'Bearer bad'}})).status,401);
  assert.equal((await invoke(app,{headers,raw:'x'.repeat(128001)})).status,413);
  assert.equal(calls,0);
  const good=await invoke(app,{headers});assert.equal(good.status,200);assert.equal(good.headers['Cache-Control'],'no-store');
  assert.equal((await invoke(app,{headers})).status,429);assert.equal(calls,1);
  const status=await invoke(app,{method:'GET',url:'/api/ai/status'});
  assert.ok(!status.body.includes(config.apiKey));assert.ok(!status.body.includes(config.accessToken));
});
test('static service never serves server files, credentials, or arbitrary repository paths',async()=>{
  const {createApp}=await import('../../server/index.mjs');
  const app=createApp({config:{enabled:false}});
  for(const url of ['/server/index.mjs','/.env','/package.json','/scripts/refresh-grants.mjs','/assets/../server/ai.mjs'])assert.equal((await invoke(app,{method:'GET',url})).status,404);
  assert.equal((await invoke(app,{method:'GET',url:'/grant-core.js'})).status,200);
  const config=await invoke(app,{method:'GET',url:'/config.js'});assert.equal(config.status,200);assert.match(config.body,/"aiEnabled":false/);
});
test('local development sessions require loopback, the exact host and origin, and an HttpOnly session cookie',async()=>{
  const {createApp,aiConfig}=await import('../../server/index.mjs');
  const env={GRANT_AI_KEY:'test-provider',GRANT_AI_MODEL:'test-model',GRANT_AI_ORIGIN:'http://127.0.0.1:8766'};
  assert.equal(aiConfig(env).enabled,false);
  const config=aiConfig(env,{allowLocalSession:true});assert.equal(config.authMode,'local_session');assert.equal(config.enabled,true);
  let calls=0;
  const app=createApp({config,loadFeed:async()=>feed,analyze:async()=>{calls++;return {ok:true};}});
  const headers={host:'127.0.0.1:8766',origin:env.GRANT_AI_ORIGIN};
  const landing=await invoke(app,{method:'GET',url:'/',headers});
  assert.match(landing.headers['Set-Cookie'],/HttpOnly; SameSite=Strict/);
  const cookie=landing.headers['Set-Cookie'].split(';')[0];
  assert.equal((await invoke(app,{headers})).status,401);
  assert.equal((await invoke(app,{headers:{...headers,cookie,host:'attacker.example'}})).status,401);
  assert.equal((await invoke(app,{headers:{...headers,cookie},remoteAddress:'203.0.113.12'})).status,401);
  assert.equal((await invoke(app,{headers:{...headers,cookie}})).status,200);assert.equal(calls,1);
});
test('AI application review includes the actual draft and aggregate evidence without private or unrelated fields',async()=>{
 const {prepareAnalysis}=await import('../../server/ai.mjs');
 const p=prepareAnalysis({...request,task:'review',proposal:{narrative:'An actual proposal draft.',baseline:'Aggregate completion records.',uses_achievedxp:true,criteria:[{title:'Need',requirement:quote,url:opportunity.source_url,evidence:'Aggregate agency results.'}],contactEmail:'secret@example.test',budget:{price:1000}}},feed);
 assert.equal(p.evidence.application_work.narrative,'An actual proposal draft.');assert.equal(p.evidence.application_work.criteria[0].evidence,'Aggregate agency results.');assert.equal(p.evidence.application_work.uses_achievedxp,true);assert.ok(!JSON.stringify(p.evidence).includes('secret@example'));assert.equal(p.evidence.agency_budget,undefined);
});
test('Pages API preflight permits only the configured origin and never relaxes request authentication',async()=>{
 const {createApp}=await import('../../server/index.mjs');const config={enabled:true,origin:'https://carnagerogue.github.io',accessToken:'a'.repeat(40)};const app=createApp({config,serveStatic:false});
 const allowed=await invoke(app,{method:'OPTIONS',headers:{origin:config.origin}});assert.equal(allowed.status,204);assert.equal(allowed.headers['Access-Control-Allow-Origin'],config.origin);assert.equal(allowed.headers['Access-Control-Allow-Headers'],'Content-Type, Authorization');
 assert.notEqual((await invoke(app,{method:'OPTIONS',headers:{origin:'https://evil.example'}})).status,204);
 assert.equal((await invoke(app,{headers:{origin:config.origin}})).status,401);
});
test('AI-extracted criteria require real source quotes and explicitly quoted weights',async()=>{
 const {validateAnalysis}=await import('../../server/ai.mjs');const q='Statement of need is worth 20 points. Describe the education gap.';const refs={S2:{text:q,url:'https://example.gov/rubric',title:'Scoring'}};
 const r=output();r.findings=[];r.extracted_criteria=[{title:'Statement of need',points:20,evidence:[{source_id:'S2',quote:q}]}];assert.equal(validateAnalysis(r,refs).extracted_criteria[0].points,20);r.extracted_criteria[0].points=90;assert.throws(()=>validateAnalysis(r,refs),/could not be verified/);r.extracted_criteria[0].points=null;r.extracted_criteria[0].evidence=[];assert.throws(()=>validateAnalysis(r,refs),/could not be verified/);
});

test('site-managed AI uses the private server key without a client code and retains origin and daily limits', async () => {
  const {createApp, aiConfig} = await import('../../server/index.mjs');
  const config = aiConfig({GRANT_AI_KEY:'private-provider-key',GRANT_AI_MODEL:'test',GRANT_AI_ORIGIN:'https://carnagerogue.github.io',GRANT_AI_ACCESS_MODE:'site'});
  assert.equal(config.enabled,true);
  assert.equal(config.authMode,'site');
  assert.equal(aiConfig({GRANT_AI_ACCESS_MODE:'site',GRANT_AI_ORIGIN:config.origin,GRANT_AI_MODEL:'test'}).enabled,false);
  let time=0,calls=0;
  const app=createApp({config,serveStatic:false,loadFeed:async()=>feed,now:()=>time,maxRequests:1,maxDailyRequests:2,analyze:async(_,serverConfig)=>{calls++;assert.equal(serverConfig.apiKey,'private-provider-key');return {ok:true};}});
  assert.equal((await invoke(app,{headers:{origin:'https://other.example'}})).status,403);
  assert.equal((await invoke(app)).status,403);
  const headers={origin:config.origin};
  assert.equal((await invoke(app,{headers})).status,200);
  assert.equal((await invoke(app,{headers})).status,429);
  time+=3600001;
  assert.equal((await invoke(app,{headers})).status,200);
  time+=3600001;
  assert.equal((await invoke(app,{headers})).status,429);
  assert.equal(calls,2);
  const status=await invoke(app,{method:'GET',url:'/api/ai/status'});
  assert.equal(JSON.parse(status.body).access,'site');
  assert.ok(!status.body.includes(config.apiKey));
  time+=86400000;
  assert.equal((await invoke(app,{headers})).status,200);
});

test('concurrent validation cannot exceed the last provider allowance', async () => {
  const {createApp}=await import('../../server/index.mjs');
  let calls=0,release;
  const ready=new Promise(resolve=>{release=resolve;});
  const config={enabled:true,authMode:'site',origin:'https://workspace.example'};
  const app=createApp({config,serveStatic:false,maxRequests:1,loadFeed:async()=>{await ready;return feed;},analyze:async()=>{calls++;return {ok:true};}});
  const headers={origin:config.origin};
  const first=invoke(app,{headers}),second=invoke(app,{headers});
  release();
  const responses=await Promise.all([first,second]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,429]);
  assert.equal(calls,1);
});
