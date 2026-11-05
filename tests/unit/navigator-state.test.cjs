const { test } = require("node:test");
const assert = require("node:assert/strict");
const S = require("../../navigator-state.js");
test("evidence coverage requires a funder requirement, source, and agency evidence", () => {
  const a = S.cleanApplication({
    criteria: [
      {
        title: "Need",
        requirement: "Show need",
        url: "https://agency.gov/notice",
        evidence: "Aggregate baseline",
        draft: "Draft response",
      },
      {
        title: "Approach",
        requirement: "",
        url: "javascript:alert(1)",
        evidence: "An assertion",
      },
    ],
    budget: [
      { label: "Instruction", amount: 40000, allowable: true },
      { label: "Evaluation", amount: 5000 },
    ],
    committed: 10000,
  });
  assert.deepEqual(S.coverage(a), {
    total: 2,
    cited: 1,
    evidenced: 1,
    drafted: 1,
  });
  assert.deepEqual(S.budget(a), {
    total: 45000,
    committed: 10000,
    gap: 35000,
    unreviewed: 1,
  });
  assert.ok(S.gaps(a).some((x) => x.includes("official requirement")));
  assert.ok(S.gaps(a).some((x) => x.includes("allowability")));
});
test("aggregate CSV handles quoted definitions and rejects individual data or invalid values atomically", () => {
  const rows = S.parseResultsCsv(
    'period,program,metric,value,target,source_url,source_system,notes\n2026 Q3,Education,"Credentials, earned",24,30,https://example.gov/evidence,AchieveDXP export,"Definition: completed, verified"\n',
  );
  assert.equal(rows[0].metric, "Credentials, earned");
  assert.equal(rows[0].value, 24);
  assert.equal(rows[0].source_system, "AchieveDXP export");
  assert.throws(
    () =>
      S.parseResultsCsv(
        "period,program,metric,value,learner_name\nQ3,Education,Completion,5,Person",
      ),
    /Individual learner/,
  );
  assert.throws(
    () =>
      S.parseResultsCsv(
        "period,program,metric,value\nQ3,Education,Completion,5\nQ3,Education,Completion,-2",
      ),
    /Row 3/,
  );
  assert.throws(
    () =>
      S.parseResultsCsv('period,program,metric,value\nQ3,Education,"Broken,5'),
    /unclosed/,
  );
});
test("workspace restoration bounds drafts, excludes unrecognized profile data, and never accepts unsupported eligibility", () => {
  const value = S.clean({
    profile: {
      agencyName: "DOC",
      contactEmail: "private@example.test",
      goals: ["ged", "unknown"],
    },
    saved: ["opportunity:grants_gov:1", "bad"],
    applications: {
      "opportunity:grants_gov:1": {
        narrative: "x".repeat(25000),
        requirements: {
          applicant: {
            status: "met",
            evidence: "",
            url: "https://example.gov",
          },
        },
      },
    },
    connectionCode: "secret",
  });
  assert.deepEqual(value.profile.goals, ["ged"]);
  assert.equal(
    value.applications["opportunity:grants_gov:1"].narrative.length,
    24000,
  );
  assert.equal(
    value.applications["opportunity:grants_gov:1"].requirements.applicant
      .status,
    "unknown",
  );
  assert.ok(!JSON.stringify(value).includes("private@example"));
  assert.ok(!JSON.stringify(value).includes("secret"));
});
test("saved notices retain identity and source text for reporting after feed retirement", () => {
  const id = "opportunity:grants_gov:retired",
    o = {
      source: "grants_gov",
      source_id: "retired",
      title: "Education notice",
      source_url: "https://example.gov/notice",
      synopsis: "Source requirements",
      status: "posted",
      saved_snapshot_at: "2026-11-05T00:00:00Z",
    };
  const restored = S.clean({
    saved: [id],
    snapshots: { [id]: o, "opportunity:grants_gov:wrong": o },
  });
  assert.equal(restored.snapshots[id].title, "Education notice");
  assert.equal(Object.keys(restored.snapshots).length, 1);
  assert.equal(restored.snapshots[id].saved_snapshot_at, o.saved_snapshot_at);
});
