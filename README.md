# AchieveDXP Grant Navigator

A grant discovery, application, and outcomes workspace for corrections education teams. The primary website opens directly into the working application: discover → compare → qualify → map evidence → draft → budget → submit → report.

**No Nucleos pricing, supplier rates, preset implementation costs, or award-probability claims.** Budgets use agency-entered values. Checklist and evidence coverage counts describe completed work, not application quality or likelihood of winning.

## Website and deployment

The user’s website is hosted at **https://carnagerogue.github.io/achievedxp-grant-navigator/** from **carnagerogue/achievedxp-grant-navigator**. Changes are prepared on a review branch; the live website changes only after the reviewed implementation is merged and deployed.

The app remains static and works under the Pages repository subdirectory. There is no frontend framework build requirement. `npm run build` prepares an explicit public-file allowlist in `dist/`. The included Pages workflow deploys that artifact and also refreshes deployment after a successful scheduled funding-data refresh. See [Pages deployment instructions](docs/GITHUB_PAGES_DEPLOYMENT.md). The redesigned website has not been deployed. A review branch or draft pull request does not change the live Pages site.

GitHub Pages cannot run a secure OpenAI backend. The website supports an HTTPS AI service configured through `GRANT_AI_BASE_URL` at build time or **Sources & connections** in the UI. Provider credentials stay on that service. `render.yaml` is an optional deployment blueprint, not an already deployed service.

## Implemented workspace

- **Discover:** paginated source-record search, source/status/scope filters, explained research priorities, detailed source inspection, save, and comparison of two to four opportunities. Default scope narrows the broad pool to DOC/education-related text; it does not establish eligibility.
- **Funding pathways:** official federal, AEFLA/section 225, Perkins, WIOA, rural-learning, literacy and corporate-giving research routes; potential partner roles, deciding questions, and evidence requirements. State and corporate notices can be added from an official source.
- **Application pipeline:** per-opportunity owner, next action, internal due date, and agency-reported research/preparing/submitted/awarded/not-awarded stages.
- **Proposal workbench:** six source-cited qualification checks; exact funder criteria and weights; agency evidence and criterion responses; narrative editor; reporting plan; agency budget and allowability checks; preparation checklist; feedback and award records. Export a working application packet or official closing date calendar.
- **AI strategist:** explicit requests for eligibility review, extraction of source-cited notice criteria, evidence-based drafting, and critique of the actual agency draft. Extracted criteria are reviewed before import; generated narrative is appended only on user action. Changes invalidate previous analysis. Budget inclusion is opt-in.
- **Outcomes & reporting:** manual or CSV import of aggregate AchieveDXP/agency measures, periods, programs, actuals, targets, source links and definitions; attach selected results to an application criterion; select measures separately for each grant and export a progress-report draft against that application’s commitments. No individual learner data or live LMS integration is supported.
- **Agency-owned records:** browser persistence, retained source snapshots for saved applications even after notices leave the current feed, workspace backup/restore, no required contact gate. AI access codes stay in memory and are excluded from backups. Earlier wizard plans remain accessible through `legacy.html`, and old `#plan=` links redirect to that compatibility entry.
- **Responsive design:** persistent desktop navigation, mobile menu, keyboard focus, responsive editor/inspector, restrained state/selection/loading motion, and reduced-motion support.

## Source coverage and live validation

The expanded connector searches 24 ALNs and 14 education, reentry and workforce terms, paginates results, retains real source identity, and hydrates synopsis and applicant fields. The November 5, 2026 refresh completed without source errors and produced:

| Source | Records | Meaning |
| --- | ---: | --- |
| Grants.gov | 1,415 | Broad federal/workforce open or forecast research pool; includes unrelated opportunities |
| USASpending | 130 | Historical award research, not available grants |
| ProPublica | 12 | Foundation/nonprofit research records, not open competitions |
| State/territory directory | 56 | Manually maintained administering-office entries; confirm current offices and notices |

The default research scope narrows this pool. Matching checks status, geographic restrictions, topical evidence, agency-identified blockers, and possible partner routes. It does not evaluate complete eligibility or predict awards. A shared ALN never links unrelated solicitations.

Nationwide live state and corporate solicitation adapters are **not connected**. These are official research routes plus agency-added notices. Aggregate AchieveDXP CSVs are agency-entered evidence; there is **no live AchieveDXP data connection**, independently verified customer results, or certified funder reporting.

A live OpenAI generation attempt on November 5 was rejected with HTTP 401 `invalid_api_key`; the provider received the cloud credential placeholder rather than a usable credential. The cloud reports the binding ready, but that is not proof of working provider authentication. Node and Python transports showed the same failure with inherited proxy/CA settings. Provider calls are not live-verified. Mocked tests exercise citations, request handling, actual-draft inclusion, and failure states.

Accounts/SSO, cross-device/team synchronization, live LMS ingestion, document/PDF ingestion, automated nationwide state/corporate feeds, submission APIs, and award verification remain future work. The current shared-code API is a controlled pilot service, not a multi-tenant authorization system.

