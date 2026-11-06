const { test, expect } = require("@playwright/test");
const fs = require("node:fs/promises");
const key = "opportunity:grants_gov:intelligence-test";
const quote =
  "State governments may apply for correctional education and workforce training.";
const opportunity = {
  source: "grants_gov",
  source_id: "intelligence-test",
  source_kind: "federal",
  title: "Test correctional education opportunity",
  synopsis: quote,
  status: "posted",
  close_date: "2099-12-01",
  source_url: "https://example.gov/education",
};
const results = [
  {
    id: "r1",
    program: "Adult education",
    period: "2026 Q3",
    metric: "Credentials earned",
    value: 24,
    target: 30,
    source_system: "AchieveDXP aggregate export",
    source_url: "https://example.gov/results",
    notes: "Agency entered",
  },
  {
    id: "r2",
    program: "Unrelated program",
    period: "2026 Q3",
    metric: "Unrelated results",
    value: 999,
    target: "",
    source_system: "Agency record",
  },
];
async function open(page, { path = "/", saved = false, feed = true } = {}) {
  await page.addInitScript(
    ({ key, saved, results, opportunity }) =>
      !localStorage.getItem("achievedxp_workspace_v3") &&
      localStorage.setItem(
        "achievedxp_workspace_v3",
        JSON.stringify({
          profile: {
            agencyName: "Test DOC",
            stateCode: "MI",
            goals: ["ged", "cte"],
            baseline: "Agency-reviewed aggregate baseline",
          },
          usesAchieveDXP: true,
          saved: saved ? [key] : [],
          snapshots: { [key]: opportunity },
          applications: saved
            ? {
                [key]: {
                  narrative:
                    "The original agency narrative. We propose a credential program.",
                  outcomes: "Report credentials quarterly.",
                  reportResultIds: ["r1"],
                },
              }
            : {},
          results,
        }),
      ),
    { key, saved, results, opportunity },
  );
  await page.route("**/config.js", (r) =>
    r.fulfill({
      body: 'window.NAV_CONFIG={aiEnabled:true,aiAuthMode:"local_session"};',
      contentType: "text/javascript",
    }),
  );
  await page.route("**/opportunities.json", (r) =>
    r.fulfill({
      json: {
        opportunities: feed ? [opportunity] : [],
        saa: { states: {} },
        last_synced_at: "2026-11-05T00:00:00Z",
      },
    }),
  );
  await page.goto(path + "#intelligence");
  await expect(
    page.getByRole("heading", { name: "A clearer path to funding." }),
  ).toBeVisible();
}
function strategy() {
  return {
    task: "strategy",
    provider: "OpenAI",
    model: "test-fixture",
    requires_human_review: true,
    generated_at: "2026-11-05T00:00:00Z",
    context: { searched: 1, reviewed: 1, snapshot_at: "2026-11-05" },
    citation_check: "Quotes matched supplied text.",
    strategy: {
      title: "An evidence-backed education strategy",
      summary: "Confirm the full notice. <img src=x onerror=alert(1)>",
      recommendations: [
        {
          source_id: "R1",
          opportunity_key: key,
          title: opportunity.title,
          url: opportunity.source_url,
          status: "open",
          route: "direct_review",
          rationale:
            "Review the applicant and program requirements before proceeding.",
          quotes: [quote],
          provenance: "Published source snapshot",
        },
      ],
      pathways: [
        {
          source_id: "P1",
          title: "State adult education",
          url: "https://aefla.ed.gov/",
          category: "State education",
          rationale:
            "Confirm the current competition and eligible lead applicant.",
        },
      ],
      next_actions: [
        {
          title: "Document a baseline",
          detail: "Use reviewed aggregate measures.",
          workspace: "outcomes",
        },
      ],
      questions: ["Who owns reporting?"],
    },
  };
}
function analysis(task) {
  return {
    task,
    opportunity_key: key,
    provider: "OpenAI",
    model: "test-fixture",
    requires_human_review: true,
    citation_check: "Quotes matched supplied text.",
    analysis: {
      summary: "Review this proposed draft and confirm its facts.",
      route: "unknown",
      findings: [],
      next_actions: ["Confirm the current award requirements."],
      missing_information: ["Financial reporting is not included."],
      extracted_criteria: [],
      draft_sections: [
        {
          heading:
            task === "refine" ? "Revised narrative" : "Education progress",
          body:
            task === "refine"
              ? "The revised agency narrative. We propose a credential program and will define its reporting cadence."
              : "The agency reports 24 credentials in 2026 Q3, against its target of 30.",
          evidence:
            task === "refine"
              ? []
              : [
                  {
                    source_id: "A1",
                    quote: "Metric: Credentials earned\nActual: 24",
                    kind: "agency_result",
                    url: "https://example.gov/results",
                  },
                ],
        },
      ],
    },
  };
}
test("Intelligence requests a source-linked strategy explicitly, retries errors, and opens real application work", async ({
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
          ? { error: "Provider unavailable. Please retry." }
          : strategy(),
    });
  });
  await open(page, { path: "/dist/" });
  expect(calls).toBe(0);
  await page
    .getByRole("button", { name: "Find a partner-led route", exact: true })
    .click();
  expect(calls).toBe(0);
  await page.getByRole("button", { name: "Review AI context" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Budgets, application narratives, and your result library are not sent",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Build my strategy", exact: true })
    .click();
  await expect(page.locator(".strategy-status")).toContainText(
    "Provider unavailable",
  );
  await page
    .getByRole("button", { name: "Build my strategy", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "An evidence-backed education strategy",
    }),
  ).toBeVisible();
  expect(body.task).toBe("strategy");
  expect(body.uses_achievedxp).toBe(true);
  expect(JSON.stringify(body)).not.toContain("Credentials earned");
  expect(JSON.stringify(body)).not.toContain("narrative");
  await expect(page.locator(".strategy-result img")).toHaveCount(0);
  await page.getByText("Inspect cited evidence", { exact: true }).click();
  await expect(page.locator(".strategy-result blockquote")).toContainText(
    quote,
  );
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export strategy", exact: true })
    .click();
  expect(await fs.readFile(await (await dl).path(), "utf8")).toContain(
    "HUMAN REVIEW DRAFT",
  );
  await page.getByRole("button", { name: "Refine with more context" }).click();
  await page
    .getByLabel("What would you like to make possible?")
    .fill("Prioritize a partner-led route with a community college.");
  await page
    .getByRole("button", { name: "Refine my strategy", exact: true })
    .click();
  await expect(page.locator(".strategy-result")).toBeVisible();
  expect(body.history.length).toBe(2);
  await page
    .getByRole("button", { name: "Review opportunity", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "Make the go / no-go decision." }),
  ).toBeVisible();
});
test("a strategy result is rejected when agency context changes during its request", async ({
  page,
}) => {
  let release;
  const pending = new Promise((resolve) => (release = resolve));
  let requested = false;
  await page.route("**/api/ai/analyze", async (r) => {
    requested = true;
    await pending;
    await r.fulfill({ json: strategy() });
  });
  await open(page);
  await page
    .getByLabel("What would you like to make possible?")
    .fill("Expand adult education and credential pathways.");
  await page
    .getByRole("button", { name: "Build my strategy", exact: true })
    .click();
  await expect.poll(() => requested).toBe(true);
  await page.locator(".nav [data-view=profile]").click();
  await page.getByLabel("Agency name", { exact: true }).fill("Changed DOC");
  await page
    .getByRole("button", { name: "Explore funding", exact: true })
    .click();
  await page.locator(".nav [data-view=intelligence]").click();
  release();
  await expect(page.locator(".strategy-status")).toContainText(
    "Agency context changed",
  );
  await expect(page.locator(".strategy-result")).toHaveCount(0);
});
test("reviewed narrative revisions preserve a restorable original across reloads", async ({
  page,
}) => {
  let body;
  await page.route("**/api/ai/analyze", (r) => {
    body = r.request().postDataJSON();
    return r.fulfill({ json: analysis("refine") });
  });
  await open(page, { saved: true });
  await page.locator(".nav [data-view=workbench]").click();
  await page.locator("[data-work-tab=write]").click();
  const original = await page.getByLabel("Application narrative").inputValue();
  await page
    .getByLabel("What should improve?")
    .fill("Clarify the measurement plan without inventing facts.");
  await page.getByRole("button", { name: "Propose a revision" }).click();
  await expect(
    page.getByRole("button", { name: "Compare proposed revision" }),
  ).toBeVisible();
  expect(body.task).toBe("refine");
  expect(body.proposal.narrative).toBe(original);
  expect(body.revision_request).toContain("measurement");
  await page.getByRole("button", { name: "Compare proposed revision" }).click();
  await expect(page.getByRole("dialog")).toContainText(original);
  await expect(page.getByLabel("Application narrative")).toHaveValue(original);
  await page.getByRole("button", { name: "Apply reviewed revision" }).click();
  await expect(page.getByLabel("Application narrative")).toHaveValue(
    /revised agency narrative/,
  );
  await page.reload();
  await page.locator("[data-work-tab=write]").click();
  await page
    .getByRole("button", { name: "Version history", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(original);
  await page.getByRole("button", { name: "Review & restore" }).click();
  await page
    .getByRole("button", { name: "Restore narrative", exact: true })
    .click();
  await expect(page.getByLabel("Application narrative")).toHaveValue(original);
});
test("AI reporting sends only application-selected measures and labels retained notice and agency evidence", async ({
  page,
}) => {
  let body;
  await page.route("**/api/ai/analyze", (r) => {
    body = r.request().postDataJSON();
    return r.fulfill({ json: analysis("reporting") });
  });
  await open(page, { saved: true, feed: false });
  await page.locator(".nav [data-view=outcomes]").click();
  await page.getByLabel("Grant or application").selectOption(key);
  await page
    .getByRole("combobox", { name: "Reporting period", exact: true })
    .selectOption("2026 Q3");
  await page.getByRole("button", { name: "Draft report with AI" }).click();
  await expect(page.getByRole("dialog")).toContainText("24 credentials");
  expect(body.aggregate_results).toHaveLength(1);
  expect(body.aggregate_results[0].id).toBe("r1");
  expect(JSON.stringify(body)).not.toContain("Unrelated");
  expect(body.saved_opportunity.retained_snapshot).toBe(true);
  expect(body.include_budget).toBe(false);
  await expect(page.getByRole("dialog")).toContainText(
    "Agency-reported measure · not independently verified",
  );
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export AI report draft" }).click();
  expect(await fs.readFile(await (await dl).path(), "utf8")).toContain(
    "Credentials earned",
  );
});
test("mobile Intelligence, keyboard commands and reduced motion remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByLabel("Search workspaces or saved opportunities")
    .fill("outcomes");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: /Make progress visible/ }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.locator(".nav [data-view=intelligence]").click();
  await expect(
    page.getByRole("heading", { name: "A clearer path to funding." }),
  ).toBeVisible();
  expect(
    await page
      .locator(".page")
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
});
