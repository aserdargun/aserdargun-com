import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  renderApplicationMap,
  renderSystemFocus,
} from "./render-living-system.mjs";
import { renderLearningDiagram, learningDiagramLayout } from "./learning-diagram.mjs";
import { applicationHierarchy } from "./application-hierarchy.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const today = new Date("2026-09-21T12:00:00Z");

async function readData() {
  return JSON.parse(await readFile(path.join(rootDir, "data", "living-system.json"), "utf8"));
}

test("POL is one public canonical record parented under gpu with truthful metadata", async () => {
  const data = await readData();
  const polRecords = data.applications.filter((app) => app.code === "pol");
  assert.equal(polRecords.length, 1, "exactly one POL canonical entry must exist");
  const pol = polRecords[0];
  assert.equal(pol.parentApp, "gpu", "POL must be parented under gpu");
  assert.equal(pol.kind, "tool", "POL must remain a tool, not a private system");
  assert.equal(pol.systemRole, "core-learning", "POL must declare core-learning system role");
  assert.equal(pol.portfolioLayer, "foundation", "POL must belong to the foundation layer");
  assert.deepEqual(pol.languages, ["en"], "POL must remain English-only");
  assert.equal(pol.visibility, "public");
  assert.equal(pol.repository, "https://github.com/aserdargun/pol-aserdargun-com");
  assert.equal(pol.address, "https://pol.aserdargun.com/");
  assert.equal(pol.lastVerified, undefined, "POL must not invent a verification date");
  assert.equal(pol.lastReleased, undefined, "POL must not invent a release date");
  assert.equal(pol.releaseSha, undefined, "POL must not invent a release SHA");
  assert.equal(pol.researchCutoff, undefined, "POL must not invent a research cutoff");
});

test("POL localized titles and summaries describe English-only scope honestly", async () => {
  const data = await readData();
  const pol = data.applications.find((app) => app.code === "pol");
  assert.ok(pol.title.en.length > 0 && pol.title.tr.length > 0, "POL title must be localized");
  assert.ok(pol.summary.en.length > 0 && pol.summary.tr.length > 0, "POL summary must be localized");
  assert.match(pol.title.en, /POL/i, "POL English title must include the code");
  assert.match(pol.summary.en, /English[- ]only|English only/i, "POL English summary must mention English-only scope");
  assert.match(pol.summary.en, /not limited to GPU/i, "POL English summary must clarify it is not limited to GPU");
  assert.match(pol.summary.tr, /İngilizce/i, "POL Turkish summary must mention İngilizce");
  assert.match(pol.summary.tr, /GPU ile sınırlı değil/i, "POL Turkish summary must clarify 'GPU ile sınırlı değil'");
  for (const forbidden of ["verified", "synthetic GPU lab", "verified by execution"]) {
    assert.equal(pol.summary.en.includes(forbidden), false, `English summary must not claim: ${forbidden}`);
    assert.equal(pol.summary.tr.includes(forbidden), false, `Turkish summary must not claim: ${forbidden}`);
  }
});

test("POL sits inside the gpu family with correct upstream, downstream, and sibling wiring", async () => {
  const data = await readData();
  const pol = data.applications.find((app) => app.code === "pol");
  const gpu = data.applications.find((app) => app.code === "gpu");
  const gex = data.applications.find((app) => app.code === "gex");
  const aia = data.applications.find((app) => app.code === "aia");
  assert.ok(gpu && gex && aia, "gpu, gex, and aia canonical records must exist");

  assert.ok(pol.upstreamApps.includes("gpu"), "POL upstream must include gpu");
  assert.ok(pol.downstreamApps.includes("pol") === false, "POL must not list itself as downstream");
  assert.ok(gpu.downstreamApps.includes("pol"), "GPU downstream must include pol");
  assert.ok(gpu.downstreamApps.includes("gex"), "GPU downstream must include gex");
  assert.equal(gpu.downstreamApps.includes("pol") && gpu.downstreamApps.includes("gex"), true);

  assert.equal(gex.parentApp, "gpu", "GEX must be parented under gpu");
  assert.equal(aia.downstreamApps.includes("pol"), false, "AIA downstream must NOT include pol");
  assert.equal(aia.upstreamApps.includes("pol"), false, "AIA upstream must NOT include pol");
});

