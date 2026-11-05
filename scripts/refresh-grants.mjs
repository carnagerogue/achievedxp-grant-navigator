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
 * The repository connector expands the original ALN search with
 * keyword discovery, pagination, and source-level failure reporting.
 */

import { fetchJson, writeAtomicJson } from "./source-utils.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const CORRECTIONS_ALNS = [
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
  "17.277", // WIA Pilots & Demonstrations
  "17.278", // Dislocated Worker formula grants
  "17.270", // Reentry Employment Opportunities
  "17.285", // Apprenticeship USA
  "84.116", // Fund for the Improvement of Postsecondary Education
  "16.593", // Residential Substance Abuse Treatment
  "16.838", // Comprehensive opioid/stimulant/substance-use programming
  "16.560", // NIJ research and evaluation
  "10.855"  // Distance Learning and Telemedicine
];

const UA = "AchieveDXP-GrantsRefresh/1.0 (github.com/carnagerogue/achievedxp-grant-navigator)";

export const DISCOVERY_KEYWORDS = ['correctional education', 'reentry', 'prison education', 'adult literacy', 'justice-involved', 'workforce training', 'adult education', 'integrated education and training', 'reentry employment', 'registered apprenticeship', 'career pathways', 'digital inclusion', 'distance learning', 'justice-involved youth'];

export async function searchOpportunities(query, request = fetchJson) {
  const records = [], seenPages = new Set();
  const rows = 50;
  for (let page = 0; page < 40; page++) {
    const data = await request('https://api.grants.gov/v1/api/search2', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({ keyword: '', ...query, oppStatuses: 'forecasted|posted', rows, startRecordNum: page * rows })
    });
    if (data.errorcode && data.errorcode !== 0) throw new Error('Grants.gov API error: ' + (data.msg || data.errorcode));
    const hits = data?.data?.oppHits;
    if (!Array.isArray(hits)) throw new Error('Grants.gov returned an unexpected search response');
    if (!hits.length) {
      if (Number(data.data.hitCount) > records.length) throw new Error("Grants.gov pagination ended before all reported hits were received");
      return records;
    }
    const signature = hits.map(h => h.id || h.number).join('|');
    if (seenPages.has(signature)) throw new Error('Grants.gov pagination did not advance; incomplete results were rejected');
    seenPages.add(signature); records.push(...hits);
    const total = Number(data.data.hitCount);
    if (Number.isFinite(total) && total >= 0 ? records.length >= total : hits.length < rows) return records;
  }
  throw new Error('Grants.gov search exceeded the page limit; source coverage is incomplete');
}

export function normalize(hit, aln) {
  const oppId = hit.id || hit.number || "";
  const alns = Array.isArray(hit.cfdaList) ? hit.cfdaList : Array.isArray(hit.alnist) ? hit.alnist : (aln ? [aln] : []);
  return {
    source: "grants_gov",
    source_kind: alns.some(code => /^17\./.test(code)) ? "workforce" : "federal",
    source_id: String(oppId),
    opp_number: hit.number || null,
    title: hit.title || "",
    agency: hit.agency || hit.agencyName || hit.agencyCode || null,
    agency_code: hit.agencyCode || null,
    cfda: alns[0] || aln || null,
    aln_all: alns,
    status: (hit.oppStatus || "").toLowerCase(),
    doc_type: hit.docType || null,
    post_date: hit.openDate || null,
    close_date: hit.closeDate || null,
    award_ceiling: null,
    award_floor: null,
    synopsis: null,
    funding_url: null,
    source_url: "https://www.grants.gov/search-results-detail/" + oppId
  };
}

// Hydrate a single opportunity with ceiling/floor/synopsis from fetchOpportunity.
// Tolerates individual failures — returns the original opp on error so the
// aggregate refresh never loses data from a per-call hiccup.
export async function hydrateOpportunity(opp, request = fetchJson) {
  const id = Number(opp.source_id);
  if (!id || isNaN(id)) return opp;
  try {
    const data = await request("https://api.grants.gov/v1/api/fetchOpportunity", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ opportunityId: id })
    });
    if (!data || data.errorcode !== 0) throw new Error("Unexpected opportunity detail response");
    const syn = (data.data && (data.data.synopsis || data.data.forecast)) || {};
    return {
      ...opp,
      award_ceiling: (syn.awardCeiling != null ? Number(syn.awardCeiling) : null),
      award_floor:   (syn.awardFloor   != null ? Number(syn.awardFloor)   : null),
      synopsis:      (syn.synopsisDesc || "") || null,
      applicant_types: Array.isArray(syn.applicantTypes) ? syn.applicantTypes.map(type => typeof type === 'string' ? type : type?.description).filter(type => typeof type === 'string' && type.trim()) : [],
      applicant_eligibility: typeof syn.applicantEligibilityDesc === 'string' ? syn.applicantEligibilityDesc : null,
      funding_url:   syn.fundingDescLinkUrl || null
    };
  } catch (error) {
    return { ...opp, detail_error: String(error.message || error) };
  }
}

// Hydrate in small batches to avoid stampeding grants.gov.
async function hydrateAll(opps) {
  const out = [];
  const BATCH = 4;
  const DELAY_MS = 150;
  for (let i = 0; i < opps.length; i += BATCH) {
    const batch = opps.slice(i, i + BATCH);
    const hydrated = await Promise.all(batch.map(opp => hydrateOpportunity(opp)));
    out.push(...hydrated);
    if (i + BATCH < opps.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }
  return out;
}

export async function fetchAllOpportunities() {
  const all = [];
  const errors = [];
  const queries = [...CORRECTIONS_ALNS.map(cfda => ({cfda})), ...DISCOVERY_KEYWORDS.map(keyword => ({keyword}))];
  for (const query of queries) {
    try {
      const hits = await searchOpportunities(query);
      for (const hit of hits) all.push({...normalize(hit, query.cfda),discovery_queries:[query.cfda?'ALN '+query.cfda:'Keyword: '+query.keyword]});
      console.error(`  grants.gov ${query.cfda || query.keyword}: ${hits.length} hits`);
    } catch (error) {
      errors.push({ ...query, error: String(error.message || error) });
      console.error(`  grants.gov ${query.cfda || query.keyword}: ERROR ${error.message || error}`);
    }
  }

  const byId = new Map();
  for (const o of all) {
    const key = o.source_id;
    if (!key) continue;
    if (byId.has(key)) {
      const prior = byId.get(key);
      prior.aln_all = [...new Set([...prior.aln_all, ...o.aln_all])];
      prior.discovery_queries = [...new Set([...prior.discovery_queries, ...o.discovery_queries])];
    } else byId.set(key, o);
  }
  const deduped = [...byId.values()];

  // Hydrate each opportunity with ceiling/floor/synopsis via fetchOpportunity.
  console.error(`  hydrating ${deduped.length} opportunities via fetchOpportunity…`);
  const hydrated = await hydrateAll(deduped);
  const ceilingCount = hydrated.filter(o => o.award_ceiling != null).length;
  console.error(`  hydration: ${ceilingCount}/${hydrated.length} got award ceilings`);

  for (const opp of hydrated) if (opp.detail_error) errors.push({ source_id: opp.source_id, error: opp.detail_error });
  return { opportunities: hydrated, alns_searched: CORRECTIONS_ALNS, keywords_searched: DISCOVERY_KEYWORDS, errors };
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
  const out = process.env.GRANT_FEED_OUTPUT || join(here, "..", "opportunities.json");
  if (errors.length) throw new Error("Incomplete refresh; existing feed was preserved. Use refresh-all.mjs for source-level recovery.");
  await writeAtomicJson(out, payload);
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
