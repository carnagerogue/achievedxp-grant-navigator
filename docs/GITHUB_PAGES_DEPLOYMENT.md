# Deploy the redesigned website

Target website: https://carnagerogue.github.io/achievedxp-grant-navigator/
Target repository: https://github.com/carnagerogue/achievedxp-grant-navigator

Review the implementation in the target repository before publishing. A draft pull request does not replace the live Pages website.

1. Review the redesigned website and checks. Merge the reviewed implementation into the target repository’s `main` branch.
2. The current site uses **Deploy from a branch → main → / (root)**. GitHub’s `pages-build-deployment` workflow publishes it. The included `pages.yml` workflow validates the website and detects this mode without changing repository settings. If a repository administrator later selects **Settings → Pages → Build and deployment → Source → GitHub Actions**, `pages.yml` instead publishes its allowlisted `dist/` artifact.
3. Verify the Pages workflow output URL is the target above. Test a fresh visit and reload under the repository subdirectory. The root should show the new welcome page, with `welcome.js` and `welcome.css` loaded alongside `navigator.js` and `navigator.css`. Confirm that **Start my funding journey** opens the guide and that a saved agency can resume its previous step.
4. The daily source refresh commits `opportunities.json`. Confirm the associated Pages deployment completes. For Actions artifact publishing, `pages.yml` also listens for successful completion of the refresh because pushes using `GITHUB_TOKEN` do not trigger ordinary push workflows.

The site’s six-stage guide, manual agency research, program definition, discovery, comparison, planning, evidence library, reporting, backups and exports work without AI hosting.

## Activate the built-in AI service

Use [the Render activation guide](BUILT_IN_AI.md). The website never asks clients to configure AI. The owner supplies the OpenAI key once in Render's private environment settings and commits only the public service URL using `npm run configure:ai -- https://ACTUAL-SERVICE.onrender.com`.

The current branch-based Pages publisher reads `config.js` from `main`. The artifact builder also reads that file; an optional `GRANT_AI_BASE_URL` Actions variable can override it. Publish only after verifying the Render service with a real provider request. If the service is unavailable, the website shows an honest error in the current task and preserves saved work.

## Release boundaries

- The public website is published from `main`. In the current branch mode, confirm the separate `pages-build-deployment` run and the live URL. A successful validation-only `pages.yml` run is not proof of publication. Direct Pages-settings updates are not available to the integration credential, so the existing working publishing mode is retained.
- Real federal/award/foundation refresh succeeded. State/corporate sources are research pathways and manual notice imports, not live nationwide connectors.
- Production OpenAI generation is enabled through `https://achievedxp-grant-ai.onrender.com`. Real agency web research, funding strategy and source-checked grant analysis passed on November 6. The key stays in Render; the public website contains only its service URL. Continue to verify actual provider output after model or backend changes.
- Current clients can import approved aggregate AchieveDXP exports. A live AchieveDXP integration needs an authenticated API contract, client authorization, and a metric mapping validated against each grant’s reporting requirements.
- Browser storage is local to each device and origin. Backups can move work; accounts, team collaboration and synchronization are not implemented.
