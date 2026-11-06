// Administrator command: select the production service once for every visitor.
import { writeFile } from "node:fs/promises";
import { publicSiteConfig, configScript } from "../server/site-config.mjs";
const url = process.argv[2];
if (!url)
  throw new Error(
    "Usage: npm run configure:ai -- https://YOUR-ACTUAL-SERVICE.onrender.com",
  );
await writeFile("config.js", configScript(publicSiteConfig(url)));
console.log(
  "Public AI service URL saved in config.js. Commit and publish after verifying the deployed provider.",
);
