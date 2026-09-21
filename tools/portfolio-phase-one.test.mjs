import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  renderApplicationMap,
  renderPublicMemory,
  renderSwarmLabs,
} from "./render-living-system.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const today = new Date("2026-09-21T12:00:00Z");

async function readData() {
  return JSON.parse(await readFile(path.join(rootDir, "data", "living-system.json"), "utf8"));
}

test("the public application contract keeps verification, research, and release facts separate", async () => {
  const data = await readData();

  for (const application of data.applications.filter(({ code }) => !["swi", "ant", "bee", "gex", "wml", "pdt", "hex", "tfl", "arl", "adp", "dcl", "pol", "dtr"].includes(code))) {
    assert.match(application.researchCutoff, /^2026-\d{2}-\d{2}$/, `${application.code} research cutoff`);
    assert.match(application.lastVerified, /^2026-\d{2}-\d{2}$/, `${application.code} verification date`);
    assert.ok(new Date(application.lastVerified) <= today, `${application.code} verification must not be in the future`);
    assert.match(application.lastReleased, /^2026-\d{2}-\d{2}$/, `${application.code} release date`);
    assert.match(application.releaseSha, /^[a-f0-9]{40}$/, `${application.code} release SHA`);
    assert.deepEqual(application.languages, application.code === "cld" ? ["tr"] : ["eng", "itl"].includes(application.code) ? ["en"] : ["tr", "en"], `${application.code} language contract`);
    assert.ok(Array.isArray(application.upstreamApps), `${application.code} upstream relationships`);
    assert.ok(Array.isArray(application.downstreamApps), `${application.code} downstream relationships`);
    assert.ok(Array.isArray(application.tracks), `${application.code} tracks`);
    assert.ok(Array.isArray(application.entityIds), `${application.code} entity relationships`);
  }

  const eng = data.applications.find((application) => application.code === "eng");
  assert.equal(eng.status, "active");
  assert.equal(eng.statusLabel.en, "Horizon · English manifesto");
  assert.equal(eng.statusLabel.tr, "Ufuk · İngilizce manifesto");
});

test("the portfolio registry is a deterministic public projection of application manifests", async () => {
  let registryModule = {};
  try {
    registryModule = await import("./portfolio-registry.mjs");
  } catch {}
  assert.equal(typeof registryModule.buildPortfolioRegistry, "function");

  const data = await readData();
  const registry = registryModule.buildPortfolioRegistry({
    applications: data.applications,
    generatedAt: "2026-09-04",
  });

  assert.equal(registry.schemaVersion, 1);
  assert.equal(registry.generatedAt, "2026-09-04");
  assert.equal(registry.applications.length, 26);
  assert.deepEqual(registry.applications.map(({ code }) => code), data.applications.map(({ code }) => code));
  assert.deepEqual(
    registry.applications.find(({ code }) => code === "ctx"),
    {
      code: "ctx",
      parentApp: null,
      name: { en: "Context & Knowledge Engineering", tr: "Bağlam ve Bilgi Mühendisliği" },
      shortName: "CTX",
      description: data.applications.find(({ code }) => code === "ctx").summary,
      type: "observatory",
      status: "live",
      statusLabel: { en: "Live", tr: "Yayında" },
      languages: ["tr", "en"],
      productionUrl: "https://ctx.aserdargun.com/",
      repositoryUrl: "https://github.com/aserdargun/ctx-aserdargun-com",
      researchCutoff: "2026-09-04",
      lastVerified: "2026-09-04",
      lastReleased: "2026-09-04",
      releaseSha: "49eee95c8030428af8136594d01600c126249740",
      sourceCount: null,
      claimCount: null,
      evidencePolicy: "primary-source-backed",
      upstreamApps: ["hns"],
      downstreamApps: ["llm", "lcl"],
      tracks: ["context", "knowledge", "retrieval", "memory"],
      entityIds: ["entity:mcp"],
      portfolioLayer: "agent-system",
      focusState: "active",
    },
  );
});

