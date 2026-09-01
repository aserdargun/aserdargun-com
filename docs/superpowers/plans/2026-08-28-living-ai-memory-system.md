# Living AI Memory System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn `aserdargun.com` into a trustworthy, bilingual public projection of Serdar's past, present, future, knowledge, and applications, while keeping capture, private recall, and publication approval inside NXT.

**Architecture:** Keep the main site dependency-free and static. Store public metadata in one validated JSON manifest, render marked HTML regions deterministically, reject stale generated output in tests, archive dated `/now/` records before replacement, and render only explicitly allowlisted public-memory snapshots. Treat the base NXT vault as a separate program dependency; do not add a public chatbot or a runtime dependency on NXT.

**Tech Stack:** Semantic HTML, CSS, vanilla JavaScript, Node.js 20 built-in modules and test runner, existing local preview lifecycle, Azure Static Web Apps configuration unchanged.

**Spec:** `docs/superpowers/specs/2026-08-28-living-ai-memory-system-design.md`

## Global constraints

- Preserve the current visual language, career portraits, learning-system diagram, root/TR parity, dependency-free runtime, Azure SWA structure, and three-letter application codes.
- Use test-driven changes: add the focused failing assertion, run it and observe the expected failure, make the smallest implementation change, then rerun the focused and regression suites.
- Do not invent current-week activity, career dates, application freshness, public-memory entries, or NXT snapshot URLs. Unknown facts remain absent or visibly stale.
- Do not expose Google Drive identifiers, OAuth tokens, private note identifiers, unpublished text, owner prompts, or private-system metadata.
- Do not crawl NXT. The only publish bridge is an owner-reviewed `publicMemory` record with an immutable public snapshot URL.
- Do not add a framework, package, client-side AI SDK, server-side AI endpoint, analytics tracker, or new cloud resource.
- Do not commit, push, deploy, change Azure, or modify DNS without separate explicit authorization. Each task ends with tests and an inspectable working-tree status instead of a commit.
- After any source edit, regenerate marked output before browser validation. Stop the preview with `npm run stop` and verify its checkout-scoped listener is gone.

## Program order

| Phase | Tasks | Outcome | Gate |
| --- | --- | --- | --- |
| Foundation | 1–3 | Validated public schema and deterministic generation | No generated drift; legacy content preserved |
| Public experience | 4–7 | Living-system IA, responsive navigation, honest Now, public memory | EN/TR parity and privacy tests pass |
| Relationships and quality | 8–10 | Evidence links, accessibility, full local validation | Desktop/mobile browser evidence passes |
| Private AI memory | 11 | Separate NXT recall specification after the vault exists | NXT storage, publication, revocation, and security gates pass |
| Release | 12 | Explicitly authorized publication only | Local acceptance and action-time authorization |

## File map

### Create in this repository

- `data/living-system.json` — canonical public application, Now, memory, and journey-evidence data.
- `tools/living-system-data.mjs` — load, validate, normalize, count, and freshness functions.
- `tools/living-system-data.test.mjs` — schema, locale, date, privacy, relationship, and freshness tests.
- `tools/render-living-system.mjs` — deterministic renderer and `--check` entry point.
- `tools/render-living-system.test.mjs` — block replacement, escaping, locale, and drift tests.
- `tools/archive-now.mjs` — immutable bilingual weekly archive command.
- `tools/archive-now.test.mjs` — archive precondition, collision, output, and sitemap tests.
- `tools/navigation-contract.test.mjs` — header structure, labelled groups, unique IDs, and accessible external-link tests.
- `memory/index.html` — English curated public-memory index shell.
- `tr/memory/index.html` — Turkish curated public-memory index shell.

### Modify in this repository

- `package.json` — generation, archive, focused test, and aggregate validation scripts.
- `index.html` — English generated navigation, living-system summary, application map, and optional journey evidence.
- `tr/index.html` — Turkish equivalents.
- `now/index.html` — shared responsive header, generated dated content, freshness state, and archive links.
- `tr/now/index.html` — Turkish equivalents.
- `styles.css` — living-system, metadata, memory-card, archive, freshness, responsive, focus, and reduced-motion styles.
- `scripts.js` — relative freshness enhancement only; absolute dates remain in HTML.
- `tools/validate-site.mjs` — generated-data, route, sitemap, parity, navigation, and privacy integration assertions.
- `sitemap.xml` — public memory indexes and local archive pages; never NXT snapshot URLs.
- `staticwebapp.config.json` — only if the new static routes need explicit route coverage after a focused test proves it.

### Existing NXT references; do not edit during Tasks 1–10

- `/Users/aserdargun/Documents/ChatGPT/nxt-aserdargun-com/docs/superpowers/specs/2026-08-23-nxt-markdown-vault-design.md`
- `/Users/aserdargun/Documents/ChatGPT/nxt-aserdargun-com/docs/superpowers/plans/2026-08-23-nxt-markdown-vault.md`

## Public contracts

`tools/living-system-data.mjs` must export:

```js
export const TIMEFRAMES = ["week", "month", "long-term"];
export function loadLivingSystemData(filePath) {}
export function validateLivingSystemData(data, { today = new Date() } = {}) {}
export function assertValidLivingSystemData(data, options) {}
export function getFreshnessState(dateText, today) {}
export function summarizeApplications(applications, locale) {}
```

