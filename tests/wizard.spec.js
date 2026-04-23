// Golden-path e2e: landing → 10-step wizard → results (TL;DR) → callback modal.
// Verifies the lead POST shape so a refactor that quietly drops a field fails CI.
const { test, expect } = require('@playwright/test');

const LEAD_HOST = 'formsubmit.co';

test.describe('AchieveDXP Grant Navigator — golden path', () => {
  test('completes wizard and renders TL;DR + lead POST shape', async ({ page }) => {
    // Capture every formsubmit.co POST so we can assert on the lead payload.
    const leadPosts = [];
    await page.route(`**://${LEAD_HOST}/**`, async (route) => {
      const req = route.request();
      if (req.method() === 'POST') {
        try { leadPosts.push(req.postDataJSON()); } catch (_) { leadPosts.push(req.postData()); }
      }
      // Reply success without hitting the network.
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
    });

    await page.goto('/');

    // Landing renders.
    await expect(page.locator('.hero h1')).toContainText('Find the grants');
    await page.click('button.btn-primary:has-text("Launch the Navigator")');

    // Step 1 — agency type (single).
    await page.click('.step[data-step="1"] .option[data-value="state_doc"]');
    await page.click('#nextBtn');

    // Step 2 — state (select). Wait for the dropdown to populate.
    await expect(page.locator('#stateSelect option')).toHaveCount(53);
    await page.selectOption('#stateSelect', 'MI');
    await page.click('#nextBtn');

    // Step 3 — population (single, 3-col grid).
    await page.click('.step[data-step="3"] .option[data-value="md"]');
    await page.click('#nextBtn');

    // Step 4 — goals (multi).
    await page.click('.step[data-step="4"] .option[data-value="ged"]');
    await page.click('.step[data-step="4"] .option[data-value="cte"]');
    await page.click('#nextBtn');

    // Step 5 — infrastructure (multi).
    await page.click('.step[data-step="5"] .option[data-value="tablets"]');
    await page.click('.step[data-step="5"] .option[data-value="network"]');
    await page.click('.step[data-step="5"] .option[data-value="lms"]');
    await page.click('#nextBtn');

    // Step 6 — budget.
    await page.click('.step[data-step="6"] .option[data-value="md"]');
    await page.click('#nextBtn');

    // Step 7 — grant experience.
    await page.click('.step[data-step="7"] .option[data-value="past"]');
    await page.click('#nextBtn');

    // Step 8 — timeline. "now" + decent score → expect [PRIORITY] tagging downstream.
    await page.click('.step[data-step="8"] .option[data-value="now"]');
    await page.click('#nextBtn');

    // Step 9 — partners (multi).
    await page.click('.step[data-step="9"] .option[data-value="university"]');
    await page.click('#nextBtn');

    // Step 10 — contact form.
    await page.fill('#agencyName', 'Kent County Sheriff');
    await page.fill('#contactName', 'Jane Doe');
    await page.fill('#contactRole', 'Director of Reentry');
    await page.fill('#contactEmail', 'jane@example.gov');
    await page.click('#nextBtn');

    // TL;DR view should be active by default with score, funding, and grants.
    await expect(page.locator('#results')).toHaveClass(/view-summary/);
    await expect(page.locator('#tldrScoreToday')).not.toHaveText('—');
    await expect(page.locator('#tldrScoreWith')).not.toHaveText('—');
    await expect(page.locator('#tldrDelta')).toContainText('+');
    await expect(page.locator('#tldrFundingAmount')).toContainText('$');
    await expect(page.locator('#tldrGrants .tldr-grant')).toHaveCount(3);

    // Share URL hash is set.
    await expect(page).toHaveURL(/#plan=/);

    // Toggle to full report and verify tabs render.
    await page.click('button:has-text("Explore the full plan")');
    await expect(page.locator('#results')).toHaveClass(/view-full/);
    await expect(page.locator('.tab-bar')).toBeVisible();
    await expect(page.locator('.panel.active')).toBeVisible();

    // Open callback modal and assert pre-filled values.
    await page.click('button:has-text("← Back to summary")');
    await page.click('.tldr-cta button:has-text("Request a call")');
    await expect(page.locator('#callbackModal')).toBeVisible();
    await expect(page.locator('#cmName')).toHaveValue('Jane Doe');
    await expect(page.locator('#cmRole')).toHaveValue('Director of Reentry');
    await expect(page.locator('#cmEmail')).toHaveValue('jane@example.gov');
    await page.fill('#cmPhone', '555-1234');
    await page.fill('#cmNotes', 'Test note from Playwright.');
    await page.click('#cmSubmit');
    await expect(page.locator('#cmSuccess')).toBeVisible({ timeout: 8_000 });

    // Lead POST shape: at least one submission, with the fields the sales team relies on.
    expect(leadPosts.length).toBeGreaterThanOrEqual(2); // initial submitLead + callback submitCallback
    const callback = leadPosts.find(p => p && p.request_type === 'callback_request');
    expect(callback).toBeTruthy();
    expect(callback.contact_name).toBe('Jane Doe');
    expect(callback.contact_email).toBe('jane@example.gov');
    expect(callback.agency_name).toBe('Kent County Sheriff');
    expect(callback.specific_question).toContain('Playwright');
    expect(callback.preferred_contact_time).toBeTruthy();
    expect(callback.shareable_report_url).toContain('#plan=');
    // Score 79 today + timeline "now" with this answer set → priority HIGH expected.
    expect(callback.priority).toBe('HIGH');
    expect(callback._subject).toMatch(/^\[PRIORITY\] /);
  });
});
