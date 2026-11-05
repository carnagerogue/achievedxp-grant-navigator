// Publish only the website. Server credentials and backend code never enter the Pages artifact.
import { cp, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const out = resolve("dist");
await mkdir(out, { recursive: true });
const files = [
  "index.html",
  "privacy.html",
  "navigator.css",
  "navigator.js",
  "intelligence.js",
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
];
for (const file of files) await cp(file, resolve(out, file));
await cp("assets", resolve(out, "assets"), { recursive: true });
const raw = process.env.GRANT_AI_BASE_URL || "";
let base = "";
if (raw) {
  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "GRANT_AI_BASE_URL must be an HTTPS service URL without credentials or query parameters.",
    );
  base = url.origin + url.pathname.replace(/\/$/, "");
}
await writeFile(
  resolve(out, "config.js"),
  "window.NAV_CONFIG = " +
    JSON.stringify({
      aiEnabled: !!base,
      aiAuthMode: "access_code",
      aiBaseUrl: base,
    }) +
    ";\n",
);
await writeFile(resolve(out, ".nojekyll"), "");
console.log(
  "GitHub Pages website prepared in dist/. AI endpoint " +
    (base
      ? "configured."
      : "not configured; manual service connection remains available."),
);
