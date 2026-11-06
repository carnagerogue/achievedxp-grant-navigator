/* A source-grounded strategy surface. No generated answers or credentials are persisted. */
window.FundingIntelligence = {
  create(ui) {
    const { esc: e, icon, button, external } = ui;
    let mission = "",
      mode = "mission",
      busy = false,
      error = "",
      result = null,
      history = [],
      contextAtRequest = "";
    const contextKey = () =>
      JSON.stringify({
        profile: ui.context().profile,
        imports: ui.context().imports,
        uses: ui.context().usesAchieveDXP,
        agencyResearch: ui.context().agencyResearch,
        programBrief: ui.context().programBrief,
      });
    const suggestions = [
      [
        "partner",
        "Find a partner-led route",
        "Identify credible partner-led funding routes for correctional adult education, credentials, and reentry. Explain who should lead and what evidence we need.",
      ],
      [
        "shortlist",
        "Compare my shortlist",
        "Compare my saved opportunities for our correctional education program. Prioritize the strongest evidence of fit, distinguish applicant routes, and identify the next decision for each.",
      ],
      [
        "strengthen",
        "Strengthen my application",
        "Help me strengthen a correctional education application using our agency evidence, funder criteria, measurable outcomes, and a defensible reporting plan.",
      ],
    ];
    const hint = (n, title, detail, view) =>
      `<button class="mission-step" data-view="${view}"><span class="step-number">${n}</span><span><strong>${title}</strong><span>${detail}</span></span>${icon("arrow")}</button>`;
    function render(compact = false) {
      const c = ui.context(),
        stale = result && contextAtRequest !== contextKey();
      mode = c.strategyMode || "mission";
      mission =
        c.strategyPrompt == null
          ? c.profile.programName || c.profile.activities
            ? c.mission || ""
            : ""
          : c.strategyPrompt;
      return `<section class="intelligence-home ${compact ? "intelligence-embedded" : ""}"><div class="intelligence-heading"><img class="achieve-mascot" src="assets/mascot.png" alt="Achieve robot mascot" width="400" height="367"><div class="eyebrow">${icon("spark")} INTELLIGENCE FOR YOUR MISSION</div>${compact ? "<h2>Research funding around your program.</h2>" : "<h1>A clearer path to funding.</h1>"}<p>Your mission. Your evidence. An intelligent next step.</p></div>
        <form id="strategyForm" class="strategy-composer ${busy ? "is-thinking" : ""}" aria-busy="${busy}"><label class="sr-only" for="missionPrompt">What would you like to make possible?</label><textarea id="missionPrompt" maxlength="3000" minlength="12" required placeholder="What would you like to make possible?">${e(mission)}</textarea>
        <div class="composer-context"><span>${icon("agency")} ${e(c.profile.agencyName || "Your agency profile")} ${c.profile.stateCode ? "· " + e(c.profile.stateCode) : "· Nationwide research"}</span><button class="text-button" type="button" data-intent="context">Review AI context ${icon("arrow")}</button></div>
        <div class="composer-footer">${button(icon("link") + " Add notice text", "import", "")}<div class="composer-controls"><label class="sr-only" for="strategyMode">Research scope</label><select id="strategyMode"><option value="mission" ${mode === "mission" ? "selected" : ""}>Mission research</option><option value="shortlist" ${mode === "shortlist" ? "selected" : ""}>Saved shortlist · up to 8</option></select><button class="btn primary" type="submit" ${busy ? "disabled" : ""}>${busy ? "Developing your strategy…" : result ? "Refine my strategy" : "Build my strategy"} ${icon("arrow")}</button></div></div></form>
        <div class="prompt-suggestions">${suggestions.map(([id, label]) => `<button class="btn" data-intent="suggest" data-prompt="${id}" ${busy ? "disabled" : ""}>${label}</button>`).join("")}</div>
        ${ui.access()}
        <div class="strategy-status ${busy ? "thinking-status" : ""}" role="status">${busy ? icon("spark") + " Reading the selected source evidence and developing a practical plan." : e(error)}</div>
        ${stale ? '<div class="alert">Your agency context has changed. Build a new strategy before relying on earlier recommendations.</div>' : ""}
        ${result && !stale ? renderResult(result) : `<div class="guidance-heading"><h2>Move your mission forward</h2><span>Workspace guidance</span></div><div class="mission-steps">${hint(1, "Define your education priorities", "A clear program profile makes every recommendation more useful.", "profile")}${hint(2, "Build an evidence-backed shortlist", "Explore current notices and the partner routes worth investigating.", "discover")}${hint(3, "Put your AchieveDXP results to work", "Connect aggregate learning outcomes to applications and reporting.", "outcomes")}</div>`}
        <div class="intelligence-trust"><strong>Built around evidence. Always reviewed by you.</strong><span>Source-linked analysis · No automatic submissions</span></div>
        <p class="intelligence-scope">Federal & workforce source snapshots. State and corporate research pathways. ${button("Explore source coverage", "sources", "text-button")}</p></section>`;
    }
    function renderResult(r) {
      const s = r.strategy;
      return `<section class="strategy-result reveal" aria-label="AI funding strategy"><div class="guidance-heading"><span class="ai-label">${icon("spark")} OPENAI · REVIEW DRAFT</span><div class="actions"><button class="btn small" data-intent="export">Export strategy</button><button class="text-button" data-intent="clear">New strategy</button></div></div><h2>${e(s.title)}</h2><p class="strategy-summary">${e(s.summary)}</p><p class="note">${e(r.context.reviewed)} notices supplied from a ${e(r.context.searched)}-record snapshot · ${r.context.snapshot_at ? e(new Date(r.context.snapshot_at).toLocaleDateString("en-US")) : "Snapshot date unavailable"}. A bounded research selection, not an exhaustive grant search.</p>
        <div class="strategy-opportunities">${s.recommendations.map((o, i) => `<article class="strategy-opportunity"><span class="strategy-number">${String(i + 1).padStart(2, "0")}</span><div><div class="tag-row"><span class="tag">${e(o.status)}</span><span class="quiet">${e({ direct_review: "Direct route to investigate", partner_review: "Partner route to investigate", unknown: "Applicant route unresolved" }[o.route])}</span></div><h3>${e(o.title)}</h3><p>${e(o.rationale)}</p><details><summary>Inspect cited evidence</summary>${o.quotes.map((q) => `<blockquote>${e(q)}</blockquote>`).join("")}<p class="note">${e(o.provenance)}</p>${external(o.url, "Open official source", "")}</details><div class="actions section-space">${button("Review opportunity " + icon("arrow"), "review", "small", `data-key="${e(o.opportunity_key)}"`)}${button(ui.context().saved.includes(o.opportunity_key) ? "Saved to pipeline" : "Save to pipeline", "save", "small", `data-key="${e(o.opportunity_key)}"`)}</div></div></article>`).join("")}</div>
        ${s.pathways.length ? `<h3 class="section-space">Routes worth investigating</h3><div class="strategy-pathways">${s.pathways.map((p) => `<article><span class="eyebrow">${e(p.category)}</span><h3>${e(p.title)}</h3><p>${e(p.rationale)}</p>${external(p.url, "Research this pathway", "")}<p class="note">Research pathway. An open grant and applicant eligibility are not established.</p></article>`).join("")}</div>` : ""}
        <h3 class="section-space">Your next moves</h3><div class="mission-steps">${s.next_actions.map((a, i) => hint(i + 1, e(a.title), e(a.detail), a.workspace)).join("")}</div>${s.questions.length ? `<details class="strategy-questions"><summary>Questions that would sharpen this strategy</summary><ul>${s.questions.map((q) => `<li>${e(q)}</li>`).join("")}</ul></details>` : ""}<p class="note">${e(r.citation_check)} Your agency makes the final decisions.</p><button class="btn" data-intent="followup">${icon("spark")} Refine with more context</button></section>`;
    }
    function context() {
      const c = ui.context();
      ui.modal(
        "The evidence behind your strategy",
        `<p>On your request, OpenAI receives your agency profile, your mission, a bounded selection of up to 12 relevant source records, and official research pathways.</p><dl class="context-list"><dt>Agency</dt><dd>${e(c.profile.agencyName || "Not yet defined")}</dd><dt>Program priorities</dt><dd>${e(c.profile.activities || "Set priorities in Agency profile")}</dd><dt>Research scope</dt><dd>${mode === "shortlist" ? "First eight saved opportunities that remain in the source snapshot, including selected imported notices." : "Relevant open and forecast records selected from the server’s source snapshot. Up to eight imported notices are also considered."}</dd><dt>Reviewed agency research</dt><dd>${(c.agencyResearch || []).length} reviewed public-source notes and the program brief. These explain agency context; they do not establish grant eligibility.</dd><dt>Follow-up context</dt><dd>Up to four messages from this strategy session. Strategies are kept in memory; export a brief to keep one.</dd></dl><p class="note">Budgets, application narratives, and your result library are not sent by this strategist. Use the proposal and reporting assistants to work with those specific records. No individual learner data.</p>`,
      );
    }
    document.addEventListener("input", (ev) => {
      if (ev.target.id === "missionPrompt") {
        mission = ev.target.value;
        ui.saveMission(mission);
      }
    });
    document.addEventListener("change", (ev) => {
      if (ev.target.id === "strategyMode") {
        mode = ev.target.value;
        ui.saveStrategyMode(mode);
      }
    });
    document.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-intent]");
      if (!b) return;
      if (b.dataset.intent === "suggest") {
        const s = suggestions.find((x) => x[0] === b.dataset.prompt);
        mission = s[2];
        ui.saveMission(mission);
        mode = s[0] === "shortlist" ? "shortlist" : "mission";
        ui.saveStrategyMode(mode);
        ui.render();
        document.querySelector("#missionPrompt")?.focus();
      }
      if (b.dataset.intent === "context") context();
      if (b.dataset.intent === "clear") {
        if (busy) return;
        mission = "";
        ui.saveMission(mission);
        history = [];
        result = null;
        error = "";
        ui.render();
        document.querySelector("#missionPrompt")?.focus();
      }
      if (b.dataset.intent === "followup") {
        mission = "";
        ui.saveMission(mission);
        ui.render();
        document.querySelector("#missionPrompt")?.focus();
        window.scrollTo({
          top: 0,
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
      }
      if (b.dataset.intent === "export" && result) {
        ui.download(
          "funding-strategy-review-draft.txt",
          `FUNDING STRATEGY — HUMAN REVIEW DRAFT\nGenerated: ${result.generated_at}\n\n${JSON.stringify(result.strategy, null, 2)}\n\n${result.citation_check}`,
        );
      }
    });
    document.addEventListener("submit", async (ev) => {
      if (ev.target.id !== "strategyForm") return;
      ev.preventDefault();
      if (busy) return;
      const c = ui.context(),
        prompt = mission.trim();
      if (mode === "shortlist" && !c.saved.length) {
        ui.toast(
          "Save an opportunity in Discover before comparing your shortlist.",
        );
        return;
      }
      if (!ui.ready()) return;
      busy = true;
      error = "";
      const sig = contextKey(),
        previous = result;
      result = null;
      ui.render();
      try {
        const response = await ui.request({
          task: "strategy",
          mission: prompt,
          mode,
          profile: c.profile,
          uses_achievedxp: c.usesAchieveDXP,
          agency_research: c.agencyResearch,
          program_brief: c.programBrief,
          opportunity_keys: c.saved.slice(0, 8),
          custom_opportunities: (mode === "shortlist"
            ? c.imports.filter((o) =>
                c.saved.slice(0, 8).includes(GrantCore.opportunityKey(o)),
              )
            : c.imports
          )
            .slice(0, 8)
            .map((o) => ({
              ...o,
              synopsis: (o.synopsis || "").slice(0, 4500),
            })),
          history: contextAtRequest === sig ? history : [],
        });
        if (
          response.task !== "strategy" ||
          response.requires_human_review !== true ||
          !response.strategy ||
          !Array.isArray(response.strategy.recommendations) ||
          !Array.isArray(response.strategy.next_actions) ||
          !Array.isArray(response.strategy.pathways) ||
          !Array.isArray(response.strategy.questions) ||
          !response.context
        )
          throw Error(
            "The service returned an unexpected strategy. No recommendations were accepted.",
          );
        if (sig !== contextKey())
          throw Error(
            "Agency context changed during analysis. Build the strategy again with your current profile.",
          );
        result = response;
        history = [
          ...(contextAtRequest === sig ? history : []),
          { role: "user", text: prompt },
          { role: "assistant", text: response.strategy.summary },
        ].slice(-4);
        contextAtRequest = sig;
      } catch (err) {
        error =
          err.name === "TimeoutError"
            ? "The strategy request timed out. Please try again."
            : err.message;
        result = previous;
      } finally {
        busy = false;
        if (ui.isActive()) ui.render();
      }
    });
    return {
      render,
      setMission(value) {
        mission = value;
        ui.saveMission(mission);
        mode = "mission";
        ui.saveStrategyMode(mode);
        result = null;
        history = [];
        error = "";
      },
    };
  },
};
