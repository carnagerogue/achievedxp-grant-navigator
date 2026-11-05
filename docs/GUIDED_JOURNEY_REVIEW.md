# Guided agency research and funding journey

The default entry now helps an education team establish its applicant, research the agency, define a program, investigate funding, prepare an application and plan reporting. Existing discovery, application, AI strategy and outcomes workspaces remain connected through actionable steps and a return-to-guide control.

## Design reference and fidelity

A new concept was generated before implementing this journey using the Frontend App Builder skill. The existing static JavaScript/CSS architecture was retained. The concept is a design reference, not application output.

- Reference: `/workspace/generated_images/exec-326fa7d2-a837-4388-b94c-d9d44d548280.png`
- [Implemented agency entry](previews/journey-agency.png)
- [Mobile agency entry](previews/journey-mobile.png)
- [Program-specific funding workspace](previews/journey-funding.png)
- [Connected application tasks](previews/journey-application.png)
- [Mobile application tasks](previews/journey-application-mobile.png)

Desktop captures use a 1440×1040 viewport; mobile uses 390×844. Full-page captures retain below-fold content. The reference and current implementation were inspected together with the image viewer. Browser/plugin tools were unavailable; Playwright with installed Chromium was the explicit fallback.

| Reference feature | Implementation comparison |
| --- | --- |
| Light neutral navigation and blue selection | Preserved the pale sidebar, system typography, blue active state and white work surface. Existing working navigation icons replace the concept’s specific icon variants. |
| Agency-first headline and supporting sentence | Preserved the exact headline and supporting copy. The existing 236px sidebar and app header leave a different horizontal measure from the generated reference. |
| Six connected stages | Implemented all six as keyboard-operable navigation, with the current step, prerequisites and recorded progress. Indicators describe work recorded, not grant readiness or award probability. |
| Large applicant form and contextual right column | Preserved the two-column hierarchy, field order and four research topics. The actual form adds a directory suggestion, manual fallback, connection state and public-information disclosure. |
| Blue research action and quieter manual action | Both perform real actions. Research starts an authenticated provider request; manual research opens source-note entry. There is no simulated research animation when a service is unavailable. |
| Device-save footer | Preserved and connected to real local persistence. Later stages add the working-plan export; backup/restore also retains guided progress. |
| Mobile layout | Stages remain visible at 390px, form and contextual help stack, and long tasks reflow. Browser checks found no horizontal overflow in agency, program, application or reporting; mobile menu and reduced-motion regressions pass. |
| Funding and application continuation | The same hierarchy extends into a program brief, the working AI composer, source-aligned notices, goal-related research routes, ordered application tasks and reporting guidance. Actual form content can extend below the first viewport. |

The agency entry uses the actual empty website, not fixture data. Later previews use an explicitly labeled example planning brief and actual checked-in source records. The funding preview has no matching current notice for the sample literacy/credential goals and displays research routes. The application preview adds recovery as a sample goal to exercise an actual notice; this does not represent a client program or verified fit. The selected notice is only a topical research candidate; no DOC eligibility, client program, award or AI-generated finding is asserted. No live AI output or client results were fabricated for screenshots.

Visual QA identified false matches caused by standalone “corrections” in scientific document notices and generic faculty “career” references, and advanced scientific “literacy” being mislabeled adult education. Matching now requires correctional context for that signal; career-training and adult-education terms are more specific. The guided shortlist also requires selected-goal alignment and excludes known blockers. This is still rule-based research prioritization, not a complete eligibility assessment. Relevant state, workforce and corporate pathways remain visible when the notice pool is limited.

## Workflow and research validation

- 46 unit tests pass, including provider web-search request shape, approved-domain citation boundaries, completed-search enforcement, agency context whitelisting, stale-identity rejection, bounded persistence, manual research, and the observed matching regressions.
- 27 browser tests pass, including the complete agency → reviewed research → program → AI strategy → owned application → reporting path; manual research/export/reload; provider failure/retry; changed applicants during an in-flight request; mobile navigation and prerequisites; and existing application/reporting/legacy regressions.
- The Pages artifact builds and the journey works from `/dist/`, preserving repository-subdirectory deployment.
- Visual probes of the actual site recorded no uncaught browser errors and no horizontal overflow in the sampled desktop/mobile stages.

Provider web-search citations are exposed as clickable links, not treated as proof that every synthesized statement is correct. Users must review selected notes and confirm the legal applicant. Agency identity changes and manual note edits invalidate approval. Only reviewed current-agency context accompanies later explicit AI requests, separately from solicitation requirements. An unsuccessful request cannot overwrite an application or attach notes to a changed applicant.

## Release limits

The provider boundary is tested with fixtures. Live OpenAI generation remains unverified after the development environment’s credential-forwarding failure (HTTP 401). A real request using a compatible hosted-web-search model must pass before releasing that capability. The guide, manual research, program definition, source exploration, application work and reporting preparation function without AI.

The 51-entry applicant directory covers state DOCs and DC as manually maintained starting points. Other applicants and territories use custom entry. It does not verify current programs or legal applicant authority. Nationwide state/corporate solicitation feeds and a live AchieveDXP integration remain unconnected. The changes are in the review branch; the public Pages site and a separately hosted AI service have not been deployed by this iteration.