test("POL learning diagram node is wired under gpu with learning-tool role alongside gex practice-lab", async () => {
  const data = await readData();
  const layout = learningDiagramLayout(data.applications);
  const pol = layout.nodes.find((node) => node.app.code === "pol");
  const gex = layout.nodes.find((node) => node.app.code === "gex");
  const gpu = layout.nodes.find((node) => node.app.code === "gpu");
  assert.ok(pol && gex && gpu, "pol, gex, and gpu nodes must all be rendered");
  assert.equal(pol.app.parentApp, "gpu", "pol node must report gpu as parentApp");
  assert.equal(pol.role, "learning-tool", "pol node role must be learning-tool");
  assert.notEqual(pol.role, "practice-lab", "pol must not wear the practice-lab role");
  assert.notEqual(pol.role, "map", "pol must not wear the map role reserved for AIA");
  assert.equal(gex.role, "practice-lab", "gex sibling must wear the practice-lab role");

  const edgeIds = layout.edges.map((edge) => edge.id);
  assert.ok(layout.families.some(({ code }) => code === "gpu"), "shared GPU frame expresses ownership of POL and GEX in the approved layout");
  assert.equal(edgeIds.includes("aia-to-pol"), false, "aia-to-pol edge must be absent");

  const gpuFamilyCodes = new Set(layout.nodes.filter((n) => n.app.parentApp === "gpu").map((n) => n.app.code));
  assert.ok(gpuFamilyCodes.has("pol") && gpuFamilyCodes.has("gex"), "both siblings must sit inside the gpu family");
  const gpuFamily = layout.families.find((f) => f.code === "gpu");
  assert.ok(gpuFamily, "gpu family bounding rect must exist");
  const inside = (rect, parent) =>
    rect.x >= parent.x &&
    rect.y >= parent.y &&
    rect.x + rect.width <= parent.x + parent.width &&
    rect.y + rect.height <= parent.y + parent.height;
  assert.ok(inside(pol, gpuFamily), "pol node must sit strictly inside the gpu family bounds");
  assert.ok(inside(gex, gpuFamily), "gex node must sit strictly inside the gpu family bounds");
  const disjoint = (a, b) =>
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y;
  assert.ok(disjoint(pol, gex), "pol and gex sibling rectangles must not overlap");
});

test("Every locale rendering exposes the gpu→pol wiring across diagram, focus, and application map", async () => {
  const data = await readData();
  for (const locale of ["en", "tr"]) {
    const diagramHtml = renderLearningDiagram({ locale, data });
    assert.match(diagramHtml, /data-learning-app="pol"/, `${locale}: diagram must include pol node`);
    const polDiagramTag = diagramHtml.match(/<a\b[^>]*data-learning-app="pol"[^>]*>/)?.[0] ?? "";
    assert.ok(polDiagramTag.length > 0, `${locale}: must extract exact pol opening tag`);
    assert.match(polDiagramTag, /data-learning-parent="gpu"/, `${locale}: pol tag must declare parent gpu`);
    assert.match(polDiagramTag, /role="learning-tool"/, `${locale}: pol tag must declare learning-tool role`);

    const focusHtml = renderSystemFocus({ locale, data });
    const polFocusTag = focusHtml.match(/<li\b[^>]*data-focus-app="pol"[^>]*>/)?.[0] ?? "";
    assert.ok(polFocusTag.length > 0, `${locale}: must extract exact pol focus tag`);
    assert.match(polFocusTag, /data-app-parent="gpu"/, `${locale}: pol focus tag must declare gpu parent`);

    const mapHtml = renderApplicationMap({ locale, data, today });
    const polRow = mapHtml.match(/<tr[^>]*data-app-code="pol"[^>]*>[\s\S]*?<\/tr>/)?.[0] ?? "";
    assert.ok(polRow.length > 0, `${locale}: application map must include a POL row`);
    assert.match(polRow, /data-app-depth="1"/, `${locale}: POL row must sit at depth 1`);
    assert.match(polRow, /data-app-parent="gpu"/, `${locale}: POL row must declare gpu parent`);
    assert.match(polRow, /pol-aserdargun-com/);
    assert.match(polRow, /pol\.aserdargun\.com/);
    assert.match(polRow, /<code>pol<\/code>/);
  }
});

test("applicationHierarchy reports pol and gex at depth 1 under gpu", async () => {
  const data = await readData();
  const hierarchy = applicationHierarchy(data.applications);
  const polEntry = hierarchy.find(({ application }) => application.code === "pol");
  const gexEntry = hierarchy.find(({ application }) => application.code === "gex");
  assert.ok(polEntry && gexEntry, "pol and gex must appear in the hierarchy");
  assert.equal(polEntry.depth, 1, "pol must sit at depth 1 under gpu");
  assert.equal(gexEntry.depth, 1, "gex must sit at depth 1 under gpu");
  assert.equal(polEntry.application.parentApp, "gpu");
  assert.equal(gexEntry.application.parentApp, "gpu");
});
