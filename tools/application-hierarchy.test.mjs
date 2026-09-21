import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applicationHierarchy, applicationParents } from "./application-hierarchy.mjs";
import { learningDiagramLayout } from "./learning-diagram.mjs";
import { validateLivingSystemData } from "./living-system-data.mjs";
import { renderApplicationMap } from "./render-living-system.mjs";

const data = JSON.parse(await readFile(new URL("../data/living-system.json", import.meta.url), "utf8"));
const today = new Date("2026-09-21T12:00:00Z");

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

test("new sub-applications automatically get localized ownership and adjacent rows in the application map", () => {
  const extended = structuredClone(data);
  extended.applications.unshift({ ...structuredClone(data.applications.find((app) => app.code === "gex")), code: "xyz", parentApp: "gpu", kind: "atlas", address: "https://xyz.aserdargun.com/", repository: "https://github.com/aserdargun/xyz-aserdargun-com" });
  for (const locale of ["en", "tr"]) {
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
    const next = command === "M" ? { x: +first, y: +second } : command === "H" ? { x: +first, y: current.y } : { x: current.x, y: +first };
    if (current && (current.x !== next.x || current.y !== next.y)) result.push([current, next]);
    current = next;
  }
  return result;
}

const overlap = (a, b, c, d) => Math.min(Math.max(a, b), Math.max(c, d)) > Math.max(Math.min(a, b), Math.min(c, d));
const inside = (value, a, b) => value > Math.min(a, b) && value < Math.max(a, b);

test("all diagram boxes are disjoint; framed children stay inside their owning family", () => {
  const { nodes, families } = learningDiagramLayout(data.applications);
  for (const [i, node] of nodes.entries()) {
    for (const other of nodes.slice(i + 1)) {
      assert.ok(!(overlap(node.x, node.x + node.width, other.x, other.x + other.width) && overlap(node.y, node.y + node.height, other.y, other.y + other.height)), `${node.app.code} overlaps ${other.app.code}`);
    }
    if (node.app.parentApp) {
      const parent = nodes.find((item) => item.app.code === node.app.parentApp);
      const family = families.find((item) => item.code === node.app.parentApp);
      assert.ok(node.width < parent.width, `${node.app.code} should be narrower than its parent`);
      assert.ok(family);
      for (const member of [node, parent]) {
        assert.ok(member.x > family.x && member.x + member.width < family.x + family.width && member.y > family.y && member.y + member.height < family.y + family.height);
      }
    }
  }
});

test("every arrow and connector avoids box interiors and other routes; shared bus joins are explicit", () => {
  const { nodes, families, edges, connectors, junctions } = learningDiagramLayout(data.applications);
  const paths = [...edges, ...connectors];
  const lines = paths.flatMap((edge) => segments(edge.path).map(([a, b]) => ({ id: edge.id, a, b })));
  for (const [index, { id, a, b }] of lines.entries()) {
    for (const node of nodes) {
      const crosses = a.x === b.x
        ? inside(a.x, node.x, node.x + node.width) && overlap(a.y, b.y, node.y, node.y + node.height)
        : inside(a.y, node.y, node.y + node.height) && overlap(a.x, b.x, node.x, node.x + node.width);
      assert.ok(!crosses, `${id} crosses ${node.app.code}`);
    }
    for (const family of families) {
      const endpoints = id.split("-to-");
      const belongs = endpoints.some((code) => code === family.code || family.members.includes(code));
      if (belongs) continue;
      const crosses = a.x === b.x
        ? inside(a.x, family.x, family.x + family.width) && overlap(a.y, b.y, family.y, family.y + family.height)
        : inside(a.y, family.y, family.y + family.height) && overlap(a.x, b.x, family.x, family.x + family.width);
      assert.ok(!crosses, `${id} crosses unrelated ${family.code} frame`);
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
        const junction = junctions.some(({ x, y }) => x === v1.x && y === h1.y);
        assert.ok(!touches || junction, `${id} crosses or touches ${other.id}`);
      }
    }
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
    for (const [html, attribute] of [[renderApplicationMap({ locale, data, today }), "data-app-code"]]) {
      assert.equal(html.split(`${attribute}="dcl"`).length - 1, 1);
      assert.ok(html.includes('data-app-parents="cld lcl"'));
      assert.ok(html.includes(ownership));
    }
  }
  const { nodes, families, edges } = learningDiagramLayout(data.applications);
  const family = families.find(({ code }) => code === "deployment");
  assert.deepEqual([...family.members].sort(), ["cld", "dcl", "lcl"]);
  const byCode = (code) => nodes.find(({ app }) => app.code === code);
  assert.ok(byCode("lcl").x + byCode("lcl").width < byCode("cld").x);
  assert.equal(byCode("lcl").y, byCode("cld").y);
  assert.equal(byCode("dcl").cx, family.x + family.width / 2);
  for (const code of family.members) {
    const node = byCode(code);
    assert.ok(node.x > family.x && node.x + node.width < family.x + family.width);
    assert.ok(node.y > family.y && node.y + node.height < family.y + family.height);
  }
  for (const code of applicationParents(dcl)) {
    assert.ok(byCode(code).y + byCode(code).height < byCode("dcl").y);
    assert.ok(!edges.some((edge) => edge.id === `${code}-to-dcl`), "shared ownership is expressed by containment");
  }
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


test("the approved diagram has 30 unique nodes and ten non-overlapping ownership frames", () => {
  const { nodes, families, edges } = learningDiagramLayout(data.applications);
  assert.equal(nodes.length, 30);
  assert.equal(new Set(nodes.map(({ app }) => app.code)).size, 30);
  assert.deepEqual(families.map(({ code }) => code), ["gpu", "usl", "llm", "hns", "ctx", "deployment", "wfm", "swi", "itl", "eng"]);
  for (const [i, frame] of families.entries()) {
    for (const other of families.slice(i + 1)) {
      assert.ok(!(overlap(frame.x, frame.x + frame.width, other.x, other.x + other.width) && overlap(frame.y, frame.y + frame.height, other.y, other.y + other.height)), `${frame.code} overlaps ${other.code}`);
    }
    for (const node of nodes) {
      if (frame.members.includes(node.app.code)) continue;
      assert.ok(!(overlap(frame.x, frame.x + frame.width, node.x, node.x + node.width) && overlap(frame.y, frame.y + frame.height, node.y, node.y + node.height)), `${frame.code} encloses unrelated ${node.app.code}`);
    }
  }
  assert.deepEqual(edges.filter(({bidirectional}) => bidirectional).map(({id}) => id), ["ctx-to-sec", "ctx-to-evl"]);
  const branchLengths = ["deployment-to-wfm", "deployment-to-swi"].map((id) => {
    const [start, end] = segments(edges.find((edge) => edge.id === id).path)[0];
    return Math.abs(end.x - start.x);
  });
  assert.equal(branchLengths[0], branchLengths[1], "physical-AI branches have equal horizontal lengths");
  // Incoming routes to grouped applications land on their family frames.
  // Other arrow tips land on the application rectangle.
  for (const edge of edges) {
    const foundationBranch = ["aia-to-gpu", "aia-to-usl"].includes(edge.id);
    const targetCode = edge.id.split("-to-")[1];
    const target = foundationBranch || ["llm", "hns", "ctx", "deployment", "wfm", "swi", "itl", "eng"].includes(targetCode)
      ? families.find(({code}) => code === targetCode)
      : nodes.find(({app}) => app.code === targetCode);
    assert.ok(target, edge.id);
    const point = segments(edge.path).at(-1)[1];
    if (foundationBranch) assert.deepEqual(point, { x: target.x + target.width / 2, y: target.y }, `${edge.id} misses frame midpoint`);
    if (targetCode === "itl") {
      const source = families.find(({code}) => code === edge.id.split("-to-")[0]);
      assert.deepEqual(segments(edge.path)[0][0], { x: source.x + source.width / 2, y: source.y + source.height });
      assert.deepEqual(point, { x: edge.id === "wfm-to-itl" ? target.x : target.x + target.width, y: target.y + target.height / 2 });
    } else if (edge.id === "ctx-to-deployment") {
      const ctx = families.find(({code}) => code === "ctx");
      assert.deepEqual(segments(edge.path)[0][0], { x: ctx.x + ctx.width / 2, y: ctx.y + ctx.height });
      assert.deepEqual(point, { x: target.x + target.width / 2, y: target.y });
      assert.equal(segments(edge.path).length, 1, "context connects vertically to deployment");
    } else if (edge.id === "gpu-to-llm") {
      const gpuFrame = families.find(({code}) => code === "gpu");
      assert.deepEqual(segments(edge.path)[0][0], { x: gpuFrame.x + gpuFrame.width / 2, y: gpuFrame.y + gpuFrame.height });
      assert.deepEqual(point, { x: target.x, y: target.y + target.height / 2 });
    } else if (edge.id === "usl-to-llm") {
      assert.deepEqual(point, { x: target.x + target.width, y: target.y + target.height / 2 });
    } else if (["llm", "hns", "ctx", "deployment", "wfm", "swi", "itl", "eng"].includes(targetCode)) {
      assert.deepEqual(point, { x: target.x + target.width / 2, y: target.y }, `${edge.id} must touch the top midpoint of its target frame`);
    }
    assert.ok(((point.x === target.x || point.x === target.x + target.width) && point.y >= target.y && point.y <= target.y + target.height)
      || ((point.y === target.y || point.y === target.y + target.height) && point.x >= target.x && point.x <= target.x + target.width), `${edge.id} misses target boundary`);
  }
});
