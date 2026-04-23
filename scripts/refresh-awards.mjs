#!/usr/bin/env node
/**
 * AchieveDXP — recent federal awards (USASpending.gov)
 * -----------------------------------------------------------
 * Pulls the top N grants awarded in the last 24 months for each
 * tracked corrections ALN. Gives the Navigator peer-proof data:
 * "these agencies actually won this grant. At these award sizes."
 *
 * Output: { awards: [...] } — returned for orchestrator to union.
 *
 * Public API, no auth required.
 */

const CORRECTIONS_ALNS = [
  "16.812", "16.828", "16.738", "16.203", "16.540", "16.726", "16.575",
  "84.002", "84.048", "84.126", "84.331",
  "93.243", "93.959",
  "17.258", "17.259", "17.277"
];

const PER_ALN = 10;            // top N per ALN (by award size)
const LOOKBACK_MONTHS = 24;    // past 24 months of awards

function isoDateMonthsAgo(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

async function fetchAwardsForAln(aln) {
  const body = {
    filters: {
      award_type_codes: ["02", "03", "04", "05"], // grants (block, formula, project, cooperative)
      program_numbers: [aln],
      time_period: [{ start_date: isoDateMonthsAgo(LOOKBACK_MONTHS), end_date: new Date().toISOString().slice(0,10) }]
    },
    fields: [
      "Award ID", "Recipient Name", "Award Amount", "Awarding Agency",
      "Awarding Sub Agency", "Period of Performance Start Date",
      "Period of Performance Current End Date", "Place of Performance State Code"
    ],
    page: 1,
    limit: PER_ALN,
    sort: "Award Amount",
    order: "desc"
  };
  const res = await fetch("https://api.usaspending.gov/api/v2/search/spending_by_award/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.results || []).map(a => normalize(a, aln));
}

function normalize(a, aln) {
  const amt = a["Award Amount"] || 0;
  return {
    source: "usaspending",
    aln,
    award_id: a["Award ID"] || null,
    recipient: a["Recipient Name"] || null,
    amount: amt,
    amount_display: amt >= 1_000_000
      ? `$${(amt / 1_000_000).toFixed(1)}M`
      : amt >= 1_000 ? `$${Math.round(amt / 1_000)}K` : `$${amt}`,
    awarding_agency: a["Awarding Agency"] || null,
    awarding_sub_agency: a["Awarding Sub Agency"] || null,
    start_date: a["Period of Performance Start Date"] || null,
    end_date: a["Period of Performance Current End Date"] || null,
    state: a["Place of Performance State Code"] || null,
    generated_internal_id: a.generated_internal_id || null,
    source_url: a.generated_internal_id
      ? `https://www.usaspending.gov/award/${a.generated_internal_id}`
      : null
  };
}

export async function fetchAllAwards() {
  const all = [];
  const errors = [];
  for (const aln of CORRECTIONS_ALNS) {
    try {
      const hits = await fetchAwardsForAln(aln);
      for (const h of hits) all.push(h);
      console.error(`  usaspending ${aln}: ${hits.length} awards`);
    } catch (e) {
      errors.push({ aln, error: String(e.message || e) });
      console.error(`  usaspending ${aln}: ERROR ${e.message || e}`);
    }
  }
  // Dedupe by award_id (some awards appear under multiple ALNs)
  const seen = new Set();
  const deduped = [];
  for (const a of all) {
    const key = a.award_id;
    if (key && !seen.has(key)) { seen.add(key); deduped.push(a); }
  }
  // Sort by amount desc
  deduped.sort((a, b) => (b.amount || 0) - (a.amount || 0));
  return { awards: deduped, errors };
}

// CLI: `node scripts/refresh-awards.mjs` prints the result to stdout
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('refresh-awards.mjs')) {
  fetchAllAwards().then(r => {
    process.stdout.write(JSON.stringify(r, null, 2) + "\n");
  }).catch(e => { console.error("FATAL:", e); process.exit(1); });
}
