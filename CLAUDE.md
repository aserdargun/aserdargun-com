# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Serdar Gündoğdu — Industrial AI Engineer. The site presents a physical-to-digital career journey (mechanical engineering → AI engineering) across separate pages, built on one canonical application registry: `/` is the learning-map homepage, `/applications/` is the searchable application map, `/about/` carries the eight-stage career timeline with an interactive ASCII/pixel portrait engine and verified credentials, and `/journey/` holds the long-horizon narrative.

**Tech Stack:** Pure HTML5, CSS3, vanilla JavaScript - zero runtime dependencies. Node.js 20+ and npm provide dependency-free local development and validation commands. The public experience is bilingual: `/` serves the English page directly, `/tr/` serves Turkish, and the retired `/en/` duplicate 301-redirects to `/` (see `staticwebapp.config.json`).

## Development Commands

There is no compilation step. `npm run build:site` stages the public-only `.site-dist/` artifact. npm provides the shared development command surface without installing runtime or development packages.

- **Setup:** `npm ci`
- **Local development:** `npm run dev` (serves `http://127.0.0.1:4173` by default)
- **Validation:** `npm test`
- **Static server tests:** `npm run test:server`
- **Deployment:** Automatic via Azure Static Web Apps on push to `main` branch

## Architecture

### Root Level
- `index.html` - English homepage served at `/` (self-canonical): hero, `#learning` diagram, and `#explore` discovery block
- `tr/index.html` - Turkish homepage with matching anchors and the same generated blocks
- `styles.css` - Global design system with CSS custom properties; self-hosted Inter variable font (`/fonts/`)
- `scripts.js` - Language preference, navigation, relative freshness, mobile-map pinch/zoom on the diagram, career portrait animation, hidden film, and timeline wiring
- `applications/index.html`, `about/index.html`, `journey/index.html`, `now/index.html`, `memory/index.html` - the other public pages, each mirrored under `tr/`
- `data/living-system.json` - Canonical public applications, relationships, Now entries, and explicitly authored Knowledge records
- `tools/render-living-system.mjs` - Shared navigation and bilingual content generator; run `npm run generate:site` after canonical edits
- `portfolio.json` - Generated public application registry; its manifest contract is in `schemas/aserdargun-app.schema.json`
- `staticwebapp.config.json` - Route rules: `/en` + `/en/*` 301 to `/`, immutable caching for versioned assets, security headers
- `sitemap.xml`, `robots.txt` - SEO surfaces for both homepages, Applications, About, Journey, Now, Knowledge, and dated Now archives
- `package.json` - Shared setup, preview, and validation command contract
- `tools/serve.mjs` - Dependency-free local static preview server
- `tools/serve.test.mjs` - HTTP behavior and path-confinement regression tests
- `tools/validate-site.mjs` - Dependency-free parity and metadata validation for both locales (also encodes retired project URLs that must not return to the site)

### Pages and sections (both locales, keep in parity)
- `/` homepage: hero introduction leads straight into the nine-stage `#learning` diagram, followed by the `#explore` discovery block (three routes, six featured experiments, next step). The duplicate application table was removed and the five-layer card overview was retired
- `/` `#learning` learning system - an orthogonal SVG relationship map. The architect lane (AIA) sits above eight topical lanes and sends out three arrows, each leaving on a midpoint: the left midpoint drops into the serving frame's top centre, the bottom midpoint runs straight down into the kernel frame's top centre, and the right midpoint enters the vision frame's top centre
- `#learning` foundation lane: LLM (with TFL), GPU (with POL and GEX) and VIS stand side by side. Frames are centred on the content they own, and every arrow between framed applications meets a frame midpoint on both ends. GPU hands its own lane to VIS with one straight horizontal, and VIS reaches the runtime lane from its own frame's bottom midpoint
- `#learning` runtime lane: USL with ADP, fed from three directions - the serving frame's bottom centre on the left, GPU straight down the top centre, the vision frame on the right. HNS and everything below it share one vertical column with ADP, so the adaptation-to-harness arrow runs straight down from the adaptation frame's bottom centre to the harness frame's top centre; CTX with MEM exchanges reciprocal feedback with SEC and EVL, followed by the parallel LCL/CLD deployment choice with their shared DCL
- WFM and SWI form parallel research bridges into ITL and the long-term ENG horizon; ANT and BEE branch from SWI as independent colony experiment labs
- The learning game closes the map below the nine numbered lanes: ILM stands alone on the runtime column axis with no frame, because it owns no children. That last band is a section, not a stage, so it carries no number and no arrow reaches it — the map offers to be played rather than claiming the game is produced by the lane above. A stage entry may opt out of numbering with a trailing `false`. ILM carries the sixth portfolio layer, `learning-game`, because a filter bucket must not force an application into a layer it does not belong to
- Diagram geometry is contract, not taste: `tools/learning-diagram.mjs` owns every node, frame and route, and `tools/application-hierarchy.test.mjs` re-measures arrow entry/exit points, corridor clearance and frame centring. Change a coordinate and the measurement must still pass
- Every stage band wraps the content it owns with the same 22px above and below, so all nine lanes read as balanced and each gutter between two lanes is one uniform 44px gap; the same test measures that padding per lane, so a lane cannot drift back to an oversized or top-heavy band. A band also squeezes its own stage copy to fit, so a short lane with long copy would print its lines on top of each other; the same test measures the wrapped copy line height against `STAGE_COPY_MIN_LINE_HEIGHT`
- The drawn arrows are a curated learning flow, not a mirror of `upstreamApps`/`downstreamApps`: the diagram carries 20 routes, while the canonical source declares 84 directed relationships. ILM is the clearest case: it declares all 33 registered applications as upstream and the diagram deliberately draws no arrow at all. Parent/child pairs are expressed by frame containment rather than an arrow, and shared ownership (DCL under CLD + LCL) is containment too, never a route. Do not add an arrow per data relationship, and do not treat a missing arrow as missing data
- `/applications/` `#apps` application map - canonical applications with localized search, layer filters, and expandable evidence; each is keyed by a three-letter code
- `/about/` - `#journey` reverse-chronological eight-stage career timeline (`08 AI Engineer` → `01 Mechanical Engineering`) with animated ASCII/pixel portraits, `#approach` working principles, `#about` + verified credentials, contact
- `/journey/` - the long-horizon narrative: deployment lab, swarm labs, and the ENG horizon
- `/now/` - dated current work with frozen weekly archives under `/now/archive/`
- `/memory/` - explicitly authored public Knowledge notes with sources and related applications

