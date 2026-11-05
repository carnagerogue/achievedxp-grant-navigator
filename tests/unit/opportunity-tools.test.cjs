const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../../grant-core.js');
const tools=require('../../opportunity-tools.js');
const record={source_id:'MI-2026-ED',title:'Adult education',source_url:'https://www.michigan.gov/example',source_kind:'state',states:['MI'],status:'posted',close_date:'12/01/2099'};

test('agency imports retain unknown fields as unknown and cannot impersonate a feed source',()=>{
  const imported=tools.normalizeImport([{...record,source:'grants_gov',vendorPrice:9999,eligibility:'confirmed'}])[0];
  assert.equal(imported.source,'agency_import');assert.equal(imported.provenance,'agency_entered');
  assert.equal(imported.award_ceiling,null);assert.deepEqual(imported.applicant_types,[]);
  assert.equal(imported.eligibility,undefined);assert.equal(imported.vendorPrice,undefined);
  assert.notEqual(core.opportunityKey(imported),core.opportunityKey({...record,source:'grants_gov'}));
});
test('imports reject unsafe links, impossible deadlines, bad geography, duplicate IDs, and fabricated ceilings',()=>{
  for(const patch of [{source_url:'javascript:alert(1)'},{source_url:'https://user:password@example.com'},{close_date:'02/30/2026'},{states:['XX']},{award_ceiling:'not known'},{source_id:'../server'}])assert.throws(()=>tools.normalizeImport([{...record,...patch}]),/Record 1/);
  assert.throws(()=>tools.normalizeImport([record,record]),/Duplicate/);
  assert.throws(()=>tools.normalizeImport([]),/between 1 and 100/);
});
test('eligibility assessments require source evidence and survive plan validation without implying a funder decision',()=>{
  const review=tools.cleanReview({route:'partner',stage:'prepare',internalDueDate:'02/30/2026',requirements:{applicant:{status:'met',evidence:'Eligible entities are nonprofit organizations.',url:'https://www.dgliteracy.org/'},match:{status:'met'},activities:{status:'not_met',evidence:'No equipment funding.',url:'javascript:alert(1)'}}});
  assert.equal(review.requirements.applicant.status,'met');assert.equal(review.requirements.match.status,'unknown');assert.equal(review.requirements.activities.status,'unknown');assert.equal(review.internalDueDate,null);
  const key='opportunity:agency_import:test';
  assert.deepEqual(core.cleanPlan({opportunityReviews:{[key]:review}}).opportunityReviews[key],review);
  assert.equal(tools.reviewSummary(review).known,1);assert.match(tools.reviewSummary(review).label,/Agency reviewing partner/);
});
