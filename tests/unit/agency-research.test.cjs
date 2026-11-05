const { test } = require("node:test"),
  assert = require("node:assert/strict");
const J = require("../../journey-state.js"),
  S = require("../../navigator-state.js");
const agency = {
  name: "Example Department of Corrections",
  website: "https://corrections.example.gov/education",
  state: "MI",
  type: "state_doc",
  unit: "Education services",
  contactEmail: "private@example.test",
};
function response({
  url = agency.website,
  completed = true,
  annotations = true,
} = {}) {
  const text =
    "Education: The agency describes adult literacy and credential pathways. [source]\n\nPartners: It describes education-provider arrangements requiring confirmation. [source]";
  const first = text.indexOf("[source]"),
    last = text.lastIndexOf("[source]");
  return {
    status: "completed",
    output: [
      {
        type: "web_search_call",
        status: completed ? "completed" : "in_progress",
      },
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text,
            annotations: annotations
              ? [
                  {
                    type: "url_citation",
                    url,
                    title: "Agency education services",
                    start_index: first,
                    end_index: first + 8,
                  },
                  {
                    type: "url_citation",
                    url,
                    title: "Agency partnerships",
                    start_index: last,
                    end_index: last + 8,
                  },
                ]
              : [],
          },
        ],
      },
    ],
  };
}
test("agency research requests hosted web search with bounded official-domain scope and excludes unrelated agency fields", async () => {
  const { prepareAgencyResearch, runAgencyResearch } = await import(
    "../../server/agency-research.mjs"
  );
  let sent;
  const r = await runAgencyResearch(prepareAgencyResearch({ agency }), {
    apiKey: "unit-test-only",
    model: "configured-model",
    researchModel: "research-model",
    fetchImpl: async (url, init) => {
      sent = JSON.parse(init.body);
      return Response.json(response());
    },
  });
  assert.equal(sent.model, "research-model");
  assert.equal(sent.store, false);
  assert.equal(sent.tools[0].type, "web_search");
  assert.equal(sent.tools[0].external_web_access, true);
  assert.equal(sent.tool_choice, "required");
  assert.ok(
    sent.tools[0].filters.allowed_domains.includes("corrections.example.gov"),
  );
  assert.ok(!sent.input.includes("private@example"));
  assert.equal(r.facts.length, 2);
  assert.equal(r.facts[0].accepted, false);
  assert.equal(r.requires_human_review, true);
  assert.equal(r.facts[0].category, "Education");
});
test("agency findings require an actual completed search and in-range provider citations from allowed public domains", async () => {
  const { prepareAgencyResearch, researchFromResponse } = await import(
    "../../server/agency-research.mjs"
  );
  const p = prepareAgencyResearch({ agency });
  for (const v of [
    response({ completed: false }),
    response({ annotations: false }),
    response({ url: "https://untrusted.example.test/" }),
    response({ url: "https://corrections.example.gov.evil.test/" }),
  ])
    assert.throws(
      () => researchFromResponse(v, p),
      /No agency research|No usable agency/,
    );
  const bad = response();
  bad.output[1].content[0].annotations.forEach((a) => (a.end_index = 999999));
  assert.throws(() => researchFromResponse(bad, p), /No usable/);
  const crossing = response();
  const paragraph = crossing.output[1].content[0];
  paragraph.annotations = [paragraph.annotations[0]];
  paragraph.annotations[0].end_index = paragraph.text.length;
  assert.throws(() => researchFromResponse(crossing, p), /No usable/);
  const valid = researchFromResponse(response(), p);
  assert.equal(valid[0].sources[0].url, agency.website);
  assert.ok(!valid[0].text.includes("https://"));
});
test("agency URLs reject credentials, private address literals and non-public hosts before provider access", async () => {
  const { prepareAgencyResearch } = await import(
    "../../server/agency-research.mjs"
  );
  for (const website of [
    "http://example.gov",
    "https://127.0.0.1/",
    "https://[::1]/",
    "https://localhost/",
    "https://private.local/",
    "https://user:pass@example.gov/",
    "https://example.gov:8443/",
  ])
    assert.throws(
      () => prepareAgencyResearch({ agency: { ...agency, website } }),
      /public HTTPS/,
    );
});
test("only explicitly reviewed current-agency notes survive into model context and restored workspaces", () => {
  const p = {
      agencyName: agency.name,
      agencyType: agency.type,
      stateCode: "MI",
    },
    j = J.clean({
      website: agency.website,
      unit: "Education services",
      research: {
        facts: [
          {
            category: "Education",
            text: "Public agency education context.",
            accepted: true,
            sources: [{ url: agency.website, title: "Education" }],
            credential: "exclude",
          },
        ],
      },
    });
  j.research.identity = J.identity(p, j);
  j.reviewedIdentity = j.research.identity;
  assert.equal(J.researchContext(p, j).length, 1);
  assert.equal(
    J.researchContext({ ...p, agencyName: "Different DOC" }, j).length,
    0,
  );
  j.research.facts[0].accepted = false;
  assert.equal(J.researchContext(p, j).length, 0);
  const restored = S.clean({ profile: p, journey: j });
  assert.ok(!JSON.stringify(restored.journey).includes("credential"));
  assert.equal(restored.journey.research.facts.length, 1);
  assert.deepEqual(
    J.clean({ research: { facts: [null, 7] } }).research.facts,
    [],
  );
});
test("manual research needs both a reviewed agency identity and a public source; program evidence remains agency-entered", () => {
  const p = {
    agencyName: "Example DOC",
    goals: ["ged"],
    programName: "Adult education",
    activities: "Provide adult literacy instruction and credentials.",
  };
  const j = J.clean({
    website: agency.website,
    researchMode: "manual",
    manualNotes: "Reviewed agency program context.",
    manualUrl: agency.website,
    program: {
      need: "Documented gap in access to adult education.",
      learners: "Adult incarcerated learners",
    },
  });
  assert.equal(J.researchContext(p, j).length, 0);
  j.reviewedIdentity = J.identity(p, j);
  assert.equal(J.researchContext(p, j).length, 1);
  assert.ok(J.programReady(p, j));
  assert.match(J.mission(p, j), /Adult incarcerated learners/);
  assert.equal(
    J.researchContext(p, { ...j, manualUrl: "javascript:alert(1)" }).length,
    0,
  );
});
test("reviewed research and the program brief reach strategy and application context without becoming official grant evidence", async () => {
  const { prepareAnalysis } = await import("../../server/ai.mjs");
  const context = [
      {
        category: "Education",
        text: "Reviewed public agency context.",
        sources: [{ url: agency.website, title: "Source" }],
        private: "exclude",
      },
    ],
    o = {
      source: "grants_gov",
      source_id: "1",
      source_url: "https://grants.gov/example",
      title: "Correctional education",
      synopsis: "States may apply for correctional education support.",
      status: "posted",
      close_date: "2099-01-01",
    },
    feed = { opportunities: [o] };
  const result = prepareAnalysis(
    {
      task: "review",
      opportunity_key: "opportunity:grants_gov:1",
      agency_research: context,
      program_brief: { need: "Adult education gap", secret: "exclude" },
    },
    feed,
  );
  assert.equal(result.evidence.agency_research[0].text, context[0].text);
  assert.ok(!JSON.stringify(result.evidence).includes("exclude"));
  assert.deepEqual(Object.keys(result.references), ["S1"]);
  const strategy = prepareAnalysis(
    {
      task: "strategy",
      mission: "Expand adult education and credential opportunities.",
      agency_research: context,
      program_brief: { need: "Adult education gap" },
    },
    feed,
  );
  assert.equal(strategy.agency_research.length, 1);
  assert.equal(strategy.program_brief.need, "Adult education gap");
});
