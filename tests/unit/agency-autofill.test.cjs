const { test } = require("node:test");
const assert = require("node:assert/strict");
const D = require("../../agency-directory.js");
const S = require("../../navigator-state.js");
const empty = {
  agencyType: "state_doc",
  stateCode: "",
  agencyName: "",
  website: "",
  unit: "",
};
test("state and known agency selections resolve the same DOC identity in either direction", () => {
  const id = D.resolveIdentity(empty, "stateCode", "ID");
  assert.equal(id.agencyName, "Idaho Department of Correction");
  assert.equal(id.website, "https://www.idoc.idaho.gov/");
  const reverse = D.resolveIdentity(
    { ...empty, agencyType: "college" },
    "agencyName",
    "  idaho department of correction  ",
  );
  assert.deepEqual(reverse, id);
  assert.equal(D.jurisdictions.length, 56);
});
test("changing jurisdiction replaces the previous DOC and unit, but unsupported applicants are never guessed", () => {
  const id = {
    ...D.resolveIdentity(empty, "stateCode", "ID"),
    unit: "Idaho facility",
  };
  const mi = D.resolveIdentity(id, "stateCode", "MI");
  assert.equal(mi.agencyName, "Michigan Department of Corrections");
  assert.equal(mi.website, "https://www.michigan.gov/corrections");
  assert.equal(mi.unit, "");
  const territory = D.resolveIdentity(mi, "stateCode", "GU");
  assert.equal(territory.agencyName, "");
  assert.equal(territory.website, "");
  const county = D.resolveIdentity(id, "agencyType", "county_jail");
  assert.equal(county.agencyName, "");
  assert.equal(county.website, "");
  const custom = {
    ...empty,
    agencyType: "county_jail",
    agencyName: "Custom local agency",
    website: "https://example.gov/agency",
  };
  assert.equal(
    D.resolveIdentity(custom, "stateCode", "ID").agencyName,
    custom.agencyName,
  );
  assert.equal(
    D.resolveIdentity(custom, "stateCode", "ID").website,
    custom.website,
  );
});
test("older partial DOC profiles fill missing details while custom identity edits are retained", () => {
  const id = D.resolveIdentity({ ...empty, stateCode: "ID" });
  assert.equal(id.agencyName, "Idaho Department of Correction");
  const edited = { ...id, website: "https://www.idoc.idaho.gov/education" };
  assert.deepEqual(D.resolveIdentity(edited), edited);
  const custom = { ...edited, agencyName: "Agency education division" };
  assert.deepEqual(D.resolveIdentity(custom), custom);
  const inconsistent = { ...id, stateCode: "MI", unit: "Old unit" };
  assert.equal(
    D.resolveIdentity(inconsistent).agencyName,
    "Michigan Department of Corrections",
  );
  assert.equal(D.resolveIdentity(inconsistent).unit, "");
});
test("workspace restore retains explicit prompt clearing and per-grant working context without sharing evidence selections", () => {
  const a = "opportunity:grants_gov:a",
    b = "opportunity:grants_gov:b";
  const state = S.clean({
    saved: [a, b],
    journey: {
      focusKey: b,
      strategyPrompt: "",
      strategyMode: "shortlist",
      identityAutofillComplete: true,
    },
    applications: {
      [a]: {
        reportPeriod: "Q1",
        reportResultIds: ["a"],
        workTab: "write",
        revisionRequest: "Clarify the need",
        programPlanSeeded: true,
      },
      [b]: { reportPeriod: "Q2", reportResultIds: ["b"], workTab: "budget" },
    },
  });
  assert.equal(state.journey.strategyPrompt, "");
  assert.equal(state.journey.strategyMode, "shortlist");
  assert.equal(state.journey.focusKey, b);
  assert.equal(state.journey.identityAutofillComplete, true);
  assert.equal(state.applications[a].reportPeriod, "Q1");
  assert.equal(state.applications[b].reportPeriod, "Q2");
  assert.deepEqual(state.applications[a].reportResultIds, ["a"]);
  assert.deepEqual(state.applications[b].reportResultIds, ["b"]);
  assert.equal(state.applications[a].revisionRequest, "Clarify the need");
  assert.equal(state.applications[b].workTab, "budget");
});
