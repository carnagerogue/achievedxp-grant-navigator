import { readFile } from "node:fs/promises";

export function publicSiteConfig(raw = "") {
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
        "Use an HTTPS AI service URL without credentials, query parameters or a fragment.",
      );
    base = url.origin + url.pathname.replace(/\/$/, "");
  }
  return { aiEnabled: !!base, aiAuthMode: "site", aiBaseUrl: base };
}

export function configScript(config) {
  return (
    "// Public site settings only. Never add an OpenAI key here.\nwindow.NAV_CONFIG = " +
    JSON.stringify(config) +
    ";\n"
  );
}

export async function readSiteConfig(path = "config.js") {
  const source = await readFile(path, "utf8");
  const match = source.match(/window\.NAV_CONFIG\s*=\s*(\{[^;]+\})\s*;/);
  if (!match)
    throw new Error("config.js must contain a JSON NAV_CONFIG assignment.");
  return publicSiteConfig(JSON.parse(match[1]).aiBaseUrl || "");
}
