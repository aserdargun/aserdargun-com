import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applicationHierarchy, applicationParents } from "./application-hierarchy.mjs";
import { learningDiagramLayout, renderLearningDiagram } from "./learning-diagram.mjs";
import { validateLivingSystemData } from "./living-system-data.mjs";
import { renderApplicationMap, renderSystemFocus } from "./render-living-system.mjs";

const data = JSON.parse(await readFile(new URL("../data/living-system.json", import.meta.url), "utf8"));
const today = new Date("2026-09-10T12:00:00Z");

test("new parents, children and grandchildren group by ownership regardless of input order or kind", () => {
  const apps = [
    { code: "kid", parentApp: "new", kind: "atlas" },
    { code: "peer", kind: "lab", upstreamApps: ["new"] },
    { code: "sub", parentApp: "kid" },
    { code: "new", parentApp: null },
  ];
  assert.deepEqual(applicationHierarchy(apps).map(({ application, depth }) => [application.code, depth]), [
    ["peer", 0], ["new", 0], ["kid", 1], ["sub", 2],
  ]);
});

test("new sub-applications automatically get localized ownership and adjacent rows in both views", () => {
  const extended = structuredClone(data);
  extended.applications.unshift({ ...structuredClone(data.applications.find((app) => app.code === "gex")), code: "xyz", parentApp: "gpu", kind: "atlas", address: "https://xyz.aserdargun.com/", repository: "https://github.com/aserdargun/xyz-aserdargun-com" });
  for (const locale of ["en", "tr"]) {
    const grid = renderSystemFocus({ locale, data: extended });
    assert.match(grid, /data-focus-app="gpu"[\s\S]*class="system-focus-children"[\s\S]*data-focus-app="xyz" data-app-parent="gpu"/);
    const map = renderApplicationMap({ locale, data: extended, today });
    assert.match(map, /data-app-code="xyz"[^>]*data-app-depth="1"[^>]*data-app-parent="gpu"/);
    const rowOrder = [...map.matchAll(/data-app-code="([a-z]+)"/g)].map((match) => match[1]);
    assert.equal(rowOrder[rowOrder.indexOf("gpu") + 1], "xyz");
    assert.ok(map.includes(locale === "tr" ? "GPU alt uygulaması" : "Sub-application of GPU"));
  }
});

test("ownership rejects missing parents, self-parenting, cycles and inconsistent layers", () => {
  for (const [mutate, expected] of [
    [(apps) => { apps.find((app) => app.code === "gex").parentApp = "zzz"; }, "relationship-unresolved"],
    [(apps) => { apps.find((app) => app.code === "gex").parentApp = "gex"; }, "hierarchy-cycle"],
    [(apps) => { apps.find((app) => app.code === "gpu").parentApp = "gex"; }, "hierarchy-cycle"],
    [(apps) => { apps.find((app) => app.code === "gex").portfolioLayer = "physical-ai"; }, "hierarchy-layer"],
    [(apps) => { apps.find((app) => app.code === "gpu").downstreamApps = ["llm"]; }, "hierarchy-relationship"],
  ]) {
    const changed = structuredClone(data);
    mutate(changed.applications);
    const result = validateLivingSystemData(changed, { today });
    assert.ok(result.errors.some((error) => error.code === expected), JSON.stringify(result.errors));
  }
});

function segments(path) {
  let current;
  const result = [];
  for (const [, command, first, second] of path.matchAll(/([MHV])\s*([\d.]+)(?:\s+([\d.]+))?/g)) {
    if (command === "M") {
      current = { x: +first, y: +second };
      continue;
    }
    const next = command === "H" ? { x: +first, y: current.y } : { x: current.x, y: +first };
    if (current.x !== next.x || current.y !== next.y) result.push([current, next]);
    current = next;
  }
  return result;
}

const overlap = (a, b, c, d) => Math.min(Math.max(a, b), Math.max(c, d)) > Math.max(Math.min(a, b), Math.min(c, d));
const inside = (value, a, b) => value > Math.min(a, b) && value < Math.max(a, b);

