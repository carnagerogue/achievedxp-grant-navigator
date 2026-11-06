const { test, expect } = require("@playwright/test");
const fs = require("node:fs/promises");
const k = "opportunity:grants_gov:journey-test";
const opportunity = {
  source: "grants_gov",
  source_id: "journey-test",
  title: "Correctional learning and credential pathways",
  source_kind: "federal",
  agency: "Test public funder",
  synopsis:
    "State governments may apply for correctional adult education and workforce training.",
  source_url: "https://example.gov/notice",
  status: "posted",
  close_date: "2099-12-01",
};
const research = () => ({
  task: "agency_research",
  provider: "OpenAI",
  model: "mock-research",
  generated_at: "2026-11-05T00:00:00Z",
  requires_human_review: true,
  facts: [
    {
      category: "Education",
      text: "A test source describes adult education programming. <img src=x onerror=alert(1)>",
      sources: [
        {
          title: "Agency education page",
          url: "https://www.michigan.gov/corrections/education",
        },
      ],
    },
    {
      category: "Partners",
      text: "An unreviewed partner statement must not travel into the strategy.",
      sources: [
        {
          title: "Agency page",
          url: "https://www.michigan.gov/corrections/partners",
        },
      ],
    },
  ],
});
async function open(page, { ai = true, path = "/" } = {}) {
  await page.route("**/config.js", (r) =>
    r.fulfill({
      body:
        "window.NAV_CONFIG=" +
        JSON.stringify({
          aiEnabled: ai,
          aiAuthMode: ai ? "local_session" : "access_code",
        }) +
        ";",
      contentType: "text/javascript",
    }),
  );
  await page.route("**/opportunities.json", (r) =>
    r.fulfill({
      json: {
        opportunities: [opportunity],
        saa: { states: {} },
        last_synced_at: "2026-11-05",
      },
    }),
  );
  await page.goto(path + "#journey");
  await expect(
    page.getByRole("heading", { name: "Who are we finding funding for?" }),
  ).toBeVisible();
}
async function agency(page) {
  await page
    .getByRole("combobox", { name: "State or territory", exact: true })
    .selectOption("MI");
  await page.getByRole("button", { name: "Use this agency" }).click();
  await expect(page.getByLabel("Agency name", { exact: true })).toHaveValue(
    "Michigan Department of Corrections",
  );
  await expect(
    page.getByLabel("Official website", { exact: true }),
  ).toHaveValue("https://www.michigan.gov/corrections");
}
async function program(page) {
  await page
    .getByLabel("Program name", { exact: true })
    .fill("Adult credential pathways");
  await page
    .getByLabel("What education gap should this funding address?")
    .fill(
      "We need to expand access to credential instruction using an agency-documented baseline.",
    );
  await page
    .getByLabel("Who will the program serve?")
    .fill("Adult learners preparing for release");
  await page.getByLabel("Adult education & literacy", { exact: true }).check();
  await page
    .getByLabel("Career training & credentials", { exact: true })
    .check();
  await page
    .getByLabel("What will you deliver?")
    .fill(
      "Provide literacy instruction, credential preparation and transition planning with an eligible partner.",
    );
  await page
    .getByLabel("Our agency already uses AchieveDXP", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Build my funding plan", exact: false })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Research funding around your program.",
    }),
  ).toBeVisible();
}
test("guided agency research requires review, shapes AI funding strategy, and connects to an owned application and reporting", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let researchBody, strategyBody;
  await page.route("**/api/ai/analyze", (r) => {
    const body = r.request().postDataJSON();
    if (body.task === "agency_research") {
      researchBody = body;
      return r.fulfill({ json: research() });
    }
    strategyBody = body;
    return r.fulfill({
      json: {
        task: "strategy",
        provider: "OpenAI",
        model: "mock",
        requires_human_review: true,
        context: { reviewed: 1, searched: 1, snapshot_at: "2026-11-05" },
        citation_check: "Fixture quotations matched.",
        strategy: {
          title: "Research before committing to a route",
          summary: "Confirm the current applicant and activity rules.",
          recommendations: [],
          pathways: [],
          next_actions: [
            {
              title: "Review the current notice",
              detail: "Establish the applicant route.",
              workspace: "workbench",
            },
          ],
          questions: [],
        },
      },
    });
  });
  await open(page, { path: "/dist/" });
  await agency(page);
  await page
    .getByRole("button", { name: "Research my agency", exact: false })
    .click();
  await expect(page.locator(".research-finding")).toHaveCount(2);
  expect(researchBody.agency.name).toBe("Michigan Department of Corrections");
  expect(researchBody.proposal).toBeUndefined();
  await expect(page.locator(".research-finding img")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "[1] Agency education page", exact: false }),
  ).toHaveAttribute("href", "https://www.michigan.gov/corrections/education");
  await page
    .getByRole("button", { name: "Use reviewed findings & continue" })
    .click();
  await expect(page.locator(".journey-error")).toContainText(
    "Confirm the agency",
  );
  await page
    .getByLabel("I have confirmed the agency and the legal applicant.")
    .check();
  await page.getByLabel("Use this education finding").check();
  await page
    .getByRole("button", { name: "Use reviewed findings & continue" })
    .click();
  await program(page);
  await page
    .getByRole("button", { name: "Build my strategy", exact: false })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Research before committing to a route",
    }),
  ).toBeVisible();
  expect(strategyBody.agency_research).toHaveLength(1);
  expect(strategyBody.agency_research[0].text).toContain("adult education");
  expect(JSON.stringify(strategyBody)).not.toContain("unreviewed partner");
  expect(strategyBody.program_brief.learners).toContain(
    "preparing for release",
  );
  await page
    .getByRole("button", { name: "Build a plan for this", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Build my application plan", exact: false })
    .click();
  await page
    .getByLabel("Application owner", { exact: true })
    .fill("Education grants team");
  await page
    .getByLabel("Internal review date", { exact: true })
    .fill("2027-01-15");
  await page.reload();
  await expect(
    page.getByLabel("Application owner", { exact: true }),
  ).toHaveValue("Education grants team");
  await page
    .getByRole("button", { name: "Open criteria", exact: true })
    .click();
  await expect(page.locator("[data-work-tab=criteria]")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("button", { name: "Return to guided plan" }).click();
  await page
    .getByRole("button", {
      name: "Plan reporting from the start",
      exact: false,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Make reporting part of the application.",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open reporting workspace", exact: false })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Grant or application", exact: true }),
  ).toHaveValue(k);
  expect(errors).toEqual([]);
});
test("manual source research and program answers persist, export and remain useful without AI", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/ai/analyze", (r) => {
    calls++;
    return r.fulfill({ status: 503, json: { error: "Not configured" } });
  });
  await open(page, { ai: false });
  await agency(page);
  await page
    .getByRole("button", { name: "Continue with my own research" })
    .click();
  await page
    .getByLabel("Agency research notes", { exact: true })
    .fill(
      "Agency-reviewed public education plan with dates and partner roles to confirm.",
    );
  await page
    .getByLabel("Public source for these notes", { exact: true })
    .fill("https://www.michigan.gov/corrections/education");
  await page
    .getByLabel("I have confirmed the agency and the legal applicant.")
    .check();
  await page
    .getByRole("button", { name: "Use reviewed findings & continue" })
    .click();
  await page
    .getByLabel("Program name", { exact: true })
    .fill("A retained program draft");
  await page.reload();
  await expect(page.getByLabel("Program name", { exact: true })).toHaveValue(
    "A retained program draft",
  );
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export funding plan", exact: true })
    .click();
  const report = await fs.readFile(await (await dl).path(), "utf8");
  expect(report).toContain("Agency-reviewed public education plan");
  expect(report).toContain("https://www.michigan.gov/corrections/education");
  expect(report).toContain("Not yet selected");
  expect(calls).toBe(0);
});
test("research failures retry and pending results cannot attach to a changed applicant", async ({
  page,
}) => {
  let calls = 0,
    release;
  const pending = new Promise((resolve) => (release = resolve));
  await page.route("**/api/ai/analyze", async (r) => {
    calls++;
    if (calls === 1)
      return r.fulfill({
        status: 503,
        json: { error: "Research provider temporarily unavailable." },
      });
    await pending;
    return r.fulfill({ json: research() });
  });
  await open(page);
  await agency(page);
  await page
    .getByRole("button", { name: "Research my agency", exact: false })
    .click();
  await expect(page.locator(".journey-error")).toContainText(
    "temporarily unavailable",
  );
  await page.getByRole("button", { name: "Research this agency" }).click();
  await expect.poll(() => calls).toBe(2);
  await page.locator("[data-j-step=agency]").click();
  await page
    .getByLabel("Agency name", { exact: true })
    .fill("Different agency");
  release();
  await expect(page.locator(".journey-error")).toContainText(
    "changed during research",
  );
  await page.locator("[data-j-step=research]").click();
  await expect(page.locator(".research-finding")).toHaveCount(0);
});
test("the six-step guide supports mobile navigation, stage prerequisites and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, { ai: false });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("[data-j-step=funding]").click();
  await expect(page.locator(".journey-error")).toContainText(
    "Identify your applicant",
  );
  await agency(page);
  await page
    .getByRole("button", { name: "Continue with my own research" })
    .click();
  await page
    .getByLabel("I have confirmed the agency and the legal applicant.")
    .check();
  await page
    .getByRole("button", { name: "Continue with research gaps" })
    .click();
  await page.locator("[data-j-step=application]").click();
  await expect(page.locator(".journey-error")).toContainText(
    "Define the program",
  );
  await expect(
    page.getByRole("heading", {
      name: "Turn the need into a fundable program.",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
