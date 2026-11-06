const { test } = require('node:test');
const assert = require('node:assert/strict');

test('a failed source preserves previous records and their last successful timestamp', async () => {
  const {chooseSourceSnapshot} = await import('../../scripts/source-utils.mjs');
  const prior=[{source_id:'old'}], partial=[{source_id:'partial'}];
  const result=chooseSourceSnapshot(prior,partial,[{error:'HTTP 503'}],{previousAt:'2026-01-01',now:'2026-02-01'});
  assert.deepEqual(result.records,prior);
  assert.equal(result.health.state,'stale');
  assert.equal(result.health.last_success_at,'2026-01-01');
  assert.equal(result.health.last_attempt_at,'2026-02-01');
  assert.deepEqual(chooseSourceSnapshot(prior,[],[]).records,[]);
});
test('transient source failures are retried; authorization failures are not', async () => {
  const {fetchJson}=await import('../../scripts/source-utils.mjs');
  let calls=0;
  const fetchImpl=async()=>{calls++;return calls<3?new Response('',{status:503}):Response.json({ok:true});};
  assert.deepEqual(await fetchJson('https://example.invalid',{}, {fetchImpl,wait:async()=>{}}),{ok:true});
  assert.equal(calls,3);
  calls=0;
  await assert.rejects(()=>fetchJson('https://example.invalid',{}, {fetchImpl:async()=>{calls++;return new Response('',{status:403});},wait:async()=>{}}),/403/);
  assert.equal(calls,1);
});
test('federal searches advance offsets and reject a non-advancing API', async () => {
  const {searchOpportunities}=await import('../../scripts/refresh-grants.mjs');
  const offsets=[];
  const result=await searchOpportunities({keyword:'correctional education'},async(_url,init)=>{
    const q=JSON.parse(init.body);offsets.push(q.startRecordNum);
    return {errorcode:0,data:{hitCount:51,oppHits:Array.from({length:q.startRecordNum===0?50:1},(_,i)=>({id:String(q.startRecordNum+i)}))}};
  });
  assert.equal(result.length,51); assert.deepEqual(offsets,[0,50]);
  await assert.rejects(()=>searchOpportunities({cfda:'16.738'},async()=>({errorcode:0,data:{hitCount:100,oppHits:[{id:'same'}]}})),/did not advance/);
});
test('unexpected search response is an error, never an authoritative empty result', async () => {
  const {searchOpportunities}=await import('../../scripts/refresh-grants.mjs');
  await assert.rejects(()=>searchOpportunities({keyword:'reentry'},async()=>({errorcode:0,data:{}})),/unexpected/);
});
test('federal detail hydration retains source applicant rules and reports missing detail failures',async()=>{
  const {hydrateOpportunity}=await import('../../scripts/refresh-grants.mjs');
  const record=await hydrateOpportunity({source_id:'123'},async()=>({errorcode:0,data:{synopsis:{synopsisDesc:'Correctional education.',applicantTypes:[{description:'State governments'},{id:'unknown'},'Public institutions'],applicantEligibilityDesc:'Read section 2 for applicant restrictions.'}}}));
  assert.deepEqual(record.applicant_types,['State governments','Public institutions']);
  assert.equal(record.applicant_eligibility,'Read section 2 for applicant restrictions.');
  const failed=await hydrateOpportunity({source_id:'123'},async()=>{throw new Error('HTTP 503');});
  assert.equal(failed.detail_error,'HTTP 503');
});
test('Grants.gov current search fields retain agency and real ALNs',async()=>{
 const {normalize}=await import('../../scripts/refresh-grants.mjs');const record=normalize({id:'123',title:'Workforce',agency:'Employment and Training Administration',cfdaList:['17.270'],oppStatus:'posted'});
 assert.equal(record.agency,'Employment and Training Administration');assert.equal(record.cfda,'17.270');assert.equal(record.source_kind,'workforce');
});