test("all diagram boxes are disjoint, children are smaller and enclosed with their parent", () => {
  const { nodes, families } = learningDiagramLayout(data.applications);
  for (const [i, node] of nodes.entries()) {
    for (const other of nodes.slice(i + 1)) {
      assert.ok(!(overlap(node.x, node.x + node.width, other.x, other.x + other.width) && overlap(node.y, node.y + node.height, other.y, other.y + other.height)), `${node.app.code} overlaps ${other.app.code}`);
    }
    if (node.app.parentApp) {
      const parent = nodes.find((item) => item.app.code === node.app.parentApp);
      const family = families.find((item) => item.code === node.app.parentApp);
      assert.ok(node.width < parent.width && node.height < parent.height);
      for (const member of [node, parent]) {
        assert.ok(member.x > family.x && member.x + member.width < family.x + family.width && member.y > family.y && member.y + member.height < family.y + family.height);
      }
    }
  }
});

test("every arrow and connector avoids box interiors and other routes; shared bus joins are explicit", () => {
  const { nodes, edges } = learningDiagramLayout(data.applications);
  const paths = edges;
  const lines = paths.flatMap((edge) => segments(edge.path).map(([a, b]) => ({ id: edge.id, a, b })));
  for (const [index, { id, a, b }] of lines.entries()) {
    for (const node of nodes) {
      const crosses = a.x === b.x
        ? inside(a.x, node.x, node.x + node.width) && overlap(a.y, b.y, node.y, node.y + node.height)
        : inside(a.y, node.y, node.y + node.height) && overlap(a.x, b.x, node.x, node.x + node.width);
      assert.ok(!crosses, `${id} crosses ${node.app.code}`);
    }
    for (const other of lines.slice(index + 1)) {
      if (id === other.id) continue;
      const { a: c, b: d } = other;
      if ((a.x === b.x) === (c.x === d.x)) {
        const coincides = a.x === b.x ? a.x === c.x && overlap(a.y, b.y, c.y, d.y) : a.y === c.y && overlap(a.x, b.x, c.x, d.x);
        assert.ok(!coincides, `${id} overlaps ${other.id}`);
      } else {
        const [v1, v2, h1, h2] = a.x === b.x ? [a, b, c, d] : [c, d, a, b];
        const touches = v1.x >= Math.min(h1.x, h2.x) && v1.x <= Math.max(h1.x, h2.x)
          && h1.y >= Math.min(v1.y, v2.y) && h1.y <= Math.max(v1.y, v2.y);
        const junction = v1.x === 550 && [956, 850].includes(h1.y);
        assert.ok(!touches || junction, `${id} crosses or touches ${other.id}`);
      }
    }
  }
});


