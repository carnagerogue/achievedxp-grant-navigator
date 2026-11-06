/* GitHub Pages compatible application. All agency data stays in this browser unless explicitly exported or sent for AI analysis. */
(() => {
  "use strict";
  if (location.hash.startsWith("#plan=")) {
    location.replace("legacy.html" + location.hash);
    return;
  }
  const C = GrantCore,
    S = NavigatorState,
    M = GrantMatching,
    T = OpportunityTools;
  const $ = (s, root = document) => root.querySelector(s),
    $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const plain = (v) => {
    const t = document.createElement("textarea");
    t.innerHTML = String(v || "").replace(/<[^>]*>/g, "");
    return t.value;
  };
  const fmt = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(n) || 0);
  const date = (v) => {
    const d = C.dateOnly(v);
    return d
      ? new Date(d + "T12:00:00Z").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        })
      : "Verify in notice";
  };
  const key = (o) => C.opportunityKey(o);
  const icons = {
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    path: '<circle cx="12" cy="4" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 6v5M5 17v-3l7-3 7 3v3"/>',
    pipeline: '<path d="m3 7 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 17l9 5 9-5"/>',
    doc: '<path d="M5 3h9l5 5v13H5ZM14 3v6h5M8 13h8M8 17h6"/>',
    agency: '<path d="m3 8 9-5 9 5H3Zm2 3v7m5-7v7m4-7v7m5-7v7M3 21h18"/>',
    link: '<path d="m10 7 2-2a5 5 0 0 1 7 7l-3 3m-2 2-2 2a5 5 0 0 1-7-7l3-3m1 6 6-6"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    external: '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
    edit: '<path d="m16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5"/>',
    "check-square":
      '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m7 12 3 3 7-7"/>',
    save: '<path d="M6 3h12v18l-6-4-6 4V3Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    chart: '<path d="M4 3v18h17M8 16v-5m5 5V7m5 9V4"/>',
    spark:
      '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  };
  const icon = (name) =>
    '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
    (icons[name] || icons.doc) +
    "</svg>";
  const navs = [
    ["home", "Welcome", "agency"],
    ["journey", "Funding journey", "path"],
    ["intelligence", "Intelligence", "spark"],
    ["discover", "Discover", "search"],
    ["pathways", "Funding pathways", "path"],
    ["pipeline", "Application pipeline", "pipeline"],
    ["workbench", "Proposal workbench", "doc"],
    ["outcomes", "Outcomes & reporting", "chart"],
    ["profile", "Agency profile", "agency"],
    ["sources", "Sources & connections", "link"],
  ];
  const goalLabels = {
    ged: "Adult education & literacy",
    cte: "Career training & credentials",
    postsec: "Postsecondary education",
    reentry: "Reentry & employment",
    digital: "Digital learning",
    sud: "Recovery & treatment",
    sel: "Life skills & mentoring",
    juv_ed: "Youth education",
  };
  const stages = {
    research: "Research",
    prepare: "Preparing",
    submitted: "Submitted",
    awarded: "Awarded",
    declined: "Not awarded",
  };
  const requirementNames = {
    applicant: "Applicant eligibility",
    geography: "Geography & learner population",
    activities: "Allowable activities",
    match: "Match & financial rules",
    deadline: "Deadline & submission rules",
    partners: "Partner requirements",
  };
  let state,
    loadError = "",
    feed = {
      opportunities: [],
      awards: [],
      foundations: [],
      saa: { states: {} },
    },
    feedLoading = true;
  try {
    const raw = JSON.parse(localStorage.getItem(S.KEY) || "{}");
    state = S.clean(raw);
    state.results = S.cleanResults(raw.results);
    state.usesAchieveDXP = raw.usesAchieveDXP === true;
    state.connection = validEndpoint(raw.connection) || "";
    if (state.imports.length) state.imports = T.normalizeImport(state.imports);
  } catch (e) {
    state = S.clean();
    state.results = [];
    loadError =
      "Saved data could not be fully loaded. Import a workspace backup to restore it.";
  }
  let view = navs.some((n) => n[0] === location.hash.slice(1))
      ? location.hash.slice(1)
      : "home",
    selected = "",
    workKey = "",
    workTab = "qualify",
    search = "",
    category = "",
    status = "active",
    scope = "focused",
    browse = "all",
    pageNum = 1,
    compare = new Set(),
    reportPeriod = "",
    reportKey = "";
  let ai = { busy: false, result: null, error: "", task: "", fingerprint: "" },
    connectionCode = "",
    connectionStatus = "",
    aiIncludeBudget = false,
    saveTimer,
    toastTimer,
    revisionRequest = "",
    reportBusy = false,
    reportAnalysis = null;
  function validEndpoint(v) {
    if (!v) return "";
    try {
      const u = new URL(v);
      if (
        u.protocol !== "https:" ||
        u.username ||
        u.password ||
        u.search ||
        u.hash
      )
        return "";
      return u.origin + u.pathname.replace(/\/$/, "");
    } catch (_) {
      return "";
    }
  }
  function toast(message) {
    const e = $("#toast");
    e.textContent = message;
    e.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => e.classList.remove("show"), 4200);
  }
  function save(message) {
    state.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(S.KEY, JSON.stringify(state));
      if (message) toast(message);
      return true;
    } catch (_) {
      toast(
        "Browser storage is full or unavailable. Export your workspace now to keep these changes.",
      );
      return false;
    }
  }
  function records() {
    return [...feed.opportunities, ...state.imports];
  }
  function record(k) {
    const current = records().find((o) => key(o) === k);
    if (current) return current;
    const prior = state.snapshots[k];
    return prior
      ? {
          ...prior,
          status:
            C.opportunityStatus(prior) === "closed" ? "closed" : "unknown",
          retained_snapshot: true,
        }
      : undefined;
  }
  function preserveNotice(k) {
    const o = records().find((o) => key(o) === k);
    if (o)
      state.snapshots[k] = S.cleanSnapshots({
        [k]: {
          ...o,
          saved_snapshot_at: feed.last_synced_at || new Date().toISOString(),
        },
      })[k];
  }
  function application(k = workKey) {
    if (!state.applications[k]) state.applications[k] = S.cleanApplication();
    state.applications[k].reportResultIds ||= [];
    return state.applications[k];
  }
  function profile() {
    return {
      ...state.profile,
      goals: state.profile.goals.length
        ? state.profile.goals
        : ["ged", "cte", "postsec", "reentry", "digital"],
      activities: state.profile.activities ? [state.profile.activities] : [],
    };
  }
  function textInput(name, value, options = {}) {
    return (
      '<input name="' +
      esc(name) +
      '" value="' +
      esc(value) +
      '" ' +
      (options.type ? 'type="' + esc(options.type) + '"' : "") +
      " " +
      (options.required ? "required" : "") +
      " " +
      (options.max ? 'maxlength="' + options.max + '"' : "") +
      " " +
      (options.placeholder
        ? 'placeholder="' + esc(options.placeholder) + '"'
        : "") +
      ">"
    );
  }
  function field(label, content, help = "") {
    return (
      '<div class="field"><label>' +
      esc(label) +
      content +
      "</label>" +
      (help ? "<small>" + esc(help) + "</small>" : "") +
      "</div>"
    );
  }
  function options(items, value) {
    return items
      .map(
        ([v, t]) =>
          '<option value="' +
          esc(v) +
          '" ' +
          (v === value ? "selected" : "") +
          ">" +
          esc(t) +
          "</option>",
      )
      .join("");
  }
  function button(label, action, cls = "", extra = "") {
    return (
      '<button class="btn ' +
      cls +
      '" data-action="' +
      action +
      '" ' +
      extra +
      ">" +
      label +
      "</button>"
    );
  }
  function external(url, label, cls = "btn small") {
    return C.safeUrl(url)
      ? '<a class="' +
          cls +
          '" href="' +
          esc(C.safeUrl(url)) +
          '" target="_blank" rel="noopener noreferrer">' +
          esc(label) +
          " " +
          icon("external").replace("<svg ", '<svg class="external-icon" ') +
          "</a>"
      : "";
  }
  function heading(title, sub, actions = "") {
    return (
      '<div class="page-heading"><div><h1>' +
      title +
      '</h1><p class="subtitle">' +
      sub +
      "</p></div>" +
      (actions ? '<div class="actions">' + actions + "</div>" : "") +
      "</div>"
    );
  }
  function empty(title, desc, action = "") {
    return (
      '<div class="empty"><h2>' +
      esc(title) +
      "</h2><p>" +
      esc(desc) +
      "</p>" +
      action +
      "</div>"
    );
  }
  function navigate(next) {
    if (!navs.some((n) => n[0] === next)) return;
    $("#modal")?.close();
    view = next;
    history.replaceState(null, "", "#" + next);
    render();
    $("#main")?.focus({ preventScroll: true });
    window.scrollTo({
      top: 0,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  function render() {
    if (view === "home") {
      $("#app").innerHTML = welcome.render();
      return;
    }
    const current = navs.find((n) => n[0] === view);
    $("#app").innerHTML =
      '<div class="layout"><aside class="sidebar"><a href="#home" data-view="home" class="brand" aria-label="Grant Navigator home"><img class="achievedxp-wordmark" src="assets/achievedxp-logo.png" alt="AchieveDXP" width="859" height="160"><small>Grant Navigator</small></a>' +
      button(icon("menu") + "<span>Menu</span>", "menu", "mobile-menu") +
      '<nav class="nav" aria-label="Main navigation">' +
      navs
        .filter(([v]) => v !== "home")
        .map(
          ([v, label, i]) =>
            '<button data-view="' +
            v +
            '" class="' +
            (view === v ? "active" : "") +
            '" ' +
            (view === v ? 'aria-current="page"' : "") +
            ">" +
            icon(i) +
            esc(label) +
            "</button>",
        )
        .join("") +
      '</nav><div class="sidebar-bottom"><p class="sidebar-note">Saved on this device.<br>' +
      (state.updatedAt
        ? "Last saved " +
          esc(new Date(state.updatedAt).toLocaleDateString("en-US"))
        : "Export a backup to take your work with you.") +
      '<br><a href="privacy.html">Privacy</a></p></div></aside><div class="main-shell"><header class="topbar"><div class="crumb">Workspace &nbsp; / &nbsp; <strong>' +
      esc(current[1]) +
      '</strong></div><div class="top-meta"><span class="dot"></span>' +
      esc(
        state.profile.stateCode
          ? state.profile.stateCode +
              " · " +
              (state.profile.agencyName || "Agency workspace")
          : "Nationwide coverage",
      ) +
      button(
        icon("search") + "<kbd>⌘ K</kbd>",
        "command",
        "command-trigger",
        'aria-label="Search or enter a command"',
      ) +
      '</div></header><main id="main" class="page" tabindex="-1">' +
      (loadError ? '<div class="alert">' + esc(loadError) + "</div>" : "") +
      (view !== "journey" && state.journey.identityConfirmed
        ? '<div class="journey-return"><span>Your funding journey · ' +
          esc(state.profile.agencyName) +
          "</span>" +
          button("Return to guided plan", "journey", "text-button") +
          "</div>"
        : "") +
      {
        journey: () => journey.render(),
        intelligence: () => intelligence.render(),
        discover: discovery,
        pathways: pathways,
        pipeline: pipeline,
        workbench: workbench,
        outcomes: outcomes,
        profile: profilePage,
        sources: sources,
      }[view]() +
      "</main></div></div>";
  }
  function focused(o, a) {
    return (
      a.corrections ||
      /adult (education|literacy)|literacy|workforce (development|training)|reentry|re-entry|apprenticeship|career (pathways|training)|distance learning|juvenile (mentoring|education)/i.test(
        plain(o.title) + " " + plain(o.synopsis).slice(0, 1500),
      )
    );
  }
  function filtered() {
    return records()
      .map((o) => ({
        record: o,
        assessment: M.assess(o, profile(), state.applications[key(o)]),
      }))
      .filter(({ record: o, assessment: a }) => {
        const st = C.opportunityStatus(o),
          q = search.toLowerCase().trim().split(/\s+/).filter(Boolean),
          txt = plain(
            [o.title, o.agency, o.synopsis, o.cfda].join(" "),
          ).toLowerCase();
        return (
          (!category || (o.source_kind || "federal") === category) &&
          (!status ||
            (status === "active" && ["open", "forecast"].includes(st)) ||
            st === status) &&
          (scope !== "focused" || focused(o, a)) &&
          (scope !== "state" ||
            !o.states?.length ||
            o.states.includes(state.profile.stateCode)) &&
          (browse !== "saved" || state.saved.includes(key(o))) &&
          q.every((w) => txt.includes(w))
        );
      })
      .sort(M.compare);
  }
  function discovery() {
    const list = filtered(),
      shown = list.slice((pageNum - 1) * 12, pageNum * 12);
    if (pageNum > 1 && !shown.length) {
      pageNum = 1;
      return discovery();
    }
    return (
      heading(
        "Find the funding.<br>Change what’s possible.",
        "A funding workspace built for correctional education.",
        button("Add opportunity", "import"),
      ) +
      '<div class="onboarding-band"><div><h3>' +
      esc(
        state.profile.agencyName
          ? state.profile.agencyName + " · your funding priorities"
          : "Start with your agency’s priorities",
      ) +
      "</h3><p>" +
      esc(
        state.profile.goals.length
          ? state.profile.goals.map((g) => goalLabels[g]).join(" · ")
          : "Match the mission, establish the applicant route, and build the evidence.",
      ) +
      "</p></div>" +
      button(
        state.profile.agencyName
          ? "Edit agency profile " + icon("arrow")
          : "Set up agency profile " + icon("arrow"),
        "profile",
        "primary",
      ) +
      "</div>" +
      '<div class="toolbar"><div class="field search-field"><label for="search">Search funding notices</label><div class="search-wrap">' +
      icon("search") +
      '<input id="search" value="' +
      esc(search) +
      '" placeholder="Search education, reentry, workforce…" type="search"></div></div>' +
      field(
        "Funding source",
        '<select id="category">' +
          options(
            [
              ["", "All sources"],
              ["federal", "Federal"],
              ["state", "State"],
              ["workforce", "Workforce"],
              ["corporate", "Corporate / foundation"],
            ],
            category,
          ) +
          "</select>",
      ) +
      field(
        "Opportunity status",
        '<select id="status">' +
          options(
            [
              ["active", "Open & forecast"],
              ["open", "Open"],
              ["forecast", "Forecast"],
              ["closed", "Closed"],
              ["", "All statuses"],
            ],
            status,
          ) +
          "</select>",
      ) +
      field(
        "Research scope",
        '<select id="scope">' +
          options(
            [
              ["focused", "DOC & education"],
              ["all", "Full research pool"],
              ["state", "My state / nationwide"],
            ],
            scope,
          ) +
          "</select>",
      ) +
      "</div>" +
      '<div class="tabs" role="tablist" aria-label="Opportunity views"><button data-browse="all" role="tab" aria-selected="' +
      (browse === "all") +
      '">Opportunities <span class="count">' +
      list.length +
      '</span></button><button data-browse="saved" role="tab" aria-selected="' +
      (browse === "saved") +
      '">Saved <span class="count">' +
      state.saved.length +
      '</span></button><button data-action="compare" role="tab" aria-selected="false">Compare <span class="count">' +
      compare.size +
      "</span></button></div>" +
      '<div class="discovery-grid"><section class="results" aria-label="Funding opportunities"><div class="list-header"><span>' +
      (feedLoading
        ? "Loading official source snapshot…"
        : list.length + " results · ordered by explained research priority") +
      "</span><span>No eligibility assumed</span></div>" +
      (shown.length
        ? shown.map(({ record: o, assessment: a }) => recordRow(o, a)).join("")
        : empty(
            feedLoading
              ? "Searching the source snapshot…"
              : "No records in this view",
            category === "state" || category === "corporate"
              ? "Explore funding pathways for official state and corporate sources, then add a current notice to your workspace."
              : "Try a broader search or scope. Eligibility still requires the current notice.",
            button("Explore funding pathways", "pathways", "primary"),
          )) +
      (list.length > 12
        ? '<div class="pagination">' +
          button(
            "← Previous",
            "previous",
            "small",
            pageNum === 1 ? "disabled" : "",
          ) +
          '<span class="quiet">Page ' +
          pageNum +
          " of " +
          Math.ceil(list.length / 12) +
          "</span>" +
          button(
            "Next →",
            "next",
            "small",
            pageNum * 12 >= list.length ? "disabled" : "",
          ) +
          "</div>"
        : "") +
      "</section>" +
      inspector() +
      "</div>" +
      sourceStrip()
    );
  }
  function recordRow(o, a) {
    const k = key(o),
      saved = state.saved.includes(k),
      st = C.opportunityStatus(o);
    return (
      '<article class="opportunity ' +
      (selected === k ? "selected" : "") +
      '" data-record="' +
      esc(k) +
      '"><div class="record-top"><span class="category">' +
      esc(o.source_kind || "federal") +
      " / " +
      esc(
        o.source === "agency_import" ? "agency-entered notice" : "Grants.gov",
      ) +
      '</span><span class="status ' +
      st +
      '">' +
      (st === "open"
        ? "Open for applications"
        : st === "forecast"
          ? "Forecast"
          : st === "closed"
            ? "Closed"
            : "Confirm status") +
      '</span></div><button class="title-button" data-select="' +
      esc(k) +
      '">' +
      esc(plain(o.title)) +
      '</button><p class="agency">' +
      esc(plain(o.agency || "See official notice")) +
      '</p><div class="facts"><span>Closes <b>' +
      esc(date(o.close_date)) +
      "</b></span>" +
      (o.award_ceiling > 0
        ? "<span>Ceiling <b>" + fmt(o.award_ceiling) + "</b></span>"
        : "") +
      '</div><div class="match-line">' +
      icon("path") +
      "<span>" +
      esc(a.label) +
      (a.corrections ? " · corrections / reentry mentioned" : "") +
      '</span></div><div class="row-actions">' +
      button(
        icon(saved ? "check" : "save") +
          (saved ? " Saved" : " Save opportunity"),
        "save",
        "small",
        'data-key="' + esc(k) + '" aria-pressed="' + saved + '"',
      ) +
      '<label class="check-label"><input type="checkbox" data-compare="' +
      esc(k) +
      '" ' +
      (compare.has(k) ? "checked" : "") +
      "> Compare</label>" +
      button(
        "Review " + icon("arrow"),
        "review",
        "small subtle",
        'data-key="' + esc(k) + '"',
      ) +
      "</div></article>"
    );
  }
  function inspector() {
    const o = record(selected);
    if (!o)
      return (
        '<aside class="inspector"><h2>Build the case<br>before you apply.</h2><div class="steps">' +
        [
          [
            "Confirm the applicant route",
            "Establish whether your agency applies directly or with an eligible partner.",
          ],
          [
            "Match the program to the notice",
            "Connect the funder’s objectives to a defined education program.",
          ],
          [
            "Collect evidence for every criterion",
            "Use agency results, source requirements, and a defensible budget.",
          ],
        ]
          .map(
            (s, i) =>
              '<div class="step"><span class="step-number">0' +
              (i + 1) +
              "</span><div><h3>" +
              s[0] +
              "</h3><p>" +
              s[1] +
              "</p></div></div>",
          )
          .join("") +
        "</div>" +
        button(
          "Open proposal workbench " + icon("arrow"),
          "workbench",
          "primary full",
        ) +
        '<div class="divider"></div><h3>Already using AchieveDXP?</h3><p class="quiet">Turn aggregate education results into application evidence and grant progress reports.</p>' +
        button("Explore outcomes & reporting", "outcomes", "subtle") +
        "</aside>"
      );
    const a = M.assess(o, profile(), state.applications[key(o)]);
    return (
      '<aside class="inspector reveal"><div class="panel-title"><span class="category">Opportunity brief</span>' +
      button(
        icon("close"),
        "close-inspector",
        "small",
        'aria-label="Close opportunity brief"',
      ) +
      "</div><h2>" +
      esc(plain(o.title)) +
      '</h2><div class="tag-row"><span class="tag">' +
      esc(o.opp_number || o.source_id) +
      "</span>" +
      (o.cfda ? '<span class="tag">ALN ' + esc(o.cfda) + "</span>" : "") +
      '</div><h3>Why review this?</h3><ul class="details-list">' +
      (a.reasons.length
        ? a.reasons
        : ["Limited program alignment in the supplied source."]
      )
        .map((r) => "<li>" + esc(r) + "</li>")
        .join("") +
      '</ul><h3>Before you commit</h3><ul class="details-list">' +
      a.missing.map((r) => "<li>" + esc(r) + "</li>").join("") +
      "</ul>" +
      (a.urgency ? '<div class="alert">' + esc(a.urgency) + "</div>" : "") +
      '<details><summary>Read source synopsis</summary><div class="source-excerpt">' +
      esc(
        plain(
          o.synopsis || "No synopsis supplied. Review the official notice.",
        ),
      ) +
      '</div></details><div class="divider"></div><div class="actions">' +
      external(o.source_url, "Official notice") +
      button(
        "Build application " + icon("arrow"),
        "review",
        "primary",
        'data-key="' + esc(key(o)) + '"',
      ) +
      '</div><p class="note section-space">Source snapshot ' +
      esc(
        date(
          (
            feed.source_health?.grants_gov?.last_success_at ||
            feed.last_synced_at ||
            ""
          ).slice(0, 10),
        ),
      ) +
      ". A ceiling is not an expected award. Confirm amendments, cutoffs, and eligibility.</p></aside>"
    );
  }
  function sourceStrip() {
    return (
      '<div class="source-strip">' +
      icon("link") +
      "<span>" +
      feed.opportunities.length.toLocaleString() +
      " federal / workforce records in the broad pool · " +
      (feed.awards || []).length +
      " historical awards · " +
      Object.keys(feed.saa?.states || {}).length +
      " state / territory office entries. State and corporate pathways require notice research.</span>" +
      button("Source details", "sources", "small subtle") +
      "</div>"
    );
  }
  function pathways() {
    const allgoals = Object.keys(goalLabels),
      routes = M.routes({ goals: allgoals }),
      stateOffice = feed.saa?.states?.[state.profile.stateCode];
    return (
      heading(
        "Find the route<br>others overlook.",
        "Direct grants are one route. State pass-through funding and eligible education, workforce, or nonprofit partners can open others.",
      ) +
      '<div class="onboarding-band"><div><h3>Build a funding strategy around the program.</h3><p>Separate eligible costs and document each funder’s rules. Never charge the same cost to two awards.</p></div>' +
      button("Add a current notice", "import", "primary") +
      "</div>" +
      routes
        .map(
          (r, i) =>
            '<article class="pathway"><span class="pathway-number">' +
            String(i + 1).padStart(2, "0") +
            '</span><div><span class="category">' +
            esc(r.category) +
            " · research pathway</span><h2>" +
            esc(r.title) +
            "</h2><p>" +
            esc(r.path) +
            "</p><details><summary>Partner route & evidence to collect</summary><p><strong>Potential partner:</strong> " +
            esc(r.partner) +
            "</p><p><strong>Deciding question:</strong> " +
            esc(r.question) +
            "</p><p><strong>Evidence:</strong> " +
            esc(r.evidence) +
            '</p></details></div><div class="actions">' +
            external(r.url, "Research source") +
            "</div></article>",
        )
        .join("") +
      '<section class="panel section-space"><h2>Your state’s justice funding route</h2><p class="quiet">State office directory entries are research contacts, not current funding announcements. Directory date: ' +
      esc(feed.saa?._last_verified || "Not supplied") +
      ".</p>" +
      (stateOffice
        ? "<h3>" +
          esc(stateOffice.name) +
          "</h3><p>" +
          esc(stateOffice.agency) +
          '</p><p class="quiet">' +
          (stateOffice.verify
            ? "Directory entry needs confirmation."
            : "Confirm the current administering office and competition.") +
          "</p>" +
          external(stateOffice.url, "Open state office")
        : button("Choose your state", "profile", "primary")) +
      "</section>"
    );
  }
  function pipeline() {
    const saved = state.saved.map((k) => ({
      k,
      o: record(k),
      a: application(k),
    }));
    return (
      heading(
        "Move the right<br>applications forward.",
        "Give every opportunity an owner, a next action, and an honest stage.",
        button("Export workspace", "export-workspace") +
          button("Find opportunities", "discover", "primary"),
      ) +
      '<div class="metrics"><div class="metric"><strong>' +
      saved.length +
      '</strong><span>Saved opportunities</span></div><div class="metric"><strong>' +
      saved.filter((x) => x.a.stage === "prepare").length +
      '</strong><span>Applications in preparation</span></div><div class="metric"><strong>' +
      saved.filter((x) => x.a.stage === "submitted").length +
      '</strong><span>Agency-reported submissions</span></div><div class="metric"><strong>' +
      saved.filter((x) => x.a.stage === "awarded").length +
      "</strong><span>Agency-reported awards</span></div></div>" +
      (saved.length
        ? '<div class="pipeline">' +
          Object.entries(stages)
            .map(
              ([stage, label]) =>
                '<section class="column"><div class="column-head"><span>' +
                label +
                "</span><span>" +
                saved.filter((x) => x.a.stage === stage).length +
                "</span></div>" +
                saved
                  .filter((x) => x.a.stage === stage)
                  .map(
                    ({ k, o, a }) =>
                      '<article class="pipeline-card"><h3>' +
                      esc(
                        plain(o?.title || "Source record no longer in feed"),
                      ) +
                      "</h3><p>" +
                      esc(a.owner || "Assign an owner") +
                      "<br>" +
                      esc(
                        a.internalDueDate
                          ? "Internal due " + date(a.internalDueDate)
                          : "Set an internal due date",
                      ) +
                      "</p><p>" +
                      esc(
                        a.nextAction ||
                          "Define the next action in the workbench.",
                      ) +
                      '</p><label>Application stage<select data-stage="' +
                      esc(k) +
                      '">' +
                      options(Object.entries(stages), stage) +
                      "</select></label>" +
                      button(
                        "Open application →",
                        "review",
                        "small subtle",
                        'data-key="' + esc(k) + '"',
                      ) +
                      "</article>",
                  )
                  .join("") +
                "</section>",
            )
            .join("") +
          "</div>"
        : empty(
            "Your next award starts with a considered shortlist.",
            "Save an opportunity from Discover, then use the workbench to qualify it and build the application.",
            button("Discover opportunities", "discover", "primary"),
          )) +
      '<p class="note">Stages and awards are reported by your agency. Saving a record or marking a task complete does not establish eligibility or an award.</p>'
    );
  }
  function workbench() {
    const saved = state.saved.map((k) => ({ k, o: record(k) }));
    if (!saved.some((x) => x.k === workKey)) workKey = saved[0]?.k || "";
    const o = record(workKey);
    return (
      heading(
        "A stronger story. Built on evidence.",
        "An intelligent writing partner. Your agency stays in control.",
        button(
          "Export application",
          "export-application",
          "",
          workKey ? "" : "disabled",
        ),
      ) +
      (saved.length
        ? '<div class="workbench-select"><label class="full">Selected opportunity<select id="workOpportunity">' +
          options(
            saved.map(({ k, o }) => [
              k,
              plain(o?.title || "Unavailable source · " + k),
            ]),
            workKey,
          ) +
          "</select></label></div>" +
          (!o || o.retained_snapshot
            ? '<div class="alert">This notice is no longer in the current source feed. Your saved notice and application work are retained for reporting. Confirm the current official notice before applying or requesting AI analysis.</div>'
            : "") +
          '<div class="tabs work-tabs" role="tablist" aria-label="Application workflow">' +
          [
            ["qualify", "Qualify"],
            ["criteria", "Evidence & criteria"],
            ["write", "Write"],
            ["budget", "Budget"],
            ["submit", "Submit"],
          ]
            .map(
              ([id, label], i) =>
                '<button role="tab" data-work-tab="' +
                id +
                '" aria-selected="' +
                (workTab === id) +
                '"><span>0' +
                (i + 1) +
                "</span> " +
                label +
                "</button>",
            )
            .join("") +
          '</div><div class="two-column"><section class="panel">' +
          {
            qualify: qualify,
            criteria: criteria,
            write: write,
            budget: budget,
            submit: submission,
          }[workTab](application(), o) +
          "</section>" +
          aiPanel(o) +
          "</div>"
        : empty(
            "Choose a real opportunity to begin.",
            "The workbench ties eligibility, review criteria, your draft, and budget to one specific notice.",
            button("Find and save an opportunity", "discover", "primary"),
          ))
    );
  }
  function appField(label, name, value, type = "text", help = "") {
    return field(
      label,
      '<input data-app="' +
        name +
        '" type="' +
        type +
        '" value="' +
        esc(value || "") +
        '" ' +
        (type === "text" ? 'maxlength="1000"' : "") +
        ">",
      help,
    );
  }
  function qualify(a, o) {
    return (
      '<h2>Make the go / no-go decision.</h2><p class="quiet">Record what the notice establishes before investing in a full proposal. Assessed requirements need a quote and source.</p><div class="form-grid">' +
      field(
        "Applicant route",
        '<select data-app="route">' +
          options(
            [
              ["unknown", "Not yet established"],
              ["direct", "Direct application — agency reviewed"],
              ["partner", "Partner-led application — agency reviewed"],
              ["not_eligible", "Not eligible — agency reviewed"],
            ],
            a.route,
          ) +
          "</select>",
      ) +
      appField("Lead partner (if required)", "partner", a.partner) +
      appField("Application owner", "owner", a.owner) +
      appField(
        "Internal due date",
        "internalDueDate",
        a.internalDueDate,
        "date",
      ) +
      "</div>" +
      field(
        "Next action",
        '<textarea data-app="nextAction" maxlength="1000">' +
          esc(a.nextAction) +
          "</textarea>",
      ) +
      "<details><summary>Document the six eligibility checks</summary>" +
      Object.entries(requirementNames)
        .map(
          ([id, title]) =>
            '<div class="review-line"><strong>' +
            title +
            '</strong><select data-requirement="' +
            id +
            '" data-prop="status" aria-label="' +
            title +
            ' assessment">' +
            options(
              [
                ["unknown", "Unconfirmed"],
                ["met", "Supported"],
                ["not_met", "Not met"],
              ],
              a.requirements[id].status,
            ) +
            '</select><div class="full-row"><label>Source quote<textarea data-requirement="' +
            id +
            '" data-prop="evidence" maxlength="2000">' +
            esc(a.requirements[id].evidence) +
            '</textarea></label><label>Official source URL<input type="url" data-requirement="' +
            id +
            '" data-prop="url" value="' +
            esc(a.requirements[id].url || o?.source_url || "") +
            '"></label></div></div>',
        )
        .join("") +
      '</details><div class="divider"></div><h3>Give AI the full context.</h3><p class="quiet">Paste the public notice’s eligibility and review criteria. Include amendments and exact section references. Do not include learner records or sensitive information.</p>' +
      field(
        "Official notice or application guide URL",
        '<input type="url" data-notice="url" value="' +
          esc(a.notice.url || "") +
          '" placeholder="https://…">',
      ) +
      appField("Source section reference", "notice.section", a.notice.section) +
      field(
        "Public notice excerpt",
        '<textarea data-notice="text" maxlength="24000" placeholder="Paste eligibility requirements, scored criteria, deadlines, and restrictions…">' +
          esc(a.notice.text) +
          "</textarea>",
      ) +
      '<div class="actions">' +
      (o ? external(o.source_url, "Open official source") : "") +
      button("Continue to evidence " + icon("arrow"), "criteria", "primary") +
      "</div>"
    );
  }
  function criteria(a) {
    const c = S.coverage(a);
    return (
      '<div class="panel-title"><div><h2>The case you need to prove.</h2><p class="quiet">Add the exact review criteria from the current notice. Points are funder weights, never an AI prediction.</p></div></div><div class="coverage"><span>' +
      c.evidenced +
      " / " +
      c.total +
      ' criteria with a source and agency evidence</span><span class="progress"><i style="width:' +
      (c.total ? (c.evidenced / c.total) * 100 : 0) +
      '%"></i></span></div>' +
      (a.criteria.length
        ? a.criteria
            .map(
              (r, i) =>
                '<article class="criterion"><div class="criterion-top"><label>Review criterion<input data-criterion="' +
                i +
                '" data-prop="title" value="' +
                esc(r.title) +
                '" maxlength="250" placeholder="Exact criterion from the notice"></label><label>Points<input type="number" min="0" max="100" data-criterion="' +
                i +
                '" data-prop="points" value="' +
                esc(r.points) +
                '"></label>' +
                button(
                  "Remove",
                  "remove-criterion",
                  "small danger",
                  'data-index="' + i + '"',
                ) +
                '</div><div class="form-grid">' +
                field(
                  "Funder’s requirement",
                  '<textarea data-criterion="' +
                    i +
                    '" data-prop="requirement" maxlength="4000" placeholder="Paste the requirement and section reference">' +
                    esc(r.requirement) +
                    "</textarea>",
                ) +
                field(
                  "Agency evidence",
                  '<textarea data-criterion="' +
                    i +
                    '" data-prop="evidence" maxlength="6000" placeholder="Baseline, method, reporting period, source…">' +
                    esc(r.evidence) +
                    "</textarea>",
                ) +
                "</div>" +
                field(
                  "Requirement source URL",
                  '<input type="url" data-criterion="' +
                    i +
                    '" data-prop="url" value="' +
                    esc(r.url) +
                    '" placeholder="https://…">',
                ) +
                "<details><summary>Write a response to this criterion</summary>" +
                field(
                  "Criterion response",
                  '<textarea data-criterion="' +
                    i +
                    '" data-prop="draft" maxlength="8000">' +
                    esc(r.draft) +
                    "</textarea>",
                ) +
                "</details></article>",
            )
            .join("")
        : empty(
            "Start with the funder’s rubric.",
            "Each row connects a requirement, its official source, your agency evidence, and the response.",
          )) +
      '<div class="actions section-space">' +
      button("+ Add review criterion", "add-criterion", "primary") +
      button("Use program results", "attach-results") +
      '</div><p class="note section-space">Coverage follows evidence, not confidence. A completed row does not confirm the accuracy or quality of its content.</p>'
    );
  }
  function write(a) {
    return (
      '<div class="panel-title"><div><h2>Application narrative</h2><p class="quiet">Draft your application here. AI uses the notice, mapped criteria, and evidence you choose to include.</p></div><span class="save-state">Saved as you edit</span></div><label>Application narrative<textarea class="draft" data-app="narrative" maxlength="24000" placeholder="Explain the unmet education need, your program model, partner responsibilities, measurable outcomes, and sustainability. Support each claim with evidence.">' +
      esc(a.narrative) +
      '</textarea></label><div class="actions">' +
      button("Assemble criterion responses", "assemble") +
      button("Copy narrative", "copy-narrative") +
      button("Version history", "narrative-history") +
      '</div><div class="divider"></div>' +
      field(
        "Measurement & reporting plan",
        '<textarea data-app="outcomes" maxlength="4000" placeholder="Metric definitions, baseline, target, reporting cadence, data source, and responsible owner…">' +
          esc(a.outcomes) +
          "</textarea>",
      ) +
      '<p class="note">For AchieveDXP clients: use verified aggregate results from Outcomes & reporting. Specify which measures are available and which need a partner or additional data collection.</p>'
    );
  }
  function budget(a) {
    const b = S.budget(a);
    return (
      '<h2>A budget you can defend.</h2><p class="quiet">Enter your agency’s costs and justify them against the notice. No vendor pricing or assumed grant amounts are supplied.</p><div class="budget-total"><span>Agency-entered program cost</span><strong>' +
      fmt(b.total) +
      "</strong></div>" +
      a.budget
        .map(
          (r, i) =>
            '<div class="budget-line"><div class="form-grid">' +
            field(
              "Cost category",
              '<input data-budget="' +
                i +
                '" data-prop="label" value="' +
                esc(r.label) +
                '" maxlength="200" placeholder="Personnel, instruction, evaluation…">',
            ) +
            field(
              "Agency amount (USD)",
              '<input data-budget="' +
                i +
                '" data-prop="amount" type="number" min="0" max="10000000000" step="0.01" value="' +
                esc(r.amount) +
                '">',
            ) +
            "</div>" +
            field(
              "Justification & source rule",
              '<textarea data-budget="' +
                i +
                '" data-prop="justification" maxlength="2000">' +
                esc(r.justification) +
                "</textarea>",
            ) +
            '<div class="row-actions"><label class="check-label"><input type="checkbox" data-budget="' +
            i +
            '" data-prop="allowable" ' +
            (r.allowable ? "checked" : "") +
            "> Agency reviewed allowability</label>" +
            button(
              "Remove cost",
              "remove-budget",
              "small danger",
              'data-index="' + i + '"',
            ) +
            "</div></div>",
        )
        .join("") +
      button("+ Add budget line", "add-budget", "section-space") +
      appField("Committed funding (USD)", "committed", a.committed, "number") +
      '<p class="quiet" id="budgetSummary">Unfunded planning amount: <strong>' +
      fmt(b.gap) +
      "</strong>. " +
      b.unreviewed +
      " cost lines still need an allowability review. Reconcile match, indirect costs, and each cost allocation before submission.</p>"
    );
  }
  function submission(a) {
    const gaps = S.gaps(a),
      ready = C.readiness(a.checks);
    return (
      '<h2>Submit with a clear record.</h2><p class="quiet">' +
      ready.completed +
      " of " +
      ready.total +
      " checks confirmed by your agency. This is a preparation checklist, not an award score.</p>" +
      C.CHECKS.map(
        (c) =>
          '<label class="task-check"><input type="checkbox" data-check="' +
          c.id +
          '" ' +
          (a.checks[c.id] ? "checked" : "") +
          "><div><strong>" +
          esc(c.title) +
          "</strong><span>" +
          esc(c.detail) +
          "</span></div></label>",
      ).join("") +
      '<details class="section-space"><summary>' +
      gaps.length +
      ' preparation items to review</summary><ul class="details-list">' +
      gaps.map((g) => "<li>" + esc(g) + "</li>").join("") +
      '</ul></details><div class="divider"></div>' +
      field(
        "Application stage",
        '<select data-app="stage">' +
          options(Object.entries(stages), a.stage) +
          "</select>",
      ) +
      appField(
        "Submission confirmation / reference",
        "submissionRef",
        a.submissionRef,
      ) +
      appField(
        "Award amount (agency-reported USD)",
        "awardAmount",
        a.awardAmount,
        "number",
      ) +
      field(
        "Funder feedback & lessons for the next cycle",
        '<textarea data-app="lessons" maxlength="3000">' +
          esc(a.lessons) +
          "</textarea>",
      ) +
      '<div class="actions">' +
      button("Export application packet", "export-application", "primary") +
      button("Export deadline calendar", "calendar") +
      '</div><p class="note section-space">Submit through the official funder portal. This workspace does not submit applications or verify award decisions.</p>'
    );
  }
  function aiEndpoint() {
    return (
      state.connection || validEndpoint(window.NAV_CONFIG?.aiBaseUrl) || ""
    );
  }
  function aiEnabled() {
    return !!aiEndpoint() || window.NAV_CONFIG?.aiEnabled === true;
  }
  function aiPanel(o) {
    const local =
      !aiEndpoint() && window.NAV_CONFIG?.aiAuthMode === "local_session";
    return (
      '<aside class="ai-panel"><div class="ai-label">' +
      '<img class="achieve-mascot" src="assets/mascot.png" alt="Achieve robot mascot" width="400" height="367">' +
      " OPENAI ASSISTANT</div><h2>" +
      (workTab === "write" ? "Writing partner" : "Your grant strategist") +
      "</h2><p>Source-linked insights. Thoughtful revisions. Every decision stays with you.</p>" +
      (workTab === "write"
        ? field(
            "What should improve?",
            '<textarea id="revisionRequest" maxlength="2000" placeholder="Make the case clearer, align to the criterion, or challenge an unsupported claim…">' +
              esc(revisionRequest) +
              "</textarea>",
          ) +
          button(
            icon("spark") + " Propose a revision",
            "ai-refine",
            "primary",
            !o || o.retained_snapshot || ai.busy ? "disabled" : "",
          ) +
          '<p class="note">Compare a suggested revision with your original before applying it. Your original is kept in version history.</p><div class="divider"></div>'
        : "") +
      (workTab === "write"
        ? '<div class="writing-tools">' +
          [
            ["Draft", "ai-narrative", "Draft from evidence"],
            ["Review", "ai-review", "Review my application"],
            ["Criteria", "ai-rubric", "Extract notice criteria"],
          ]
            .map(([label, action, name]) =>
              button(
                label,
                action,
                "small",
                'aria-label="' +
                  name +
                  '" ' +
                  (!o || o.retained_snapshot || ai.busy ? "disabled" : ""),
              ),
            )
            .join("") +
          "</div>"
        : button(
            icon("spark") + " Check eligibility",
            "ai-eligibility",
            "primary",
            !o || o.retained_snapshot || ai.busy ? "disabled" : "",
          ) +
          button(
            icon("path") + " Extract notice criteria",
            "ai-rubric",
            "",
            !o || o.retained_snapshot || ai.busy ? "disabled" : "",
          ) +
          button(
            icon("doc") + " Draft from evidence",
            "ai-narrative",
            "",
            !o || o.retained_snapshot || ai.busy ? "disabled" : "",
          ) +
          button(
            icon("search") + " Review my application",
            "ai-review",
            "",
            !o || o.retained_snapshot || ai.busy ? "disabled" : "",
          )) +
      '<div class="divider"></div>' +
      (!aiEnabled()
        ? "<p>Connect your organization’s AI service to use OpenAI in this workspace.</p>" +
          button("Connect AI service", "sources", "small")
        : !local
          ? field(
              "Workspace access code",
              '<input id="accessCode" type="password" autocomplete="off" value="' +
                esc(connectionCode) +
                '" placeholder="Organization-provided access code">',
              "Kept in memory for this session. This is not your OpenAI API key.",
            )
          : '<p class="quiet">Secure local AI service configured.</p>') +
      '<details class="ai-context-detail"><summary>Source context & sharing</summary><label class="check-label section-space"><input id="includeBudget" type="checkbox" ' +
      (aiIncludeBudget ? "checked" : "") +
      '> Include agency budget</label><p class="note">On your request, the selected notice, profile, criteria, draft, and attached evidence are sent to OpenAI. Output is a planning draft for your review.</p></details><div class="ai-status ' +
      (ai.busy ? "loading" : "") +
      '" role="status">' +
      esc(
        ai.busy
          ? "Analyzing the supplied evidence. This may take a minute…"
          : ai.error || "",
      ) +
      "</div>" +
      (ai.result && ai.fingerprint === fingerprint()
        ? renderAnalysis(ai.result)
        : "") +
      "</aside>"
    );
  }
  function renderAnalysis(r) {
    const a = r.analysis,
      citations = (e) =>
        (e || [])
          .map(
            (c) =>
              "<blockquote>" +
              esc(plain(c.quote)) +
              "<br>" +
              (c.kind === "agency_result"
                ? '<span class="note">Agency-reported measure ' +
                  esc(c.source_id) +
                  " · not independently verified</span>" +
                  (c.url ? "<br>" + external(c.url, "Evidence link", "") : "")
                : external(c.url, "Source " + c.source_id, "")) +
              "</blockquote>",
          )
          .join("");
    return (
      '<div class="analysis reveal"><span class="ai-label">' +
      esc(r.provider) +
      " · " +
      esc(r.model) +
      "</span><h3>Review the evidence, then decide.</h3><p>" +
      esc(a.summary) +
      '</p><div class="tag-row"><span class="tag">' +
      esc(
        {
          direct_review: "Review direct application",
          partner_review: "Review partner route",
          not_supported: "Source does not support route",
          unknown: "More evidence needed",
        }[a.route],
      ) +
      "</span></div>" +
      a.findings
        .map(
          (f) =>
            '<div class="finding"><h3>' +
            esc(f.requirement) +
            '</h3><span class="tag">' +
            esc(
              f.assessment === "unknown"
                ? "Unconfirmed"
                : f.assessment === "supported"
                  ? "Source-supported finding"
                  : "Not supported",
            ) +
            "</span><p>" +
            esc(f.explanation) +
            "</p>" +
            (f.evidence.length
              ? "<details><summary>Inspect source evidence</summary>" +
                citations(f.evidence) +
                "</details>"
              : "") +
            "</div>",
        )
        .join("") +
      (a.next_actions.length
        ? '<h3 class="section-space">Next strongest actions</h3><ol>' +
          a.next_actions.map((s) => "<li>" + esc(s) + "</li>").join("") +
          "</ol>"
        : "") +
      a.draft_sections
        .map(
          (s) =>
            '<div class="result-draft"><h3>' +
            esc(s.heading) +
            "</h3><p>" +
            esc(s.body) +
            "</p>" +
            citations(s.evidence) +
            "</div>",
        )
        .join("") +
      ((a.extracted_criteria || []).length
        ? '<h3 class="section-space">Criteria found in the notice</h3>' +
          a.extracted_criteria
            .map(
              (c) =>
                '<div class="finding"><strong>' +
                esc(c.title) +
                "</strong><p>" +
                esc(
                  c.points == null
                    ? "Weight not established"
                    : c.points + " points / percent as quoted",
                ) +
                "</p>" +
                citations(c.evidence) +
                "</div>",
            )
            .join("") +
          button("Review criteria for import", "review-ai-criteria", "small")
        : "") +
      (a.missing_information.length
        ? "<details><summary>Evidence still needed (" +
          a.missing_information.length +
          ")</summary><ul>" +
          a.missing_information.map((s) => "<li>" + esc(s) + "</li>").join("") +
          "</ul></details>"
        : "") +
      '<div class="actions section-space">' +
      button("Export analysis", "export-ai", "small") +
      (a.draft_sections.length
        ? r.task === "refine"
          ? button(
              "Compare proposed revision",
              "compare-revision",
              "primary small",
            )
          : r.task === "reporting"
            ? ""
            : button("Append draft to narrative", "use-ai-draft", "small")
        : "") +
      '</div><p class="note">Quotes are checked against the supplied text. This does not verify reasoning, source authenticity, or complete eligibility.</p></div>'
    );
  }
  function analysisBody(task, appKey = workKey) {
    const o = record(appKey),
      a = application(appKey),
      b = S.budget(a);
    return {
      task,
      agency_research: JourneyState.researchContext(
        state.profile,
        state.journey,
      ),
      program_brief: state.journey.program,
      ...(task === "refine" ? { revision_request: revisionRequest } : {}),
      opportunity_key: appKey,
      profile: profile(),
      notice_excerpt: a.notice.text ? a.notice : undefined,
      include_budget: aiIncludeBudget,
      budget: aiIncludeBudget ? { gapCost: b.total, gapHave: b.committed } : {},
      ...(o?.source === "agency_import" ? { custom_opportunity: o } : {}),
      proposal: {
        criteria: a.criteria,
        narrative: a.narrative,
        outcomes: a.outcomes,
        baseline: state.profile.baseline,
        uses_achievedxp: state.usesAchieveDXP,
        route: a.route,
        partner: a.partner,
      },
    };
  }
  function fingerprint() {
    return JSON.stringify({
      key: workKey,
      profile: state.profile,
      app: state.applications[workKey],
      uses: state.usesAchieveDXP,
      budgetIncluded: aiIncludeBudget,
      revisionRequest,
      agencyResearch: JourneyState.researchContext(
        state.profile,
        state.journey,
      ),
      programBrief: state.journey.program,
    });
  }
  async function analyze(task) {
    if (ai.busy) return;
    if (!aiEnabled()) {
      navigate("sources");
      toast("Connect the secure AI service to generate analysis.");
      return;
    }
    if (/^sk-/.test(connectionCode)) {
      connectionCode = "";
      toast(
        "Do not enter an OpenAI API key here. Use the organization’s workspace access code.",
      );
      render();
      return;
    }
    const local =
      !aiEndpoint() && window.NAV_CONFIG?.aiAuthMode === "local_session";
    if (!local && !connectionCode) {
      toast("Enter your organization’s workspace access code.");
      $("#accessCode")?.focus();
      return;
    }
    if (
      task === "refine" &&
      (!application().narrative.trim() || revisionRequest.trim().length < 8)
    ) {
      toast("Add a narrative and describe what the revision should improve.");
      return;
    }
    const body = analysisBody(task);
    if (body.notice_excerpt?.text && !C.safeUrl(body.notice_excerpt.url)) {
      toast("Add an HTTPS source URL for the notice excerpt first.");
      workTab = "qualify";
      render();
      return;
    }
    const sig = fingerprint();
    ai = { busy: true, result: null, error: "", task, fingerprint: sig };
    render();
    try {
      const response = await fetch(aiEndpoint() + "/api/ai/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(!local ? { Authorization: "Bearer " + connectionCode } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90000),
        credentials: local ? "same-origin" : "omit",
      });
      const r = await response.json();
      if (!response.ok)
        throw new Error(
          r.error || "The analysis service could not complete the request.",
        );
      if (
        r.opportunity_key !== body.opportunity_key ||
        r.requires_human_review !== true ||
        !r.analysis ||
        !Array.isArray(r.analysis.findings) ||
        !Array.isArray(r.analysis.draft_sections)
      )
        throw new Error(
          "The service returned an unexpected analysis. No draft was accepted.",
        );
      if (sig !== fingerprint())
        throw new Error(
          "Application context changed during analysis. Run it again with the current evidence.",
        );
      ai.result = r;
      ai.error = "Analysis ready for your review.";
    } catch (e) {
      ai.error =
        e.name === "TimeoutError"
          ? "Analysis timed out. Your application is unchanged. Try again."
          : e.message || "Unable to connect to the analysis service.";
    } finally {
      ai.busy = false;
      if (view === "workbench") render();
    }
  }
  function profilePage() {
    const p = state.profile,
      states = Object.entries(feed.saa?.states || {}).map(([v, s]) => [
        v,
        s.name,
      ]);
    return (
      heading(
        "Build around your<br>agency’s mission.",
        "Tell the workspace what you want to fund. No contact information is required.",
      ) +
      '<div class="two-column"><form id="profileForm" class="panel"><div class="form-grid">' +
      field(
        "Agency name",
        textInput("agencyName", p.agencyName, {
          max: 300,
          required: true,
          placeholder: "Department of Corrections",
        }),
      ) +
      field(
        "Program name",
        textInput("programName", p.programName, {
          max: 300,
          placeholder: "Education & reentry",
        }),
      ) +
      field(
        "State or territory",
        '<select name="stateCode">' +
          options([["", "Nationwide / select state"], ...states], p.stateCode) +
          "</select>",
      ) +
      field(
        "Applicant type",
        '<select name="agencyType">' +
          options(
            [
              ["state_doc", "State Department of Corrections"],
              ["county_jail", "County / local corrections"],
              ["juvenile", "Juvenile justice agency"],
              ["nonprofit", "Nonprofit partner"],
              ["college", "College / education institution"],
              ["community", "Community / reentry agency"],
            ],
            p.agencyType,
          ) +
          "</select>",
      ) +
      '</div><fieldset style="border:0;padding:0;margin:18px 0"><legend class="field-label">Education and reentry priorities</legend><div class="checkbox-grid">' +
      Object.entries(goalLabels)
        .map(
          ([g, l]) =>
            '<label><input name="goals" type="checkbox" value="' +
            g +
            '" ' +
            (p.goals.includes(g) ? "checked" : "") +
            ">" +
            l +
            "</label>",
        )
        .join("") +
      "</div></fieldset>" +
      field(
        "Planned activities",
        '<textarea name="activities" maxlength="4000" placeholder="What will the program deliver, to whom, and with which partners?">' +
          esc(p.activities) +
          "</textarea>",
      ) +
      field(
        "Baseline & evidence available",
        '<textarea name="baseline" maxlength="4000" placeholder="Use aggregate facts with source and period. Keep individual learner records out of this workspace.">' +
          esc(p.baseline) +
          "</textarea>",
      ) +
      '<label class="check-label"><input type="checkbox" name="usesAchieveDXP" ' +
      (state.usesAchieveDXP ? "checked" : "") +
      '> Our agency already uses AchieveDXP</label><button class="btn primary section-space" type="submit">Save agency profile ' +
      icon("arrow") +
      '</button></form><aside class="inspector"><h2>From learning<br>to lasting funding.</h2><p class="quiet">Your program’s existing results can strengthen a credible application and support reporting after an award.</p><div class="steps">' +
      [
        ["Define", "Choose measures that match the funder’s requirements."],
        [
          "Document",
          "Bring aggregate AchieveDXP or agency results with their reporting period and source.",
        ],
        [
          "Connect",
          "Link each result to an application criterion or grant progress report.",
        ],
      ]
        .map(
          (s, i) =>
            '<div class="step"><span class="step-number">0' +
            (i + 1) +
            "</span><div><h3>" +
            s[0] +
            "</h3><p>" +
            s[1] +
            "</p></div></div>",
        )
        .join("") +
      "</div>" +
      button("Open outcomes & reporting", "outcomes", "primary full") +
      "</aside></div>"
    );
  }
  function outcomes() {
    const periods = [...new Set(state.results.map((r) => r.period))],
      rows = state.results.filter(
        (r) => !reportPeriod || r.period === reportPeriod,
      );
    return (
      heading(
        "Make progress visible.<br>Make the next case stronger.",
        "Connect aggregate education results to grant applications and funder reporting.",
        button("Import aggregate CSV", "import-results") +
          button("Add program result", "add-result", "primary"),
      ) +
      '<div class="onboarding-band"><div><h3>' +
      (state.usesAchieveDXP
        ? "Put your AchieveDXP results to work."
        : "One evidence trail, from application to reporting.") +
      "</h3><p>Bring verified aggregate results from AchieveDXP or your agency records. This workspace does not have a live LMS connection.</p></div>" +
      button("Download CSV template", "results-template") +
      '</div><div class="two-column"><section class="panel"><div class="panel-title"><div><h2>Program evidence library</h2><p class="quiet">' +
      state.results.length +
      " agency-entered aggregate measures. Confirm definitions and cohort consistency before comparing.</p></div></div>" +
      field(
        "Reporting period",
        '<select id="reportPeriod">' +
          options(
            [["", "All periods"], ...periods.map((p) => [p, p])],
            reportPeriod,
          ) +
          "</select>",
      ) +
      (rows.length
        ? '<div class="table-scroll"><table class="compare-table"><thead><tr><th>Program / measure</th><th>Actual</th><th>Target</th><th>Evidence / report selection</th></tr></thead><tbody>' +
          rows
            .map(
              (r) =>
                "<tr><td><strong>" +
                esc(r.metric) +
                "</strong><br>" +
                esc(r.program) +
                '<br><span class="quiet">' +
                esc(r.period) +
                "</span></td><td>" +
                r.value.toLocaleString() +
                "</td><td>" +
                esc(r.target === "" ? "Not set" : r.target) +
                "</td><td>" +
                esc(r.source_system) +
                "<br>" +
                (r.source_url
                  ? external(r.source_url, "Source", "")
                  : "No source link attached") +
                '<label class="check-label section-space"><input type="checkbox" data-report-result="' +
                esc(r.id) +
                '" ' +
                (!reportKey ? "disabled" : "") +
                " " +
                (reportKey &&
                application(reportKey).reportResultIds.includes(r.id)
                  ? "checked"
                  : "") +
                ' aria-label="Include ' +
                esc(r.metric) +
                ' in report"> Include in this grant report</label>' +
                "<br>" +
                button(
                  "Remove",
                  "remove-result",
                  "small danger",
                  'data-id="' + esc(r.id) + '"',
                ) +
                "</td></tr>",
            )
            .join("") +
          "</tbody></table></div>"
        : empty(
            "Your program’s evidence belongs here.",
            "Add aggregate enrollment, completion, credential, or other funder-required measures with their period and source. The workspace never invents your results.",
          )) +
      '</section><aside class="inspector"><h2>Report against<br>the application.</h2><p class="quiet">Choose a saved opportunity and period, then select its relevant measures in the library. Each application keeps its own selections. Review the export against the funder’s required format.</p>' +
      field(
        "Grant or application",
        '<select id="reportGrant">' +
          options(
            [
              ["", "Choose a saved opportunity"],
              ...state.saved.map((k) => [k, plain(record(k)?.title || k)]),
            ],
            reportKey,
          ) +
          "</select>",
      ) +
      button(
        icon("spark") + " Draft report with AI",
        "ai-report",
        "primary full",
        reportBusy ? "disabled" : "",
      ) +
      button("Prepare progress report", "export-report", "full") +
      '<p class="note">AI receives only this grant’s selected measures, its application work, notice and agency profile. Up to 20 measures per request. No individual learner records.</p>' +
      (reportBusy
        ? '<p role="status" class="thinking-status">Drafting a report from your selected evidence…</p>'
        : "") +
      aiAccess("report-access") +
      '<div class="divider"></div><h3>How AchieveDXP fits</h3><p class="quiet">Use the measures available in your AchieveDXP exports to document education delivery and progress. Add workforce, financial, and partner evidence where the grant requires it.</p><p class="quiet">A traceable record can support new applications, renewal requests, and reporting. Funding decisions remain with the funder.</p>' +
      button("Use results in a proposal", "workbench", "subtle") +
      "</aside></div>"
    );
  }
  function sources() {
    const health = feed.source_health || {};
    return (
      heading(
        "Know the source.<br>Trust the evidence trail.",
        "Official records, clear coverage limits, and a secure connection for AI analysis.",
      ) +
      '<div class="panel connection"><h2>AI connection</h2><p class="quiet">The GitHub Pages website connects to your organization’s secure AI service. The OpenAI key stays on that server.</p><form id="connectionForm">' +
      field(
        "AI service URL",
        '<input name="endpoint" type="url" value="' +
          esc(aiEndpoint()) +
          '" placeholder="https://your-grant-ai-service.example">',
        "Use the HTTPS base URL of the deployed grant AI service.",
      ) +
      '<div class="actions"><button class="btn primary" type="submit">Save & test connection</button>' +
      button("Use site default", "reset-connection") +
      '</div></form><p class="quiet section-space" role="status">' +
      esc(
        connectionStatus ||
          (!aiEndpoint() && window.NAV_CONFIG?.aiEnabled
            ? "The local service is configured. Run an analysis to verify a provider response."
            : "An AI service must be deployed separately from GitHub Pages."),
      ) +
      '</p></div><div class="panel connection"><h2>Your workspace, your records.</h2><p class="quiet">Agency work is stored in this browser. Export a backup to move devices or keep a recoverable copy. Import replaces the local workspace after you review it.</p><div class="actions">' +
      button("Export workspace backup", "export-workspace") +
      button("Import workspace backup", "import-workspace") +
      '<a class="btn" href="legacy.html">Open earlier plans</a></div></div><section class="section-space"><h2>Coverage & refresh status</h2><div class="source-grid">' +
      [
        [
          "grants_gov",
          "Federal & workforce opportunities",
          feed.opportunities.length +
            " records from 24 ALN and 14 keyword searches. The broad pool includes unrelated records; matching narrows research, not eligibility.",
        ],
        [
          "usaspending",
          "Historical federal awards",
          (feed.awards || []).length +
            " award records. Past recipients and amounts are research context, not available grants.",
        ],
        [
          "propublica",
          "Foundation research",
          (feed.foundations || []).length +
            " nonprofit records. Filings do not establish an open competition.",
        ],
        [
          "directory",
          "State & corporate pathways",
          "Official source directories and manual notice imports. State competitions and corporate cycles are not automatically indexed.",
        ],
      ]
        .map(
          ([id, title, desc]) =>
            '<article class="source-item"><h3>' +
            title +
            "</h3><p>" +
            esc(desc) +
            '</p><span class="tag">' +
            esc(health[id]?.state || "Research directory") +
            '</span><p class="note">' +
            (health[id]?.last_success_at
              ? "Last successful refresh: " +
                esc(date(health[id].last_success_at.slice(0, 10)))
              : "Confirm current notices with the source.") +
            "</p></article>",
        )
        .join("") +
      '</div></section><section class="section-space"><h2>Official research destinations</h2><div class="source-grid">' +
      C.SOURCES.map(
        (s) =>
          '<article class="source-item"><span class="category">' +
          esc(s.kind) +
          "</span><h3>" +
          esc(s.name) +
          "</h3><p>" +
          esc(s.focus) +
          "</p>" +
          external(s.url, "Open source") +
          "</article>",
      ).join("") +
      "</div></section>" +
      (feed.foundations?.length
        ? '<section class="section-space"><h2>Foundation research leads</h2><p class="quiet">Review current guidelines and an eligible partner route before pursuing these organizations.</p><div class="source-grid">' +
          feed.foundations
            .map(
              (f) =>
                '<article class="source-item"><h3>' +
                esc(f.name || f.organization_name || f.ein) +
                "</h3>" +
                external(
                  f.source_url ||
                    f.url ||
                    "https://projects.propublica.org/nonprofits/organizations/" +
                      f.ein,
                  "Research filing",
                ) +
                "</article>",
            )
            .join("") +
          "</div></section>"
        : "")
    );
  }
  function openModal(title, body) {
    const m = $("#modal");
    m.innerHTML =
      '<div class="modal-head"><h2 id="modalTitle">' +
      esc(title) +
      "</h2>" +
      button(
        icon("close"),
        "close-modal",
        "small",
        'aria-label="Close dialog"',
      ) +
      "</div>" +
      body;
    m.showModal();
  }
  function importOpportunity() {
    openModal(
      "Add a current funding notice",
      '<p class="quiet">Add state, workforce, corporate, or federal opportunities from a public official source. Records are labeled agency-entered until independently confirmed.</p><form id="importForm"><div class="form-grid">' +
        field(
          "Opportunity title",
          textInput("title", "", { required: true, max: 500 }),
        ) +
        field(
          "Source / notice identifier",
          textInput("source_id", "", {
            required: true,
            max: 100,
            placeholder: "state-education-2026",
          }),
        ) +
        field(
          "Official HTTPS source",
          textInput("source_url", "", { type: "url", required: true }),
        ) +
        field(
          "Funding category",
          '<select name="source_kind">' +
            options(
              [
                ["state", "State"],
                ["workforce", "Workforce"],
                ["corporate", "Corporate / foundation"],
                ["federal", "Federal"],
              ],
              "state",
            ) +
            "</select>",
        ) +
        field(
          "Status",
          '<select name="status">' +
            options(
              [
                ["unknown", "Unconfirmed"],
                ["posted", "Open"],
                ["forecasted", "Forecast"],
                ["closed", "Closed"],
              ],
              "unknown",
            ) +
            "</select>",
        ) +
        field("Closing date", textInput("close_date", "", { type: "date" })) +
        field(
          "State codes (comma separated)",
          textInput("states", state.profile.stateCode, { max: 200 }),
        ) +
        field("Agency / funder", textInput("agency", "", { max: 300 })) +
        "</div>" +
        field(
          "Public synopsis & applicant requirements",
          '<textarea name="synopsis" maxlength="24000"></textarea>',
        ) +
        '<p id="importError" class="danger-text" role="alert"></p><button class="btn primary" type="submit">Validate & save notice</button></form>',
    );
  }
  function compareModal() {
    const rows = [...compare].map(record).filter(Boolean);
    if (rows.length < 2) {
      toast("Select two to four opportunities to compare.");
      return;
    }
    const data = [
      ["Status", (o) => C.opportunityStatus(o)],
      ["Closing date", (o) => date(o.close_date)],
      [
        "Published ceiling",
        (o) => (o.award_ceiling > 0 ? fmt(o.award_ceiling) : "Not supplied"),
      ],
      [
        "Applicant types",
        (o) => (o.applicant_types || []).join(", ") || "Confirm in notice",
      ],
      [
        "Why it appears",
        (o) =>
          M.assess(o, profile(), state.applications[key(o)]).reasons.join(
            " ",
          ) || "Limited alignment",
      ],
      [
        "Questions to resolve",
        (o) =>
          M.assess(o, profile(), state.applications[key(o)]).missing.join(" "),
      ],
      ["Agency route", (o) => application(key(o)).route],
      ["Next action", (o) => application(key(o)).nextAction || "Not assigned"],
    ];
    openModal(
      "Compare the route, not just the amount",
      '<p class="quiet">These are source facts and research signals. Establish applicant, population, activity, and partner eligibility before committing.</p><div class="table-scroll"><table class="compare-table"><thead><tr><th>Decision factor</th>' +
        rows.map((o) => "<th>" + esc(plain(o.title)) + "</th>").join("") +
        "</tr></thead><tbody>" +
        data
          .map(
            ([label, fn]) =>
              "<tr><th>" +
              label +
              "</th>" +
              rows.map((o) => "<td>" + esc(fn(o)) + "</td>").join("") +
              "</tr>",
          )
          .join("") +
        "<tr><th>Application</th>" +
        rows
          .map(
            (o) =>
              "<td>" +
              button(
                "Build application",
                "review",
                "primary small",
                'data-key="' + esc(key(o)) + '"',
              ) +
              "</td>",
          )
          .join("") +
        "</tr></tbody></table></div>",
    );
  }
  function download(name, content, type = "text/plain") {
    const url = URL.createObjectURL(new Blob([content], { type })),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
  function applicationText(k) {
    const a = application(k),
      o = record(k),
      b = S.budget(a);
    return [
      "GRANT NAVIGATOR — AGENCY APPLICATION WORKING PACKET",
      "Prepared " + new Date().toISOString(),
      state.profile.agencyName,
      state.profile.programName,
      "Opportunity: " + plain(o?.title || k),
      "Official source: " + (o?.source_url || "Unavailable"),
      "Source snapshot: " +
        (o?.retained_snapshot
          ? o.saved_snapshot_at
          : feed.last_synced_at || "Unknown"),
      "Status: " + (o ? C.opportunityStatus(o) : "Unknown"),
      "Closing date: " + (o ? date(o.close_date) : "Unknown"),
      "Applicant route (agency reviewed): " + a.route,
      "Lead partner: " + a.partner,
      "Owner: " + a.owner,
      "Internal due: " + (a.internalDueDate || ""),
      "Next action: " + a.nextAction,
      "\nCRITERIA & EVIDENCE",
      ...a.criteria.map((c) =>
        [
          c.title +
            " (points: " +
            (c.points === "" ? "not entered" : c.points) +
            ")",
          "Official requirement: " + c.requirement,
          "Source: " + c.url,
          "Agency evidence: " + c.evidence,
          "Response: " + c.draft,
        ].join("\n"),
      ),
      "\nNARRATIVE",
      a.narrative,
      "\nMEASUREMENT & REPORTING PLAN",
      a.outcomes,
      "\nAGENCY BUDGET",
      ...a.budget.map(
        (l) =>
          l.label +
          ": " +
          fmt(l.amount) +
          " — " +
          l.justification +
          " — allowability " +
          (l.allowable ? "agency reviewed" : "unreviewed"),
      ),
      "Total: " +
        fmt(b.total) +
        "; committed: " +
        fmt(b.committed) +
        "; gap: " +
        fmt(b.gap),
      "\nPREPARATION REVIEW",
      ...S.gaps(a),
      "\nSUBMISSION / OUTCOME (AGENCY REPORTED)",
      stages[a.stage],
      a.submissionRef,
      "Award amount entered: " + fmt(a.awardAmount),
      a.lessons,
      "\nPlanning material, not an eligibility determination or submission. Confirm the current notice, all amendments, and official reporting requirements.",
    ].join("\n\n");
  }
  function resultsText(rows = state.results) {
    return rows
      .map(
        (r) =>
          r.program +
          " | " +
          r.period +
          " | " +
          r.metric +
          ": " +
          r.value +
          (r.target !== "" ? " (target " + r.target + ")" : "") +
          " | " +
          r.source_system +
          " | " +
          (r.source_url || "Evidence link not attached") +
          (r.notes ? " | " + r.notes : ""),
      )
      .join("\n");
  }
  function addResult() {
    openModal(
      "Add an aggregate program result",
      '<p class="quiet">Use a defined measure and reporting period. Include only aggregate data approved for your agency’s grant work.</p><form id="resultForm"><div class="form-grid">' +
        field(
          "Program",
          textInput("program", state.profile.programName, {
            required: true,
            max: 200,
          }),
        ) +
        field(
          "Reporting period",
          textInput("period", "", {
            required: true,
            max: 100,
            placeholder: "2026 Q3",
          }),
        ) +
        field(
          "Metric & unit",
          textInput("metric", "", {
            required: true,
            max: 200,
            placeholder: "Learners completing a credential",
          }),
        ) +
        field(
          "Actual value",
          '<input type="number" name="value" min="0" max="10000000000" step="any" required>',
        ) +
        field(
          "Target (optional)",
          '<input type="number" name="target" min="0" max="10000000000" step="any">',
        ) +
        field(
          "Source system",
          textInput(
            "source_system",
            state.usesAchieveDXP ? "AchieveDXP export" : "Agency record",
            { max: 100 },
          ),
        ) +
        field(
          "Evidence URL (optional)",
          textInput("source_url", "", { type: "url" }),
        ) +
        "</div>" +
        field(
          "Definition, cohort & evidence notes",
          '<textarea name="notes" maxlength="1500"></textarea>',
        ) +
        '<p class="danger-text" id="resultError" role="alert"></p><button class="btn primary" type="submit">Save program result</button></form>',
    );
  }
  function pickFile(accept, onFile) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.addEventListener("change", () => {
      if (input.files[0]) onFile(input.files[0]);
    });
    input.click();
  }
  async function importResults(file) {
    if (file.size > 500000) {
      toast("Use an aggregate CSV smaller than 500 KB.");
      return;
    }
    try {
      const rows = S.parseResultsCsv(await file.text());
      if (state.results.length + rows.length > 250)
        throw new Error(
          "The evidence library supports 250 aggregate rows. Export and remove older records first.",
        );
      openModal(
        "Review " + rows.length + " aggregate results",
        '<p class="quiet">These rows will be added to your evidence library as agency-entered records.</p><div class="preview-text">' +
          esc(resultsText(rows)) +
          "</div>" +
          button(
            "Import reviewed results",
            "confirm-results",
            "primary section-space",
          ),
      );
      $("#modal")._results = rows;
    } catch (e) {
      toast(e.message);
    }
  }
  function attachResults() {
    if (!state.results.length) {
      navigate("outcomes");
      toast("Add program results before linking them to a criterion.");
      return;
    }
    const a = application();
    if (!a.criteria.length) {
      toast("Add a review criterion first.");
      return;
    }
    openModal(
      "Attach program evidence",
      field(
        "Criterion",
        '<select id="evidenceCriterion">' +
          options(
            a.criteria.map((c, i) => [
              String(i),
              c.title || "Criterion " + (i + 1),
            ]),
            "0",
          ) +
          "</select>",
      ) +
        '<p class="quiet">Choose only measures relevant to this requirement. The selected aggregate data becomes part of its agency evidence.</p>' +
        state.results
          .map(
            (r) =>
              '<label class="task-check"><input type="checkbox" name="attachResult" value="' +
              esc(r.id) +
              '"><span><strong>' +
              esc(r.metric) +
              ": " +
              r.value +
              "</strong>" +
              esc(r.program + " · " + r.period + " · " + r.source_system) +
              "</span></label>",
          )
          .join("") +
        button(
          "Attach selected evidence",
          "confirm-attach",
          "primary section-space",
        ),
    );
  }
  function refreshDerived() {
    if (view !== "workbench" || !workKey) return;
    const a = application(),
      c = S.coverage(a),
      b = S.budget(a);
    if ($(".coverage"))
      $(".coverage").innerHTML =
        "<span>" +
        c.evidenced +
        " / " +
        c.total +
        ' criteria with a source and agency evidence</span><span class="progress"><i style="width:' +
        (c.total ? (c.evidenced / c.total) * 100 : 0) +
        '%"></i></span>';
    if ($(".budget-total strong"))
      $(".budget-total strong").textContent = fmt(b.total);
    if ($("#budgetSummary"))
      $("#budgetSummary").textContent =
        "Unfunded planning amount: " +
        fmt(b.gap) +
        ". " +
        b.unreviewed +
        " cost lines still need an allowability review. Reconcile match, indirect costs, and each cost allocation before submission.";
  }
  function persistEdit() {
    refreshDerived();
    if (ai.result) {
      ai.result = null;
      ai.error =
        "Context changed. Run a new analysis against the updated evidence.";
      $(".analysis")?.remove();
      if ($(".ai-status")) $(".ai-status").textContent = ai.error;
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => save(), 300);
  }
  function readEdits(el) {
    const a = application();
    if (el.dataset.app) {
      const name = el.dataset.app,
        v = el.value;
      if (name === "notice.section") a.notice.section = v;
      else
        a[name] = ["committed", "awardAmount"].includes(name) ? C.money(v) : v;
      persistEdit();
    }
    if (el.dataset.notice) {
      a.notice[el.dataset.notice] = el.value;
      persistEdit();
    }
    if (el.dataset.criterion !== undefined) {
      const c = a.criteria[+el.dataset.criterion];
      if (c) {
        c[el.dataset.prop] =
          el.dataset.prop === "points"
            ? el.value === ""
              ? ""
              : Math.min(100, C.money(el.value))
            : el.value;
        persistEdit();
      }
    }
    if (el.dataset.budget !== undefined) {
      const r = a.budget[+el.dataset.budget];
      if (r) {
        r[el.dataset.prop] =
          el.dataset.prop === "amount"
            ? C.money(el.value)
            : el.dataset.prop === "allowable"
              ? el.checked
              : el.value;
        persistEdit();
      }
    }
    if (el.dataset.requirement) {
      const r = a.requirements[el.dataset.requirement];
      r[el.dataset.prop] = el.value;
      if (
        el.dataset.prop === "status" &&
        el.value !== "unknown" &&
        (!r.evidence.trim() || !C.safeUrl(r.url || record(workKey)?.source_url))
      ) {
        r.status = "unknown";
        el.value = "unknown";
        toast(
          "Add a source quote and HTTPS source before assessing this requirement.",
        );
      }
      if (!r.url && record(workKey)?.source_url)
        r.url = record(workKey).source_url;
      persistEdit();
    }
    if (el.dataset.check) {
      a.checks[el.dataset.check] = el.checked;
      persistEdit();
    }
  }
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.id === "revisionRequest") {
      revisionRequest = el.value;
      persistEdit();
      return;
    }
    if (el.id === "accessCode") {
      connectionCode = el.value;
      return;
    }
    if (el.id === "search") {
      search = el.value;
      pageNum = 1;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const pos = el.selectionStart;
        render();
        const s = $("#search");
        s.focus();
        try {
          s.setSelectionRange(pos, pos);
        } catch (_) {}
      }, 180);
      return;
    }
    if (el.closest("#main") && view === "workbench") readEdits(el);
  });
  document.addEventListener("change", (e) => {
    const el = e.target;
    if (["category", "status", "scope"].includes(el.id)) {
      if (el.id === "category") category = el.value;
      if (el.id === "status") status = el.value;
      if (el.id === "scope") scope = el.value;
      pageNum = 1;
      render();
    }
    if (el.dataset.compare) {
      if (el.checked) {
        if (compare.size >= 4) {
          el.checked = false;
          toast("Compare up to four opportunities at a time.");
          return;
        }
        compare.add(el.dataset.compare);
      } else compare.delete(el.dataset.compare);
      render();
    }
    if (el.dataset.stage) {
      application(el.dataset.stage).stage = el.value;
      save("Application stage updated.");
      render();
    }
    if (el.id === "workOpportunity") {
      workKey = el.value;
      ai.result = null;
      ai.error = "";
      render();
    }
    if (el.id === "reportPeriod") {
      reportPeriod = el.value;
      render();
    }
    if (el.id === "reportGrant") {
      reportKey = el.value;
      render();
    }
    if (el.dataset.reportResult && reportKey) {
      const app = application(reportKey),
        id = el.dataset.reportResult;
      app.reportResultIds = el.checked
        ? [...new Set([...app.reportResultIds, id])]
        : app.reportResultIds.filter((v) => v !== id);
      save();
    }
    if (el.id === "includeBudget") {
      aiIncludeBudget = el.checked;
      persistEdit();
    }
    if (view === "workbench" && el.closest("#main")) {
      readEdits(el);
      if (el.dataset.check) render();
    }
  });
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("button,a[data-view]");
    if (!b) return;
    if (b.dataset.view) {
      e.preventDefault();
      navigate(b.dataset.view);
      return;
    }
    if (b.dataset.select) {
      selected = b.dataset.select;
      render();
      if (innerWidth < 700)
        $(".inspector")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (b.dataset.browse) {
      browse = b.dataset.browse;
      pageNum = 1;
      render();
      return;
    }
    if (b.dataset.workTab) {
      workTab = b.dataset.workTab;
      render();
      return;
    }
    const action = b.dataset.action;
    if (!action) return;
    if (navs.some((n) => n[0] === action)) {
      navigate(action);
      return;
    }
    const a = workKey ? application() : null;
    switch (action) {
      case "command":
        openCommand();
        break;
      case "ai-refine":
        await analyze("refine");
        break;
      case "compare-revision":
        compareRevision();
        break;
      case "apply-revision":
        applyRevision();
        break;
      case "narrative-history":
        narrativeHistory();
        break;
      case "restore-narrative": {
        const version = a?.narrativeVersions?.[Number(b.dataset.version)];
        if (!version) break;
        openModal(
          "Restore this narrative?",
          '<p>Your current narrative will be kept in version history.</p><pre class="revision-copy">' +
            esc(version.text) +
            "</pre>" +
            button(
              "Restore narrative",
              "confirm-narrative-restore",
              "primary",
              'data-version="' + b.dataset.version + '"',
            ),
        );
        break;
      }
      case "confirm-narrative-restore": {
        const prior = a?.narrativeVersions?.[Number(b.dataset.version)]?.text;
        if (prior === undefined) break;
        rememberNarrative(a, "Before restoring a version");
        a.narrative = prior;
        ai.result = null;
        save("Previous narrative restored.");
        $("#modal").close();
        render();
        break;
      }
      case "ai-report":
        await draftReport();
        break;
      case "download-ai-report":
        if (reportAnalysis)
          download(
            "ai-progress-report-review-draft.txt",
            JSON.stringify(reportAnalysis, null, 2),
          );
        break;
      case "menu":
        $(".sidebar").classList.toggle("nav-open");
        break;
      case "close-modal":
        $("#modal").close();
        break;
      case "close-inspector":
        selected = "";
        render();
        break;
      case "previous":
        pageNum = Math.max(1, pageNum - 1);
        render();
        break;
      case "next":
        pageNum++;
        render();
        break;
      case "save": {
        const k = b.dataset.key;
        if (state.saved.includes(k)) {
          state.saved = state.saved.filter((v) => v !== k);
          toast("Removed from shortlist. Application work is retained.");
        } else {
          if (state.saved.length >= 100) {
            toast("The workspace supports 100 saved opportunities.");
            break;
          }
          state.saved.push(k);
          preserveNotice(k);
          application(k);
          toast("Saved to your application pipeline.");
        }
        save();
        render();
        break;
      }
      case "review": {
        const k = b.dataset.key;
        if (!state.saved.includes(k)) {
          if (state.saved.length >= 100) {
            toast("The workspace supports 100 saved opportunities.");
            break;
          }
          state.saved.push(k);
        }
        workKey = k;
        preserveNotice(k);
        application(k);
        workTab = "qualify";
        ai.result = null;
        ai.error = "";
        save();
        $("#modal").close();
        navigate("workbench");
        break;
      }
      case "import":
        importOpportunity();
        break;
      case "compare":
        compareModal();
        break;
      case "criteria":
        workTab = "criteria";
        render();
        break;
      case "add-criterion":
        if (a.criteria.length < 30) {
          a.criteria.push({
            id: crypto.randomUUID(),
            title: "",
            points: "",
            requirement: "",
            url: a.notice.url || "",
            evidence: "",
            draft: "",
          });
          save();
          render();
          $$("[data-prop=title]").at(-1)?.focus();
        } else toast("Use up to 30 criteria per application.");
        break;
      case "remove-criterion":
        a.criteria.splice(+b.dataset.index, 1);
        save();
        render();
        break;
      case "add-budget":
        if (a.budget.length < 30) {
          a.budget.push({
            label: "",
            amount: 0,
            justification: "",
            allowable: false,
          });
          save();
          render();
        }
        break;
      case "remove-budget":
        a.budget.splice(+b.dataset.index, 1);
        save();
        render();
        break;
      case "assemble": {
        const draft = a.criteria
          .filter((c) => c.draft.trim())
          .map((c) => c.title + "\n\n" + c.draft)
          .join("\n\n");
        if (!draft) {
          toast("Write at least one criterion response first.");
          break;
        }
        openModal(
          "Append criterion responses",
          '<p class="quiet">Your existing narrative is preserved. These responses will be appended for review.</p><div class="preview-text">' +
            esc(draft) +
            "</div>" +
            button(
              "Append to narrative",
              "confirm-assemble",
              "primary section-space",
            ),
        );
        $("#modal")._draft = draft;
        break;
      }
      case "confirm-assemble":
        a.narrative = (a.narrative + "\n\n" + $("#modal")._draft)
          .trim()
          .slice(0, 24000);
        save("Criterion responses appended.");
        $("#modal").close();
        render();
        break;
      case "copy-narrative":
        try {
          await navigator.clipboard.writeText(a.narrative);
          toast("Narrative copied.");
        } catch (_) {
          toast("Clipboard unavailable. Use Export application.");
        }
        break;
      case "ai-eligibility":
        await analyze("eligibility");
        break;
      case "ai-narrative":
        await analyze("narrative");
        break;
      case "ai-review":
        await analyze("review");
        break;
      case "ai-rubric":
        await analyze("rubric");
        break;
      case "review-ai-criteria":
        if (ai.result?.analysis.extracted_criteria?.length) {
          openModal(
            "Review extracted funder criteria",
            '<p class="quiet">Confirm these quotes contain the actual scored criteria. Imported rows retain source quotes; your existing criteria are preserved.</p><div class="preview-text">' +
              esc(
                ai.result.analysis.extracted_criteria
                  .map(
                    (c) =>
                      c.title +
                      "\n" +
                      c.evidence.map((e) => e.quote + "\n" + e.url).join("\n"),
                  )
                  .join("\n\n"),
              ) +
              "</div>" +
              button(
                "Add reviewed criteria",
                "confirm-ai-criteria",
                "primary section-space",
              ),
          );
        }
        break;
      case "confirm-ai-criteria": {
        const rows = ai.result?.analysis.extracted_criteria || [];
        if (a.criteria.length + rows.length > 30) {
          toast(
            "The application supports 30 criteria. Remove duplicates before importing.",
          );
          break;
        }
        a.criteria.push(
          ...rows.map((c) => ({
            id: crypto.randomUUID(),
            title: c.title,
            points: c.points == null ? "" : c.points,
            requirement: c.evidence.map((e) => e.quote).join("\n"),
            url: c.evidence[0].url,
            evidence: "",
            draft: "",
          })),
        );
        ai.result = null;
        save("Source-cited criteria added. Attach agency evidence to each.");
        $("#modal").close();
        workTab = "criteria";
        render();
        break;
      }
      case "export-ai":
        if (ai.result)
          download("grant-ai-analysis.txt", JSON.stringify(ai.result, null, 2));
        break;
      case "use-ai-draft":
        if (ai.result) {
          a.narrative = (
            a.narrative +
            "\n\n" +
            ai.result.analysis.draft_sections
              .map((s) => s.heading + "\n\n" + s.body)
              .join("\n\n")
          )
            .trim()
            .slice(0, 24000);
          ai.result = null;
          save("Draft appended. Review every claim and placeholder.");
          workTab = "write";
          render();
        }
        break;
      case "export-application":
        if (workKey)
          download(
            "grant-application-working-packet.txt",
            applicationText(workKey),
          );
        break;
      case "export-workspace":
        download(
          "grant-navigator-workspace.json",
          JSON.stringify(
            {
              ...state,
              connection: undefined,
              exported_at: new Date().toISOString(),
            },
            null,
            2,
          ),
          "application/json",
        );
        toast(
          "Workspace exported. Keep agency records in an approved location.",
        );
        break;
      case "import-workspace":
        pickFile(".json", async (file) => {
          try {
            if (file.size > 4000000)
              throw new Error("Use a workspace backup smaller than 4 MB.");
            const raw = JSON.parse(await file.text());
            if (raw.version !== 3 || !raw.profile || !Array.isArray(raw.saved))
              throw new Error(
                "Choose a version 3 Grant Navigator workspace backup.",
              );
            const candidate = S.clean(raw);
            candidate.results = S.cleanResults(raw.results);
            candidate.usesAchieveDXP = raw.usesAchieveDXP === true;
            candidate.connection = state.connection;
            if (candidate.imports.length)
              candidate.imports = T.normalizeImport(candidate.imports);
            openModal(
              "Restore this workspace?",
              "<p>This will replace the workspace stored in this browser. Export your current workspace first if you need to retain it.</p><p><strong>" +
                esc(candidate.profile.agencyName || "Unnamed agency") +
                "</strong> · " +
                candidate.saved.length +
                " saved opportunities · " +
                candidate.results.length +
                ' aggregate measures</p><div class="actions">' +
                button("Export current workspace", "export-workspace") +
                button(
                  "Replace with reviewed backup",
                  "confirm-restore",
                  "primary",
                ) +
                "</div>",
            );
            $("#modal")._candidate = candidate;
          } catch (error) {
            toast(error.message);
          }
        });
        break;
      case "confirm-restore":
        state = $("#modal")._candidate;
        workKey = "";
        loadError = "";
        save("Workspace restored.");
        $("#modal").close();
        render();
        break;
      case "reset-connection":
        state.connection = "";
        connectionCode = "";
        connectionStatus = "Using the site’s default service configuration.";
        save();
        render();
        break;
      case "calendar": {
        const o = record(workKey),
          d = C.dateOnly(o?.close_date);
        if (!d || C.opportunityStatus(o) !== "open") {
          toast(
            "A current open opportunity with an official closing date is required.",
          );
          break;
        }
        const next = new Date(d + "T12:00:00Z");
        next.setUTCDate(next.getUTCDate() + 1);
        const clean = (v) =>
          String(v || "")
            .replace(/\\/g, "\\\\")
            .replace(/\n/g, "\\n")
            .replace(/[,;]/g, "\\$&");
        download(
          "grant-deadline.ics",
          [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//AchieveDXP//Grant Navigator//EN",
            "BEGIN:VEVENT",
            "UID:" + encodeURIComponent(workKey) + "@grant-navigator",
            "DTSTAMP:" + new Date().toISOString().replace(/[-:]|\.\d{3}/g, ""),
            "DTSTART;VALUE=DATE:" + d.replaceAll("-", ""),
            "DTEND;VALUE=DATE:" +
              next.toISOString().slice(0, 10).replaceAll("-", ""),
            "SUMMARY:" + clean("Grant closing date: " + plain(o.title)),
            "DESCRIPTION:" +
              clean(
                "Verify exact cutoff time, time zone, registration and submission requirements in the current notice.",
              ),
            "URL:" + o.source_url,
            "END:VEVENT",
            "END:VCALENDAR",
            "",
          ].join("\r\n"),
          "text/calendar",
        );
        break;
      }
      case "add-result":
        addResult();
        break;
      case "remove-result": {
        const id = b.dataset.id;
        openModal(
          "Remove this program result?",
          "<p>Copies already attached to application criteria remain in those applications.</p>" +
            button(
              "Remove result",
              "confirm-remove-result",
              "danger",
              'data-id="' + esc(id) + '"',
            ),
        );
        break;
      }
      case "confirm-remove-result":
        state.results = state.results.filter((r) => r.id !== b.dataset.id);
        save();
        $("#modal").close();
        render();
        break;
      case "results-template":
        download(
          "aggregate-program-results-template.csv",
          "period,program,metric,value,target,source_url,source_system,notes\n",
          "text/csv",
        );
        break;
      case "import-results":
        pickFile(".csv", importResults);
        break;
      case "confirm-results":
        state.results.push(...$("#modal")._results);
        save("Aggregate results imported.");
        $("#modal").close();
        render();
        break;
      case "attach-results":
        attachResults();
        break;
      case "confirm-attach": {
        const ids = $$("input[name=attachResult]:checked", $("#modal")).map(
            (x) => x.value,
          ),
          c = a.criteria[+$("#evidenceCriterion").value];
        if (!ids.length) {
          toast("Select at least one result.");
          break;
        }
        c.evidence = (
          c.evidence +
          "\n\n" +
          resultsText(state.results.filter((r) => ids.includes(r.id)))
        )
          .trim()
          .slice(0, 6000);
        save("Program evidence attached to the criterion.");
        $("#modal").close();
        render();
        break;
      }
      case "export-report": {
        if (!reportKey) {
          toast("Choose a saved opportunity for the progress report.");
          break;
        }
        const rows = state.results.filter(
          (r) =>
            application(reportKey).reportResultIds.includes(r.id) &&
            (!reportPeriod || r.period === reportPeriod),
        );
        if (!rows.length) {
          toast(
            "Select the relevant program results for this grant and reporting period first.",
          );
          break;
        }
        const app = application(reportKey);
        download(
          "grant-progress-report.txt",
          [
            "GRANT PROGRESS REPORT — AGENCY REVIEW DRAFT",
            state.profile.agencyName,
            "Application: " + plain(record(reportKey)?.title || reportKey),
            "Reporting period: " +
              (reportPeriod || "Multiple periods — separate before submission"),
            "Status (agency reported): " + stages[app.stage],
            "Reporting commitments / measurement plan:\n" +
              (app.outcomes ||
                "[Add reporting commitments from the award terms]"),
            "AGGREGATE RESULTS — AGENCY ENTERED\n" + resultsText(rows),
            "CRITERIA & APPLICATION EVIDENCE\n" +
              app.criteria
                .map(
                  (c) =>
                    c.title +
                    "\nRequirement: " +
                    c.requirement +
                    "\nSource: " +
                    c.url +
                    "\nEvidence: " +
                    c.evidence,
                )
                .join("\n\n"),
            "GAPS\n" +
              rows
                .filter((r) => !r.source_url)
                .map(
                  (r) =>
                    "Attach evidence source: " + r.metric + " / " + r.period,
                )
                .join("\n"),
            "Confirm the award’s required measures, cohort definitions, reporting period, financial report, certifications, and funder template before submission. This is not a certified funder report.",
          ].join("\n\n"),
        );
        break;
      }
    }
  });
  document.addEventListener("submit", async (e) => {
    const form = e.target;
    if (
      !["profileForm", "importForm", "resultForm", "connectionForm"].includes(
        form.id,
      )
    )
      return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (form.id === "profileForm") {
      data.goals = new FormData(form).getAll("goals");
      state.profile = S.clean({ profile: data }).profile;
      state.usesAchieveDXP = data.usesAchieveDXP === "on";
      save("Agency priorities saved. Your research view is updated.");
      navigate("discover");
    }
    if (form.id === "importForm") {
      try {
        const o = T.normalizeImport([
          {
            ...data,
            states: data.states
              ? data.states.split(",").map((v) => v.trim().toUpperCase())
              : [],
          },
        ])[0];
        if (state.imports.some((x) => key(x) === key(o)))
          throw new Error(
            "That source identifier already exists. Use a distinct notice or amendment identifier.",
          );
        if (state.imports.length >= 100)
          throw new Error("The workspace supports 100 imported notices.");
        state.imports.push(o);
        state.saved.push(key(o));
        workKey = key(o);
        application(workKey);
        save("Notice validated and added to your pipeline.");
        $("#modal").close();
        workTab = "qualify";
        navigate("workbench");
      } catch (error) {
        $("#importError").textContent = error.message;
      }
    }
    if (form.id === "resultForm") {
      if (data.source_url && !C.safeUrl(data.source_url)) {
        $("#resultError").textContent = "Use an HTTPS evidence URL.";
        return;
      }
      if (state.results.length >= 250) {
        $("#resultError").textContent =
          "The evidence library supports 250 aggregate rows.";
        return;
      }
      state.results.push(
        ...S.cleanResults([{ ...data, id: crypto.randomUUID() }]),
      );
      save("Program result saved.");
      $("#modal").close();
      render();
    }
    if (form.id === "connectionForm") {
      const endpoint = validEndpoint(data.endpoint);
      if (!endpoint) {
        connectionStatus =
          "Enter an HTTPS service URL without credentials, query parameters, or a fragment.";
        render();
        return;
      }
      state.connection = endpoint;
      save();
      connectionStatus = "Testing the configured service…";
      render();
      try {
        const response = await fetch(endpoint + "/api/ai/status", {
          credentials: "omit",
          signal: AbortSignal.timeout(10000),
        });
        const body = await response.json();
        if (!response.ok || !body.enabled)
          throw new Error("The service is reachable but AI is not configured.");
        connectionStatus =
          "Service configuration is available. Use the workbench and your workspace access code to run an analysis.";
      } catch (error) {
        connectionStatus =
          "Connection not verified. Check the service URL and its allowed website origin. " +
          (error.message === "Failed to fetch" ? "" : error.message);
      }
      render();
    }
  });
  window.addEventListener("beforeunload", () => {
    clearTimeout(saveTimer);
    save();
  });
  window.addEventListener("hashchange", () => {
    const v = location.hash.slice(1);
    if (navs.some((n) => n[0] === v)) {
      view = v;
      render();
    }
  });
  function aiAccess(className = "") {
    if (!aiEnabled())
      return (
        '<div class="ai-connection-note ' +
        className +
        '">' +
        icon("spark") +
        "<span>Bring your strategy to life with your organization’s AI service.</span>" +
        button("Connect AI", "sources", "text-button") +
        "</div>"
      );
    if (!aiEndpoint() && window.NAV_CONFIG?.aiAuthMode === "local_session")
      return "";
    return (
      '<details class="ai-access ' +
      className +
      '" ' +
      (!connectionCode ? "open" : "") +
      "><summary>Secure workspace access</summary>" +
      field(
        "Workspace access code",
        '<input id="accessCode" type="password" autocomplete="off" value="' +
          esc(connectionCode) +
          '" placeholder="Organization-provided access code">',
        "This is not an OpenAI API key. Kept in memory for this session.",
      ) +
      "</details>"
    );
  }
  function aiReady() {
    if (!aiEnabled()) {
      navigate("sources");
      toast(
        "Connect your organization’s secure AI service to use this assistant.",
      );
      return false;
    }
    if (/^sk-/.test(connectionCode)) {
      connectionCode = "";
      render();
      toast(
        "Use the workspace access code here. Keep your OpenAI key on the server.",
      );
      return false;
    }
    const local =
      !aiEndpoint() && window.NAV_CONFIG?.aiAuthMode === "local_session";
    if (!local && !connectionCode) {
      toast("Enter your organization’s workspace access code.");
      const input = $("#accessCode");
      if (input) {
        input.closest("details")?.setAttribute("open", "");
        input.focus();
      }
      return false;
    }
    return true;
  }
  async function requestAI(body) {
    const local =
      !aiEndpoint() && window.NAV_CONFIG?.aiAuthMode === "local_session";
    const response = await fetch(aiEndpoint() + "/api/ai/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(!local ? { Authorization: "Bearer " + connectionCode } : {}),
      },
      body: JSON.stringify(body),
      credentials: local ? "same-origin" : "omit",
      signal: AbortSignal.timeout(90000),
    });
    const result = await response.json();
    if (!response.ok)
      throw Error(
        result.error ||
          "The AI service could not complete the request. Please try again.",
      );
    return result;
  }
  function rememberNarrative(app, label) {
    app.narrativeVersions = [
      { text: app.narrative, at: new Date().toISOString(), label },
      ...(app.narrativeVersions || []),
    ].slice(0, 5);
  }
  function proposedNarrative() {
    return (
      ai.result?.analysis.draft_sections.map((s) => s.body).join("\n\n") || ""
    );
  }
  function compareRevision() {
    if (
      ai.task !== "refine" ||
      !ai.result ||
      ai.fingerprint !== fingerprint()
    ) {
      toast("Generate a revision for the current draft first.");
      return;
    }
    const proposal = proposedNarrative();
    if (!proposal || proposal.length > 24000) {
      toast(
        "The proposed revision exceeds the narrative limit. Export the analysis and review it separately.",
      );
      return;
    }
    openModal(
      "Review your proposed revision",
      '<p class="quiet">Check every fact, commitment and source before applying. Your original will be saved in version history.</p><div class="revision-comparison"><section><h3>Current narrative</h3><pre class="revision-copy">' +
        esc(application().narrative) +
        '</pre></section><section><h3>Proposed revision <span class="tag">AI draft</span></h3><pre class="revision-copy">' +
        esc(proposal) +
        '</pre></section></div><div class="modal-actions">' +
        button("Keep my original", "close-modal") +
        button("Apply reviewed revision", "apply-revision", "primary") +
        "</div>",
    );
  }
  function applyRevision() {
    if (
      ai.task !== "refine" ||
      !ai.result ||
      ai.fingerprint !== fingerprint()
    ) {
      toast(
        "The application changed. Generate a fresh revision before applying it.",
      );
      return;
    }
    const proposed = proposedNarrative();
    if (!proposed || proposed.length > 24000) return;
    const app = application();
    rememberNarrative(app, "Before AI revision");
    app.narrative = proposed;
    ai.result = null;
    ai.error = "";
    save("Reviewed revision applied. Your original is in version history.");
    $("#modal").close();
    render();
  }
  function narrativeHistory() {
    const versions = application().narrativeVersions || [];
    openModal(
      "Narrative version history",
      '<p class="quiet">The last five narratives replaced by a reviewed AI revision or a restoration are kept on this device. Ordinary typing is saved to the current draft.</p>' +
        (versions.length
          ? versions
              .map(
                (v, i) =>
                  '<article class="version-row"><div><strong>' +
                  esc(v.label) +
                  '</strong><p class="quiet">' +
                  esc(new Date(v.at).toLocaleString()) +
                  " · " +
                  v.text.length.toLocaleString() +
                  " characters</p><p>" +
                  esc(v.text.slice(0, 180)) +
                  (v.text.length > 180 ? "…" : "") +
                  "</p></div>" +
                  button(
                    "Review & restore",
                    "restore-narrative",
                    "small",
                    'data-version="' + i + '"',
                  ) +
                  "</article>",
              )
              .join("")
          : empty(
              "Your first draft is still the current one.",
              "Applying a reviewed AI revision will keep the original here.",
            )),
    );
  }
  function reportContext() {
    const app = reportKey ? application(reportKey) : null;
    return {
      key: reportKey,
      period: reportPeriod,
      profile: state.profile,
      uses: state.usesAchieveDXP,
      app,
      rows: state.results.filter(
        (r) =>
          app?.reportResultIds.includes(r.id) &&
          (!reportPeriod || r.period === reportPeriod),
      ),
    };
  }
  async function draftReport() {
    if (reportBusy) return;
    const context = reportContext();
    if (!context.key || context.rows.length < 1 || context.rows.length > 20) {
      toast(
        "Choose a grant and select 1–20 relevant measures for this reporting period.",
      );
      return;
    }
    if (!aiReady()) return;
    const sig = JSON.stringify(context),
      o = record(reportKey);
    const body = {
      ...analysisBody("reporting", reportKey),
      include_budget: false,
      budget: {},
      aggregate_results: context.rows,
      reporting_period: reportPeriod,
      ...(o?.retained_snapshot ? { saved_opportunity: o } : {}),
    };
    if (body.notice_excerpt?.text && !C.safeUrl(body.notice_excerpt.url)) {
      toast(
        "Add the official HTTPS source to the application’s notice excerpt first.",
      );
      return;
    }
    reportBusy = true;
    reportAnalysis = null;
    render();
    try {
      const r = await requestAI(body);
      if (
        r.task !== "reporting" ||
        r.opportunity_key !== context.key ||
        r.requires_human_review !== true ||
        !Array.isArray(r.analysis?.draft_sections) ||
        !Array.isArray(r.analysis?.next_actions) ||
        !Array.isArray(r.analysis?.missing_information)
      )
        throw Error(
          "The service returned an unexpected report. No draft was accepted.",
        );
      if (sig !== JSON.stringify(reportContext()))
        throw Error(
          "The selected reporting evidence changed. Generate a new report with the current selection.",
        );
      reportAnalysis = r;
      if (view === "outcomes")
        openModal(
          "Your progress report · review draft",
          "<p>" +
            esc(r.analysis.summary) +
            "</p>" +
            r.analysis.draft_sections
              .map(
                (s) =>
                  '<section class="report-draft"><h3>' +
                  esc(s.heading) +
                  "</h3><p>" +
                  esc(s.body) +
                  "</p>" +
                  s.evidence
                    .map(
                      (c) =>
                        "<blockquote>" +
                        esc(c.quote) +
                        '<br><span class="note">' +
                        (c.kind === "agency_result"
                          ? "Agency-reported measure · not independently verified"
                          : "Supplied notice evidence") +
                        " · " +
                        esc(c.source_id) +
                        "</span>" +
                        (c.url
                          ? "<br>" + external(c.url, "Evidence source", "")
                          : "") +
                        "</blockquote>",
                    )
                    .join("") +
                  "</section>",
              )
              .join("") +
            "<h3>Review before submission</h3><ul>" +
            [...r.analysis.next_actions, ...r.analysis.missing_information]
              .map((t) => "<li>" + esc(t) + "</li>")
              .join("") +
            '</ul><p class="note">' +
            esc(r.citation_check) +
            " Confirm the funder’s template, financial reports and certification requirements.</p>" +
            button("Export AI report draft", "download-ai-report", "primary"),
        );
    } catch (err) {
      toast(
        err.name === "TimeoutError"
          ? "Reporting analysis timed out. Please try again."
          : err.message,
      );
    } finally {
      reportBusy = false;
      if (view === "outcomes") render();
    }
  }
  function openCommand() {
    openModal(
      "Where would you like to go?",
      '<label class="sr-only" for="commandSearch">Search workspaces or saved opportunities</label><input id="commandSearch" placeholder="Search workspaces or saved opportunities…" autocomplete="off"><div id="commandResults" class="command-results"></div><p class="note">Type to filter · ↑ ↓ to move · Enter to open · Esc to close</p>',
    );
    fillCommands("");
    $("#commandSearch").focus();
  }
  function fillCommands(query) {
    const q = query.toLowerCase().trim();
    const destinations = navs.filter((n) => n[1].toLowerCase().includes(q));
    const saved = state.saved
      .map((k) => ({ k, o: record(k) }))
      .filter((x) => x.o && plain(x.o.title).toLowerCase().includes(q))
      .slice(0, 6);
    $("#commandResults").innerHTML =
      destinations
        .map(
          ([v, label, i]) =>
            '<button data-view="' +
            v +
            '">' +
            icon(i) +
            "<span>" +
            esc(label) +
            "</span>" +
            icon("arrow") +
            "</button>",
        )
        .join("") +
      saved
        .map(
          ({ k, o }) =>
            '<button data-action="review" data-key="' +
            esc(k) +
            '">' +
            icon("save") +
            "<span>" +
            esc(plain(o.title)) +
            "<small>Saved opportunity</small></span>" +
            icon("arrow") +
            "</button>",
        )
        .join("") +
      (!destinations.length && !saved.length
        ? '<p class="quiet">No matching workspace or saved opportunity.</p>'
        : "");
  }
  document.addEventListener("input", (e) => {
    if (e.target.id === "commandSearch") fillCommands(e.target.value);
  });
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if ($("#modal").open) $("#modal").close();
      openCommand();
    }
    if (!$("#commandSearch") || !$("#modal").open) return;
    const items = $$("#commandResults button"),
      index = items.indexOf(document.activeElement);
    if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      if (items.length)
        items[
          (index + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
            items.length
        ].focus();
    }
    if (e.key === "Enter" && e.target.id === "commandSearch") {
      e.preventDefault();
      items[0]?.click();
    }
  });

  const intelligence = FundingIntelligence.create({
    esc,
    icon,
    button,
    external,
    render,
    navigate,
    toast,
    modal: openModal,
    download,
    ready: aiReady,
    request: requestAI,
    access: () => aiAccess("intelligence-access"),
    isActive: () =>
      view === "intelligence" ||
      (view === "journey" && journey.step() === "funding"),
    context: () => ({
      profile: state.profile,
      saved: state.saved,
      imports: state.imports,
      usesAchieveDXP: state.usesAchieveDXP,
      agencyResearch: JourneyState.researchContext(
        state.profile,
        state.journey,
      ),
      programBrief: state.journey.program,
      mission: JourneyState.mission(state.profile, state.journey),
    }),
  });
  const journey = FundingJourney.create({
    esc,
    icon,
    button,
    external,
    field,
    save,
    render,
    navigate,
    toast,
    download,
    ready: aiReady,
    request: requestAI,
    access: () => aiAccess("journey-access"),
    active: () => view === "journey",
    context: () => ({ state, records: records() }),
    record,
    application,
    strategy: () => intelligence.render(true),
    seedStrategy: (value) => intelligence.setMission(value),
    choose: (k) => {
      if (!record(k)) return false;
      if (!state.saved.includes(k)) {
        if (state.saved.length >= 100) {
          toast("The workspace supports 100 saved opportunities.");
          return false;
        }
        state.saved.push(k);
      }
      preserveNotice(k);
      application(k);
      save();
      return true;
    },
    openApplication: (k, tab) => {
      if (!k) return;
      workKey = k;
      workTab = tab;
      ai.result = null;
      ai.error = "";
      navigate("workbench");
    },
    openReport: (k) => {
      reportKey = k;
      navigate("outcomes");
    },
  });
  const welcome = NavigatorWelcome.create({
    icon,
    button,
    esc,
    hasAgency: () => !!state.profile.agencyName.trim(),
    launch: (step) => {
      if (step === "reporting") {
        navigate("outcomes");
        return;
      }
      navigate("journey");
      journey.go(step);
      $("#main")?.focus({ preventScroll: true });
    },
  });
  render();
  fetch("opportunities.json", { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error();
      return r.json();
    })
    .then((f) => {
      if (!Array.isArray(f.opportunities)) throw new Error();
      feed = {
        ...f,
        opportunities: f.opportunities.filter(
          (o) =>
            o &&
            o.source_id &&
            typeof o.title === "string" &&
            C.safeUrl(o.source_url),
        ),
      };
    })
    .catch(() => {
      loadError =
        "The funding snapshot could not be loaded. Your saved application work is still available. Reload to retry.";
    })
    .finally(() => {
      feedLoading = false;
      if (view !== "home") render();
    });
})();