`validateLivingSystemData` returns all errors instead of stopping at the first:

```js
{
  valid: false,
  errors: [
    { path: "applications[2].updatedAt", code: "invalid-date", message: "..." }
  ]
}
```

`tools/render-living-system.mjs` must export pure functions before invoking its CLI:

```js
export function renderSite({ rootDir, data, today }) {}
export function renderDocument({ html, page, locale, data, today }) {}
export function replaceGeneratedBlock(html, blockName, renderedHtml) {}
export function renderPrimaryNavigation({ locale, page }) {}
export function renderLivingSystem({ locale, data, today }) {}
export function renderApplicationMap({ locale, data, today }) {}
export function renderNowContent({ locale, data, today, archiveLinks }) {}
export function renderPublicMemory({ locale, data }) {}
export function renderJourneyEvidence({ locale, data }) {}
```

The CLI contract is:

```text
node tools/render-living-system.mjs          # validate, then write changed documents
node tools/render-living-system.mjs --check  # validate and fail on drift; never write
node tools/archive-now.mjs --week 2026-W34   # archive exactly the current manifest week
```

### Task 1: Establish the canonical public-data contract

**Files:**

- Create: `data/living-system.json`
- Create: `tools/living-system-data.mjs`
- Create: `tools/living-system-data.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add a minimal valid test fixture and the first failing loader/validator tests.**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  getFreshnessState,
  summarizeApplications,
  validateLivingSystemData,
} from "./living-system-data.mjs";

const localized = (en, tr) => ({ en, tr });
const validData = () => ({
  schemaVersion: 1,
  contentPolicyVersion: 1,
  generatedCopyVersion: 1,
  applications: [{
    code: "aia",
    kind: "atlas",
    visibility: "public",
    status: "live",
    title: localized("AI Ecosystem Atlas", "AI Ecosystem Atlas"),
    summary: localized("Evidence-backed research console.", "Kanıta dayalı araştırma konsolu."),
    guidingQuestion: localized("What should we compare?", "Neyi karşılaştırmalıyız?"),
    repository: "https://github.com/aserdargun/aia-aserdargun-com",
    address: "https://aia.aserdargun.com/",
    updatedAt: "2026-08-25",
    relatedMemoryIds: [],
    nextDirection: localized("Refresh evidence.", "Kanıtları yenile.")
  }],
  now: {
    updatedAt: "2026-08-21",
    week: "2026-W34",
    items: [
      { id: "week", timeframe: "week", title: localized("Week", "Hafta"), summary: localized("Work", "Çalışma"), tags: [] },
      { id: "month", timeframe: "month", title: localized("Month", "Ay"), summary: localized("Work", "Çalışma"), tags: [] },
      { id: "long-term", timeframe: "long-term", title: localized("Long term", "Uzun vade"), summary: localized("Work", "Çalışma"), tags: [] }
    ]
  },
  publicMemory: [],
  journeyEvidence: []
});

test("accepts the minimal bilingual public manifest", () => {
  assert.deepEqual(validateLivingSystemData(validData()).errors, []);
});

test("uses calendar-day freshness boundaries", () => {
  const today = new Date("2026-08-28T12:00:00+03:00");
  assert.equal(getFreshnessState("2026-08-21", today), "current");
  assert.equal(getFreshnessState("2026-08-20", today), "aging");
  assert.equal(getFreshnessState("2026-08-13", today), "needs-refresh");
});
```

- [ ] **Step 2: Run the focused test and confirm the missing-module failure.**

Run: `node --test tools/living-system-data.test.mjs`

Expected: `ERR_MODULE_NOT_FOUND` for `tools/living-system-data.mjs`.

- [ ] **Step 3: Implement the loader and aggregate validator with strict contracts.**

Validate all of the following:

- top-level keys and integer versions;
- unique lowercase three-letter application codes;
- unique stable kebab-case memory IDs and journey stage keys;
- complete non-empty `{ en, tr }` localized objects;
- the exact application `kind`, `visibility`, and `status` enums from the design;
- real `YYYY-MM-DD` calendar dates and a matching ISO week `YYYY-Www`;
- exactly one `week`, `month`, and `long-term` Now item;
- HTTPS repository/address/evidence URLs;
- GitHub repositories under the exact `aserdargun` owner;
- public memory `visibility === "public"` and `sourceUrl` matching `https://nxt.aserdargun.com/p/<opaque-id>`;
- every `relatedMemoryIds` and `relatedApplicationCodes` target exists;
- `journeyEvidence.period` is either `null` or a non-empty verified string.

Use UTC date-only arithmetic so daylight-saving or Istanbul offsets cannot shift freshness boundaries. `getFreshnessState` returns `current` for age `0–7`, `aging` for `8–14`, and `needs-refresh` for `15+`; future dates are validation errors.

Require `updatedAt` for `active` and `live` applications. Permit an explicit
`null` only for `idea`, `design`, `paused`, and `archived`, and render status
rather than a freshness badge in that case.

- [ ] **Step 4: Add negative table tests and verify that every error is reported.**

Add subtests for duplicate codes, duplicate memory IDs, impossible dates such as `2026-02-30`, future dates, absent Turkish copy, an unrecognized enum, duplicated timeframes, a private memory record, a non-NXT snapshot source, a missing relationship target, a foreign GitHub owner, and `javascript:` URLs.

