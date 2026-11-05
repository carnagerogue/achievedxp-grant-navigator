#!/usr/bin/env node
/**
 * AchieveDXP — unified funding-data refresh
 * -----------------------------------------------------------
 * Orchestrates all free data sources into a single
 * `opportunities.json` served by GitHub Pages:
 *
 *   - grants.gov Search2            → open federal opportunities
 *   - USASpending.gov /v2           → recent federal awards (peer proof)
 *   - ProPublica Nonprofit Explorer → foundations active in corrections
 *   - scripts/saa-map.json          → state administering agencies
 *
 * Output schema:
 *   {
 *     opportunities: [...],         // existing contract, grants.gov
 *     awards:        [...],         // new, usaspending
 *     foundations:   [...],         // new, propublica
 *     saa:           { ... },       // new, static per-state directory
 *     alns_searched: [...],
 *     errors:        [...],
 *     last_synced_at: "...",
 *     source: "grants.gov + usaspending + propublica + saa-map",
 *     count: N
 *   }
 *
 * Backwards compatible: existing Navigator code that reads
 * `opportunities` keeps working unchanged. New code can opt
 * into `awards`, `foundations`, `saa`.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { chooseSourceSnapshot, writeAtomicJson } from "./source-utils.mjs";

import { fetchAllOpportunities } from "./refresh-grants.mjs";
import { fetchAllAwards }        from "./refresh-awards.mjs";
import { fetchAllFoundations }   from "./refresh-foundations.mjs";

async function loadSaaMap(hereDir) {
  try {
    const txt = await readFile(join(hereDir, "saa-map.json"), "utf8");
    return JSON.parse(txt);
  } catch (e) {
    console.error("  saa-map: ERROR", e.message);
    return null;
  }
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  console.error("=== refresh-all.mjs ===");
  const out = process.env.GRANT_FEED_OUTPUT || join(here, "..", "opportunities.json");
  let previous = {};
  try { previous = JSON.parse(await readFile(out, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }

  // Run fetchers sequentially so upstream API rate limits don't stampede.
  // Each is wrapped so one source's failure doesn't kill the others.
  let opps = { opportunities: [], alns_searched: [], errors: [] };
  let awd  = { awards: [], errors: [] };
  let fnd  = { foundations: [], errors: [] };
  let saa  = null;

  console.error("\n[1/4] grants.gov");
  try { opps = await fetchAllOpportunities(); }
  catch (e) { console.error("  grants.gov FAILED:", e.message); opps.errors.push({ source: "grants_gov_total", error: String(e.message || e) }); }

  console.error("\n[2/4] usaspending.gov");
  try { awd = await fetchAllAwards(); }
  catch (e) { console.error("  usaspending FAILED:", e.message); awd.errors.push({ source: "usaspending_total", error: String(e.message || e) }); }

  console.error("\n[3/4] propublica.org");
  try { fnd = await fetchAllFoundations(); }
  catch (e) { console.error("  propublica FAILED:", e.message); fnd.errors.push({ source: "propublica_total", error: String(e.message || e) }); }

  console.error("\n[4/4] saa-map.json");
  saa = await loadSaaMap(here);

  const sourceHealth = {};
  for (const [source, result, key] of [['grants_gov', opps, 'opportunities'], ['usaspending', awd, 'awards'], ['propublica', fnd, 'foundations']]) {
    const chosen = chooseSourceSnapshot(previous[key], result[key], result.errors || [], { previousAt: previous.source_health?.[source]?.last_success_at || null });
    result[key] = chosen.records; sourceHealth[source] = chosen.health;
  }
  if (!saa && previous.saa) saa = previous.saa;
  const payload = {
    source_health: sourceHealth,
    opportunities: opps.opportunities,
    awards:        awd.awards,
    foundations:   fnd.foundations,
    saa:           saa,
    alns_searched: opps.alns_searched,
    keywords_searched: opps.keywords_searched || [],
    errors: [
      ...(opps.errors || []).map(e => ({ ...e, source: e.source || "grants_gov" })),
      ...(awd.errors  || []).map(e => ({ ...e, source: e.source || "usaspending"  })),
      ...(fnd.errors  || []).map(e => ({ ...e, source: e.source || "propublica"   })),
    ],
    last_synced_at: new Date().toISOString(),
    source: "grants.gov + usaspending + propublica + saa-map",
    count: (opps.opportunities || []).length,
    counts: {
      opportunities: (opps.opportunities || []).length,
      awards:        (awd.awards        || []).length,
      foundations:   (fnd.foundations   || []).length,
      saa_states:    saa ? Object.keys(saa.states || {}).length : 0
    }
  };

  await writeAtomicJson(out, payload);

  console.error(`\n=== Done ===`);
  console.error(`  opportunities: ${payload.counts.opportunities}`);
  console.error(`  awards:        ${payload.counts.awards}`);
  console.error(`  foundations:   ${payload.counts.foundations}`);
  console.error(`  saa states:    ${payload.counts.saa_states}`);
  console.error(`  total errors:  ${payload.errors.length}`);
  console.error(`  wrote: ${out}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
