import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import { fileURLToPath } from "node:url";
import {
  assertValidLivingSystemData,
  loadLivingSystemData,
} from "./living-system-data.mjs";
import {
  renderNowCards,
  renderSiteHeader,
} from "./render-living-system.mjs";

const WEEK_PATTERN = /^\d{4}-W\d{2}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ASSET_VERSION = "20260903-holistic-system";
const USAGE = "Usage: node tools/archive-now.mjs --week YYYY-Www";
const SITEMAP_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9";
const XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
const XML_PREDEFINED_ENTITIES = new Set(["amp", "lt", "gt", "quot", "apos"]);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function localeText(locale, english, turkish) {
  return locale === "tr" ? turkish : english;
}

function archiveUrls(week) {
  return {
    en: `https://aserdargun.com/now/archive/${week}/`,
    tr: `https://aserdargun.com/tr/now/archive/${week}/`,
  };
}

export function planNowArchive({ rootDir, data, week }) {
  if (typeof rootDir !== "string" || rootDir.trim() === "") {
    throw new Error("Archive root directory is required.");
  }
  if (!WEEK_PATTERN.test(week ?? "")) throw new Error(USAGE);
  assertValidLivingSystemData(data);
  if (week !== data.now.week) {
    throw new Error(`Requested archive week ${week} does not match current Now week ${data.now.week}.`);
  }

  const destinations = {
    en: path.join(rootDir, "now", "archive", week),
    tr: path.join(rootDir, "tr", "now", "archive", week),
  };
  for (const destination of Object.values(destinations)) {
    if (existsSync(destination)) throw new Error(`Immutable archive destination already exists: ${destination}`);
  }
  return {
    week,
    updatedAt: data.now.updatedAt,
    destinations,
    sitemapPath: path.join(rootDir, "sitemap.xml"),
  };
}

