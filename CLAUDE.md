# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Serdar Gündoğdu — Industrial AI Engineer. The site presents a physical-to-digital career journey (mechanical engineering → AI engineering) with an interactive ASCII/pixel portrait engine, an application map of live subdomain products, and verified credentials.

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
- `index.html` - English homepage served at `/` (self-canonical)
- `tr/index.html` - Turkish homepage with matching anchors and timeline stage keys
- `styles.css` - Global design system with CSS custom properties; self-hosted Inter variable font (`/fonts/`)
- `scripts.js` - Language preference, navigation, application discovery, relative freshness, and viewport-aware career portrait animation
- `data/living-system.json` - Canonical public applications, relationships, Now entries, and explicitly authored Knowledge records
- `tools/render-living-system.mjs` - Shared navigation and bilingual content generator; run `npm run generate:site` after canonical edits
- `portfolio.json` - Generated public application registry; its manifest contract is in `schemas/aserdargun-app.schema.json`
- `staticwebapp.config.json` - Route rules: `/en` + `/en/*` 301 to `/`, immutable caching for versioned assets, security headers
- `sitemap.xml`, `robots.txt` - SEO surfaces for both homepages, Now, Knowledge, and dated Now archives
- `package.json` - Shared setup, preview, and validation command contract
- `tools/serve.mjs` - Dependency-free local static preview server
- `tools/serve.test.mjs` - HTTP behavior and path-confinement regression tests
- `tools/validate-site.mjs` - Dependency-free parity and metadata validation for both locales (also encodes retired project URLs that must not return to the site)

### Pages and sections (both locales, keep in parity)
- Hero + reverse-chronological eight-stage career timeline (`08 AI Engineer` → `01 Mechanical Engineering`)
- Five-layer overview precedes `#learning`: foundations, agent systems, assurance, deployment, and physical AI
- `#learning` learning system - an orthogonal SVG relationship map with guiding questions and an accessible mobile equivalent; parallel GPU/USL foundations feed LLM and HNS, followed by CTX/SEC/EVL and parallel LCL/CLD deployment choices
- WFM and SWI form parallel research bridges into ITL and the long-term ENG horizon; ANT and BEE branch from SWI as independent colony experiment labs
- `#apps` application map - canonical applications with localized search, layer filters, and expandable evidence; each is keyed by a three-letter code
- `/now/` and `/tr/now/` - dated current work with frozen weekly archives
- `/memory/` and `/tr/memory/` - five or more explicitly authored public Knowledge notes with sources and related applications
- `#approach` working principles, `#about` + verified credentials, contact

### Application identities and evidence

Read identities, roles, lifecycle status, dates, and relationships from `data/living-system.json`; do not maintain a second product inventory here. Every application belongs in the registry, application map, system overview, and corresponding learning relationship. A public link does not establish verified production status. SWI, ANT, and BEE are live with dated verification and release evidence. ANT and BEE have no asserted research cutoff; their educational models are distinct from biological field measurements. Preserve missing evidence instead of fabricating dates or SHAs.

Knowledge renders only the explicitly authored public records in the canonical source. Private NXT content must never be inferred or copied into public pages or the registry. Historical Now content retains its original dates.

Earlier portfolio projects (Stackfolio, PIPolars, PIWebAPI, SWAPP, SCADA Nerve, Industry-Learn, Scikit-Play, Aeon-Play, PyTorch-Play, DSML101) were retired from this site on purpose; `tools/validate-site.mjs` fails the build if any of their URLs reappear.

The old `projects/stage-1-frontend-foundations/` exercise tree is also retired. Do not restore its glossary, KPI tiles, meeting form, troubleshooting wizard, P&ID viewer, or links. Current products listed in the canonical registry and the private-systems navigation are separate from these retired root-site demos.

### Key Patterns

**Typography:** Self-hosted Inter variable font (latin + latin-ext subsets in `/fonts/`, preloaded), enabling intermediate weights (520/560/650) with a Helvetica/Arial fallback stack. Monospace UI accents use the system mono stack.

**Images:** Career portraits ship as WebP with palette-quantized PNG fallbacks (≤250 KB each, transparency via tRNS). Open Graph images are 1200×630 JPEG (≤400 KB). Asset changes require bumping the shared `?v=` cache-busting query, mirrored in `tools/validate-site.mjs` (`expectedAssetVersion`).

**JavaScript:** Vanilla JS using IIFE pattern for module encapsulation. No framework dependencies. Portrait renderers are gated by IntersectionObserver visibility and a requestAnimationFrame energy threshold; `prefers-reduced-motion` disables all animation.

**Accessibility:** ARIA labels, skip link, keyboard navigation, focus indicators, sticky mobile navigation, print stylesheet, no-JS fallbacks throughout.

## Deployment

Azure Static Web Apps via GitHub Actions (`.github/workflows/azure-static-web-apps-red-tree-06630f303.yml`):
- Triggers on push to `main` or PR events
- No compilation required - uploads the allowlisted `.site-dist/` artifact
- PR branches get automatic staging environments
