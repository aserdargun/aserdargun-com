import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import * as rendererModule from "./render-living-system.mjs";
import {
  readArchiveLinks,
  renderDocument,
  renderJourneyEvidence,
  renderLivingSystem,
  renderNowContent,
  renderPrimaryNavigation,
  renderPublicMemory,
  renderSite,
  replaceGeneratedBlock,
} from "./render-living-system.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rendererPath = path.join(rootDir, "tools", "render-living-system.mjs");
const today = new Date("2026-09-02T12:00:00Z");

async function readFixtureData() {
  return JSON.parse(await readFile(path.join(rootDir, "data", "living-system.json"), "utf8"));
}

function homeDocument() {
  return `<!doctype html>
<!-- GENERATED:primary-navigation:start --><!-- GENERATED:primary-navigation:end -->
<!-- GENERATED:living-system:start --><!-- GENERATED:living-system:end -->
<section class="app-map" id="apps" aria-labelledby="app-map-title" aria-describedby="app-map-description">
<!-- GENERATED:application-map:start -->
old
<!-- GENERATED:application-map:end -->
</section>
<!-- GENERATED:public-memory:start --><!-- GENERATED:public-memory:end -->
<!-- GENERATED:journey-evidence:start --><!-- GENERATED:journey-evidence:end -->
`;
}

function journeyScope(markup) {
  return `<div class="story-content" id="journey"><ol class="timeline" data-timeline>${markup}</ol></div>`;
}

function completeHomeDocument({ head = "", bodyContent = "", afterBody = "", afterHtml = "" } = {}) {
  return `<!doctype html>
<html lang="en">
<head>${head}</head>
<body>
<!-- GENERATED:primary-navigation:start --><!-- GENERATED:primary-navigation:end -->
<!-- GENERATED:living-system:start --><!-- GENERATED:living-system:end -->
<section class="app-map" id="apps">
<!-- GENERATED:application-map:start --><!-- GENERATED:application-map:end -->
</section>
<!-- GENERATED:public-memory:start --><!-- GENERATED:public-memory:end -->
${bodyContent}
<!-- GENERATED:journey-evidence:start --><!-- GENERATED:journey-evidence:end -->
</body>${afterBody}
</html>${afterHtml}`;
}

function homeDocumentWithJourneyStage(stage = "01") {
  return completeHomeDocument({
    bodyContent: journeyScope(`<li class="timeline-step" id="journey-stage-${stage}" data-timeline-step><span class="timeline-index">${stage}</span></li>`),
  });
}

function homeDocumentWithJourneyMarkup(markup) {
  return completeHomeDocument({ bodyContent: journeyScope(markup) });
}

function nowDocument() {
  return `<!doctype html>
<!-- GENERATED:primary-navigation:start --><!-- GENERATED:primary-navigation:end -->
<!-- GENERATED:now-content:start -->
old
<!-- GENERATED:now-content:end -->
`;
}

function memoryDocument() {
  return `<!doctype html>
<!-- GENERATED:primary-navigation:start --><!-- GENERATED:primary-navigation:end -->
<!-- GENERATED:public-memory:start --><!-- GENERATED:public-memory:end -->
`;
}

function completeMemoryDocument({ head = "", bodyPrefix = "", indexAttributes = "" } = {}) {
  return `<!doctype html>
<html lang="en" data-locale="en">
<head>${head}</head>
<body>${bodyPrefix}
<!-- GENERATED:primary-navigation:start --><!-- GENERATED:primary-navigation:end -->
<main id="main"><section class="memory-index"${indexAttributes}>
<!-- GENERATED:public-memory:start --><!-- GENERATED:public-memory:end -->
</section></main>
</body>
</html>`;
}

async function createSiteFixture() {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "living-system-render-"));
  await mkdir(path.join(fixtureDir, "data"));
  await mkdir(path.join(fixtureDir, "memory"));
  await mkdir(path.join(fixtureDir, "tr", "memory"), { recursive: true });
  await mkdir(path.join(fixtureDir, "tr", "now"), { recursive: true });
  await mkdir(path.join(fixtureDir, "now"));
  await writeFile(path.join(fixtureDir, "data", "living-system.json"), await readFile(path.join(rootDir, "data", "living-system.json")));
  await writeFile(path.join(fixtureDir, "index.html"), homeDocument());
  await writeFile(path.join(fixtureDir, "tr", "index.html"), homeDocument());
  await writeFile(path.join(fixtureDir, "now", "index.html"), nowDocument());
  await writeFile(path.join(fixtureDir, "tr", "now", "index.html"), nowDocument());
  await writeFile(path.join(fixtureDir, "memory", "index.html"), completeMemoryDocument());
  await writeFile(
    path.join(fixtureDir, "tr", "memory", "index.html"),
    completeMemoryDocument().replaceAll('lang="en" data-locale="en"', 'lang="tr" data-locale="tr"'),
  );
  return fixtureDir;
}

async function createArchiveFilesystemFixture(t, { week = "2026-W34" } = {}) {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "living-system-archives-"));
  t.after(() => rm(fixtureDir, { recursive: true, force: true }));
  const fixtureFiles = [
    "now/archive/2026-W34/index.html",
    "tr/now/archive/2026-W34/index.html",
    "sitemap.xml",
  ];
  for (const relativePath of fixtureFiles) {
    const destination = path.join(fixtureDir, relativePath.replace("2026-W34", week));
    await mkdir(path.dirname(destination), { recursive: true });
    const source = await readFile(path.join(rootDir, relativePath), "utf8");
    await writeFile(destination, source.replaceAll("2026-W34", week));
  }
  return fixtureDir;
}

async function mutateFixture(fixtureDir, relativePath, mutation) {
  const filePath = path.join(fixtureDir, relativePath);
  await writeFile(filePath, mutation(await readFile(filePath, "utf8")));
}

function moveNavigationGroupLinksOutside(html, groupName) {
  const group = html.match(new RegExp(
    `(<div class="nav-links__group" data-nav-group="${groupName}"[^>]*>\\s*<span class="nav-links__section"[^>]*>[^<]+<\\/span>)([\\s\\S]*?)(\\s*<\\/div>)`,
  ));
  assert.ok(group, `expected ${groupName} navigation group fixture`);
  return html.replace(group[0], `${group[1]}${group[3]}${group[2]}`);
}

function digest(source) {
  return createHash("sha256").update(source).digest("hex");
}

function primaryLinks(html) {
  return Array.from(
    html.matchAll(/<a class="nav-links__primary-link" href="([^"]+)"(?: aria-current="page")?>([^<]+)<\/a>/g),
    (match) => ({ href: match[1], label: match[2], current: match[0].includes('aria-current="page"') }),
  );
}

function livingSystemCards(html) {
  return Array.from(
    html.matchAll(/<a class="living-system-card" href="([^"]+)">[\s\S]*?<span class="living-system-card__eyebrow">([^<]+)<\/span>[\s\S]*?<h2>([^<]+)<\/h2>[\s\S]*?<p>([^<]+)<\/p>[\s\S]*?<\/a>/g),
    (match) => ({ href: match[1], eyebrow: match[2], heading: match[3], description: match[4] }),
  );
}

test("renders the exact six localized primary concepts and page-aware destinations", () => {
  const english = renderPrimaryNavigation({ locale: "en", page: "home" });
  const turkish = renderPrimaryNavigation({ locale: "tr", page: "home" });

  assert.deepEqual(primaryLinks(english), [
    { href: "/#journey", label: "Journey", current: false },
    { href: "/now/", label: "Now", current: false },
    { href: "/#horizon", label: "Horizon", current: false },
    { href: "/#apps", label: "Applications", current: false },
    { href: "/memory/", label: "Knowledge", current: false },
    { href: "/#about", label: "About", current: false },
  ]);
  assert.deepEqual(primaryLinks(turkish), [
    { href: "/tr/#journey", label: "Yolculuk", current: false },
    { href: "/tr/now/", label: "Şimdi", current: false },
    { href: "/tr/#horizon", label: "Ufuk", current: false },
    { href: "/tr/#apps", label: "Uygulamalar", current: false },
    { href: "/tr/memory/", label: "Bilgi", current: false },
    { href: "/tr/#about", label: "Hakkımda", current: false },
  ]);
});

test("marks only routed primary concepts current and keeps Learning secondary", () => {
  const now = renderPrimaryNavigation({ locale: "en", page: "now" });
  const memory = renderPrimaryNavigation({ locale: "tr", page: "memory" });
  const archive = renderPrimaryNavigation({ locale: "en", page: "archive" });

  assert.deepEqual(primaryLinks(now).filter((link) => link.current), [
    { href: "/now/", label: "Now", current: true },
  ]);
  assert.deepEqual(primaryLinks(memory).filter((link) => link.current), [
    { href: "/tr/memory/", label: "Bilgi", current: true },
  ]);
  assert.deepEqual(primaryLinks(archive).filter((link) => link.current), [
    { href: "/now/", label: "Now", current: true },
  ]);
  assert.match(now, /<a class="nav-links__secondary-link" href="\/#learning">Learning<\/a>/);
  assert.equal(primaryLinks(now).some((link) => link.label === "Learning"), false);
});