export function renderNowArchive({ locale, data, navigationHtml }) {
  if (!['en', 'tr'].includes(locale)) throw new Error(`Unknown archive locale: ${locale}`);
  assertValidLivingSystemData(data);
  if (typeof navigationHtml !== "string" || !navigationHtml.includes("<header")) {
    throw new Error("Archive navigation HTML must contain the shared site header.");
  }

  const week = data.now.week;
  const updatedAt = data.now.updatedAt;
  const urls = archiveUrls(week);
  const canonical = urls[locale];
  const currentPath = locale === "tr" ? "/tr/now/" : "/now/";
  const title = localeText(locale, `Now archive ${week}`, `Şimdi arşivi ${week}`);
  const description = localeText(
    locale,
    `Immutable weekly Now archive for ${week}, updated ${updatedAt}.`,
    `${updatedAt} tarihinde güncellenen ${week} haftasına ait değişmez Şimdi arşivi.`,
  );
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${title} · Serdar Gündoğdu`,
    url: canonical,
    isPartOf: { "@id": locale === "tr" ? "https://aserdargun.com/tr/now/" : "https://aserdargun.com/now/" },
    inLanguage: locale,
    dateModified: updatedAt,
  }, null, 2).split("\n").map((line) => `    ${line}`).join("\n");

  return `<!doctype html>
<html lang="${locale}" data-locale="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#121310">
  <title>${escapeHtml(title)} · Serdar Gündoğdu</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="Serdar Gündoğdu">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="en" href="${urls.en}">
  <link rel="alternate" hreflang="tr" href="${urls.tr}">
  <link rel="alternate" hreflang="x-default" href="${urls.en}">
  <link rel="icon" type="image/svg+xml" href="/icons/favicon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="${locale === "tr" ? "tr_TR" : "en_US"}">
  <meta property="og:locale:alternate" content="${locale === "tr" ? "en_US" : "tr_TR"}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${escapeHtml(title)} · Serdar Gündoğdu">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="https://aserdargun.com/images/${locale === "tr" ? "og-ascii-tr.jpg" : "og-ascii.jpg"}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)} · Serdar Gündoğdu">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <link rel="preload" href="/fonts/inter-var-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/styles.css?v=${ASSET_VERSION}">
  <script src="/scripts.js?v=${ASSET_VERSION}" defer></script>
  <script type="application/ld+json">
${jsonLd}
  </script>
</head>
<body>
  <a class="skip-link" href="#main">${localeText(locale, "Skip to content", "İçeriğe geç")}</a>
${navigationHtml}

  <main id="main" class="now-page" data-archive-week="${week}" data-updated-at="${updatedAt}">
    <section class="now-hero">
      <p class="now-kicker"><time datetime="${updatedAt}">${updatedAt}</time> · ${week}</p>
      <h1>${localeText(locale, "Now archive:", "Şimdi arşivi:")} <em>${week}</em></h1>
      <p class="now-intro">${localeText(locale, "An immutable weekly snapshot of the focus published on the current Now page.", "Güncel Şimdi sayfasında yayınlanan odağın değişmez haftalık anlık görüntüsü.")}</p>
    </section>
    <section class="now-grid" aria-label="${localeText(locale, "Archived focus", "Arşivlenmiş odak")}">
${renderNowCards({ locale, data })}
    </section>
    <section class="now-contact">
      <p>${localeText(locale, "This archive is read-only.", "Bu arşiv salt okunurdur.")}</p>
      <a class="now-archive-back" href="${currentPath}">${localeText(locale, "Back to current Now", "Güncel Şimdi sayfasına dön")}</a>
    </section>
  </main>

  <footer><div class="footer-inner"><p>© 2026 Serdar Gündoğdu</p><p>${localeText(locale, "AI engineer · Industrial intelligence", "AI mühendisi · Endüstriyel zekâ")}</p><a href="${locale === "tr" ? "/tr/" : "/"}">${localeText(locale, "Back to home ↑", "Ana sayfaya dön ↑")}</a></div></footer>
</body>
</html>
`;
}

function sitemapEntry({ locale, week, updatedAt }) {
  const urls = archiveUrls(week);
  return [
    "  <url>",
    `    <loc>${urls[locale]}</loc>`,
    `    <lastmod>${updatedAt}</lastmod>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${urls.en}" />`,
    `    <xhtml:link rel="alternate" hreflang="tr" href="${urls.tr}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${urls.en}" />`,
    "  </url>",
  ].join("\n");
}

