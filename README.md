# AchieveDXP Grant Navigator

A grant discovery, application, and outcomes workspace for corrections education teams. The primary website opens with a welcome page and an interactive six-stage tour. **Start my funding journey** opens the guided workspace; returning agencies can resume their saved step. The **Funding journey** follows agency → research → program → funding → application → reporting. It guides the applicant through public-source agency research, a concrete program brief, a considered shortlist, an owned application plan, and grant-specific evidence and reporting.

The guide is also directly accessible at `#journey`.

**No Nucleos pricing, supplier rates, preset implementation costs, or award-probability claims.** Budgets use agency-entered values. Checklist and evidence coverage counts describe completed work, not application quality or likelihood of winning.

## Website and deployment

The user’s website is hosted at **https://carnagerogue.github.io/achievedxp-grant-navigator/** from **carnagerogue/achievedxp-grant-navigator**. Changes are prepared on a review branch; the live website changes only after the reviewed implementation is merged and deployed.

The app remains static and works under the Pages repository subdirectory. There is no frontend framework build requirement. `npm run build` prepares an explicit public-file allowlist in `dist/`. The Pages workflow validates the site and deploys that artifact when Pages uses Actions publishing. The current branch-based setup publishes `main` through GitHub’s separate `pages-build-deployment` workflow. See [Pages deployment instructions](docs/GITHUB_PAGES_DEPLOYMENT.md). Production is published from `main` using the configured Pages publishing mode. A review branch or draft pull request does not change the live Pages site.

GitHub Pages cannot run a secure OpenAI backend. The website supports an HTTPS AI service configured through `GRANT_AI_BASE_URL` at build time or **Sources & connections** in the UI. Provider credentials stay on that service. `render.yaml` is an optional deployment blueprint, not an already deployed service.

## Implemented workspace

- **Welcome:** a purpose-led landing page for correctional education, a keyboard-accessible six-stage tour, working links into each workspace, a source-based AI explanation, and an AchieveDXP evidence-to-reporting overview. Exploring the tour never modifies saved work or makes AI requests.
- **Funding journey:** a persistent six-stage guide with applicant identification, a 50-state/DC corrections-agency directory, public-source research review, substantive program-design questions, source-aligned funding options, six ordered application tasks, ownership and review dates, reporting preparation, and a downloadable funding plan. Each application task opens the corresponding workbench tab. Manual research and explicit research gaps keep the guide useful without AI. The directory supplies starting points; it does not verify legal authority or current programs. Other applicant types and territories support custom entry.
- **Agency research:** an explicit server-side OpenAI web-search request scoped to the selected agency website and official federal sources. It looks for identity, mission, education/workforce programs, priorities, partners, funding and reporting context. Notes require provider-supplied source citations, display those links, and enter strategy/application context only after agency review. Agency changes invalidate prior findings; stale responses cannot attach to a different applicant. Research is AI synthesis, not independently verified facts or eligibility rules.
- **Intelligence:** mission-based strategy and saved-shortlist comparison using up to 12 server-selected source records, source-bound opportunity references and exact quotes, separately labeled state/corporate research pathways, concrete next actions, context inspection, bounded follow-up conversation, and strategy export. No automatic AI calls or simulated answers. Funding strategy analyzes the selected snapshot; the separate agency-research task uses hosted web search.
- **Discover:** paginated source-record search, source/status/scope filters, explained research priorities, detailed source inspection, save, and comparison of two to four opportunities. Default scope narrows the broad pool to DOC/education-related text; it does not establish eligibility.
- **Funding pathways:** official federal, AEFLA/section 225, Perkins, WIOA, rural-learning, literacy and corporate-giving research routes; potential partner roles, deciding questions, and evidence requirements. State and corporate notices can be added from an official source.
- **Application pipeline:** per-opportunity owner, next action, internal due date, and agency-reported research/preparing/submitted/awarded/not-awarded stages.
- **Proposal workbench:** six source-cited qualification checks; exact funder criteria and weights; agency evidence and criterion responses; narrative editor; reporting plan; agency budget and allowability checks; preparation checklist; feedback and award records. Export a working application packet or official closing date calendar.
- **AI strategist:** explicit requests for eligibility review, extraction of source-cited notice criteria, evidence-based drafting, and critique of the actual agency draft. Extracted criteria are reviewed before import; generated narrative is appended only on user action. Changes invalidate previous analysis. Budget inclusion is opt-in. A writing partner also proposes complete narrative revisions from an explicit editing request, presents the current and proposed drafts side by side, and applies a revision only after review. The previous five replaced narratives can be reviewed and restored.
- **Outcomes & reporting:** manual or CSV import of aggregate AchieveDXP/agency measures, periods, programs, actuals, targets, source links and definitions; attach selected results to an application criterion; select measures separately for each grant and export a progress-report draft against that application’s commitments. A reporting assistant drafts from 1–20 selected aggregate measures and the application’s commitments; agency-result citations are explicitly distinguished from funder rules. Retained notices support reporting when an award leaves the live feed. No individual learner data or live LMS integration is supported.
- **Agency-owned records:** browser persistence, retained source snapshots for saved applications even after notices leave the current feed, workspace backup/restore, no required contact gate. AI access codes stay in memory and are excluded from backups. Earlier wizard plans remain accessible through `legacy.html`, and old `#plan=` links redirect to that compatibility entry.
- **Responsive design:** a light system-font interface, translucent neutral navigation, precise blue actions, an AI composer with a restrained spectral border, responsive editor/inspector, keyboard command palette (⌘/Ctrl K), purposeful motion, and reduced-motion support.