test("renders assistive-technology-visible horizon and private-system groups", () => {
  const english = renderPrimaryNavigation({ locale: "en", page: "home" });
  const turkish = renderPrimaryNavigation({ locale: "tr", page: "home" });

  assert.match(english, /<span class="nav-links__section" id="nav-horizon-label-en">The horizon<\/span>/);
  assert.match(turkish, /<span class="nav-links__section" id="nav-horizon-label-tr">Ufuk<\/span>/);
  assert.match(english, /<span class="nav-links__section" id="nav-private-label-en">Private systems<\/span>/);
  assert.match(turkish, /<span class="nav-links__section" id="nav-private-label-tr">Özel sistemler<\/span>/);
  assert.equal(/nav-links__section[^>]*aria-hidden="true"/.test(english), false);
  assert.deepEqual(
    Array.from(english.matchAll(/data-nav-group="horizon"[\s\S]*?<\/div>/g), (group) => Array.from(group[0].matchAll(/https:\/\/([a-z]{3})\.aserdargun\.com\//g), (match) => match[1])).flat(),
    ["wfm", "itl", "eng"],
  );
  assert.deepEqual(
    Array.from(english.matchAll(/data-nav-group="private"[\s\S]*?<\/div>/g), (group) => Array.from(group[0].matchAll(/https:\/\/([a-z]{3})\.aserdargun\.com\//g), (match) => match[1])).flat(),
    ["stk", "inf", "nxt"],
  );
});

test("gives each localized navigation group a nameable group role tied to its visible label", () => {
  const english = renderPrimaryNavigation({ locale: "en", page: "home" });
  const turkish = renderPrimaryNavigation({ locale: "tr", page: "home" });

  assert.match(
    english,
    /<div class="nav-links__group" data-nav-group="horizon" role="group" aria-labelledby="nav-horizon-label-en">\s*<span class="nav-links__section" id="nav-horizon-label-en">The horizon<\/span>/,
  );
  assert.match(
    english,
    /<div class="nav-links__group" data-nav-group="private" role="group" aria-labelledby="nav-private-label-en">\s*<span class="nav-links__section" id="nav-private-label-en">Private systems<\/span>/,
  );
  assert.match(
    turkish,
    /<div class="nav-links__group" data-nav-group="horizon" role="group" aria-labelledby="nav-horizon-label-tr">\s*<span class="nav-links__section" id="nav-horizon-label-tr">Ufuk<\/span>/,
  );
  assert.match(
    turkish,
    /<div class="nav-links__group" data-nav-group="private" role="group" aria-labelledby="nav-private-label-tr">\s*<span class="nav-links__section" id="nav-private-label-tr">Özel sistemler<\/span>/,
  );
});

test("renders five localized living-system links in chronological meaning order", () => {
  const english = renderLivingSystem({ locale: "en" });
  const turkish = renderLivingSystem({ locale: "tr" });

  assert.deepEqual(livingSystemCards(english), [
    { href: "/#journey", eyebrow: "Journey", heading: "Past", description: "The work behind me is a traceable journey from physical systems to AI." },
    { href: "/now/", eyebrow: "Active", heading: "Now", description: "A dated view of where my attention and work are going now." },
    { href: "/#horizon", eyebrow: "Horizon", heading: "Future", description: "The long-term direction is open humanoid engineering in the physical world." },
    { href: "/memory/", eyebrow: "Published", heading: "Knowledge", description: "Only explicitly approved public memory snapshots appear here." },
    { href: "/#apps", eyebrow: "Working outputs", heading: "Applications", description: "Accumulated knowledge becomes focused applications, labs, and long-term work." },
  ]);
  assert.deepEqual(livingSystemCards(turkish), [
    { href: "/tr/#journey", eyebrow: "Yolculuk", heading: "Geçmiş", description: "Geride kalan çalışmalar, fiziksel sistemlerden AI&apos;a uzanan izlenebilir bir yolculuktur." },
    { href: "/tr/now/", eyebrow: "Aktif", heading: "Şimdi", description: "Dikkatimin ve çalışmalarımın şimdi nereye yöneldiğini gösteren tarihli bir görünüm." },
    { href: "/tr/#horizon", eyebrow: "Ufuk", heading: "Gelecek", description: "Uzun vadeli yön, fiziksel dünyada açık insansı robot mühendisliğidir." },
    { href: "/tr/memory/", eyebrow: "Yayınlanan", heading: "Bilgi", description: "Burada yalnızca açıkça onaylanmış kamusal hafıza kayıtları görünür." },
    { href: "/tr/#apps", eyebrow: "Çalışan çıktılar", heading: "Uygulamalar", description: "Birikmiş bilgi; odaklı uygulamalara, laboratuvarlara ve uzun vadeli çalışmalara dönüşür." },
  ]);
});

test("renders honest localized empty public-memory routes with Knowledge current", async () => {
  const data = await readFixtureData();
  const english = renderDocument({ html: memoryDocument(), page: "memory", locale: "en", data, today });
  const turkish = renderDocument({ html: memoryDocument(), page: "memory", locale: "tr", data, today });

  assert.equal(
    renderPublicMemory({ locale: "en", data }),
    '      <p class="memory-empty">No public memory snapshots have been approved yet.</p>',
  );
  assert.equal(
    renderPublicMemory({ locale: "tr", data }),
    '      <p class="memory-empty">Henüz onaylanmış kamusal hafıza kaydı yok.</p>',
  );
  assert.match(english, /No public memory snapshots have been approved yet\./);
  assert.match(turkish, /Henüz onaylanmış kamusal hafıza kaydı yok\./);
  assert.doesNotMatch(english, /<(?:base|form|input)\b/i);
  assert.doesNotMatch(turkish, /<(?:base|form|input)\b/i);
  assert.deepEqual(primaryLinks(english).filter((link) => link.current), [
    { href: "/memory/", label: "Knowledge", current: true },
  ]);
  assert.deepEqual(primaryLinks(turkish).filter((link) => link.current), [
    { href: "/tr/memory/", label: "Bilgi", current: true },
  ]);
});

test("renders populated public-memory allowlist cards with localized evidence and absolute dates", async () => {
  const data = await readFixtureData();
  data.applications.find((application) => application.code === "aia").relatedMemoryIds = ["living-system-decision"];
  data.publicMemory = [{
    id: "living-system-decision",
    type: "decision",
    visibility: "public",
    title: { en: "A deliberate public memory", tr: "Bilinçli bir kamusal hafıza" },
    summary: {
      en: "A reviewed decision shared without exposing the private vault.",
      tr: "Özel kasayı açığa çıkarmadan paylaşılan, incelenmiş bir karar.",
    },
    publishedAt: "2026-08-20",
    updatedAt: "2026-08-25",
    sourceUrl: "https://nxt.aserdargun.com/p/approved-snapshot-01",
    sourceLabel: "NXT public snapshot",
    relatedApplicationCodes: ["aia"],
    tags: ["Living systems", "Decision log"],
    evidenceUrls: ["https://example.com/evidence/public-memory"],
  }];

  const english = renderDocument({ html: memoryDocument(), page: "memory", locale: "en", data, today });
  const turkish = renderDocument({ html: memoryDocument(), page: "memory", locale: "tr", data, today });

  assert.match(english, /<article class="memory-card" id="memory-living-system-decision" data-memory-id="living-system-decision">/);
  assert.match(english, /<p class="memory-card__type">Decision<\/p>/);
  assert.match(turkish, /<p class="memory-card__type">Karar<\/p>/);
  assert.match(english, /<h2>A deliberate public memory<\/h2>/);
  assert.match(turkish, /<h2>Bilinçli bir kamusal hafıza<\/h2>/);
  assert.match(english, /A reviewed decision shared without exposing the private vault\./);
  assert.match(turkish, /Özel kasayı açığa çıkarmadan paylaşılan, incelenmiş bir karar\./);
  for (const html of [english, turkish]) {
    assert.match(html, /<time datetime="2026-08-20">2026-08-20<\/time>/);
    assert.match(html, /<time datetime="2026-08-25">2026-08-25<\/time>/);
    assert.match(html, /<li>Living systems<\/li>/);
    assert.match(html, /<li>Decision log<\/li>/);
    assert.match(html, /<a[^>]+href="https:\/\/aia\.aserdargun\.com\/"[^>]*><code>aia<\/code>/);
    assert.match(html, /<a[^>]+href="https:\/\/example\.com\/evidence\/public-memory"[^>]*>/);
    assert.match(html, /<a[^>]+href="https:\/\/nxt\.aserdargun\.com\/p\/approved-snapshot-01"[^>]*>NXT public snapshot/);
    assert.doesNotMatch(html, /<(?:base|form|input)\b|type=["']search["']/i);
  }
});

test("omits empty public-memory optional groups and never serializes non-allowlisted properties", async () => {
  const data = await readFixtureData();
  data.publicMemory = [{
    id: "minimal-public-memory",
    type: "learning",
    visibility: "public",
    title: { en: "Escaped <memory>", tr: "Kaçışlı <hafıza>" },
    summary: { en: "Public summary", tr: "Kamusal özet" },
    publishedAt: "2026-08-20",
    updatedAt: "2026-08-20",
    sourceUrl: "https://nxt.aserdargun.com/p/minimal-snapshot",
    sourceLabel: "Read snapshot",
    relatedApplicationCodes: [],
    tags: [],
    evidenceUrls: [],
  }];
  const renderInput = structuredClone(data);
  renderInput.publicMemory[0].privateNote = "FORBIDDEN_PRIVATE_VALUE_7";

  const rendered = renderPublicMemory({ locale: "en", data: renderInput });

  assert.match(rendered, /<h2>Escaped &lt;memory&gt;<\/h2>/);
  assert.doesNotMatch(rendered, /memory-card__(?:tags|related|evidence)/);
  assert.doesNotMatch(rendered, /FORBIDDEN_PRIVATE_VALUE_7|privateNote/);
  assert.match(rendered, /href="https:\/\/nxt\.aserdargun\.com\/p\/minimal-snapshot"/);
});

test("renderSite rejects browser-inert or base-rewritten public-memory documents", async (t) => {
  const cases = [
    ["hidden memory index", { indexAttributes: " hidden" }],
    ["inert memory ancestor", { bodyPrefix: "<div inert>", indexAttributes: "", bodySuffix: "</div>" }],
    ["active base", { head: '<base href="https://example.invalid/rewritten/">' }],
    ["active plaintext", { bodyPrefix: "<plaintext></plaintext>" }],
  ];

  for (const [name, options] of cases) {
    await t.test(name, async (caseTest) => {
      const fixtureDir = await createSiteFixture();
      caseTest.after(() => rm(fixtureDir, { recursive: true, force: true }));
      const validDocument = completeMemoryDocument();
      await writeFile(path.join(fixtureDir, "tr", "memory", "index.html"), validDocument.replaceAll('lang="en" data-locale="en"', 'lang="tr" data-locale="tr"'));
      let document = completeMemoryDocument(options);
      if (options.bodySuffix) document = document.replace("</body>", `${options.bodySuffix}</body>`);
      await writeFile(path.join(fixtureDir, "memory", "index.html"), document);
      const data = await readFixtureData();

      await assert.rejects(
        renderSite({ rootDir: fixtureDir, data, today }),
        /public memory|memory index|hidden|inert|base|plaintext|visible|structure/i,
      );
    });
  }
});

test("sitemap exposes only the reciprocal bilingual public-memory index routes", async () => {
  const sitemap = await readFile(path.join(rootDir, "sitemap.xml"), "utf8");
  const memoryLocations = Array.from(
    sitemap.matchAll(/<loc>(https:\/\/aserdargun\.com\/[^<]*memory\/[^<]*)<\/loc>/g),
    (match) => match[1],
  );
  assert.deepEqual(memoryLocations, [
    "https://aserdargun.com/memory/",
    "https://aserdargun.com/tr/memory/",
  ]);

  for (const location of memoryLocations) {
    const entry = sitemap.match(new RegExp(`<url>\\s*<loc>${location.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}<\\/loc>[\\s\\S]*?<\\/url>`))?.[0] ?? "";
    assert.match(entry, /hreflang="en" href="https:\/\/aserdargun\.com\/memory\/"/);
    assert.match(entry, /hreflang="tr" href="https:\/\/aserdargun\.com\/tr\/memory\/"/);
    assert.match(entry, /hreflang="x-default" href="https:\/\/aserdargun\.com\/memory\/"/);
  }
  assert.doesNotMatch(sitemap, /https:\/\/nxt\.aserdargun\.com\/p\//);
});

test("public HTML privacy diagnostics name files and forbidden fields without secret values", () => {
  assert.equal(typeof rendererModule.scanPublicHtmlPrivacy, "function");
  const secrets = [
    "OWNER_PROMPT_SECRET_7",
    "PRIVATE_NOTE_SECRET_7",
    "DRIVE_FILE_SECRET_7",
    "OAUTH_TOKEN_SECRET_7",
  ];
  const html = `<main
    data-owner-prompt="${secrets[0]}"
    data-private-note="${secrets[1]}"
    data-drive-file-id="${secrets[2]}"
    data-oauth-token="${secrets[3]}"></main>
    <script type="application/json">{"visibility":"owner-only"}</script>`;

  const diagnostics = rendererModule.scanPublicHtmlPrivacy({
    relativePath: "memory/index.html",
    html,
  });

  assert.deepEqual(diagnostics, [
    "file=memory/index.html forbidden=ownerPrompt",
    "file=memory/index.html forbidden=privateNote",
    "file=memory/index.html forbidden=driveFileId",
    "file=memory/index.html forbidden=oauthToken",
    "file=memory/index.html forbidden=visibility",
  ]);
  for (const secret of secrets) assert.doesNotMatch(diagnostics.join("\n"), new RegExp(secret));
});

test("repository-wide public HTML privacy scan covers nested routes and skips non-public directories", async (t) => {
  assert.equal(typeof rendererModule.scanPublicHtmlFiles, "function");
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "public-html-privacy-"));
  t.after(() => rm(fixtureDir, { recursive: true, force: true }));
  await mkdir(path.join(fixtureDir, "nested"), { recursive: true });
  await mkdir(path.join(fixtureDir, "node_modules", "private"), { recursive: true });
  await mkdir(path.join(fixtureDir, ".superpowers"), { recursive: true });
  await writeFile(path.join(fixtureDir, "index.html"), "<main>public</main>");
  await writeFile(path.join(fixtureDir, "nested", "index.html"), '<main data-private-content="NESTED_PRIVATE_SECRET_7"></main>');
  await writeFile(path.join(fixtureDir, "node_modules", "private", "index.html"), '<main data-oauth-token="IGNORED_SECRET_7"></main>');
  await writeFile(path.join(fixtureDir, ".superpowers", "index.html"), '<main data-owner-prompt="IGNORED_SECRET_8"></main>');

  const diagnostics = await rendererModule.scanPublicHtmlFiles(fixtureDir);

  assert.deepEqual(diagnostics, ["file=nested/index.html forbidden=privateContent"]);
  assert.doesNotMatch(diagnostics.join("\n"), /NESTED_PRIVATE_SECRET_7|IGNORED_SECRET/);
});

test("public-memory cards have a responsive two-column-to-one-column style contract", async () => {
  const styles = await readFile(path.join(rootDir, "styles.css"), "utf8");

  assert.match(styles, /\.memory-list\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s);
  assert.match(styles, /\.memory-card\s*\{[^}]*min-width:\s*0;[^}]*border:\s*1px solid var\(--line-dark\);/s);
  assert.match(styles, /\.memory-card__tags\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;/s);
  assert.match(styles, /@media \(max-width:\s*900px\)[\s\S]*?\.memory-list\s*\{[^}]*grid-template-columns:\s*1fr;/);
});

test("replaces exactly one named block and preserves surrounding bytes", () => {
  const html = "before\n<!-- GENERATED:application-map:start -->\nold\n<!-- GENERATED:application-map:end -->\nafter\n";

  assert.equal(
    replaceGeneratedBlock(html, "application-map", "<table>new</table>"),
    "before\n<!-- GENERATED:application-map:start -->\n<table>new</table>\n<!-- GENERATED:application-map:end -->\nafter\n",
  );
});

test("rejects absent markers", () => {
  assert.throws(
    () => replaceGeneratedBlock("<main></main>", "application-map", "x"),
    /exactly one/,
  );
});

test("rejects duplicate and unknown generated markers", () => {
  const duplicate = "<!-- GENERATED:application-map:start --><!-- GENERATED:application-map:end --><!-- GENERATED:application-map:start --><!-- GENERATED:application-map:end -->";
  assert.throws(() => replaceGeneratedBlock(duplicate, "application-map", "x"), /exactly one/);
  assert.throws(() => replaceGeneratedBlock("", "unknown", "x"), /Unknown/);
});

test("escapes application data derived from the public manifest", async () => {
  const data = await readFixtureData();
  data.applications[0].title.en = "<script>alert(1)</script> & \"quoted\" 'single'";

  const rendered = renderDocument({
    html: homeDocument(),
    page: "home",
    locale: "en",
    data,
    today,
  });

  assert.match(rendered, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; &quot;quoted&quot; &apos;single&apos;/);
  assert.equal(rendered.includes("<script>alert(1)</script>"), false);
});

test("renders application codes and empty relationship blocks with locale parity", async () => {
  const data = await readFixtureData();
  const english = renderDocument({ html: homeDocument(), page: "home", locale: "en", data, today });
  const turkish = renderDocument({ html: homeDocument(), page: "home", locale: "tr", data, today });
  const codes = (html) => Array.from(html.matchAll(/<th scope="row"><code>([a-z]{3})<\/code><\/th>/g), (match) => match[1]);
  const relationshipCount = (html) => (html.match(/<article\b/g) ?? []).length;

  assert.deepEqual(codes(english), codes(turkish));
  assert.equal(relationshipCount(english), relationshipCount(turkish));
  assert.equal(relationshipCount(english), 0);
  for (const html of [english, turkish]) {
    assert.doesNotMatch(html, /app-guiding-question|app-next-direction|app-related-memory/);
    assert.doesNotMatch(html, /Guiding question|Yönlendirici soru|Next direction|Sonraki yön|Related knowledge|İlgili bilgi/);
  }
});

test("renders the HNS and SEC product kinds as observatories in both locales", async () => {
  const data = await readFixtureData();
  const english = renderDocument({ html: homeDocument(), page: "home", locale: "en", data, today });
  const turkish = renderDocument({ html: homeDocument(), page: "home", locale: "tr", data, today });

  assert.match(english, /<strong>Harness Engineering Observatory<\/strong>[\s\S]*?<dt>Kind<\/dt><dd>Observatory<\/dd>/);
  assert.match(turkish, /<strong>Harness Engineering Observatory<\/strong>[\s\S]*?<dt>Tür<\/dt><dd>Gözlemevi<\/dd>/);
  assert.match(english, /<strong>AI Systems Security Observatory<\/strong>[\s\S]*?<dt>Kind<\/dt><dd>Observatory<\/dd>/);
  assert.match(turkish, /<strong>AI Sistemleri Güvenlik Gözlemevi<\/strong>[\s\S]*?<dt>Tür<\/dt><dd>Gözlemevi<\/dd>/);
});

test("renders only approved localized application enrichment and reciprocal memory links", async () => {
  const data = await readFixtureData();
  const application = data.applications.find((candidate) => candidate.code === "aia");
  application.guidingQuestion = {
    en: "Which evidence changes the comparison?",
    tr: "Hangi kanıt karşılaştırmayı değiştirir?",
  };
  application.nextDirection = {
    en: "Connect reviewed decisions to the atlas.",
    tr: "İncelenmiş kararları atlasa bağla.",
  };
  application.relatedMemoryIds = ["decision-x"];
  data.publicMemory = [{
    id: "decision-x",
    type: "decision",
    visibility: "public",
    title: { en: "Comparison evidence decision", tr: "Karşılaştırma kanıtı kararı" },
    summary: { en: "Approved public summary.", tr: "Onaylanmış kamusal özet." },
    publishedAt: "2026-08-25",
    updatedAt: "2026-08-25",
    sourceUrl: "https://nxt.aserdargun.com/p/decision-x-public",
    sourceLabel: "NXT public snapshot",
    relatedApplicationCodes: ["aia"],
    tags: [],
    evidenceUrls: [],
  }];

  const english = renderDocument({ html: homeDocument(), page: "home", locale: "en", data, today });
  const turkish = renderDocument({ html: homeDocument(), page: "home", locale: "tr", data, today });

  assert.match(english, /<dt>Kind<\/dt><dd>Atlas<\/dd>/);
  assert.match(english, /<dt>Status<\/dt><dd>Live<\/dd>/);
  assert.match(turkish, /<dt>Tür<\/dt><dd>Atlas<\/dd>/);
  assert.match(turkish, /<dt>Durum<\/dt><dd>Yayında<\/dd>/);
  assert.match(english, /<strong>Guiding question<\/strong>Which evidence changes the comparison\?/);
  assert.match(turkish, /<strong>Yönlendirici soru<\/strong>Hangi kanıt karşılaştırmayı değiştirir\?/);
  assert.match(english, /<strong>Next direction<\/strong>Connect reviewed decisions to the atlas\./);
  assert.match(turkish, /<strong>Sonraki yön<\/strong>İncelenmiş kararları atlasa bağla\./);
  for (const html of [english, turkish]) {
    assert.match(html, /<time datetime="2026-08-25">2026-08-25<\/time>/);
    assert.match(html, /class="app-related-memory__count">1 (?:record|kayıt)<\/span>/);
  }
  assert.match(english, /href="\/memory\/#memory-decision-x">Comparison evidence decision<\/a>/);
  assert.match(turkish, /href="\/tr\/memory\/#memory-decision-x">Karşılaştırma kanıtı kararı<\/a>/);
});

test("attaches supplied journey evidence to an existing stage without deriving missing fields", async () => {
  const populated = await readFixtureData();
  populated.journeyEvidence = [{
    stage: "01",
    period: "1999–2003",
    decision: {
      en: "Choose mechanics as the foundation.",
      tr: "Temel olarak mekaniği seç.",
    },
    evidenceUrls: ["https://example.com/evidence/mechanics"],
    relatedApplicationCodes: ["aia"],
  }];
  assert.throws(
    () => renderDocument({ html: homeDocument(), page: "home", locale: "en", data: populated, today }),
    /journeyEvidence\[01\] requires exactly one active career stage target #journey-stage-01/,
  );
  const english = renderDocument({ html: homeDocumentWithJourneyStage(), page: "home", locale: "en", data: populated, today });
  const turkish = renderDocument({ html: homeDocumentWithJourneyStage(), page: "home", locale: "tr", data: populated, today });

  assert.match(english, /<article class="journey-evidence-card" data-journey-stage="01">/);
  assert.match(english, /href="#journey-stage-01">Stage 01<\/a>/);
  assert.match(turkish, /href="#journey-stage-01">Aşama 01<\/a>/);
  assert.match(english, /Choose mechanics as the foundation\./);
  assert.match(turkish, /Temel olarak mekaniği seç\./);
  for (const html of [english, turkish]) {
    assert.match(html, /class="journey-evidence-card__period">1999–2003<\/p>/);
    assert.match(html, /href="https:\/\/example\.com\/evidence\/mechanics"/);
    assert.match(html, /href="https:\/\/aia\.aserdargun\.com\/"/);
  }

  const minimal = await readFixtureData();
  minimal.journeyEvidence = [{
    stage: "01",
    period: null,
    decision: { en: "Verified decision.", tr: "Doğrulanmış karar." },
    evidenceUrls: [],
    relatedApplicationCodes: [],
  }];
  const minimalHtml = renderDocument({ html: homeDocumentWithJourneyStage(), page: "home", locale: "en", data: minimal, today });
  assert.match(minimalHtml, /Verified decision\./);
  assert.doesNotMatch(minimalHtml, /journey-evidence-card__(?:period|evidence|applications)/);
});

test("attaches approved journey evidence through the actual bilingual home documents", async () => {
  const data = await readFixtureData();
  data.journeyEvidence = [{
    stage: "01",
    period: null,
    decision: {
      en: "Verified mechanical engineering foundation.",
      tr: "Doğrulanmış makine mühendisliği temeli.",
    },
    evidenceUrls: [],
    relatedApplicationCodes: [],
  }];
  const cases = [
    {
      locale: "en",
      filePath: path.join(rootDir, "index.html"),
      stageLabel: "Stage 01",
      decision: "Verified mechanical engineering foundation.",
    },
    {
      locale: "tr",
      filePath: path.join(rootDir, "tr", "index.html"),
      stageLabel: "Aşama 01",
      decision: "Doğrulanmış makine mühendisliği temeli.",
    },
  ];

  for (const { locale, filePath, stageLabel, decision } of cases) {
    const html = await readFile(filePath, "utf8");
    const rendered = renderDocument({ html, page: "home", locale, data, today });
    assert.match(rendered, new RegExp(`href="#journey-stage-01">${stageLabel}<\\/a>`));
    assert.match(rendered, new RegExp(`<p class="journey-evidence-card__decision">${decision.replace(".", "\\.")}<\\/p>`));
  }
});

test("accepts self-closing SVG descendants only in established SVG foreign content", async () => {
  const data = await readFixtureData();
  data.journeyEvidence = [{
    stage: "01",
    period: null,
    decision: { en: "Verified decision.", tr: "Doğrulanmış karar." },
    evidenceUrls: [],
    relatedApplicationCodes: [],
  }];
  const target = '<li class="timeline-step" data-timeline-step id="journey-stage-01"></li>';
  const svg = '<svg viewBox="0 0 10 10"><g><path d="M0 0L1 1"/><circle cx="2" cy="2" r="1"/><rect x="3" y="3" width="1" height="1"/><svg><g><path d="M4 4L5 5"/></g></svg></g></svg>';
  const validDocument = completeHomeDocument({ bodyContent: `${svg}${journeyScope(target)}` });
  assert.match(
    renderJourneyEvidence({ locale: "en", data, documentHtml: validDocument }),
    /href="#journey-stage-01">Stage 01<\/a>/,
  );

  const invalidDocuments = [
    ["ordinary HTML non-void", completeHomeDocument({ bodyContent: `<div/>${journeyScope(target)}` })],
    ["self-closing SVG root without foreign ancestry", completeHomeDocument({ bodyContent: `<svg/>${journeyScope(target)}` })],
    ["HTML inside SVG foreignObject", completeHomeDocument({ bodyContent: `<svg><foreignObject><div/></foreignObject></svg>${journeyScope(target)}` })],
  ];
  for (const [name, documentHtml] of invalidDocuments) {
    assert.throws(
      () => renderJourneyEvidence({ locale: "en", data, documentHtml }),
      /journeyEvidence\[01\] requires exactly one active career stage target #journey-stage-01/,
      name,
    );
  }
});

test("requires exactly one active structural career-stage target for journey evidence", async (t) => {
  const data = await readFixtureData();
  data.journeyEvidence = [{
    stage: "01",
    period: null,
    decision: { en: "Verified decision.", tr: "Doğrulanmış karar." },
    evidenceUrls: [],
    relatedApplicationCodes: [],
  }];
  const validMarkup = '<li class="timeline-step" data-timeline-step id="journey-stage-01"></li>';
  assert.match(
    renderJourneyEvidence({ locale: "en", data, documentHtml: homeDocumentWithJourneyMarkup(validMarkup) }),
    /href="#journey-stage-01">Stage 01<\/a>/,
  );

  const invalidCases = [
    ["data-id substring", '<li class="timeline-step" data-timeline-step data-id="journey-stage-01"></li>'],
    ["comment", '<!-- <li class="timeline-step" data-timeline-step id="journey-stage-01"></li> -->'],
    ["script raw text", '<script><li class="timeline-step" data-timeline-step id="journey-stage-01"></li></script>'],
    ["style raw text", '<style><li class="timeline-step" data-timeline-step id="journey-stage-01"></li></style>'],
    ["plaintext browser raw text", '<plaintext><li class="timeline-step" data-timeline-step id="journey-stage-01"></li></plaintext>'],
    ["template subtree", '<template><li class="timeline-step" data-timeline-step id="journey-stage-01"></li></template>'],
    ["hidden ancestor", '<section hidden><li class="timeline-step" data-timeline-step id="journey-stage-01"></li></section>'],
    ["inert ancestor", '<section inert><li class="timeline-step" data-timeline-step id="journey-stage-01"></li></section>'],
    ["aria-hidden ancestor", '<section aria-hidden="true"><li class="timeline-step" data-timeline-step id="journey-stage-01"></li></section>'],
    ["hidden stage", '<li class="timeline-step" data-timeline-step id="journey-stage-01" hidden></li>'],
    ["inert stage", '<li class="timeline-step" data-timeline-step id="journey-stage-01" inert></li>'],
    ["unrelated element", '<div class="timeline-step" data-timeline-step id="journey-stage-01"></div>'],
    ["missing timeline-step class", '<li data-timeline-step id="journey-stage-01"></li>'],
    ["missing data-timeline-step", '<li class="timeline-step" id="journey-stage-01"></li>'],
    ["duplicate exact IDs", `${validMarkup}${validMarkup}`],
  ];

  for (const [name, markup] of invalidCases) {
    await t.test(name, () => {
      assert.throws(
        () => renderJourneyEvidence({ locale: "en", data, documentHtml: homeDocumentWithJourneyMarkup(markup) }),
        /journeyEvidence\[01\] requires exactly one active career stage target #journey-stage-01/,
      );
    });
  }
});

test("rejects journey targets outside one valid active body and generated journey scope", async (t) => {
  const data = await readFixtureData();
  data.journeyEvidence = [{
    stage: "01",
    period: null,
    decision: { en: "Verified decision.", tr: "Doğrulanmış karar." },
    evidenceUrls: [],
    relatedApplicationCodes: [],
  }];
  const target = '<li class="timeline-step" data-timeline-step id="journey-stage-01"></li>';
  const scopedTarget = journeyScope(target);
  const validDocument = completeHomeDocument({ bodyContent: scopedTarget });
  assert.match(
    renderJourneyEvidence({ locale: "en", data, documentHtml: validDocument }),
    /href="#journey-stage-01">Stage 01<\/a>/,
  );

  const invalidDocuments = [
    ["head-only target", completeHomeDocument({ head: scopedTarget })],
    ["target after closing body", completeHomeDocument({ afterBody: scopedTarget })],
    ["target after closing html", completeHomeDocument({ afterHtml: scopedTarget })],
    ["top-level sibling root", `${validDocument}<div></div>`],
    ["second html root", `${validDocument}<html><head></head><body></body></html>`],
    ["second body", validDocument.replace("</body>", "</body><body></body>")],
    ["second html inside root", validDocument.replace("</body>", "<html><head></head><body></body></html></body>")],
    ["head after body", validDocument.replace("</body>", "</body><head></head>")],
    ["unclosed body", validDocument.replace("</body>", "")],
    ["unclosed html", validDocument.replace("</html>", "")],
    ["target directly under body", completeHomeDocument({ bodyContent: target })],
    ["target in wrong journey element", completeHomeDocument({ bodyContent: `<section class="story-content" id="journey"><ol class="timeline" data-timeline>${target}</ol></section>` })],
    ["target outside journey scope", completeHomeDocument({ bodyContent: `<ol class="timeline" data-timeline>${target}</ol>` })],
    ["target outside timeline", completeHomeDocument({ bodyContent: `<div class="story-content" id="journey">${target}</div>` })],
    ["timeline missing class", completeHomeDocument({ bodyContent: `<div class="story-content" id="journey"><ol data-timeline>${target}</ol></div>` })],
    ["timeline missing data attribute", completeHomeDocument({ bodyContent: `<div class="story-content" id="journey"><ol class="timeline">${target}</ol></div>` })],
    ["duplicate journey scope", completeHomeDocument({ bodyContent: `${scopedTarget}${journeyScope("")}` })],
  ];

  for (const [name, documentHtml] of invalidDocuments) {
    await t.test(name, () => {
      assert.throws(
        () => renderJourneyEvidence({ locale: "en", data, documentHtml }),
        /journeyEvidence\[01\] requires exactly one active career stage target #journey-stage-01/,
      );
    });
  }
});

test("omits the entire journey-evidence UI when canonical evidence is empty", async () => {
  const data = await readFixtureData();
  assert.equal(renderJourneyEvidence({ locale: "en", data, documentHtml: homeDocument() }), "");
  const rendered = renderDocument({ html: homeDocument(), page: "home", locale: "en", data, today });
  assert.doesNotMatch(rendered, /journey-evidence(?:-card|__)/);
});

test("application enrichment and journey evidence have responsive style contracts", async () => {
  const styles = await readFile(path.join(rootDir, "styles.css"), "utf8");
  assert.match(styles, /\.app-record-meta\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;/s);
  assert.match(styles, /\.app-related-memory\s*\{[^}]*margin-top:/s);
  assert.match(styles, /\.journey-evidence-list\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s);
  assert.match(styles, /@media \(max-width:\s*900px\)[\s\S]*?\.journey-evidence-list\s*\{[^}]*grid-template-columns:\s*1fr;/);
});

test("renders absolute application freshness with an accessible, derived current state", async () => {
  const data = await readFixtureData();
  const rendered = renderDocument({ html: homeDocument(), page: "home", locale: "en", data, today });

  assert.match(
    rendered,
    /<span class="freshness freshness--current" data-freshness-date="2026-09-02" data-freshness-state="current">[\s\S]*?<time datetime="2026-09-02">2026-09-02<\/time>[\s\S]*?<\/span>/,
  );
  assert.match(rendered, /<span class="freshness-label">Current<\/span>/);
  assert.equal(rendered.includes("today"), false);
  assert.equal(rendered.includes("bugün"), false);
});

test("renders Now freshness from its canonical date at current and needs-refresh boundaries", async () => {
  const data = await readFixtureData();
  data.applications.find((application) => application.code === "lcl").updatedAt = "2026-08-28";
  data.applications.find((application) => application.code === "wfm").updatedAt = "2026-08-28";
  data.applications.find((application) => application.code === "hns").updatedAt = "2026-08-28";
  data.applications.find((application) => application.code === "sec").updatedAt = "2026-08-28";
  data.applications.find((application) => application.code === "ctx").updatedAt = "2026-08-28";
  data.applications.find((application) => application.code === "evl").updatedAt = "2026-08-28";
  const current = renderDocument({
    html: nowDocument(),
    page: "now",
    locale: "en",
    data,
    today: new Date("2026-08-28T12:00:00Z"),
  });
  const needsRefresh = renderDocument({
    html: nowDocument(),
    page: "now",
    locale: "tr",
    data,
    today: new Date("2026-09-05T12:00:00Z"),
  });

  assert.match(
    current,
    /<span class="freshness freshness--current" data-freshness-date="2026-08-21" data-freshness-state="current">[\s\S]*?<span class="freshness-label">Current<\/span>[\s\S]*?<time datetime="2026-08-21">2026-08-21<\/time>[\s\S]*?<\/span>/,
  );
  assert.match(
    needsRefresh,
    /<span class="freshness freshness--needs-refresh" data-freshness-date="2026-08-21" data-freshness-state="needs-refresh">[\s\S]*?<span class="freshness-label">Yenilenmeli<\/span>[\s\S]*?<time datetime="2026-08-21">2026-08-21<\/time>[\s\S]*?<\/span>/,
  );
});

test("renders the application-map summary from semantic roles", async () => {
  const data = await readFixtureData();
  const rendered = renderDocument({ html: homeDocument(), page: "home", locale: "en", data, today });

  assert.match(rendered, /Ten core learning applications, one lab, one horizon bridge, and one long-term horizon\./);
  assert.equal(rendered.includes("Five live applications and one long-term horizon"), false);
});

test("preserves the complete localized Now tag sets", async () => {
  const data = await readFixtureData();
  const tags = (html) => Array.from(html.matchAll(/<li>([^<]+)<\/li>/g), (match) => match[1]);
  const english = renderDocument({ html: nowDocument(), page: "now", locale: "en", data, today });
  const turkish = renderDocument({ html: nowDocument(), page: "now", locale: "tr", data, today });

  assert.deepEqual(tags(english), [
    "GPU memory bandwidth", "PagedAttention", "KV cache", "Atlas cross-references",
    "Learning system", "Guiding questions", "Investment bar", "Evidence flow",
    "Traceability", "Human review", "Deployment constraints", "Operator-first",
  ]);
  assert.deepEqual(tags(turkish), [
    "GPU bellek bant genişliği", "PagedAttention", "KV cache", "Atlas çapraz referansları",
    "Öğrenme sistemi", "Yönlendirici sorular", "Yatırım çubuğu", "Kanıt akışı",
    "İzlenebilirlik", "İnsan incelemesi", "Dağıtım kısıtları", "Operatör-odaklı",
  ]);
});

test("renders existing bilingual Now archives newest-first on current pages", async () => {
  const data = await readFixtureData();
  const archiveLinks = [
    { week: "2026-W32", updatedAt: "2026-08-07" },
    { week: "2026-W34", updatedAt: "2026-08-21" },
  ];
  const english = renderNowContent({ locale: "en", data, today, archiveLinks });
  const turkish = renderNowContent({ locale: "tr", data, today, archiveLinks });

  assert.deepEqual(
    Array.from(english.matchAll(/<a class="now-archive-link" href="([^"]+)">([^<]+)<\/a>/g), (match) => [match[1], match[2]]),
    [
      ["/now/archive/2026-W34/", "2026-W34"],
      ["/now/archive/2026-W32/", "2026-W32"],
    ],
  );
  assert.deepEqual(
    Array.from(turkish.matchAll(/<a class="now-archive-link" href="([^"]+)">([^<]+)<\/a>/g), (match) => [match[1], match[2]]),
    [
      ["/tr/now/archive/2026-W34/", "2026-W34"],
      ["/tr/now/archive/2026-W32/", "2026-W32"],
    ],
  );
  assert.match(english, /Weekly archives/);
  assert.match(turkish, /Haftalık arşivler/);
  assert.match(english, /<time datetime="2026-08-21">2026-08-21<\/time>/);
  assert.match(turkish, /<time datetime="2026-08-07">2026-08-07<\/time>/);
});

test("filesystem archive discovery rejects a missing localized index stub", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await rm(path.join(fixtureDir, "tr", "now", "archive", "2026-W34", "index.html"));

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /missing|ENOENT/i,
  );
});

test("filesystem archive discovery rejects a directory and document week mismatch", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => (
    html.replace('data-archive-week="2026-W34"', 'data-archive-week="2026-W33"')
  ));

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /week/i,
  );
});

test("filesystem archive discovery rejects a localized document marker mismatch", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => (
    html.replace('<html lang="en" data-locale="en">', '<html lang="tr" data-locale="tr">')
  ));

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /locale/i,
  );
});

