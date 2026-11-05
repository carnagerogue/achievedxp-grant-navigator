const { test } = require("node:test");
const assert = require("node:assert/strict");
const C = require("../../grant-core.js"),
  S = require("../../navigator-state.js");
const quote =
  "State governments may apply for correctional adult education and workforce training.";
const o = {
  source: "grants_gov",
  source_id: "strategy-1",
  title: "Correctional education",
  synopsis: quote,
  status: "posted",
  source_url: "https://example.gov/current",
  close_date: "2099-01-01",
};
const feed = {
  opportunities: [
    o,
    { ...o, source_id: "closed", close_date: "2020-01-01" },
    { ...o, source_id: "outside", states: ["TX"] },
  ],
  last_synced_at: "2026-11-05T00:00:00Z",
};
const body = {
  task: "strategy",
  mission: "Expand adult education and credentials for incarcerated learners.",
  profile: {
    agencyName: "Test DOC",
    stateCode: "MI",
    goals: ["ged", "cte"],
    activities: ["Adult literacy"],
    contactEmail: "private@example.test",
  },
  uses_achievedxp: true,
};
test("mission strategy selects bounded current source records, retains provenance, and excludes private fields", async () => {
  const { prepareStrategy } = await import("../../server/intelligence.mjs");
  const p = prepareStrategy(body, feed, new Date("2026-11-05"));
  assert.equal(p.sources.length, 1);
  assert.equal(p.sources[0].opportunity_key, C.opportunityKey(o));
  assert.equal(p.profile.activities, "Adult literacy");
  assert.equal(p.profile.uses_achievedxp, true);
  assert.ok(!JSON.stringify(p).includes("private@example"));
  assert.ok(p.paths.some((p) => p.category === "Corporate / foundation"));
  assert.equal(p.counts.searched, 3);
  assert.throws(
    () => prepareStrategy({ ...body, mode: "shortlist" }, feed),
    /Save at least/,
  );
});
test("shortlist strategy retains closed status, and cannot replace official records with client-provided records", async () => {
  const { prepareStrategy } = await import("../../server/intelligence.mjs");
  const closed = feed.opportunities[1],
    p = prepareStrategy(
      {
        ...body,
        mode: "shortlist",
        opportunity_keys: [C.opportunityKey(closed)],
        opportunity: { ...closed, synopsis: "Fabrication" },
      },
      feed,
    );
  assert.equal(p.sources[0].status, "closed");
  assert.equal(p.sources[0].text, quote);
  const imported = prepareStrategy(
    {
      ...body,
      custom_opportunities: [
        {
          ...o,
          source: "grants_gov",
          source_kind: "federal",
          source_url: "https://example.gov/import",
          synopsis: "Correctional adult education imported text",
        },
      ],
    },
    feed,
  );
  assert.ok(
    imported.sources.some((s) =>
      s.opportunity_key.startsWith("opportunity:agency_import:"),
    ),
  );
  assert.equal(
    imported.sources.find((s) => s.opportunity_key === C.opportunityKey(o))
      .text,
    quote,
  );
});
test("strategy citations bind titles, URLs and identity to server references and reject invented quotes", async () => {
  const { prepareStrategy, validateStrategy } = await import(
    "../../server/intelligence.mjs"
  );
  const p = prepareStrategy(body, feed);
  const raw = {
    title: "Build the evidence first",
    summary: "Research the applicant route before applying.",
    recommendations: [
      {
        source_id: "R1",
        route: "direct_review",
        rationale: "Confirm the full notice and current amendments.",
        quotes: [quote],
        url: "https://attacker.test/",
      },
    ],
    pathways: [
      {
        source_id: "P1",
        rationale:
          "Ask the state provider office about the current competition.",
      },
    ],
    next_actions: [
      {
        title: "Document baseline",
        detail: "Use verified aggregate measures.",
        workspace: "outcomes",
      },
    ],
    questions: ["Who is the reporting owner?"],
  };
  const r = validateStrategy(raw, p);
  assert.equal(r.recommendations[0].url, o.source_url);
  assert.equal(r.recommendations[0].title, o.title);
  assert.match(r.pathways[0].provenance, /not established/);
  assert.throws(
    () =>
      validateStrategy(
        {
          ...raw,
          recommendations: [
            {
              ...raw.recommendations[0],
              quotes: ["You will certainly receive this award."],
            },
          ],
        },
        p,
      ),
    /could not be verified/,
  );
  assert.throws(
    () =>
      validateStrategy(
        {
          ...raw,
          recommendations: [{ ...raw.recommendations[0], source_id: "R99" }],
        },
        p,
      ),
    /could not be verified/,
  );
  assert.throws(
    () =>
      validateStrategy(
        { ...raw, summary: "Nucleos costs $900 per learner." },
        p,
      ),
    /vendor pricing/,
  );
});
test("strategy requests use structured Responses output, no browsing claims, and bounded conversation", async () => {
  const { prepareAnalysis, runAnalysis } = await import("../../server/ai.mjs");
  let sent;
  const p = prepareAnalysis(
    {
      ...body,
      history: Array.from({ length: 10 }, () => ({
        role: "system",
        text: "untrusted history",
      })),
    },
    feed,
  );
  const raw = {
    title: "Gather the evidence",
    summary: "Start with official applicant rules.",
    recommendations: [],
    pathways: [],
    next_actions: [],
    questions: ["What current solicitation is available?"],
  };
  const r = await runAnalysis(p, {
    apiKey: "unit-test-key",
    model: "test-model",
    fetchImpl: async (url, init) => {
      sent = JSON.parse(init.body);
      return Response.json({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: JSON.stringify(raw) }],
          },
        ],
      });
    },
  });
  assert.equal(sent.store, false);
  assert.equal(sent.text.format.name, "doc_funding_strategy");
  assert.equal(sent.text.format.strict, true);
  assert.equal(JSON.parse(sent.input).conversation.length, 4);
  assert.equal(JSON.parse(sent.input).conversation[0].role, "user");
  assert.equal(r.requires_human_review, true);
  assert.equal(r.task, "strategy");
});
test("revision requests require a real draft and include only bounded explicit editing context", async () => {
  const { prepareAnalysis } = await import("../../server/ai.mjs");
  const request = {
    task: "refine",
    opportunity_key: C.opportunityKey(o),
    revision_request: "Clarify the measurement plan.",
    proposal: {
      narrative: "Actual agency draft",
      narrativeVersions: [{ text: "Private prior version" }],
    },
  };
  const p = prepareAnalysis(request, feed);
  assert.equal(p.evidence.application_work.narrative, "Actual agency draft");
  assert.equal(p.evidence.revision_request, request.revision_request);
  assert.ok(!JSON.stringify(p.evidence).includes("Private prior version"));
  assert.throws(
    () => prepareAnalysis({ ...request, proposal: {} }, feed),
    /Add your application narrative/,
  );
  assert.throws(
    () => prepareAnalysis({ ...request, revision_request: "x" }, feed),
    /8–2,000/,
  );
  const app = S.cleanApplication({
    narrative: "Current",
    narrativeVersions: Array.from({ length: 8 }, () => ({
      text: "Original",
      at: "2026-11-05",
      label: "Before revision",
      secret: "omit",
    })),
  });
  assert.equal(app.narrativeVersions.length, 5);
  assert.ok(!JSON.stringify(app).includes("omit"));
});
test("reporting separates selected agency measures from funder rules and supports retained award context only for reporting", async () => {
  const { prepareAnalysis, validateAnalysis } = await import(
    "../../server/ai.mjs"
  );
  const request = {
    task: "reporting",
    opportunity_key: C.opportunityKey(o),
    aggregate_results: [
      {
        period: "2026 Q3",
        program: "Adult education",
        metric: "Credentials earned",
        value: 24,
        target: 30,
        source_system: "AchieveDXP aggregate export",
        notes: "Agency entered",
        learnerName: "PRIVATE",
      },
    ],
    reporting_period: "2026 Q3",
    saved_opportunity: o,
  };
  const p = prepareAnalysis(request, { opportunities: [] });
  assert.match(p.evidence.source.provenance, /retained/);
  assert.equal(p.evidence.aggregate_results.length, 1);
  assert.ok(!JSON.stringify(p.evidence).includes("PRIVATE"));
  const r = {
    summary: "Report the selected cohort.",
    route: "unknown",
    findings: [],
    next_actions: [],
    draft_sections: [
      {
        heading: "Education delivery",
        body: "The agency reports 24 credentials for Q3.",
        evidence: [
          { source_id: "A1", quote: "Metric: Credentials earned\nActual: 24" },
        ],
      },
    ],
    missing_information: [],
    extracted_criteria: [],
  };
  assert.equal(
    validateAnalysis(r, p.references).draft_sections[0].evidence[0].kind,
    "agency_result",
  );
  assert.throws(
    () =>
      validateAnalysis(
        {
          ...r,
          extracted_criteria: [
            {
              title: "Fabricated requirement",
              points: null,
              evidence: r.draft_sections[0].evidence,
            },
          ],
        },
        p.references,
      ),
    /could not be verified/,
  );
  assert.throws(
    () =>
      prepareAnalysis(
        { ...request, task: "eligibility" },
        { opportunities: [] },
      ),
    /no longer/,
  );
  assert.throws(
    () =>
      prepareAnalysis(
        {
          ...request,
          aggregate_results: [{ ...request.aggregate_results[0], value: -5 }],
        },
        feed,
      ),
    /nonnegative/,
  );
});
