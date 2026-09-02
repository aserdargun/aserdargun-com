import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidLivingSystemData,
  getFreshnessState,
  loadLivingSystemData,
  summarizeApplications,
} from "./living-system-data.mjs";
import {
  directText as activeDirectText,
  isActive as isActiveHtmlNode,
  parseActiveHtml,
  semanticText as activeSemanticText,
} from "./active-html-model.mjs";

const GENERATED_BLOCKS = new Set([
  "site-header",
  "living-system",
  "primary-navigation",
  "application-map",
  "now-content",
  "public-memory",
  "journey-evidence",
]);

const REQUIRED_PAGE_BLOCKS = {
  home: ["application-map"],
  now: ["now-content"],
  memory: ["public-memory"],
};

const SITE_DOCUMENTS = [
  { relativePath: "index.html", page: "home", locale: "en" },
  { relativePath: "tr/index.html", page: "home", locale: "tr" },
  { relativePath: "now/index.html", page: "now", locale: "en" },
  { relativePath: "tr/now/index.html", page: "now", locale: "tr" },
  { relativePath: "memory/index.html", page: "memory", locale: "en" },
  { relativePath: "tr/memory/index.html", page: "memory", locale: "tr" },
];

const PUBLIC_HTML_FORBIDDEN_FIELDS = [
  "ownerPrompt",
  "privateNote",
  "privateContent",
  "driveFileId",
  "oauthToken",
  "accessToken",
  "refreshToken",
  "clientSecret",
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function label(locale, english, turkish) {
  return locale === "tr" ? turkish : english;
}

export function scanPublicHtmlPrivacy({ relativePath, html }) {
  const diagnostics = [];
  for (const field of PUBLIC_HTML_FORBIDDEN_FIELDS) {
    const pattern = field.replace(/[A-Z]/g, (character) => `[\\s_-]*${character.toLowerCase()}`);
    if (new RegExp(pattern, "i").test(html)) {
      diagnostics.push(`file=${relativePath} forbidden=${field}`);
    }
  }
  if (/visibility["']?[\s_-]*[=:]\s*["']?(?:owner[\s_-]*only|unlisted)\b/i.test(html)) {
    diagnostics.push(`file=${relativePath} forbidden=visibility`);
  }
  return diagnostics;
}

export async function scanPublicHtmlFiles(rootDir) {
  const diagnostics = [];
  const visit = async (directory) => {
    const entries = (await readdir(directory, { withFileTypes: true }))
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        const relativePath = path.relative(rootDir, absolutePath).split(path.sep).join("/");
        diagnostics.push(...scanPublicHtmlPrivacy({
          relativePath,
          html: await readFile(absolutePath, "utf8"),
        }));
      }
    }
  };
  await visit(rootDir);
  return diagnostics;
}

function repositoryLabel(repository) {
  return new URL(repository).pathname.split("/").filter(Boolean).at(-1);
}

function addressLabel(address) {
  return new URL(address).hostname;
}

function freshnessLabel(locale, state) {
  const labels = {
    current: label(locale, "Current", "Güncel"),
    aging: label(locale, "Review soon", "Yakında gözden geçir"),
    "needs-refresh": label(locale, "Needs refresh", "Yenilenmeli"),
  };
  return labels[state];
}

function renderFreshness({ locale, dateOnly, today }) {
  const state = getFreshnessState(dateOnly, today);
  const pulseClass = state === "current" ? " app-live-dot--pulsing" : "";
  return `<span class="freshness freshness--${state}" data-freshness-date="${escapeHtml(dateOnly)}" data-freshness-state="${state}"><span class="app-live-dot${pulseClass}" aria-hidden="true"></span><span class="freshness-label">${freshnessLabel(locale, state)}</span><time datetime="${escapeHtml(dateOnly)}">${escapeHtml(dateOnly)}</time></span>`;
}

function assertRecognizedMarkers(html) {
  for (const match of html.matchAll(/<!-- GENERATED:([^:]+):(start|end) -->/g)) {
    if (!GENERATED_BLOCKS.has(match[1])) {
      throw new Error(`Unknown generated block: ${match[1]}`);
    }
  }
}

export function replaceGeneratedBlock(html, blockName, renderedHtml) {
  if (!GENERATED_BLOCKS.has(blockName)) {
    throw new Error(`Unknown generated block: ${blockName}`);
  }

  const startMarker = `<!-- GENERATED:${blockName}:start -->`;
  const endMarker = `<!-- GENERATED:${blockName}:end -->`;
  const startIndex = html.indexOf(startMarker);
  const endIndex = html.indexOf(endMarker);

  if (
    startIndex < 0
    || endIndex < 0
    || startIndex !== html.lastIndexOf(startMarker)
    || endIndex !== html.lastIndexOf(endMarker)
    || startIndex > endIndex
  ) {
    throw new Error(`Expected exactly one ordered marker pair for ${blockName}`);
  }

  const contentStart = startIndex + startMarker.length;
  return `${html.slice(0, contentStart)}\n${renderedHtml}\n${html.slice(endIndex)}`;
}

export function renderPrimaryNavigation({ locale, page }) {
  const root = locale === "tr" ? "/tr/" : "/";
  const routeFor = (suffix) => `${root}${suffix}`;
  const concepts = [
    { key: "journey", label: label(locale, "Journey", "Yolculuk"), href: `${root}#journey` },
    { key: "now", label: label(locale, "Now", "Şimdi"), href: routeFor("now/") },
    { key: "horizon", label: label(locale, "Horizon", "Ufuk"), href: `${root}#horizon` },
    { key: "applications", label: label(locale, "Applications", "Uygulamalar"), href: `${root}#apps` },
    { key: "memory", label: label(locale, "Knowledge", "Bilgi"), href: routeFor("memory/") },
    { key: "about", label: label(locale, "About", "Hakkımda"), href: `${root}#about` },
  ];
  const currentKey = page === "memory" ? "memory" : ["now", "archive"].includes(page) ? "now" : null;
  const primaryLinks = concepts.map((concept) => {
    const current = concept.key === currentKey ? ' aria-current="page"' : "";
    return `    <a class="nav-links__primary-link" href="${concept.href}"${current}>${concept.label}</a>`;
  });
  const externalLink = (code) => `      <a class="nav-links__external" href="https://${code}.aserdargun.com/" target="_blank" rel="noreferrer">${code} <span aria-hidden="true">↗</span> <span class="sr-only">${label(locale, "opens in a new tab", "yeni sekmede açılır")}</span></a>`;

  return [
    `  <nav class="nav-links" aria-label="${label(locale, "Primary navigation", "Ana navigasyon")}">`,
    '  <div class="nav-links__primary">',
    ...primaryLinks,
    "  </div>",
    `  <a class="nav-links__secondary-link" href="${root}#learning">${label(locale, "Learning", "Öğrenme")}</a>`,
    `  <div class="nav-links__group" data-nav-group="horizon" role="group" aria-labelledby="nav-horizon-label-${locale}">`,
    `    <span class="nav-links__section" id="nav-horizon-label-${locale}">${label(locale, "The horizon", "Ufuk")}</span>`,
    externalLink("wfm"),
    externalLink("itl"),
    externalLink("eng"),
    "  </div>",
    `  <div class="nav-links__group" data-nav-group="private" role="group" aria-labelledby="nav-private-label-${locale}">`,
    `    <span class="nav-links__section" id="nav-private-label-${locale}">${label(locale, "Private systems", "Özel sistemler")}</span>`,
    externalLink("stk"),
    externalLink("inf"),
    externalLink("nxt"),
    "  </div>",
    "  </nav>",
  ].join("\n");
}

export function renderSiteHeader({ locale, page, archiveWeek }) {
  const root = locale === "tr" ? "/tr/" : "/";
  if (page === "archive" && !/^\d{4}-W\d{2}$/.test(archiveWeek ?? "")) {
    throw new Error("Archive headers require a canonical week.");
  }
  const suffix = page === "home"
    ? ""
    : page === "archive" ? `now/archive/${archiveWeek}/` : `${page}/`;
  const englishHref = `/${suffix}`;
  const turkishHref = `/tr/${suffix}`;
  const panelId = `site-navigation-${page}${page === "archive" ? `-${archiveWeek}` : ""}-${locale}`;
  const pageClass = page === "home" ? "" : " site-header-page";
  const homeHref = page === "home" ? `${root}#top` : root;
  const openLabel = label(locale, "Open menu", "Menüyü aç");
  const closeLabel = label(locale, "Close menu", "Menüyü kapat");
  const currentLanguageLabel = label(locale, "Current language", "Geçerli dil");

  return [
    `  <header class="site-header${pageClass}">`,
    `    <a class="wordmark" href="${homeHref}" aria-label="${label(locale, "SG — Serdar Gündoğdu, home", "SG — Serdar Gündoğdu, ana sayfa")}">`,
    '      <span class="wordmark-mark" aria-hidden="true">SG</span>',
    "      <span>Serdar Gündoğdu</span>",
    "    </a>",
    `    <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="${panelId}" aria-label="${openLabel}" data-open-label="${openLabel}" data-close-label="${closeLabel}">`,
    '      <span class="nav-toggle__bars" aria-hidden="true"><span></span><span></span><span></span></span>',
    "    </button>",
    `    <div class="nav-panel" id="${panelId}" data-nav-panel>`,
    "      <!-- GENERATED:primary-navigation:start -->",
    renderPrimaryNavigation({ locale, page }),
    "<!-- GENERATED:primary-navigation:end -->",
    '      <div class="nav-panel__footer">',
    `        <nav class="language-switch" aria-label="${label(locale, "Language selection", "Dil seçimi")}">`,
    `          <a href="${turkishHref}" lang="tr" data-language-link="tr" aria-label="TR — ${locale === "tr" ? currentLanguageLabel : "Türkçe sürüme geç"}"${locale === "tr" ? ' aria-current="page"' : ""}>TR</a>`,
    '          <span aria-hidden="true">/</span>',
    `          <a href="${englishHref}" lang="en" data-language-link="en" aria-label="EN — ${locale === "en" ? "Current language" : "İngilizce sürüme geç"}"${locale === "en" ? ' aria-current="page"' : ""}>EN</a>`,
    "        </nav>",
    `        <a class="nav-cta nav-cta--panel" href="mailto:aserdargun@gmail.com">${label(locale, "Let&apos;s talk", "Konuşalım")} <span aria-hidden="true">↗</span></a>`,
    "      </div>",
    "    </div>",
    "  </header>",
    '  <div class="nav-backdrop" data-nav-backdrop aria-hidden="true"></div>',
  ].join("\n");
}