test("filesystem archive discovery rejects canonical and hreflang pair mismatch", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => (
    html.replace(
      '<link rel="canonical" href="https://aserdargun.com/now/archive/2026-W34/">',
      '<link rel="canonical" href="https://aserdargun.com/now/archive/broken/">',
    )
  ));

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /canonical|hreflang/i,
  );
});

test("filesystem archive discovery rejects the wrong expected sitemap update date", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "sitemap.xml", (xml) => (
    xml.replaceAll("<lastmod>2026-08-21</lastmod>", "<lastmod>2026-08-20</lastmod>")
  ));

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /update date|lastmod/i,
  );
});

test("filesystem archive discovery rejects an incomplete shared header and Now navigation contract", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "tr/now/archive/2026-W34/index.html", (html) => (
    html.replace(' href="/tr/now/" aria-current="page"', ' href="/tr/now/"')
  ));

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /header|navigation|current/i,
  );
});

test("filesystem archive discovery rejects review gap: missing primary navigation accessible name", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => (
    html.replace(' aria-label="Primary navigation"', "")
  ));

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /navigation|accessible name|aria-label/i,
  );
});

test("filesystem archive discovery rejects review gap: a second conflicting canonical link", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => (
    html.replace(
      '<link rel="canonical" href="https://aserdargun.com/now/archive/2026-W34/">',
      '<link rel="canonical" href="https://aserdargun.com/now/archive/2026-W34/">\n  <link rel="canonical" href="https://aserdargun.com/now/archive/conflict/">',
    )
  ));

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /canonical/i,
  );
});

