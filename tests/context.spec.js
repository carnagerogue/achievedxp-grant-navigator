const { test, expect } = require("@playwright/test");
const C = require("../grant-core.js");
const notices = ["a", "b"].map((id) => ({
  source: "grants_gov",
  source_id: id,
  source_kind: "federal",
  title: "Correctional education " + id,
  source_url: "https://example.gov/" + id,
  status: "posted",
  close_date: "2099-12-01",
  synopsis:
    "State governments may apply for correctional education and workforce training.",
}));
const [a, b] = notices.map(C.opportunityKey);
const profile = {
  agencyName: "Idaho Department of Correction",
  agencyType: "state_doc",
  stateCode: "ID",
  programName: "Adult learning initiative",
  activities:
    "Deliver adult literacy and credential preparation with education partners.",
  goals: ["ged"],
  baseline: "Agency-approved baseline to review.",
};
const program = {
  need: "Documented gaps in adult literacy instruction and credentials.",
  learners: "Adult learners",
  evaluation:
    "Track credentials by cohort and period using aggregate education records.",
};
async function open(page, route = "journey", seed) {
  await page.route("**/config.js", (r) =>
    r.fulfill({
      body: "window.NAV_CONFIG={aiEnabled:false};",
      contentType: "text/javascript",
    }),
  );
  await page.route("**/opportunities.json", (r) =>
    r.fulfill({ json: { opportunities: notices, saa: { states: {} } } }),
  );
  if (seed)
    await page.addInitScript((seed) => {
      if (!localStorage.getItem("achievedxp_workspace_v3"))
        localStorage.setItem("achievedxp_workspace_v3", JSON.stringify(seed));
    }, seed);
  await page.goto("/dist/#" + route);
  await expect(page.locator("#main")).toBeVisible();
}
async function nav(page, name) {
  await page.getByRole("button", { name, exact: true }).click();
}
test("DOC identification autofills in either direction and shared profile edits survive navigation without a save step", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let calls = 0;
  await page.route("**/api/ai/**", (r) => {
    calls++;
    return r.fulfill({ status: 503, json: { error: "Not configured" } });
  });
  await open(page);
  const state = page.getByRole("combobox", {
    name: "State or territory",
    exact: true,
  });
  await state.focus();
  await state.selectOption("ID");
  await expect(state).toBeFocused();
  await expect(page.getByLabel("Agency name", { exact: true })).toHaveValue(
    "Idaho Department of Correction",
  );
  await expect(
    page.getByLabel("Official website", { exact: true }),
  ).toHaveValue("https://www.idoc.idaho.gov/");
  await expect(
    page.getByRole("button", { name: "Use this agency", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Agency name", { exact: true })
    .fill("Michigan Department of Corrections");
  await expect(state).toHaveValue("MI");
  await expect(
    page.getByLabel("Official website", { exact: true }),
  ).toHaveValue("https://www.michigan.gov/corrections");
  await page
    .getByLabel("Official website", { exact: true })
    .fill("https://www.michigan.gov/corrections/education");
  await page
    .getByLabel("Facility, region or education unit", { exact: true })
    .fill("Education services");
  await nav(page, "Continue with my own research");
  await page
    .getByLabel("I have confirmed the agency and the legal applicant.")
    .check();
  await nav(page, "Continue with research gaps");
  await expect(
    page.getByLabel("Where will it operate?", { exact: true }),
  ).toHaveValue("Education services");
  await page
    .getByLabel("Program name", { exact: true })
    .fill("Retained program");
  await page
    .getByLabel("What will you deliver?", { exact: true })
    .fill(profile.activities);
  await nav(page, "Agency profile");
  await expect(
    page.getByLabel("Official website", { exact: true }),
  ).toHaveValue("https://www.michigan.gov/corrections/education");
  await expect(page.getByLabel("Program name", { exact: true })).toHaveValue(
    "Retained program",
  );
  await page
    .getByLabel("Program name", { exact: true })
    .fill("Updated shared program");
  await nav(page, "Funding journey");
  await expect(page.getByLabel("Program name", { exact: true })).toHaveValue(
    "Updated shared program",
  );
  await page.reload();
  await expect(page.getByLabel("Program name", { exact: true })).toHaveValue(
    "Updated shared program",
  );
  await nav(page, "Agency profile");
  await page
    .getByRole("combobox", { name: "State or territory", exact: true })
    .selectOption("ID");
  await expect(page.getByLabel("Agency name", { exact: true })).toHaveValue(
    "Idaho Department of Correction",
  );
  await expect(
    page.getByLabel("Facility, region or education unit", { exact: true }),
  ).toHaveValue("");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("achievedxp_workspace_v3")),
  );
  expect(saved.journey.identityConfirmed).toBe(false);
  expect(saved.journey.reviewedIdentity).toBe("");
  await page.getByLabel("Official website", { exact: true }).fill("");
  await page.reload();
  await expect(
    page.getByLabel("Official website", { exact: true }),
  ).toHaveValue("");
  expect(calls).toBe(0);
  expect(errors).toEqual([]);
});
test("active application, editor and reporting context travel together while each grant retains its own work", async ({
  page,
}) => {
  const seed = {
    profile,
    journey: {
      step: "funding",
      identityConfirmed: true,
      website: "https://www.idoc.idaho.gov/",
      focusKey: b,
      program,
    },
    saved: [a, b],
    snapshots: Object.fromEntries(notices.map((n) => [C.opportunityKey(n), n])),
    applications: { [a]: { reportResultIds: ["r1"] }, [b]: {} },
    results: [
      {
        id: "r1",
        program: "Adult learning initiative",
        period: "2026 Q3",
        metric: "Credentials",
        value: 12,
        source_system: "Agency record",
      },
      {
        id: "r2",
        program: "Adult learning initiative",
        period: "2026 Q4",
        metric: "Completions",
        value: 20,
        source_system: "Agency record",
      },
    ],
  };
  await open(page, "workbench", seed);
  await expect(page.locator("#workOpportunity")).toHaveValue(b);
  await page.locator("[data-work-tab=write]").click();
  await expect(page.locator("[data-app=outcomes]")).toHaveValue(
    program.evaluation,
  );
  await page
    .locator("[data-app=outcomes]")
    .fill("Tailored reporting plan for grant B.");
  await page
    .locator("#revisionRequest")
    .fill("Clarify the evidence for grant B.");
  await nav(page, "Outcomes & reporting");
  await expect(page.locator("#reportGrant")).toHaveValue(b);
  await page.locator("#reportPeriod").selectOption("2026 Q3");
  await expect(
    page.getByLabel("Include Credentials in report", { exact: true }),
  ).not.toBeChecked();
  await page
    .getByLabel("Include Credentials in report", { exact: true })
    .check();
  await page.locator("#reportGrant").selectOption(a);
  await page.locator("#reportPeriod").selectOption("2026 Q4");
  await expect(
    page.getByLabel("Include Completions in report", { exact: true }),
  ).not.toBeChecked();
  await nav(page, "Proposal workbench");
  await expect(page.locator("#workOpportunity")).toHaveValue(a);
  await page.locator("#workOpportunity").selectOption(b);
  await expect(page.locator("[data-work-tab=write]")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator("[data-app=outcomes]")).toHaveValue(
    "Tailored reporting plan for grant B.",
  );
  await expect(page.locator("#revisionRequest")).toHaveValue(
    "Clarify the evidence for grant B.",
  );
  await page.reload();
  await expect(page.locator("#workOpportunity")).toHaveValue(b);
  await expect(page.locator("[data-app=outcomes]")).toHaveValue(
    "Tailored reporting plan for grant B.",
  );
  await nav(page, "Outcomes & reporting");
  await expect(page.locator("#reportPeriod")).toHaveValue("2026 Q3");
  await expect(
    page.getByLabel("Include Credentials in report", { exact: true }),
  ).toBeChecked();
  await page.locator("#reportGrant").selectOption(a);
  await expect(page.locator("#reportPeriod")).toHaveValue("2026 Q4");
  await nav(page, "Funding journey");
  await expect(page.locator("#journeyFocus")).toHaveValue(a);
  await page.locator("#journeyFocus").selectOption(b);
  await nav(page, "Proposal workbench");
  await expect(page.locator("#workOpportunity")).toHaveValue(b);
  await page.locator("[data-app=outcomes]").fill("");
  await page.reload();
  await expect(page.locator("[data-app=outcomes]")).toHaveValue("");
});
test("program context seeds strategy without retyping and custom prompts and scope survive reload", async ({
  page,
}) => {
  await open(page, "intelligence", { profile, journey: { program } });
  const prompt = await page.locator("#missionPrompt").inputValue();
  expect(prompt).toContain(profile.agencyName);
  expect(prompt).toContain(program.need);
  expect(prompt).toContain(profile.activities);
  await page
    .locator("#missionPrompt")
    .fill("Find workforce partner routes for our current education program.");
  await page.locator("#strategyMode").selectOption("shortlist");
  await nav(page, "Agency profile");
  await nav(page, "Intelligence");
  await expect(page.locator("#missionPrompt")).toHaveValue(
    "Find workforce partner routes for our current education program.",
  );
  await page.reload();
  await expect(page.locator("#strategyMode")).toHaveValue("shortlist");
  await expect(page.locator("#missionPrompt")).toHaveValue(
    "Find workforce partner routes for our current education program.",
  );
  await page.locator("#missionPrompt").fill("");
  await page.reload();
  await expect(page.locator("#missionPrompt")).toHaveValue("");
});
test("older state-only profiles complete on mobile and non-DOC applicants stay editable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "journey", {
    profile: { agencyType: "state_doc", stateCode: "ID" },
  });
  await expect(page.getByLabel("Agency name", { exact: true })).toHaveValue(
    "Idaho Department of Correction",
  );
  await page
    .getByRole("combobox", { name: "Applicant type", exact: true })
    .selectOption("county_jail");
  await expect(page.getByLabel("Agency name", { exact: true })).toHaveValue("");
  await page
    .getByLabel("Agency name", { exact: true })
    .fill("County education team");
  await page
    .getByLabel("Official website", { exact: true })
    .fill("https://example.gov/education");
  await page
    .getByRole("combobox", { name: "State or territory", exact: true })
    .selectOption("MI");
  await expect(page.getByLabel("Agency name", { exact: true })).toHaveValue(
    "County education team",
  );
  await page.reload();
  await expect(
    page.getByLabel("Official website", { exact: true }),
  ).toHaveValue("https://example.gov/education");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
