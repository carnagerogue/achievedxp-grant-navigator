# Activate built-in AI on Render

Clients use **Research my agency**, **Build my strategy**, and the application/reporting AI actions directly. There are no connection settings, API-key fields or shared access-code prompts. GitHub Pages serves the website; Render keeps the owner’s OpenAI key private and handles AI requests.

## One-time owner setup

1. [Deploy this repository on Render](https://render.com/deploy?repo=https://github.com/carnagerogue/achievedxp-grant-navigator). Sign into your Render account and approve the blueprint. It creates one Node 24 service named `achievedxp-grant-ai` on Render’s paid Starter plan to avoid idle cold starts; review the plan in Render before creating it.
2. When Render asks for **`GRANT_AI_KEY`**, paste your OpenAI project API key into that private environment value. Do not paste it into chat, GitHub code, Actions variables or the website. The blueprint supplies the model, website origin, host and `site` access mode. No separate workspace token is needed.
3. After deployment succeeds, copy the actual `https://…onrender.com` service URL from Render. A service name is not proof of its assigned URL. The health check at `/api/ai/status` must return `enabled: true` and `access: "site"`; this checks configuration only, not the key or provider model.
4. Configure the website once from the repository:

   ```bash
   npm run configure:ai -- https://YOUR-ACTUAL-SERVICE.onrender.com
   npm run build
   ```

   This changes only the public `config.js` URL. Commit it to `main` through the normal reviewed release. The current branch-based Pages publishing uses this file directly; visitors do nothing.
5. Verify **Research my agency** for a real public DOC. Confirm actual cited findings, then review those findings before using them in strategy. Verify an application AI request and a failed-provider state. A green Render health check is not sufficient. The source-linked output must come from an actual successful OpenAI response.

The managed cloud environment currently reports its OpenAI binding ready, but the November 6 provider check rejected the supplied credential. Set the real project key directly in Render; cloud-workspace secrets are not automatically copied to Render. The repository does not contain a key. Render account provisioning and this final provider verification are still required.

## Owner controls

- `GRANT_AI_KEY`: private provider credential. Rotate it in Render’s environment settings.
- `GRANT_AI_MODEL`: approved Responses model for structured grant work (`gpt-4.1` initially).
- `GRANT_AI_RESEARCH_MODEL`: optional separate approved model supporting hosted web search and domain filtering. Verify the model/tool combination with an actual request.
- `GRANT_AI_ORIGIN`: `https://carnagerogue.github.io`, without the repository path.
- `GRANT_AI_ACCESS_MODE`: `site`, enabling owner-funded public AI without client setup.
- `GRANT_AI_STATIC`: `off`, because Pages hosts the website.

The public service accepts the configured browser origin and applies shared per-process limits of two concurrent provider requests, 30 attempts/hour and 120 attempts/day. Failed provider calls count. These are request limits, not a guaranteed spending cap or user authentication; direct callers can forge Origin headers, and counters reset on restart. Use provider project spending controls and keep one service instance. Add durable shared quotas and organization authentication before scaling beyond this public pilot.

The server sends only the selected task context. It never serves credentials or server source, never logs prompts, and uses OpenAI Responses with `store:false`. Budgets remain opt-in and outputs require review. There is no vendor pricing or award guarantee.