Run: `node --test tools/living-system-data.test.mjs`

Expected: all tests pass and the aggregate-error test returns more than one error for a deliberately malformed fixture.

- [ ] **Step 5: Seed the manifest from facts already visible in the current pages.**

Seed seven public application records in this order:

| Code | Kind | Status | Role |
| --- | --- | --- | --- |
| `aia` | `atlas` | `live` | Core learning application |
| `llm` | `atlas` | `live` | Core learning application |
| `usl` | `atlas` | `live` | Core learning application |
| `gpu` | `atlas` | `live` | Core learning application |
| `cld` | `tool` | `live` | Core learning application |
| `itl` | `lab` | `live` | Industrial lab |
| `eng` | `horizon` | `design` | Long-term horizon |

Copy existing titles, summaries, repository URLs, product URLs, and verified `updatedAt` values literally from `index.html` and `tr/index.html`. Use `updatedAt: null` for `eng`, whose current row states `in design` but supplies no public update date. Set `publicMemory` and `journeyEvidence` to empty arrays. Copy the existing 2026-W34 Now content literally from `/now/` and `/tr/now/`; keep `updatedAt: "2026-08-21"` so the future UI truthfully reports its age. Add guiding questions and next directions only after their exact English and Turkish wording is owner-reviewed; until then those two properties are omitted and the validator treats them as optional, non-rendered fields.

Keep `stk`, `inf`, and `nxt` as the current fixed private-navigation destinations; do not manufacture public application metadata for them.

- [ ] **Step 6: Make application summaries count by semantic role, not array length.**

`summarizeApplications` must derive the current sentence as:

```text
EN: Five core learning applications, one lab, and one long-term horizon.
TR: Beş çekirdek öğrenme uygulaması, bir laboratuvar ve bir uzun vadeli ufuk.
```

The count comes from `kind`, with `aia`, `llm`, `usl`, `gpu`, and `cld` tagged as core in data via `systemRole: "core-learning"`; `itl` uses `systemRole: "lab"`; `eng` uses `systemRole: "horizon"`. Add `systemRole` to validation with exactly those three allowed values.

- [ ] **Step 7: Add and run the focused package script.**

Add:

```json
"test:data": "node --test tools/living-system-data.test.mjs"
```

Run: `npm run test:data && git diff --check && git status --short`

Expected: data tests pass; only intentional Task 1 files are modified or untracked.

### Task 2: Build deterministic generated-block rendering

**Files:**

- Create: `tools/render-living-system.mjs`
- Create: `tools/render-living-system.test.mjs`
- Modify: `package.json`
- Modify: `index.html`
- Modify: `tr/index.html`
- Modify: `now/index.html`
- Modify: `tr/now/index.html`

- [ ] **Step 1: Add failing pure-function tests for safe block replacement.**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { replaceGeneratedBlock } from "./render-living-system.mjs";

test("replaces exactly one named block and preserves surrounding bytes", () => {
  const html = "before\n<!-- GENERATED:application-map:start -->\nold\n<!-- GENERATED:application-map:end -->\nafter\n";
  assert.equal(
    replaceGeneratedBlock(html, "application-map", "<table>new</table>"),
    "before\n<!-- GENERATED:application-map:start -->\n<table>new</table>\n<!-- GENERATED:application-map:end -->\nafter\n"
  );
});

test("rejects absent or duplicate markers", () => {
  assert.throws(() => replaceGeneratedBlock("<main></main>", "application-map", "x"), /exactly one/);
});
```

- [ ] **Step 2: Run the focused test and confirm the missing-module failure.**

Run: `node --test tools/render-living-system.test.mjs`

Expected: `ERR_MODULE_NOT_FOUND` for `tools/render-living-system.mjs`.

- [ ] **Step 3: Implement marker replacement, escaping, rendering, and CLI modes.**

Requirements:

- escape `&`, `<`, `>`, `"`, and `'` in all data-derived text and attributes;
- accept only the six marker names defined by the design;
- require exactly one start and one end marker in the correct order;
- validate data before rendering any document;
- render all target documents in memory before writing any file;
- in write mode, write only files whose bytes change;
- in `--check` mode, print each stale relative path and exit non-zero without writing;
- accept `LIVING_SYSTEM_TODAY=YYYY-MM-DD` only in tests; validate it as a real date;
- use `process.exitCode`, not an unconditional `process.exit`, so errors flush.

- [ ] **Step 4: Add tests for escaping, locale parity, unknown markers, and no-write check mode.**

Use a temporary directory created by `mkdtemp`. Put `<script>alert(1)</script>` in a fixture title and assert the rendered page contains escaped text and no literal `<script>`. Assert English and Turkish renders expose the same record codes and relationship counts. In check mode, hash all files before and after and assert hashes are unchanged.

Run: `node --test tools/render-living-system.test.mjs`

Expected: all renderer tests pass.

- [ ] **Step 5: Insert generated markers without changing visible content.**

Wrap the existing application tables and Now content in their named markers. Add empty, adjacent marker pairs for `primary-navigation`, `living-system`, `public-memory`, and `journey-evidence` only where the design assigns them. The first render must reproduce the current application rows and current Now cards byte-for-byte apart from formatting needed for markers and the intentionally corrected absolute freshness labels in Task 3.

