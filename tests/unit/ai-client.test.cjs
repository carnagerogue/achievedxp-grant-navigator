const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const vm = require("node:vm");
const os = require("node:os");
const path = require("node:path");
async function client(config, fetchImpl) {
  const context = {
    window: { NAV_CONFIG: config },
    URL,
    AbortSignal,
    fetch: fetchImpl,
  };
  vm.runInNewContext(
    await fs.readFile(path.join(__dirname, "../../ai-client.js"), "utf8"),
    context,
  );
  return context.window.GrantAI;
}
test("site-owned transport sends context without provider keys or client authorization", async () => {
  let sent;
  const ai = await client(
    {
      aiEnabled: true,
      aiAuthMode: "site",
      aiBaseUrl: "https://grant.example/",
    },
    async (url, options) => {
      sent = { url, options };
      return Response.json({ ok: true });
    },
  );
  assert.equal(ai.enabled(), true);
  assert.deepEqual(await ai.request({ task: "agency_research" }), { ok: true });
  assert.equal(sent.url, "https://grant.example/api/ai/analyze");
  assert.equal(sent.options.credentials, "omit");
  assert.equal(sent.options.headers.Authorization, undefined);
  assert.equal(JSON.parse(sent.options.body).task, "agency_research");
});
test("disabled, unsafe and old shared-code configurations never send requests", async () => {
  let calls = 0;
  for (const config of [
    { aiEnabled: false, aiAuthMode: "site" },
    { aiEnabled: true, aiAuthMode: "access_code" },
    {
      aiEnabled: true,
      aiAuthMode: "site",
      aiBaseUrl: "https://user:secret@grant.example",
    },
    { aiEnabled: true, aiAuthMode: "site", aiBaseUrl: "http://grant.example" },
    {
      aiEnabled: true,
      aiAuthMode: "local_session",
      aiBaseUrl: "https://grant.example",
    },
  ]) {
    const ai = await client(config, async () => {
      calls++;
    });
    assert.equal(ai.enabled(), false);
    await assert.rejects(ai.request({ task: "strategy" }), /not available/);
  }
  assert.equal(calls, 0);
});
test("service failures remain errors and local sessions use same-origin cookies", async () => {
  let options;
  const ai = await client(
    { aiEnabled: true, aiAuthMode: "local_session" },
    async (_, o) => {
      options = o;
      return Response.json({ error: "Usage limit reached" }, { status: 429 });
    },
  );
  await assert.rejects(ai.request({ task: "strategy" }), /Usage limit reached/);
  assert.equal(options.credentials, "same-origin");
  const bad = await client(
    { aiEnabled: true, aiAuthMode: "site" },
    async () => new Response("<html>offline</html>", { status: 503 }),
  );
  await assert.rejects(bad.request({}), /not available/);
});
test("public build settings reuse the committed site URL and exclude secret fields", async () => {
  const { publicSiteConfig, configScript, readSiteConfig } =
    await import("../../server/site-config.mjs");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "grant-site-config-"));
  try {
    const file = path.join(dir, "config.js");
    await fs.writeFile(
      file,
      configScript({
        ...publicSiteConfig("https://grant.example/"),
        apiKey: "must-not-propagate",
      }),
    );
    const clean = await readSiteConfig(file);
    assert.deepEqual(clean, {
      aiEnabled: true,
      aiAuthMode: "site",
      aiBaseUrl: "https://grant.example",
    });
    assert.ok(!configScript(clean).includes("must-not-propagate"));
    for (const value of [
      "https://user:secret@grant.example",
      "http://grant.example",
      "https://grant.example/?key=secret",
      "sk-secret",
    ])
      assert.throws(() => publicSiteConfig(value));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
