# AchieveDXP Grant Navigator — live site

Public GitHub Pages deployment of the AchieveDXP Grant Navigator.

- **Site:** https://carnagerogue.github.io/achievedxp-grant-navigator/
- **Data feed:** `opportunities.json` — refreshed daily from
  [grants.gov Search2](https://www.grants.gov/) via GitHub Actions.

## What's here

| Path | Purpose |
|------|---------|
| `index.html` | The Grant Navigator web app markup. Loads `styles.css` and `app.js`. |
| `styles.css` | All styling (compliance grid, wizard, report, responsive rules). |
| `app.js` | All runtime: wizard state, scoring, grant matching, rendering, lead submission, localStorage resume, share-URL hash. |
| `assets/` | Partner logos, testimonial photos, and the mascot PNG. |
| `opportunities.json` | Cached corrections-relevant opportunities from grants.gov. Same-origin fetch by the Navigator. |
| `scripts/refresh-grants.mjs` | Node script that pulls grants.gov Search2 for 16 corrections ALNs and writes `opportunities.json`. |
| `.github/workflows/refresh-grants.yml` | Daily cron (07:00 UTC) that runs the refresh script and commits any changes. |

## Offline / email distribution

The app now ships as three files (`index.html`, `styles.css`, `app.js`) plus `assets/` and `opportunities.json`. Opening `index.html` from disk works as long as the sibling files are present.

If you need a genuine single-file build to email as an attachment (the original design), inline the stylesheet and script before sending. A quick one-liner:

```bash
# crude inline build — produces dist/index.html with styles + app embedded
mkdir -p dist && node -e "
  const fs = require('fs');
  let html = fs.readFileSync('index.html', 'utf8');
  html = html.replace('<link rel=\"stylesheet\" href=\"styles.css\">', '<style>' + fs.readFileSync('styles.css','utf8') + '</style>');
  html = html.replace('<script defer src=\"app.js\"></script>', '<script>' + fs.readFileSync('app.js','utf8') + '</script>');
  fs.writeFileSync('dist/index.html', html);
"
```

The `opportunities.json` fetch is same-origin, so the inlined build still needs that file next to it (or bake the JSON into `app.js` if you want a truly self-contained email-able file).

## Manual refresh

```bash
node scripts/refresh-grants.mjs
```

Writes `opportunities.json` with the freshest data. No auth required — grants.gov Search2 is a public API.

## Roadmap

See the System Design doc in the parent project for Phase 2/3 plans (authenticated agency accounts, award-ceiling hydration, state SAA pass-through map, outcomes evidence library).