- [ ] **Step 6: Add package scripts and generated-drift enforcement.**

Add:

```json
"generate:site": "node tools/render-living-system.mjs",
"check:generated": "node tools/render-living-system.mjs --check",
"test:render": "node --test tools/render-living-system.test.mjs"
```

Add `npm run test:data`, `npm run test:render`, and `npm run check:generated` before `validate:site` in the aggregate `test` script.

- [ ] **Step 7: Prove drift is detected and recoverable.**

Run:

```bash
npm run generate:site
npm run check:generated
```

Then change one character inside a generated block, run `npm run check:generated`, and confirm it reports that page as stale. Revert only that deliberate character with `apply_patch`, rerun generation, and confirm check mode passes.

- [ ] **Step 8: Run Task 2 regression checks.**

Run: `npm run test:data && npm run test:render && npm run check:generated && npm run validate:site && git diff --check`

Expected: all commands pass; generated HTML is in sync.

### Task 3: Make counts, dates, and freshness truthful

**Files:**

- Modify: `data/living-system.json`
- Modify: `tools/living-system-data.mjs`
- Modify: `tools/living-system-data.test.mjs`
- Modify: `tools/render-living-system.mjs`
- Modify: `tools/render-living-system.test.mjs`
- Modify: `scripts.js`
- Modify: `styles.css`
- Modify: `tools/validate-site.mjs`
- Regenerate: `index.html`, `tr/index.html`, `now/index.html`, `tr/now/index.html`

- [ ] **Step 1: Add failing assertions for absolute dates and derived states.**

Assert that application and Now renderers produce:

```html
<time datetime="2026-08-25">2026-08-25</time>
```

and a machine-readable wrapper:

```html
<span class="freshness freshness--current" data-freshness-date="2026-08-25" data-freshness-state="current">
```

With test date `2026-08-28`, assert `2026-08-21` is `current`; with `2026-09-05`, assert the same record is `needs-refresh`. Assert generated text contains neither `today` nor `bugün`.

- [ ] **Step 2: Run the focused tests and observe the legacy-label failures.**

Run: `npm run test:data && npm run test:render`

Expected: new renderer assertions fail because the existing output says `today` / `bugün` and lacks data state attributes.

- [ ] **Step 3: Render absolute dates and server-independent freshness states.**

The build-date calculation controls the checked-in class and label. Client JavaScript may append `· 3 days ago` / `· 3 gün önce` after parsing `data-freshness-date`, but it must never remove the `<time>` value. If JavaScript is disabled or the browser clock is invalid, the absolute date and generated state remain legible.

Use these labels:

| State | English | Turkish |
| --- | --- | --- |
| `current` | Current | Güncel |
| `aging` | Review soon | Yakında gözden geçir |
| `needs-refresh` | Needs refresh | Yenilenmeli |

- [ ] **Step 4: Replace hard-coded portfolio counts with the derived summary.**

Delete the literal `Five live applications and one long-term horizon` sentence. Render the role-based sentence from `summarizeApplications`. Update `tools/validate-site.mjs` to assert the derived summary and to fail if a generated application intro contains a hand-maintained numeral/count phrase inconsistent with manifest roles.

- [ ] **Step 5: Style all states without relying on color alone.**

Use a visible text label plus the existing dot. `needs-refresh` must not pulse. Add a `prefers-reduced-motion: reduce` rule that disables all freshness-dot animation.

- [ ] **Step 6: Regenerate and validate against a fixed test date.**

Run:

```bash
LIVING_SYSTEM_TODAY=2026-08-28 npm run generate:site
npm run check:generated
npm run test:data
npm run test:render
npm run validate:site
```

Expected: every visible date is absolute; application counts match semantic roles; the existing 2026-W34 Now content remains unchanged and is classified from its real date.

### Task 4: Introduce the five-part living-system information architecture

**Files:**

- Modify: `tools/render-living-system.mjs`
- Modify: `tools/render-living-system.test.mjs`
- Modify: `index.html`
- Modify: `tr/index.html`
- Create: `memory/index.html`
- Create: `tr/memory/index.html`
- Modify: `styles.css`
- Modify: `tools/validate-site.mjs`

- [ ] **Step 1: Add failing navigation and living-system render tests.**

Assert exact primary concepts and destinations:

| English | Turkish | Destination |
| --- | --- | --- |
| Journey | Yolculuk | `/#journey` or `/tr/#journey` |
| Now | Şimdi | `/now/` or `/tr/now/` |
| Horizon | Ufuk | `/#horizon` or `/tr/#horizon` |
| Applications | Uygulamalar | `/#apps` or `/tr/#apps` |
| Knowledge | Bilgi | `/memory/` or `/tr/memory/` |
| About | Hakkımda | `/#about` or `/tr/#about` |

Assert the five living-system cards are ordered `Past → Now → Future → Knowledge → Applications`, are normal anchors, and have localized descriptions.

- [ ] **Step 2: Run focused tests and observe missing IA output.**

Run: `npm run test:render`

Expected: primary navigation and living-system assertions fail.

- [ ] **Step 3: Render one page-aware primary navigation contract.**

`renderPrimaryNavigation({ locale, page })` returns the same six concepts on home, Now, memory, and archive pages, using the correct localized root and `aria-current="page"` only when the current page is a route. Keep Learning as a secondary homepage section link, not a seventh top-level concept.