[Guided workflow previews and validation](docs/GUIDED_JOURNEY_REVIEW.md) include desktop/mobile screenshots and the agency-research boundaries.

## Source coverage and live validation

The expanded connector searches 24 ALNs and 14 education, reentry and workforce terms, paginates results, retains real source identity, and hydrates synopsis and applicant fields. The November 5, 2026 refresh completed without source errors and produced:

| Source | Records | Meaning |
| --- | ---: | --- |
| Grants.gov | 1,443 | Broad federal/workforce open or forecast research pool; includes unrelated opportunities |
| USASpending | 130 | Historical award research, not available grants |
| ProPublica | 12 | Foundation/nonprofit research records, not open competitions |
| State/territory directory | 56 | Manually maintained administering-office entries; confirm current offices and notices |
| Applicant agency directory | 51 | State DOC/DC name and website suggestions; manually maintained starting points, not live program verification |

The default research scope narrows this pool. Matching checks status, geographic restrictions, topical evidence, agency-identified blockers, and possible partner routes. It does not evaluate complete eligibility or predict awards. A shared ALN never links unrelated solicitations.

Nationwide live state and corporate solicitation adapters are **not connected**. These are official research routes plus agency-added notices. Aggregate AchieveDXP CSVs are agency-entered evidence; there is **no live AchieveDXP data connection**, independently verified customer results, or certified funder reporting.

A live OpenAI generation attempt on November 5 was rejected with HTTP 401 `invalid_api_key`; the provider received the cloud credential placeholder rather than a usable credential. The cloud reports the binding ready, but that is not proof of working provider authentication. Node and Python transports showed the same failure with inherited proxy/CA settings. Provider calls are not live-verified. Mocked tests exercise hosted web-search request shape, citation boundaries, agency approval and identity changes, strategy references, citations, context boundaries, revision comparison/restoration, reporting selections, request handling, and failure states.

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

Browser tests cover the welcome tour, keyboard navigation, mobile and reduced-motion behavior, saved-step resume, the guided agency/research/program/application journey, manual fallback, provider errors, applicant changes, persistence and export, plus the application/evidence/reporting flows and retain legacy regressions. The Pages build must run before browser tests, which include subdirectory loading. Tests use fixtures and mocked AI responses; they do not prove source eligibility or provider availability.

## Secure AI configuration

