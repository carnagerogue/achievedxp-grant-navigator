// Agency-owned planning state. Public source records and user-entered budgets only.
const PLAN_STORAGE_KEY = 'achievedxp_grant_plans_v2';

function planIdentity() {
  return JSON.stringify([state.agencyName.trim().toLowerCase(), state.stateCode, state.programName.trim().toLowerCase()]);
}
function currentPlan() {
  return GrantCore.cleanPlan({ ...state, programIds: [...state.programSelections] });
}
function applySavedPlan(plan) {
  const clean = GrantCore.cleanPlan(plan);
  Object.assign(state, clean);
  state.programSelections = new Set(clean.programIds);
  state._planInitialized = true;
}
function restorePlan() {
  let local = null;
  try { local = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || '{}')[planIdentity()]?.plan; } catch (_) {}
  if (state._sharedPlanData) {
    applySavedPlan({...state._sharedPlanData, opportunityReviews:local?.opportunityReviews || {}});
    state._sharedPlanData = null;
    return;
  }
  try {
    const plans = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || '{}');
    if (plans[planIdentity()]) applySavedPlan(plans[planIdentity()].plan);
  } catch (_) { /* A damaged local copy must not prevent a new plan. */ }
}
function savePlan() {
  let saved = false;
  try {
    let plans = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || '{}');
    if (!plans || typeof plans !== 'object' || Array.isArray(plans)) plans = {};
    const profile = {};
    SHARE_FIELDS.forEach(k => { profile[k] = state[k]; });
    plans[planIdentity()] = { profile, plan: currentPlan(), updatedAt: new Date().toISOString() };
    const recent = Object.entries(plans).sort((a, b) => String(b[1].updatedAt).localeCompare(String(a[1].updatedAt))).slice(0, 20);
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(Object.fromEntries(recent)));
    saved = true;
  } catch (_) { /* Surface storage failure; do not pretend the save succeeded. */ }
  const status = document.getElementById('planSaveStatus');
  if (status) status.textContent = saved ? 'Saved in this browser · no account required' : 'Browser storage unavailable · export your plan to keep a copy';
  encodePlanToHash();
  return saved;
}
function selectedPlanItems() {
  return state.selectedGrantIds.map(id => {
    if (id.startsWith('opportunity:')) {
      const opp = allOpportunities().find(o => GrantCore.opportunityKey(o) === id);
      return opp ? { id, name: opp.title, kind: 'Opportunity', url: GrantCore.safeUrl(opp.source_url), deadline: GrantCore.dateOnly(opp.close_date), status: GrantCore.opportunityStatus(opp), record: opp }
        : { id, name: 'Previously saved opportunity (' + id.slice(12) + ')', kind: 'Unavailable in current feed', url: null, deadline: null, status: 'unknown' };
    }
    const program = GRANTS.find(g => g.id === id);
    return program ? { id, name: program.name, kind: 'Program to research', url: sourceUrlFor(program), deadline: null, status: 'research' } : null;
  }).filter(Boolean);
}
function toggleSavedGrant(id) {
  const known = GRANTS.some(g => g.id === id) || allOpportunities().some(o => GrantCore.opportunityKey(o) === id);
  if (!known && !state.selectedGrantIds.includes(id)) return;
  const wasSaved = state.selectedGrantIds.includes(id);
  state.selectedGrantIds = wasSaved ? state.selectedGrantIds.filter(x => x !== id) : [...state.selectedGrantIds, id];
  renderStack(); renderGrants(); renderOpportunityExplorer(); renderTLDR(); renderNarrative();
  const saved = savePlan();
  showToast(saved ? (wasSaved ? 'Removed from shortlist' : 'Saved to your shortlist') : 'Plan changed; export a copy because browser storage is unavailable');
}
function renderOpportunityExplorer() {
  const host = document.getElementById('opportunityList');
  if (!host) return;
  const query = (document.getElementById('opportunitySearch')?.value || '').toLowerCase().trim();
  const status = document.getElementById('opportunityStatus')?.value || 'open';
  const sourceKind = document.getElementById('opportunitySource')?.value || 'all';
  const relevantOnly = document.getElementById('opportunityRelevant')?.checked !== false;
  let list = allOpportunities().filter(o => {
    const text = [o.title, o.synopsis, o.agency, o.cfda].filter(Boolean).join(' ').toLowerCase();
    const states = Array.isArray(o.states) ? o.states : [];
    return (!query || text.includes(query)) && (status === 'all' || GrantCore.opportunityStatus(o) === status)
      && (sourceKind === 'all' || (o.source_kind || 'federal') === sourceKind)
      && (!states.length || states.includes(state.stateCode))
      && (!relevantOnly || GrantCore.topicRelevant(o, state.goals));
  });
  if(document.getElementById('opportunitySort')?.value!=='deadline')list=list.map(record=>({record,assessment:GrantMatching.assess(record,state,state.opportunityReviews?.[GrantCore.opportunityKey(record)])})).sort(GrantMatching.compare).map(item=>item.record);
  else list.sort((a,b)=>(GrantCore.dateOnly(a.close_date)||'9999-12-31').localeCompare(GrantCore.dateOnly(b.close_date)||'9999-12-31'));
  document.getElementById('opportunityCount').textContent = list.length + ' source records · topic relevance does not confirm eligibility';
  host.replaceChildren();
  if (!list.length) {
    host.innerHTML = '<div class="workspace-empty">No source records match these filters. Broaden the filters or use the official source directory below. An empty result does not mean no funding exists.</div>';
    return;
  }
  list.forEach(o => {
    const id = GrantCore.opportunityKey(o);
    const url = GrantCore.safeUrl(o.source_url);
    const deadline = GrantCore.dateOnly(o.close_date);
    const card = document.createElement('article'); card.className = 'grant-card';
    const applicant = Array.isArray(o.applicant_types) && o.applicant_types.length ? o.applicant_types.join(', ') : 'Not supplied by this feed';
    const assessment=GrantMatching.assess(o,state,state.opportunityReviews?.[id]);
    card.innerHTML = `<div class="grant-head"><div><span class="evidence-badge">${escapeHtml(GrantCore.opportunityStatus(o))}</span><h3 class="name">${escapeHtml(o.title || 'Untitled opportunity')}</h3><div class="agency">${escapeHtml(o.agency || o.source || '')} · ${escapeHtml(o.opp_number || o.source_id)}</div></div></div>
      <dl class="opportunity-facts"><div><dt>Source category</dt><dd>${escapeHtml(o.source_kind || 'federal')}</dd></div><div><dt>Source deadline</dt><dd>${escapeHtml(deadline || 'Not supplied')}<small>Confirm cutoff time and time zone with the funder.</small></dd></div><div><dt>Published award ceiling</dt><dd>${escapeHtml(fmtMoneyCompact(o.award_ceiling) || 'Not supplied')}</dd></div><div><dt>Applicant types</dt><dd>${escapeHtml(applicant)}</dd></div></dl>
      <p class="muted">${escapeHtml(String(o.synopsis || 'Read the official solicitation for scope, allowable costs, and application requirements.').replace(/<[^>]*>/g, '').slice(0, 700))}</p>
      <p class="evidence-note">${o.provenance==='agency_entered'?'Agency-entered record · independently verify the linked notice. ':''}DOC eligibility: unconfirmed. Review direct-applicant and partner/subrecipient routes in the source document.</p>
      <div class="grant-actions">${url ? `<a class="btn btn-secondary btn-sm" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Read official opportunity ↗</a>` : '<span>Official link unavailable</span>'}<button type="button" class="btn btn-teal btn-sm" aria-pressed="${state.selectedGrantIds.includes(id)}">${state.selectedGrantIds.includes(id) ? 'Remove from shortlist' : 'Save opportunity'}</button></div>`;
    card.querySelector('button').addEventListener('click', () => toggleSavedGrant(id));
    const reasoning=document.createElement('details');reasoning.className='match-reasoning';
    reasoning.innerHTML=`<summary>${escapeHtml(assessment.label)} · why this appears</summary><p class="small muted">Research priority based on source text and your agency’s review. It is not an eligibility decision or likelihood of winning.</p><ul>${assessment.reasons.map(r=>'<li>'+escapeHtml(r)+'</li>').join('')||'<li>No strong topic alignment was found in the supplied text.</li>'}</ul><strong>Before pursuing</strong><ul>${assessment.missing.map(r=>'<li>'+escapeHtml(r)+'</li>').join('')||'<li>Review the complete current notice and all application requirements.</li>'}</ul>${assessment.urgency?'<p class="evidence-note">'+escapeHtml(assessment.urgency)+'</p>':''}`;
    card.insertBefore(reasoning,card.querySelector('.grant-actions'));
    if(state.selectedGrantIds.includes(id)){
      const reviewButton=document.createElement('button');reviewButton.type='button';reviewButton.className='btn btn-secondary btn-sm';reviewButton.textContent='Review DOC eligibility';reviewButton.onclick=()=>openQualification(id);card.querySelector('.grant-actions').appendChild(reviewButton);
    }
    host.appendChild(card);
  });
}
function renderSourceDirectory() {
  const host = document.getElementById('sourceDirectory');
  if (!host) return;
  host.innerHTML = GrantCore.SOURCES.map(s => `<article class="source-card"><span class="evidence-badge">${escapeHtml(s.kind)}</span><h3>${escapeHtml(s.name)}</h3><p>${escapeHtml(s.focus)}</p><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">Search official source ↗</a><small>Research destination · current cycle and DOC eligibility must be checked</small></article>`).join('');
  const strategy=document.getElementById('fundingStrategy');
  if(strategy)strategy.innerHTML=GrantMatching.routes(state).map(r=>`<article class="source-card"><span class="evidence-badge">${escapeHtml(r.category)}</span><h3>${escapeHtml(r.title)}</h3><p>${escapeHtml(r.path)}</p><p><strong>Potential partners:</strong> ${escapeHtml(r.partner)}</p><details><summary>Build the case</summary><p>${escapeHtml(r.question)}</p><p><strong>Evidence to gather:</strong> ${escapeHtml(r.evidence)}</p></details><a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">Research this funding route ↗</a><small>Funding strategy · not a confirmed open grant or DOC eligibility determination</small></article>`).join('');
}
function exportPlan() {
  const payload = { format: 'doc-grant-plan', version: 2, exported_at: new Date().toISOString(), agency: state.agencyName, program: state.programName, state: state.stateCode, plan: currentPlan(), shortlist: selectedPlanItems(), narrative: buildNarrative(), note: 'Agency planning document. No vendor prices or award guarantees. Verify requirements with the funder.' };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'doc-grant-plan.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function renderAiBrief() {
  const select = document.getElementById('aiBriefOpportunity');
  if (!select) return;
  const selected = select.value;
  const items = selectedPlanItems().filter(item => item.record);
  select.replaceChildren();
  items.forEach(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = item.name; select.appendChild(option); });
  if (items.some(item => item.id === selected)) select.value = selected;
  const item = items.find(item => item.id === select.value);
  const record = item?.record;
  if(typeof syncAiOpportunity==='function')syncAiOpportunity(item?.id);
  const input = {
    task: document.getElementById('aiBriefTask').value,
    profile: { agencyName: state.agencyName, programName: state.programName, stateCode: state.stateCode, agencyType: state.agencyType, populationSize: popLabel(state.populationSize), goals: state.goals.map(goalLabel), activities: COMPONENTS.filter(c => state.programSelections.has(c.id)).map(c => c.title) },
    opportunity: record, snapshotAt: LIVE_FEED.last_synced_at,
    sourceHealth: record ? LIVE_FEED.sourceHealth?.[record.source]?.state : null,
    sourceLastSuccessAt: record ? LIVE_FEED.sourceHealth?.[record.source]?.last_success_at : null,
    includeBudget: document.getElementById('aiBriefBudget').checked, plan: currentPlan(),
    noticeExcerpt:{text:document.getElementById('aiNoticeText')?.value||'',url:document.getElementById('aiNoticeUrl')?.value||'',section:document.getElementById('aiNoticeSection')?.value||''}
  };
  const brief = GrantCore.aiEvidenceBrief(input);
  document.getElementById('aiBriefPreview').value = brief;
  document.getElementById('aiBriefStatus').textContent = item ? 'Review the brief before sharing it. It contains your agency profile and one source record; contact fields and budget notes are excluded.' : 'Save a specific opportunity in the Grants tab to build a source-backed brief. General program research routes do not include a solicitation.';
  select.disabled = !items.length;
  document.querySelectorAll('[data-ai-brief-action]').forEach(button => { button.disabled = !brief; });
  if(typeof syncAiAnalysis==='function')syncAiAnalysis(item,input);
}
function copyAiBrief() {
  const value = document.getElementById('aiBriefPreview').value;
  if (value) copyText(value, 'AI evidence brief copied');
}
function downloadAiBrief() {
  const value = document.getElementById('aiBriefPreview').value;
  if (!value) return;
  const url = URL.createObjectURL(new Blob([value], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'doc-ai-evidence-brief.txt'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
