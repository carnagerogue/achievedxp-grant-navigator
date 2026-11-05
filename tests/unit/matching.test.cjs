const { test } = require("node:test");
const assert = require("node:assert/strict");
const matching = require("../../matching.js");
const profile = {
  agencyType: "state_doc",
  stateCode: "MI",
  goals: ["ged", "cte", "reentry"],
};
const source = {
  title: "Correctional education and workforce training",
  status: "posted",
  close_date: "12/01/2099",
};
test("research priorities explain topic alignment while preserving unknown eligibility facts", () => {
  const assessment = matching.assess(source, profile);
  assert.equal(assessment.priority, "review_now");
  assert.ok(assessment.reasons.some((r) => r.includes("corrections")));
  assert.ok(assessment.reasons.some((r) => r.includes("career training")));
  assert.ok(
    assessment.missing.some((r) => r.includes("Eligible applicant types")),
  );
  assert.equal(assessment.score, undefined);
  assert.equal(assessment.eligible, undefined);
});
test("closed dates, geographic exclusions, and agency-cited blockers outrank topic enthusiasm", () => {
  assert.equal(
    matching.assess({ ...source, close_date: "01/01/2000" }, profile).priority,
    "closed",
  );
  assert.equal(
    matching.assess({ ...source, states: ["CA"] }, profile).priority,
    "outside_state",
  );
  const review = {
    requirements: {
      activities: {
        status: "not_met",
        evidence: "Equipment purchases are not permitted.",
        url: "https://www.grants.gov/example",
      },
    },
  };
  assert.equal(matching.assess(source, profile, review).priority, "blocked");
  assert.equal(
    matching.assess({ ...source, status: "forecasted" }, profile).priority,
    "forecast",
  );
});
test("nonprofit applicant signals identify a partner question without claiming DOC eligibility", () => {
  const assessment = matching.assess(
    {
      ...source,
      source_kind: "corporate",
      applicant_types: ["501(c)(3) nonprofits"],
    },
    profile,
  );
  assert.equal(assessment.priority, "partner");
  assert.ok(
    assessment.missing.some((r) => r.includes("eligible lead partner")),
  );
  const routes = matching.routes(profile);
  assert.ok(routes.some((r) => r.category === "State education"));
  assert.ok(routes.some((r) => r.category === "Workforce"));
  assert.ok(routes.some((r) => r.category === "Corporate / foundation"));
  assert.ok(
    routes.every((r) => r.url.startsWith("https:") && !r.deadline && !r.award),
  );
});
test("guided plans require goal alignment and do not confuse document corrections or faculty careers with DOC education", () => {
  const education = { ...profile, goals: ["ged", "cte"] };
  const nasa = matching.assess(
    {
      ...source,
      title: "Cryosphere research",
      synopsis:
        "Amendments, clarifications, and corrections to the research announcement.",
    },
    education,
  );
  assert.equal(nasa.corrections, false);
  assert.equal(matching.alignedForPlan(nasa), false);
  const law = matching.assess(
    {
      ...source,
      title: "Law and Science",
      synopsis:
        "Punishment and Corrections. Faculty Early Career Development (CAREER) Program.",
    },
    education,
  );
  assert.equal(law.goalMatches, 0);
  assert.equal(matching.alignedForPlan(law), false);
  const aircraft = matching.assess(
    {
      ...source,
      title: "Counter Unmanned Aircraft Systems",
      synopsis:
        "Accredited law enforcement and correctional agencies may seek mitigation equipment.",
    },
    education,
  );
  assert.equal(matching.alignedForPlan(aircraft), false);
  const cyber = matching.assess(
    {
      ...source,
      title: "Workforce development for cyberinfrastructure",
      synopsis:
        "Integrate core literacy and advanced skills in cyberinfrastructure for university researchers.",
    },
    education,
  );
  assert.equal(cyber.goalMatches, 1);
  assert.equal(matching.alignedForPlan(cyber), false);
  assert.equal(
    matching.alignedForPlan(matching.assess(source, education)),
    true,
  );
});