function addNewTabAccessibilityText(html, locale) {
  const htmlText = label(locale, "opens in a new tab", "yeni sekmede açılır");
  const svgText = label(locale, "Opens in a new tab", "Yeni sekmede açılır");

  const addAttributeToken = (attributes, name, token) => {
    const match = attributes.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([^"']*)\\1`, "i"));
    if (!match) return `${attributes} ${name}="${token}"`;
    if (match[2].split(/\s+/).includes(token)) return attributes;
    return attributes.replace(match[0], `${name}=${match[1]}${match[2]} ${token}${match[1]}`);
  };

  const enhanceAnchors = (source, namespace) => source.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (anchor, rawAttributes, rawContent, anchorIndex) => {
    if (!/\btarget\s*=\s*["']_blank["']/i.test(rawAttributes)) return anchor;

    let attributes = addAttributeToken(rawAttributes, "rel", "noreferrer");
    let content = rawContent;

    if (namespace === "svg") {
      content = content.replace(/\s*<span\s+class=["']sr-only["']>[\s\S]*?<\/span>\s*/gi, "\n");
      const href = attributes.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
      const code = href.match(/^https:\/\/([a-z]{3})\.aserdargun\.com\/$/i)?.[1]?.toLowerCase() ?? String(anchorIndex);
      const titleId = `ld-new-tab-${code}-${locale}`;
      const visibleName = Array.from(content.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gi), (match) => match[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean).join(" ");
      if (!/\baria-(?:label|labelledby)\s*=/i.test(attributes) && visibleName) {
        attributes += ` aria-label="${escapeHtml(visibleName)}"`;
      }
      attributes = addAttributeToken(attributes, "aria-describedby", titleId);
      content = content.replace(new RegExp(`\\s*<title\\s+id=["']${titleId}["']>[\\s\\S]*?<\\/title>\\s*`, "i"), "\n");
      content = `\n              <title id="${titleId}">${svgText}</title>${content}`;
      return `<a${attributes}>${content}</a>`;
    }

    if (!/<span\s+class=["']sr-only["']>/i.test(content)) {
      content += ` <span class="sr-only">${htmlText}</span>`;
    }
    return `<a${attributes}>${content}</a>`;
  });

  const svgScopes = [];
  const htmlWithPlaceholders = html.replace(/<svg\b[\s\S]*?<\/svg>/gi, (svg) => {
    const placeholder = `<!-- NEW_TAB_SVG_SCOPE_${svgScopes.length} -->`;
    svgScopes.push(enhanceAnchors(svg, "svg"));
    return placeholder;
  });
  const enhancedHtml = enhanceAnchors(htmlWithPlaceholders, "html");
  return svgScopes.reduce(
    (source, svg, index) => source.replace(`<!-- NEW_TAB_SVG_SCOPE_${index} -->`, svg),
    enhancedHtml,
  );
}

export function renderLivingSystem({ locale }) {
  const root = locale === "tr" ? "/tr/" : "/";
  const cards = locale === "tr" ? [
    { href: `${root}#journey`, eyebrow: "Yolculuk", heading: "Geçmiş", description: "Geride kalan çalışmalar, fiziksel sistemlerden AI&apos;a uzanan izlenebilir bir yolculuktur." },
    { href: `${root}now/`, eyebrow: "Aktif", heading: "Şimdi", description: "Dikkatimin ve çalışmalarımın şimdi nereye yöneldiğini gösteren tarihli bir görünüm." },
    { href: `${root}#horizon`, eyebrow: "Ufuk", heading: "Gelecek", description: "Uzun vadeli yön, fiziksel dünyada açık insansı robot mühendisliğidir." },
    { href: `${root}memory/`, eyebrow: "Yayınlanan", heading: "Bilgi", description: "Burada yalnızca açıkça onaylanmış kamusal hafıza kayıtları görünür." },
    { href: `${root}#apps`, eyebrow: "Çalışan çıktılar", heading: "Uygulamalar", description: "Birikmiş bilgi; odaklı uygulamalara, laboratuvarlara ve uzun vadeli çalışmalara dönüşür." },
  ] : [
    { href: `${root}#journey`, eyebrow: "Journey", heading: "Past", description: "The work behind me is a traceable journey from physical systems to AI." },
    { href: `${root}now/`, eyebrow: "Active", heading: "Now", description: "A dated view of where my attention and work are going now." },
    { href: `${root}#horizon`, eyebrow: "Horizon", heading: "Future", description: "The long-term direction is open humanoid engineering in the physical world." },
    { href: `${root}memory/`, eyebrow: "Published", heading: "Knowledge", description: "Only explicitly approved public memory snapshots appear here." },
    { href: `${root}#apps`, eyebrow: "Working outputs", heading: "Applications", description: "Accumulated knowledge becomes focused applications, labs, and long-term work." },
  ];
  const renderedCards = cards.map((card) => [
    `      <a class="living-system-card" href="${card.href}">`,
    `        <span class="living-system-card__eyebrow">${card.eyebrow}</span>`,
    `        <h2>${card.heading}</h2>`,
    `        <p>${card.description}</p>`,
    '        <span class="living-system-card__arrow" aria-hidden="true">→</span>',
    "      </a>",
  ].join("\n"));
  return [
    `    <section class="living-system" aria-labelledby="living-system-title-${locale}">`,
    `      <h2 class="sr-only" id="living-system-title-${locale}">${label(locale, "Living system", "Yaşayan sistem")}</h2>`,
    '      <div class="living-system-grid">',
    ...renderedCards,
    "      </div>",
    "    </section>",
  ].join("\n");
}

export function renderApplicationMap({ locale, data, today }) {
  const summary = summarizeApplications(data.applications)[locale];
  const root = locale === "tr" ? "/tr/" : "/";
  const kindLabels = {
    atlas: label(locale, "Atlas", "Atlas"),
    tool: label(locale, "Tool", "Araç"),
    lab: label(locale, "Lab", "Laboratuvar"),
    horizon: label(locale, "Horizon", "Ufuk"),
    "private-system": label(locale, "Private system", "Özel sistem"),
  };
  const statusLabels = {
    idea: label(locale, "Idea", "Fikir"),
    design: label(locale, "Design", "Tasarım"),
    active: label(locale, "Active", "Aktif"),
    live: label(locale, "Live", "Yayında"),
    paused: label(locale, "Paused", "Duraklatıldı"),
    archived: label(locale, "Archived", "Arşivlendi"),
  };
  const publicMemory = new Map(data.publicMemory.map((memory) => [memory.id, memory]));
  const rows = data.applications.map((application) => {
    const status = application.updatedAt
      ? renderFreshness({ locale, dateOnly: application.updatedAt, today })
      : `<span class="app-updated app-updated-horizon"><span class="app-horizon-dot" aria-hidden="true"></span>${label(locale, "Horizon · in design", "Ufuk · tasarım aşamasında")}</span>`;
    const rowClass = application.systemRole === "horizon" ? ' class="app-row-horizon"' : "";
    const title = escapeHtml(application.title[locale]);
    const summary = escapeHtml(application.summary[locale]);
    const repository = escapeHtml(application.repository);
    const repositoryName = escapeHtml(repositoryLabel(application.repository));
    const address = escapeHtml(application.address);
    const domain = escapeHtml(addressLabel(application.address));
    const guidingQuestion = application.guidingQuestion === undefined ? "" : `<p class="app-guiding-question"><strong>${label(locale, "Guiding question", "Yönlendirici soru")}</strong>${escapeHtml(application.guidingQuestion[locale])}</p>`;
    const nextDirection = application.nextDirection === undefined ? "" : `<p class="app-next-direction"><strong>${label(locale, "Next direction", "Sonraki yön")}</strong>${escapeHtml(application.nextDirection[locale])}</p>`;
    const relatedMemory = application.relatedMemoryIds.length === 0 ? "" : [
      `                <section class="app-related-memory" aria-label="${label(locale, "Related knowledge", "İlgili bilgi")}">`,
      `                  <h3>${label(locale, "Related knowledge", "İlgili bilgi")} <span class="app-related-memory__count">${application.relatedMemoryIds.length} ${label(locale, application.relatedMemoryIds.length === 1 ? "record" : "records", "kayıt")}</span></h3>`,
      "                  <ul>",
      ...application.relatedMemoryIds.map((memoryId) => {
        const memory = publicMemory.get(memoryId);
        return `                    <li><a href="${root}memory/#memory-${escapeHtml(memoryId)}">${escapeHtml(memory.title[locale])}</a></li>`;
      }),
      "                  </ul>",
      "                </section>",
    ].join("\n");
    const applicationDetails = [
      '                <dl class="app-record-meta">',
      `                  <div><dt>${label(locale, "Kind", "Tür")}</dt><dd>${kindLabels[application.kind]}</dd></div>`,
      `                  <div><dt>${label(locale, "Status", "Durum")}</dt><dd>${statusLabels[application.status]}</dd></div>`,
      "                </dl>",
      guidingQuestion,
      nextDirection,
      relatedMemory,
    ].filter(Boolean).join("\n");
    return `              <tr${rowClass}><th scope="row"><code>${escapeHtml(application.code)}</code></th><td><strong>${title}</strong><span>${summary}</span>${status}\n${applicationDetails}</td><td><a href="${repository}" target="_blank" rel="noreferrer"><code>${repositoryName}</code> <span aria-hidden="true">↗</span></a></td><td><a href="${address}" target="_blank" rel="noreferrer">${domain} <span aria-hidden="true">↗</span></a></td></tr>`;
  });

  return [
    "          <div class=\"app-map-intro\">",
    `            <p class="app-map-kicker">${label(locale, "Application map · live destinations", "Uygulama haritası · canlı adresler")}</p>`,
    `            <h2 id="app-map-title">${label(locale, "One portfolio. Focused applications.", "Tek portföy. Odaklı uygulamalar.")}</h2>`,
    `            <p id="app-map-description">${escapeHtml(summary)} ${label(locale, "The three-letter code is the permanent key between each application, repository, and", "Üç harfli kod; her uygulama, repo ve")} <code>aserdargun.com</code> ${label(locale, "subdomain.", "alt alan adı arasındaki kalıcı anahtardır.")}</p>`,
    "          </div>",
    "          <div class=\"app-map-table-wrap\" role=\"region\" aria-labelledby=\"app-map-title\" tabindex=\"0\">",
    "          <table>",
    `            <thead><tr><th scope="col">${label(locale, "Code", "Kod")}</th><th scope="col">${label(locale, "Application", "Uygulama")}</th><th scope="col">${label(locale, "Repository", "Repo")}</th><th scope="col">${label(locale, "Address", "Adres")}</th></tr></thead>`,
    "            <tbody>",
    ...rows,
    "            </tbody>",
    "          </table>",
    "          </div>",
  ].join("\n");
}

export function renderNowCards({ locale, data }) {
  const order = ["week", "month", "long-term"];
  const timeframeLabels = {
    week: label(locale, "This week", "Bu hafta"),
    month: label(locale, "This month", "Bu ay"),
    "long-term": label(locale, "Long-term focus", "Uzun vadeli odak"),
  };
  return order.map((timeframe, index) => {
    const item = data.now.items.find((candidate) => candidate.timeframe === timeframe);
    const tags = item.tags.map((tag) => `          <li>${escapeHtml(tag[locale])}</li>`).join("\n");
    return [
      '      <article class="now-card now-card-this">',
      `        <p class="now-card-label"><span aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>${timeframeLabels[timeframe]}</p>`,
      `        <h2>${escapeHtml(item.title[locale])}</h2>`,
      `        <p>${escapeHtml(item.summary[locale])}</p>`,
      '        <ul class="now-tags">',
      tags,
      "        </ul>",
      "      </article>",
    ].join("\n");
  }).join("\n");
}

export function renderNowContent({ locale, data, today, archiveLinks = [] }) {
  const archiveRoot = locale === "tr" ? "/tr/now/archive/" : "/now/archive/";
  const sortedArchiveLinks = [...archiveLinks].sort((left, right) => right.week.localeCompare(left.week));
  const archiveSection = sortedArchiveLinks.length === 0 ? "" : [
    `    <section class="now-archive" aria-label="${label(locale, "Weekly archives", "Haftalık arşivler")}">`,
    `      <h2>${label(locale, "Weekly archives", "Haftalık arşivler")}</h2>`,
    '      <ol class="now-archive-list">',
    ...sortedArchiveLinks.map(({ week, updatedAt }) => [
      "        <li>",
      `          <time datetime="${escapeHtml(updatedAt)}">${escapeHtml(updatedAt)}</time>`,
      `          <span><a class="now-archive-link" href="${archiveRoot}${escapeHtml(week)}/">${escapeHtml(week)}</a></span>`,
      "        </li>",
    ].join("\n")),
    "      </ol>",
    "    </section>",
  ].join("\n");
  return [
    "    <section class=\"now-hero\">",
    `      <p class="now-kicker">${renderFreshness({ locale, dateOnly: data.now.updatedAt, today })} · ${locale === "tr" ? `${Number(data.now.week.slice(-2))}. hafta` : `Week ${Number(data.now.week.slice(-2))}`}</p>`,
    `      <h1>${label(locale, "What I&apos;m working on, <em>right now.</em>", "Şu an ne üzerinde çalışıyorum, <em>gerçekten.</em>")}</h1>`,
    `      <p class="now-intro">${label(locale, "A short, dated list — not a curated bio. The point is to show where my attention is going this week and what I&apos;m building toward this month. If something here resonates or you want to swap notes on it, write to me.", "Kısa, tarihli, küratörlük olmayan bir not. Buradaki amaç dikkatimin bu hafta nereye aktığı ve bu ay ne inşa ettiğimi göstermek. Listelenen bir şey sende yankı uyandırırsa ya da not alışverişi yapmak istersen, bana yaz.")}</p>`,
    "    </section>",
    `    <section class="now-grid" aria-label="${escapeHtml(label(locale, "Current focus", "Şu anki odak"))}">`,
    renderNowCards({ locale, data }),
    "    </section>",
    archiveSection,
  ].filter(Boolean).join("\n");
}

export function renderPublicMemory({ locale, data }) {
  if (data.publicMemory.length === 0) {
    return `      <p class="memory-empty">${label(locale, "No public memory snapshots have been approved yet.", "Henüz onaylanmış kamusal hafıza kaydı yok.")}</p>`;
  }

  const typeLabels = {
    event: label(locale, "Event", "Olay"),
    decision: label(locale, "Decision", "Karar"),
    learning: label(locale, "Learning", "Öğrenme"),
    plan: label(locale, "Plan", "Plan"),
    project: label(locale, "Project", "Proje"),
    publication: label(locale, "Publication", "Yayın"),
  };
  const applications = new Map(data.applications.map((application) => [application.code, application]));
  const externalArrow = '<span aria-hidden="true">↗</span>';
  const cards = data.publicMemory.map((memory) => {
    const tags = memory.tags.length === 0 ? "" : [
      `        <ul class="memory-card__tags" aria-label="${label(locale, "Tags", "Etiketler")}">`,
      ...memory.tags.map((tag) => `          <li>${escapeHtml(tag)}</li>`),
      "        </ul>",
    ].join("\n");
    const relatedApplications = memory.relatedApplicationCodes.length === 0 ? "" : [
      `        <section class="memory-card__related" aria-label="${label(locale, "Related applications", "İlgili uygulamalar")}">`,
      `          <h3>${label(locale, "Related applications", "İlgili uygulamalar")}</h3>`,
      "          <ul>",
      ...memory.relatedApplicationCodes.map((code) => {
        const application = applications.get(code);
        return `            <li><a href="${escapeHtml(application.address)}" target="_blank" rel="noreferrer"><code>${escapeHtml(code)}</code> <span>${escapeHtml(application.title[locale])}</span> ${externalArrow}</a></li>`;
      }),
      "          </ul>",
      "        </section>",
    ].join("\n");
    const evidence = memory.evidenceUrls.length === 0 ? "" : [
      `        <section class="memory-card__evidence" aria-label="${label(locale, "Evidence", "Kanıt")}">`,
      `          <h3>${label(locale, "Evidence", "Kanıt")}</h3>`,
      "          <ul>",
      ...memory.evidenceUrls.map((url, index) => `            <li><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${label(locale, "Evidence", "Kanıt")} ${index + 1} ${externalArrow}</a></li>`),
      "          </ul>",
      "        </section>",
    ].join("\n");
    return [
      `      <article class="memory-card" id="memory-${escapeHtml(memory.id)}" data-memory-id="${escapeHtml(memory.id)}">`,
      `        <p class="memory-card__type">${typeLabels[memory.type]}</p>`,
      `        <h2>${escapeHtml(memory.title[locale])}</h2>`,
      `        <p class="memory-card__summary">${escapeHtml(memory.summary[locale])}</p>`,
      '        <dl class="memory-card__dates">',
      `          <div><dt>${label(locale, "Published", "Yayınlandı")}</dt><dd><time datetime="${escapeHtml(memory.publishedAt)}">${escapeHtml(memory.publishedAt)}</time></dd></div>`,
      `          <div><dt>${label(locale, "Updated", "Güncellendi")}</dt><dd><time datetime="${escapeHtml(memory.updatedAt)}">${escapeHtml(memory.updatedAt)}</time></dd></div>`,
      "        </dl>",
      tags,
      relatedApplications,
      evidence,
      `        <a class="memory-card__source" href="${escapeHtml(memory.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(memory.sourceLabel)} ${externalArrow}</a>`,
      "      </article>",
    ].filter(Boolean).join("\n");
  });
  return ['      <div class="memory-list">', ...cards, "      </div>"].join("\n");
}

export function renderJourneyEvidence({ locale, data, documentHtml }) {
  if (data.journeyEvidence.length === 0) return "";

  const applications = new Map(data.applications.map((application) => [application.code, application]));
  const externalArrow = '<span aria-hidden="true">↗</span>';
  const cards = data.journeyEvidence.map((evidence) => {
    const targetId = `journey-stage-${evidence.stage}`;
    assertJourneyStageTarget({ documentHtml, stage: evidence.stage, targetId });
    const period = evidence.period === null
      ? ""
      : `        <p class="journey-evidence-card__period">${escapeHtml(evidence.period)}</p>`;
    const links = evidence.evidenceUrls.length === 0 ? "" : [
      `        <section class="journey-evidence-card__evidence" aria-label="${label(locale, "Evidence", "Kanıt")}">`,
      `          <h3>${label(locale, "Evidence", "Kanıt")}</h3>`,
      "          <ul>",
      ...evidence.evidenceUrls.map((url, index) => `            <li><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${label(locale, "Evidence", "Kanıt")} ${index + 1} ${externalArrow}</a></li>`),
      "          </ul>",
      "        </section>",
    ].join("\n");
    const relatedApplications = evidence.relatedApplicationCodes.length === 0 ? "" : [
      `        <section class="journey-evidence-card__applications" aria-label="${label(locale, "Related applications", "İlgili uygulamalar")}">`,
      `          <h3>${label(locale, "Related applications", "İlgili uygulamalar")}</h3>`,
      "          <ul>",
      ...evidence.relatedApplicationCodes.map((code) => {
        const application = applications.get(code);
        return `            <li><a href="${escapeHtml(application.address)}" target="_blank" rel="noreferrer"><code>${escapeHtml(code)}</code> ${escapeHtml(application.title[locale])} ${externalArrow}</a></li>`;
      }),
      "          </ul>",
      "        </section>",
    ].join("\n");
    return [
      `      <li><article class="journey-evidence-card" data-journey-stage="${escapeHtml(evidence.stage)}">`,
      `        <p class="journey-evidence-card__stage"><a href="#${targetId}">${label(locale, "Stage", "Aşama")} ${escapeHtml(evidence.stage)}</a></p>`,
      period,
      `        <p class="journey-evidence-card__decision">${escapeHtml(evidence.decision[locale])}</p>`,
      links,
      relatedApplications,
      "      </article></li>",
    ].filter(Boolean).join("\n");
  });
  return [
    `    <section class="journey-evidence" aria-labelledby="journey-evidence-title-${locale}">`,
    '      <div class="journey-evidence-inner">',
    `        <p class="journey-evidence-kicker">${label(locale, "Verified journey evidence", "Doğrulanmış yolculuk kanıtı")}</p>`,
    `        <h2 id="journey-evidence-title-${locale}">${label(locale, "Decisions connected to the journey.", "Yolculuğa bağlı kararlar.")}</h2>`,
    '        <ol class="journey-evidence-list">',
    ...cards,
    "        </ol>",
    "      </div>",
    "    </section>",
  ].join("\n");
}

export function renderDocument({ html, page, locale, data, today, archiveLinks = [] }) {
  if (!(page in REQUIRED_PAGE_BLOCKS)) throw new Error(`Unknown render page: ${page}`);
  if (!['en', 'tr'].includes(locale)) throw new Error(`Unknown render locale: ${locale}`);
  assertValidLivingSystemData(data, { today });
  assertRecognizedMarkers(html);

  const renderers = {
    "site-header": () => renderSiteHeader({ locale, page }),
    "primary-navigation": () => renderPrimaryNavigation({ locale, page }),
    "living-system": () => renderLivingSystem({ locale, data, today }),
    "application-map": () => renderApplicationMap({ locale, data, today }),
    "now-content": () => renderNowContent({ locale, data, today, archiveLinks }),
    "public-memory": () => renderPublicMemory({ locale, data }),
    "journey-evidence": () => renderJourneyEvidence({ locale, data, documentHtml: html }),
  };

  for (const blockName of REQUIRED_PAGE_BLOCKS[page]) {
    if (!html.includes(`<!-- GENERATED:${blockName}:start -->`)) {
      throw new Error(`Expected generated block ${blockName} for ${page}`);
    }
  }
  const presentBlocks = [...GENERATED_BLOCKS].filter((blockName) => html.includes(`<!-- GENERATED:${blockName}:start -->`));

  const rendered = presentBlocks.reduce(
    (rendered, blockName) => replaceGeneratedBlock(rendered, blockName, renderers[blockName]()),
    html,
  );
  return addNewTabAccessibilityText(rendered, locale);
}

function archiveUrlSet(week) {
  return {
    en: `https://aserdargun.com/now/archive/${week}/`,
    tr: `https://aserdargun.com/tr/now/archive/${week}/`,
  };
}

const ARCHIVE_VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr",
]);
const ARCHIVE_RCDATA_ELEMENTS = new Set(["title", "textarea"]);
const ARCHIVE_RAW_TEXT_ELEMENTS = new Set([
  "script", "style", "xmp", "iframe", "noembed", "noframes", "noscript",
]);
const ARCHIVE_TEXT_ONLY_ELEMENTS = new Set([
  ...ARCHIVE_RCDATA_ELEMENTS,
  ...ARCHIVE_RAW_TEXT_ELEMENTS,
]);

function archiveStructureError(message) {
  throw new Error(`Malformed Now archive HTML: ${message}`);
}

function scanArchiveTagEnd(source, start) {
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
    if (character === "<") archiveStructureError("nested tag opener before the current tag closed");
  }
  archiveStructureError("unclosed tag or quoted attribute");
}

function parseArchiveAttributes(source, tagName) {
  const attributes = new Map();
  let index = 0;
  while (index < source.length) {
    while (/\s/.test(source[index] ?? "")) index += 1;
    if (index >= source.length) break;
    const nameMatch = source.slice(index).match(/^[^\s"'<>\/=]+/);
    if (!nameMatch) archiveStructureError(`malformed attribute on <${tagName}>`);
    const name = nameMatch[0].toLowerCase();
    if (attributes.has(name)) archiveStructureError(`duplicate ${name} attribute on <${tagName}>`);
    index += nameMatch[0].length;
    while (/\s/.test(source[index] ?? "")) index += 1;
    if (source[index] !== "=") {
      attributes.set(name, true);
      continue;
    }
    index += 1;
    while (/\s/.test(source[index] ?? "")) index += 1;
    const quote = source[index];
    if (quote !== '"' && quote !== "'") {
      archiveStructureError(`unquoted ${name} attribute on <${tagName}>`);
    }
    const valueStart = index + 1;
    const valueEnd = source.indexOf(quote, valueStart);
    if (valueEnd < 0) archiveStructureError(`unclosed ${name} attribute on <${tagName}>`);
    attributes.set(name, source.slice(valueStart, valueEnd));
    index = valueEnd + 1;
  }
  return attributes;
}

function parseArchiveStartTag(token) {
  let body = token.slice(1, -1).trimEnd();
  const selfClosing = body.endsWith("/");
  if (selfClosing) body = body.slice(0, -1).trimEnd();
  const nameMatch = body.match(/^([A-Za-z][A-Za-z0-9:-]*)([\s\S]*)$/);
  if (!nameMatch || (nameMatch[2] !== "" && !/^\s/.test(nameMatch[2]))) {
    archiveStructureError(`malformed start tag ${token}`);
  }
  const tagName = nameMatch[1].toLowerCase();
  return {
    tagName,
    attributes: parseArchiveAttributes(nameMatch[2], tagName),
    selfClosing,
  };
}

function archiveInsertionNamespace(parent) {
  if (parent.type !== "element") return "html";
  if (parent.namespace === "svg" && parent.tagName !== "foreignobject") return "svg";
  return "html";
}

function parseArchiveHtmlTreeLegacy(source) {
  const root = { type: "root", source, parent: null, children: [], start: 0, end: source.length };
  const stack = [root];
  const appendText = (start, end) => {
    if (end <= start) return;
    const parent = stack.at(-1);
    parent.children.push({ type: "text", value: source.slice(start, end), start, end, parent });
  };
  let cursor = 0;
  while (cursor < source.length) {
    if (source[cursor] !== "<") {
      const nextTag = source.indexOf("<", cursor);
      const end = nextTag < 0 ? source.length : nextTag;
      appendText(cursor, end);
      cursor = end;
      continue;
    }
    if (source.startsWith("<!--", cursor)) {
      const commentEnd = source.indexOf("-->", cursor + 4);
      if (commentEnd < 0) archiveStructureError("unclosed HTML comment");
      cursor = commentEnd + 3;
      continue;
    }
    const tokenEnd = scanArchiveTagEnd(source, cursor);
    const token = source.slice(cursor, tokenEnd + 1);
    if (/^<!doctype\s+html\s*>$/i.test(token)) {
      cursor = tokenEnd + 1;
      continue;
    }
    if (token.startsWith("<!") || token.startsWith("<?")) {
      archiveStructureError(`unsupported declaration ${token}`);
    }
    if (token.startsWith("</")) {
      const closingMatch = token.match(/^<\/([A-Za-z][A-Za-z0-9:-]*)\s*>$/);
      if (!closingMatch) archiveStructureError(`malformed closing tag ${token}`);
      const tagName = closingMatch[1].toLowerCase();
      const opening = stack.at(-1);
      if (opening === root || opening.tagName !== tagName) {
        archiveStructureError(`mismatched closing tag </${tagName}>`);
      }
      opening.contentEnd = cursor;
      opening.end = tokenEnd + 1;
      stack.pop();
      cursor = tokenEnd + 1;
      continue;
    }

    const { tagName, attributes, selfClosing } = parseArchiveStartTag(token);
    const parent = stack.at(-1);
    const insertionNamespace = archiveInsertionNamespace(parent);
    const namespace = tagName === "svg" ? "svg" : insertionNamespace;
    const htmlVoidElement = namespace === "html" && ARCHIVE_VOID_ELEMENTS.has(tagName);
    if (selfClosing && insertionNamespace !== "svg" && !htmlVoidElement) {
      archiveStructureError(`self-closing non-void <${tagName}> element`);
    }
    const node = {
      type: "element",
      tagName,
      namespace,
      attributes,
      openingTag: token,
      start: cursor,
      contentStart: tokenEnd + 1,
      contentEnd: tokenEnd + 1,
      end: tokenEnd + 1,
      parent,
      children: [],
    };
    parent.children.push(node);
    cursor = tokenEnd + 1;
    if (selfClosing || htmlVoidElement) continue;
    if (namespace === "html" && ARCHIVE_TEXT_ONLY_ELEMENTS.has(tagName)) {
      const closingPattern = new RegExp(`<\\/${tagName}\\s*>`, "ig");
      closingPattern.lastIndex = cursor;
      const closing = closingPattern.exec(source);
      if (!closing) archiveStructureError(`unclosed text-only <${tagName}> element`);
      if (closing.index > cursor) {
        node.children.push({
          type: "text",
          value: source.slice(cursor, closing.index),
          start: cursor,
          end: closing.index,
          parent: node,
        });
      }
      node.contentEnd = closing.index;
      node.end = closing.index + closing[0].length;
      cursor = node.end;
      continue;
    }
    stack.push(node);
  }
  if (stack.length !== 1) archiveStructureError(`unclosed <${stack.at(-1).tagName}> element`);
  return root;
}

const parseArchiveHtmlTree = parseActiveHtml;

function archiveElements(scope, { activeOnly = true } = {}) {
  const elements = [];
  const visit = (node) => {
    for (const child of node.children) {
      if (child.type !== "element") continue;
      elements.push(child);
      if (activeOnly && child.tagName === "template") continue;
      visit(child);
    }
  };
  visit(scope);
  return elements;
}

function archiveElementsByTag(scope, tagName) {
  return archiveElements(scope).filter((node) => node.tagName === tagName);
}

function archiveDirectElements(node) {
  return node.children.filter((child) => child.type === "element");
}

function archiveAttribute(node, name) {
  const value = node.attributes.get(name.toLowerCase());
  return typeof value === "string" ? value : null;
}

function archiveHasAttribute(node, name) {
  return node.attributes.has(name.toLowerCase());
}

function archiveClassTokens(node) {
  return (archiveAttribute(node, "class") ?? "").split(/\s+/).filter(Boolean);
}

function archiveHasClass(node, className) {
  return archiveClassTokens(node).includes(className);
}

function archiveIsVisible(node) {
  return isActiveHtmlNode(node);
}

function archiveIsJourneyTargetExposed(node) {
  return isActiveHtmlNode(node);
}

function archiveIsDescendantOf(node, ancestor) {
  let current = node.parent;
  while (current !== null) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

function assertJourneyStageTarget({ documentHtml, stage, targetId }) {
  const fail = () => {
    throw new Error(`journeyEvidence[${stage}] requires exactly one active career stage target #${targetId}`);
  };
  let tree;
  try {
    tree = parseArchiveHtmlTree(documentHtml);
  } catch {
    fail();
  }
  if (archiveElementsByTag(tree, "plaintext").length !== 0) fail();

  const rootElements = archiveDirectElements(tree);
  const allHtmlElements = archiveElementsByTag(tree, "html");
  if (rootElements.length !== 1
    || rootElements[0].tagName !== "html"
    || allHtmlElements.length !== 1
    || rootElements[0] !== allHtmlElements[0]
    || !hasOnlyWhitespaceTextChildren(tree)) fail();
  const [html] = rootElements;
  const htmlChildren = archiveDirectElements(html);
  const allHeadElements = archiveElementsByTag(tree, "head");
  const allBodyElements = archiveElementsByTag(tree, "body");
  if (htmlChildren.length !== 2
    || htmlChildren[0].tagName !== "head"
    || htmlChildren[1].tagName !== "body"
    || allHeadElements.length !== 1
    || allBodyElements.length !== 1
    || htmlChildren[0] !== allHeadElements[0]
    || htmlChildren[1] !== allBodyElements[0]
    || !hasOnlyWhitespaceTextChildren(html)) fail();
  const body = htmlChildren[1];

  const exactIdElements = archiveElements(tree, { activeOnly: false })
    .filter((node) => archiveAttribute(node, "id") === targetId);
  const journeyIdElements = archiveElements(tree, { activeOnly: false })
    .filter((node) => archiveAttribute(node, "id") === "journey");
  const journeyScopes = archiveElements(body)
    .filter((node) => archiveAttribute(node, "id") === "journey"
      && node.tagName === "div"
      && archiveHasClass(node, "story-content")
      && archiveIsJourneyTargetExposed(node));
  if (journeyIdElements.length !== 1
    || journeyScopes.length !== 1
    || journeyIdElements[0] !== journeyScopes[0]) fail();
  const journeyScope = journeyScopes[0];
  const timelines = archiveElements(journeyScope)
    .filter((node) => node.tagName === "ol"
      && archiveHasClass(node, "timeline")
      && archiveHasAttribute(node, "data-timeline")
      && archiveIsJourneyTargetExposed(node));
  if (timelines.length !== 1) fail();
  const timeline = timelines[0];
  const matchingCareerStages = archiveElements(body)
    .filter((node) => archiveAttribute(node, "id") === targetId
      && node.tagName === "li"
      && archiveHasClass(node, "timeline-step")
      && archiveHasAttribute(node, "data-timeline-step")
      && archiveIsJourneyTargetExposed(node)
      && node.parent === timeline
      && archiveIsDescendantOf(node, journeyScope));
  if (exactIdElements.length !== 1
    || matchingCareerStages.length !== 1
    || exactIdElements[0] !== matchingCareerStages[0]) {
    fail();
  }
}

function archiveText(node) {
  if (node.type === "element" && !archiveIsVisible(node)) return "";
  if (node.type === "element"
    && (node.tagName === "template" || ARCHIVE_TEXT_ONLY_ELEMENTS.has(node.tagName))) {
    return "";
  }
  return node.children.map((child) => (
    child.type === "text" ? child.value : archiveText(child)
  )).join("");
}

function archiveDirectText(node) {
  return activeDirectText(node);
}

function archiveSemanticText(node) {
  return activeSemanticText(node);
}

function hasOnlyWhitespaceTextChildren(node) {
  return node.children.every((child) => child.type === "element" || child.value.trim() === "");
}

function sameArchiveNodes(left, right) {
  return left.length === right.length && left.every((node, index) => node === right[index]);
}

function assertArchiveSkeleton(condition, week, locale, message) {
  if (!condition) throw new Error(`Now archive ${week} ${locale} document skeleton ${message}.`);
}

function validateArchiveDocumentSkeleton({ tree, week, locale }) {
  assertArchiveSkeleton(
    archiveElementsByTag(tree, "plaintext").length === 0,
    week,
    locale,
    "must not contain an active plaintext element that makes following browser content inert",
  );
  assertArchiveSkeleton(
    archiveElementsByTag(tree, "base").length === 0,
    week,
    locale,
    "must not contain an active base element before relative navigation is trusted",
  );
  const rootElements = archiveDirectElements(tree);
  const allHtmlElements = archiveElementsByTag(tree, "html");
  assertArchiveSkeleton(
    rootElements.length === 1
      && rootElements[0].tagName === "html"
      && allHtmlElements.length === 1
      && rootElements[0] === allHtmlElements[0]
      && hasOnlyWhitespaceTextChildren(tree),
    week,
    locale,
    "must contain only one top-level html element outside whitespace and doctype",
  );
  const [htmlElement] = rootElements;
  const htmlChildren = archiveDirectElements(htmlElement);
  const allHeadElements = archiveElementsByTag(tree, "head");
  const allBodyElements = archiveElementsByTag(tree, "body");
  assertArchiveSkeleton(
    htmlChildren.length === 2
      && htmlChildren[0].tagName === "head"
      && htmlChildren[1].tagName === "body"
      && allHeadElements.length === 1
      && allBodyElements.length === 1
      && htmlChildren[0] === allHeadElements[0]
      && htmlChildren[1] === allBodyElements[0]
      && hasOnlyWhitespaceTextChildren(htmlElement),
    week,
    locale,
    "must contain exactly one direct ordered head and body",
  );
  const [head, body] = htmlChildren;
  const headers = archiveElementsByTag(tree, "header");
  const backdrops = archiveElementsByTag(tree, "div")
    .filter((node) => archiveHasAttribute(node, "data-nav-backdrop"));
  const mains = archiveElementsByTag(tree, "main");
  const footers = archiveElementsByTag(tree, "footer");
  assertArchiveSkeleton(
    headers.length === 1
      && backdrops.length === 1
      && mains.length === 1
      && footers.length === 1
      && headers[0].parent === body
      && backdrops[0].parent === body
      && mains[0].parent === body
      && footers[0].parent === body
      && headers[0].start < backdrops[0].start
      && backdrops[0].start < mains[0].start
      && mains[0].start < footers[0].start,
    week,
    locale,
    "must keep header, backdrop, main, and footer in the active body tree and canonical order",
  );
  return {
    html: htmlElement,
    head,
    body,
    header: headers[0],
    backdrop: backdrops[0],
    main: mains[0],
    footer: footers[0],
  };
}

function assertArchiveNavigation(condition, week, locale, message) {
  if (!condition) throw new Error(`Now archive ${week} ${locale} navigation ${message}.`);
}

function validateArchiveCards({ main, week, locale, expectedCardCount }) {
  const cards = archiveElementsByTag(main, "article")
    .filter((node) => archiveHasClass(node, "now-card") && archiveHasClass(node, "now-card-this"));
  const visibleCards = cards.filter(archiveIsVisible);
  if (visibleCards.length !== expectedCardCount) {
    throw new Error(`Now archive ${week} ${locale} card count differs from canonical Now data.`);
  }

  for (const [index, card] of visibleCards.entries()) {
    const directElements = archiveDirectElements(card);
    const labels = directElements.filter((node) => node.tagName === "p" && archiveHasClass(node, "now-card-label"));
    const headings = directElements.filter((node) => node.tagName === "h2");
    const summaries = directElements.filter((node) => node.tagName === "p" && !archiveHasClass(node, "now-card-label"));
    const tagLists = directElements.filter((node) => node.tagName === "ul" && archiveHasClass(node, "now-tags"));
    const fields = [
      ["visible label", labels],
      ["heading", headings],
      ["summary", summaries],
    ];
    for (const [field, nodes] of fields) {
      if (nodes.length !== 1 || archiveSemanticText(nodes[0]) === "") {
        throw new Error(`Now archive ${week} ${locale} card ${index + 1} must contain one non-empty ${field}.`);
      }
    }
    const tags = tagLists.length === 1
      ? archiveDirectElements(tagLists[0]).filter((node) => node.tagName === "li")
      : [];
    if (tagLists.length !== 1 || tags.length === 0 || tags.some((tag) => archiveSemanticText(tag) === "")) {
      throw new Error(`Now archive ${week} ${locale} card ${index + 1} must contain a non-empty semantic tag list.`);
    }
  }
}

function publicMemoryStructureError(relativePath, field) {
  throw new Error(`Public memory validation failed: file=${relativePath} forbidden=${field}.`);
}

export function validatePublicMemoryDocument({ html, locale, expectedCount, relativePath }) {
  const tree = parseArchiveHtmlTree(html);
  if (archiveElementsByTag(tree, "base").length > 0) publicMemoryStructureError(relativePath, "base");
  if (archiveElementsByTag(tree, "plaintext").length > 0) publicMemoryStructureError(relativePath, "plaintext");

  const indexes = archiveElementsByTag(tree, "section")
    .filter((node) => archiveHasClass(node, "memory-index"));
  if (indexes.length !== 1 || !archiveIsVisible(indexes[0])) {
    publicMemoryStructureError(relativePath, "memory-index-visible");
  }
  const [index] = indexes;
  const emptyStates = archiveElementsByTag(index, "p")
    .filter((node) => archiveHasClass(node, "memory-empty"));
  const cards = archiveElementsByTag(index, "article")
    .filter((node) => archiveHasClass(node, "memory-card"));

  if (expectedCount === 0) {
    const expectedText = label(
      locale,
      "No public memory snapshots have been approved yet.",
      "Henüz onaylanmış kamusal hafıza kaydı yok.",
    );
    if (emptyStates.length !== 1
      || !archiveIsVisible(emptyStates[0])
      || archiveSemanticText(emptyStates[0]) !== expectedText
      || cards.length !== 0) {
      publicMemoryStructureError(relativePath, "memory-empty-visible");
    }
    return;
  }

  if (emptyStates.length !== 0 || cards.length !== expectedCount || cards.some((card) => !archiveIsVisible(card))) {
    publicMemoryStructureError(relativePath, "memory-card-count-visible");
  }
  for (const card of cards) {
    const direct = archiveDirectElements(card);
    const requiredText = [
      direct.filter((node) => node.tagName === "p" && archiveHasClass(node, "memory-card__type")),
      direct.filter((node) => node.tagName === "h2"),
      direct.filter((node) => node.tagName === "p" && archiveHasClass(node, "memory-card__summary")),
    ];
    if (requiredText.some((nodes) => nodes.length !== 1 || archiveSemanticText(nodes[0]) === "")) {
      publicMemoryStructureError(relativePath, "memory-card-visible-content");
    }
    const dates = direct.filter((node) => node.tagName === "dl" && archiveHasClass(node, "memory-card__dates"));
    const times = dates.length === 1 ? archiveElementsByTag(dates[0], "time") : [];
    if (times.length !== 2 || times.some((time) => !archiveIsVisible(time) || archiveSemanticText(time) === "")) {
      publicMemoryStructureError(relativePath, "memory-card-visible-dates");
    }
    const sources = direct.filter((node) => node.tagName === "a" && archiveHasClass(node, "memory-card__source"));
    if (sources.length !== 1 || !archiveIsVisible(sources[0]) || archiveSemanticText(sources[0]) === "") {
      publicMemoryStructureError(relativePath, "memory-card-visible-source");
    }

    const tagLists = direct.filter((node) => node.tagName === "ul" && archiveHasClass(node, "memory-card__tags"));
    for (const tagList of tagLists) {
      const tags = archiveDirectElements(tagList).filter((node) => node.tagName === "li");
      if (!archiveIsVisible(tagList) || tags.length === 0 || tags.some((tag) => archiveSemanticText(tag) === "")) {
        publicMemoryStructureError(relativePath, "memory-card-visible-tags");
      }
    }
    for (const groupClass of ["memory-card__related", "memory-card__evidence"]) {
      const groups = direct.filter((node) => node.tagName === "section" && archiveHasClass(node, groupClass));
      for (const group of groups) {
        const headings = archiveElementsByTag(group, "h3");
        const links = archiveElementsByTag(group, "a");
        if (!archiveIsVisible(group)
          || headings.length !== 1
          || archiveSemanticText(headings[0]) === ""
          || links.length === 0
          || links.some((link) => archiveSemanticText(link) === "")) {
          publicMemoryStructureError(relativePath, `${groupClass}-visible`);
        }
      }
    }
  }
}

function validateArchiveNavigation({ html, tree, skeleton, locale, week }) {
  const documentTree = tree ?? parseArchiveHtmlTree(html);
  const documentSkeleton = skeleton ?? validateArchiveDocumentSkeleton({ tree: documentTree, week, locale });
  const root = locale === "tr" ? "/tr/" : "/";
  const currentPath = `${root}now/`;
  const { header, backdrop } = documentSkeleton;
  const headerClasses = archiveClassTokens(header);
  assertArchiveNavigation(
    headerClasses.includes("site-header") && headerClasses.includes("site-header-page"),
    week,
    locale,
    "shared header classes differ",
  );

  const allToggles = archiveElementsByTag(documentTree, "button")
    .filter((node) => archiveHasAttribute(node, "data-nav-toggle"));
  const allDivs = archiveElementsByTag(documentTree, "div");
  const allPanels = allDivs.filter((node) => archiveHasAttribute(node, "data-nav-panel"));
  assertArchiveNavigation(
    allToggles.length === 1
      && allPanels.length === 1
      && allToggles[0].parent === header
      && allPanels[0].parent === header
      && backdrop.parent === header.parent,
    week,
    locale,
    "must contain exactly one header-scoped toggle and panel plus one backdrop",
  );
  const [toggle] = allToggles;
  const [panel] = allPanels;
  const expectedPanelId = `site-navigation-archive-${week}-${locale}`;
  const openLabel = label(locale, "Open menu", "Menüyü aç");
  const closeLabel = label(locale, "Close menu", "Menüyü kapat");
  assertArchiveNavigation(
    archiveHasClass(toggle, "nav-toggle")
      && archiveAttribute(toggle, "type") === "button"
      && archiveAttribute(toggle, "aria-expanded") === "false"
      && archiveAttribute(toggle, "aria-controls") === expectedPanelId
      && archiveAttribute(toggle, "aria-label") === openLabel
      && archiveAttribute(toggle, "data-open-label") === openLabel
      && archiveAttribute(toggle, "data-close-label") === closeLabel
      && archiveHasClass(panel, "nav-panel")
      && archiveAttribute(panel, "id") === expectedPanelId
      && archiveHasClass(backdrop, "nav-backdrop")
      && archiveAttribute(backdrop, "aria-hidden") === "true"
      && backdrop.children.length === 0
      && backdrop.start > header.end
      && html.slice(header.end, backdrop.start).trim() === "",
    week,
    locale,
    "toggle, panel, or backdrop linkage differs",
  );

  const allNavElements = archiveElementsByTag(documentTree, "nav");
  const navElements = archiveElementsByTag(panel, "nav");
  const primaryNavigation = navElements.filter((node) => archiveHasClass(node, "nav-links"));
  const languageNavigation = navElements.filter((node) => archiveHasClass(node, "language-switch"));
  const primaryLabel = label(locale, "Primary navigation", "Ana navigasyon");
  const languageLabel = label(locale, "Language selection", "Dil seçimi");
  assertArchiveNavigation(
    allNavElements.length === 2
      && navElements.length === 2
      && primaryNavigation.length === 1
      && languageNavigation.length === 1
      && primaryNavigation[0].parent === panel
      && archiveAttribute(primaryNavigation[0], "aria-label") === primaryLabel
      && archiveAttribute(languageNavigation[0], "aria-label") === languageLabel,
    week,
    locale,
    "accessible names or nav count differ",
  );

  const primaryLinks = archiveElementsByTag(primaryNavigation[0], "a")
    .filter((node) => archiveHasClass(node, "nav-links__primary-link"))
    .map((node) => ({
      href: archiveAttribute(node, "href"),
      text: archiveDirectText(node),
      current: archiveAttribute(node, "aria-current"),
    }));
  const expectedPrimaryLinks = [
    { href: `${root}#journey`, text: label(locale, "Journey", "Yolculuk"), current: null },
    { href: currentPath, text: label(locale, "Now", "Şimdi"), current: "page" },
    { href: `${root}#horizon`, text: label(locale, "Horizon", "Ufuk"), current: null },
    { href: `${root}#apps`, text: label(locale, "Applications", "Uygulamalar"), current: null },
    { href: `${root}memory/`, text: label(locale, "Knowledge", "Bilgi"), current: null },
    { href: `${root}#about`, text: label(locale, "About", "Hakkımda"), current: null },
  ];
  assertArchiveNavigation(
    JSON.stringify(primaryLinks) === JSON.stringify(expectedPrimaryLinks),
    week,
    locale,
    "primary link set, order, or current Now state differs",
  );

  const secondaryLinks = archiveElementsByTag(primaryNavigation[0], "a")
    .filter((node) => archiveHasClass(node, "nav-links__secondary-link"));
  assertArchiveNavigation(
    secondaryLinks.length === 1
      && archiveAttribute(secondaryLinks[0], "href") === `${root}#learning`
      && archiveDirectText(secondaryLinks[0]) === label(locale, "Learning", "Öğrenme"),
    week,
    locale,
    "secondary Learning link differs",
  );

  const groupElements = primaryNavigation[0].children
    .filter((node) => node.type === "element" && archiveHasAttribute(node, "data-nav-group"));
  const expectedGroups = [
    { key: "horizon", text: label(locale, "The horizon", "Ufuk"), codes: ["wfm", "itl", "eng"] },
    { key: "private", text: label(locale, "Private systems", "Özel sistemler"), codes: ["stk", "inf", "nxt"] },
  ];
  const scopedGroupAnchors = [];
  assertArchiveNavigation(groupElements.length === expectedGroups.length, week, locale, "group count differs");
  for (const [index, expectedGroup] of expectedGroups.entries()) {
    const group = groupElements[index];
    const expectedLabelId = `nav-${expectedGroup.key}-label-${locale}`;
    const sectionSpans = archiveElementsByTag(group, "span")
      .filter((node) => archiveHasClass(node, "nav-links__section"));
    const matchingLabels = sectionSpans.filter((node) => archiveAttribute(node, "id") === expectedLabelId);
    const groupLinks = archiveElementsByTag(group, "a")
      .filter((node) => archiveHasClass(node, "nav-links__external"));
    const expectedGroupHrefs = expectedGroup.codes.map((code) => `https://${code}.aserdargun.com/`);
    assertArchiveNavigation(
      archiveHasClass(group, "nav-links__group")
        && archiveAttribute(group, "data-nav-group") === expectedGroup.key
        && archiveAttribute(group, "role") === "group"
        && archiveAttribute(group, "aria-labelledby") === expectedLabelId
        && matchingLabels.length === 1
        && matchingLabels[0].parent === group
        && archiveDirectText(matchingLabels[0]) === expectedGroup.text
        && !archiveHasAttribute(matchingLabels[0], "aria-hidden")
        && groupLinks.every((anchor) => anchor.parent === group)
        && JSON.stringify(groupLinks.map((anchor) => archiveAttribute(anchor, "href"))) === JSON.stringify(expectedGroupHrefs),
      week,
      locale,
      `group ${expectedGroup.key} ARIA relationship or scoped link membership differs`,
    );
    scopedGroupAnchors.push(...groupLinks);
  }

  const languageLinks = archiveElementsByTag(languageNavigation[0], "a")
    .filter((node) => archiveHasAttribute(node, "data-language-link"))
    .map((node) => ({
      href: archiveAttribute(node, "href"),
      lang: archiveAttribute(node, "lang"),
      language: archiveAttribute(node, "data-language-link"),
      accessibleName: archiveAttribute(node, "aria-label"),
      current: archiveAttribute(node, "aria-current"),
      text: archiveDirectText(node),
    }));
  const expectedLanguageLinks = [
    {
      href: `/tr/now/archive/${week}/`,
      lang: "tr",
      language: "tr",
      accessibleName: locale === "tr" ? "TR — Geçerli dil" : "TR — Türkçe sürüme geç",
      current: locale === "tr" ? "page" : null,
      text: "TR",
    },
    {
      href: `/now/archive/${week}/`,
      lang: "en",
      language: "en",
      accessibleName: locale === "en" ? "EN — Current language" : "EN — İngilizce sürüme geç",
      current: locale === "en" ? "page" : null,
      text: "EN",
    },
  ];
  assertArchiveNavigation(
    JSON.stringify(languageLinks) === JSON.stringify(expectedLanguageLinks),
    week,
    locale,
    "language link set, order, accessible name, or current state differs",
  );

  const headerExternalAnchors = archiveElementsByTag(header, "a")
    .filter((node) => archiveHasClass(node, "nav-links__external"));
  const panelExternalAnchors = archiveElementsByTag(panel, "a")
    .filter((node) => archiveHasClass(node, "nav-links__external"));
  const primaryExternalAnchors = archiveElementsByTag(primaryNavigation[0], "a")
    .filter((node) => archiveHasClass(node, "nav-links__external"));
  const expectedNewTabHrefs = ["wfm", "itl", "eng", "stk", "inf", "nxt"]
    .map((code) => `https://${code}.aserdargun.com/`);
  const allActiveAnchors = archiveElementsByTag(documentTree, "a");
  const destinationMatches = expectedNewTabHrefs.map((href) => (
    allActiveAnchors.filter((anchor) => archiveAttribute(anchor, "href") === href)
  ));
  assertArchiveNavigation(
    destinationMatches.every((matches) => matches.length === 1),
    week,
    locale,
    "external destinations must each resolve to exactly one active document anchor",
  );
  const destinationAnchors = destinationMatches.map(([anchor]) => anchor);
  assertArchiveNavigation(
    sameArchiveNodes(destinationAnchors, headerExternalAnchors)
      && sameArchiveNodes(destinationAnchors, panelExternalAnchors)
      && sameArchiveNodes(destinationAnchors, primaryExternalAnchors)
      && sameArchiveNodes(destinationAnchors, scopedGroupAnchors),
    week,
    locale,
    "external destination set, order, or node scope differs",
  );
  const expectedNewTabText = label(locale, "opens in a new tab", "yeni sekmede açılır");
  for (const anchor of headerExternalAnchors) {
    const relTokens = (archiveAttribute(anchor, "rel") ?? "").toLowerCase().split(/\s+/);
    const assistiveText = archiveElementsByTag(anchor, "span")
      .filter((node) => archiveHasClass(node, "sr-only"));
    assertArchiveNavigation(
      archiveAttribute(anchor, "target") === "_blank"
        && relTokens.includes("noreferrer")
        && assistiveText.length === 1
        && archiveDirectText(assistiveText[0]) === expectedNewTabText,
      week,
      locale,
      "new-tab link lacks noreferrer or localized assistive text",
    );
  }

  const ids = archiveElements(documentTree, { activeOnly: false })
    .filter((node) => archiveHasAttribute(node, "id"))
    .map((node) => archiveAttribute(node, "id"));
  assertArchiveNavigation(new Set(ids).size === ids.length, week, locale, "document IDs are not unique");
}

export function validateNowArchivePair({
  week,
  expectedUpdatedAt,
  expectedCardCount,
  englishHtml,
  turkishHtml,
}) {
  if (!/^\d{4}-W\d{2}$/.test(week ?? "")) throw new Error("Now archive pair requires a canonical week.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedUpdatedAt ?? "")) {
    throw new Error(`Now archive ${week} requires an expected update date.`);
  }
  if (!Number.isInteger(expectedCardCount) || expectedCardCount < 1) {
    throw new Error(`Now archive ${week} requires a positive canonical card count.`);
  }
  const urls = archiveUrlSet(week);
  const pages = [
    { locale: "en", html: englishHtml, currentPath: "/now/", backText: "Back to current Now" },
    { locale: "tr", html: turkishHtml, currentPath: "/tr/now/", backText: "Güncel Şimdi sayfasına dön" },
  ];

  for (const { locale, html, currentPath, backText } of pages) {
    if (typeof html !== "string" || html.trim() === "") throw new Error(`Now archive ${week} ${locale} index is missing.`);
    const tree = parseArchiveHtmlTree(html);
    const skeleton = validateArchiveDocumentSkeleton({ tree, week, locale });
    if (archiveAttribute(skeleton.html, "lang") !== locale
      || archiveAttribute(skeleton.html, "data-locale") !== locale) {
      throw new Error(`Now archive ${week} ${locale} locale marker differs.`);
    }
    if (!archiveHasAttribute(skeleton.main, "data-updated-at")
      || archiveAttribute(skeleton.main, "data-archive-week") !== week) {
      throw new Error(`Now archive ${week} ${locale} document week differs from its directory.`);
    }
    if (archiveAttribute(skeleton.main, "data-updated-at") !== expectedUpdatedAt) {
      throw new Error(`Now archive ${week} ${locale} update date differs from the expected lastmod.`);
    }
    const linkElements = archiveElementsByTag(tree, "link");
    const canonicalLinks = linkElements
      .filter((node) => (archiveAttribute(node, "rel") ?? "").toLowerCase().split(/\s+/).includes("canonical"));
    if (canonicalLinks.length !== 1
      || archiveAttribute(canonicalLinks[0], "rel") !== "canonical"
      || archiveAttribute(canonicalLinks[0], "href") !== urls[locale]
      || canonicalLinks[0].parent !== skeleton.head) {
      throw new Error(`Now archive ${week} ${locale} must contain exactly one expected canonical link.`);
    }
    const timeElements = archiveElementsByTag(tree, "time");
    const mainTimeElements = archiveElementsByTag(skeleton.main, "time");
    if (timeElements.length !== 1
      || !sameArchiveNodes(timeElements, mainTimeElements)
      || archiveAttribute(timeElements[0], "datetime") !== expectedUpdatedAt
      || archiveDirectText(timeElements[0]) !== expectedUpdatedAt) {
      throw new Error(`Now archive ${week} ${locale} must contain exactly one visible time matching the expected update date.`);
    }
    const alternateLinks = linkElements
      .filter((node) => (archiveAttribute(node, "rel") ?? "").toLowerCase().split(/\s+/).includes("alternate"))
      .map((node) => ({
        inHead: node.parent === skeleton.head,
        rel: archiveAttribute(node, "rel"),
        hreflang: archiveAttribute(node, "hreflang"),
        href: archiveAttribute(node, "href"),
      }));
    const expectedAlternateLinks = [
      { inHead: true, rel: "alternate", hreflang: "en", href: urls.en },
      { inHead: true, rel: "alternate", hreflang: "tr", href: urls.tr },
      { inHead: true, rel: "alternate", hreflang: "x-default", href: urls.en },
    ];
    if (JSON.stringify(alternateLinks) !== JSON.stringify(expectedAlternateLinks)) {
      throw new Error(`Now archive ${week} ${locale} hreflang set must be exact.`);
    }
    const backLinks = archiveElementsByTag(tree, "a")
      .filter((node) => archiveHasClass(node, "now-archive-back"));
    const mainBackLinks = archiveElementsByTag(skeleton.main, "a")
      .filter((node) => archiveHasClass(node, "now-archive-back"));
    if (backLinks.length !== 1
      || !sameArchiveNodes(backLinks, mainBackLinks)
      || archiveAttribute(backLinks[0], "href") !== currentPath
      || archiveDirectText(backLinks[0]) !== backText) {
      throw new Error(`Now archive ${week} ${locale} current-Now back link differs.`);
    }
    validateArchiveNavigation({ html, tree, skeleton, locale, week });
    validateArchiveCards({ main: skeleton.main, week, locale, expectedCardCount });
  }
  return { week, updatedAt: expectedUpdatedAt };
}

function regexEscape(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function readExpectedArchiveDates(rootDir, weeks) {
  if (weeks.length === 0) return new Map();
  const sitemap = await readFile(path.join(rootDir, "sitemap.xml"), "utf8");
  const dates = new Map();
  for (const week of weeks) {
    const urls = archiveUrlSet(week);
    const localeDates = Object.values(urls).map((url) => {
      const entry = sitemap.match(new RegExp(`<url>\\s*<loc>${regexEscape(url)}<\\/loc>[\\s\\S]*?<\\/url>`))?.[0] ?? "";
      const lastmods = Array.from(entry.matchAll(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g), (match) => match[1]);
      if (lastmods.length !== 1) throw new Error(`Now archive ${week} sitemap lastmod is missing or duplicated: ${url}`);
      return lastmods[0];
    });
    if (localeDates[0] !== localeDates[1]) throw new Error(`Now archive ${week} sitemap lastmod pair differs.`);
    dates.set(week, localeDates[0]);
  }
  return dates;
}

export async function readArchiveLinks(rootDir, { expectedCardCount } = {}) {
  if (!Number.isInteger(expectedCardCount) || expectedCardCount < 1) {
    throw new Error("Archive discovery requires a positive canonical Now card count.");
  }
  const archiveRoots = {
    en: path.join(rootDir, "now", "archive"),
    tr: path.join(rootDir, "tr", "now", "archive"),
  };
  const listWeeks = async (archiveRoot) => {
    try {
      const entries = await readdir(archiveRoot, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory() && /^\d{4}-W\d{2}$/.test(entry.name))
        .map((entry) => entry.name)
        .sort();
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  };
  const [englishWeeks, turkishWeeks] = await Promise.all([
    listWeeks(archiveRoots.en),
    listWeeks(archiveRoots.tr),
  ]);
  if (JSON.stringify(englishWeeks) !== JSON.stringify(turkishWeeks)) {
    throw new Error("Now archives must exist as complete English/Turkish pairs.");
  }
  const expectedDates = await readExpectedArchiveDates(rootDir, englishWeeks);
  return Promise.all(englishWeeks.map(async (week) => {
    let english;
    let turkish;
    try {
      [english, turkish] = await Promise.all([
        readFile(path.join(archiveRoots.en, week, "index.html"), "utf8"),
        readFile(path.join(archiveRoots.tr, week, "index.html"), "utf8"),
      ]);
    } catch (error) {
      throw new Error(`Now archive ${week} localized index is missing: ${error.message}`);
    }
    return validateNowArchivePair({
      week,
      expectedUpdatedAt: expectedDates.get(week),
      expectedCardCount,
      englishHtml: english,
      turkishHtml: turkish,
    });
  }));
}

export async function renderSite({ rootDir, data, today }) {
  assertValidLivingSystemData(data, {
    today,
    sourcePath: path.join(rootDir, "data", "living-system.json"),
  });
  const [sourceDocuments, archiveLinks] = await Promise.all([
    Promise.all(SITE_DOCUMENTS.map(async (document) => ({
      ...document,
      html: await readFile(path.join(rootDir, document.relativePath), "utf8"),
    }))),
    readArchiveLinks(rootDir, { expectedCardCount: data.now.items.length }),
  ]);
  const renderedDocuments = sourceDocuments.map((document) => ({
    ...document,
    output: renderDocument({ ...document, data, today, archiveLinks }),
  }));
  for (const document of renderedDocuments.filter(({ page }) => page === "memory")) {
    validatePublicMemoryDocument({
      html: document.output,
      locale: document.locale,
      expectedCount: data.publicMemory.length,
      relativePath: document.relativePath,
    });
  }
  const privacyDiagnostics = renderedDocuments.flatMap(({ relativePath, output }) => (
    scanPublicHtmlPrivacy({ relativePath, html: output })
  ));
  if (privacyDiagnostics.length > 0) {
    throw new Error(`Public HTML privacy validation failed:\n${privacyDiagnostics.join("\n")}`);
  }
  return renderedDocuments;
}

function parseTestToday(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("LIVING_SYSTEM_TODAY must be a real YYYY-MM-DD calendar date.");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("LIVING_SYSTEM_TODAY must be a real YYYY-MM-DD calendar date.");
  }
  return date;
}

async function runCli() {
  const args = process.argv.slice(2);
  if (args.some((argument) => argument !== "--check")) {
    throw new Error("Usage: node tools/render-living-system.mjs [--check]");
  }
  const check = args.includes("--check");
  const requestedToday = process.env.LIVING_SYSTEM_TODAY;
  if (requestedToday && process.env.NODE_ENV !== "test") {
    throw new Error("LIVING_SYSTEM_TODAY is available only in tests.");
  }
  const today = requestedToday ? parseTestToday(requestedToday) : new Date();
  const rootDir = process.cwd();
  const data = await loadLivingSystemData(path.join(rootDir, "data", "living-system.json"));
  const documents = await renderSite({ rootDir, data, today });
  const stale = documents.filter((document) => document.html !== document.output);

  if (check) {
    for (const document of stale) console.log(document.relativePath);
    if (stale.length > 0) process.exitCode = 1;
    return;
  }
  await Promise.all(stale.map((document) => writeFile(path.join(rootDir, document.relativePath), document.output)));
}

const invokedAsCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsCli) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