test("filesystem archive discovery rejects review gap: a visible update time that differs", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "tr/now/archive/2026-W34/index.html", (html) => (
    html.replace(
      '<time datetime="2026-08-21">2026-08-21</time>',
      '<time datetime="2026-08-20">2026-08-20</time>',
    )
  ));

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /time|update date|lastmod/i,
  );
});

test("filesystem archive discovery rejects every shared header accessibility contract mutation", async (t) => {
  const englishJourney = '    <a class="nav-links__primary-link" href="/#journey">Journey</a>';
  const englishNow = '    <a class="nav-links__primary-link" href="/now/" aria-current="page">Now</a>';
  const mutations = [
    ["missing language navigation accessible name", (html) => html.replace(' aria-label="Language selection"', "")],
    ["wrong primary link order", (html) => html.replace(`${englishJourney}\n${englishNow}`, `${englishNow}\n${englishJourney}`)],
    ["broken group label relationship", (html) => html.replace('aria-labelledby="nav-horizon-label-en"', 'aria-labelledby="missing-group-label"')],
    ["missing new-tab noreferrer", (html) => html.replace('target="_blank" rel="noreferrer"', 'target="_blank" rel="noopener"')],
    ["missing toggle accessible name", (html) => html.replace(' aria-label="Open menu"', "")],
    ["missing current-language state", (html) => html.replace(' aria-label="EN — Current language" aria-current="page"', ' aria-label="EN — Current language"')],
  ];

  for (const [name, mutation] of mutations) {
    await t.test(name, async (caseTest) => {
      const fixtureDir = await createArchiveFilesystemFixture(caseTest);
      await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", mutation);

      await assert.rejects(
        readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
        /navigation|header|toggle|group|new tab|language/i,
      );
    });
  }
});

