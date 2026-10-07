# KAABiL redesign: identity, navigation, content and editorial design

Status: proposed design for review. This document describes the next revision, not features already delivered. The currently published preview still shows the earlier green design.

## 1. Agreed problem and intended outcome

The first preview departed from the lab's identity: muted green, an invented logo, oversized abstract artwork, and a long homepage that felt like a single-page marketing site. The user wants the recognizable original KAABiL site improved: colorful, professional, spacious, readable, clearly multi-page, and engaging without excessive animation. Content must remain intact and recurring updates must be straightforward.

Success means a prospective student can find people and opportunities, a researcher can locate a tool or paper, and a collaborator can understand the lab and reach Dr. Rakesh Kaundal without reading a long page first. An editor can add a paper, person, tool, story, event, vacancy or image through forms and see the correct templates update.

## 2. Evidence and design references

Reviewed the live original pages on 2026-10-03: [Home](https://kaabil.net/home), [Research](https://kaabil.net/research), [People](https://kaabil.net/people), [Tools](https://kaabil.net/tools), [Publications](https://kaabil.net/publications), [News](https://kaabil.net/news). Local screenshots and HTML: `/workspace/research/original-reference/`.

| Source | Observed principle | Application here |
|---|---|---|
| Original KAABiL | Full logo on white; navy/magenta identity; distinct pages; research and people imagery | Restore recognizable branding and the page-oriented hierarchy |
| [EMBL-EBI](https://www.ebi.ac.uk/) | Explicit routes to resources, research and training; clear user tasks | Make Research, Tools, Publications, People and Join the lab easy to recognize |
| [Broad Institute](https://www.broadinstitute.org/) | Strong visual research stories alongside clear People, Research, News and Careers paths | Use real lab imagery and short editorial highlights with clear destinations |
| [NN/g: Recognition and Recall](https://www.nngroup.com/articles/recognition-and-recall/) | Visible choices and contextual cues reduce dependence on memory | Persistent labeled navigation, page titles, breadcrumbs, related links and visible filters |
| [W3C: Images](https://www.w3.org/WAI/tutorials/images/) | Image alternatives depend on purpose; diagrams need equivalent explanations | Alt text/captions in CMS, explanatory text for figures, legible full-size viewing |
| [W3C: Carousels](https://www.w3.org/WAI/tutorials/carousels/) | Movement needs user control, keyboard access and understandable focus behavior | Prefer a stable hero; any gallery motion is user-triggered with accessible controls |

These are reference observations and usability guidance, not claims of measured engagement improvement for this lab. That needs user feedback after the revision.

## 3. Visual direction

Use the original KAABiL logo, not a newly drawn mark. Its source is `https://bioinfocore.usu.edu/raikou/image/bioinfo/kbllogo.png`; downloaded and verified at 283 × 85 pixels. Preserve aspect ratio and give it clear white space. Do not enlarge this raster beyond its natural size on desktop; replace with an original vector/high-resolution version if available later.

Proposed palette: white main surfaces, deep university-style navy (#12324F), magenta (#BD174C) for active states and primary accents, blue (#2479BA) for resource navigation, pale blue/lavender backgrounds for occasional section separation. Confirm readable contrast for every actual text/background pairing during implementation. Color is supplemented by text, shape, and active indicators.

Use a readable sans-serif family with 16–18 px body copy, 1.55–1.7 line height, 65–75 character reading widths, 14 px minimum secondary labels, and 24–36 px page-section headings. Page titles are prominent but do not consume most of the viewport. Self-host fonts if a new font is used; retain a fast system fallback.

Keep images purposeful and colorful: real group photos, portraits, campus images, existing research illustrations and event photographs. Figures use contain-fit by default; portraits and photos may use a chosen focal point. Avoid an oversized decorative scientific graphic dominating the home screen.

Motion: 150–220 ms hover/focus feedback, subtle image transitions, and once-only short section reveals. Reduced-motion preference disables movement. Content is fully visible if JavaScript fails. No animated paragraph text, scroll hijacking, autoplay video, compulsory carousels, or animated invented statistics.

## 4. Site structure and shared navigation

Primary navigation: Home · Research · People · Publications · Tools · Events · News. Contact and Join the lab are clear utility actions. Verified original utility destinations: [BioinfoCore](https://bioinfocore.usu.edu/) and [COVID-19 Tracker](https://bioinfo.usu.edu/covidTracker/). Retain them as utility/resource links, with the tracker described as an existing resource rather than a new feature.

Desktop: logo and utility links on the upper row; labeled navigation on a clean row below or alongside where space permits. Active page has a clear magenta underline and `aria-current`. Research, People and Publications can expose concise secondary choices via click/keyboard operable disclosure controls; the parent label remains an ordinary page link. Hover cannot be the only way to open a menu.

Mobile: logo remains legible; a labeled Menu button opens grouped links with generous tap areas. Escape closes the menu and returns focus; clicking outside closes it. A search entry point and Contact remain discoverable. All destinations remain ordinary links usable without JavaScript.

Detail pages show Home → collection → current item breadcrumbs. Page-specific tabs remain visible on the relevant pages. A contextual “Explore next” section offers a small number of related destinations, not a repeated entire sitemap.

Add `/home` compatibility with `/` so the familiar address works. Preserve all original detail routes, category anchors, publication archive routes, and existing guide redirects. Canonical URLs prevent duplicate indexing.

## 5. Page-by-page content and layout

| Page | Content and arrangement | Useful next destinations | Editor source |
|---|---|---|---|
| Home | Compact introduction with real group/research photo; three clear tasks; curated latest updates; small opportunity callout when active | Research, People, Tools, individual latest stories/events/papers, Join | Homepage settings + published collection records |
| Research overview | Introductory program text followed by six illustrated areas in a balanced grid; objectives in readable sections | Area details, linked tools/publications, relevant people | Research records and existing overview page |
| Research detail | Title, image, summary, full available text; related work selected by editor | Related tools, papers, researchers, back to research | Existing area record + relationship fields |
| People | Short group image/banner; PI feature; Current team and Alumni tabs; searchable readable member grid | Individual profiles, research, opportunities | People collection, director profile |
| Current member / alumnus | Portrait, role/status, bio, research interests, thesis/dissertation, linked work; preserve profile URL on status change | Papers, tools, external portfolio, team list | One person record and referenced work |
| Rakesh Kaundal | Dedicated profile structure described below | Scholar, ORCID, publications, team, contact, university directories | Structured director page/profile record |
| Publications | Papers / Conferences / Editorials tabs; year and text filters; clear citation rows; DOI/source action | Original paper, linked people/research when explicitly associated | Existing 143 records, expanded structured fields |
| Tools | Category navigation, search, concise tool descriptions, image/logo and visible original destination; explicit Open tool action | Original service, documentation/source if supplied, relevant research | Tool records, unchanged existing destination by default |
| News | Featured newest/selected item followed by image cards with dates/categories; sensible pagination or load-more with accessible links | Full story, related people/tools/research | News collection |
| News detail | Readable article, date/source, inline figures, captions and related links | Related story/research/person, news archive | News record |
| Events | Upcoming and past sections using normalized dates; date, place and type clear in list; galleries on details | Event detail, registration link if supplied, archive | Event collection |
| Event detail | Event facts first, descriptive content, accessible photo gallery | Registration/source, people, event archive | Event record and media selections |
| Opportunities | Genuine published vacancies with type, summary, deadline, contact/application instructions; clear empty state | Role detail, application/contact, people/research | New opportunities collection |
| Contact | Address, email, phone, directions and joining guidance; current openings shown when available | Contact email, maps, opportunities, director profile | Shared contact settings + contact page content |
| About / historical overview | Preserve original narrative in readable sections | Research, people, original resources | Existing page records |
| Guides | Keep migrated administration documentation reachable | Relevant resources and site home | Existing page records |

No research findings, biographies, vacancies, publication relationships or impact figures will be invented. The six empty original research bodies remain an explicit editorial gap. Two inconsistent source event dates require human correction; preserve provenance.

### Homepage selection rules

The homepage is a concise gateway, not a sequence reproducing every collection. Target desktop composition: header; introduction/image; three task links; one latest-updates block with up to three items and a compact upcoming-event/opening panel; compact footer. On mobile these become a short ordered stack.

Homepage editor controls: hero heading, introduction, image, focal position, primary/secondary destinations, optional announcement, and visibility of latest updates/upcoming event/opportunity modules. Each module supports Automatic or Selected mode, a limited item count, and ordered selections. Published records only.

Default automatic latest feed uses normalized publication dates, not last-edit dates. Editors can exclude a record from the homepage without unpublishing it. Selected mode references records by ID, so title/link/image changes propagate. Unpublishing a selected item removes it from public display; the CMS shows a warning. No duplicate record entries. Empty modules collapse cleanly. Opportunities past their deadline leave active homepage slots and remain available in the archive.

### Dr. Rakesh Kaundal's profile

Keep the spelling and factual content from the source: **Dr. Rakesh Kaundal**.

1. Profile header: real portrait with focal/crop control; name; current affiliations and roles; email and phone; labeled Scholar, ORCID, ResearchGate and LinkedIn links.
2. Short, readable introduction from the existing biography. Preserve longer content below with descriptive headings.
3. Visible “On this page” navigation: Overview, Research interests, Education, Appointments, Awards, Publications. Sticky on wide screens; wrapping anchor links on phones.
4. Education: ordered vertical timeline using the five existing education records and their actual dates. Dates and institutions remain visible without hover.
5. Appointments: grouped timeline or readable rows using all five original appointment records; retain exact source dates and descriptions.
6. Awards: four concise cards with year/title/details, retaining original links.
7. Publications: link to the lab's publication directory; optionally show explicitly selected related records. Never assume every lab record belongs to the PI without verified attribution.
8. Journey video: existing external link with an informative label, not autoplay.
9. Closing routes: Meet the team, Explore research, Contact.

Education, appointments and awards become repeatable CMS rows with title, dates, institution/description and optional URL. The complete original body is kept in provenance and during migration reconciled against the structured rendition. The preview should remain understandable without animation.

## 6. CMS and maintenance boundaries

Keep the working Node/JavaScript backend and SQLite storage for this revision. Existing CMS is custom and lightweight, not a newly installed third-party platform. Language switching provides no direct benefit to these design and editing requirements. Keep schema validation, authenticated writes, CSRF protection, prepared database statements, revisions, draft previews, conflict detection and backups.

| Editor area | Fields / actions | What updates automatically |
|---|---|---|
| News | Title, summary, body, dates, category, image, related records, homepage eligibility | News archive, detail and eligible home feed |
| Events | Title, dates/range/timezone, location, summary/body, optional registration, gallery | Upcoming/past lists, detail, selected homepage panel |
| Publications | Type, year/date, title, formatted authors, venue, DOI/source link, optional related people/research | Correct archive/tab and referenced profiles |
| Tools | Name, category, description, destination, image, optional docs/repository links, related research | Tools directory, exact launch link, referenced pages |
| People | Status, role, dates, biography, portrait, interests, dissertation, social/work links, related records | Team/alumni lists and profile |
| Director profile | Introduction, roles/affiliations, education, appointments, awards, portrait, contact/social links | Dedicated director layout |
| Opportunities | Title, type, location, description, deadline, application link/contact, open/closed, publication status | Opportunities listing/detail, eligible homepage/contact callouts |
| Homepage | Hero content/image/actions, optional announcement, module visibility/mode and selected entries | Home only; no duplicate content copying |
| Site settings | Footer text, contact information, social/resource links, affiliations, utility destinations | Shared footer and contact blocks |
| Media | Upload, find, select, caption/alt text, fit, focal point, replace, detach, usage information | Selected placement and related record on publication |

Stable design tokens, template layout, navigation structure, security rules and integrations remain in documented code. Routine content and links belong to the CMS. Deploying code uses Docker rebuild; publishing content updates the running app immediately.

Use plain labels and grouped forms: Content, Image, Related items, Visibility. Hide IDs and provenance from normal editing. Supply meaningful previews and validation next to the relevant input. Long relationship lists have search; people do not type IDs. Numeric dates use date controls; historical display strings remain available for exact source wording.

## 7. Image workflow

The user flow: select an entry → image panel → Upload or Choose existing → see actual placement preview → select Fill or Show whole image → adjust focal point → enter alt text and optional caption → preview desktop/mobile → save draft or publish.

Preview frames show the real template ratios: story card, member portrait, banner and article image where applicable. Show the crop boundary; draggable focal point plus keyboard-operable horizontal/vertical controls. Save normalized focal coordinates and fit metadata, not a destructive edit to the original. Per-placement metadata allows one image to work in different layouts.

A Replace action changes the selected record's image reference after upload succeeds. Remove image detaches it from the record and activates the intentional fallback. Neither action silently destroys an original used elsewhere. The media library shows where an asset is referenced; permanent deletion is limited to unused assets and requires an explicit destructive confirmation. Revision-retained usage must count as in-use or be retained according to a documented retention policy.

On public pages, image/figure expansion opens an accessible dialog: visible close button, caption, Escape close, focus containment and focus return, next/previous controls for event galleries, and full-resolution link. Native links remain a fallback when JavaScript is unavailable. Avoid stretching diagrams and avoid cropping diagram labels.

Uploads validate allowed raster formats and size; add decoded dimensions and pixel limits. Generate optimized display sizes while keeping original files, and serve responsive image variants where available. Existing remote images can be cached/imported with source attribution and a download manifest; do not assume the entire 800 MB archive is present.

Verified reference assets currently available: original logo (283×85), group photo (1920×451), PI portrait (512×512), campus image (371×216). The small campus image should not be stretched into a large desktop hero. Full media archive remains outstanding.

## 8. Cross-linking and information design

Relationships are editor-selected and validated against record collections. Research can reference tools, publications and people; stories can reference related research/people/tools; member profiles reuse publication/tool records. Use clear destination labels, preserve external destination hostnames on tool launch actions, and retain contextual back links.

Use cards for visual discovery (research, news, people), citation rows for publications, timelines for education/appointments, and tables only for genuinely tabular information. Charts are optional only where real data answers a question: for example, an archive count by publication year, labeled as archive coverage rather than research impact. Do not add charts merely to animate the page or inflate perceived impact.

## 9. Content preservation and source issues

Baseline: 288 records — 36 tools, 55 news, 18 events, 22 people, 6 research areas, 143 publications, 8 pages. Maintain IDs and source provenance. New settings/opportunity/media entries are additional configuration/content, not replacements for historical records.

Preserve all citations and publication categories: 54 papers, 85 conference entries and 4 editorials. Source contains 3 empty conference placeholders; these remain recorded in the migration report rather than appearing as empty cards. Preserve biographies, images/alt text, galleries, contact information, social links, dissertation/work fields, original tool URLs, and historical article routes.

The previous external check found 19 of 36 tool destinations returning server errors/redirect loops. Do not fabricate replacements or claim the underlying tools work. Keep destinations and report service issues separately.

## 10. Delivery stages and acceptance gates

1. **Reference and design:** approve this page structure, visual identity, and editing model. Confirm actual assets and source facts; document missing media and contradictory dates.
2. **Shared shell and representative pages:** implement logo/header/navigation/footer, compact homepage, research overview, news archive, and PI profile. Review actual desktop/mobile screenshots before applying the system everywhere.
3. **Complete public templates:** people/alumni, publications, tools, events, details, opportunities/contact, breadcrumbs and contextual links. Reconcile preserved content and legacy routes.
4. **Editorial controls:** homepage curation, opportunities, shared settings, director repeaters, relationship selections and normalized dates. Add schema migrations that do not overwrite existing edits.
5. **Media workflow:** asset library, upload/replace/remove, crop/focal previews, accessible expansion and gallery behavior. Verify reusable-image and revision safety.
6. **Verification and publication:** repeat automated, browser, content and Docker checks; publish the updated owner-private review Site; supply code, documentation and evidence.

A separate static Site preview remains suitable for design/content review. Full CMS operation requires the Node/Docker service and persistent storage. The review link must not imply that static hosting runs the SQLite backend. A public university replacement is a later integration step after review.

### Concrete acceptance checklist

- Original logo visible and legible; bright white/navy/magenta design applied consistently.
- Every primary label opens a distinct page; `/home` works; dropdowns and mobile menu work with keyboard/touch.
- Homepage is a compact gateway with clear user tasks and a bounded current feed.
- PI profile contains every original biography, education, appointment and award fact in a readable structure.
- Editor can create paper, conference entry, event, news item, member, tool and opening using forms.
- Published automatic-feed items appear correctly; excluded/draft items do not; selected mode follows stored order.
- Editing footer/contact details updates every shared occurrence.
- Image replacement shows real crops, preserves original files and other placements, and opens accessibly at full size.
- Content audit preserves 288 baseline records, provenance, exact tool destinations and legacy paths.
- Browser checks at 320, 390, 768 and 1440 px; no unintended overflow; menus, filters, dialogs and CMS work; reduced motion and JavaScript-disabled reading checked.
- Automated accessibility checks plus keyboard/focus inspection; meaningful alt text, heading hierarchy, contrast and touch targets reviewed.
- Performance checks on representative pages; responsive image dimensions prevent layout jumps. Measure before claiming a performance score.
- Docker build/start/restart, durable uploads/content, backup/restore and authentication regression checks pass.

## 11. Decisions that do not require repeated approval

Use original factual source content, preserve the existing URLs, keep Node and the working CMS foundation, make ordinary content fields editable, use real available assets with placeholders for missing ones, apply accessible focus/motion defaults, and document all implementation changes. No new lab claims, openings or external integrations should be invented to fill a layout.
