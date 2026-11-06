const { test, expect } = require("@playwright/test");
async function open(page, path = "/") {
  await page.route("**/config.js", (r) =>
    r.fulfill({
      body: "window.NAV_CONFIG={aiEnabled:false};",
      contentType: "text/javascript",
    }),
  );
  await page.route("**/opportunities.json", (r) =>
    r.fulfill({ json: { opportunities: [], saa: { states: {} } } }),
  );
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: "Give education a stronger future." }),
  ).toBeVisible();
}
test("welcome tour is keyboard accessible, makes no AI calls and launches the actual guided journey", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let ai = 0;
  await page.route("**/api/ai/**", (r) => {
    ai++;
    return r.fulfill({ status: 503, json: { error: "Not configured" } });
  });
  await open(page, "/dist/");
  const before = await page.evaluate(() =>
    localStorage.getItem("achievedxp_workspace_v3"),
  );
  const headings = [
    "Understand your agency.",
    "Build on what you can trust.",
    "Turn the need into a plan.",
    "Find a route worth pursuing.",
    "Make the strongest case you can.",
    "Let the evidence carry forward.",
  ];
  const tabs = page
    .getByRole("tablist", { name: "Funding journey preview" })
    .getByRole("tab");
  for (let i = 0; i < headings.length; i++) {
    await tabs.nth(i).click();
    await expect(
      page.getByRole("tabpanel").getByRole("heading", { name: headings[i] }),
    ).toBeVisible();
    await expect(tabs.nth(i)).toHaveAttribute("aria-selected", "true");
  }
  expect(
    await page.evaluate(() => localStorage.getItem("achievedxp_workspace_v3")),
  ).toBe(before);
  await tabs.last().focus();
  await page.keyboard.press("Home");
  await expect(tabs.first()).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toBeFocused();
  await expect(page.getByRole("tabpanel")).toHaveAttribute(
    "aria-labelledby",
    "tourTab-research",
  );
  await page
    .getByRole("button", { name: "Research my agency", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Who are we finding funding for?" }),
  ).toBeVisible();
  await expect(page.locator(".journey-error")).toContainText(
    "Identify your applicant",
  );
  await page
    .getByRole("link", { name: "Grant Navigator home", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Give education a stronger future." }),
  ).toBeVisible();
  expect(ai).toBe(0);
  expect(errors).toEqual([]);
});
test("returning agencies resume their saved step without overwriting program work", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("achievedxp_workspace_v3"))
      localStorage.setItem(
        "achievedxp_workspace_v3",
        JSON.stringify({
          profile: {
            agencyName: "Example DOC",
            programName: "Retained program",
            goals: ["ged"],
          },
          journey: {
            step: "program",
            program: {
              need: "A retained agency need statement.",
              learners: "Adult learners",
            },
          },
        }),
      );
  });
  await open(page);
  await page
    .getByRole("button", { name: "Continue my funding journey", exact: false })
    .first()
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Turn the need into a fundable program.",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Program name", { exact: true })).toHaveValue(
    "Retained program",
  );
  await page
    .getByRole("link", { name: "Grant Navigator home", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Explore the AI workspace", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "A clearer path to funding." }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Grant Navigator home", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open outcomes & reporting", exact: false })
    .click();
  await expect(page.locator(".crumb strong")).toHaveText(
    "Outcomes & reporting",
  );
});
test("mobile welcome, responsive tabs and workspace transitions stay usable with reduced motion", async ({
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
  await page.getByRole("tab", { name: "Reporting", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Let the evidence carry forward." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        getComputedStyle(document.querySelector(".tour-content")).animationName,
    ),
  ).toBe("none");
  await page
    .getByRole("button", { name: "Open workspace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Who are we finding funding for?" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page
    .getByRole("button", { name: "Sources & evidence", exact: true })
    .click();
  await expect(page.locator(".crumb strong")).toHaveText(
    "Sources & evidence",
  );
});