test("filesystem archive discovery rejects structural scope gap: navs outside the controlled panel", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
    const withEarlyPanelClose = html.replace(
      '<div class="nav-panel" id="site-navigation-archive-2026-W34-en" data-nav-panel>',
      '<div class="nav-panel" id="site-navigation-archive-2026-W34-en" data-nav-panel>\n    </div>',
    );
    const mutated = withEarlyPanelClose.replace(
      '      </div>\n    </div>\n  </header>',
      '      </div>\n  </header>',
    );
    assert.notEqual(mutated, html, "fixture must move both navs outside the controlled panel");
    return mutated;
  });

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /navigation|panel|header|scope/i,
  );
});

test("filesystem archive discovery rejects structural scope gap: toggle outside the header", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
    const toggle = html.match(/    <button class="nav-toggle"[\s\S]*?    <\/button>\n/)?.[0];
    assert.ok(toggle, "expected shared navigation toggle fixture");
    const withoutToggle = html.replace(toggle, "");
    return withoutToggle.replace(
      '  <header class="site-header site-header-page">',
      `${toggle}  <header class="site-header site-header-page">`,
    );
  });

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /navigation|toggle|header|scope/i,
  );
});

test("filesystem archive discovery rejects future-week group scope gaps", async (t) => {
  const cases = [
    ["horizon links moved outside horizon group", "horizon"],
    ["private links moved outside private group", "private"],
  ];

  for (const [name, groupName] of cases) {
    await t.test(name, async (caseTest) => {
      const fixtureDir = await createArchiveFilesystemFixture(caseTest, { week: "2026-W35" });
      await mutateFixture(fixtureDir, "now/archive/2026-W35/index.html", (html) => (
        moveNavigationGroupLinksOutside(html, groupName)
      ));

      await assert.rejects(
        readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
        /navigation|group|horizon|private|scope/i,
      );
    });
  }
});

