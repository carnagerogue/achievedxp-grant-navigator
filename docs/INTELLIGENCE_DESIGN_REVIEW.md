# Intelligence workspace — design and validation

The primary screen now centers the agency’s funding mission and a source-linked AI strategy. The full workspace uses a light neutral design system, system typography, restrained blue actions, and contextual AI assistance. There is no generated artwork used as a substitute for application UI.

## Reference and implementation review

Two Image Gen concepts were developed before UI implementation. Both original references and the final browser screenshots were opened together and visually compared at native size.

- Intelligence reference: `/workspace/generated_images/exec-b2efc508-aaab-4ce4-b89e-7a582f787c38.png`
- Writing reference: `/workspace/generated_images/exec-50acfff6-15c3-49ff-9000-bc5dbe009579.png`
- [Implemented Intelligence screen](previews/intelligence.png)
- [Implemented writing partner](previews/writing-partner.png)
- [Implemented mobile screen](previews/intelligence-mobile.png)

| Reference feature | Implemented result / deliberate difference |
| --- | --- |
| Light navigation and dark system typography | Replaced the teal sidebar and serif display typography throughout the primary app. System fonts avoid a remote font dependency. |
| Dominant mission heading | Preserved “A clearer path to funding.” and the supporting mission/evidence copy, with responsive sizing and tight display tracking. |
| White AI composer with subtle spectral outline | Native editable textarea, agency context, source-scope selector, notice-import action, context inspector, and explicit strategy submission. No decorative simulation of AI activity. |
| Three suggestion pills and three next-step rows | All controls are functional. Suggestions populate an editable request; next-step rows open their workspaces. Local guidance is labeled separately from generated strategy. |
| Blue selected navigation and primary actions | Shared across discovery, pipeline, proposal, outcomes, profile, and connection screens. Source connections sit toward the bottom of desktop navigation. |
| Paper-like narrative editor beside writing assistance | Native editor and a quieter blue/lilac inspector. Draft, Review and Criteria are compact controls. Revision comparison and version history are real modal workflows. |
| Measurement section below writing | Kept within the application editor to preserve the existing application workflow. Real text can extend beyond the reference’s illustrative placeholders; no content is clipped to imitate a mockup. |
| Spacious desktop layout | Verified at 1440px. The implementation preserves room for longer real opportunity titles, honest connection state, export actions and source-coverage notes omitted by the concept. |
| Mobile adaptation and motion | Verified at 390px with no horizontal overflow; working menu and command palette. Reduced-motion preference suppresses transitions and animations. |

The screenshots use the actual website and checked-in source snapshot. The writing example is explicitly labeled planning text, not a submitted application. No live AI output, client results, award amounts or success probabilities are fabricated for the previews.

## Functional checks

Playwright with installed Chromium was used because browser-plugin tools were unavailable. Browser captures were taken after transitions settled; screenshots and DOM behavior were inspected. The suite covers the GitHub Pages subdirectory as well as the root static site.

- 39 unit tests: source identity, date/status handling, source recovery, strict citations, provider failures, strategy source selection and reference binding, privacy boundaries, reporting provenance, revision input, and bounded version retention.
- 23 browser tests: existing discovery/application/reporting and legacy flows plus explicit strategy generation, retry, source inspection, follow-up, export, context-change rejection, reviewed narrative replacement/restoration across reload, selected-measure reporting, keyboard command navigation, mobile layout and reduced motion.
- Pages build and whitespace checks pass. Browser preview captures report no uncaught page errors.

AI browser responses are test fixtures. They validate application behavior, not live model quality or provider availability. Actual OpenAI generation remains blocked by the previously observed credential-forwarding failure (HTTP 401); the cloud binding reports ready, but a successful provider generation has not been verified. GitHub Pages deployment and a separately hosted AI service remain required before this branch is the public production experience.
