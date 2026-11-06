/* Shared, bounded agency research and guided-planning data. No credentials or learner records. */
(function (root, factory) {
  if (typeof module === "object" && module.exports)
    module.exports = factory(require("./grant-core.js"));
  else root.JourneyState = factory(root.GrantCore);
})(typeof globalThis !== "undefined" ? globalThis : this, function (C) {
  const text = (v, n = 2000) => (typeof v === "string" ? v.slice(0, n) : "");
  const steps = [
    "agency",
    "research",
    "program",
    "funding",
    "application",
    "reporting",
  ];
  const categories = [
    "Identity",
    "Mission",
    "Education",
    "Workforce",
    "Priorities",
    "Partners",
    "Funding",
    "Reporting",
  ];
  function publicUrl(value) {
    const safe = C.safeUrl(value);
    if (!safe) return "";
    try {
      const u = new URL(safe),
        h = u.hostname.toLowerCase();
      if (
        u.port ||
        !h.includes(".") ||
        h.endsWith(".local") ||
        h.endsWith(".localhost") ||
        h.endsWith(".internal") ||
        h === "localhost" ||
        h.includes(":") ||
        /^\d+(?:\.\d+){0,3}$/.test(h)
      )
        return "";
      u.hash = "";
      return u.href;
    } catch {
      return "";
    }
  }
  function identity(profile = {}, j = {}) {
    return JSON.stringify({
      agencyName: text(profile.agencyName, 300).trim(),
      agencyType: text(profile.agencyType, 30),
      stateCode: text(profile.stateCode, 2),
      website: publicUrl(j.website),
      unit: text(j.unit, 500).trim(),
    });
  }
  function clean(v = {}) {
    v = v && typeof v === "object" ? v : {};
    const r = v.research || {};
    return {
      step: steps.includes(v.step) ? v.step : "agency",
      website: publicUrl(v.website),
      unit: text(v.unit, 500),
      identityConfirmed: v.identityConfirmed === true,
      identityAutofillComplete: v.identityAutofillComplete === true,
      focusKey: text(v.focusKey, 160),
      strategyMode: v.strategyMode === "shortlist" ? "shortlist" : "mission",
      strategyPrompt:
        typeof v.strategyPrompt === "string"
          ? text(v.strategyPrompt, 3000)
          : null,
      researchMode: v.researchMode === "manual" ? "manual" : "web",
      manualNotes: text(v.manualNotes, 4000),
      manualUrl: publicUrl(v.manualUrl),
      reviewedIdentity: text(v.reviewedIdentity, 4000),
      program: Object.fromEntries(
        [
          "need",
          "learners",
          "location",
          "timeline",
          "partners",
          "fundingUse",
          "evaluation",
          "sustainability",
        ].map((k) => [k, text(v.program?.[k], k === "need" ? 3000 : 1500)]),
      ),
      research: {
        identity: text(r.identity, 4000),
        generatedAt: text(r.generatedAt, 100),
        model: text(r.model, 100),
        facts: (Array.isArray(r.facts) ? r.facts : [])
          .slice(0, 12)
          .filter((f) => f && typeof f === "object")
          .map((f, i) => ({
            id: "fact-" + i,
            category: categories.includes(f.category)
              ? f.category
              : "Priorities",
            text: text(f.text, 1800),
            accepted: f.accepted === true,
            sources: (Array.isArray(f.sources) ? f.sources : [])
              .slice(0, 5)
              .filter((s) => s && typeof s === "object")
              .map((s) => ({
                title: text(s.title, 300),
                url: publicUrl(s.url),
              }))
              .filter((s) => s.url),
          }))
          .filter((f) => f.text && f.sources.length),
      },
    };
  }
  function researchContext(profile, j) {
    const v = clean(j);
    if (v.reviewedIdentity !== identity(profile, v)) return [];
    if (v.researchMode === "manual")
      return v.manualNotes.trim() && v.manualUrl
        ? [
            {
              category: "Agency research",
              text: v.manualNotes,
              sources: [
                { url: v.manualUrl, title: "Agency-supplied public research" },
              ],
              provenance: "Agency-reviewed note; not independently verified",
            },
          ]
        : [];
    if (v.research.identity !== identity(profile, v)) return [];
    return v.research.facts
      .filter((f) => f.accepted)
      .map(({ category, text, sources }) => ({
        category,
        text,
        sources,
        provenance:
          "AI web research reviewed by the agency; not an independently verified fact or funder rule",
      }));
  }
  function cleanContext(value) {
    return (Array.isArray(value) ? value : [])
      .slice(0, 12)
      .map((f) => ({
        category: text(f?.category, 100),
        text: text(f?.text, 1800),
        sources: (Array.isArray(f?.sources) ? f.sources : [])
          .slice(0, 5)
          .map((s) => ({ title: text(s?.title, 300), url: publicUrl(s?.url) }))
          .filter((s) => s.url),
        provenance:
          "Agency-supplied research context; source links and assertions require review",
      }))
      .filter((f) => f.text && f.sources.length);
  }
  function programReady(profile, j) {
    return !!(
      profile.programName?.trim() &&
      profile.goals?.length &&
      profile.activities?.trim().length >= 20 &&
      j.program.need.trim().length >= 20 &&
      j.program.learners.trim()
    );
  }
  function mission(profile, j) {
    return [
      `Find funding routes for ${profile.agencyName || "our correctional education agency"}${profile.stateCode ? " in " + profile.stateCode : ""}.`,
      `Program: ${profile.programName || "Education and reentry"}.`,
      `Need: ${j.program.need}`,
      `Learners: ${j.program.learners}`,
      `Activities: ${profile.activities || ""}`,
      `Geography: ${j.program.location || profile.stateCode || "To confirm"}`,
      `Timing: ${j.program.timeline || "To confirm"}`,
      `Partners: ${j.program.partners || "Not yet confirmed"}`,
      `Funding use: ${j.program.fundingUse || "To define"}`,
      "Identify direct, pass-through and partner routes. Separate open notices from future or research pathways; identify eligibility gaps.",
    ]
      .join("\n")
      .slice(0, 3000);
  }
  return {
    steps,
    categories,
    clean,
    identity,
    publicUrl,
    researchContext,
    cleanContext,
    programReady,
    mission,
  };
});
