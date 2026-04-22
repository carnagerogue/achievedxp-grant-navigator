# AchieveDXP Grant Navigator — live site

Public GitHub Pages deployment of the AchieveDXP Grant Navigator.

- **Site:** https://carnagerogue.github.io/achievedxp-grant-navigator/
- **Data feed:** `opportunities.json` — refreshed daily from
  [grants.gov Search2](https://www.grants.gov/) via GitHub Actions.

## What's here

| Path | Purpose |
|------|---------|
| `index.html` | The Grant Navigator web app. Single-file, also usable offline as an email attachment. |
| `opportunities.json` | Cached corrections-relevant opportunities from grants.gov. Same-origin fetch by the Navigator. |
| `scripts/refresh-grants.mjs` | Node script that pulls grants.gov Search2 for 16 corrections ALNs and writes `opportunities.json`. |
| `.github/workflows/refresh-grants.yml` | Daily cron (07:00 UTC) that runs the refresh script and commits any changes. |

## Manual refresh

```bash
node scripts/refresh-grants.mjs
```

Writes `opportunities.json` with the freshest data. No auth required — grants.gov Search2 is a public API.

## Roadmap

See the System Design doc in the parent project for Phase 2/3 plans (authenticated agency accounts, award-ceiling hydration, state SAA pass-through map, outcomes evidence library).
