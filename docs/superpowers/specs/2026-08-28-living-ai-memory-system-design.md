# Living AI Memory System — Design

**Date:** 2026-08-28
**Status:** Proposed implementation baseline
**Scope:** Turn `aserdargun.com` into the public, curated read surface of a
private-first personal AI memory system while preserving the existing career,
learning-system, application-map, bilingual, and static-site contracts.

## 1. North star

`aserdargun.com` is one living system:

- **Past** explains what shaped Serdar and why current decisions make sense.
- **Now** records current attention, active work, and open questions.
- **Future** names long-term horizons, hypotheses, and the direction of travel.
- **Knowledge** publishes explicitly approved, source-linked memory snapshots.
- **Applications** show what the accumulated knowledge has become in practice.

The homepage is not the private vault and does not become a general-purpose
editor. It is the public, bilingual projection of explicitly public information.

## 2. Audience model

### Public reader

A public reader should be able to answer:

1. Who is Serdar and how did this path develop?
2. What is he working on now, and how recently was it updated?
3. What long-term goals connect the current projects?
4. Which applications, laboratories, and publications can I use?
5. Which public notes explain the decisions and learning behind those outputs?

### Owner

The owner needs a separate private system for capture, editing, recall, and
publication approval. The owner may reach `stk`, `inf`, and `nxt` from the
public site's private-systems area, but those tools do not share their private
data with the public homepage.

## 3. System boundaries

### `aserdargun.com`

- Public, static-first, dependency-free delivery.
- Curated read model only.
- No Google Drive credentials, private note identifiers, OAuth tokens, owner
  transcripts, private prompts, unpublished metadata, or server-side AI calls.
- Public memory entries are an explicit allowlist committed to this repository.
- Every displayed freshness statement is derived from a machine-readable date.

### NXT Markdown Vault

- Private-first source/capture system.
- Existing approved NXT specification and implementation plan remain
  authoritative for Drive storage, exact-owner authentication, immutable
  snapshots, sanitization, revocation, and public-note behavior.
- NXT currently has specifications and a plan, but no application source in the
  checked-out repository. The main site must not assume an NXT API is available.
- A future NXT AI-recall feature requires a separate NXT design and
  implementation plan after the base vault, publishing, and security work is
  complete.

### Applications

- Applications are outputs of the knowledge system, not merely portfolio rows.
- Each application declares kind, visibility, status, updated date, repository,
  address, guiding question, related knowledge, and next direction.
- Private applications may be named publicly, but their private routes and data
  remain protected by their own exact-owner boundary.

## 4. Information architecture

The public primary navigation becomes:

1. `Journey` / `Yolculuk`
2. `Now` / `Şimdi`
3. `Horizon` / `Ufuk`
4. `Applications` / `Uygulamalar`
5. `Knowledge` / `Bilgi`
6. `About` / `Hakkımda`

`Learning` remains a homepage section and a visible secondary link inside the
Applications/Knowledge story, but it does not compete with the six primary
memory concepts at the same hierarchy level.

`stk`, `inf`, and `nxt` move into a semantically labelled `Private systems` /
`Özel sistemler` group. The group label must be exposed to assistive technology.

The homepage adds a compact `living-system` section immediately after the hero
and before the detailed career journey:

```text
Past          Now          Future        Knowledge       Applications
Journey   →   Active   →   Horizon   →   Published   →   Working outputs
```

Every item is a normal link, has localized supporting copy, and remains useful
without JavaScript.

## 5. Canonical public data

Create `data/living-system.json` as the canonical public metadata source.

Top-level shape:

```json
{
  "schemaVersion": 1,
  "contentPolicyVersion": 1,
  "generatedCopyVersion": 1,
  "applications": [],
  "now": {},
  "publicMemory": [],
  "journeyEvidence": []
}
```

### Application record

```json
{
  "code": "itl",
  "kind": "lab",
  "visibility": "public",
  "status": "live",
  "title": { "en": "Industrial Twin Lab", "tr": "Industrial Twin Lab" },
  "summary": { "en": "...", "tr": "..." },
  "guidingQuestion": { "en": "...", "tr": "..." },
  "repository": "https://github.com/aserdargun/itl-aserdargun-com",
  "address": "https://itl.aserdargun.com/",
  "updatedAt": "2026-08-25",
  "relatedMemoryIds": [],
  "nextDirection": { "en": "...", "tr": "..." }
}
```

Allowed values:

- `kind`: `atlas`, `tool`, `lab`, `horizon`, `private-system`
- `visibility`: `public`, `unlisted`, `owner-only`
- `status`: `idea`, `design`, `active`, `live`, `paused`, `archived`

`updatedAt` is required for `active` and `live` records. It may be `null` for
`idea`, `design`, `paused`, and `archived` records when no verified public date
exists. `guidingQuestion` and `nextDirection` are rendered only after their
exact English and Turkish wording is owner-reviewed; until then they may be
omitted without an empty UI label.

The map summary is computed from records. It must say `five core learning
applications, one lab, and one long-term horizon` / `beş çekirdek öğrenme
uygulaması, bir laboratuvar ve bir uzun vadeli ufuk` for the current data.

### Now record

```json
{
  "updatedAt": "2026-08-21",
  "week": "2026-W34",
  "items": [
    {
      "id": "week",
      "timeframe": "week",
      "title": { "en": "...", "tr": "..." },
      "summary": { "en": "...", "tr": "..." },
      "tags": []
    }
  ]
}
```

Allowed `timeframe` values are `week`, `month`, and `long-term`, exactly once
each. The visible page always shows the absolute update date. JavaScript may add
a relative label, but never replaces or contradicts the absolute date.

Freshness states are computed from calendar-day age:

