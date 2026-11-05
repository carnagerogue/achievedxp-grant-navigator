const { test, expect } = require('@playwright/test');
const profile = { agencyType:'state_doc',stateCode:'MI',populationSize:'md',goals:['ged','reentry'],infra:['lms'],budget:'md',grantExp:'past',timeline:'now',existingPartners:['university'],existingPartnersOther:'',agencyName:'Test DOC',programName:'Education' };
const fixtures = [
  {source:'grants_gov',source_id:'federal-1',source_kind:'federal',title:'Correctional education and reentry',status:'posted',close_date:'12/01/2099',source_url:'https://www.grants.gov/example',award_ceiling:500000},
  {source:'state_portal',source_id:'state-1',source_kind:'state',title:'Michigan adult education',states:['MI'],status:'posted',close_date:'12/02/2099',source_url:'https://www.michigan.gov/example'},
  {source:'state_portal',source_id:'state-2',source_kind:'state',title:'California adult education',states:['CA'],status:'posted',source_url:'https://www.ca.gov/example'},
  {source:'workforce_board',source_id:'workforce-1',source_kind:'workforce',title:'Reentry workforce partnership',states:['MI'],status:'posted',close_date:'12/03/2099',source_url:'https://www.dol.gov/example'},
  {source:'corporate_funder',source_id:'corporate-1',source_kind:'corporate',title:'Adult literacy partnerships',status:'posted',close_date:'12/04/2099',applicant_types:['Nonprofit partner; direct DOC eligibility requires review'],source_url:'https://www.dgliteracy.org/example'},
];
async function openPlan(page, {records=fixtures,plan}={}) {
  await page.route('**/opportunities.json*',r=>r.fulfill({json:{opportunities:records,awards:[],foundations:[],saa:null,last_synced_at:'2026-11-04T07:00:00Z',errors:[]}}));
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
  await page.route('https://formsubmit.co/**',r=>r.fulfill({json:{success:true}}));
  await page.goto('/legacy.html#plan='+Buffer.from(JSON.stringify({...profile,...(plan?{plan}: {})})).toString('base64url'));
  await expect(page.locator('#results')).toHaveClass(/view-summary/);
  await page.getByRole('button',{name:'Discover opportunities'}).click();
  await expect(page.locator('#opportunityList article')).toHaveCount(4);
}

test('discovery separates federal, state, workforce, and corporate records and filters geography', async ({page}) => {
  await openPlan(page);
  await expect(page.locator('#opportunityList')).not.toContainText('California');
  for (const category of ['federal','state','workforce','corporate']) {
    await page.selectOption('#opportunitySource',category);
    await expect(page.locator('#opportunityList article')).toHaveCount(1);
  }
  await expect(page.locator('#opportunityList')).toContainText('Nonprofit partner');
  await expect(page.locator('#opportunityList')).toContainText('DOC eligibility: unconfirmed');
  await page.fill('#opportunitySearch','no matching opportunity');
  await expect(page.locator('#opportunityList')).toContainText('No source records match');
});

test('shortlist, program scope, checklist, and agency budget persist without vendor prices', async ({page}) => {
  await openPlan(page);
  await page.locator('#opportunityList article').first().getByRole('button',{name:'Save opportunity'}).click();
  await page.getByRole('button',{name:'Saved Shortlist'}).click();
  await expect(page.locator('#stackLayers')).toContainText('Correctional education and reentry');
  await expect(page.locator('#stackTotal')).toHaveText('1 saved');
  await page.getByRole('button',{name:'Agency Budget'}).click();
  await expect(page.locator('#gapCost')).toHaveValue('0');
  await page.fill('#gapCost','200000'); await page.fill('#gapHave','50000');
  await expect(page.locator('#gapAmount')).toHaveText('$150,000');
  await page.getByRole('button',{name:'Application Checklist'}).click();
  await page.locator('[data-check="budget"]').check();
  await expect(page.locator('#scoreVal')).toHaveText('13%');
  await page.reload();
  await expect(page.locator('#tldrFundingAmount')).toHaveText('1');
  await expect(page.locator('#tldrScoreToday')).toHaveText('13');
  await page.getByRole('button',{name:'Explore the full plan'}).click();
  await page.getByRole('button',{name:'Agency Budget'}).click();
  await expect(page.locator('#gapCost')).toHaveValue('200000');
  await expect(page.locator('#gapHave')).toHaveValue('50000');
  await expect(page.locator('#results')).not.toContainText('With AchieveDXP');
  await expect(page.locator('#results')).not.toContainText('per learner / year');
  await page.getByRole('button',{name:'Saved Shortlist'}).click();
  await page.locator('#stackLayers').getByRole('button',{name:'Remove',exact:true}).click();
  await expect(page.locator('#stackTotal')).toHaveText('0 saved');
});