test("the application map exposes distinct research, verification, and release evidence", async () => {
  const data = await readData();
  const english = renderApplicationMap({ locale: "en", data, today });
  const turkish = renderApplicationMap({ locale: "tr", data, today });

  assert.match(english, /<dt>Research cutoff<\/dt><dd><time datetime="2026-08-24">2026-08-24<\/time><\/dd>/);
  assert.match(english, /<dt>Verified<\/dt><dd><time datetime="2026-09-04">2026-09-04<\/time><\/dd>/);
  assert.match(english, /<dt>Released<\/dt><dd><time datetime="2026-09-06">2026-09-06<\/time><code>59bac5f1<\/code><\/dd>/);
  assert.match(english, /<dt>Status<\/dt><dd>Horizon · English manifesto<\/dd>/);
  assert.match(turkish, /<dt>Durum<\/dt><dd>Ufuk · İngilizce manifesto<\/dd>/);
});

test("the homepage introduction leaves the application overview to the diagram", async () => {
  const { renderSystemFocus } = await import("./render-living-system.mjs");
  const { renderLearningDiagram } = await import("./learning-diagram.mjs");
  const data = await readData();
  for (const locale of ["en", "tr"]) {
    const intro = renderSystemFocus({ locale, data });
    assert.match(intro, /<h1[^>]*>[^<]+<\/h1>/);
    assert.doesNotMatch(intro, /system-focus__grid|system-focus-card|data-focus-app=|focus-scroll-hint/);
    assert.doesNotMatch(renderLearningDiagram({ locale, data }), /<figcaption>/);
  }
});

test("approved knowledge records render content, limitations, sources, apps, and entities", async () => {
  const data = await readData();
  const english = renderPublicMemory({ locale: "en", data });
  const turkish = renderPublicMemory({ locale: "tr", data });

  assert.ok(data.publicMemory.length >= 5, "data.publicMemory must have at least 5 entries");
  assert.match(english, /<h2>Evidence Before Deployment<\/h2>/);
  assert.match(turkish, /<h2>Dağıtımdan Önce Kanıt<\/h2>/);
  assert.match(english, /class="memory-card__content"/);
  assert.match(english, /<h3>Limitations<\/h3>/);
  assert.match(turkish, /<h3>Sınırlamalar<\/h3>/);
  assert.match(english, /<h3>Sources<\/h3>/);
  assert.match(english, /<h3>Related concepts<\/h3>/);
  assert.match(english, /data-entity-id="entity:evl"><span>AI Evaluation &amp; Reliability Lab<\/span>/);
  assert.match(english, /<dt>Created<\/dt>/);
  assert.match(english, /<dt>Verified<\/dt>/);
  assert.doesNotMatch(english, /nxt\.aserdargun\.com/);
});

