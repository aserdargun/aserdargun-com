import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  planNowArchive,
  renderNowArchive,
  updateSitemapForArchive,
  writeArchivePlan,
} from "./archive-now.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const archiveToolPath = path.join(rootDir, "tools", "archive-now.mjs");
const dataSourcePath = path.join(rootDir, "data", "living-system.json");
const canonicalWeek = "2026-W34";
const archivedNowFixture = {
  updatedAt: "2026-08-21",
  week: canonicalWeek,
  items: [
    {
      id: "week",
      timeframe: "week",
      title: { en: "Closing the GPU + LLM pair", tr: "GPU + LLM çiftini kapatmak" },
      summary: {
        en: "Where the kernel atlas meets the runtime atlas. I'm reading CUDA memory traffic patterns and pairing them with vLLM PagedAttention so the next GPU atlas chapter lands with the right model context, not in isolation.",
        tr: "Kernel atlasının runtime atlasıyla buluştuğu yer. CUDA bellek trafik örüntülerini okuyor ve bir sonraki GPU atlas bölümünü doğru model bağlamıyla, yalnız değil, vLLM PagedAttention ile eşleştirerek hazırlıyorum.",
      },
      tags: [
        { en: "GPU memory bandwidth", tr: "GPU bellek bant genişliği" },
        { en: "PagedAttention", tr: "PagedAttention" },
        { en: "KV cache", tr: "KV cache" },
        { en: "Atlas cross-references", tr: "Atlas çapraz referansları" },
      ],
    },
    {
      id: "month",
      timeframe: "month",
      title: { en: "Atlas as a learning loop", tr: "Atlası bir öğrenme döngüsüne çevirmek" },
      summary: {
        en: "Converting the public atlas map from a flat directory into the learning system you now see on the homepage — a study order, three parallel tracks (hardware, serving, training), and a converge step. The /now page is the next piece of that loop.",
        tr: "Genel atlas haritasını düz bir dizinden, ana sayfada gördüğün öğrenme sistemine dönüştürüyorum: çalışma sırası, üç paralel rota (donanım, servis, eğitim) ve birleşim adımı. Bu /now sayfası o döngünün bir sonraki parçası.",
      },
      tags: [
        { en: "Learning system", tr: "Öğrenme sistemi" },
        { en: "Guiding questions", tr: "Yönlendirici sorular" },
        { en: "Investment bar", tr: "Yatırım çubuğu" },
        { en: "Evidence flow", tr: "Kanıt akışı" },
      ],
    },
    {
      id: "long-term",
      timeframe: "long-term",
      title: { en: "Industrial AI that operators trust", tr: "Operatörün güvendiği endüstriyel yapay zekâ" },
      summary: {
        en: 'The through-line from mechanical engineering to AI engineering is "decisions a real person has to act on". Every atlas and every notebook is an attempt to make industrial intelligence legible, reviewable, and operable — not just accurate.',
        tr: 'Makine mühendisliğinden yapay zekâ mühendisliğine uzanan ortak şu: "kararı gerçek bir kişinin uygulayacağı". Her atlas ve her defter, endüstriyel zekâı okunabilir, denetlenebilir ve işletilebilir kılma denemesi — sadece doğru değil.',
      },
      tags: [
        { en: "Traceability", tr: "İzlenebilirlik" },
        { en: "Human review", tr: "İnsan incelemesi" },
        { en: "Deployment constraints", tr: "Dağıtım kısıtları" },
        { en: "Operator-first", tr: "Operatör-odaklı" },
      ],
    },
  ],
};
const baseSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://aserdargun.com/</loc>
    <xhtml:link rel="alternate" hreflang="en" href="https://aserdargun.com/" />
    <xhtml:link rel="alternate" hreflang="tr" href="https://aserdargun.com/tr/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://aserdargun.com/" />
  </url>
  <url>
    <loc>https://aserdargun.com/unrelated/</loc>
    <lastmod>2026-08-01</lastmod>
  </url>
