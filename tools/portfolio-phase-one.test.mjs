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
const today = new Date("2026-09-06T12:00:00Z");

async function readData() {
  return JSON.parse(await readFile(path.join(rootDir, "data", "living-system.json"), "utf8"));
}

test("the public application contract keeps verification, research, and release facts separate", async () => {
  const data = await readData();

  for (const application of data.applications.filter(({ code }) => !["swi", "ant", "bee"].includes(code))) {
    assert.match(application.researchCutoff, /^2026-\d{2}-\d{2}$/, `${application.code} research cutoff`);
    assert.equal(application.lastVerified, "2026-09-04", `${application.code} verification date`);
    assert.match(application.lastReleased, /^2026-\d{2}-\d{2}$/, `${application.code} release date`);
    assert.match(application.releaseSha, /^[a-f0-9]{40}$/, `${application.code} release SHA`);
    assert.deepEqual(application.languages, ["tr", "en"], `${application.code} language contract`);
    assert.ok(Array.isArray(application.upstreamApps), `${application.code} upstream relationships`);
    assert.ok(Array.isArray(application.downstreamApps), `${application.code} downstream relationships`);
    assert.ok(Array.isArray(application.tracks), `${application.code} tracks`);
    assert.ok(Array.isArray(application.entityIds), `${application.code} entity relationships`);
  }

  const eng = data.applications.find((application) => application.code === "eng");
  assert.equal(eng.status, "active");
  assert.equal(eng.statusLabel.en, "Horizon · active research");
  assert.equal(eng.statusLabel.tr, "Ufuk · aktif araştırma");
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
  assert.ok(registry.applications.length >= 16, "portfolio registry must have at least 16 applications");
  assert.deepEqual(registry.applications.map(({ code }) => code), data.applications.map(({ code }) => code));
  assert.deepEqual(
    registry.applications.find(({ code }) => code === "ctx"),
    {
      code: "ctx",
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
  assert.match(english, /<dt>Released<\/dt><dd><time datetime="2026-09-04">2026-09-04<\/time><code>aaf2843a<\/code><\/dd>/);
  assert.match(english, /<dt>Status<\/dt><dd>Horizon · active research<\/dd>/);
  assert.match(turkish, /<dt>Durum<\/dt><dd>Ufuk · aktif araştırma<\/dd>/);
});

test("the system focus model names five layers without percentage theater", async () => {
  let rendererModule = {};
  try {
    rendererModule = await import("./render-living-system.mjs");
  } catch {}
  assert.equal(typeof rendererModule.renderSystemFocus, "function");

  const data = await readData();
  const english = rendererModule.renderSystemFocus({ locale: "en", data });
  const turkish = rendererModule.renderSystemFocus({ locale: "tr", data });

  for (const heading of ["Foundation", "Agent system", "Assurance", "Deployment", "Physical AI"]) {
    assert.match(english, new RegExp(`<h2>${heading}<\\/h2>`));
  }
  for (const heading of ["Temel", "Ajan sistemi", "Güvence", "Dağıtım", "Fiziksel AI"]) {
    assert.match(turkish, new RegExp(`<h2>${heading}<\\/h2>`));
  }
  assert.doesNotMatch(english, /\d+%|flex-basis|depth allocation/i);
  assert.doesNotMatch(turkish, /%\d+|flex-basis|derinlik dağılımı/i);
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

test("homepage diagram, registry, and layer overview cover the same applications across their dedicated pages", async () => {
  const data = await readData();
  const expected = data.applications.map(({ code }) => code).sort();
  for (const file of ["index.html", "tr/index.html"]) {
    const html = await readFile(path.join(rootDir, file), "utf8");
    const svg = html.match(/<g class="ld-nodes">([\s\S]*?)<\/svg>/)?.[1] ?? "";
    const diagram = [...svg.matchAll(/href="https:\/\/([a-z]{3})\.aserdargun\.com\/"/g)].map((match) => match[1]).sort();
    assert.deepEqual(diagram, expected);
    const applicationMap = await readFile(path.join(rootDir, file.replace("index.html", "applications/index.html")), "utf8");
    const map = [...applicationMap.matchAll(/data-app-code="([a-z]{3})"/g)].map((match) => match[1]).sort();
    assert.deepEqual(map, expected);
    assert.ok(html.indexOf('class="system-focus"') < html.indexOf('class="learning-system"'));
    assert.equal(html.includes('class="app-map"'), false, "the full application table belongs on its dedicated page");
  }
});
