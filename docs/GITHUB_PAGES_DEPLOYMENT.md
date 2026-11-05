# Deploy the redesigned website

Target website: https://carnagerogue.github.io/achievedxp-grant-navigator/
Target repository: https://github.com/carnagerogue/achievedxp-grant-navigator

Review the implementation in the target repository before publishing. A draft pull request does not replace the live Pages website.

1. Review the redesigned website and checks. Merge the reviewed implementation into the target repository’s `main` branch.
2. In that repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**. The new `pages.yml` workflow builds an allowlisted `dist/` artifact and publishes it.
3. Verify the Pages workflow output URL is the target above. Test a fresh visit and reload under the repository subdirectory. The browser must load the new `navigator.js` and `navigator.css`, not the old wizard as the root page.
4. The daily source refresh commits `opportunities.json`. The Pages workflow also listens for successful completion of that refresh, because pushes using `GITHUB_TOKEN` do not trigger ordinary push workflows.

The site’s discovery, comparison, planning, evidence library, reporting, backups and exports work without AI hosting.

## Connect the AI service

`render.yaml` supplies an optional Render Node-service blueprint. Another Node 24 HTTPS host is also supported. This service has not been provisioned here.

1. Deploy the same reviewed repository with `node server/index.mjs`, `GRANT_AI_STATIC=off`, and the host-provided `PORT`.
2. Set the provider credential in the **host’s secret field `GRANT_AI_KEY`**. Choose an approved structured-output Responses model in `GRANT_AI_MODEL`.
3. Set `GRANT_AI_ORIGIN=https://carnagerogue.github.io`. Origin means scheme and host, not `/achievedxp-grant-navigator/`.
4. Create a separate random `GRANT_AI_ACCESS_TOKEN` of at least 32 characters. Give it only to authorized users. The blueprint can generate it. This is a pilot access mechanism; add organization authentication before a broad client rollout.
5. In the website repository, set **Settings → Secrets and variables → Actions → Variables → `GRANT_AI_BASE_URL`** to the service’s actual HTTPS base URL. This URL is public; never put a secret in this variable.
6. Run the Pages workflow again. Alternatively, enter that same URL in **Sources & connections** in the website for a browser-local connection.
7. Open a saved opportunity, enter the workspace access code, and run an explicit analysis. Verify an actual provider response, displayed source quotations, and a failed-authentication state. A green configuration/status response alone is insufficient.

All analysis POSTs still require the configured origin and valid workspace code. CORS preflight admits only that origin. Secrets never enter the Pages artifact. Do not put an OpenAI provider key in the website’s access-code field.

## Release boundaries

- The new website is prepared for review; it has not been merged into the deployment branch or deployed.
- Real federal/award/foundation refresh succeeded. State/corporate sources are research pathways and manual notice imports, not live nationwide connectors.
- Actual OpenAI generation is blocked in the development environment by HTTP 401: the upstream rejected the forwarded credential placeholder. The server handles this visibly; tests use mock provider responses until the binding is corrected.
- Current clients can import approved aggregate AchieveDXP exports. A live AchieveDXP integration needs an authenticated API contract, client authorization, and a metric mapping validated against each grant’s reporting requirements.
- Browser storage is local to each device and origin. Backups can move work; accounts, team collaboration and synchronization are not implemented.