test("filesystem archive discovery rejects panel tags hidden inside HTML comments", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
    const panelOpening = '<div class="nav-panel" id="site-navigation-archive-2026-W34-en" data-nav-panel>';
    const mutated = html
      .replace(panelOpening, `<!-- ${panelOpening} -->`)
      .replace(
        '      </div>\n    </div>\n  </header>',
        '      </div>\n    <!-- </div> -->\n  </header>',
      );
    assert.notEqual(mutated, html, "fixture must hide the real panel boundary tags inside comments");
    return mutated;
  });

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /navigation|panel|header|comment|structure/i,
  );
});

test("filesystem archive discovery rejects navigation hidden in an inert template subtree", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
    const panelOpening = '<div class="nav-panel" id="site-navigation-archive-2026-W34-en" data-nav-panel>';
    const mutated = html
      .replace(panelOpening, `${panelOpening}\n      <template>`)
      .replace(
        '      </div>\n    </div>\n  </header>',
        '      </div>\n      </template>\n    </div>\n  </header>',
      );
    assert.notEqual(mutated, html, "fixture must move the panel contents into a template subtree");
    return mutated;
  });

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /navigation|panel|template|inert|structure/i,
  );
});

test("filesystem archive discovery rejects group tags hidden inside HTML comments", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
    let replacements = 0;
    const mutated = html.replace(
      /  (<div class="nav-links__group" data-nav-group="(?:horizon|private)"[^>]*>)([\s\S]*?)  <\/div>/g,
      (_group, openingTag, content) => {
        replacements += 1;
        return `  <!-- ${openingTag} -->${content}  <!-- </div> -->`;
      },
    );
    assert.equal(replacements, 2, "fixture must hide both group boundary pairs inside comments");
    return mutated;
  });

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /navigation|group|comment|structure/i,
  );
});

