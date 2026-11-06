let aiSelectedOpportunity=null,aiRequestBody=null,aiRequestFingerprint='',aiAnalysisResult=null,aiPendingRequest=null,aiRequestVersion=0;
function syncAiOpportunity(id){
  if(aiSelectedOpportunity && aiSelectedOpportunity!==id){
    for(const name of ['aiNoticeText','aiNoticeUrl','aiNoticeSection'])document.getElementById(name).value='';
  }
  aiSelectedOpportunity=id;
}
function syncAiAnalysis(item,input){
  const enabled=GrantAI.enabled();
  const body=item?{task:input.task,opportunity_key:item.id,profile:input.profile,include_budget:input.includeBudget,
    budget:input.includeBudget?{gapCost:input.plan.gapCost,gapHave:input.plan.gapHave}:{},
    notice_excerpt:input.noticeExcerpt?.text?input.noticeExcerpt:null,
    ...(item.record.source==='agency_import'?{custom_opportunity:item.record}:{})}:null;
  const fingerprint=JSON.stringify(body);
  if(fingerprint!==aiRequestFingerprint){
    aiRequestVersion++;aiPendingRequest?.abort();aiPendingRequest=null;aiAnalysisResult=null;
    document.getElementById('aiAnalysisOutput').replaceChildren();
    document.getElementById('downloadAiAnalysis').hidden=true;
    document.getElementById('copyAiAnalysis').hidden=true;
    document.getElementById('aiAnalysisStatus').textContent='';
  }
  aiRequestBody=body;aiRequestFingerprint=fingerprint;
  document.getElementById('aiServiceUnavailable').hidden=enabled;
  document.getElementById('aiServiceControls').hidden=!enabled;
  document.getElementById('runAiAnalysis').disabled=!enabled||!item||!!aiPendingRequest;
}
async function runAiAnalysis(){
  if(!aiRequestBody||aiPendingRequest)return;
  const status=document.getElementById('aiAnalysisStatus');
  if(aiRequestBody.notice_excerpt?.text&&!GrantCore.safeUrl(aiRequestBody.notice_excerpt.url)){status.textContent='Add the official HTTPS URL for your notice excerpt before requesting analysis.';return;}
  const body=JSON.stringify(aiRequestBody),version=++aiRequestVersion;
  const controller=new AbortController();aiPendingRequest=controller;
  const timeout=setTimeout(()=>controller.abort(),70000);
  document.getElementById('runAiAnalysis').disabled=true;
  document.getElementById('aiAnalysisOutput').replaceChildren();
  document.getElementById('downloadAiAnalysis').hidden=true;aiAnalysisResult=null;
  document.getElementById('copyAiAnalysis').hidden=true;
  status.textContent='Analyzing the supplied evidence with OpenAI…';
  try{
    const data=await GrantAI.request(JSON.parse(body),{signal:controller.signal});
    if(version!==aiRequestVersion)return;
    if(!data.analysis||data.requires_human_review!==true||data.opportunity_key!==aiRequestBody.opportunity_key)throw new Error('The response does not match this opportunity. No analysis was accepted.');
    aiAnalysisResult=data;renderAiAnalysis(data);
    status.textContent='AI draft ready for human review. Quotes were checked against the supplied text; eligibility and reasoning still need your review.';
    document.getElementById('downloadAiAnalysis').hidden=false;
    document.getElementById('copyAiAnalysis').hidden=false;
  }catch(error){
    if(version===aiRequestVersion)status.textContent=error.name==='AbortError'?'The request timed out. Your plan is unchanged; try again.':error.message;
  }finally{
    clearTimeout(timeout);
    if(version===aiRequestVersion){aiPendingRequest=null;document.getElementById('runAiAnalysis').disabled=!aiRequestBody;}
  }
}
function renderAiAnalysis(result){
  const host=document.getElementById('aiAnalysisOutput');host.replaceChildren();
  const add=(tag,text,parent=host)=>{const node=document.createElement(tag);node.textContent=text;parent.appendChild(node);return node;};
  const citations=(items,parent)=>{
    if(!Array.isArray(items))return;
    items.forEach(c=>{
      const detail=document.createElement('details');detail.className='analysis-citation';parent.appendChild(detail);
      add('summary','['+c.source_id+'] Source evidence',detail);add('blockquote',c.quote,detail);
      const url=GrantCore.safeUrl(c.url);if(url){const a=add('a','Review official source ↗',detail);a.href=url;a.target='_blank';a.rel='noopener noreferrer';}
    });
  };
  add('p','AI-generated planning draft · '+result.provider+' · '+result.model+' · '+new Date(result.generated_at).toLocaleString()).className='small muted';
  add('p',result.analysis.summary);
  const routes={direct_review:'Direct application requires source review',partner_review:'Partner-led route requires source review',not_supported:'Evidence suggests a possible eligibility barrier',unknown:'Applicant route remains unknown'};
  add('p',routes[result.analysis.route]||routes.unknown).className='evidence-note';
  result.analysis.findings.forEach(f=>{
    const section=document.createElement('section');section.className='analysis-finding';host.appendChild(section);
    add('h4',f.requirement,section);add('span',f.assessment==='supported'?'Supported by supplied text':f.assessment==='not_supported'?'Potential blocker in supplied text':'Evidence needed',section).className='evidence-badge';
    add('p',f.explanation,section);citations(f.evidence,section);
  });
  for(const [title,items] of [['Next actions',result.analysis.next_actions],['Missing information',result.analysis.missing_information]]){
    add('h4',title);const list=add('ul','');items.forEach(item=>add('li',item,list));
  }
  result.analysis.draft_sections.forEach(s=>{add('h4',s.heading);add('p',s.body).className='analysis-draft';citations(s.evidence,host);});
  add('p',result.citation_check).className='small muted';
}
function downloadAiAnalysis(){
  if(!aiAnalysisResult)return;
  const url=URL.createObjectURL(new Blob([formatAiAnalysis(aiAnalysisResult)],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='doc-ai-analysis.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function formatAiAnalysis(result){
  const citations=items=>items.map(c=>'['+c.source_id+'] "'+c.quote+'"\n'+c.url).join('\n');
  const a=result.analysis;
  return ['DOC EDUCATION — AI PLANNING DRAFT','Generated: '+new Date(result.generated_at).toLocaleString()+' · '+result.provider+' · '+result.model,'Human review required. Verify the current notice, citations, and agency facts before use.',a.summary,
    ...a.findings.map(f=>f.requirement+'\n'+f.assessment+' — '+f.explanation+'\n'+citations(f.evidence)),
    'NEXT ACTIONS\n'+a.next_actions.map((s,i)=>(i+1)+'. '+s).join('\n'),
    'MISSING INFORMATION\n'+a.missing_information.map(s=>'- '+s).join('\n'),
    ...a.draft_sections.map(s=>s.heading+'\n'+s.body+'\n'+citations(s.evidence)),result.citation_check].join('\n\n');
}
function copyAiAnalysis(){if(aiAnalysisResult)copyText(formatAiAnalysis(aiAnalysisResult),'AI planning draft copied');}