test('callback failure is visible and a retry requires acknowledged success', async ({page}) => {
  await openPlan(page);
  let attempts=0;
  await page.route('https://formsubmit.co/**', r => { attempts++; return r.fulfill({status:attempts===1?503:200,json:{success:attempts>1}}); });
  await page.getByRole('button',{name:'Back to summary'}).click();
  await page.locator('.tldr-cta').getByRole('button',{name:'Request a call'}).click();
  await page.fill('#cmName','Test User');await page.fill('#cmRole','Education director');await page.fill('#cmEmail','test@example.invalid');
  await page.click('#cmSubmit');
  await expect(page.locator('#cmError')).toContainText('not delivered');
  await expect(page.locator('#cmSuccess')).toBeHidden();
  await expect(page.locator('#cmName')).toHaveValue('Test User');
  await page.click('#cmSubmit');
  await expect(page.locator('#cmSuccess')).toBeVisible();
  expect(attempts).toBe(2);
});

test('calendar exports only actual closing dates of saved open opportunities', async ({page}) => {
  await openPlan(page);
  await page.locator('#opportunityList article').first().getByRole('button',{name:'Save opportunity'}).click();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export saved source closing dates'}).click();
  const download=await downloadPromise;
  const fs=require('node:fs/promises');
  const calendar=await fs.readFile(await download.path(),'utf8');
  expect(calendar).toContain('DTSTART;VALUE=DATE:20991201');
  expect(calendar).toContain('Confirm the exact submission time');
  expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  expect(calendar).not.toContain('TRIGGER:-P30D');
});

test('plan export includes user-entered figures and source references, not contact fields', async ({page}) => {
  await openPlan(page,{plan:{gapCost:12345,gapHave:2000,applicationChecks:{eligibility:true}}});
  await page.getByRole('button',{name:'Back to summary'}).click();
  const promise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export plan',exact:true}).click();
  const download=await promise;
  const payload=JSON.parse(await require('node:fs/promises').readFile(await download.path(),'utf8'));
  expect(payload.plan.gapCost).toBe(12345);
  expect(payload.plan.gapHave).toBe(2000);
  expect(payload.plan).not.toHaveProperty('contactEmail');
  expect(payload.narrative).toContain('WORKING DRAFT');
});

test('an agency can create and resume a plan without contact details or a lead submission', async ({page}) => {
  let submissions=0;
  await page.route('https://formsubmit.co/**',r=>{submissions++;return r.fulfill({json:{success:true}});});
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
  await page.goto('/legacy.html');
  await page.locator('.hero').getByRole('button',{name:'Launch the Navigator'}).click();
  await page.evaluate(p=>{Object.assign(state,p,{step:10});showStep(10);},profile);
  await page.fill('#agencyName','Anonymous Planning DOC');
  await page.getByRole('button',{name:'See my report'}).click();
  await expect(page.locator('#results')).toHaveClass(/view-summary/);
  await page.waitForLoadState('networkidle');
  expect(submissions).toBe(0);
  await page.goto('/legacy.html');
  await page.getByRole('button',{name:'Open saved plan'}).click();
  await expect(page.locator('#reportTitle')).toContainText('Anonymous Planning DOC');
  expect(submissions).toBe(0);
});

test('malformed shared profiles do not crash the app', async ({page}) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
  await page.goto('/legacy.html#plan='+Buffer.from(JSON.stringify({...profile,agencyName:{invalid:true},goals:'invalid'})).toString('base64url'));
  await expect(page.locator('.hero h1')).toContainText('Find the grants');
  await expect(page.locator('#results')).not.toHaveClass(/active/);
  expect(errors).toEqual([]);
});

test('AI evidence briefs require a saved opportunity, support source citations, and make budgets opt-in', async ({page}) => {
  await openPlan(page,{plan:{gapCost:12345,gapHave:2000,gapNotes:'Confidential budget note'}});
  await page.getByRole('button',{name:'Proposal Workbench'}).click();
  await expect(page.getByRole('button',{name:'Download AI brief'})).toBeDisabled();
  await expect(page.locator('#aiBriefStatus')).toContainText('Save a specific opportunity');
  await page.locator('.tab[data-tab="grants"]').click();
  await page.locator('#opportunityList article').first().getByRole('button',{name:'Save opportunity'}).click();
  await page.getByRole('button',{name:'Proposal Workbench'}).click();
  await expect(page.locator('#aiBriefPreview')).toHaveValue(/"citation": "S1"/);
  await expect(page.locator('#aiBriefPreview')).not.toHaveValue(/agency_budget/);
  await page.selectOption('#aiBriefTask','narrative');
  await expect(page.locator('#aiBriefPreview')).toHaveValue(/Create a proposal outline/);
  await page.check('#aiBriefBudget');
  const promise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download AI brief'}).click();
  const download=await promise;
  const brief=await require('node:fs/promises').readFile(await download.path(),'utf8');
  expect(brief).toContain('https://www.grants.gov/example');
  expect(brief).toContain('"total": 12345');
  expect(brief).not.toContain('Confidential budget note');
  expect(brief).not.toContain('contactEmail');
  await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Clipboard blocked');}}});document.execCommand=()=>false;});
  await page.getByRole('button',{name:'Copy AI brief'}).click();
  await expect(page.locator('#toast')).toContainText('Clipboard unavailable');
});