Set server variables using the hosting platform’s secret/configuration manager:

| Variable | Value / purpose |
| --- | --- |
| `GRANT_AI_KEY` | OpenAI provider credential, server secret only |
| `GRANT_AI_MODEL` | Approved Responses API model supporting structured outputs; initial configuration uses `gpt-4.1` |
| `GRANT_AI_RESEARCH_MODEL` | Optional approved Responses model supporting the hosted `web_search` tool and domain filters; defaults to `GRANT_AI_MODEL`. Verify actual tool compatibility before release. |
| `GRANT_AI_ORIGIN` | Exact browser origin; for this Pages site: `https://carnagerogue.github.io` (no repository path) |
| `GRANT_AI_ACCESS_TOKEN` | Separate random workspace access code, at least 32 characters; never use the provider key |
| `GRANT_AI_STATIC` | `off` for a separately hosted API |
| `GRANT_AI_HOST` | `0.0.0.0` on a host; loopback by default |
| `PORT` / `GRANT_AI_PORT` | Hosting platform port / local override |

The **OpenAI API key does not belong in `config.js`, the Pages repository, the website connection URL, or its workspace access-code field**. In this managed environment it belongs in the `GRANT_AI_KEY` secret binding scoped to `api.openai.com`. A ready binding still needs a successful actual provider request to verify forwarding.

Local development can use an eight-hour HttpOnly SameSite=Strict session only for exact loopback host/origin requests. Do not expose that mode through public forwarding. Hosted service requests use an in-memory access code; CORS allows the exact configured origin and requires authentication for analysis. A browser origin does not isolate repositories hosted under the same GitHub Pages account; access codes remain required.

The backend calls OpenAI Responses with `store:false`. Application and strategy tasks use strict structured output. Agency research instead requires a completed hosted web search and parses paragraph-level provider URL citations on allowed domains; unlinked or out-of-scope notes are discarded. Search results remain untrusted evidence and require human review. Only public agency identity, website, jurisdiction and optional unit are sent for that research request. Reviewed research and the program brief can then accompany explicitly requested strategy/application tasks; they are never promoted to funder requirements. Research notes, acceptance choices and guided progress are saved locally and included in workspace backups. Manual note edits and agency identity changes invalidate approval. The research model/tool combination has not been verified against the live provider in this environment.

Strategy responses can reference only the server-selected records and pathways. Opportunity titles, status and URLs are supplied by the server, not accepted from model output. Strategy history is bounded to four messages and kept in page memory; export it to retain a brief. Provider retention policies still apply. Source quotes must literally match the supplied source text. Supported findings and extracted criteria require quotes; numeric criterion weights require a quoted explicit points/percent value. These checks do not establish correct reasoning, complete eligibility, document authenticity, or an official scoring interpretation.

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
| `welcome.js` / `welcome.css` | Public welcome, interactive product tour, and shared visual refinements |
| `navigator-state.js` | Application/evidence validation, aggregate CSV parsing, budget and preparation rules |
| `grant-core.js`, `matching.js`, `opportunity-tools.js` | Shared provenance, eligibility evidence, matching and notice validation |
| `journey.js` / `journey.css`, `journey-state.js`, `agency-directory.js` | Guided planning, reviewed agency research context, and directory suggestions |
| `intelligence.js` / `intelligence.css` | AI strategy interface and shared light design system |
| `server/` | Authenticated OpenAI service, strict citation validation, CORS, optional static serving |
| `scripts/build-pages.mjs`, `.github/workflows/pages.yml` | Allowlisted Pages artifact and deployment |
| `scripts/refresh-*.mjs`, `opportunities.json` | Source adapters and refreshed snapshot |
| `legacy.html`, `app.js`, `workspace.js`, `ai-workspace.js` | Compatibility entry for previous wizard and saved plans |
| `tests/` | Shared-rule, security, import and browser regression tests |

The Docker configuration supports same-origin nginx/static plus an internal Node service. It has been updated for the new modules but has not been built or deployed in this pass.
