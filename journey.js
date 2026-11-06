/* Guided applicant research, program definition and a connected application plan. */
window.FundingJourney = {
  create(ui) {
    const J = JourneyState,
      C = GrantCore,
      S = NavigatorState,
      M = GrantMatching,
      { esc: e, icon, button, external, field } = ui;
    const titles = [
      "Your agency",
      "Research",
      "Program",
      "Funding",
      "Application",
      "Reporting",
    ];
    const descriptions = [
      "Identify the applicant",
      "Review public-source research",
      "Define the program",
      "Find a credible funding route",
      "Build the application",
      "Report and prepare for renewal",
    ];
    const types = [
      ["state_doc", "State Department of Corrections"],
      ["county_jail", "County / local corrections"],
      ["juvenile", "Juvenile justice agency"],
      ["college", "College / education institution"],
      ["nonprofit", "Nonprofit partner"],
      ["community", "Community / reentry agency"],
    ];
    const labels = {
      ged: "Adult education & literacy",
      cte: "Career training & credentials",
      postsec: "Postsecondary education",
      reentry: "Reentry & employment",
      digital: "Digital learning",
      sud: "Recovery & treatment",
      sel: "Life skills & mentoring",
      juv_ed: "Youth education",
    };
    let busy = false,
      error = "";
    const ctx = () => ui.context(),
      data = () => ctx().state.journey;
    const jbutton = (label, action, cls = "", attrs = "") =>
      `<button type="button" class="btn ${cls}" data-journey="${action}" ${attrs}>${label}</button>`;
    const noticeTitle = (value) =>
      String(value || "").replace(
        /&(amp|lt|gt|quot|apos|ndash|mdash|nbsp);/g,
        (_, k) =>
          ({
            amp: "&",
            lt: "<",
            gt: ">",
            quot: '"',
            apos: "'",
            ndash: "–",
            mdash: "—",
            nbsp: " ",
          })[k],
      );
    const selected = () =>
      data().focusKey && ctx().state.saved.includes(data().focusKey)
        ? data().focusKey
        : ctx().state.saved[0] || "";
    const option = (items, value) =>
      items
        .map(
          ([v, t]) =>
            `<option value="${e(v)}" ${v === value ? "selected" : ""}>${e(t)}</option>`,
        )
        .join("");
    function input(
      label,
      prop,
      value,
      {
        area = false,
        profile = false,
        required = false,
        help = "",
        placeholder = "",
        max = 1500,
        type = "text",
      } = {},
    ) {
      return field(
        label,
        area
          ? `<textarea data-j-${profile ? "profile" : "field"}="${prop}" maxlength="${max}" ${required ? "required" : ""} placeholder="${e(placeholder)}">${e(value)}</textarea>`
          : `<input data-j-${profile ? "profile" : "field"}="${prop}" type="${type}" ${profile && prop === "agencyName" ? 'list="docAgencyNames"' : ""} value="${e(value)}" maxlength="${max}" ${required ? "required" : ""} placeholder="${e(placeholder)}">`,
        help,
      );
    }
    function status() {
      const c = ctx(),
        j = data(),
        p = c.state.profile,
        a = c.state.applications[selected()];
      return [
        !!(p.agencyName.trim() && j.identityConfirmed),
        J.researchContext(p, j).length > 0,
        J.programReady(p, j),
        !!selected(),
        !!(a && a.checks && C.CHECKS.every((c) => a.checks[c.id])),
        !!a?.reportResultIds?.length,
      ];
    }
    function rail() {
      const j = data(),
        done = status();
      return `<nav class="journey-rail" aria-label="Funding journey steps">${J.steps.map((s, i) => `<button type="button" data-j-step="${s}" ${j.step === s ? 'aria-current="step"' : ""} class="${j.step === s ? "current" : ""} ${done[i] ? "has-evidence" : ""}"><span>${done[i] ? icon("check") : i + 1}</span><strong>${titles[i]}</strong></button>`).join("")}</nav>`;
    }
    function render() {
      const j = data(),
        i = J.steps.indexOf(j.step);
      return `<section class="journey-page"><div class="page-heading"><div><h1>${j.step === "agency" ? "A stronger application starts with your agency." : titles[i] + ". With a clear next step."}</h1><p class="subtitle">We’ll help you research your organization, define the need, and build a funding plan—one considered step at a time.</p></div></div>${rail()}<div class="journey-position">STEP ${i + 1} OF 6 · ${descriptions[i].toUpperCase()}</div><div class="journey-error" role="status">${e(error)}</div>${{ agency, research, program, funding, application, reporting }[j.step]()}<footer class="journey-footer"><span>${icon("doc")} Your journey is saved on this device.</span><div>${j.step !== "agency" ? jbutton("Export funding plan", "export", "text-button") : ""}<span>Already have an opportunity? </span>${button("Open Discover " + icon("arrow"), "discover", "text-button")}</div></footer></section>`;
    }
    function agency() {
      const p = ctx().state.profile,
        j = data(),
        states = AgencyDirectory.jurisdictions;
      return `<div class="journey-grid"><form id="journeyAgency" class="panel journey-form"><h2>Who are we finding funding for?</h2><p class="quiet">Choose your applicant type and state. Known DOC details fill automatically and carry through your workspace.</p>${field("Applicant type", `<select data-j-profile="agencyType">${option(types, p.agencyType)}</select>`)}${field("State or territory", `<select data-j-profile="stateCode"><option value="">Select a state</option>${option(states, p.stateCode)}</select>`)}${input("Agency name", "agencyName", p.agencyName, { profile: true, required: true, max: 300, placeholder: "Search or enter your agency" })}<datalist id="docAgencyNames">${AgencyDirectory.states.map((a) => `<option value="${e(a.name)}">${e(a.state)}</option>`).join("")}</datalist><p class="note" id="agencyAutofillStatus" role="status">Directory details remain editable. Confirm the legal applicant before relying on research.</p>${input("Official website", "website", j.website, { type: "url", placeholder: "https://", max: 2000 })}${input("Facility, region or education unit", "unit", j.unit, { placeholder: "Optional · narrow the research to your team", max: 500 })}<p class="note">Public agency information only. No individual learner records. Research searches the agency website and official federal sources through OpenAI.</p>${ui.access()}<div class="journey-form-actions">${jbutton("Continue with my own research", "manual", "text-button")}<button class="btn primary" type="submit" ${busy ? "disabled" : ""}>Research my agency ${icon("arrow")}</button></div></form><aside class="journey-help"><h2>What we’ll look for</h2>${[
        ["agency", "Agency mission & jurisdiction"],
        ["doc", "Education & workforce programs"],
        ["path", "Published priorities & partners"],
        ["chart", "Funding and reporting context"],
      ]
        .map(
          ([i, t]) =>
            `<div class="research-topic">${icon(i)}<span>${t}</span></div>`,
        )
        .join(
          "",
        )}<div class="divider"></div><p>You review the findings before they shape your plan.</p><p class="note">State DOC suggestions cover 50 states and DC. Enter your own organization for local corrections, territories, juvenile agencies, colleges and nonprofit partners. A directory entry does not verify current programs.</p></aside></div>`;
    }
    function research() {
      const c = ctx(),
        j = data(),
        fresh = j.research.identity === J.identity(c.state.profile, j),
        facts = fresh ? j.research.facts : [];
      return `<div class="journey-grid"><section class="panel journey-form"><h2>Build a brief you can stand behind.</h2><p class="quiet">Researching <strong>${e(c.state.profile.agencyName || "your agency")}</strong>${j.unit ? " · " + e(j.unit) : ""}. Review each source, select useful findings, and correct the agency identity before continuing.</p>${busy ? `<div class="research-working" role="status">${icon("spark")} Searching public sources and tracing the agency’s education context. This may take a minute.</div>` : ""}${facts.length ? `<p class="note">AI research · ${e(new Date(j.research.generatedAt).toLocaleDateString())} · ${e(j.research.model)}. Source-linked synthesis, not independently verified facts.</p><div class="research-findings">${facts.map((f, i) => `<article class="research-finding"><label class="check-label"><input type="checkbox" data-j-fact="${i}" ${f.accepted ? "checked" : ""}><strong>Use this ${e(f.category.toLowerCase())} finding</strong></label><p>${e(f.text)}</p><div class="research-citations">${f.sources.map((s, k) => external(s.url, "[" + (k + 1) + "] " + s.title, "")).join("")}</div></article>`).join("")}</div>` : !busy ? `<div class="journey-empty"><h3>${j.research.identity ? "Your agency details changed." : "Your research brief is ready to build."}</h3><p>${j.research.identity ? "Run fresh research before reusing these findings." : "Run public-source research or add your own notes below. Nothing is filled with assumed agency facts."}</p></div>` : ""}<div class="actions">${jbutton(facts.length ? "Refresh agency research" : "Research this agency", "research", "primary", busy ? "disabled" : "")}${jbutton("Edit agency details", "back-agency")}</div>${ui.access()}<details class="manual-research" ${j.researchMode === "manual" ? "open" : ""}><summary>Use my own public-source research</summary>${input("Agency research notes", "manualNotes", j.manualNotes, { area: true, max: 4000, placeholder: "Summarize the agency’s programs, current priorities and partners. Distinguish confirmed facts from questions." })}${input("Public source for these notes", "manualUrl", j.manualUrl, { type: "url", max: 2000, placeholder: "https://agency.gov/public-report" })}</details><label class="check-label section-space"><input id="journeyIdentityConfirmed" type="checkbox" ${j.identityConfirmed ? "checked" : ""}> I have confirmed the agency and the legal applicant.</label><div class="journey-form-actions">${jbutton("Continue with research gaps", "research-gaps", "text-button")}${jbutton("Use reviewed findings & continue", "confirm-research", "primary")}</div></section><aside class="journey-help"><h2>Look beyond the mission statement.</h2><ol class="journey-instructions"><li><strong>Confirm the applicant.</strong> A DOC, facility, college and nonprofit may have different authority to apply.</li><li><strong>Separate facts from plans.</strong> A strategic goal is not a measured outcome or a committed partnership.</li><li><strong>Check the date.</strong> Historical awards and expired plans can inform research; they do not establish an open opportunity.</li><li><strong>Keep what matters.</strong> Only reviewed notes are included in funding strategy and application AI context.</li></ol><div class="divider"></div><h3>Still need to establish</h3><p>Current education need, available agency evidence, the intended program, partner commitments, and who will own the application.</p></aside></div>`;
    }
    function program() {
      const c = ctx(),
        p = c.state.profile,
        j = data();
      return `<div class="journey-grid"><form id="journeyProgram" class="panel journey-form"><h2>Turn the need into a fundable program.</h2><p class="quiet">Your agency research supplies context. These answers define the work you actually want to fund.</p><div class="question-section"><h3>01 · Define the need and the learners</h3>${input("Program name", "programName", p.programName, { profile: true, required: true, max: 300, placeholder: "Name the program or initiative" })}${input("What education gap should this funding address?", "program.need", j.program.need, { area: true, required: true, max: 3000, placeholder: "Describe the unmet need and what evidence would demonstrate it.", help: "Be specific about the gap. Add a source or mark the baseline as unknown; do not invent figures." })}${input("Who will the program serve?", "program.learners", j.program.learners, { required: true, placeholder: "Learner group, custody or release stage, and access needs" })}${input("Where will it operate?", "program.location", j.program.location, { placeholder: "Facilities, region, statewide system or partner service area", help: "Starts from your agency location. Narrow it to the proposed program’s service area." })}</div><div class="question-section"><h3>02 · Describe delivery and the funding need</h3><fieldset class="journey-goals"><legend>What should the program achieve?</legend><div class="checkbox-grid">${Object.entries(
        labels,
      )
        .map(
          ([id, l]) =>
            `<label><input type="checkbox" data-j-goal="${id}" ${p.goals.includes(id) ? "checked" : ""}>${l}</label>`,
        )
        .join(
          "",
        )}</div></fieldset>${input("What will you deliver?", "activities", p.activities, { profile: true, area: true, required: true, max: 4000, placeholder: "Instruction, credentials, delivery approach, learner support and implementation responsibilities." })}${input("Which partners are involved?", "program.partners", j.program.partners, { area: true, placeholder: "Separate confirmed commitments from partners you still need to approach." })}${input("What needs funding?", "program.fundingUse", j.program.fundingUse, { area: true, placeholder: "Describe the agency’s funding needs and cost categories. Enter only agency-supported amounts, if known." })}${input("When should the program begin?", "program.timeline", j.program.timeline, { placeholder: "Target start and duration, or explain timing constraints" })}</div><div class="question-section"><h3>03 · Plan the evidence and long-term delivery</h3>${input("What aggregate evidence do you already have?", "baseline", p.baseline, { profile: true, area: true, max: 4000, placeholder: "Existing measures, reporting periods and source records. Unknown baselines are acceptable." })}<label class="check-label"><input id="journeyDXP" type="checkbox" ${c.state.usesAchieveDXP ? "checked" : ""}> Our agency already uses AchieveDXP</label>${input("How will you measure progress?", "program.evaluation", j.program.evaluation, { area: true, placeholder: "Metric, baseline, target, data source, reporting cadence and owner. Mark missing elements." })}${input("How will the work continue after the grant?", "program.sustainability", j.program.sustainability, { area: true, placeholder: "Agency capacity, partner roles, recurring resources and decisions still needed." })}</div><div class="journey-form-actions">${jbutton("Back to research", "back-research")}<button type="submit" class="btn primary">Build my funding plan ${icon("arrow")}</button></div></form><aside class="journey-help"><h2>A strong case has a clear chain of evidence.</h2><div class="program-chain"><strong>Documented need</strong>${icon("arrow")}<strong>Defined activities</strong>${icon("arrow")}<strong>Measurable outcomes</strong>${icon("arrow")}<strong>Credible reporting</strong></div><p>Funders need to understand why this program, why this applicant, and how progress will be demonstrated.</p><div class="divider"></div><h3>${J.researchContext(p, j).length} reviewed research notes</h3><p>These notes travel with your AI funding strategy. They do not replace the current solicitation or award requirements.</p>${button("Open aggregate evidence library", "outcomes", "small")}<p class="note">AchieveDXP exports can support available education measures. Employment, post-release and financial measures may require partner records.</p></aside></div>`;
    }
    function funding() {
      const c = ctx(),
        j = data(),
        p = c.state.profile,
        focus = selected();
      const choices = c.records
        .map((o) => ({
          o,
          a: M.assess(o, p, c.state.applications[C.opportunityKey(o)]),
        }))
        .filter(
          (x) =>
            ["open", "forecast"].includes(C.opportunityStatus(x.o)) &&
            M.alignedForPlan(x.a),
        )
        .sort((a, b) =>
          M.compare(
            { record: a.o, assessment: a.a },
            { record: b.o, assessment: b.a },
          ),
        )
        .slice(0, 6);
      return `<section class="program-brief-band"><div><span class="eyebrow">YOUR PROGRAM BRIEF</span><h2>${e(p.programName || "Education program")}</h2><p>${e(j.program.need)}</p><span>${e(p.agencyName)} · ${e(p.stateCode || "Geography to confirm")} · ${J.researchContext(p, j).length} reviewed research notes</span></div>${jbutton("Refine the brief", "back-program", "small")}</section>${ui.strategy()}<section class="journey-shortlist"><div class="guidance-heading"><div><h2>Start a considered shortlist.</h2><p class="quiet">These source records have rule-based topic alignment. Confirm the full notice and applicant route before deciding to pursue one.</p></div>${button("Explore all sources", "discover", "small")}</div>${
        choices.length
          ? `<div class="journey-opportunities">${choices
              .map(({ o, a }) => {
                const k = C.opportunityKey(o);
                return `<article><div><span class="tag">${e(C.opportunityStatus(o))}</span><span class="quiet"> ${e(o.agency || "Source record")}</span><h3>${e(noticeTitle(o.title))}</h3><p>${e(a.reasons.slice(0, 2).join(" "))}</p><p class="note">${e(a.missing.slice(0, 2).join(" "))}</p>${external(o.source_url, "Read the official notice", "")}</div>${jbutton(k === focus ? "Selected for plan" : "Build a plan for this", "choose-grant", k === focus ? "" : "primary small", `data-key="${e(k)}"`)}</article>`;
              })
              .join("")}</div>`
          : '<p class="alert">No current snapshot record meets these initial topic and geography filters. Explore funding pathways or add a current state, workforce or corporate notice.</p>'
      }${
        c.state.saved.length
          ? field(
              "Application to guide",
              `<select id="journeyFocus">${option(
                c.state.saved.map((k) => [k, ui.record(k)?.title || k]),
                focus,
              )}</select>`,
            )
          : ""
      }<div class="journey-form-actions">${button("Add an official notice", "import")}${jbutton("Build my application plan " + icon("arrow"), "to-application", "primary", focus ? "" : "disabled")}</div></section>${fundingRoutes()}`;
    }
    function fundingRoutes() {
      return `<section class="journey-shortlist"><div class="guidance-heading"><div><h2>Investigate the routes behind the notices.</h2><p class="quiet">State, workforce and corporate routes aligned with your goals. These are research starting points, not confirmed open grants.</p></div>${button("All funding pathways", "pathways", "small")}</div><div class="journey-route-list">${M.routes(
        ctx().state.profile,
      )
        .map(
          (r) =>
            `<article><span class="eyebrow">${e(r.category)}</span><h3>${external(r.url, r.title, "")}</h3><p>${e(r.path)}</p><p><strong>Potential partner:</strong> ${e(r.partner)}</p><p class="note"><strong>Establish next:</strong> ${e(r.question)}</p></article>`,
        )
        .join("")}</div></section>`;
    }
    function application() {
      const c = ctx(),
        j = data(),
        k = selected(),
        o = ui.record(k),
        a = c.state.applications[k] || S.cleanApplication(),
        coverage = S.coverage(a),
        budget = S.budget(a);
      const tasks = [
        [
          "qualify",
          "Establish a defensible applicant route",
          "Read applicant types, geography, activities, match, deadlines and partner rules. Record a source for each decision.",
          a.route === "direct" || (a.route === "partner" && !!a.partner),
        ],
        [
          "qualify",
          "Read the current notice and amendments",
          "Attach public notice text, its source, and the sections that govern your application.",
          !!(a.notice.text && C.safeUrl(a.notice.url)),
        ],
        [
          "criteria",
          "Map every official review criterion",
          "Quote the funder’s criterion, attach agency evidence, and identify gaps before drafting.",
          coverage.total > 0 && coverage.evidenced === coverage.total,
        ],
        [
          "write",
          "Build and challenge the narrative",
          "Use the writing partner to align your actual draft with the evidence. Review revisions before applying them.",
          !!a.narrative.trim(),
        ],
        [
          "budget",
          "Reconcile costs and financial rules",
          "Enter agency-supported costs, verify allowability, and reconcile match and other funding.",
          a.budget.length > 0 && budget.unreviewed === 0,
        ],
        [
          "submit",
          "Review the submission packet",
          "Confirm the funder checklist, registrations, attachments, deadlines and an accountable owner.",
          C.CHECKS.every((c) => a.checks[c.id]),
        ],
      ];
      return `<div class="journey-grid"><section class="panel journey-form"><h2>One opportunity. A complete working plan.</h2><h3>${e(noticeTitle(o?.title) || "Choose a saved opportunity")}</h3>${o ? external(o.source_url, "Open the source notice", "") : ""}<p class="quiet section-space">Work through these decisions in order. A recorded draft or checked task does not establish eligibility, compliance or quality.</p><div class="form-grid">${input("Application owner", "owner", a.owner, { max: 300 })}${input("Internal review date", "internalDueDate", a.internalDueDate || "", { type: "date", max: 20 })}</div><div class="application-guide-tasks">${tasks.map(([tab, title, detail, recorded], i) => `<article><span class="step-number">${i + 1}</span><div><h3>${title}</h3><p>${detail}</p><span class="note">${recorded ? "Work recorded · verify it against the current notice" : "Next action still needs evidence or work"}</span></div>${jbutton("Open " + { qualify: "qualification", criteria: "criteria", write: "writing", budget: "budget", submit: "submission" }[tab], "work-task", "small", `data-tab="${tab}"`)}</article>`).join("")}</div><div class="journey-form-actions">${jbutton("Back to funding", "back-funding")}${jbutton("Plan reporting from the start " + icon("arrow"), "to-reporting", "primary")}</div></section><aside class="journey-help"><h2>Close the gaps before you write around them.</h2><ul class="journey-gap-list">${S.gaps(
        a,
      )
        .slice(0, 8)
        .map((g) => `<li>${e(g)}</li>`)
        .join(
          "",
        )}</ul><div class="divider"></div><h3>Use the research responsibly.</h3><p>Agency notes explain context. Only the current funder notice establishes who can apply and what must be submitted.</p>${jbutton("Export the full funding plan", "export", "small")}</aside></div>`;
    }
    function reporting() {
      const c = ctx(),
        k = selected(),
        a = c.state.applications[k] || S.cleanApplication(),
        o = ui.record(k),
        rows = c.state.results.filter((r) => a.reportResultIds.includes(r.id));
      return `<div class="journey-grid"><section class="panel journey-form"><h2>Make reporting part of the application.</h2><p class="quiet">${e(noticeTitle(o?.title) || "Your selected grant")}. Define how you will demonstrate delivery before the award begins.</p><ol class="reporting-guide"><li><h3>Translate promises into measures.</h3><p>For every proposed outcome, record the measure, definition, baseline, target, period, source and responsible owner.</p>${jbutton("Write the measurement plan", "work-task", "small", 'data-tab="write"')}</li><li><h3>Bring the relevant aggregate evidence.</h3><p>Import agency-approved AchieveDXP exports or other aggregate records. Keep cohorts and periods distinct. Do not add individual learner information.</p>${jbutton("Open this grant’s evidence library", "report-evidence", "small")}</li><li><h3>Choose measures for this specific grant.</h3><p>${rows.length} measures are selected for this application. Select relevant measures before asking AI to draft a progress report.</p>${rows.length ? `<ul>${rows.map((r) => `<li>${e(r.metric)} · ${e(r.program)} · ${e(r.period)}</li>`).join("")}</ul>` : ""}</li><li><h3>Review the funder’s complete reporting package.</h3><p>Education outcomes do not replace financial reports, award-specific templates, certifications or partner reporting. Confirm the required format and submission process.</p></li><li><h3>Use what you learn in the next application.</h3><p>Capture actual performance, delivery issues, funder feedback and remaining evidence gaps. Keep proposed targets separate from achieved results.</p>${jbutton("Record feedback and award outcomes", "work-task", "small", 'data-tab="submit"')}</li></ol><div class="journey-form-actions">${jbutton("Back to application", "to-application")}${jbutton("Open reporting workspace " + icon("arrow"), "report-evidence", "primary")}</div></section><aside class="journey-help"><h2>The next grant starts with today’s evidence.</h2><p>${c.state.usesAchieveDXP ? "Use your AchieveDXP exports to document the learning measures your agency actually tracks." : "Build a repeatable aggregate reporting process with the systems your agency uses."}</p><div class="divider"></div><h3>Reporting plan on record</h3><p class="preserve-lines">${e(a.outcomes || "No measurement plan is recorded yet. Add one in the writing workspace.")}</p><p class="note">The navigator does not connect directly to the LMS or submit reports to a funder.</p>${jbutton("Export journey and next actions", "export", "small")}</aside></div>`;
    }
    function go(step) {
      const c = ctx(),
        j = data();
      error = "";
      if (step !== "agency" && !c.state.profile.agencyName.trim()) {
        error = "Identify your applicant agency first.";
        step = "agency";
      }
      if (
        ["funding", "application", "reporting"].includes(step) &&
        !J.programReady(c.state.profile, j)
      ) {
        error =
          "Define the program name, need, learners, activities and at least one goal before building the funding plan.";
        step = "program";
      }
      if (["application", "reporting"].includes(step) && !selected()) {
        error = "Select an opportunity to guide the application.";
        step = "funding";
      }
      j.step = step;
      ui.save();
      ui.render();
      document.querySelector(".journey-position")?.scrollIntoView({
        block: "start",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
    function capture(el) {
      const c = ctx(),
        j = data();
      if (el.dataset.jProfile) {
        if (
          ["agencyName", "agencyType", "stateCode"].includes(
            el.dataset.jProfile,
          )
        )
          ui.updateAgency(el.dataset.jProfile, el.value);
        else c.state.profile[el.dataset.jProfile] = el.value;
      }
      if (el.dataset.jField) {
        const k = el.dataset.jField;
        if (k === "owner" || k === "internalDueDate") {
          ui.application(selected())[k] = el.value;
        } else if (k.startsWith("program.")) j.program[k.slice(8)] = el.value;
        else {
          if (k === "website" || k === "unit") ui.updateAgency(k, el.value);
          else j[k] = el.value;
          if (k === "manualNotes" || k === "manualUrl") {
            j.researchMode = "manual";
            j.reviewedIdentity = "";
          }
        }
      }
      if (el.dataset.jGoal) {
        c.state.profile.goals = el.checked
          ? [...new Set([...c.state.profile.goals, el.dataset.jGoal])]
          : c.state.profile.goals.filter((g) => g !== el.dataset.jGoal);
      }
      if (el.dataset.jFact !== undefined) {
        j.research.facts[Number(el.dataset.jFact)].accepted = el.checked;
        j.researchMode = "web";
        j.reviewedIdentity = "";
      }
      if (el.id === "journeyIdentityConfirmed") {
        j.identityConfirmed = el.checked;
        if (!el.checked) j.reviewedIdentity = "";
      }
      if (el.id === "journeyDXP") c.state.usesAchieveDXP = el.checked;
      if (el.id === "journeyFocus") ui.selectApplication(el.value);
      ui.save();
    }
    async function startResearch() {
      const c = ctx(),
        j = data();
      if (busy) return;
      if (!c.state.profile.agencyName.trim() || !J.publicUrl(j.website)) {
        error =
          "Enter your agency name and a public HTTPS agency website first.";
        j.step = "agency";
        ui.render();
        return;
      }
      if (!ui.ready()) return;
      const sig = J.identity(c.state.profile, j),
        request = {
          task: "agency_research",
          agency: {
            name: c.state.profile.agencyName,
            website: j.website,
            type: c.state.profile.agencyType,
            state: c.state.profile.stateCode,
            unit: j.unit,
          },
        };
      busy = true;
      error = "";
      j.step = "research";
      ui.save();
      ui.render();
      try {
        const r = await ui.request(request);
        if (
          r.task !== "agency_research" ||
          r.requires_human_review !== true ||
          !Array.isArray(r.facts) ||
          !r.facts.length
        )
          throw Error(
            "The service returned no usable source-linked agency research.",
          );
        if (sig !== J.identity(ctx().state.profile, data()))
          throw Error(
            "The agency details changed during research. Run research again for the current applicant.",
          );
        data().research = J.clean({
          research: {
            identity: sig,
            generatedAt: r.generated_at,
            model: r.model,
            facts: r.facts.map((f) => ({ ...f, accepted: false })),
          },
        }).research;
        data().researchMode = "web";
        data().reviewedIdentity = "";
        ui.save();
      } catch (err) {
        error =
          err.name === "TimeoutError"
            ? "Agency research timed out. Retry, narrow the unit, or use your own public-source notes."
            : err.message;
      } finally {
        busy = false;
        if (ui.active()) ui.render();
      }
    }
    function exportPlan() {
      const c = ctx(),
        j = data(),
        p = c.state.profile,
        k = selected(),
        a = c.state.applications[k],
        notes = J.researchContext(p, j),
        o = ui.record(k);
      ui.download(
        "agency-funding-plan.txt",
        [
          "AGENCY FUNDING PLAN — HUMAN REVIEW WORKING DOCUMENT",
          new Date().toISOString(),
          `Applicant: ${p.agencyName}\nType: ${p.agencyType}\nState: ${p.stateCode}\nWebsite: ${j.website}\nUnit: ${j.unit}`,
          `REVIEWED PUBLIC RESEARCH\n${notes.length ? notes.map((f) => f.category + ": " + f.text + "\n" + f.sources.map((s) => s.url).join("\n") + "\n" + f.provenance).join("\n\n") : "Research gaps remain. No public findings have been reviewed."}`,
          `PROGRAM BRIEF\n${J.mission(p, j)}\nAvailable evidence: ${p.baseline}\nEvaluation: ${j.program.evaluation}\nSustainability: ${j.program.sustainability}`,
          `SELECTED OPPORTUNITY\n${o?.title || "Not yet selected"}\n${o?.source_url || ""}`,
          a
            ? `APPLICATION OWNER: ${a.owner || "Unassigned"}\nINTERNAL REVIEW: ${a.internalDueDate || "Not set"}\nNEXT EVIDENCE GAPS\n${S.gaps(a).join("\n")}\nMEASUREMENT PLAN\n${a.outcomes || "Not yet recorded"}`
            : "NEXT STEP: identify a source-backed funding route and review the full notice.",
          `RESEARCH → FUNDING → APPLICATION → REPORTING\nConfirm applicant authority, current source dates, eligibility, partner roles, official criteria, evidence, agency costs, deadlines and reporting requirements. This document is not a submission, eligibility determination or award prediction.`,
        ].join("\n\n"),
      );
    }
    document.addEventListener("input", (ev) => {
      if (ev.target.matches("[data-j-profile],[data-j-field]"))
        capture(ev.target);
    });
    document.addEventListener("change", (ev) => {
      const el = ev.target;
      if (
        el.matches(
          "[data-j-profile],[data-j-field],[data-j-goal],[data-j-fact],#journeyIdentityConfirmed,#journeyDXP,#journeyFocus",
        )
      ) {
        capture(el);
      }
    });
    document.addEventListener("submit", (ev) => {
      if (ev.target.id === "journeyAgency") {
        ev.preventDefault();
        startResearch();
      }
      if (ev.target.id === "journeyProgram") {
        ev.preventDefault();
        if (!J.programReady(ctx().state.profile, data())) {
          error =
            "Add a program name, at least 20 characters about both the need and activities, the learner group, and at least one goal.";
          ui.render();
          return;
        }
        go("funding");
      }
    });
    document.addEventListener("click", async (ev) => {
      const b = ev.target.closest("[data-journey],[data-j-step]");
      if (!b) return;
      if (b.dataset.jStep) {
        go(b.dataset.jStep);
        return;
      }
      const j = data(),
        c = ctx(),
        action = b.dataset.journey;
      if (action.startsWith("back-")) {
        go(action.slice(5));
        return;
      }
      if (action === "manual") {
        if (!c.state.profile.agencyName.trim()) {
          error = "Enter the applicant agency name first.";
          ui.render();
          return;
        }
        j.researchMode = "manual";
        go("research");
      }
      if (action === "research") await startResearch();
      if (action === "confirm-research" || action === "research-gaps") {
        if (!j.identityConfirmed) {
          error = "Confirm the agency and legal applicant before continuing.";
          ui.render();
          return;
        }
        if (action === "confirm-research") {
          const copy = {
            ...j,
            reviewedIdentity: J.identity(c.state.profile, j),
          };
          if (!J.researchContext(c.state.profile, copy).length) {
            error =
              "Select at least one current research finding or provide your own notes with a public HTTPS source. You can also explicitly continue with research gaps.";
            ui.render();
            return;
          }
          j.reviewedIdentity = J.identity(c.state.profile, j);
        } else j.reviewedIdentity = "";
        go("program");
      }
      if (action === "choose-grant") {
        if (!ui.choose(b.dataset.key)) return;
        ui.selectApplication(b.dataset.key);
        ui.save();
        ui.render();
      }
      if (action === "to-application") go("application");
      if (action === "to-reporting") go("reporting");
      if (action === "work-task") ui.openApplication(selected(), b.dataset.tab);
      if (action === "report-evidence") ui.openReport(selected());
      if (action === "export") exportPlan();
    });
    return {
      render,
      go,
      context: () => J.researchContext(ctx().state.profile, data()),
      program: () => data().program,
      step: () => data().step,
    };
  },
};