test("filesystem archive discovery rejects an unclosed navigation toggle button", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
    const mutated = html.replace('    </button>\n    <div class="nav-panel"', '    <div class="nav-panel"');
    assert.notEqual(mutated, html, "fixture must remove the toggle button closing tag");
    return mutated;
  });

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /navigation|toggle|button|unclosed|malformed|structure/i,
  );
});

test("filesystem archive discovery rejects an ambiguously self-closed non-void toggle", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
    const toggleOpening = html.match(/<button class="nav-toggle"[^>]+>/)?.[0];
    assert.ok(toggleOpening, "expected navigation toggle opening tag");
    const mutated = html
      .replace(toggleOpening, toggleOpening.replace(/>$/, " />"))
      .replace('    </button>\n    <div class="nav-panel"', '    <div class="nav-panel"');
    assert.notEqual(mutated, html, "fixture must use browser-ambiguous self-closing button syntax");
    return mutated;
  });

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /malformed|non-void|self-closing|structure/i,
  );
});

test("filesystem archive discovery rejects external links laundered by valid group-external copies", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
    const externalAnchors = Array.from(
      html.matchAll(/      <a class="nav-links__external"[^\n]+<\/a>/g),
      (match) => match[0],
    );
    assert.equal(externalAnchors.length, 6, "fixture must copy all six external navigation anchors");
    let mutated = html;
    for (const anchor of externalAnchors) {
      mutated = mutated.replace(anchor, anchor.replace('target="_blank"', 'target="_self"'));
    }
    mutated = mutated.replace(
      '  </nav>\n<!-- GENERATED:primary-navigation:end -->',
      `  </nav>\n${externalAnchors.join("\n")}\n<!-- GENERATED:primary-navigation:end -->`,
    );
    assert.notEqual(mutated, html, "fixture must separate group membership from valid new-tab attributes");
    return mutated;
  });

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /navigation|group|new-tab|external|scope/i,
  );
});

test("filesystem archive discovery rejects a header and backdrop laundered through title RCDATA", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
    const navigationShell = html.match(
      /  <header class="site-header site-header-page">[\s\S]*?  <\/header>\n  <div class="nav-backdrop" data-nav-backdrop aria-hidden="true"><\/div>\n/,
    )?.[0];
    assert.ok(navigationShell, "expected real header and backdrop fixture");
    const mutated = html
      .replace(navigationShell, "")
      .replace("</title>", `${navigationShell}</title>`);
    assert.notEqual(mutated, html, "fixture must move the real navigation shell into title text");
    return mutated;
  });

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /document|skeleton|head|body|title|navigation|structure/i,
  );
});

test("filesystem archive discovery rejects visible time text laundered through template", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
    const mutated = html.replace(
      '<time datetime="2026-08-21">2026-08-21</time>',
      '<time datetime="2026-08-21"><template>2026-08-21</template></time>',
    );
    assert.notEqual(mutated, html, "fixture must move the visible date into inert template content");
    return mutated;
  });

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /time|visible|text|template|structure/i,
  );
});

test("filesystem archive discovery rejects back-link text laundered through template", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
    const mutated = html.replace(
      '<a class="now-archive-back" href="/now/">Back to current Now</a>',
      '<a class="now-archive-back" href="/now/"><template>Back to current Now</template></a>',
    );
    assert.notEqual(mutated, html, "fixture must move back-link text into inert template content");
    return mutated;
  });

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /back|current|text|template|structure/i,
  );
});

test("filesystem archive discovery rejects assistive text laundered through templates", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
    const literal = '<span class="sr-only">opens in a new tab</span>';
    assert.equal(html.split(literal).length - 1, 6, "expected six localized assistive labels");
    return html.replaceAll(
      literal,
      '<span class="sr-only"><template>opens in a new tab</template></span>',
    );
  });

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /new-tab|assistive|text|template|navigation|structure/i,
  );
});

test("filesystem archive discovery rejects a classless duplicate external destination", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
    const duplicate = '  <a href="https://eng.aserdargun.com/">duplicate eng destination</a>\n';
    const mutated = html.replace("</body>", `${duplicate}</body>`);
    assert.notEqual(mutated, html, "fixture must add an active classless duplicate href");
    return mutated;
  });

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /external|destination|duplicate|unique|navigation|structure/i,
  );
});

test("filesystem archive discovery rejects navigation shells outside the active body tree", async (t) => {
  const containers = ["textarea", "script", "style", "xmp", "iframe", "noembed", "noframes", "noscript"];

  for (const container of containers) {
    await t.test(`header inside ${container}`, async (caseTest) => {
      const fixtureDir = await createArchiveFilesystemFixture(caseTest);
      await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
        const navigationShell = html.match(
          /  <header class="site-header site-header-page">[\s\S]*?  <\/header>\n  <div class="nav-backdrop" data-nav-backdrop aria-hidden="true"><\/div>\n/,
        )?.[0];
        assert.ok(navigationShell, "expected navigation shell fixture");
        return html
          .replace(navigationShell, "")
          .replace("</head>", `  <${container}>${navigationShell}</${container}>\n</head>`);
      });

      await assert.rejects(
        readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
        /document|skeleton|head|body|header|navigation|structure/i,
      );
    });
  }
});

test("filesystem archive discovery rejects an active plaintext element before trusting navigation", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
    const mutated = html.replace("<body>", "<body>\n  <plaintext></plaintext>");
    assert.notEqual(mutated, html, "fixture must add an active plaintext element before navigation");
    return mutated;
  });

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /plaintext|browser|inert|structure|navigation/i,
  );
});

test("filesystem archive discovery rejects an active base element before trusting relative navigation", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
    const mutated = html.replace("<head>", '<head>\n  <base href="https://example.invalid/rewritten/">');
    assert.notEqual(mutated, html, "fixture must add an active base element");
    return mutated;
  });

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /base|relative|navigation|structure/i,
  );
});

test("filesystem archive discovery rejects hidden or inert required content", async (t) => {
  const cases = [
    ["visible time hidden on its node", (html) => html.replace(
      '<time datetime="2026-08-21">',
      '<time hidden datetime="2026-08-21">',
    )],
    ["back link inside an inert ancestor", (html) => html.replace(
      '<section class="now-contact">',
      '<section class="now-contact" inert>',
    )],
    ["primary navigation label hidden on its anchor", (html) => html.replace(
      '<a class="nav-links__primary-link" href="/#journey">Journey</a>',
      '<a class="nav-links__primary-link" href="/#journey" hidden>Journey</a>',
    )],
    ["group label inside a hidden group", (html) => html.replace(
      'data-nav-group="horizon" role="group"',
      'data-nav-group="horizon" role="group" hidden',
    )],
    ["required card hidden on its node", (html) => html.replace(
      '<article class="now-card now-card-this">',
      '<article class="now-card now-card-this" hidden>',
    )],
    ["required card aria-hidden on its node", (html) => html.replace(
      '<article class="now-card now-card-this">',
      '<article class="now-card now-card-this" aria-hidden="true">',
    )],
    ["required card entity aria-hidden on its node", (html) => html.replace(
      '<article class="now-card now-card-this">',
      '<article class="now-card now-card-this" aria-hidden="tr&#x75;e">',
    )],
    ["required card semicolonless decimal aria-hidden on its node", (html) => html.replace(
      '<article class="now-card now-card-this">',
      '<article class="now-card now-card-this" aria-hidden="tr&#117e">',
    )],
  ];

  for (const [name, mutation] of cases) {
    await t.test(name, async (caseTest) => {
      const fixtureDir = await createArchiveFilesystemFixture(caseTest);
      await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
        const mutated = mutation(html);
        assert.notEqual(mutated, html, `fixture must make ${name}`);
        return mutated;
      });

      await assert.rejects(
        readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
        /hidden|inert|visible|navigation|card|content|structure|back|current/i,
      );
    });
  }
});

