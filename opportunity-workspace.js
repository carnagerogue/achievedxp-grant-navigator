const IMPORT_STORAGE_KEY = 'achievedxp_agency_opportunities_v1';
let importedOpportunities = [];
let pendingOpportunityImport = [];
try {
  const stored = JSON.parse(localStorage.getItem(IMPORT_STORAGE_KEY) || '[]');
  if (stored.length) importedOpportunities = OpportunityTools.normalizeImport(stored);
} catch (_) { /* Corrupt imports never replace the public source feed. */ }

function allOpportunities() { return [...LIVE_FEED.opportunities, ...importedOpportunities]; }
function previewOpportunityImport(records) {
  const host = document.getElementById('importPreview');
  pendingOpportunityImport = [];
  document.getElementById('confirmOpportunityImport').disabled = true;
  try {
    const normalized = OpportunityTools.normalizeImport(records);
    const existing = new Map(importedOpportunities.map(o=>[o.source_id,o]));
    for (const row of normalized) {
      if (existing.has(row.source_id) && existing.get(row.source_id).source_url !== row.source_url) throw new Error('Source ID ' + row.source_id + ' is already used for a different URL. Use a different ID.');
      const duplicate = importedOpportunities.find(o=>o.source_url===row.source_url && o.source_id!==row.source_id);
      if (duplicate) throw new Error('This source URL is already saved as ' + duplicate.source_id + '. Use that ID to update the record.');
      existing.set(row.source_id, row);
    }
    if (existing.size > 100) throw new Error('This browser can hold up to 100 agency-added opportunities. Remove an older entry first.');
    pendingOpportunityImport = normalized;
    host.replaceChildren();
    normalized.forEach(row=>{
      const p=document.createElement('p');
      p.textContent=row.title+' · '+row.source_kind+' · '+GrantCore.opportunityStatus(row)+' · '+(row.close_date || 'Deadline unknown')+(importedOpportunities.some(o=>o.source_id===row.source_id)?' · updates saved record':'');
      const a=document.createElement('a');a.href=row.source_url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=' Review official source';p.appendChild(a);host.appendChild(p);
    });
    document.getElementById('confirmOpportunityImport').disabled = false;
  } catch(error) { host.textContent = error.message; }
}
function previewOpportunityForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  previewOpportunityImport([{...data, source_id:data.source_id || crypto.randomUUID(), states:data.states.trim()?data.states.toUpperCase().split(/[\s,]+/).filter(Boolean):[], applicant_types:data.applicant_types?[data.applicant_types]:[]}]);
}
async function previewOpportunityFile(input) {
  try {
    const file=input.files[0]; if(!file)return;
    if(file.size>2_000_000)throw new Error('Choose a JSON file smaller than 2 MB.');
    previewOpportunityImport(JSON.parse(await file.text()));
  } catch(error) { pendingOpportunityImport=[];document.getElementById('confirmOpportunityImport').disabled=true;document.getElementById('importPreview').textContent='Could not read import: '+error.message; }
  finally { input.value=''; }
}
function confirmOpportunityImport() {
  if(!pendingOpportunityImport.length)return;
  const next=new Map(importedOpportunities.map(o=>[o.source_id,o]));
  pendingOpportunityImport.forEach(o=>next.set(o.source_id,o));
  try { localStorage.setItem(IMPORT_STORAGE_KEY,JSON.stringify([...next.values()])); }
  catch(_) { document.getElementById('importPreview').textContent='Browser storage is unavailable. The import was not saved.';return; }
  importedOpportunities=[...next.values()];pendingOpportunityImport=[];
  document.getElementById('importPreview').textContent='Saved in this browser. These are agency-entered records; eligibility remains unconfirmed.';
  document.getElementById('confirmOpportunityImport').disabled=true;
  document.getElementById('opportunityStatus').value='all';
  document.getElementById('opportunitySource').value='all';
  document.getElementById('opportunitySearch').value='';
  document.getElementById('opportunityRelevant').checked=false;
  renderOpportunityExplorer();renderStack();renderNarrative();renderImportedOpportunities();
}
function removeImportedOpportunity(id) {
  const next=importedOpportunities.filter(o=>o.source_id!==id);
  try { localStorage.setItem(IMPORT_STORAGE_KEY,JSON.stringify(next)); }
  catch(_) { showToast('Browser storage is unavailable. The record was not removed.');return; }
  importedOpportunities=next;
  renderOpportunityExplorer();renderStack();renderNarrative();renderImportedOpportunities();
  showToast('Agency-added record removed. Any saved shortlist reference is retained.');
}
function renderImportedOpportunities() {
  const host=document.getElementById('importedOpportunityList');if(!host)return;host.replaceChildren();
  importedOpportunities.forEach(o=>{
    const row=document.createElement('div');row.className='imported-record';
    const text=document.createElement('span');text.textContent=o.title+' · ID: '+o.source_id;
    const button=document.createElement('button');button.type='button';button.className='btn btn-secondary btn-sm';button.textContent='Remove local record';button.onclick=()=>removeImportedOpportunity(o.source_id);
    row.append(text,button);host.appendChild(row);
  });
}
function openQualification(id) {
  toggleReportView('full','stack');
  document.getElementById('qualificationOpportunity').value=id;
  renderQualification();
  document.getElementById('qualificationCard').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderQualification() {
  const select=document.getElementById('qualificationOpportunity');if(!select)return;
  const selected=select.value,items=selectedPlanItems().filter(i=>i.record);
  select.replaceChildren();
  items.forEach(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=item.name;select.appendChild(option);});
  if(items.some(i=>i.id===selected))select.value=selected;
  const item=items.find(i=>i.id===select.value);
  document.getElementById('qualificationFields').hidden=!item;
  document.getElementById('qualificationEmpty').hidden=!!item;
  select.disabled=!item;
  if(!item)return;
  const review=OpportunityTools.cleanReview(state.opportunityReviews?.[item.id]);
  for(const [id,value] of Object.entries({reviewRoute:review.route,reviewStage:review.stage,reviewPartner:review.partner,reviewOwner:review.owner,reviewNextAction:review.nextAction,reviewDue:review.internalDueDate||''}))document.getElementById(id).value=value;
  const host=document.getElementById('qualificationRequirements');host.replaceChildren();
  OpportunityTools.REVIEW_FIELDS.forEach(([id,label,hint])=>{
    const row=document.createElement('fieldset');row.className='requirement-row';
    row.innerHTML=`<legend>${escapeHtml(label)}</legend><p class="small muted">${escapeHtml(hint)}</p><label>Agency assessment<select class="text-input" data-review-status="${id}"><option value="unknown">Not yet confirmed</option><option value="met">Agency assessed as met</option><option value="not_met">Agency identified a blocker</option></select></label><label>Quote and section/page reference<textarea class="text-input" rows="3" maxlength="2000" data-review-evidence="${id}"></textarea></label><label>Official source URL<input class="text-input" type="url" maxlength="2000" data-review-url="${id}"></label>`;
    row.querySelector('select').value=review.requirements[id].status;
    row.querySelector('textarea').value=review.requirements[id].evidence;
    row.querySelector('input').value=review.requirements[id].url||item.url||'';
    host.appendChild(row);
  });
  const summary=OpportunityTools.reviewSummary(review);
  document.getElementById('qualificationStatus').textContent=summary.label+' · '+summary.known+'/'+summary.total+' requirements have an agency assessment and cited evidence · '+summary.blockers+' blockers. This is your team’s review, not a funder decision.';
}
function saveQualification(event) {
  event.preventDefault();
  const id=document.getElementById('qualificationOpportunity').value;if(!id)return;
  const requirements=Object.fromEntries(OpportunityTools.REVIEW_FIELDS.map(([key])=>[key,{status:document.querySelector(`[data-review-status="${key}"]`).value,evidence:document.querySelector(`[data-review-evidence="${key}"]`).value,url:document.querySelector(`[data-review-url="${key}"]`).value}]));
  const missing=Object.values(requirements).some(r=>r.status!=='unknown'&&(!r.evidence.trim()||!GrantCore.safeUrl(r.url)));
  if(missing){document.getElementById('qualificationStatus').textContent='Add a source quote and an HTTPS citation for each assessed requirement, or leave its assessment unconfirmed.';return;}
  state.opportunityReviews ||= {};
  state.opportunityReviews[id]=OpportunityTools.cleanReview({route:document.getElementById('reviewRoute').value,stage:document.getElementById('reviewStage').value,partner:document.getElementById('reviewPartner').value,owner:document.getElementById('reviewOwner').value,nextAction:document.getElementById('reviewNextAction').value,internalDueDate:document.getElementById('reviewDue').value,requirements});
  const saved=savePlan();renderOpportunityExplorer();renderStack();renderNarrative();
  showToast(saved?'Opportunity review saved':'Review changed; export your plan because browser storage is unavailable');
}