- `0–7`: `current`
- `8–14`: `aging`
- `15+`: `needs-refresh`

### Public memory record

```json
{
  "id": "stable-kebab-case-id",
  "type": "decision",
  "visibility": "public",
  "title": { "en": "...", "tr": "..." },
  "summary": { "en": "...", "tr": "..." },
  "publishedAt": "2026-08-28",
  "updatedAt": "2026-08-28",
  "sourceUrl": "https://nxt.aserdargun.com/p/unguessable-public-id",
  "sourceLabel": "NXT snapshot",
  "relatedApplicationCodes": ["aia"],
  "tags": ["decision"],
  "evidenceUrls": []
}
```

Allowed `type` values are `event`, `decision`, `learning`, `plan`, `project`,
and `publication`. Only `visibility: public` records may be rendered. The site
does not crawl NXT, enumerate NXT public URLs, or infer entries from private
metadata. A record enters this manifest only after explicit owner approval.

Contributor workflow: edit the canonical data, run focused validation, generate
the site, run the generated-drift check, and complete browser review. The
`contentPolicyVersion: 1` boundary remains enforced, and owner approval is
required before any public record or relationship enters canonical data.

### Journey evidence record

```json
{
  "stage": "08",
  "period": null,
  "decision": { "en": "...", "tr": "..." },
  "evidenceUrls": [],
  "relatedApplicationCodes": []
}
```

Unknown periods remain `null`; the UI must not invent dates. A journey evidence
record is rendered only when at least one verified decision, evidence URL, or
application relationship exists.

## 6. Deterministic generation

The repository remains static. `tools/render-living-system.mjs` reads the JSON
and replaces only explicitly marked generated blocks:

- `living-system`
- `primary-navigation`
- `application-map`
- `now-content`
- `public-memory`
- `journey-evidence`

Marker shape:

```html
<!-- GENERATED:application-map:start -->
...
<!-- GENERATED:application-map:end -->
```

`npm run generate:site` rewrites generated blocks. `npm run check:generated`
renders in memory and fails when committed HTML is stale. Validation runs the
check mode and never silently rewrites the worktree.

## 7. Routes

Existing:

- `/` — English homepage
- `/tr/` — Turkish homepage
- `/now/` — English current focus
- `/tr/now/` — Turkish current focus

New:

- `/memory/` — curated English public memory index
- `/tr/memory/` — curated Turkish public memory index
- `/now/archive/<YYYY-Www>/` — immutable English weekly archive
- `/tr/now/archive/<YYYY-Www>/` — immutable Turkish weekly archive

The public memory index is listed in the sitemap. Individual unlisted NXT
snapshot URLs are not copied into the sitemap.

## 8. Now archive policy

Before replacing current `now` data with a new week, run:

```bash
npm run archive:now -- --week 2026-W35
```

The command:

1. Verifies the requested week equals the current data week.
2. Refuses an existing destination.
3. Creates localized immutable archive pages from current data.
4. Adds localized archive links to current `/now/` pages.
5. Updates sitemap entries with absolute `lastmod` dates.
6. Does not change the current `now.updatedAt` or content; that is a separate,
   reviewable edit to `data/living-system.json`.

## 9. Accessibility and responsive requirements

- Root and `/now/` use the same header/panel/backdrop structure.
- One menu button controls one panel per document with unique IDs.
- Escape closes the panel and restores focus.
- Group labels are not `aria-hidden`; use nested labelled navigation or headings.
- Every external new-tab link includes accessible `opens in a new tab` /
  `yeni sekmede açılır` text, visually hidden when appropriate.
- Touch targets are at least `44 × 44 CSS px` at widths at or below `900px`.
- No horizontal overflow at `390 × 844`, `768 × 1024`, `1280 × 720`, and
  `1440 × 1000`.
- `200%` browser zoom preserves reading order and access to every control.
- Reduced motion disables portrait transitions, pulsing freshness dots, and
  nonessential scrolling animation.
- Do not claim WCAG compliance without automated and manual evidence.

## 10. AI boundary

This phase does not add a public chatbot or a server-side AI endpoint to
`aserdargun.com`.

A later NXT AI-recall subproject may:

- answer owner questions over private notes;
- cite exact note IDs, sections, and Drive versions;
- distinguish model suggestions from owner-approved memory;
- support time, tag, application, person, and status filters;
- refuse uncited recall as authoritative memory;
- require exact-owner authentication for every private query;
- publish nothing without the existing explicit snapshot confirmation.

That subproject must not begin until the base NXT vault, indexing, publication,
revocation, and security tests pass.

## 11. Delivery boundaries

- Preserve the existing visual language, career portraits, learning diagram,
  root/TR parity, dependency-free site, Azure SWA structure, and three-letter
  application naming.
- Do not add a frontend framework or external runtime dependency.
- Do not expose private-system data or automate publication approval.
- Do not commit, push, deploy, mutate Azure, or change DNS without separate
  explicit authorization.
- Local completion requires generation checks, all existing tests,
  `npm run test:server`, desktop/mobile browser checks, console checks, server
  shutdown, and a clean-or-explained Git status.

## 12. Success criteria

- A first-time reader can identify Past, Now, Future, Knowledge, and
  Applications from the top of the homepage.
- Application counts, categories, and freshness labels are derived from data
  and cannot contradict the table.
- `/now/` is a primary destination, exposes absolute freshness, and has a
  stable weekly archive.
- `/now/` and the homepage share one responsive, keyboard-operable header.
- The public memory index renders only explicitly allowlisted records.
- The site contains no private NXT data and does not depend on a live NXT API.
- Tests fail on stale generated HTML, invalid dates, invalid visibility,
  duplicate IDs/codes, broken locale parity, unsafe source URLs, and missing
  responsive navigation structure.