### Application identities and evidence

Read identities, roles, lifecycle status, dates, and relationships from `data/living-system.json`; do not maintain a second product inventory here. `data/system-focus.json` only stages additions that are not registered yet and is currently empty.

`tools/verify-applications.mjs` (`npm run verify:applications`) re-checks every published address and recorded release; it reports staleness and never renews a date by itself. It reads each repository's own default branch instead of assuming `main`, because ILM publishes from `master` and an assumed name reports a permanent false drift. The homepage introduction states the current application count (34) in both locales and `llms.txt` must list every registered application; `tools/validate-site.mjs` rejects retired five-layer copy.

Every application belongs in the registry, application map, system overview, and corresponding learning relationship. A public link does not establish verified production status. SWI, ANT, and BEE are live with dated verification and release evidence. ANT and BEE have no asserted research cutoff; their educational models are distinct from biological field measurements. Preserve missing evidence instead of fabricating dates or SHAs.

Knowledge renders only the explicitly authored public records in the canonical source. Private NXT content must never be inferred or copied into public pages or the registry. Historical Now content retains its original dates.

Earlier portfolio projects (Stackfolio, PIPolars, PIWebAPI, SWAPP, SCADA Nerve, Industry-Learn, Scikit-Play, Aeon-Play, PyTorch-Play, DSML101) were retired from this site on purpose; `tools/validate-site.mjs` fails the build if any of their URLs reappear.

The old `projects/stage-1-frontend-foundations/` exercise tree is also retired. Do not restore its glossary, KPI tiles, meeting form, troubleshooting wizard, P&ID viewer, or links. Current products listed in the canonical registry and the private-systems navigation are separate from these retired root-site demos.

### Key Patterns

**Typography:** Self-hosted Inter variable font (latin + latin-ext subsets in `/fonts/`, latin preloaded), enabling intermediate weights (520/560/650). The CSS custom properties are historical names that do not match the shipped font: `--font-geist-sans` resolves to `Inter, "Helvetica Neue", Arial, sans-serif` and `--font-geist-mono` to the system mono stack. Keep using those variables; do not "fix" them by loading a Geist font.

**Images:** Career portraits ship as WebP with palette-quantized PNG fallbacks (≤250 KB each, transparency via tRNS). Open Graph images are 1200×630 JPEG (≤400 KB). Asset changes require bumping the shared `?v=` cache-busting query, mirrored in `tools/validate-site.mjs` (`expectedAssetVersion`).

**JavaScript:** Vanilla JS using IIFE pattern for module encapsulation. No framework dependencies. Portrait renderers are gated by IntersectionObserver visibility and a requestAnimationFrame energy threshold; `prefers-reduced-motion` disables all animation.

**Accessibility:** ARIA labels, skip link, keyboard navigation, focus indicators, sticky mobile navigation, print stylesheet, no-JS fallbacks throughout. In the learning diagram the arrow and frame groups are `aria-hidden`, so the accessible equivalent is the SVG `<desc>` plus each node's own `aria-label`; keep that description in sync with any route or geometry change.

## Deployment

Azure Static Web Apps via GitHub Actions (`.github/workflows/azure-static-web-apps-red-tree-06630f303.yml`):
- Triggers on push to `main` or PR events
- No compilation required - uploads the allowlisted `.site-dist/` artifact
- PR branches get automatic staging environments