## Run and test

```bash
npm ci
npm run build
npm run test:unit
npx playwright install chromium
npm test
```

Static preview:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Optional AI/static Node service:

```bash
NODE_USE_ENV_PROXY=1 npm start
```

The Node service binds loopback port 8766 by default. In the managed cloud environment, use the installed Chromium override:

```bash
npm test -- --config=/workspace/.cloud-setup/grant-navigator/playwright.config.cjs
```

Browser tests cover the new application/evidence/reporting flows and retain legacy regressions. The Pages build must run before browser tests, which include subdirectory loading. Tests use fixtures and mocked AI responses; they do not prove source eligibility or provider availability.

## Secure AI configuration

Set server variables using the hosting platform’s secret/configuration manager:

| Variable | Value / purpose |
| --- | --- |
| `GRANT_AI_KEY` | OpenAI provider credential, server secret only |
| `GRANT_AI_MODEL` | Approved Responses API model supporting structured outputs; initial configuration uses `gpt-4.1` |
| `GRANT_AI_ORIGIN` | Exact browser origin; for this Pages site: `https://carnagerogue.github.io` (no repository path) |
| `GRANT_AI_ACCESS_TOKEN` | Separate random workspace access code, at least 32 characters; never use the provider key |
| `GRANT_AI_STATIC` | `off` for a separately hosted API |
| `GRANT_AI_HOST` | `0.0.0.0` on a host; loopback by default |
| `PORT` / `GRANT_AI_PORT` | Hosting platform port / local override |

The **OpenAI API key does not belong in `config.js`, the Pages repository, the website connection URL, or its workspace access-code field**. In this managed environment it belongs in the `GRANT_AI_KEY` secret binding scoped to `api.openai.com`. A ready binding still needs a successful actual provider request to verify forwarding.

Local development can use an eight-hour HttpOnly SameSite=Strict session only for exact loopback host/origin requests. Do not expose that mode through public forwarding. Hosted service requests use an in-memory access code; CORS allows the exact configured origin and requires authentication for analysis. A browser origin does not isolate repositories hosted under the same GitHub Pages account; access codes remain required.

The backend calls OpenAI Responses with strict structured output and `store:false`. Provider retention policies still apply. Source quotes must literally match the supplied source text. Supported findings and extracted criteria require quotes; numeric criterion weights require a quoted explicit points/percent value. These checks do not establish correct reasoning, complete eligibility, document authenticity, or an official scoring interpretation.

Source text, profile fields, actual narrative/criterion drafts, attached aggregate evidence and optional budget totals are whitelisted. No request content is logged or persisted by the service. Two concurrent requests and 30 provider attempts/hour/process are allowed, with a 128 KB body limit, bounded text and a 60-second provider timeout. These limits reset on process restart and are not a billing cap. Use provider project controls and shared limits before scaling.

`GET /api/ai/status` reports configuration only. A failed provider response never produces a successful analysis state or overwrites the application.

## Aggregate evidence format

**Outcomes & reporting → Download CSV template** provides these columns:

```csv
period,program,metric,value,target,source_url,source_system,notes
```

`period`, `program`, `metric`, and nonnegative `value` are required. `target` is optional; links must be HTTPS. Quoted commas/newlines are supported. Only these columns are accepted, up to 250 rows / 500 KB, with all rows validated before import. This column whitelist does not replace agency review for sensitive data entered in free text. No learner-level records belong here. Keep metrics with different definitions/cohorts/periods distinct; the app does not aggregate them into a misleading total.

## Refresh funding data

```bash
NODE_USE_ENV_PROXY=1 node scripts/refresh-all.mjs
```

API destinations: `api.grants.gov`, `api.usaspending.gov`, `projects.propublica.org`. Preserve environment proxies and CA trust; do not disable TLS verification. `GRANT_FEED_OUTPUT=/tmp/review.json` redirects the output; copy an existing snapshot there first to exercise preservation. A failed or partial source retains its last successful partition. Source health distinguishes attempts from successful refreshes. Writes are atomic.

## Code map

| Files | Responsibility |
| --- | --- |
| `index.html`, `navigator.css`, `navigator.js` | Primary static website and interaction workflows |
| `navigator-state.js` | Application/evidence validation, aggregate CSV parsing, budget and preparation rules |
| `grant-core.js`, `matching.js`, `opportunity-tools.js` | Shared provenance, eligibility evidence, matching and notice validation |
| `server/` | Authenticated OpenAI service, strict citation validation, CORS, optional static serving |
| `scripts/build-pages.mjs`, `.github/workflows/pages.yml` | Allowlisted Pages artifact and deployment |
| `scripts/refresh-*.mjs`, `opportunities.json` | Source adapters and refreshed snapshot |
| `legacy.html`, `app.js`, `workspace.js`, `ai-workspace.js` | Compatibility entry for previous wizard and saved plans |
| `tests/` | Shared-rule, security, import and browser regression tests |

The Docker configuration supports same-origin nginx/static plus an internal Node service. It has been updated for the new modules but has not been built or deployed in this pass.
