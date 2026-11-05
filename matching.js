/* Explainable research priorities. These rules do not predict awards or confirm eligibility. */
(function (root, factory) {
  if (typeof module === "object" && module.exports)
    module.exports = factory(require("./grant-core.js"));
  else root.GrantMatching = factory(root.GrantCore);
})(typeof globalThis !== "undefined" ? globalThis : this, function (core) {
  const GOALS = {
    ged: {
      label: "Adult education and literacy",
      terms:
        /adult education|adult literacy|\bliteracy\b|high school equivalency|\bGED\b|basic education/i,
    },
    cte: {
      label: "Career training and credentials",
      terms:
        /career (?:pathway|training|and technical|education)|technical education|workforce|apprenticeship|credential|occupational training/i,
    },
    postsec: {
      label: "Postsecondary pathways",
      terms:
        /postsecondary|post-secondary|higher education|college|university|pell/i,
    },
    reentry: {
      label: "Reentry and employment",
      terms: /reentry|re-entry|justice-involved|employment|job placement/i,
    },
    digital: {
      label: "Digital access and learning",
      terms:
        /digital literacy|distance learning|broadband|digital inclusion|educational technolog/i,
    },
    sud: {
      label: "Recovery and treatment access",
      terms: /substance|opioid|behavioral health|recovery/i,
    },
    sel: {
      label: "Social and emotional learning",
      terms: /social.emotional|life skills|mentoring|resilience/i,
    },
    juv_ed: {
      label: "Youth education",
      terms: /youth|juvenile|mentoring|secondary education/i,
    },
  };
  const ROUTES = [
    {
      id: "adult",
      title: "State adult education and corrections education",
      category: "State education",
      goals: ["ged", "digital", "reentry"],
      url: "https://aefla.ed.gov/",
      path: "Ask the state adult education office about AEFLA competitions, section 225 corrections education, and eligible providers.",
      partner:
        "State adult education office; eligible adult education provider",
      question:
        "Does the current state competition fund your facility, learner population, and proposed provider arrangement?",
      evidence:
        "Current state notice, provider eligibility, corrections education rules, learner baseline data, and measurable education outcomes.",
    },
    {
      id: "workforce",
      title: "Workforce partnerships and career pathways",
      category: "Workforce",
      goals: ["cte", "reentry", "ged"],
      url: "https://www.dol.gov/agencies/eta/wioa",
      path: "Explore WIOA and workforce-board partnerships, including integrated education and training and transition to employment.",
      partner:
        "Local workforce board; American Job Center; employer or training provider",
      question:
        "Which services may be delivered before release, which after release, and who can receive or administer the funds?",
      evidence:
        "State/local workforce plan, participant eligibility, eligible-service rules, provider requirements, and an agreed referral pathway.",
    },
    {
      id: "cte",
      title: "Career and technical education through an education partner",
      category: "State education",
      goals: ["cte", "postsec"],
      url: "https://cte.ed.gov/grants/state-profiles",
      path: "Review Perkins state rules and explore an eligible school or college partnership for a defined CTE program.",
      partner: "State CTE agency; eligible school or community college",
      question:
        "Can the proposed correctional education activities be supported under this state’s current Perkins rules?",
      evidence:
        "State application guidance, eligible-recipient confirmation, program of study, credential outcomes, and partner responsibilities.",
    },
    {
      id: "reentry",
      title: "Justice and reentry education opportunities",
      category: "Federal",
      goals: ["reentry", "ged", "cte", "postsec"],
      url: "https://bja.ojp.gov/funding/current",
      path: "Review current justice and reentry notices for education, employment, evaluation, and transition services.",
      partner:
        "DOC grants office; reentry partners; workforce and education providers",
      question:
        "Does the specific notice accept your applicant type and fund the education activities in your proposed program?",
      evidence:
        "Current notice and amendments, applicant eligibility, target population, scoring rubric, and an outcome measurement plan.",
    },
    {
      id: "rural",
      title: "Rural distance-learning infrastructure",
      category: "Federal / rural",
      goals: ["digital", "postsec", "cte"],
      url: "https://www.rd.usda.gov/programs-services/telecommunications-programs/distance-learning-telemedicine-grants",
      path: "Research USDA Distance Learning and Telemedicine for qualifying rural sites and eligible educational infrastructure.",
      partner:
        "Rural education institution; technology and distance-learning partners",
      question:
        "Do the sites, applicant, equipment, use case, and match satisfy the current program requirements?",
      evidence:
        "Rural eligibility, site map, equipment justification, match documentation, and the current application guide.",
    },
    {
      id: "literacy",
      title: "Corporate literacy philanthropy",
      category: "Corporate / foundation",
      goals: ["ged", "digital", "juv_ed"],
      url: "https://www.dgliteracy.org/",
      path: "Research literacy grant cycles and geographic requirements with an eligible education or nonprofit partner.",
      partner:
        "Eligible literacy organization, school, or nonprofit as allowed by the funder",
      question:
        "Is an application cycle open, and can the proposed applicant and correctional program meet its restrictions?",
      evidence:
        "Current giving guidelines, nonprofit/provider eligibility, geography, invitation requirements, and documented learner need.",
    },
    {
      id: "mobility",
      title: "Corporate workforce and economic-mobility funding",
      category: "Corporate / foundation",
      goals: ["cte", "reentry", "postsec"],
      url: "https://about.bankofamerica.com/en/making-an-impact/charitable-foundation-funding",
      path: "Explore workforce and economic-mobility giving through an eligible community partner; confirm local market and application policies.",
      partner: "Eligible nonprofit employment or education organization",
      question:
        "Does the funder support this geography, applicant, and program, and is it accepting proposals?",
      evidence:
        "Current guidelines, nonprofit status, local market coverage, employment pathway, and a clear partner-led program budget.",
    },
  ];
  function assess(
    opportunity,
    profile = {},
    reviewValue = {},
    now = new Date(),
  ) {
    const review = core.cleanReview(reviewValue),
      text = [opportunity.title, opportunity.synopsis]
        .filter(Boolean)
        .join(" ")
        .replace(/<[^>]*>/g, "");
    const status = core.opportunityStatus(opportunity, now),
      states = Array.isArray(opportunity.states) ? opportunity.states : [];
    const geographicMatch =
      !states.length || states.includes(profile.stateCode);
    const goals = (profile.goals || []).filter((g) =>
      GOALS[g]?.terms.test(text),
    );
    const corrections =
      /\bcorrectional\b|(?:department|bureau|division|office) of corrections|corrections (?:education|agency|agencies|system|facility|facilities)|incarcerat|\bprison\b|\bprisoners\b|\bjail\b|reentry|re-entry|justice-involved/i.test(
        text,
      );
    const reasons = [];
    if (corrections)
      reasons.push(
        "The source mentions corrections, incarceration, or reentry.",
      );
    goals.forEach((g) =>
      reasons.push(
        "Source topic aligns with " + GOALS[g].label.toLowerCase() + ".",
      ),
    );
    if (states.includes(profile.stateCode))
      reasons.push(
        "The source lists your state among its geographic restrictions.",
      );
    const missing = [];
    if (
      !opportunity.applicant_types?.length &&
      review.requirements.applicant.status === "unknown"
    )
      missing.push("Eligible applicant types need confirmation.");
    if (!states.length && review.requirements.geography.status === "unknown")
      missing.push("Geographic and population eligibility need confirmation.");
    if (
      !core.dateOnly(opportunity.close_date) &&
      review.requirements.deadline.status === "unknown"
    )
      missing.push("No closing date is supplied.");
    if (review.requirements.match.status === "unknown")
      missing.push("Match and financial requirements need review.");
    const applicantText = (opportunity.applicant_types || []).join(" ");
    const nonprofitOnly =
      /nonprofit|non-profit|501\(c\)/i.test(applicantText) &&
      !/government|public agenc|state agenc/i.test(applicantText);
    const needsPartner =
      review.route === "partner" ||
      (nonprofitOnly &&
        ["state_doc", "county_jail", "juvenile", "community"].includes(
          profile.agencyType,
        ));
    if (needsPartner && !review.partner)
      missing.unshift(
        "Identify an eligible lead partner and confirm its role.",
      );
    const blockers = Object.values(review.requirements).filter(
      (r) => r.status === "not_met",
    ).length;
    let priority = "research",
      label = "Resolve eligibility questions",
      order = 3;
    if (!geographicMatch) {
      priority = "outside_state";
      label = "Outside listed geography";
      order = 8;
    } else if (status === "closed") {
      priority = "closed";
      label = "Closed · research a future cycle";
      order = 7;
    } else if (blockers || review.route === "not_eligible") {
      priority = "blocked";
      label = "Resolve an agency-identified blocker";
      order = 6;
    } else if (status === "forecast") {
      priority = "forecast";
      label = "Prepare for a forecast opportunity";
      order = 4;
    } else if (status !== "open") {
      priority = "unknown";
      label = "Confirm whether applications are open";
      order = 5;
    } else if (!corrections && !goals.length) {
      priority = "weak_topic";
      label = "Limited alignment in supplied text";
      order = 5;
    } else if (needsPartner) {
      priority = "partner";
      label = "Explore a partner-led application";
      order = 2;
    } else {
      priority = "review_now";
      label = "Prioritize source review";
      order = 1;
    }
    const deadline = core.dateOnly(opportunity.close_date);
    const days = deadline
      ? Math.round(
          (Date.parse(deadline + "T00:00:00Z") -
            Date.parse(now.toISOString().slice(0, 10) + "T00:00:00Z")) /
            86400000,
        )
      : null;
    const urgency =
      status === "open" && days != null && days >= 0 && days <= 14
        ? "Closing within 14 days: confirm preparation capacity and the exact cutoff."
        : null;
    return {
      priority,
      label,
      order,
      reasons: reasons.slice(0, 4),
      missing: missing.slice(0, 5),
      urgency,
      days,
      goalMatches: goals.length,
      corrections,
      geographicMatch,
      blockers,
    };
  }
  function alignedForPlan(a) {
    return (
      a.geographicMatch &&
      !["blocked", "outside_state", "closed", "unknown"].includes(a.priority) &&
      a.goalMatches > 0 &&
      (a.corrections || a.goalMatches >= 2)
    );
  }
  function compare(a, b) {
    return (
      a.assessment.order - b.assessment.order ||
      Number(b.assessment.corrections) - Number(a.assessment.corrections) ||
      b.assessment.goalMatches - a.assessment.goalMatches ||
      String(a.record.title).localeCompare(String(b.record.title))
    );
  }
  function routes(profile = {}) {
    return ROUTES.filter((r) =>
      r.goals.some((g) => (profile.goals || []).includes(g)),
    );
  }
  return { assess, compare, routes, alignedForPlan };
});
