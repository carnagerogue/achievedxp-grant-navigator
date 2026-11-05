/* Validation shared by the browser and the optional grant analysis service. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./grant-core.js'));
  else root.OpportunityTools = factory(root.GrantCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core) {
  'use strict';
  const STATES = new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY AS GU MP PR VI'.split(' '));
  const REVIEW_FIELDS = [
    ['applicant', 'Eligible applicant', 'Quote the rule for a government agency, DOC, education provider, or nonprofit lead.'],
    ['geography', 'Geography and population', 'Confirm the eligible location, facilities, learner ages, and population.'],
    ['activities', 'Activities and costs', 'Identify allowed education activities, restrictions, and excluded costs.'],
    ['match', 'Match and financial requirements', 'Confirm match, indirect costs, reimbursement terms, and required financial capacity.'],
    ['deadline', 'Deadline and registrations', 'Confirm the date, cutoff time, time zone, submission system, and prior registration deadlines.'],
    ['partners', 'Partner responsibilities', 'Identify any required lead applicant, subrecipient agreement, letters, or referral arrangements.']
  ];
  function normalizeImport(input) {
    const rows = Array.isArray(input) ? input : input?.opportunities;
    if (!Array.isArray(rows) || !rows.length || rows.length > 100) throw new Error('Provide between 1 and 100 opportunity records.');
    const ids = new Set(), urls = new Set();
    const field = (value, max, name, required = false) => {
      if (value == null && !required) return null;
      if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error(name + ' is missing or too long.');
      return value.trim() || null;
    };
    return rows.map((row, i) => {
      try {
        if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Expected an opportunity object.');
        const id = field(row.source_id, 100, 'Source ID', true);
        if (!/^[a-zA-Z0-9._-]+$/.test(id)) throw new Error('Source ID must use letters, numbers, periods, underscores, or hyphens.');
        const url = core.safeUrl(field(row.source_url, 2000, 'Official source URL', true));
        if (!url) throw new Error('Use an HTTPS official source URL without embedded credentials.');
        if (ids.has(id) || urls.has(url)) throw new Error('Duplicate source ID or source URL in this import.');
        ids.add(id); urls.add(url);
        if (!['federal','state','workforce','corporate'].includes(row.source_kind)) throw new Error('Choose federal, state, workforce, or corporate.');
        const status = row.status || 'unknown';
        if (!['posted','open','forecasted','forecast','closed','archived','unknown'].includes(status)) throw new Error('Unsupported opportunity status.');
        const date = row.close_date ? core.dateOnly(row.close_date) : null;
        if (row.close_date && !date) throw new Error('Closing date must be a real YYYY-MM-DD or MM/DD/YYYY date.');
        const states = row.states == null ? [] : row.states;
        if (!Array.isArray(states) || states.some(s => !STATES.has(s))) throw new Error('Use valid uppercase state or territory codes in a states array.');
        const types = row.applicant_types == null ? [] : row.applicant_types;
        if (!Array.isArray(types) || types.length > 20 || types.some(t => typeof t !== 'string' || t.length > 500)) throw new Error('Applicant types must be an array of short text descriptions.');
        let ceiling = null;
        if (row.award_ceiling != null && row.award_ceiling !== '') {
          if (typeof row.award_ceiling === 'boolean' || !Number.isFinite(Number(row.award_ceiling)) || Number(row.award_ceiling) < 0 || Number(row.award_ceiling) > 1e10) throw new Error('Award ceiling must be a nonnegative source amount or null.');
          ceiling = core.money(row.award_ceiling);
        }
        return { source:'agency_import', source_id:id, source_kind:row.source_kind, source_url:url,
          title:field(row.title, 500, 'Title', true), agency:field(row.agency, 300, 'Funder'), status, close_date:date,
          states:[...new Set(states)], applicant_types:types.map(t=>t.trim()).filter(Boolean), award_ceiling:ceiling,
          synopsis:field(row.synopsis, 24000, 'Source excerpt'), provenance:'agency_entered' };
      } catch (error) { throw new Error('Record ' + (i + 1) + ': ' + error.message); }
    });
  }
  const cleanReview = core.cleanReview;
  function reviewSummary(value) {
    const review = cleanReview(value), requirements = Object.values(review.requirements);
    return { known:requirements.filter(r=>r.status!=='unknown').length, total:requirements.length,
      blockers:requirements.filter(r=>r.status==='not_met').length,
      label: review.route === 'direct' ? 'Agency reviewing direct application' : review.route === 'partner' ? 'Agency reviewing partner-led route' : review.route === 'not_eligible' ? 'Agency marked not eligible' : 'DOC route not yet reviewed' };
  }
  return { normalizeImport, cleanReview, reviewSummary, REVIEW_FIELDS };
});
