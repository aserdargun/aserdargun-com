import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applicationHierarchy } from "./application-hierarchy.mjs";
import { learningDiagramLayout } from "./learning-diagram.mjs";
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
    const next = command === "M" ? { x: +first, y: +second } : command === "H" ? { x: +first, y: current.y } : { x: current.x, y: +first };
    if (current && (current.x !== next.x || current.y !== next.y)) result.push([current, next]);
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
  const paths = [...edges, { id: "local-bus", path: "M 375 774 V 806 H 550 V 846" }, { id: "cloud-bus", path: "M 725 774 V 806 H 550" }];
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
        const junction = v1.x === 550 && [806, 846].includes(h1.y);
        assert.ok(!touches || junction, `${id} crosses or touches ${other.id}`);
      }
    }
  }
});
