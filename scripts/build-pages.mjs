// Publish only the website. Server credentials and backend code never enter the Pages artifact.
import { cp, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  publicSiteConfig,
  configScript,
  readSiteConfig,
} from "../server/site-config.mjs";
const out = resolve("dist");
await mkdir(out, { recursive: true });
const files = [
  "CNAME",
  "index.html",
  "privacy.html",
  "navigator.css",
  "navigator.js",
  "intelligence.js",
  "journey.js",
  "journey.css",
  "welcome.js",
  "welcome.css",
  "journey-state.js",
  "agency-directory.js",
  "intelligence.css",
  "navigator-state.js",
  "grant-core.js",
  "matching.js",
  "opportunity-tools.js",
  "opportunities.json",
  "legacy.html",
  "styles.css",
  "workspace.css",
  "app.js",
  "opportunity-workspace.js",
  "workspace.js",
  "ai-workspace.js",
  "ai-client.js",
];
for (const file of files) await cp(file, resolve(out, file));
await cp("assets", resolve(out, "assets"), { recursive: true });
const config = process.env.GRANT_AI_BASE_URL
  ? publicSiteConfig(process.env.GRANT_AI_BASE_URL)
  : await readSiteConfig();
await writeFile(resolve(out, "config.js"), configScript(config));
await writeFile(resolve(out, ".nojekyll"), "");
console.log(
  "GitHub Pages website prepared in dist/. AI endpoint " +
    (config.aiEnabled
      ? "configured."
      : "not configured; site owner deployment is still required."),
);