function parseXmlAttributes(source, elementName) {
  const attributes = new Map();
  let remaining = source;
  while (remaining.trim() !== "") {
    const match = remaining.match(/^\s+([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/);
    if (!match) throw new Error(`Sitemap ${elementName} attributes are malformed.`);
    const name = match[1];
    if (attributes.has(name)) throw new Error(`Sitemap ${elementName} attribute is duplicated: ${name}`);
    const value = match[2] ?? match[3];
    assertWellFormedXmlAttributeValue(value);
    attributes.set(name, value);
    remaining = remaining.slice(match[0].length);
  }
  return attributes;
}

function xmlCodePointIsAllowed(codePoint) {
  return codePoint === 0x09
    || codePoint === 0x0A
    || codePoint === 0x0D
    || (codePoint >= 0x20 && codePoint <= 0xD7FF)
    || (codePoint >= 0xE000 && codePoint <= 0xFFFD)
    || (codePoint >= 0x10000 && codePoint <= 0x10FFFF);
}

function assertWellFormedXmlCharacters(source) {
  for (const character of source) {
    if (!xmlCodePointIsAllowed(character.codePointAt(0))) {
      throw new Error("Sitemap XML contains a forbidden character.");
    }
  }
}

function decodeSitemapXml(source) {
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(source);
  } catch {
    throw new Error("Sitemap XML must use valid UTF-8 encoding.");
  }
}

function consumeXmlDeclaration(source) {
  if (!source.startsWith("<?xml")) return source;
  const declarationEnd = source.indexOf("?>");
  if (declarationEnd < 0) throw new Error("Sitemap XML declaration is malformed.");
  const declaration = source.slice(0, declarationEnd + 2);
  const match = declaration.match(/^<\?xml\s+version\s*=\s*(?:"1\.0"|'1\.0')(?:\s+encoding\s*=\s*(?:"([A-Za-z][A-Za-z0-9._-]*)"|'([A-Za-z][A-Za-z0-9._-]*)'))?(?:\s+standalone\s*=\s*(?:"(?:yes|no)"|'(?:yes|no)'))?\s*\?>$/);
  if (!match) throw new Error("Sitemap XML declaration is malformed.");
  const encoding = match[1] ?? match[2];
  if (encoding !== undefined && encoding.toLowerCase() !== "utf-8") {
    throw new Error("Sitemap XML declaration encoding is unsupported.");
  }
  return source.slice(declaration.length).trim();
}

function assertWellFormedXmlReferences(source, context) {
  let cursor = 0;
  while (cursor < source.length) {
    const opening = source.indexOf("&", cursor);
    if (opening < 0) break;
    const reference = source.slice(opening).match(/^&(?:([A-Za-z][A-Za-z0-9]*)|#([0-9]+)|#x([0-9A-Fa-f]+));/);
    if (!reference) {
      throw new Error(`Sitemap XML ${context} contains a malformed or unterminated reference.`);
    }
    if (reference[1] && !XML_PREDEFINED_ENTITIES.has(reference[1])) {
      throw new Error(`Sitemap XML ${context} contains an unknown named entity.`);
    }
    const numeric = reference[2] ?? reference[3];
    if (numeric !== undefined) {
      const codePoint = Number.parseInt(numeric, reference[2] === undefined ? 16 : 10);
      if (!xmlCodePointIsAllowed(codePoint)) {
        throw new Error(`Sitemap XML ${context} contains a forbidden numeric character reference.`);
      }
    }
    cursor = opening + reference[0].length;
  }
}

function assertWellFormedXmlText(source) {
  assertWellFormedXmlReferences(source, "text");
}

function assertWellFormedXmlAttributeValue(source) {
  if (source.includes("<")) {
    throw new Error("Sitemap XML attribute contains a literal less-than sign.");
  }
  assertWellFormedXmlReferences(source, "attribute");
}

function scanXmlTagEnd(source, start) {
  let quote = null;
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote !== null) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === ">") return index;
    if (character === "<") throw new Error("Sitemap inner XML contains a nested tag opener.");
  }
  throw new Error("Sitemap inner XML contains an unclosed tag or quoted attribute.");
}

function assertWellFormedInnerXml(source) {
  const stack = [];
  let cursor = 0;
  while (cursor < source.length) {
    const opening = source.indexOf("<", cursor);
    if (opening < 0) {
      assertWellFormedXmlText(source.slice(cursor));
      break;
    }
    assertWellFormedXmlText(source.slice(cursor, opening));
    const end = scanXmlTagEnd(source, opening);
    const token = source.slice(opening, end + 1);
    const closing = token.match(/^<\/([A-Za-z_][A-Za-z0-9_.:-]*)\s*>$/);
    if (closing) {
      if (stack.pop() !== closing[1]) {
        throw new Error(`Sitemap inner XML closing tag is mismatched: ${closing[1]}`);
      }
      cursor = end + 1;
      continue;
    }

    let body = token.slice(1, -1).trimEnd();
    const selfClosing = body.endsWith("/");
    if (selfClosing) body = body.slice(0, -1).trimEnd();
    const start = body.match(/^([A-Za-z_][A-Za-z0-9_.:-]*)([\s\S]*)$/);
    if (!start || (start[2] !== "" && !/^\s/.test(start[2]))) {
      throw new Error(`Sitemap inner XML tag is malformed: ${token}`);
    }
    parseXmlAttributes(start[2], start[1]);
    if (!selfClosing) stack.push(start[1]);
    cursor = end + 1;
  }
  if (stack.length > 0) {
    throw new Error(`Sitemap inner XML element is unclosed: ${stack.at(-1)}`);
  }
}

