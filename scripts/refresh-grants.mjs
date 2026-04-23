#!/usr/bin/env node
/**
 * AchieveDXP — grants.gov live-feed refresh
 * -----------------------------------------------------------
 * Hits the grants.gov Search2 Applicant API for every tracked
 * Assistance Listing Number (ALN), normalizes the results into
 * a single schema, dedupes, and writes opportunities.json at
 * the repo root.
 *
 * Runs in two contexts:
 *   1. GitHub Actions on a daily cron (07:00 UTC) — commits
 *      the refreshed JSON back to the repo so Pages serves it.
 *   2. Locally: `node scripts/refresh-grants.mjs` to seed or
 *      hand-refresh opportunities.json without waiting for cron.
 *
 * Port of grants-api-worker/worker.js refreshFromGrantsGov().
 * Same ALN list, same normalization — so the Navigator code
 * works identically whether it reads the JSON from Pages, from
 * the Cloudflare Worker, or from the hardcoded baseline.
 */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const CORRECTIONS_ALNS = [
  "16.812", // Second Chance Act — Adult Reentry
  "16.828", // Justice Reinvestment / Smart Reentry
  "16.738", // Byrne JAG (state pass-through)
  "16.203", // DOJ/BJA — Promoting Evidence Integration
  "16.540", // OJJDP Juvenile Justice & Delinquency Prevention
  "16.726", // Juvenile Mentoring
  "16.575", // Crime Victim Assistance
  "84.002", // AEFLA / WIOA Title II (Adult Education)
  "84.048", // Perkins V (CTE)
  "84.126", // Vocational Rehabilitation
  "84.331", // Second Chance Pell / Incarcerated Higher Ed
  "93.243", // SAMHSA Substance Abuse / COSSUP-adjacent
  "93.959", // SAMHSA Block Grant
  "17.258", // WIOA Title I Adult
  "17.259", // WIOA Title I Youth
  "17.277"  // WIA Pilots & Demonstrations
];

const UA = "AchieveDXP-GrantsRefresh/1.0 (github.com/carnagerogue/achievedxp-grant-navigator)";

async function fetchAln(aln) {
  // grants.gov Search2 filters by the legacy `cfda` field. Despite the
  // ALN rename in the public UI, `aln` / `alnist` / `assistanceListings`
  // are all silently ignored by the API and return unfiltered results.
  // Verified against the live endpoint 2026-04: `cfda: "16.812"` returns
  // the real Second Chance Act opportunities; `aln: "16.812"` returns 1767
  // unfiltered hits. Keep `cfda` here.
  const res = await fetch("https://api.grants.gov/v1/api/search2", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({
      keyword: "",
      cfda: aln,
      oppStatuses: "forecasted|posted",
      rows: 25
    })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data && data.errorcode && data.errorcode !== 0) {
    throw new Error(`API ${data.errorcode}: ${data.msg || "unknown"}`);
  }
  return (data && data.data && data.data.oppHits) || [];
}

function normalize(hit, aln) {
  const oppId = hit.id || hit.number || "";
  return {
    source: "grants_gov",
    source_id: String(oppId),
    opp_number: hit.number || null,
    title: hit.title || "",
    agency: hit.agencyName || hit.agencyCode || null,
    agency_code: hit.agencyCode || null,
    cfda: aln,
    aln_all: Array.isArray(hit.alnist) ? hit.alnist : [aln],
    status: (hit.oppStatus || "").toLowerCase(),
    doc_type: hit.docType || null,
    post_date: hit.openDate || null,
    close_date: hit.closeDate || null,
    award_ceiling: null,
    award_floor: null,
    source_url: "https://www.grants.gov/search-results-detail/" + oppId
  };
}

export async function fetchAllOpportunities() {
  const all = [];
  const errors = [];
  for (const aln of CORRECTIONS_ALNS) {
    try {
      const hits = await fetchAln(aln);
      for (const h of hits) all.push(normalize(h, aln));
      console.error(`  grants.gov ${aln}: ${hits.length} hits`);
    } catch (e) {
      errors.push({ aln, error: String(e.message || e) });
      console.error(`  grants.gov ${aln}: ERROR ${e.message || e}`);
    }
  }

  const seen = new Set();
  const deduped = [];
  for (const o of all) {
    const key = o.opp_number || o.source_id;
    if (key && !seen.has(key)) {
      seen.add(key);
      deduped.push(o);
    }
  }
  return { opportunities: deduped, alns_searched: CORRECTIONS_ALNS, errors };
}

// Standalone usage: `node scripts/refresh-grants.mjs` — writes opportunities.json
// with ONLY grants.gov data. The orchestrator refresh-all.mjs is preferred for
// production since it unions all sources.
async function main() {
  const { opportunities, alns_searched, errors } = await fetchAllOpportunities();
  const payload = {
    opportunities,
    alns_searched,
    errors,
    last_synced_at: new Date().toISOString(),
    source: "grants.gov Search2",
    count: opportunities.length
  };
  const here = dirname(fileURLToPath(import.meta.url));
  const out = join(here, "..", "opportunities.json");
  await writeFile(out, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.error(`\nWrote ${opportunities.length} opportunities to ${out}`);
  if (errors.length) {
    console.error(`${errors.length} ALN(s) errored — see "errors" array in JSON`);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('refresh-grants.mjs')) {
  main().catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  });
}