test("LCL and CLD outputs merge into a single trunk line that reaches WFM and SWI, independent of DCL", () => {
  const { edges } = learningDiagramLayout(data.applications);
  const findEdge = (id) => {
    const edge = edges.find((candidate) => candidate.id === id);
    assert.ok(edge, `learning diagram must expose the ${id} edge`);
    return edge;
  };
  const lastHorizontalEndpoint = (path) => {
    const points = [];
    let current = null;
    for (const [, command, first, second] of path.matchAll(/([MHV])\s*([\d.]+)(?:\s+([\d.]+))?/g)) {
      if (command === "M") current = { x: Number(first), y: Number(second) };
      if (command === "H") current = { x: Number(first), y: current.y };
      if (command === "V") current = { x: current.x, y: Number(first) };
      points.push(current);
    }
    const last = points.at(-1);
    const previous = points.at(-2);
    assert.ok(last && previous && last.y === previous.y, `${path} must terminate on a horizontal segment`);
    return last;
  };
  const firstVerticalStart = (path) => {
    const points = [];
    let current = null;
    for (const [, command, first, second] of path.matchAll(/([MHV])\s*([\d.]+)(?:\s+([\d.]+))?/g)) {
      if (command === "M") current = { x: Number(first), y: Number(second) };
      if (command === "H") current = { x: Number(first), y: current.y };
      if (command === "V") current = { x: current.x, y: Number(first) };
      points.push(current);
    }
    assert.ok(points.length >= 2 && points[0].x === points[1].x, `${path} must begin with a vertical segment`);
    return points[0];
  };
  const lclMerge = findEdge("lcl-to-merge");
  const cldMerge = findEdge("cld-to-merge");
  const trunk = findEdge("deployment-trunk");
  assert.deepEqual(lastHorizontalEndpoint(lclMerge.path), { x: 550, y: 850 }, "LCL must terminate at the merge point");
  assert.deepEqual(lastHorizontalEndpoint(cldMerge.path), { x: 550, y: 850 }, "CLD must terminate at the merge point");
  assert.deepEqual(firstVerticalStart(trunk.path), { x: 550, y: 850 }, "Trunk must start at the merge point");
  const wfmEdge = findEdge("deployment-to-wfm");
  const swiEdge = findEdge("deployment-to-swi");
  assert.ok(wfmEdge.path.includes("M 550 956"), "WFM arrow must originate from the WFM/SWI junction");
  assert.ok(swiEdge.path.includes("M 550 956"), "SWI arrow must originate from the WFM/SWI junction");
  for (const id of ["dcl-to-stage-07", "dcl-to-trunk", "dcl-to-merge", "dcl-to-deployment", "dcl-to-junction"]) {
    assert.equal(edges.find((edge) => edge.id === id), undefined, `DCL must not contribute a main-continuation edge (${id})`);
  }
  for (const code of ["lcl", "cld"]) {
    assert.equal(findEdge(`${code}-to-dcl`).kind, "child", `${code.toUpperCase()}-to-DCL must remain a child edge`);
  }
});


test("the LCL-to-DCL child link visually jumps over the CLD main trunk centered at the CLD node x725 y794", () => {
  const { nodes, edges } = learningDiagramLayout(data.applications);
  const cldNode = nodes.find((item) => item.app.code === "cld");
  assert.ok(cldNode, "learning diagram must expose a CLD node");
  const cldCenter = cldNode.x + cldNode.width / 2;
  const gapLeft = cldCenter - 10;
  const gapRight = cldCenter + 10;
  const lclLink = edges.find((edge) => edge.id === "lcl-to-dcl");
  const lclJump = edges.find((edge) => edge.id === "lcl-to-dcl-jump");
  assert.ok(lclLink, "lcl-to-dcl must remain a visible edge");
  assert.ok(lclJump, "lcl-to-dcl must split into two paths to skip the CLD trunk");
  assert.deepEqual(lclLink.kind, "child", "the leading leg is part of the LCL child link");
  assert.deepEqual(lclJump.kind, "child", "the trailing leg is part of the LCL child link");
  const linkSegments = segments(lclLink.path);
  const jumpSegments = segments(lclJump.path);
  const spansGap = [...linkSegments, ...jumpSegments].filter(([a, b]) => a.y === b.y && a.y === 794 && Math.min(a.x, b.x) < gapRight && Math.max(a.x, b.x) > gapLeft);
  assert.equal(spansGap.length, 0, `the LCL-to-DCL path must not cross the CLD main trunk at x${cldCenter} y794 (gap ${gapLeft}..${gapRight})`);
  const mainSegments = segments(edges.find((edge) => edge.id === "cld-to-merge").path);
  assert.ok(mainSegments.some(([a, b]) => a.x === b.x && a.x === cldCenter && a.y === 774 && b.y === 850), `the CLD main trunk must travel at x${cldCenter} from y774 down to y850 so the LCL link can jump across at y794`);
  for (const locale of ["en", "tr"]) {
    const diagram = renderLearningDiagram({ locale, data });
    const linkTag = diagram.match(/<path data-learning-edge="lcl-to-dcl"[^>]*\/>/)?.[0] ?? "";
    const jumpTag = diagram.match(/<path data-learning-edge="lcl-to-dcl-jump"[^>]*\/>/)?.[0] ?? "";
    assert.ok(linkTag, `${locale}: lcl-to-dcl leg must be rendered`);
    assert.ok(jumpTag, `${locale}: lcl-to-dcl-jump leg must be rendered`);
    assert.doesNotMatch(linkTag, /marker-end="url\(#ld-arrow\)"/, `${locale}: the gap-ending lcl-to-dcl leg must not carry an arrow marker`);
    assert.match(jumpTag, /marker-end="url\(#ld-arrow\)"/, `${locale}: the DCL-ending lcl-to-dcl-jump leg must keep its arrow marker`);
  }
});