Render `The horizon` / `Ufuk` and `Private systems` / `Özel sistemler` as labelled groups that are exposed to assistive technology. Keep `eng` and `itl` in the horizon group and `stk`, `inf`, `nxt` in the private group. Do not use `aria-hidden="true"` on group labels.

- [ ] **Step 4: Add the living-system section immediately after the hero.**

Each card contains a localized eyebrow, heading, one-sentence description, and destination. Use CSS grid with five columns only where space permits; collapse to two columns and then one without horizontal scrolling. The sequence remains meaningful as plain HTML and with styles disabled.

Create both memory-index routes in the same step with localized title,
description, canonical/hreflang metadata, the shared generated navigation, and
the honest empty-state sentence defined in Task 7. Include the
`GENERATED:public-memory` block so the link never points to a missing route.

- [ ] **Step 5: Give the existing horizon content a stable target.**

Add `id="horizon"` to the existing long-term destination container; do not duplicate its content or move it away from the learning loop. Preserve `id="learning"` and its internal links.

- [ ] **Step 6: Add static integration assertions.**

Update `tools/validate-site.mjs` to assert:

- each locale has exactly one instance of the six primary concepts;
- all local destinations exist;
- living-system order and locale pairing match;
- group labels are exposed;
- the old top-level `Approach` link is absent while the `#approach` content section remains;
- private destinations remain exactly `stk`, `inf`, `nxt`.

- [ ] **Step 7: Regenerate and run focused regression.**

Run: `npm run generate:site && npm run test:render && npm run validate:site && npm run check:generated`

Expected: the new IA is present in EN/TR and all legacy career/learning/application sections remain.

### Task 5: Give every route the same responsive, keyboard-operable header

**Files:**

- Create: `tools/navigation-contract.test.mjs`
- Modify: `tools/render-living-system.mjs`
- Modify: `now/index.html`
- Modify: `tr/now/index.html`
- Modify: `memory/index.html`
- Modify: `tr/memory/index.html`
- Modify: `styles.css`
- Modify: `scripts.js`
- Modify: `package.json`

- [ ] **Step 1: Add a route-wide failing navigation contract test.**

For `/`, `/tr/`, `/now/`, `/tr/now/`, `/memory/`, and `/tr/memory/`, parse source HTML and assert:

```text
one [data-nav-toggle]
one [data-nav-panel]
one [data-nav-backdrop]
aria-controls equals the panel ID
all IDs are unique within the document
one primary navigation landmark
one language navigation landmark
```

Also assert every `_blank` anchor has `rel` containing `noreferrer` and localized visually hidden new-tab text.

- [ ] **Step 2: Run the focused test and observe failures on current Now pages.**

Run: `node --test tools/navigation-contract.test.mjs`

Expected: Now pages fail because they do not have the toggle/panel/backdrop structure; memory pages fail any shared-header detail not completed in Task 4.

- [ ] **Step 3: Reuse the existing mobile-navigation behavior on all route shells.**

Generate the complete header shell per locale/page so IDs and language links are page-aware. Keep one `initializeMobileNav()` implementation in `scripts.js`; do not duplicate event handlers. Preserve these behaviors:

- toggle opens and closes the panel and updates `aria-expanded`;
- Escape closes it and restores focus to the toggle;
- backdrop click closes it;
- activating a panel link closes it;
- switching above the mobile breakpoint removes stale open state;
- body scroll lock is removed on every close path.

- [ ] **Step 4: Add DOM-independent behavior assertions for state transitions.**

Refactor only the small state transition into an exported-or-injectable helper if needed for Node tests; do not convert `scripts.js` to an ES module if that would break current loading. Test open, Escape close, backdrop close, focus restore, and resize reset through the smallest existing test-compatible seam.

- [ ] **Step 5: Enforce touch, focus, zoom, and reduced-motion styles.**

At `max-width: 900px`, interactive header targets are at least `44px` high and wide. Preserve a visible `:focus-visible` outline with at least `2px` thickness and non-zero offset. At `200%` zoom the panel must scroll internally and the close control must remain reachable. Reduced-motion mode disables panel and backdrop transitions.

- [ ] **Step 6: Add the focused script and run navigation regression.**

Add:

```json
"test:navigation": "node --test tools/navigation-contract.test.mjs"
```

Insert it into aggregate `npm test` before `validate:site`.

Run: `npm run generate:site && npm run test:navigation && npm run check:js && npm run validate:site`

Expected: all six public route shells satisfy the same header contract.

### Task 6: Add immutable bilingual Now archives

**Files:**

- Create: `tools/archive-now.mjs`
- Create: `tools/archive-now.test.mjs`
- Modify: `package.json`
- Modify: `tools/render-living-system.mjs`
- Modify: `tools/validate-site.mjs`
- Modify: `sitemap.xml`
- Regenerate: `now/index.html`, `tr/now/index.html`
- Create on first approved archival run: `now/archive/2026-W34/index.html`
- Create on first approved archival run: `tr/now/archive/2026-W34/index.html`

- [ ] **Step 1: Add failing archive-command tests in an isolated temporary site.**

Cover these cases:

- missing `--week` exits non-zero with usage;
- requested week differs from `data.now.week`;
- requested destination already exists;
- valid run creates both locale files;
- source `data/living-system.json` remains byte-identical;
- archive pages contain the absolute update date and canonical week;
- sitemap gains paired alternate links and `lastmod` equal to `now.updatedAt`;
- a second identical run refuses to overwrite immutable output.

- [ ] **Step 2: Run the focused test and confirm the missing-module failure.**

Run: `node --test tools/archive-now.test.mjs`

Expected: failure because `tools/archive-now.mjs` does not exist.

- [ ] **Step 3: Implement archive planning and atomic writes.**

Export:

```js
export function planNowArchive({ rootDir, data, week }) {}
export function renderNowArchive({ locale, data, navigationHtml }) {}
export function updateSitemapForArchive({ xml, week, updatedAt }) {}
```

Validate every precondition before creating directories. Render all files in memory, then write to newly created week directories. Never edit `data.now`. If any precondition fails, no archive file and no sitemap change may remain.

- [ ] **Step 4: Add archive navigation to current Now pages.**

The current pages list existing local weekly archives newest-first. Each pair has reciprocal hreflang links, a canonical URL, and a visible `Back to current Now` / `Güncel Şimdi sayfasına dön` link. Archive pages have no edit or mutation controls.

- [ ] **Step 5: Add the package script.**

```json
"archive:now": "node tools/archive-now.mjs",
"test:archive": "node --test tools/archive-now.test.mjs"
```

Insert `test:archive` into aggregate `npm test`.

- [ ] **Step 6: Archive the existing verified 2026-W34 content without changing it.**

Run:

```bash
npm run archive:now -- --week 2026-W34
npm run generate:site
```

Inspect both new archive pages and confirm the three cards match the existing English/Turkish 2026-W34 source exactly. Do not advance the manifest to W35 until Serdar supplies or approves the real W35 focus text. Until then, the current page remains dated 2026-08-21 and its freshness state changes honestly.

- [ ] **Step 7: Run archive and integration checks.**

Run: `npm run test:archive && npm run check:generated && npm run validate:site && git diff --check`

Expected: archive is immutable, paired, discoverable from Now, and present in the local sitemap.

### Task 7: Add an explicit public-memory allowlist and bilingual index

**Files:**

- Modify: `memory/index.html`
- Modify: `tr/memory/index.html`
- Modify: `tools/render-living-system.mjs`
- Modify: `tools/render-living-system.test.mjs`
- Modify: `tools/living-system-data.test.mjs`
- Modify: `styles.css`
- Modify: `tools/validate-site.mjs`
- Modify: `sitemap.xml`

- [ ] **Step 1: Add failing tests for empty and populated public-memory rendering.**

With `publicMemory: []`, require this honest empty state:

```text
EN: No public memory snapshots have been approved yet.
TR: Henüz onaylanmış kamusal hafıza kaydı yok.
```

With one valid fixture, assert the card contains title, summary, type, absolute publication/update dates, tags, related application links, evidence links, and the NXT snapshot link. Assert no property outside the allowlist appears in rendered HTML.

- [ ] **Step 2: Add malicious privacy fixtures.**

Assert validation/rendering rejects:

- `visibility: "owner-only"` or `"unlisted"` in `publicMemory`;
- `driveFileId`, `noteId`, `oauthToken`, `prompt`, `transcript`, or unknown fields;
- a source URL outside `https://nxt.aserdargun.com/p/`;
- a URL with query strings, fragments, credentials, or a path traversal sequence;
- a related application code absent from the public manifest.

- [ ] **Step 3: Run focused tests and observe the missing-route/render failures.**

Run: `npm run test:data && npm run test:render && npm run test:navigation`

Expected: public-memory route/render assertions fail before implementation.

- [ ] **Step 4: Build static bilingual memory-index shells.**

Each page includes shared header/footer, localized metadata, canonical and hreflang links, an explanation that this is curated rather than a complete private memory, and the generated `public-memory` block. Do not add search until there is enough approved content to justify it.

- [ ] **Step 5: Render cards only from the explicit allowlist.**

Omit empty optional groups instead of showing blank labels. External snapshot/evidence links open in a new tab with localized accessible text. Related applications link to the relevant homepage application anchor. Keep `publicMemory: []` in the initial implementation; do not fabricate an example record or public snapshot URL.

- [ ] **Step 6: Add only index routes to the sitemap.**

Add `/memory/` and `/tr/memory/` with reciprocal hreflang alternatives. Assert `sitemap.xml` never contains `nxt.aserdargun.com/p/` or any individual memory-record source URL.

- [ ] **Step 7: Add repository-wide privacy scans to site validation.**

Scan generated public HTML for forbidden JSON keys and common token/Drive-ID labels. This is defense in depth, not a substitute for allowlist serialization. Failure messages name the file and forbidden key without printing the secret value.

- [ ] **Step 8: Regenerate and run privacy regression.**

Run: `npm run generate:site && npm run test:data && npm run test:render && npm run test:navigation && npm run validate:site && npm run check:generated`

Expected: empty public memory is accurately represented, privacy cases fail closed, and snapshot URLs are absent from the sitemap.

### Task 8: Connect applications, knowledge, and journey evidence without inventing history

**Files:**

