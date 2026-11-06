/* Starting points for agency identification, not a live verification of programs or eligibility. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AgencyDirectory = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const rows = [
    [
      "AL",
      "Alabama",
      "Alabama Department of Corrections",
      "https://doc.alabama.gov/",
    ],
    [
      "AK",
      "Alaska",
      "Alaska Department of Corrections",
      "https://doc.alaska.gov/",
    ],
    [
      "AZ",
      "Arizona",
      "Arizona Department of Corrections, Rehabilitation and Reentry",
      "https://corrections.az.gov/",
    ],
    [
      "AR",
      "Arkansas",
      "Arkansas Department of Corrections",
      "https://doc.arkansas.gov/",
    ],
    [
      "CA",
      "California",
      "California Department of Corrections and Rehabilitation",
      "https://www.cdcr.ca.gov/",
    ],
    [
      "CO",
      "Colorado",
      "Colorado Department of Corrections",
      "https://cdoc.colorado.gov/",
    ],
    [
      "CT",
      "Connecticut",
      "Connecticut Department of Correction",
      "https://portal.ct.gov/doc",
    ],
    [
      "DE",
      "Delaware",
      "Delaware Department of Correction",
      "https://doc.delaware.gov/",
    ],
    [
      "DC",
      "District of Columbia",
      "District of Columbia Department of Corrections",
      "https://doc.dc.gov/",
    ],
    [
      "FL",
      "Florida",
      "Florida Department of Corrections",
      "https://www.fdc.myflorida.com/",
    ],
    [
      "GA",
      "Georgia",
      "Georgia Department of Corrections",
      "https://gdc.georgia.gov/",
    ],
    [
      "HI",
      "Hawaii",
      "Hawaii Department of Corrections and Rehabilitation",
      "https://dcr.hawaii.gov/",
    ],
    [
      "ID",
      "Idaho",
      "Idaho Department of Correction",
      "https://www.idoc.idaho.gov/",
    ],
    [
      "IL",
      "Illinois",
      "Illinois Department of Corrections",
      "https://idoc.illinois.gov/",
    ],
    [
      "IN",
      "Indiana",
      "Indiana Department of Correction",
      "https://www.in.gov/idoc/",
    ],
    ["IA", "Iowa", "Iowa Department of Corrections", "https://doc.iowa.gov/"],
    [
      "KS",
      "Kansas",
      "Kansas Department of Corrections",
      "https://www.kdoc.ks.gov/",
    ],
    [
      "KY",
      "Kentucky",
      "Kentucky Department of Corrections",
      "https://corrections.ky.gov/",
    ],
    [
      "LA",
      "Louisiana",
      "Louisiana Department of Public Safety and Corrections",
      "https://doc.louisiana.gov/",
    ],
    [
      "ME",
      "Maine",
      "Maine Department of Corrections",
      "https://www.maine.gov/corrections/",
    ],
    [
      "MD",
      "Maryland",
      "Maryland Department of Public Safety and Correctional Services",
      "https://www.dpscs.state.md.us/",
    ],
    [
      "MA",
      "Massachusetts",
      "Massachusetts Department of Correction",
      "https://www.mass.gov/orgs/massachusetts-department-of-correction",
    ],
    [
      "MI",
      "Michigan",
      "Michigan Department of Corrections",
      "https://www.michigan.gov/corrections",
    ],
    [
      "MN",
      "Minnesota",
      "Minnesota Department of Corrections",
      "https://mn.gov/doc/",
    ],
    [
      "MS",
      "Mississippi",
      "Mississippi Department of Corrections",
      "https://www.mdoc.ms.gov/",
    ],
    [
      "MO",
      "Missouri",
      "Missouri Department of Corrections",
      "https://doc.mo.gov/",
    ],
    [
      "MT",
      "Montana",
      "Montana Department of Corrections",
      "https://cor.mt.gov/",
    ],
    [
      "NE",
      "Nebraska",
      "Nebraska Department of Correctional Services",
      "https://corrections.nebraska.gov/",
    ],
    ["NV", "Nevada", "Nevada Department of Corrections", "https://doc.nv.gov/"],
    [
      "NH",
      "New Hampshire",
      "New Hampshire Department of Corrections",
      "https://www.doc.nh.gov/",
    ],
    [
      "NJ",
      "New Jersey",
      "New Jersey Department of Corrections",
      "https://www.nj.gov/corrections/",
    ],
    [
      "NM",
      "New Mexico",
      "New Mexico Corrections Department",
      "https://www.cd.nm.gov/",
    ],
    [
      "NY",
      "New York",
      "New York State Department of Corrections and Community Supervision",
      "https://doccs.ny.gov/",
    ],
    [
      "NC",
      "North Carolina",
      "North Carolina Department of Adult Correction",
      "https://www.dac.nc.gov/",
    ],
    [
      "ND",
      "North Dakota",
      "North Dakota Department of Corrections and Rehabilitation",
      "https://www.docr.nd.gov/",
    ],
    [
      "OH",
      "Ohio",
      "Ohio Department of Rehabilitation and Correction",
      "https://drc.ohio.gov/",
    ],
    [
      "OK",
      "Oklahoma",
      "Oklahoma Department of Corrections",
      "https://oklahoma.gov/doc.html",
    ],
    [
      "OR",
      "Oregon",
      "Oregon Department of Corrections",
      "https://www.oregon.gov/doc/",
    ],
    [
      "PA",
      "Pennsylvania",
      "Pennsylvania Department of Corrections",
      "https://www.pa.gov/agencies/cor.html",
    ],
    [
      "RI",
      "Rhode Island",
      "Rhode Island Department of Corrections",
      "https://doc.ri.gov/",
    ],
    [
      "SC",
      "South Carolina",
      "South Carolina Department of Corrections",
      "https://www.doc.sc.gov/",
    ],
    [
      "SD",
      "South Dakota",
      "South Dakota Department of Corrections",
      "https://doc.sd.gov/",
    ],
    [
      "TN",
      "Tennessee",
      "Tennessee Department of Correction",
      "https://www.tn.gov/correction.html",
    ],
    [
      "TX",
      "Texas",
      "Texas Department of Criminal Justice",
      "https://www.tdcj.texas.gov/",
    ],
    [
      "UT",
      "Utah",
      "Utah Department of Corrections",
      "https://corrections.utah.gov/",
    ],
    [
      "VT",
      "Vermont",
      "Vermont Department of Corrections",
      "https://doc.vermont.gov/",
    ],
    [
      "VA",
      "Virginia",
      "Virginia Department of Corrections",
      "https://vadoc.virginia.gov/",
    ],
    [
      "WA",
      "Washington",
      "Washington State Department of Corrections",
      "https://www.doc.wa.gov/",
    ],
    [
      "WV",
      "West Virginia",
      "West Virginia Division of Corrections and Rehabilitation",
      "https://dcr.wv.gov/",
    ],
    [
      "WI",
      "Wisconsin",
      "Wisconsin Department of Corrections",
      "https://doc.wi.gov/",
    ],
    [
      "WY",
      "Wyoming",
      "Wyoming Department of Corrections",
      "https://corrections.wyo.gov/",
    ],
  ];
  const states = rows.map(([code, state, name, url]) => ({
    code,
    state,
    name,
    url,
  }));
  const normalize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();
  const named = (name) =>
    states.find((s) => normalize(s.name) === normalize(name));
  const sameUrl = (a, b) =>
    normalize(a).replace(/\/$/, "") === normalize(b).replace(/\/$/, "");
  function resolveIdentity(current, field, value) {
    const next = { ...current };
    const prior = named(current.agencyName);
    if (field) {
      if (current[field] === value) return next;
      next[field] = value;
    }
    let entry;
    if (field === "agencyName") {
      entry = named(value);
      if (entry) {
        next.agencyType = "state_doc";
        next.stateCode = entry.code;
      }
    } else if (!field || field === "stateCode" || field === "agencyType") {
      if (next.agencyType === "state_doc") {
        entry = states.find((s) => s.code === next.stateCode);
        if (!field && !entry && !next.stateCode && prior) {
          entry = prior;
          next.stateCode = entry.code;
        }
        // Restore missing directory details without replacing custom agency edits.
        if (!field && next.agencyName && !prior) entry = null;
      }
      if (field && !entry && prior) {
        next.agencyName = "";
        if (sameUrl(next.website, prior.url)) next.website = "";
      }
    }
    if (entry) {
      const changedAgency = prior?.code !== entry.code;
      next.agencyName = entry.name;
      if (field || changedAgency || !next.website) next.website = entry.url;
    }
    if (current.agencyName && next.agencyName !== current.agencyName)
      next.unit = "";
    return next;
  }
  function location(identity) {
    return (
      identity.unit ||
      states.find((s) => s.code === identity.stateCode)?.state ||
      identity.stateCode ||
      ""
    );
  }
  return {
    states,
    jurisdictions: [
      ...states.map((s) => [s.code, s.state]),
      ["AS", "American Samoa"],
      ["GU", "Guam"],
      ["MP", "Northern Mariana Islands"],
      ["PR", "Puerto Rico"],
      ["VI", "U.S. Virgin Islands"],
    ],
    resolveIdentity,
    location,
    note: "Agency directory starting points. Confirm the current name, website, jurisdiction and legal applicant before relying on them.",
  };
});