function assertStructurallyValidSitemap(xml) {
  if (typeof xml !== "string") throw new Error("Sitemap must be XML text.");
  assertWellFormedXmlCharacters(xml);
  let document = xml.trim();
  document = consumeXmlDeclaration(document);
  if (document.includes("<?xml")) throw new Error("Sitemap may contain only one leading XML declaration.");

  const root = document.match(/^<urlset\b([^>]*)>([\s\S]*)<\/urlset\s*>$/);
  if (!root) throw new Error("Sitemap must be fully consumed by exactly one urlset root.");
  const urlsetOpenings = document.match(/<(?:[A-Za-z_][A-Za-z0-9_.-]*:)?urlset\b/g) ?? [];
  const urlsetClosings = document.match(/<\/(?:[A-Za-z_][A-Za-z0-9_.-]*:)?urlset\s*>/g) ?? [];
  if (urlsetOpenings.length !== 1 || urlsetClosings.length !== 1) {
    throw new Error("Sitemap must contain exactly one non-nested urlset root.");
  }

  const rootAttributes = parseXmlAttributes(root[1], "urlset");
  if (rootAttributes.get("xmlns") !== SITEMAP_NAMESPACE) {
    throw new Error("Sitemap urlset must declare the canonical sitemap namespace.");
  }
  if (rootAttributes.get("xmlns:xhtml") !== XHTML_NAMESPACE) {
    throw new Error("Sitemap urlset must declare the canonical xhtml namespace.");
  }

  const content = root[2];
  const openingCount = (content.match(/<url\b[^>]*>/g) ?? []).length;
  const closingCount = (content.match(/<\/url\s*>/g) ?? []).length;
  const blockPattern = /<url\b([^>]*)>([\s\S]*?)<\/url\s*>/g;
  let cursor = 0;
  let blockCount = 0;
  for (const block of content.matchAll(blockPattern)) {
    if (content.slice(cursor, block.index).trim() !== "") {
      throw new Error("Sitemap urlset may contain only complete url blocks and whitespace.");
    }
    parseXmlAttributes(block[1], "url");
    if (/<\/?url\b/.test(block[2])) throw new Error("Sitemap url blocks must not be nested.");
    assertWellFormedInnerXml(block[2]);
    cursor = block.index + block[0].length;
    blockCount += 1;
  }
  if (content.slice(cursor).trim() !== "" || openingCount !== blockCount || closingCount !== blockCount) {
    throw new Error("Sitemap url blocks must be balanced and complete.");
  }
}

export function updateSitemapForArchive({ xml, week, updatedAt }) {
  assertStructurallyValidSitemap(xml);
  if (!WEEK_PATTERN.test(week ?? "")) throw new Error("Archive sitemap week must use YYYY-Www.");
  if (!DATE_PATTERN.test(updatedAt ?? "")) throw new Error("Archive sitemap lastmod must use YYYY-MM-DD.");
  const urls = archiveUrls(week);
  for (const url of Object.values(urls)) {
    if (xml.includes(`<loc>${url}</loc>`)) throw new Error(`Sitemap already lists immutable archive URL: ${url}`);
  }
  const entries = `${sitemapEntry({ locale: "en", week, updatedAt })}\n${sitemapEntry({ locale: "tr", week, updatedAt })}\n`;
  const output = xml.replace("</urlset>", `${entries}</urlset>`);
  for (const url of Object.values(urls)) {
    if ((output.match(new RegExp(`<loc>${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</loc>`, "g")) ?? []).length !== 1) {
      throw new Error(`Rendered sitemap archive URL is invalid: ${url}`);
    }
  }
  return output;
}