- Modify: `data/living-system.json`
- Modify: `tools/living-system-data.mjs`
- Modify: `tools/living-system-data.test.mjs`
- Modify: `tools/render-living-system.mjs`
- Modify: `tools/render-living-system.test.mjs`
- Modify: `styles.css`
- Regenerate: `index.html`, `tr/index.html`, `memory/index.html`, `tr/memory/index.html`

- [ ] **Step 1: Add relationship tests before changing markup.**

Assert bidirectional integrity:

- each application `relatedMemoryIds` resolves to a public memory record that lists the same application code;
- each public memory `relatedApplicationCodes` resolves to a public application;
- each journey-evidence application relationship resolves;
- duplicate relationship IDs are invalid;
- empty arrays render no empty heading or card shell.

- [ ] **Step 2: Run focused tests and observe one-way relationship failures.**

Run: `npm run test:data && npm run test:render`

Expected: newly added bidirectional checks fail against one-sided fixtures.

- [ ] **Step 3: Enforce bidirectional relationships in validation.**

Return both paths in each mismatch message, for example:

```text
applications[aia].relatedMemoryIds contains decision-x, but publicMemory[decision-x].relatedApplicationCodes does not contain aia
```

- [ ] **Step 4: Enrich application rows from approved data only.**

When present, render guiding question, next direction, semantic kind/status, absolute updated date, and related-memory count/link. When absent, omit the field cleanly. Do not infer guiding questions from titles during generation.

- [ ] **Step 5: Render journey evidence only when verified content exists.**

Keep the initial `journeyEvidence` array empty. When an owner-reviewed record is later added, attach it to the existing stage using `stage`, display `period` only when non-null, and show only explicitly supplied evidence/application relationships. Do not create estimated career years from image stages or page order.

- [ ] **Step 6: Document the safe content-addition workflow.**

Keep the Task 1 `contentPolicyVersion: 1` contract enforced. The workflow is data edit → focused validation → generation → generated drift check → browser review. JSON cannot contain comments, so place a concise contributor note in the design spec's public-memory section, not in the manifest.

- [ ] **Step 7: Regenerate and run relationship regression.**

Run: `npm run generate:site && npm run test:data && npm run test:render && npm run validate:site && npm run check:generated`

Expected: initial UI has no empty relationship shells; later approved relationships cannot become inconsistent.

### Task 9: Complete accessibility and responsive verification contracts

**Files:**

- Modify: `styles.css`
- Modify: `scripts.js`
- Modify: `tools/navigation-contract.test.mjs`
- Modify: `tools/validate-site.mjs`

- [ ] **Step 1: Add failing static accessibility assertions.**

Assert every generated page has one skip link targeting an existing `main`, one `h1`, unique IDs, valid `aria-labelledby` / `aria-describedby` references, accessible names for navigation controls, localized hidden new-tab text, and a logical source order. Assert freshness state is expressed as text, not dot/color alone.

- [ ] **Step 2: Run focused static tests and record the exact failures.**

Run: `npm run test:navigation && npm run validate:site`

Expected: failures identify any missing memory/Now labels or unresolved references.

- [ ] **Step 3: Apply the smallest semantic and CSS fixes.**

Requirements:

- `44 × 44 CSS px` minimum touch targets at widths `<= 900px`;
- no fixed-width card/table content wider than the viewport;
- table wrapper scroll is contained and labelled where unavoidable;
- meaningful reading order at 200% zoom;
- visible focus on every link/button;
- motion disabled for portrait transitions, freshness dots, smooth scrolling, nav panel, and backdrop when reduced motion is requested;
- decorative arrows/dots remain hidden while their meaning exists in text.

- [ ] **Step 4: Run browser QA at the defined viewport matrix.**

Start with `npm run dev`, then inspect these routes in English and Turkish:

```text
/
/now/
/memory/
/now/archive/2026-W34/
```

At `390×844`, `768×1024`, `1280×720`, and `1440×1000`, verify no horizontal page overflow, menu reachability, correct card/table wrapping, complete content, and no clipped focus rings. At desktop 200% zoom, repeat menu and reading-order checks. With reduced motion enabled, confirm transitions/pulses stop.

- [ ] **Step 5: Run keyboard and screen-reader-oriented checks.**

For each page type: Tab from skip link through header and content; open menu with keyboard; close with Escape; confirm focus restoration; activate language switch; verify the private and horizon group labels are announced; verify external links communicate new-tab behavior.

- [ ] **Step 6: Inspect console and network behavior.**

Confirm no console errors, 404s, mixed content, duplicate resource requests caused by generation, or runtime requests to NXT/Drive/API endpoints. Opening an explicitly selected NXT snapshot is the only permitted cross-site memory request.

- [ ] **Step 7: Stop the preview safely and verify cleanup.**

Run: `npm run stop`

Expected: the checkout-owned preview terminates and the configured port has no listener owned by this checkout. Do not stop unrelated processes.

### Task 10: Run the complete local acceptance gate

**Files:**

- Modify only if a failing acceptance check reveals an in-scope defect.

- [ ] **Step 1: Rebuild generated output from validated data.**

Run: `npm run generate:site && npm run check:generated`

Expected: generator makes no second-pass changes and check mode passes.

- [ ] **Step 2: Run every automated suite, including the server suite omitted from the historic aggregate command.**

Run:

```bash
npm test
npm run test:server
```

