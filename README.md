# AI Learning System

A bilingual public learning system by Serdar Gündoğdu. English starts at `/`
and Turkish at `/tr/`; the retired `/en/` duplicate permanently redirects to `/`.

The homepage opens with **Five layers. One learning loop.** It connects the
foundation, agent system, assurance, deployment, and physical AI layers to the
existing interactive SVG. Its geometry, orthogonal routing, desktop links,
accessible mobile alternatives, and learning-loop video are preserved.

- `/about/` and `/tr/about/` contain the personal introduction, interactive
  ASCII/pixel portraits, eight-stage career journey, working principles,
  credentials, and future direction.
- `/journey/` and `/tr/journey/` contain the learning path, six detailed learning stages, and the physical AI horizon and colony labs.
- `/applications/` and `/tr/applications/` contain the complete application map,
  localized search, layer filters, and expandable evidence and knowledge links.
- `/now/` and `/tr/now/` retain dated current work; the historical snapshots keep
  their original article content and dates.
- `/memory/` and `/tr/memory/` contain authored public research and decisions.
- `/llms.txt` guides agents to the public pages and `portfolio.json`; structured
  website and person metadata connects the learning system to its author.

Older homepage links to `#journey`, career stages, `#about`, `#approach`, and
`#apps` continue to the corresponding new page. Language switches retain the
current page. Existing application names remain their canonical product names;
**AI Learning System** is the root site's identity.

## Extending the learning system

Add public applications and reciprocal relationships in `data/living-system.json`.
The generator builds the Five Layers cards, application rows, search metadata,
and `portfolio.json` from that source. Every new application must declare its
layer and keep research, verification, and release dates separate.

The SVG topology remains in the bilingual homepage files; the detailed learning
path lives in the Journey pages. When adding a node, update both diagrams, their descriptions, and the
mobile learning targets together; preserve the orthogonal paths and keyboard
access. `tools/portfolio-phase-one.test.mjs` checks diagram membership against
canonical data and the dedicated application map. The navigation tests check
edge routing, touch alternatives, and accessible names, so adding data without
updating the diagram fails validation.

## Development

Install the project metadata from the lockfile, then start the dependency-free
local preview server:

```bash
npm ci
npm run dev
```

Open http://127.0.0.1:4173. The host and port can be overridden with `HOST` and
`PORT` environment variables.

Stop the managed preview from another terminal with:

```bash
npm run stop
```

The Codex environment exposes matching `Run`, `Stop`, and `Validate` actions.
`Stop` affects only the preview registered for the current worktree and is a
successful no-op when no managed preview is running.

## Validation

Run the complete validation gate:

```bash
npm test
```

For focused troubleshooting, run an individual check:

```bash
npm run check:js
npm run test:deployment
npm run test:environment
npm run test:portrait
npm run test:server
npm run test:stop
npm run validate:site
```

`tools/validate-site.mjs` also encodes the list of retired project URLs
(Stackfolio, PIPolars, PIWebAPI, SWAPP, SCADA Nerve, Industry-Learn,
Scikit-Play, Aeon-Play, PyTorch-Play, DSML101). Those projects were removed
from this site deliberately; the validator fails if any of them reappear.

## Portfolio federation

`data/living-system.json` is the canonical, human-reviewed public source for
application identities, relationships, research cutoffs, verification dates,
and release evidence. `tools/portfolio-registry.mjs` projects that allowlisted
data into the machine-readable `portfolio.json` registry; the application map
uses the same projection when generating the bilingual portal.

Generate both the registry and the public pages:

```bash
npm run generate:site
```

Check that committed generated output has not drifted:

```bash
npm run check:generated
```

The per-application public manifest contract is documented as JSON Schema in
`schemas/aserdargun-app.schema.json`. Private NXT records are never inferred or
copied into the registry or Knowledge pages; only explicitly authored public
records in the canonical source are renderable.

## Assets

- **Fonts:** self-hosted Inter variable subsets in `fonts/` (latin +
  latin-ext, preloaded) — no third-party font requests.
- **Portraits:** WebP primaries with palette-quantized PNG fallbacks
  (640×800, ≤250 KB) in `images/career/`.
- **Open Graph:** 1200×630 JPEG (≤400 KB) at `images/og-ascii.jpg` and
  `images/og-ascii-tr.jpg`.