function validateRenderedArchive({ html, locale, week, updatedAt, expectedCardCount }) {
  const urls = archiveUrls(week);
  const canonical = urls[locale];
  const required = [
    '<!doctype html>',
    `<html lang="${locale}" data-locale="${locale}">`,
    `<link rel="canonical" href="${canonical}">`,
    `<link rel="alternate" hreflang="en" href="${urls.en}">`,
    `<link rel="alternate" hreflang="tr" href="${urls.tr}">`,
    `<link rel="alternate" hreflang="x-default" href="${urls.en}">`,
    `data-archive-week="${week}"`,
    `data-updated-at="${updatedAt}"`,
    `<time datetime="${updatedAt}">${updatedAt}</time>`,
    'aria-current="page"',
    'data-nav-toggle',
    'data-nav-panel',
    'data-nav-backdrop',
  ];
  for (const fragment of required) {
    if (!html.includes(fragment)) throw new Error(`Rendered ${locale} archive is missing: ${fragment}`);
  }
  if ((html.match(/<article class="now-card now-card-this">/g) ?? []).length !== expectedCardCount) {
    throw new Error(`Rendered ${locale} archive card count must match canonical Now data.`);
  }
}

function parseWeekArgument(args) {
  if (args.length !== 2 || args[0] !== "--week" || !WEEK_PATTERN.test(args[1])) {
    throw new Error(USAGE);
  }
  return args[1];
}

export async function writeArchivePlan({
  plan,
  englishHtml,
  turkishHtml,
  sitemapXml,
  faultHook = () => {},
}) {
  const rootDir = path.dirname(plan.sitemapPath);
  const stagingRoot = await mkdtemp(path.join(rootDir, ".archive-now-"));
  const stagedEnglish = path.join(stagingRoot, "en-index.html");
  const stagedTurkish = path.join(stagingRoot, "tr-index.html");
  const stagedSitemap = path.join(stagingRoot, "sitemap.xml");
  const createdDestinations = [];
  try {
    await Promise.all([
      writeFile(stagedEnglish, englishHtml),
      writeFile(stagedTurkish, turkishHtml),
      writeFile(stagedSitemap, sitemapXml),
    ]);
    await Promise.all(Object.values(plan.destinations).map((destination) => mkdir(path.dirname(destination), { recursive: true })));
    for (const locale of ["en", "tr"]) {
      const destination = plan.destinations[locale];
      await mkdir(destination);
      createdDestinations.push(destination);
      await rename(locale === "en" ? stagedEnglish : stagedTurkish, path.join(destination, "index.html"));
      if (locale === "en") await faultHook("after-english-install");
    }
    await faultHook("after-archive-installs");
    await faultHook("before-sitemap-replacement");
    await rename(stagedSitemap, plan.sitemapPath);
  } catch (error) {
    await Promise.all(createdDestinations.map((destination) => rm(destination, { recursive: true, force: true })));
    throw error;
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

async function runCli() {
  const week = parseWeekArgument(process.argv.slice(2));
  const rootDir = process.cwd();
  const data = await loadLivingSystemData(path.join(rootDir, "data", "living-system.json"));
  const sitemapXml = decodeSitemapXml(await readFile(path.join(rootDir, "sitemap.xml")));
  const plan = planNowArchive({ rootDir, data, week });

  const englishHtml = renderNowArchive({
    locale: "en",
    data,
    navigationHtml: renderSiteHeader({ locale: "en", page: "archive", archiveWeek: week }),
  });
  const turkishHtml = renderNowArchive({
    locale: "tr",
    data,
    navigationHtml: renderSiteHeader({ locale: "tr", page: "archive", archiveWeek: week }),
  });
  const updatedSitemap = updateSitemapForArchive({ xml: sitemapXml, week, updatedAt: plan.updatedAt });

  validateRenderedArchive({
    html: englishHtml,
    locale: "en",
    week,
    updatedAt: plan.updatedAt,
    expectedCardCount: data.now.items.length,
  });
  validateRenderedArchive({
    html: turkishHtml,
    locale: "tr",
    week,
    updatedAt: plan.updatedAt,
    expectedCardCount: data.now.items.length,
  });
  await writeArchivePlan({ plan, englishHtml, turkishHtml, sitemapXml: updatedSitemap });
  console.log(`Archived ${week} in English and Turkish.`);
}

const invokedAsCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsCli) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