Expected: all data, render, archive, navigation, JavaScript, deployment, environment, portrait, preview-stop, site-validation, and server tests pass.

- [ ] **Step 3: Run source-integrity checks.**

Run:

```bash
git diff --check
rg -n "today|bugün|driveFileId|oauthToken|accessToken|refreshToken|privateNoteId" --glob '*.html' --glob '*.json' .
git status --short --branch
```

Expected: no whitespace errors; no relative-freshness or private-data leakage in public artifacts; status lists only the intended living-system work. If another pre-existing user change is present, preserve and report it rather than modifying it.

- [ ] **Step 4: Repeat representative browser acceptance after the final generation.**

Validate home, Now, memory, and one archive route in EN/TR at mobile and desktop sizes. Confirm canonical/hreflang metadata, navigation state, dates, freshness labels, derived counts, empty public-memory copy, applications, archive links, focus behavior, no console errors, and no horizontal overflow.

- [ ] **Step 5: Stop all task-owned local processes and record the local-only handoff.**

Run: `npm run stop && git status --short --branch`

Report literal boundaries:

```text
commit=none
push=none
deploy=none
azure=unchanged
dns=unchanged
```

### Task 11: Gate and specify private AI recall inside NXT

**Files:**

- Verify existing NXT plan: `/Users/aserdargun/Documents/ChatGPT/nxt-aserdargun-com/docs/superpowers/plans/2026-08-23-nxt-markdown-vault.md`
- Create only after the gate passes: `/Users/aserdargun/Documents/ChatGPT/nxt-aserdargun-com/docs/superpowers/specs/2026-08-28-private-ai-recall-design.md`
- Create only after that design is approved: `/Users/aserdargun/Documents/ChatGPT/nxt-aserdargun-com/docs/superpowers/plans/2026-08-28-private-ai-recall.md`

- [ ] **Step 1: Verify the base NXT gate instead of assuming it exists.**

The current checked-out NXT repository contains specifications/plans but no application source. Complete and verify its existing base plan first. The AI-recall design may begin only when all of these are evidenced locally:

- exact GitHub-owner authentication protects every private operation;
- Google Drive is canonical and recoverable IndexedDB drafts behave as designed;
- Markdown editing, search/indexing, conflict handling, and Drive-version tracking pass;
- immutable public snapshots are sanitized, unguessable, explicitly confirmed, and revocable;
- private note IDs/content never enter public manifests or logs;
- security and publication tests pass on desktop and mobile.

- [ ] **Step 2: Design recall as a private cited-retrieval subsystem, not a chat widget.**

The separate design must define:

- retrieval units: note ID, heading path, paragraph/chunk, Drive version, modified date;
- filters: date range, tag, application code, person, memory type, and status;
- response contract: answer, cited excerpts/locations, uncertainty, and model-generated suggestion label;
- indexing lifecycle: initial index, incremental Drive change, deletion, revocation, and reindex;
- threat model: prompt injection in notes, cross-user access, token leakage, stale embeddings, malicious snapshot content, and log privacy;
- explicit publish boundary: recall results never become public memory until a new immutable NXT snapshot is reviewed and its public record is manually added to this site's allowlist.

- [ ] **Step 3: Require evidence-backed recall behavior.**

The implementation plan must begin with failing tests for:

- exact-owner rejection;
- an answer with note/section/Drive-version citations;
- refusal to present uncited recall as fact;
- stale-index detection after note change/deletion;
- private/public corpus separation;
- prompt-injection containment;
- zero automatic publication side effects.

- [ ] **Step 4: Keep the main site decoupled.**

No Task 11 implementation may add an NXT API call, model key, vector store, or private query UI to `aserdargun.com`. The main site consumes only the explicit, static public manifest designed in Tasks 1–8.

- [ ] **Step 5: Obtain a separate design approval before implementation.**

Present the NXT AI-recall design, privacy model, estimated operational cost, data-retention behavior, and model/provider choice to Serdar. Implementation starts only after explicit approval; deployment and publication remain separately authorized actions.

### Task 12: Release only after explicit authorization

**Files:**

- No release file is changed by this planning task.

- [ ] **Step 1: Re-run the complete Task 10 gate immediately before release.**

Do not rely on older results. Capture the current commit, branch, diff, test output, generated drift result, browser evidence, and stopped-process state.

- [ ] **Step 2: Present the exact release scope and ask for action-time authorization.**

State which repository, branch, files, commit target, GitHub remote, Azure Static Web App, and domain would be affected. Do not commit, push, deploy, or modify a domain before authorization.

- [ ] **Step 3: If authorized, use the established repository release workflow.**

Keep custom-domain work outside this plan unless the user explicitly includes it. Do not create new Azure resources or change DNS for these static route additions.

- [ ] **Step 4: Correlate the release rather than stopping at a green workflow.**

Verify the exact GitHub commit, Actions run, Azure deployment readiness, representative HTTP status/MIME/headers, root/TR/Now/memory/archive routes, canonical/hreflang metadata, browser desktop/mobile behavior, console state, and the absence of private-data/runtime-NXT requests.

- [ ] **Step 5: Report literal final state and any remaining gated work.**

Report commit, push, deployment, Azure, DNS, HTTPS/browser verification, and whether the separate NXT base/AI-recall gates remain pending. A successful public-site release must never be described as completion of the private AI-memory subsystem.
