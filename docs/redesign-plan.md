# KAABiL v2 redesign plan (October 2026)

## Direction

A research-institute profile, not a startup landing page. Reference points: the way national labs and
research institutes present themselves — clear structure, confident editorial typography, real photography,
restrained colour, and facts a visitor can act on.

- **Typography:** Source Serif 4 for headings (editorial, academic), Inter for interface and body text.
  Both self-hosted (the CSP blocks external fonts).
- **Colour:** USU navy for structure, KAABiL crimson (from the logo) as the single accent, warm neutral
  greys. No gradient text, no glows, no tilted or floating cards.
- **Layout:** a 12-column grid, thin rules instead of heavy boxes, generous whitespace, consistent page
  headers with breadcrumbs.
- **Motion:** quiet and purposeful — section reveals, underline and image hover states, header elevation on
  scroll, cross-page view transitions where the browser supports them. Everything is disabled under
  `prefers-reduced-motion`.

## Information architecture

| Main menu | Contents |
|---|---|
| Research | Overview, each research area (from CMS records) |
| People | Director, current team, alumni |
| Publications | Journal papers, conferences, editorials |
| Tools | All tools and databases, grouped by category |
| News & Events | News (General / Science / Media), events |
| About | About the lab, opportunities, contact |

Utility bar: Utah State University, BioinfoCore, COVID-19 Tracker, USU RStudio, Contact.
Header actions: Search, "Join the lab". Mobile: a full-screen menu replaces the bottom tab bar.

## Page templates

1. **Home:** hero (headline, summary, actions, team photo) → lab at a glance (live counts) →
   research areas → featured tools → latest news and events → recent publications → director → join us.
2. **Section pages:** breadcrumb, eyebrow, serif title, intro, then the section's own layout.
3. **Detail pages:** article column (about 68 characters wide), lede, hero image, gallery, related work.
4. **Profiles:** portrait and facts sidebar; interests, biography, credentials, publications, tools.

## CMS

- The studio gets its own app chrome instead of the public header.
- Every Homepage setting must change the homepage: announcement, latest-updates mode
  (automatic / selected / hidden), event and opportunity panels, image caption.
- Verified end to end: sign in, create, edit, draft preview, publish, settings, image upload, revisions.

## Contracts kept

Routes, legacy redirects, tool category anchors (`#hpi`, `#cellularloc`, ...), exact tool URLs,
`publication-list`, draft privacy, CSP (`style-src 'self'`, no inline style attributes), static export.