</urlset>
`;

async function pathExists(filePath) {
  return stat(filePath).then(() => true, () => false);
}

async function createSiteFixture(t) {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "archive-now-site-"));
  t.after(() => rm(fixtureDir, { recursive: true, force: true }));
  await mkdir(path.join(fixtureDir, "data"));
  const data = JSON.parse(await readFile(dataSourcePath, "utf8"));
  data.now = structuredClone(archivedNowFixture);
  await writeFile(
    path.join(fixtureDir, "data", "living-system.json"),
    `${JSON.stringify(data, null, 2)}\n`,
  );
  await writeFile(path.join(fixtureDir, "sitemap.xml"), baseSitemap);
  return fixtureDir;
}

function runArchive(fixtureDir, args = []) {
  return spawnSync(process.execPath, [archiveToolPath, ...args], {
    cwd: fixtureDir,
    encoding: "utf8",
  });
}

function archivePaths(fixtureDir, week = canonicalWeek) {
  return {
    english: path.join(fixtureDir, "now", "archive", week, "index.html"),
    turkish: path.join(fixtureDir, "tr", "now", "archive", week, "index.html"),
  };
}

function sitemapWithInjectedBytes(bytes) {
  const source = Buffer.from(baseSitemap);
  const marker = Buffer.from("</loc>");
  const insertionPoint = source.indexOf(marker);
  assert.notEqual(insertionPoint, -1, "base sitemap must contain a loc closing tag");
  return Buffer.concat([
    source.subarray(0, insertionPoint),
    Buffer.from(bytes),
    source.subarray(insertionPoint),
  ]);
}

function assertNoArchiveOutput(fixtureDir, week = canonicalWeek) {
  const paths = archivePaths(fixtureDir, week);
  return Promise.all([
    pathExists(paths.english).then((exists) => assert.equal(exists, false)),
    pathExists(paths.turkish).then((exists) => assert.equal(exists, false)),
  ]);
}

async function assertNoArchiveOrStagingOutput(fixtureDir, week = canonicalWeek) {
  await assertNoArchiveOutput(fixtureDir, week);
  const paths = archivePaths(fixtureDir, week);
  assert.equal(await pathExists(path.dirname(paths.english)), false);
  assert.equal(await pathExists(path.dirname(paths.turkish)), false);
  const rootEntries = await readdir(fixtureDir);
  assert.deepEqual(rootEntries.filter((entry) => entry.startsWith(".archive-now-")), []);
}

function cardValues(html) {
  return Array.from(
    html.matchAll(/<article class="now-card now-card-this">[\s\S]*?<h2>([^<]+)<\/h2>\s*<p>([^<]+)<\/p>[\s\S]*?<ul class="now-tags">([\s\S]*?)<\/ul>[\s\S]*?<\/article>/g),
    (match) => ({
      title: match[1],
      summary: match[2],
      tags: Array.from(match[3].matchAll(/<li(?:\s[^>]*)?>([^<]+)<\/li>/g), (tag) => tag[1]),
    }),
  );
}

function assertCompleteNavigation(html, locale) {
  const expectedPrimaryLabel = locale === "tr" ? "Ana navigasyon" : "Primary navigation";
  const expectedNewTabText = locale === "tr" ? "yeni sekmede açılır" : "opens in a new tab";
  assert.equal((html.match(/data-nav-toggle/g) ?? []).length, 1);
  assert.equal((html.match(/data-nav-panel/g) ?? []).length, 1);
  assert.equal((html.match(/data-nav-backdrop/g) ?? []).length, 1);
  assert.match(html, new RegExp(`<nav class="nav-links" aria-label="${expectedPrimaryLabel}">`));
  assert.match(html, /<a class="nav-links__primary-link" href="\/(?:tr\/)?now\/" aria-current="page">/);

  const ids = Array.from(html.matchAll(/\sid="([^"]+)"/g), (match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "archive document IDs must be unique");
  for (const anchor of html.matchAll(/<a\b([^>]*)target="_blank"([^>]*)>([\s\S]*?)<\/a>/g)) {
    assert.match(`${anchor[1]}${anchor[2]}`, /rel="[^"]*noreferrer[^"]*"/);
    assert.match(anchor[3], new RegExp(`<span class="sr-only">${expectedNewTabText}<\/span>`));
  }
}

test("missing --week exits non-zero with usage and leaves no output", async (t) => {
  const fixtureDir = await createSiteFixture(t);
  const sitemapBefore = await readFile(path.join(fixtureDir, "sitemap.xml"));

  const result = runArchive(fixtureDir);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Usage: node tools\/archive-now\.mjs --week YYYY-Www/);
  assert.deepEqual(await readFile(path.join(fixtureDir, "sitemap.xml")), sitemapBefore);
  await assertNoArchiveOutput(fixtureDir);
});

test("a requested week that differs from data.now.week leaves no partial output", async (t) => {
  const fixtureDir = await createSiteFixture(t);
  const sitemapBefore = await readFile(path.join(fixtureDir, "sitemap.xml"));

  const result = runArchive(fixtureDir, ["--week", "2026-W33"]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does not match current Now week 2026-W34/);
  assert.deepEqual(await readFile(path.join(fixtureDir, "sitemap.xml")), sitemapBefore);
  await assertNoArchiveOutput(fixtureDir, "2026-W33");
  await assertNoArchiveOutput(fixtureDir);
});

test("an existing destination is never overwritten and leaves its pair and sitemap untouched", async (t) => {
  const fixtureDir = await createSiteFixture(t);
  const paths = archivePaths(fixtureDir);
  const sentinel = "existing immutable archive\n";
  const sitemapBefore = await readFile(path.join(fixtureDir, "sitemap.xml"));
  await mkdir(path.dirname(paths.english), { recursive: true });
  await writeFile(paths.english, sentinel);

  const result = runArchive(fixtureDir, ["--week", canonicalWeek]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /already exists/);
  assert.equal(await readFile(paths.english, "utf8"), sentinel);
  assert.equal(await pathExists(paths.turkish), false);
  assert.deepEqual(await readFile(path.join(fixtureDir, "sitemap.xml")), sitemapBefore);
});

test("a malformed sitemap is rejected before either archive destination is created", async (t) => {
  const fixtureDir = await createSiteFixture(t);
  const sitemapPath = path.join(fixtureDir, "sitemap.xml");
  const malformed = "<urlset>not closed\n";
  await writeFile(sitemapPath, malformed);

  const result = runArchive(fixtureDir, ["--week", canonicalWeek]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /sitemap/i);
  assert.equal(await readFile(sitemapPath, "utf8"), malformed);
  await assertNoArchiveOutput(fixtureDir);
});

test("structurally malformed single-closing sitemaps fail closed without final or staging output", async (t) => {
  const withoutDeclaration = baseSitemap.replace(/^<\?xml[^>]+>\n/, "");
  const malformedSitemaps = [
    ["multiple roots", `<metadata/>\n${withoutDeclaration}`],
    ["trailing markup", `${baseSitemap.trim()}\n<metadata/>\n`],
    [
      "missing xhtml namespace",
      baseSitemap.replace(' xmlns:xhtml="http://www.w3.org/1999/xhtml"', ""),
    ],
    [
      "missing sitemap namespace",
      baseSitemap.replace(' xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"', ""),
    ],
    [
      "unbalanced url element",
      baseSitemap.replace("  </url>\n</urlset>\n", "</urlset>\n"),
    ],
  ];

  for (const [name, malformed] of malformedSitemaps) {
    await t.test(name, async (caseTest) => {
      const fixtureDir = await createSiteFixture(caseTest);
      const sitemapPath = path.join(fixtureDir, "sitemap.xml");
      await writeFile(sitemapPath, malformed);
      const before = await readFile(sitemapPath);

      const result = runArchive(fixtureDir, ["--week", canonicalWeek]);

      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /sitemap/i);
      assert.deepEqual(await readFile(sitemapPath), before);
      await assertNoArchiveOrStagingOutput(fixtureDir);
    });
  }
});

test("a sitemap with malformed inner XML fails before final or staging output and preserves its bytes", async (t) => {
  const fixtureDir = await createSiteFixture(t);
  const sitemapPath = path.join(fixtureDir, "sitemap.xml");
  const malformed = baseSitemap.replace(
    "<loc>https://aserdargun.com/unrelated/</loc>",
    "<loc>https://aserdargun.com/unrelated/</lastmod>",
  );
  await writeFile(sitemapPath, malformed);
  const before = await readFile(sitemapPath);

  const result = runArchive(fixtureDir, ["--week", canonicalWeek]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /sitemap|xml|loc|lastmod/i);
  assert.deepEqual(await readFile(sitemapPath), before);
  await assertNoArchiveOrStagingOutput(fixtureDir);
});

test("sitemap XML references and characters are validated before archive output", async (t) => {
  const textLocation = "<loc>https://aserdargun.com/</loc>";
  const englishAlternate = 'href="https://aserdargun.com/"';
  const cases = [
    {
      name: "bare ampersand in element text",
      replacement: "<loc>https://aserdargun.com/?a=1&b=2</loc>",
    },
    {
      name: "unknown named entity in element text",
      replacement: "<loc>https://aserdargun.com/?a=&bogus;</loc>",
    },
    {
      name: "unterminated numeric reference",
      replacement: "<loc>https://aserdargun.com/?a=&#12</loc>",
    },
    {
      name: "null numeric character reference",
      replacement: "<loc>https://aserdargun.com/?a=&#0;</loc>",
    },
    {
      name: "forbidden control numeric character reference",
      replacement: "<loc>https://aserdargun.com/?a=&#x1F;</loc>",
    },
    {
      name: "surrogate numeric character reference",
      replacement: "<loc>https://aserdargun.com/?a=&#xD800;</loc>",
    },
    {
      name: "out-of-range numeric character reference",
      replacement: "<loc>https://aserdargun.com/?a=&#x110000;</loc>",
    },
    {
      name: "invalid literal XML control character",
      replacement: "<loc>https://aserdargun.com/\u0001</loc>",
    },
    {
      name: "bare ampersand in an attribute",
      needle: englishAlternate,
      replacement: 'href="https://aserdargun.com/?a=1&b=2"',
    },
    {
      name: "unknown named entity in an attribute",
      needle: englishAlternate,
      replacement: 'href="https://aserdargun.com/?a=&bogus;"',
    },
    {
      name: "literal less-than sign in an attribute",
      needle: englishAlternate,
      replacement: 'href="https://aserdargun.com/<private"',
    },
    {
      name: "predefined amp entity in element text",
      replacement: "<loc>https://aserdargun.com/?a=1&amp;b=2</loc>",
      valid: true,
    },
    {
      name: "predefined amp entity in an attribute",
      needle: englishAlternate,
      replacement: 'href="https://aserdargun.com/?a=1&amp;b=2"',
      valid: true,
    },
    {
      name: "valid decimal numeric character reference",
      replacement: "<loc>https://aserdargun.com/&#65;/</loc>",
      valid: true,
    },
    {
      name: "valid hexadecimal numeric character reference",
      replacement: "<loc>https://aserdargun.com/&#x1F642;/</loc>",
      valid: true,
    },
  ];

  for (const fixtureCase of cases) {
    await t.test(fixtureCase.name, async (caseTest) => {
      const fixtureDir = await createSiteFixture(caseTest);
      const sitemapPath = path.join(fixtureDir, "sitemap.xml");
      const source = baseSitemap.replace(
        fixtureCase.needle ?? textLocation,
        fixtureCase.replacement,
      );
      await writeFile(sitemapPath, source);
      const before = await readFile(sitemapPath);

      const result = runArchive(fixtureDir, ["--week", canonicalWeek]);

      if (fixtureCase.valid) {
        assert.equal(result.status, 0, result.stderr);
        const paths = archivePaths(fixtureDir);
        assert.equal(await pathExists(paths.english), true);
        assert.equal(await pathExists(paths.turkish), true);
        assert.match(await readFile(sitemapPath, "utf8"), new RegExp(
          fixtureCase.replacement.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        ));
        const rootEntries = await readdir(fixtureDir);
        assert.deepEqual(rootEntries.filter((entry) => entry.startsWith(".archive-now-")), []);
        return;
      }

      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /sitemap|xml|reference|character|attribute/i);
      assert.deepEqual(await readFile(sitemapPath), before);
      await assertNoArchiveOrStagingOutput(fixtureDir);
    });
  }
});

test("malformed XML declarations fail before archive output without echoing rejected values", async (t) => {
  const declaration = '<?xml version="1.0" encoding="UTF-8"?>';
  const cases = [
    ["bare ampersand", '<?xml version="1.0" encoding="UTF&8"?>', "UTF&8"],
    ["unknown entity", '<?xml version="1.0" encoding="UTF&PrivateVault99;"?>', "PrivateVault99"],
    ["unterminated numeric reference", '<?xml version="1.0" encoding="UTF&#65"?>', "UTF&#65"],
    ["missing version", '<?xml encoding="UTF-8"?>', "UTF-8"],
    ["unsupported version", '<?xml version="1.1" encoding="UTF-8"?>', "1.1"],
    ["duplicate version", '<?xml version="1.0" version="1.0"?>', 'version="1.0" version'],
    ["unquoted encoding", '<?xml version="1.0" encoding=UTF-8?>', "encoding=UTF-8"],
    ["unsupported encoding", '<?xml version="1.0" encoding="ISO-8859-1"?>', "ISO-8859-1"],
    ["invalid standalone", '<?xml version="1.0" standalone="maybe"?>', "maybe"],
    ["wrong declaration order", '<?xml version="1.0" standalone="yes" encoding="UTF-8"?>', "standalone"],
    ["duplicate encoding", '<?xml version="1.0" encoding="UTF-8" encoding="utf-8"?>', 'encoding="utf-8"'],
    ["duplicate standalone", '<?xml version="1.0" standalone="yes" standalone="no"?>', 'standalone="no"'],
    ["trailing pseudo-attribute", '<?xml version="1.0" privateVault="PrivateVault99"?>', "PrivateVault99"],
  ];

  for (const [name, malformedDeclaration, rejectedValue] of cases) {
    await t.test(name, async (caseTest) => {
      const fixtureDir = await createSiteFixture(caseTest);
      const sitemapPath = path.join(fixtureDir, "sitemap.xml");
      const malformed = baseSitemap.replace(declaration, malformedDeclaration);
      await writeFile(sitemapPath, malformed);
      const before = await readFile(sitemapPath);

      const result = runArchive(fixtureDir, ["--week", canonicalWeek]);

      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /sitemap|xml|declaration|encoding/i);
      assert.doesNotMatch(result.stderr, new RegExp(rejectedValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.deepEqual(await readFile(sitemapPath), before);
      await assertNoArchiveOrStagingOutput(fixtureDir);
    });
  }
});

test("invalid UTF-8 sitemap bytes fail before archive output and preserve their original bytes", async (t) => {
  const cases = [
    ["encoded surrogate", [0xED, 0xA0, 0x80]],
    ["overlong null", [0xC0, 0x80]],
    ["code point above Unicode maximum", [0xF4, 0x90, 0x80, 0x80]],
  ];

  for (const [name, invalidBytes] of cases) {
    await t.test(name, async (caseTest) => {
      const fixtureDir = await createSiteFixture(caseTest);
      const sitemapPath = path.join(fixtureDir, "sitemap.xml");
      await writeFile(sitemapPath, sitemapWithInjectedBytes(invalidBytes));
      const before = await readFile(sitemapPath);

      const result = runArchive(fixtureDir, ["--week", canonicalWeek]);

      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /sitemap|xml|utf-8|encoding/i);
      assert.doesNotMatch(result.stderr, /ed ?a0 ?80|c0 ?80|f4 ?90 ?80 ?80|PrivateVault99/i);
      assert.deepEqual(await readFile(sitemapPath), before);
      await assertNoArchiveOrStagingOutput(fixtureDir);
    });
  }
});

test("supported XML declaration forms and a declarationless sitemap remain valid", async (t) => {
  const canonicalDeclaration = '<?xml version="1.0" encoding="UTF-8"?>';
  const cases = [
    ["canonical declaration", baseSitemap],
    ["declarationless sitemap", baseSitemap.replace(`${canonicalDeclaration}\n`, "")],
    ["single-quoted lowercase encoding", baseSitemap.replace(
      canonicalDeclaration,
      "<?xml version='1.0' encoding='utf-8'?>",
    )],
    ["standalone yes after encoding", baseSitemap.replace(
      canonicalDeclaration,
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    )],
    ["standalone no without encoding", baseSitemap.replace(
      canonicalDeclaration,
      '<?xml version="1.0" standalone="no"?>',
    )],
  ];

  for (const [name, sitemap] of cases) {
    await t.test(name, async (caseTest) => {
      const fixtureDir = await createSiteFixture(caseTest);
      const sitemapPath = path.join(fixtureDir, "sitemap.xml");
      await writeFile(sitemapPath, sitemap);

      const result = runArchive(fixtureDir, ["--week", canonicalWeek]);

      assert.equal(result.status, 0, result.stderr);
      const paths = archivePaths(fixtureDir);
      assert.equal(await pathExists(paths.english), true);
      assert.equal(await pathExists(paths.turkish), true);
      assert.ok((await readFile(sitemapPath, "utf8")).startsWith(
        sitemap.startsWith("<?xml") ? sitemap.slice(0, sitemap.indexOf("?>") + 2) : "<urlset",
      ));
      const rootEntries = await readdir(fixtureDir);
      assert.deepEqual(rootEntries.filter((entry) => entry.startsWith(".archive-now-")), []);
    });
  }
});

test("a valid run creates both localized immutable archive files", async (t) => {
  const fixtureDir = await createSiteFixture(t);
  const paths = archivePaths(fixtureDir);

  const result = runArchive(fixtureDir, ["--week", canonicalWeek]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(await pathExists(paths.english), true);
  assert.equal(await pathExists(paths.turkish), true);
  assert.match(result.stdout, /Archived 2026-W34 in English and Turkish\./);
});

test("a valid run preserves data/living-system.json byte-for-byte", async (t) => {
  const fixtureDir = await createSiteFixture(t);
  const dataPath = path.join(fixtureDir, "data", "living-system.json");
  const before = await readFile(dataPath);

  const result = runArchive(fixtureDir, ["--week", canonicalWeek]);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(await readFile(dataPath), before);
});

test("archive pages preserve the literal localized 2026-W34 cards and absolute date", async (t) => {
  const fixtureDir = await createSiteFixture(t);
  const paths = archivePaths(fixtureDir);
  const result = runArchive(fixtureDir, ["--week", canonicalWeek]);
  assert.equal(result.status, 0, result.stderr);

  const english = await readFile(paths.english, "utf8");
  const turkish = await readFile(paths.turkish, "utf8");
  for (const html of [english, turkish]) {
    assert.match(html, /data-archive-week="2026-W34"/);
    assert.match(html, /data-updated-at="2026-08-21"/);
    assert.match(html, /<time datetime="2026-08-21">2026-08-21<\/time>/);
    assert.equal((html.match(/<article class="now-card now-card-this">/g) ?? []).length, 3);
    assert.doesNotMatch(html, /<(?:form|input|textarea|select)\b|contenteditable=|data-(?:edit|delete|publish)/i);
  }
  assert.deepEqual(cardValues(english), [
    {
      title: "Closing the GPU + LLM pair",
      summary: "Where the kernel atlas meets the runtime atlas. I&apos;m reading CUDA memory traffic patterns and pairing them with vLLM PagedAttention so the next GPU atlas chapter lands with the right model context, not in isolation.",
      tags: ["GPU memory bandwidth", "PagedAttention", "KV cache", "Atlas cross-references"],
    },
    {
      title: "Atlas as a learning loop",
      summary: "Converting the public atlas map from a flat directory into the learning system you now see on the homepage — a study order, three parallel tracks (hardware, serving, training), and a converge step. The /now page is the next piece of that loop.",
      tags: ["Learning system", "Guiding questions", "Investment bar", "Evidence flow"],
    },
    {
      title: "Industrial AI that operators trust",
      summary: "The through-line from mechanical engineering to AI engineering is &quot;decisions a real person has to act on&quot;. Every atlas and every notebook is an attempt to make industrial intelligence legible, reviewable, and operable — not just accurate.",
      tags: ["Traceability", "Human review", "Deployment constraints", "Operator-first"],
    },
  ]);
  assert.deepEqual(cardValues(turkish), [
    {
      title: "GPU + LLM çiftini kapatmak",
      summary: "Kernel atlasının runtime atlasıyla buluştuğu yer. CUDA bellek trafik örüntülerini okuyor ve bir sonraki GPU atlas bölümünü doğru model bağlamıyla, yalnız değil, vLLM PagedAttention ile eşleştirerek hazırlıyorum.",
      tags: ["GPU bellek bant genişliği", "PagedAttention", "KV cache", "Atlas çapraz referansları"],
    },
    {
      title: "Atlası bir öğrenme döngüsüne çevirmek",
      summary: "Genel atlas haritasını düz bir dizinden, ana sayfada gördüğün öğrenme sistemine dönüştürüyorum: çalışma sırası, üç paralel rota (donanım, servis, eğitim) ve birleşim adımı. Bu /now sayfası o döngünün bir sonraki parçası.",
      tags: ["Öğrenme sistemi", "Yönlendirici sorular", "Yatırım çubuğu", "Kanıt akışı"],
    },
    {
      title: "Operatörün güvendiği endüstriyel yapay zekâ",
      summary: "Makine mühendisliğinden yapay zekâ mühendisliğine uzanan ortak şu: &quot;kararı gerçek bir kişinin uygulayacağı&quot;. Her atlas ve her defter, endüstriyel zekâı okunabilir, denetlenebilir ve işletilebilir kılma denemesi — sadece doğru değil.",
      tags: ["İzlenebilirlik", "İnsan incelemesi", "Dağıtım kısıtları", "Operatör-odaklı"],
    },
  ]);
});

test("archive pages carry paired canonical and hreflang links plus the shared accessible header", async (t) => {
  const fixtureDir = await createSiteFixture(t);
  const paths = archivePaths(fixtureDir);
  const result = runArchive(fixtureDir, ["--week", canonicalWeek]);
  assert.equal(result.status, 0, result.stderr);

  const english = await readFile(paths.english, "utf8");
  const turkish = await readFile(paths.turkish, "utf8");
  const enUrl = "https://aserdargun.com/now/archive/2026-W34/";
  const trUrl = "https://aserdargun.com/tr/now/archive/2026-W34/";
  assert.match(english, new RegExp(`<link rel="canonical" href="${enUrl}">`));
  assert.match(turkish, new RegExp(`<link rel="canonical" href="${trUrl}">`));
  for (const html of [english, turkish]) {
    assert.ok(html.includes(`<link rel="alternate" hreflang="en" href="${enUrl}">`));
    assert.ok(html.includes(`<link rel="alternate" hreflang="tr" href="${trUrl}">`));
    assert.ok(html.includes(`<link rel="alternate" hreflang="x-default" href="${enUrl}">`));
  }
  assert.ok(english.includes('<a class="now-archive-back" href="/now/">Back to current Now</a>'));
  assert.ok(turkish.includes('<a class="now-archive-back" href="/tr/now/">Güncel Şimdi sayfasına dön</a>'));
  assert.ok(english.includes('href="/tr/now/archive/2026-W34/" lang="tr" data-language-link="tr"'));
  assert.ok(turkish.includes('href="/now/archive/2026-W34/" lang="en" data-language-link="en"'));
  assertCompleteNavigation(english, "en");
  assertCompleteNavigation(turkish, "tr");
});

test("sitemap insertion preserves unrelated URLs and uses paired alternates with canonical lastmod", async (t) => {
  const fixtureDir = await createSiteFixture(t);
  const sitemapPath = path.join(fixtureDir, "sitemap.xml");
  const before = await readFile(sitemapPath, "utf8");
  const preservedRootEntry = before.match(/  <url>\n    <loc>https:\/\/aserdargun\.com\/<\/loc>[\s\S]*?  <\/url>/)?.[0];

  const result = runArchive(fixtureDir, ["--week", canonicalWeek]);

  assert.equal(result.status, 0, result.stderr);
  const sitemap = await readFile(sitemapPath, "utf8");
  assert.ok(preservedRootEntry);
  assert.ok(sitemap.includes(preservedRootEntry));
  for (const loc of [
    "https://aserdargun.com/now/archive/2026-W34/",
    "https://aserdargun.com/tr/now/archive/2026-W34/",
  ]) {
    const entry = sitemap.match(new RegExp(`<url>\\s*<loc>${loc.replaceAll("/", "\\/")}<\\/loc>[\\s\\S]*?<\\/url>`))?.[0] ?? "";
    assert.match(entry, /<lastmod>2026-08-21<\/lastmod>/);
    assert.match(entry, /hreflang="en" href="https:\/\/aserdargun\.com\/now\/archive\/2026-W34\/"/);
    assert.match(entry, /hreflang="tr" href="https:\/\/aserdargun\.com\/tr\/now\/archive\/2026-W34\/"/);
    assert.match(entry, /hreflang="x-default" href="https:\/\/aserdargun\.com\/now\/archive\/2026-W34\/"/);
  }
});

test("a second identical run refuses immutably without changing any first-run bytes", async (t) => {
  const fixtureDir = await createSiteFixture(t);
  const paths = archivePaths(fixtureDir);
  const first = runArchive(fixtureDir, ["--week", canonicalWeek]);
  assert.equal(first.status, 0, first.stderr);
  const before = {
    english: await readFile(paths.english),
    turkish: await readFile(paths.turkish),
    sitemap: await readFile(path.join(fixtureDir, "sitemap.xml")),
    data: await readFile(path.join(fixtureDir, "data", "living-system.json")),
  };

  const second = runArchive(fixtureDir, ["--week", canonicalWeek]);

  assert.notEqual(second.status, 0);
  assert.match(second.stderr, /already exists/);
  assert.deepEqual(await readFile(paths.english), before.english);
  assert.deepEqual(await readFile(paths.turkish), before.turkish);
  assert.deepEqual(await readFile(path.join(fixtureDir, "sitemap.xml")), before.sitemap);
  assert.deepEqual(await readFile(path.join(fixtureDir, "data", "living-system.json")), before.data);
});

test("fault-injected archive installation rolls back every final and staging artifact", async (t) => {
  const faultSteps = [
    "after-english-install",
    "after-archive-installs",
    "before-sitemap-replacement",
  ];

  for (const faultStep of faultSteps) {
    await t.test(faultStep, async (caseTest) => {
      const fixtureDir = await createSiteFixture(caseTest);
      const sitemapPath = path.join(fixtureDir, "sitemap.xml");
      const sitemapBefore = await readFile(sitemapPath);
      const data = JSON.parse(await readFile(path.join(fixtureDir, "data", "living-system.json"), "utf8"));
      const plan = planNowArchive({ rootDir: fixtureDir, data, week: canonicalWeek });

      await assert.rejects(
        writeArchivePlan({
          plan,
          englishHtml: "staged English archive\n",
          turkishHtml: "staged Turkish archive\n",
          sitemapXml: `${baseSitemap}\n<!-- staged replacement -->\n`,
          faultHook(step) {
            if (step === faultStep) throw new Error(`Injected archive fault: ${faultStep}`);
          },
        }),
        new RegExp(`Injected archive fault: ${faultStep}`),
      );

      assert.deepEqual(await readFile(sitemapPath), sitemapBefore);
      await assertNoArchiveOrStagingOutput(fixtureDir);
    });
  }
});

test("the planning and rendering API validates canonical inputs without touching disk", async () => {
  const data = JSON.parse(await readFile(dataSourcePath, "utf8"));
  data.now = structuredClone(archivedNowFixture);
  const fixtureRoot = path.join(tmpdir(), "archive-now-nonexistent-planning-root");
  const plan = planNowArchive({ rootDir: fixtureRoot, data, week: canonicalWeek });
  const header = '<header><nav aria-label="Primary navigation"></nav></header>';
  const archive = renderNowArchive({ locale: "en", data, navigationHtml: header });
  const sitemap = updateSitemapForArchive({
    xml: baseSitemap,
    week: canonicalWeek,
    updatedAt: "2026-08-21",
  });

  assert.equal(plan.week, canonicalWeek);
  assert.equal(plan.updatedAt, "2026-08-21");
  assert.ok(archive.includes(header));
  assert.match(sitemap, /now\/archive\/2026-W34/);
});