test("public-memory validation rejects literal and entity-hidden populated cards", async () => {
  const data = await readFixtureData();
  data.applications.find((application) => application.code === "aia").relatedMemoryIds = ["visible-memory"];
  data.publicMemory = [{
    id: "visible-memory",
    type: "decision",
    visibility: "public",
    title: { en: "Visible memory", tr: "Görünür hafıza" },
    summary: { en: "Visible summary", tr: "Görünür özet" },
    publishedAt: "2026-08-20",
    updatedAt: "2026-08-25",
    sourceUrl: "https://nxt.aserdargun.com/p/visible-memory",
    sourceLabel: "NXT snapshot",
    relatedApplicationCodes: ["aia"],
    tags: [],
    evidenceUrls: [],
  }];
  const renderedBlock = renderPublicMemory({ locale: "en", data });
  const validDocument = completeMemoryDocument().replace(
    "<!-- GENERATED:public-memory:start --><!-- GENERATED:public-memory:end -->",
    `<!-- GENERATED:public-memory:start -->${renderedBlock}<!-- GENERATED:public-memory:end -->`,
  );

  for (const hiddenValue of ["true", "tr&#x75;e", "tr&#117e"]) {
    const mutated = validDocument.replace(
      '<article class="memory-card"',
      `<article aria-hidden="${hiddenValue}" class="memory-card"`,
    );
    assert.throws(
      () => rendererModule.validatePublicMemoryDocument({
        html: mutated,
        locale: "en",
        expectedCount: 1,
        relativePath: "memory/index.html",
      }),
      /memory-card|visible|public memory/i,
      `aria-hidden=${hiddenValue} must make the populated card inactive`,
    );
  }
});

test("filesystem archive discovery rejects empty semantic archive card fields", async (t) => {
  const cases = [
    ["empty visible label", (html) => html.replace(
      '<span aria-hidden="true">01</span>This week',
      '<span aria-hidden="true">01</span> ',
    )],
    ["empty heading", (html) => html.replace(
      '<h2>Closing the GPU + LLM pair</h2>',
      '<h2> </h2>',
    )],
    ["empty summary", (html) => html.replace(
      /<p>Where the kernel atlas meets the runtime atlas\.[\s\S]*?<\/p>/,
      '<p> </p>',
    )],
    ["empty tag list", (html) => html.replace(
      /<ul class="now-tags">[\s\S]*?<\/ul>/,
      '<ul class="now-tags"></ul>',
    )],
    ["empty tag", (html) => html.replace(
      '<li>GPU memory bandwidth</li>',
      '<li> </li>',
    )],
  ];

  for (const [name, mutation] of cases) {
    await t.test(name, async (caseTest) => {
      const fixtureDir = await createArchiveFilesystemFixture(caseTest);
      await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
        const mutated = mutation(html);
        assert.notEqual(mutated, html, `fixture must create an ${name}`);
        return mutated;
      });

      await assert.rejects(
        readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
        /card|label|heading|summary|tag|semantic|visible|content/i,
      );
    });
  }
});

test("filesystem archive discovery rejects visible time text inside raw or inert children", async (t) => {
  for (const container of ["script", "style"]) {
    await t.test(`time text inside ${container}`, async (caseTest) => {
      const fixtureDir = await createArchiveFilesystemFixture(caseTest);
      await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => html.replace(
        '<time datetime="2026-08-21">2026-08-21</time>',
        `<time datetime="2026-08-21"><${container}>2026-08-21</${container}></time>`,
      ));

      await assert.rejects(
        readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
        /time|visible|text|raw|structure/i,
      );
    });
  }
});

test("filesystem archive discovery rejects duplicate external hrefs in nearby active scopes", async (t) => {
  const cases = [
    ["header", (html) => html.replace(
      "  </header>",
      '    <a href="https://eng.aserdargun.com/">duplicate header destination</a>\n  </header>',
    )],
    ["wrong group", (html) => html.replace(
      '<span class="nav-links__section" id="nav-private-label-en">Private systems</span>',
      '<span class="nav-links__section" id="nav-private-label-en">Private systems</span>\n      <a href="https://eng.aserdargun.com/">duplicate wrong-group destination</a>',
    )],
  ];

  for (const [scope, mutation] of cases) {
    await t.test(scope, async (caseTest) => {
      const fixtureDir = await createArchiveFilesystemFixture(caseTest);
      await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", mutation);

      await assert.rejects(
        readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
        /external|destination|duplicate|unique|navigation|structure/i,
      );
    });
  }
});

test("filesystem archive discovery rejects duplicate active document skeleton elements", async (t) => {
  const cases = [
    ["html", (html) => html.replace("</body>", '<html lang="en" data-locale="en"></html>\n</body>')],
    ["head", (html) => html.replace("</body>", "<head></head>\n</body>")],
    ["body", (html) => html.replace("</body>", "<body></body>\n</body>")],
    ["header", (html) => html.replace("  <main", "  <header></header>\n  <main")],
  ];

  for (const [elementName, mutation] of cases) {
    await t.test(elementName, async (caseTest) => {
      const fixtureDir = await createArchiveFilesystemFixture(caseTest);
      await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", mutation);

      await assert.rejects(
        readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
        /document|skeleton|html|head|body|header|navigation|structure|locale/i,
      );
    });
  }
});

test("filesystem archive discovery rejects a real navigation shell directly under head", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);
  await mutateFixture(fixtureDir, "now/archive/2026-W34/index.html", (html) => {
    const navigationShell = html.match(
      /  <header class="site-header site-header-page">[\s\S]*?  <\/header>\n  <div class="nav-backdrop" data-nav-backdrop aria-hidden="true"><\/div>\n/,
    )?.[0];
    assert.ok(navigationShell, "expected navigation shell fixture");
    return html.replace(navigationShell, "").replace("</head>", `${navigationShell}</head>`);
  });

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /document|skeleton|head|body|header|navigation|structure/i,
  );
});

test("filesystem archive discovery accepts a complete bilingual archive pair", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t);

  assert.deepEqual(
    await readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    [{ week: "2026-W34", updatedAt: "2026-08-21" }],
  );
});

test("filesystem archive discovery accepts a complete synthetic future-week pair", async (t) => {
  const fixtureDir = await createArchiveFilesystemFixture(t, { week: "2026-W35" });

  assert.deepEqual(
    await readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    [{ week: "2026-W35", updatedAt: "2026-08-21" }],
  );
});

test("filesystem archive discovery accepts a site with no archive roots", async (t) => {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "living-system-no-archives-"));
  t.after(() => rm(fixtureDir, { recursive: true, force: true }));

  assert.deepEqual(await readArchiveLinks(fixtureDir, { expectedCardCount: 3 }), []);
});

test("filesystem archive discovery fails closed for a one-sided archive week directory", async (t) => {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "living-system-unpaired-archives-"));
  t.after(() => rm(fixtureDir, { recursive: true, force: true }));
  await mkdir(path.join(fixtureDir, "now", "archive", "2026-W34"), { recursive: true });

  await assert.rejects(
    readArchiveLinks(fixtureDir, { expectedCardCount: 3 }),
    /complete English\/Turkish pairs/i,
  );
});

test("check mode reports stale files without writing the fixture", async () => {
  const fixtureDir = await createSiteFixture();
  const generate = spawnSync(process.execPath, [rendererPath], {
    cwd: fixtureDir,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "test", LIVING_SYSTEM_TODAY: "2026-09-02" },
  });
  assert.equal(generate.status, 0, generate.stderr);

  const stalePath = path.join(fixtureDir, "index.html");
  await writeFile(stalePath, (await readFile(stalePath, "utf8")).replace("AI Ecosystem Atlas", "XI Ecosystem Atlas"));
  const paths = ["index.html", "tr/index.html", "now/index.html", "tr/now/index.html", "memory/index.html", "tr/memory/index.html"];
  const before = Object.fromEntries(await Promise.all(paths.map(async (relativePath) => [
    relativePath,
    digest(await readFile(path.join(fixtureDir, relativePath))),
  ])));

  const check = spawnSync(process.execPath, [rendererPath, "--check"], {
    cwd: fixtureDir,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "test", LIVING_SYSTEM_TODAY: "2026-09-02" },
  });
  const after = Object.fromEntries(await Promise.all(paths.map(async (relativePath) => [
    relativePath,
    digest(await readFile(path.join(fixtureDir, relativePath))),
  ])));

  assert.equal(check.status, 1, check.stderr);
  assert.match(check.stdout, /index\.html/);
  assert.deepEqual(after, before);
});
