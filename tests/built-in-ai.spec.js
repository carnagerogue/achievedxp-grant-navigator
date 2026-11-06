const { test, expect } = require("@playwright/test");
const backend = "https://site-managed-ai.example";
async function open(page, { enabled = true } = {}) {
  await page.route("**/config.js", (r) =>
    r.fulfill({
      body:
        "window.NAV_CONFIG=" +
        JSON.stringify({
          aiEnabled: enabled,
          aiAuthMode: "site",
          aiBaseUrl: enabled ? backend : "",
        }) +
        ";",
      contentType: "text/javascript",
    }),
  );
  await page.route("**/opportunities.json", (r) =>
    r.fulfill({ json: { opportunities: [], saa: { states: {} } } }),
  );
  await page.addInitScript(() =>
    localStorage.setItem(
      "achievedxp_workspace_v3",
      JSON.stringify({
        profile: { agencyType: "state_doc", stateCode: "ID" },
        connection: "https://old-connection.example",
      }),
    ),
  );
  await page.goto("/dist/#journey");
}
test("agency research uses the built-in site service with no setup or access-code step", async ({
  page,
}) => {
  let calls = 0,
    request;
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(backend + "/api/ai/analyze", (r) => {
    calls++;
    request = r.request();
    return r.fulfill({
      json: {
        task: "agency_research",
        provider: "OpenAI",
        model: "test",
        generated_at: "2026-11-06T00:00:00Z",
        requires_human_review: true,
        facts: [
          {
            category: "Education",
            text: "Fixture research for review.",
            sources: [
              {
                title: "Official agency source",
                url: "https://www.idoc.idaho.gov/",
              },
            ],
          },
        ],
      },
    });
  });
  await open(page);
  await expect(page.getByRole("button", { name: /connect AI/i })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("Workspace access code")).toHaveCount(0);
  expect(calls).toBe(0);
  await page
    .getByRole("button", { name: "Research my agency", exact: false })
    .click();
  await expect(page.locator(".research-finding")).toContainText(
    "Fixture research for review.",
  );
  expect(calls).toBe(1);
  expect(request.url()).toBe(backend + "/api/ai/analyze");
  expect(request.headers().authorization).toBeUndefined();
  expect(request.postDataJSON().agency.name).toBe(
    "Idaho Department of Correction",
  );
  await page
    .getByRole("button", { name: "Sources & evidence", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Coverage & refresh status" }),
  ).toBeVisible();
  await expect(page.getByLabel("AI service URL")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "AI connection", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save & test connection" }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("unavailable AI keeps the user in the task and preserves agency details without a setup detour", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let calls = 0;
  await page.route("**/api/ai/analyze", (r) => {
    calls++;
    return r.abort();
  });
  await open(page, { enabled: false });
  await page
    .getByRole("button", { name: "Research my agency", exact: false })
    .click();
  await expect(page).toHaveURL(/#journey$/);
  await expect(page.locator("#toast")).toContainText("not available");
  await expect(page.getByLabel("Agency name", { exact: true })).toHaveValue(
    "Idaho Department of Correction",
  );
  await expect(page.getByRole("button", { name: /connect AI/i })).toHaveCount(
    0,
  );
  expect(calls).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
