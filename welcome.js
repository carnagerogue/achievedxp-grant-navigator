/* Public welcome and accessible product tour. No synthetic grants, research or client results. */
window.NavigatorWelcome = {
  create(ui) {
    const { icon, button, esc: e } = ui;
    const stages = [
      {
        id: "agency",
        label: "Your agency",
        title: "Understand your agency.",
        description:
          "Start with the organization behind the application. Research its mission, programs and priorities, then choose the findings that belong in your plan.",
        action: "Identify my agency",
        heading: "What you’ll establish",
        items: [
          "The legal applicant",
          "Your education priorities",
          "The evidence you can build on",
        ],
      },
      {
        id: "research",
        label: "Research",
        title: "Build on what you can trust.",
        description:
          "Ask AI to research public agency sources. Open the citations, review the findings, and decide what should inform your funding strategy.",
        action: "Research my agency",
        heading: "What you’ll review",
        items: [
          "Mission, programs and priorities",
          "Public sources and their dates",
          "Findings you choose to use",
        ],
      },
      {
        id: "program",
        label: "Program",
        title: "Turn the need into a plan.",
        description:
          "Define who you want to serve, what you will deliver, and how you will measure progress. Let the program guide the funding search.",
        action: "Define my program",
        heading: "What you’ll shape",
        items: [
          "The need and the learners",
          "Activities, partners and timing",
          "Measures and sustainable delivery",
        ],
      },
      {
        id: "funding",
        label: "Funding",
        title: "Find a route worth pursuing.",
        description:
          "Explore federal notices and state, workforce and corporate funding routes. Use your agency context to question the fit before committing to an application.",
        action: "Build my funding strategy",
        heading: "What you’ll investigate",
        items: [
          "Relevant opportunities and sources",
          "Direct and partner application routes",
          "Eligibility questions still to resolve",
        ],
      },
      {
        id: "application",
        label: "Application",
        title: "Make the strongest case you can.",
        description:
          "Connect the funder’s requirements to your evidence. Develop the narrative with AI, review revisions, and keep the budget and submission work in view.",
        action: "Build my application plan",
        heading: "What you’ll prepare",
        items: [
          "Criteria connected to evidence",
          "A reviewed narrative and agency budget",
          "Owners, deadlines and submission tasks",
        ],
      },
      {
        id: "reporting",
        label: "Reporting",
        title: "Let the evidence carry forward.",
        description:
          "Select the aggregate measures that belong to each grant. Report against your commitments and use what you learn to strengthen the next application.",
        action: "Open outcomes & reporting",
        heading: "What you’ll carry forward",
        items: [
          "Grant-specific measures and periods",
          "Progress against application commitments",
          "Evidence for the next funding story",
        ],
      },
    ];
    let stageIndex = 0;
    const primary = () =>
      ui.hasAgency()
        ? "Continue my funding journey"
        : "Start my funding journey";
    function panel() {
      const s = stages[stageIndex];
      return `<div class="tour-content"><div class="tour-story"><span class="tour-number">${String(stageIndex + 1).padStart(2, "0")}</span><h2>${e(s.title)}</h2><p>${e(s.description)}</p><button type="button" class="welcome-link" data-launch-stage="${s.id}">${e(s.action)} ${icon("arrow")}</button></div><div class="tour-deliverables"><h3>${e(s.heading)}</h3><ol>${s.items.map((item, i) => `<li><span aria-hidden="true">${i + 1}</span>${e(item)}</li>`).join("")}</ol></div></div>`;
    }
    function render() {
      return `<div class="welcome-page"><header class="welcome-header"><a class="welcome-brand" href="#home" data-view="home">Grant Navigator<span>by AchieveDXP</span></a><nav aria-label="Welcome navigation"><button type="button" class="welcome-nav-link" data-welcome-scroll="welcomeTour">The journey</button><button type="button" class="welcome-nav-link" data-welcome-scroll="welcomeClients">For AchieveDXP clients</button>${button("Open workspace", "journey", "welcome-primary welcome-header-action")}</nav></header><main id="main" tabindex="-1"><section class="welcome-hero" aria-labelledby="welcomeTitle"><h1 id="welcomeTitle">Give education<br><span class="spectrum-text">a stronger future.</span></h1><p>Discover funding for correctional education. Build a stronger application—with AI that works from sources, agency research, and your evidence.</p><div class="welcome-actions">${button(e(primary()) + " " + icon("arrow"), "journey", "welcome-primary")}${button("Explore funding", "discover", "welcome-link")}</div></section><section id="welcomeTour" class="welcome-tour" aria-label="Explore the funding journey"><div class="welcome-tabs" role="tablist" aria-label="Funding journey preview">${stages.map((s, i) => `<button type="button" role="tab" id="tourTab-${s.id}" aria-controls="welcomeTourPanel" aria-selected="${i === stageIndex}" tabindex="${i === stageIndex ? "0" : "-1"}" data-tour-stage="${i}">${e(s.label)}</button>`).join("")}</div><div id="welcomeTourPanel" role="tabpanel" tabindex="0" aria-labelledby="tourTab-${stages[stageIndex].id}">${panel()}</div><p class="tour-footnote">Explore each step. Then make the plan your own.</p></section><section class="welcome-intelligence welcome-width" aria-labelledby="welcomeAI"><div class="welcome-section-intro"><h2 id="welcomeAI">Intelligence with<br><span class="spectrum-text">evidence</span> behind it.</h2><p>Research the agency. Question the fit. Strengthen the application. AI helps with the work while you stay in control of the decisions.</p>${button("Explore the AI workspace " + icon("arrow"), "intelligence", "welcome-link")}</div><div class="welcome-principles">${[
        [
          "search",
          "Research with sources",
          "Explore public agency context and inspect the links behind each finding.",
        ],
        [
          "edit",
          "Write from your evidence",
          "Develop the narrative around actual requirements, reviewed research and agency results.",
        ],
        [
          "check-square",
          "Review before you use it",
          "Choose findings, compare revisions and resolve the gaps before moving forward.",
        ],
      ]
        .map(
          ([i, t, d]) =>
            `<article>${icon(i)}<div><h3>${t}</h3><p>${d}</p></div></article>`,
        )
        .join(
          "",
        )}<p class="welcome-service-note">AI features require a connected service. Manual planning is always available.</p></div></section><section class="welcome-clients" id="welcomeClients" aria-labelledby="welcomeOutcomes"><div class="welcome-width"><div class="welcome-section-intro"><h2 id="welcomeOutcomes">Your learning outcomes.<br>Your next funding story.</h2><p>Already using AchieveDXP? Bring aggregate education measures into your applications and select the right evidence for each grant’s progress report.</p></div><div class="welcome-evidence"><ol><li>Learning evidence</li><li>${icon("arrow")}<span>Application criteria</span></li><li>${icon("arrow")}<span>Grant reporting</span></li></ol>${button("Open outcomes & reporting " + icon("arrow"), "outcomes", "welcome-link")}<p class="welcome-service-note">Import agency-approved exports. Keep learner-level records out of the workspace.</p></div></div></section><section class="welcome-close"><h2>Start with your agency. Build from there.</h2>${button(e(primary()), "journey", "welcome-primary")}</section></main><footer class="welcome-footer"><a href="#home" data-view="home">Grant Navigator <span>by AchieveDXP</span></a><div><a href="privacy.html">Privacy</a>${button("Sources & connections", "sources", "welcome-link")}</div></footer></div>`;
    }
    function select(index, { focus = false } = {}) {
      stageIndex = (index + stages.length) % stages.length;
      const panelEl = document.getElementById("welcomeTourPanel");
      if (!panelEl) return;
      document.querySelectorAll("[data-tour-stage]").forEach((b, i) => {
        b.setAttribute("aria-selected", String(i === stageIndex));
        b.tabIndex = i === stageIndex ? 0 : -1;
        if (focus && i === stageIndex) b.focus();
      });
      panelEl.setAttribute(
        "aria-labelledby",
        "tourTab-" + stages[stageIndex].id,
      );
      panelEl.innerHTML = panel();
    }
    document.addEventListener("click", (ev) => {
      const b = ev.target.closest(
        "[data-tour-stage],[data-launch-stage],[data-welcome-scroll]",
      );
      if (!b) return;
      if (b.dataset.tourStage !== undefined)
        select(Number(b.dataset.tourStage));
      if (b.dataset.launchStage) ui.launch(b.dataset.launchStage);
      if (b.dataset.welcomeScroll) {
        const el = document.getElementById(b.dataset.welcomeScroll);
        el?.scrollIntoView({
          block: "start",
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
      }
    });
    document.addEventListener("keydown", (ev) => {
      if (!ev.target.matches("[data-tour-stage]")) return;
      const next = {
        ArrowRight: stageIndex + 1,
        ArrowLeft: stageIndex - 1,
        Home: 0,
        End: stages.length - 1,
      }[ev.key];
      if (next === undefined) return;
      ev.preventDefault();
      select(next, { focus: true });
    });
    return { render };
  },
};