test("verified SWI exposes its published research snapshot and release evidence", async () => {
  const data = await readData();
  const swi = data.applications.find(({ code }) => code === "swi");
  assert.equal(swi.status, "live");
  assert.equal(swi.researchCutoff, "2026-09-06", "the live SWI workspace explicitly dates its research snapshot");
  assert.match(swi.lastVerified, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(swi.lastReleased, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(swi.releaseSha, /^[a-f0-9]{40}$/);
  for (const locale of ["en", "tr"]) {
    const html = renderApplicationMap({ locale, data, today });
    const row = html.match(/<tr[^>]*data-app-code="swi"[\s\S]*?<\/tr>/)?.[0];
    assert.ok(row);
    assert.ok(row.includes(swi.statusLabel[locale]));
    assert.ok(row.includes(swi.lastVerified));
    assert.ok(row.includes(swi.lastReleased));
    assert.doesNotMatch(row, /undefined|null/);
  }
  for (const code of ["lcl", "cld"]) assert.ok(data.applications.find((app) => app.code === code).downstreamApps.includes("swi"));
  assert.ok(data.applications.find((app) => app.code === "itl").upstreamApps.includes("swi"));
});

test("SWI colony labs preserve their relationship and show release evidence without a research cutoff", async () => {
  const data = await readData();
  const swi = data.applications.find(({ code }) => code === "swi");
  for (const code of ["ant", "bee"]) {
    const lab = data.applications.find((application) => application.code === code);
    assert.equal(lab.status, "live");
    assert.deepEqual(lab.upstreamApps, ["swi"]);
    assert.ok(swi.downstreamApps.includes(code));
    assert.equal(lab.researchCutoff, undefined, "a release does not establish a research cutoff");
    for (const locale of ["en", "tr"]) {
      const html = renderApplicationMap({ locale, data, today });
      const row = html.match(new RegExp(`<tr[^>]*data-app-code="${code}"[\\s\\S]*?<\\/tr>`))?.[0];
      assert.ok(row.includes(lab.lastVerified));
      assert.ok(row.includes(lab.lastReleased));
      assert.ok(row.includes(lab.releaseSha.slice(0, 8)), "the release remains visible without a research cutoff");
      assert.doesNotMatch(row, /Research cutoff|Araştırma kesiti|undefined|null/);
      const labs = renderSwarmLabs({ locale, data });
      assert.match(labs, /data-swarm-parent="swi"/);
      assert.ok(labs.includes(`data-swarm-lab="${code}"`));
      assert.ok(labs.includes(`href="${lab.address}"`));
      assert.doesNotMatch(labs, /data-swarm-lab="itl"/, "the shared industrial-twin bridge is not a SWI colony lab");
    }
  }
});

test("homepage links cover the catalog and four published additions while the application map retains registered metadata", async () => {
  const data = await readData();
  const expected = data.applications.map(({ code }) => code).sort();
  const homepageCodes = [...expected, "dpl", "cul", "aos", "mem"].sort();
  for (const file of ["index.html", "tr/index.html"]) {
    const html = await readFile(path.join(rootDir, file), "utf8");
    const svg = html.match(/<g class="ld-nodes">([\s\S]*?)<\/svg>/)?.[1] ?? "";
    const diagram = [...svg.matchAll(/href="https:\/\/([a-z]{3})\.aserdargun\.com\/"/g)].map((match) => match[1]).sort();
    assert.deepEqual(diagram, homepageCodes);
    assert.doesNotMatch(html, /data-focus-app=|system-focus__grid|system-focus-board-track/);
    const applicationMap = await readFile(path.join(rootDir, file.replace("index.html", "applications/index.html")), "utf8");
    const map = [...applicationMap.matchAll(/data-app-code="([a-z]{3})"/g)].map((match) => match[1]).sort();
    assert.deepEqual(map, expected);
    assert.ok(html.indexOf('class="system-focus"') < html.indexOf('class="learning-system"'));
    assert.equal(html.includes('class="app-map"'), false, "the full application table belongs on its dedicated page");
  }
});

test("companion learning apps connect to their research parents across both locales", async () => {
  const data = await readData();
  const { renderPracticeLabs } = await import("./render-living-system.mjs");
  const { renderLearningDiagram } = await import("./learning-diagram.mjs");
  for (const [parentCode, code, layer] of [["gpu", "gex", "foundation"], ["wfm", "wml", "physical-ai"], ["itl", "pdt", "physical-ai"], ["eng", "hex", "physical-ai"]]) {
    const app = data.applications.find((app) => app.code === code);
    const parent = data.applications.find((app) => app.code === parentCode);
    assert.deepEqual(app.upstreamApps, [parentCode]);
    assert.ok(parent.downstreamApps.includes(code));
    assert.equal(app.portfolioLayer, layer);
    assert.equal(app.systemRole, "lab");
    assert.equal(app.researchCutoff, undefined, "educational applications do not imply a research cutoff");
    if (app.code === "pdt") {
      // Confirmed deployment: aserdargun/pdt-aserdargun-com/actions/runs/35618120812.
      assert.equal(app.lastReleased, "2026-09-21");
      assert.equal(app.releaseSha, "9889ab379930b114f97bc449a6219070fd2175c9");
    } else {
      assert.equal(app.lastReleased, undefined, "build timestamps do not establish release dates");
    }
    for (const locale of ["en", "tr"]) {
      const cards = renderPracticeLabs({ locale, data });
      assert.ok(cards.includes(`data-practice-lab="${code}" data-learning-parent="${parentCode}"`));
      assert.ok(cards.includes(app.summary[locale]));
      assert.ok(cards.includes(`href="${app.address}"`));
      assert.ok(cards.includes(`href="${parent.address}"`));
      const edges = renderLearningDiagram({ locale, data });
      assert.ok(edges.includes(`data-learning-parent="${parentCode}"`));
      assert.ok(edges.includes(`data-learning-family="${parentCode}"`));
    }
  }
});

test('adaptation, serving and agent companions retain ownership while DCL bridges both deployment choices', async () => {
  const data = await readData();
  const {renderCompanionLinks, renderDeploymentLab} = await import('./render-living-system.mjs');
  for (const [code, parentCode, layer] of [['adp','usl','foundation'],['tfl','llm','foundation'],['arl','hns','agent-system']]) {
    const app=data.applications.find(app=>app.code===code);
    assert.equal(app.parentApp,parentCode);
    assert.equal(app.portfolioLayer,layer);
    assert.ok(app.upstreamApps.includes(parentCode));
    assert.ok(data.applications.find(app=>app.code===parentCode).downstreamApps.includes(code));
    for(const locale of ['en','tr']) assert.ok(renderCompanionLinks({locale,data,parentCode}).includes(app.address));
  }
  const dcl=data.applications.find(app=>app.code==='dcl');
  assert.equal(dcl.parentApp,null);
  assert.deepEqual(dcl.sharedParentApps,["cld","lcl"]);
  for(const parentCode of dcl.sharedParentApps) for(const locale of ["en","tr"]) assert.ok(renderCompanionLinks({locale,data,parentCode}).includes(dcl.address));
  assert.equal(dcl.portfolioLayer,'deployment');
  assert.deepEqual(dcl.upstreamApps,['lcl','cld']);
  assert.equal(dcl.researchCutoff,undefined);
  for(const parent of dcl.upstreamApps) assert.ok(data.applications.find(app=>app.code===parent).downstreamApps.includes('dcl'));
  for(const locale of ['en','tr']) {
    const card=renderDeploymentLab({locale,data});
    assert.ok(card.includes(dcl.address));
    assert.ok(card.includes(dcl.summary[locale]));
    const journey=await readFile(path.join(rootDir,locale==='tr'?'tr/journey/index.html':'journey/index.html'),'utf8');
    assert.ok(journey.indexOf('data-deployment-lab="dcl"')>journey.indexOf('class="learning-deployment-paths"'));
    assert.ok(journey.indexOf('data-deployment-lab="dcl"')<journey.indexOf('id="horizon"'));
  }
});


test("DTR is registered once under ITL across the registry, catalog and learning path", async () => {
  const data = await readData();
  const dtr = data.applications.filter(({ code }) => code === "dtr");
  assert.equal(dtr.length, 1);
  const app = dtr[0];
  assert.equal(app.parentApp, "itl");
  assert.deepEqual(app.upstreamApps, ["itl"]);
  assert.ok(data.applications.find(({ code }) => code === "itl").downstreamApps.includes("dtr"));
  assert.equal(app.portfolioLayer, "physical-ai");
  assert.deepEqual(app.languages, ["tr", "en"]);
  assert.equal(app.researchCutoff, undefined, "a source review is not a research cutoff");
  assert.equal(app.lastVerified, "2026-09-21");
  assert.equal(app.lastReleased, "2026-09-21");
  assert.equal(app.releaseSha, "38e78c7d36daa84d0bb99b0469a62957a85b45ed");
  assert.match(app.summary.en, /synthetic.*human approval.*no LLM, field telemetry or machine commands/s);
  const focus = JSON.parse(await readFile(path.join(rootDir, "data/system-focus.json"), "utf8"));
  assert.equal(focus.additionalApplications.some(({ code }) => code === "dtr"), false);
  const registry = JSON.parse(await readFile(path.join(rootDir, "portfolio.json"), "utf8"));
  assert.equal(registry.applications.filter(({ code }) => code === "dtr").length, 1);
  for (const locale of ["en", "tr"]) {
    const prefix = locale === "tr" ? "tr/" : "";
    const map = await readFile(path.join(rootDir, prefix, "applications/index.html"), "utf8");
    const row = map.match(/<tr[^>]*data-app-code="dtr"[^>]*>[\s\S]*?<\/tr>/)?.[0] ?? "";
    assert.match(row, /data-app-parent="itl"/);
    assert.ok(row.includes(app.summary[locale]));
    const journey = await readFile(path.join(rootDir, prefix, "journey/index.html"), "utf8");
    assert.match(journey, /data-practice-lab="dtr" data-learning-parent="itl"/);
    assert.ok(journey.includes(app.guidingQuestion[locale]));
  }
});
