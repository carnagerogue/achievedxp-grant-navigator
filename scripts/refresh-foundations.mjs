#!/usr/bin/env node
/**
 * AchieveDXP — foundations active in corrections education
 * -----------------------------------------------------------
 * Hits the ProPublica Nonprofit Explorer API for a curated list
 * of foundations known to fund corrections, reentry, or adult /
 * post-secondary education. Returns scale/size metrics from their
 * most recent 990/990PF filing so the Navigator can surface
 * foundation targets an agency's grant writer should pursue.
 *
 * Public API, no auth required.
 *
 * To extend: add a seed entry with EIN + focus area.
 */

const FOUNDATION_SEEDS = [
  // EIN, display name (fallback), focus tags, short pitch for UI
  { ein: "391090394", name: "Ascendium Education Group",              focus: ["reentry", "postsec", "adult_ed"], pitch: "Largest philanthropic funder of postsecondary education in prison in the U.S." },
  { ein: "131684331", name: "Ford Foundation",                        focus: ["reentry", "justice_reform"],       pitch: "Multi-year reentry, justice reform, and human rights grantmaking." },
  { ein: "237093598", name: "John D. and Catherine T. MacArthur Foundation", focus: ["justice_reform", "digital"],  pitch: "Safety and Justice Challenge — jail-population reduction + reentry." },
  { ein: "381359217", name: "The Kresge Foundation",                  focus: ["reentry", "workforce"],            pitch: "Human services + economic mobility funding including reentry workforce." },
  { ein: "381359264", name: "W.K. Kellogg Foundation",                focus: ["juv_ed", "workforce", "adult_ed"], pitch: "Children, family, and community grantmaking including justice-involved youth." },
  { ein: "911663695", name: "Bill & Melinda Gates Foundation",        focus: ["postsec", "adult_ed"],             pitch: "Postsecondary education access with emphasis on underserved adult learners." },
  { ein: "226029397", name: "Robert Wood Johnson Foundation",         focus: ["sud", "reentry"],                  pitch: "Health equity and SUD-adjacent programming for justice-involved populations." },
  { ein: "521951681", name: "Annie E. Casey Foundation",              focus: ["juv_ed", "reentry"],               pitch: "Juvenile justice reform and economic opportunity for returning citizens." },
  { ein: "137029285", name: "Open Society Foundations",               focus: ["justice_reform", "reentry"],       pitch: "Criminal-justice reform and reentry support across U.S. programs." },
  { ein: "540597601", name: "Public Welfare Foundation",              focus: ["justice_reform", "juv_ed"],        pitch: "Criminal + juvenile justice reform focused on underserved communities." },
  { ein: "131628151", name: "Carnegie Corporation of New York",       focus: ["postsec", "adult_ed"],             pitch: "Education, democracy, and international peace — adult and postsecondary focus." },
  { ein: "030300865", name: "Ben & Jerry's Foundation",               focus: ["reentry", "justice_reform"],       pitch: "Grassroots social-justice grantmaking including reentry + justice organizing." }
];

async function fetchOrg(ein) {
  const res = await fetch(`https://projects.propublica.org/nonprofits/api/v2/organizations/${ein}.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function normalize(seed, payload) {
  const org = payload.organization || {};
  const filings = payload.filings_with_data || [];
  const latest = filings[0] || null;
  return {
    source: "propublica",
    ein: seed.ein,
    name: org.name || seed.name,
    state: org.state || null,
    city: org.city || null,
    focus: seed.focus,
    pitch: seed.pitch,
    ntee_code: org.ntee_code || null,
    latest_tax_year: latest ? latest.tax_prd_yr : null,
    total_revenue: latest ? latest.totrevenue : null,
    total_expenses: latest ? latest.totfuncexpns : null,
    total_assets: latest ? latest.totassetsend : null,
    filings_count: filings.length,
    filing_url: latest ? latest.pdf_url : null,
    source_url: `https://projects.propublica.org/nonprofits/organizations/${seed.ein}`
  };
}

export async function fetchAllFoundations() {
  const out = [];
  const errors = [];
  for (const seed of FOUNDATION_SEEDS) {
    try {
      const payload = await fetchOrg(seed.ein);
      out.push(normalize(seed, payload));
      console.error(`  propublica ${seed.ein}: ${seed.name}`);
    } catch (e) {
      errors.push({ ein: seed.ein, name: seed.name, error: String(e.message || e) });
      console.error(`  propublica ${seed.ein}: ERROR ${e.message || e}`);
    }
  }
  // Sort by total assets desc (biggest first)
  out.sort((a, b) => (b.total_assets || 0) - (a.total_assets || 0));
  return { foundations: out, errors };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('refresh-foundations.mjs')) {
  fetchAllFoundations().then(r => {
    process.stdout.write(JSON.stringify(r, null, 2) + "\n");
  }).catch(e => { console.error("FATAL:", e); process.exit(1); });
}
