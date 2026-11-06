const { test, expect } = require("@playwright/test");
const fs = require("node:fs/promises");
const quote =
  "State governments are eligible applicants for correctional education activities. Applications must describe measurable learner outcomes.";
const opportunities = [
  {
    source: "grants_gov",
    source_id: "doc-1",
    source_kind: "federal",
    title: "Correctional education and reentry",
    agency: "Example public funder",
    synopsis: quote,
    applicant_types: ["State governments"],
    status: "posted",
    close_date: "2099-12-01",
    award_ceiling: 500000,
    source_url: "https://example.gov/notice",
  },
  {
    source: "grants_gov",
    source_id: "doc-2",
    source_kind: "workforce",
    title: "Reentry workforce training",
    agency: "Example workforce funder",
    synopsis: quote,
    status: "posted",
    close_date: "2099-12-02",
    source_url: "https://example.gov/workforce",
  },
];
async function open(page, { ai = false, path = "/" } = {}) {
  await page.route("**/opportunities.json", (r) =>
    r.fulfill({
      json: {
        opportunities,
        awards: [],
        foundations: [],
        saa: {
          states: {
            MI: {
              name: "Michigan",
              agency: "State agency",
              url: "https://michigan.gov",
              verify: true,
            },
          },
        },
        last_synced_at: "2026-11-05T00:00:00Z",
      },
    }),
  );
  await page.route("**/config.js", (r) =>
    r.fulfill({
      body:
        "window.NAV_CONFIG=" +
        JSON.stringify({ aiEnabled: ai, aiAuthMode: "site" }) +
        ";",
      contentType: "text/javascript",
    }),
  );
  await page.route("https://fonts.googleapis.com/**", (r) =>
    r.fulfill({ body: "", contentType: "text/css" }),
  );
  await page.goto(path + "#discover");
  await expect(page.locator(".opportunity")).toHaveCount(2);
}
async function workbench(page) {
  await page
    .locator('[data-record="opportunity:grants_gov:doc-1"]')
    .getByRole("button", { name: "Review", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Make the go / no-go decision." }),
  ).toBeVisible();
}
test("discovery, comparison and a cited application survive reload with a valid export", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Set up agency profile" }).click();
  await page.getByLabel("Agency name", { exact: true }).fill("Example DOC");
  await page.getByLabel("Program name", { exact: true }).fill("Education");
  await page.getByLabel("State or territory").selectOption("MI");
  await page.getByLabel("Adult education & literacy").check();
  await page.getByLabel("Our agency already uses AchieveDXP").check();
  await page
    .getByRole("button", { name: "Explore funding", exact: true })
    .click();
  await page.locator("[data-compare]").nth(0).check();
  await page.locator("[data-compare]").nth(1).check();
  await page.getByRole("tab", { name: /Compare/ }).click();
  await expect(page.getByRole("dialog")).toContainText("State governments");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await workbench(page);
  await page.locator("[data-app=owner]").fill("Education grants team");
  await page.locator("[data-app=route]").selectOption("direct");
  await page.getByText("Document the six eligibility checks").click();
  await page
    .locator("[data-requirement=applicant][data-prop=status]")
    .selectOption("met");
  await expect(
    page.locator("[data-requirement=applicant][data-prop=status]"),
  ).toHaveValue("unknown");
  await page
    .locator("[data-requirement=applicant][data-prop=evidence]")
    .fill(quote);
  await page
    .locator("[data-requirement=applicant][data-prop=status]")
    .selectOption("met");
  await page.getByRole("tab", { name: "02 Evidence & criteria" }).click();
  await page.getByRole("button", { name: "Add review criterion" }).click();
  await page
    .getByLabel("Review criterion", { exact: true })
    .fill("Measurable outcomes");
  await page.getByLabel("Funder’s requirement").fill(quote);
  await page
    .getByLabel("Requirement source URL")
    .fill("https://example.gov/notice");
  await page
    .getByLabel("Agency evidence")
    .fill("Example aggregate data: 24 credentials in Q3, agency verified.");
  await page.getByRole("tab", { name: "03 Write" }).click();
  await page
    .getByLabel("Application narrative")
    .fill(
      "The education team proposes a credential pathway supported by aggregate evidence.",
    );
  await page.getByRole("tab", { name: "04 Budget" }).click();
  await page.getByRole("button", { name: "Add budget line" }).click();
  await page.getByLabel("Cost category").fill("Instruction");
  await page.getByLabel("Agency amount (USD)").fill("45000");
  await page
    .getByLabel("Justification & source rule")
    .fill("Agency entered cost; confirm allowability.");
  await page.getByLabel("Agency reviewed allowability").check();
  await page.getByRole("tab", { name: "05 Submit" }).click();
  await page.getByLabel("Confirm applicant eligibility").check();
  await page.reload();
  await expect(page.getByRole("tab", { name: "05 Submit" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("tab", { name: "01 Qualify" }).click();
  await expect(
    page.getByRole("heading", { name: "Make the go / no-go decision." }),
  ).toBeVisible();
  await expect(page.locator("[data-app=owner]")).toHaveValue(
    "Education grants team",
  );
  await page.getByRole("tab", { name: "02 Evidence & criteria" }).click();
  await expect(page.getByLabel("Agency evidence")).toContainText(
    "24 credentials",
  );
  await expect(page.locator(".coverage")).toContainText("1 / 1");
  const d = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export application", exact: true })
    .click();
  const text = await fs.readFile(await (await d).path(), "utf8");
  expect(text).toContain("Measurable outcomes");
  expect(text).toContain("$45,000");
  expect(text).not.toMatch(/Nucleos.*\$|secret/);
});
test("AchieveDXP aggregate evidence can support a criterion and a grant progress report", async ({
  page,
}) => {
  await open(page);
  await workbench(page);
  await page.getByRole("tab", { name: "02 Evidence & criteria" }).click();
  await page.getByRole("button", { name: "Add review criterion" }).click();
  await page
    .getByLabel("Review criterion", { exact: true })
    .fill("Education outcomes");
  await page
    .getByRole("button", { name: "Outcomes & reporting", exact: true })
    .click();
  await page.getByRole("button", { name: "Add program result" }).click();
  await page
    .getByLabel("Program", { exact: true })
    .fill("Example education program");
  await page.getByLabel("Reporting period", { exact: true }).fill("2026 Q3");
  await page.getByLabel("Metric & unit").fill("Credentials earned");
  await page.getByLabel("Actual value").fill("24");
  await page.getByLabel("Target (optional)").fill("30");
  await page.getByLabel("Source system").fill("AchieveDXP export");
  await page
    .getByLabel("Evidence URL (optional)")
    .fill("https://example.gov/aggregate-evidence");
  await page.getByRole("button", { name: "Save program result" }).click();
  await expect(page.locator("table")).toContainText("AchieveDXP export");
  await page
    .getByLabel("Grant or application")
    .selectOption("opportunity:grants_gov:doc-1");
  await page.getByLabel("Include Credentials earned in report").check();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Prepare progress report" }).click();
  const report = await fs.readFile(await (await dl).path(), "utf8");
  expect(report).toContain("Credentials earned: 24 (target 30)");
  expect(report).toContain("AGENCY REVIEW DRAFT");
  await page
    .getByRole("button", { name: "Proposal workbench", exact: true })
    .click();
  await page.getByRole("tab", { name: "02 Evidence & criteria" }).click();
  await page.getByRole("button", { name: "Use program results" }).click();
  await page.getByRole("dialog").locator("input[type=checkbox]").check();
  await page.getByRole("button", { name: "Attach selected evidence" }).click();
  await expect(page.getByLabel("Agency evidence")).toContainText(
    "AchieveDXP export",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Outcomes & reporting", exact: true })
    .click();
  await expect(page.locator("table")).toContainText("Credentials earned");
});
test("AI receives the actual proposal only on request, handles failure and invalidates stale output", async ({
  page,
}) => {
  let calls = 0,
    body;
  await page.route("**/api/ai/analyze", (r) => {
    calls++;
    body = r.request().postDataJSON();
    return r.fulfill({
      status: calls === 1 ? 503 : 200,
      json:
        calls === 1
          ? { error: "Provider unavailable; try again." }
          : {
              opportunity_key: "opportunity:grants_gov:doc-1",
              task: "review",
              provider: "OpenAI",
              model: "test-fixture",
              requires_human_review: true,
              analysis: {
                summary:
                  "Confirm reporting commitments. <img src=x onerror=alert(1)>",
                route: "direct_review",
                findings: [
                  {
                    requirement: "Measurable outcomes",
                    assessment: "supported",
                    explanation: "Tie the actual draft to the requirement.",
                    evidence: [
                      {
                        source_id: "S1",
                        quote,
                        url: "https://example.gov/notice",
                      },
                    ],
                  },
                ],
                next_actions: ["Name the reporting owner."],
                draft_sections: [],
                missing_information: ["Reporting cadence."],
              },
            },
    });
  });
  await open(page, { ai: true });
  await workbench(page);
  await page.getByRole("tab", { name: "03 Write" }).click();
  await page
    .getByLabel("Application narrative")
    .fill("Actual proposal for review.");
  expect(calls).toBe(0);
  await expect(page.getByLabel("Workspace access code")).toHaveCount(0);
  await page.getByRole("button", { name: "Review my application" }).click();
  await expect(page.locator(".ai-status")).toContainText(
    "Provider unavailable",
  );
  await page.getByRole("button", { name: "Review my application" }).click();
  await expect(page.locator(".analysis")).toContainText(
    "Confirm reporting commitments",
  );
  expect(body.proposal.narrative).toBe("Actual proposal for review.");
  expect(body.include_budget).toBe(false);
  expect(JSON.stringify(body)).not.toContain("test-workspace-code");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "test-workspace-code",
  );
  await expect(page.locator(".analysis img")).toHaveCount(0);
  await page.getByLabel("Application narrative").fill("Changed application.");
  await page.getByRole("tab", { name: "02 Evidence & criteria" }).click();
  await expect(page.locator(".analysis")).toHaveCount(0);
});
test("Pages subdirectory and mobile navigation work without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, { path: "/dist/" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page
    .getByRole("button", { name: "Funding pathways", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Find the route others overlook." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Add a current notice" }).click();
  await page
    .getByLabel("Opportunity title")
    .fill("State correctional education");
  await page.getByLabel("Source / notice identifier").fill("state-doc-2026");
  await page
    .getByLabel("Official HTTPS source")
    .fill("https://example.gov/state");
  await page.getByLabel("State codes (comma separated)").fill("MI");
  await page.getByRole("button", { name: "Validate & save notice" }).click();
  await expect(
    page.getByRole("heading", { name: "Make the go / no-go decision." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("extracted criteria require review before they enter the application", async ({
  page,
}) => {
  await page.route("**/api/ai/analyze", (r) =>
    r.fulfill({
      json: {
        opportunity_key: "opportunity:grants_gov:doc-1",
        task: "rubric",
        provider: "OpenAI",
        model: "test-fixture",
        requires_human_review: true,
        analysis: {
          summary: "Review the extracted criterion.",
          route: "unknown",
          findings: [],
          next_actions: [],
          draft_sections: [],
          missing_information: [],
          extracted_criteria: [
            {
              title: "Measurable outcomes",
              points: null,
              evidence: [
                { source_id: "S1", quote, url: "https://example.gov/notice" },
              ],
            },
          ],
        },
      },
    }),
  );
  await open(page, { ai: true });
  await workbench(page);
  await expect(page.getByLabel("Workspace access code")).toHaveCount(0);
  await page.getByRole("button", { name: "Extract notice criteria" }).click();
  await expect(page.locator(".analysis")).toContainText("Measurable outcomes");
  expect(
    await page.evaluate(
      () =>
        Object.values(
          JSON.parse(localStorage.getItem("achievedxp_workspace_v3"))
            .applications,
        )[0].criteria.length,
    ),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Review criteria for import" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(quote);
  await page.getByRole("button", { name: "Add reviewed criteria" }).click();
  await expect(page.getByLabel("Funder’s requirement")).toHaveValue(quote);
  await expect(page.getByLabel("Requirement source URL")).toHaveValue(
    "https://example.gov/notice",
  );
  await expect(page.getByLabel("Agency evidence")).toBeEmpty();
});
test("saved application notices remain available after the live feed removes the opportunity", async ({
  page,
}) => {
  await open(page);
  await workbench(page);
  await page.locator("[data-app=owner]").fill("Retained application owner");
  await page
    .getByRole("button", { name: "Application pipeline", exact: true })
    .click();
  await page.route("**/opportunities.json", (r) =>
    r.fulfill({
      json: {
        opportunities: [],
        awards: [],
        foundations: [],
        saa: { states: {} },
      },
    }),
  );
  await page.reload();
  await expect(page.locator(".pipeline-card")).toContainText(
    "Correctional education and reentry",
  );
  await page
    .locator(".pipeline-card")
    .getByRole("button", { name: "Open application" })
    .click();
  await expect(page.locator(".alert")).toContainText(
    "no longer in the current source feed",
  );
  await expect(page.locator("[data-app=owner]")).toHaveValue(
    "Retained application owner",
  );
  await expect(
    page.getByRole("button", { name: "Check eligibility" }),
  ).toBeDisabled();
});
