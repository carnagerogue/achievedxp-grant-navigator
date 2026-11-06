/* Persist only agency-owned planning data. Never persist connection credentials. */
(function (root, factory) {
  if (typeof module === "object" && module.exports)
    module.exports = factory(require("./grant-core.js"), require("./journey-state.js"));
  else root.NavigatorState = factory(root.GrantCore, root.JourneyState);
})(typeof globalThis !== "undefined" ? globalThis : this, function (core, journey) {
  const KEY = "achievedxp_workspace_v3";
  const text = (v, n = 1000) => (typeof v === "string" ? v.slice(0, n) : "");
  const goals = [
    "ged",
    "cte",
    "postsec",
    "reentry",
    "digital",
    "sud",
    "sel",
    "juv_ed",
  ];
  const stages = ["research", "prepare", "submitted", "awarded", "declined"];
  function cleanApplication(v = {}) {
    return {
      ...core.cleanReview(v),
      notice: {
        text: text(v.notice?.text, 24000),
        url: core.safeUrl(v.notice?.url) || "",
        section: text(v.notice?.section, 300),
      },
      criteria: (Array.isArray(v.criteria) ? v.criteria : [])
        .slice(0, 30)
        .map((c, i) => ({
          id: text(c.id, 80) || "criterion-" + i,
          title: text(c.title, 250),
          points: c.points === "" ? "" : Math.min(100, core.money(c.points)),
          requirement: text(c.requirement, 4000),
          url: core.safeUrl(c.url) || "",
          evidence: text(c.evidence, 6000),
          draft: text(c.draft, 8000),
        })),
      narrative: text(v.narrative, 24000),
      narrativeVersions: (Array.isArray(v.narrativeVersions)
        ? v.narrativeVersions
        : []
      )
        .slice(0, 5)
        .map((r) => ({
          text: text(r?.text, 24000),
          at: text(r?.at, 100),
          label: text(r?.label, 100),
        })),
      outcomes: text(v.outcomes, 4000),
      budget: (Array.isArray(v.budget) ? v.budget : [])
        .slice(0, 30)
        .map((b) => ({
          label: text(b.label, 200),
          amount: core.money(b.amount),
          justification: text(b.justification, 2000),
          allowable: b.allowable === true,
        })),
      committed: core.money(v.committed),
      checks: core.cleanPlan({ applicationChecks: v.checks }).applicationChecks,
      submissionRef: text(v.submissionRef, 500),
      reportResultIds: [
        ...new Set(
          (Array.isArray(v.reportResultIds) ? v.reportResultIds : []).filter(
            (id) => typeof id === "string" && id.length <= 80,
          ),
        ),
      ].slice(0, 250),
      awardAmount: core.money(v.awardAmount),
      lessons: text(v.lessons, 3000),
    };
  }
  function clean(v = {}) {
    return {
      version: 3,
      journey: journey.clean(v.journey),
      profile: {
        agencyName: text(v.profile?.agencyName, 300),
        programName: text(v.profile?.programName, 300),
        stateCode: /^[A-Z]{2}$/.test(v.profile?.stateCode || "")
          ? v.profile.stateCode
          : "",
        agencyType: [
          "state_doc",
          "county_jail",
          "juvenile",
          "nonprofit",
          "college",
          "community",
        ].includes(v.profile?.agencyType)
          ? v.profile.agencyType
          : "state_doc",
        goals: (v.profile?.goals || []).filter((g) => goals.includes(g)),
        populationSize: text(v.profile?.populationSize, 100),
        activities: text(v.profile?.activities, 4000),
        baseline: text(v.profile?.baseline, 4000),
      },
      saved: [
        ...new Set(
          (v.saved || []).filter(
            (k) =>
              typeof k === "string" &&
              k.startsWith("opportunity:") &&
              k.length <= 160,
          ),
        ),
      ].slice(0, 100),
      applications: Object.fromEntries(
        Object.entries(v.applications || {})
          .filter(([k]) => k.startsWith("opportunity:") && k.length <= 160)
          .slice(0, 100)
          .map(([k, a]) => [k, cleanApplication(a)]),
      ),
      imports: Array.isArray(v.imports) ? v.imports.slice(0, 100) : [],
      snapshots: cleanSnapshots(v.snapshots),
      updatedAt: text(v.updatedAt, 100),
    };
  }
  function cleanSnapshots(value) {
    return Object.fromEntries(
      Object.entries(value || {})
        .slice(0, 100)
        .filter(
          ([id, o]) =>
            o && id === core.opportunityKey(o) && core.safeUrl(o.source_url),
        )
        .map(([id, o]) => [
          id,
          {
            source: text(o.source, 100),
            source_id: text(String(o.source_id), 100),
            source_kind: text(o.source_kind, 50),
            title: text(o.title, 1000),
            agency: text(o.agency, 500),
            source_url: core.safeUrl(o.source_url),
            status: text(o.status, 50),
            close_date: core.dateOnly(o.close_date),
            synopsis: text(o.synopsis, 24000),
            applicant_eligibility: text(o.applicant_eligibility, 12000),
            applicant_types: (Array.isArray(o.applicant_types)
              ? o.applicant_types
              : []
            )
              .slice(0, 20)
              .map((v) => text(v, 500)),
            states: (Array.isArray(o.states) ? o.states : [])
              .filter((v) => /^[A-Z]{2}$/.test(v))
              .slice(0, 56),
            cfda: text(o.cfda, 30),
            opp_number: text(o.opp_number, 200),
            award_ceiling:
              o.award_ceiling == null ? null : core.money(o.award_ceiling),
            saved_snapshot_at: text(o.saved_snapshot_at, 100),
          },
        ]),
    );
  }
  function coverage(app) {
    const rows = app.criteria || [];
    const cited = rows.filter(
      (c) => c.requirement.trim() && core.safeUrl(c.url),
    );
    const evidenced = cited.filter((c) => c.evidence.trim());
    return {
      total: rows.length,
      cited: cited.length,
      evidenced: evidenced.length,
      drafted: rows.filter((c) => c.draft.trim()).length,
    };
  }
  function budget(app) {
    const total = (app.budget || []).reduce(
      (n, b) => n + core.money(b.amount),
      0,
    );
    return {
      total,
      committed: core.money(app.committed),
      gap: Math.max(0, total - core.money(app.committed)),
      unreviewed: (app.budget || []).filter((b) => !b.allowable).length,
    };
  }
  function gaps(app) {
    const c = coverage(app),
      b = budget(app);
    return [
      !["direct", "partner"].includes(app.route) &&
        "Confirm the applicant route.",
      app.route === "partner" &&
        !app.partner &&
        "Identify and confirm the lead partner.",
      (!c.total || c.cited < c.total) &&
        "Attach the official requirement and source to every criterion.",
      c.evidenced < c.total &&
        "Supply agency evidence for each review criterion.",
      !app.narrative.trim() && "Prepare and review the application narrative.",
      /\[(?:AGENCY|SOURCE|EVIDENCE|INSERT|TODO)/i.test(app.narrative) &&
        "Resolve placeholders in the narrative.",
      !b.total && "Build the agency budget.",
      b.unreviewed > 0 && "Review every budget line for allowability.",
      ...core.CHECKS.filter((c) => !app.checks[c.id]).map((c) => c.title + "."),
    ].filter(Boolean);
  }
  function cleanResults(rows) {
    return (Array.isArray(rows) ? rows : []).slice(0, 250).map((r, i) => ({
      id: text(r.id, 80) || "result-" + i,
      period: text(r.period, 100),
      program: text(r.program, 200),
      metric: text(r.metric, 200),
      value: core.money(r.value),
      target: r.target === "" || r.target == null ? "" : core.money(r.target),
      source_url: core.safeUrl(r.source_url) || "",
      source_system: text(r.source_system, 100) || "Agency record",
      notes: text(r.notes, 1500),
    }));
  }
  function parseResultsCsv(raw) {
    if (typeof raw !== "string" || raw.length > 500000)
      throw new Error("Use an aggregate CSV smaller than 500 KB.");
    const rows = [];
    let row = [],
      cell = "",
      quoted = false;
    for (let i = 0; i <= raw.length; i++) {
      const ch = raw[i];
      if (ch === '"') {
        if (quoted && raw[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = !quoted;
      } else if ((ch === "," || ch === "\n" || ch === undefined) && !quoted) {
        row.push(cell.replace(/\r$/, ""));
        cell = "";
        if (ch !== ",") {
          if (row.some((v) => v.trim())) rows.push(row);
          row = [];
        }
      } else if (ch !== undefined) cell += ch;
    }
    if (quoted) throw new Error("The CSV contains an unclosed quote.");
    const headers = (rows.shift() || []).map((h) =>
      h
        .trim()
        .replace(/^\uFEFF/, "")
        .toLowerCase(),
    );
    const allowed = [
      "period",
      "program",
      "metric",
      "value",
      "target",
      "source_url",
      "source_system",
      "notes",
    ];
    if (
      headers.some((h) => !allowed.includes(h)) ||
      new Set(headers).size !== headers.length ||
      !["period", "program", "metric", "value"].every((h) =>
        headers.includes(h),
      )
    )
      throw new Error(
        "Use the aggregate template columns. Individual learner data and extra columns are not accepted.",
      );
    if (!rows.length || rows.length > 250)
      throw new Error("Include between 1 and 250 aggregate result rows.");
    const records = rows.map((r, i) => {
      if (r.length !== headers.length)
        throw new Error(
          "Row " + (i + 2) + " has an unexpected number of columns.",
        );
      const o = Object.fromEntries(headers.map((h, j) => [h, r[j].trim()]));
      if (
        !o.period ||
        !o.program ||
        !o.metric ||
        o.value === "" ||
        !Number.isFinite(Number(o.value)) ||
        +o.value < 0 ||
        +o.value > 1e10 ||
        (o.target &&
          (!Number.isFinite(+o.target) || +o.target < 0 || +o.target > 1e10)) ||
        (o.source_url && !core.safeUrl(o.source_url))
      )
        throw new Error(
          "Row " +
            (i + 2) +
            " needs a period, program, metric, valid nonnegative values and an optional HTTPS evidence link.",
        );
      return { ...o, id: "result-" + Date.now() + "-" + i };
    });
    return cleanResults(records);
  }
  return {
    KEY,
    text,
    goals,
    stages,
    clean,
    cleanApplication,
    cleanSnapshots,
    coverage,
    budget,
    gaps,
    cleanResults,
    parseResultsCsv,
  };
});
