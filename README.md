# Personal Profile Page

Bilingual personal portfolio for Serdar Gündoğdu. The English homepage is served
directly at `/`, the Turkish edition lives at `/tr/`, and the retired `/en/`
duplicate permanently redirects to `/`.

The opening experience combines an interactive ASCII/pixel portrait engine with a
reverse-chronological eight-stage career timeline spanning mechanical engineering,
manufacturing leadership, data science, full-stack AI, and AI engineering,
followed by a five-layer system overview and a learning-system map that connect parallel compute/model
foundations to the LLM runtime, the Harness Engineering Observatory (`hns`),
and a context/security/evaluation quality loop (`ctx` / `sec` / `evl`). Local
and cloud deployment decisions (`lcl` / `cld`) then open into parallel World
Models (`wfm`) and Swarm Intelligence (`swi`) bridges. Both converge
in the industrial-twin lab before the long-term open-humanoid horizon. SWI links point to
`https://swi.aserdargun.com/` as requested by the owner; activating these links
does not assert verified DNS, deployment, or release identity.
The desktop diagram uses box-free orthogonal routing; mobile keeps the same core
sequence through full-width accessible links.

The application map contains 14 applications from the canonical source, with
localized search, layer filters, and expandable evidence and knowledge links.
Unverified applications explicitly show a pending state without invented release
dates. The Knowledge page offers a topic index for the five authored public notes.
Now and its historical snapshots retain their dated content. The previous
Frontend Foundations exercises and unused assets have been removed; their retired
routes and links are rejected by the public-site validation gate.

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