test("DCL has two equal owners and one visible entry in each portfolio view", () => {
  const dcl = data.applications.find((app) => app.code === "dcl");
  assert.deepEqual(applicationParents(dcl), ["cld", "lcl"]);
  const rows = applicationHierarchy(data.applications);
  const position = rows.findIndex(({ application }) => application.code === "dcl");
  assert.equal(rows[position].depth, 1);
  for (const code of applicationParents(dcl)) assert.ok(rows.findIndex(({ application }) => application.code === code) < position);
  for (const locale of ["en", "tr"]) {
    const ownership = locale === "tr" ? "CLD + LCL ortak laboratuvarı" : "Shared laboratory of CLD + LCL";
    for (const [html, attribute] of [[renderApplicationMap({ locale, data, today }), "data-app-code"], [renderSystemFocus({ locale, data }), "data-focus-app"]]) {
      assert.equal(html.split(`${attribute}="dcl"`).length - 1, 1);
      assert.ok(html.includes('data-app-parents="cld lcl"'));
      assert.ok(html.includes(ownership));
    }
  }
  const { nodes, families, edges } = learningDiagramLayout(data.applications);
  const family = families.find((item) => item.code === "cld-lcl");
  assert.ok(family);
  for (const code of ["cld", "lcl", "dcl"]) {
    const node = nodes.find(({ app }) => app.code === code);
    assert.ok(node.x > family.x && node.x + node.width < family.x + family.width && node.y > family.y && node.y + node.height < family.y + family.height);
  }
  for (const code of applicationParents(dcl)) assert.equal(edges.find((edge) => edge.id === `${code}-to-dcl`).kind, "child");
  const lab = nodes.find(({ app }) => app.code === "dcl");
  assert.ok(nodes.filter(({ app }) => applicationParents(dcl).includes(app.code)).every((parent) => lab.x > parent.x + parent.width));
  assert.ok(nodes.filter(({ app }) => applicationParents(dcl).includes(app.code)).every((parent) => lab.width < parent.width && lab.height < parent.height));
});

test("shared ownership validates both parents and detects cycles through either branch", () => {
  for (const [mutate, expected] of [
    [(apps) => { apps.find((app) => app.code === "dcl").sharedParentApps = ["cld", "zzz"]; }, "relationship-unresolved"],
    [(apps) => { apps.find((app) => app.code === "dcl").sharedParentApps = ["cld", "cld"]; }, "invalid-shared-parents"],
    [(apps) => { apps.find((app) => app.code === "dcl").sharedParentApps = null; }, "invalid-shared-parents"],
    [(apps) => { apps.find((app) => app.code === "dcl").parentApp = "cld"; }, "invalid-shared-parents"],
    ...["cld", "lcl"].flatMap((code) => [
      [(apps) => { apps.find((app) => app.code === code).parentApp = "dcl"; }, "hierarchy-cycle"],
      [(apps) => { apps.find((app) => app.code === code).downstreamApps = []; }, "hierarchy-relationship"],
      [(apps) => { apps.find((app) => app.code === code).portfolioLayer = "foundation"; }, "hierarchy-layer"],
    ]),
  ]) {
    const changed = structuredClone(data);
    mutate(changed.applications);
    const result = validateLivingSystemData(changed, { today });
    assert.ok(result.errors.some((error) => error.code === expected), JSON.stringify(result.errors));
  }
});
