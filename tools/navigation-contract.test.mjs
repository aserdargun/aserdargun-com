import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { readArchiveLinks } from "./render-living-system.mjs";
import * as publicHtmlContract from "./public-html-contract.mjs";
import { decodeHtmlReferences } from "./active-html-model.mjs";

const { discoverPublicIndexDocuments } = publicHtmlContract;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const navigationData = JSON.parse(await readFile(path.join(rootDir, "data", "living-system.json"), "utf8"));
const archiveRoutes = (await readArchiveLinks(rootDir, {
  expectedCardCount: navigationData.now.items.length,
})).flatMap(({ week }) => [
  { route: `/now/archive/${week}/`, file: `now/archive/${week}/index.html`, locale: "en" },
  { route: `/tr/now/archive/${week}/`, file: `tr/now/archive/${week}/index.html`, locale: "tr" },
]);
const routes = [
  { route: "/", file: "index.html", locale: "en" },
  { route: "/tr/", file: "tr/index.html", locale: "tr" },
  { route: "/now/", file: "now/index.html", locale: "en" },
  { route: "/tr/now/", file: "tr/now/index.html", locale: "tr" },
  { route: "/memory/", file: "memory/index.html", locale: "en" },
  { route: "/tr/memory/", file: "tr/memory/index.html", locale: "tr" },
  ...archiveRoutes,
];

test("the accessibility route set includes every deployable public index document", async () => {
  const discoveredPaths = (await discoverPublicIndexDocuments(rootDir)).map(({ relativePath }) => relativePath);
  assert.equal(discoveredPaths.length, 13, "fixture must contain all eight living-system and five project pages");
  assert.deepEqual(
    discoveredPaths,
    [
      "index.html",
      "memory/index.html",
      "now/archive/2026-W34/index.html",
      "now/index.html",
      "projects/stage-1-frontend-foundations/1-plant-assets-glossary/index.html",
      "projects/stage-1-frontend-foundations/2-kpi-tiles/index.html",
      "projects/stage-1-frontend-foundations/3-weekly-meeting/index.html",
      "projects/stage-1-frontend-foundations/4-troubleshooting-wizard/index.html",
      "projects/stage-1-frontend-foundations/5-pid-svg-viewer/index.html",
      "tr/index.html",
      "tr/memory/index.html",
      "tr/now/archive/2026-W34/index.html",
      "tr/now/index.html",
    ],
    "recursive discovery must include every current public index document",
  );
});

test("public index discovery skips local tooling directories", async (t) => {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "public-index-discovery-"));
  t.after(() => rm(fixtureDir, { recursive: true, force: true }));
  await mkdir(path.join(fixtureDir, ".superpowers", "generated"), { recursive: true });
  await writeFile(path.join(fixtureDir, "index.html"), "<main>public</main>");
  await writeFile(
    path.join(fixtureDir, ".superpowers", "generated", "index.html"),
    "<main>local tooling only</main>",
  );

  assert.deepEqual(
    (await discoverPublicIndexDocuments(fixtureDir)).map(({ relativePath }) => relativePath),
    ["index.html"],
  );
});

test("the shared public HTML contract exposes document and coverage validation", () => {
  assert.equal(typeof publicHtmlContract.validatePublicAccessibilityDocument, "function");
  assert.equal(typeof publicHtmlContract.validatePublicIndexCoverage, "function");
});

test("the shared coverage gate fails when a discovered project page is omitted", async () => {
  const documents = await discoverPublicIndexDocuments(rootDir);
  const omittedPath = "projects/stage-1-frontend-foundations/5-pid-svg-viewer/index.html";
  const coveredPaths = documents
    .map(({ relativePath }) => relativePath)
    .filter((relativePath) => relativePath !== omittedPath);
  const diagnostics = publicHtmlContract.validatePublicIndexCoverage(documents, coveredPaths);

  assert.deepEqual(
    diagnostics.map(({ code, relativePath }) => [code, relativePath]),
    [["coverage-missing", omittedPath]],
  );
});

test("every discovered public index document satisfies the common static accessibility contract", async () => {
  const documents = await discoverPublicIndexDocuments(rootDir);
  const violations = [];
  for (const document of documents) {
    const html = await readFile(document.absolutePath, "utf8");
    violations.push(...publicHtmlContract.validatePublicAccessibilityDocument({
      html,
      relativePath: document.relativePath,
    }));
  }

  assert.deepEqual(violations, []);
});

test("project-page accessibility mutations fail closed", async () => {
  const relativePath = "projects/stage-1-frontend-foundations/1-plant-assets-glossary/index.html";
  const validHtml = await readFile(path.join(rootDir, relativePath), "utf8");
  const mutations = [
    {
      code: "skip-link-count",
      html: validHtml.replace(/\s*<a class="skip-link"[\s\S]*?<\/a>/, ""),
      name: "missing skip link",
    },
    {
      code: "main-count",
      html: validHtml
        .replace("<main id=\"glossary\"", "<div id=\"glossary\"")
        .replace("</main>", "</div>"),
      name: "missing main landmark",
    },
    {
      code: "main-id",
      html: validHtml.replace("<main id=\"glossary\"", "<main"),
      name: "missing main ID",
    },
    {
      code: "h1-count",
      html: validHtml.replace("<h1>Power Plants Asset Glossary</h1>", "<h2>Power Plants Asset Glossary</h2>"),
      name: "missing H1",
    },
    {
      code: "id-duplicate",
      html: validHtml.replace('<header class="page-header">', '<header class="page-header" id="top">'),
      name: "duplicate active ID",
    },
    {
      code: "aria-reference",
      html: validHtml.replace('aria-describedby="search-hint search-status"', 'aria-describedby="search-hint missing-description"'),
      name: "broken ARIA reference",
    },
  ];

  for (const mutation of mutations) {
    const diagnostics = publicHtmlContract.validatePublicAccessibilityDocument({
      html: mutation.html,
      relativePath,
    });
    assert.ok(
      diagnostics.some(({ code }) => code === mutation.code),
      `${mutation.name} must produce ${mutation.code}`,
    );
  }
});

test("the shared active-tree contract rejects browser-inert landmark laundering and decoded aria-hidden", () => {
  const active = `<!doctype html><html lang="en"><head><title>Fixture</title></head><body>
    <a class="skip-link" href="#main">Skip</a><main id="main"><h1>Heading</h1></main>
  </body></html>`;
  assert.deepEqual(publicHtmlContract.validatePublicAccessibilityDocument({
    html: active,
    relativePath: "fixture.html",
  }), []);

  const mutations = [
    ["nested template", `<!doctype html><html lang="en"><head><title>Fixture</title></head><body><template><template></template>
      <a class="skip-link" href="#main">Skip</a><main id="main"><h1>Heading</h1></main></template></body></html>`],
    ["literal hidden main", active.replace('<main id="main">', '<main id="main" aria-hidden="true">')],
    ["entity hidden main", active.replace('<main id="main">', '<main id="main" aria-hidden="tr&#x75;e">')],
    ["semicolonless decimal hidden main", active.replace('<main id="main">', '<main id="main" aria-hidden="tr&#117e">')],
    ["literal hidden h1", active.replace("<h1>", '<h1 aria-hidden="true">')],
    ["entity hidden h1", active.replace("<h1>", '<h1 aria-hidden="tr&#117;e">')],
    ["literal hidden skip", active.replace('class="skip-link"', 'class="skip-link" aria-hidden="true"')],
    ["entity hidden ancestor", active.replace("<body>", '<body><div aria-hidden="tr&#x75;e">').replace("</body>", "</div></body>")],
    ["semicolonless decimal hidden ancestor", active.replace("<body>", '<body><div aria-hidden="tr&#117e">').replace("</body>", "</div></body>")],
  ];

  for (const [name, html] of mutations) {
    const diagnostics = publicHtmlContract.validatePublicAccessibilityDocument({
      html,
      relativePath: "fixture.html",
    });
    assert.ok(
      diagnostics.some(({ code }) => ["skip-link-count", "main-count", "h1-count"].includes(code)),
      `${name} must not satisfy the active landmark contract`,
    );
  }
});

test("the shared decoder consumes numeric references like a browser without loosening named entities", () => {
  const cases = [
    ["&#116;&#114;&#117;&#101;", "true"],
    ["&#x74;&#x72;&#x75;&#x65;", "true"],
    ["tr&#117e", "true"],
    ["&#0;", "\uFFFD"],
    ["&#1;", "\uFFFD"],
    ["&#xD800;", "\uFFFD"],
    ["&#x110000;", "\uFFFD"],
    ["&not-approved;", "&not-approved;"],
  ];
  for (const [source, expected] of cases) assert.equal(decodeHtmlReferences(source), expected, source);
});

test("project skip links expose an explicit two-pixel visible focus indicator", async () => {
  const projectDirectories = [
    "2-kpi-tiles",
    "3-weekly-meeting",
    "4-troubleshooting-wizard",
    "5-pid-svg-viewer",
  ];
  for (const projectDirectory of projectDirectories) {
    const css = await readFile(path.join(
      rootDir,
      "projects/stage-1-frontend-foundations",
      projectDirectory,
      "styles.css",
    ), "utf8");
    const focusRule = css.match(/\.skip-link:focus-visible\s*\{([^}]*)\}/)?.[1] ?? "";
    assert.match(focusRule, /transform:\s*translate\(-50%,\s*0\);/);
    assert.match(focusRule, /outline:\s*2px\s+solid\s+[^;]+;/, `${projectDirectory} skip link needs a two-pixel focus ring`);
    assert.match(focusRule, /outline-offset:\s*[1-9][0-9]*px;/, `${projectDirectory} skip link needs a non-zero outline offset`);
  }
});

function openingTags(html, selectorAttribute) {
  return Array.from(html.matchAll(new RegExp(`<[^/!][^>]*\\s${selectorAttribute}(?:=(?:"[^"]*"|'[^']*'|[^\\s>]+))?[^>]*>`, "gi")), (match) => match[0]);
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`, "i"))?.slice(1).find((value) => value !== undefined) ?? null;
}

function anchors(html) {
  return Array.from(html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi), (match) => ({
    openingTag: `<a${match[1]}>`,
    content: match[2],
  }));
}

function scopedElements(source, tagName) {
  const elements = [];
  const tokens = Array.from(source.matchAll(new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi")));
  let depth = 0;
  let start = -1;
  for (const token of tokens) {
    const closing = token[0].startsWith("</");
    if (!closing) {
      if (depth === 0) start = token.index;
      depth += 1;
    } else {
      depth -= 1;
      assert.ok(depth >= 0, `unexpected closing ${tagName} tag`);
      if (depth === 0) elements.push(source.slice(start, token.index + token[0].length));
    }
  }
  assert.equal(depth, 0, `unclosed ${tagName} scope`);
  return elements;
}

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr",
]);

function classTokens(element) {
  return (element.attributes.get("class") ?? "").split(/\s+/).filter(Boolean);
}

function activeDocumentModel(html) {
  const source = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  const elements = [];
  const stack = [];
  const tokens = source.matchAll(/<\/?([a-z][\w:-]*)\b([^>]*)>|([^<]+)/gi);

  for (const token of tokens) {
    if (token[3] !== undefined) {
      if (stack.at(-1)?.active) {
        for (const ancestor of stack) {
          if (ancestor.active) ancestor.text += token[3];
        }
      }
      continue;
    }

    const tagName = token[1].toLowerCase();
    const closing = token[0].startsWith("</");
    if (closing) {
      const matchingIndex = stack.findLastIndex((element) => element.tagName === tagName);
      if (matchingIndex >= 0) stack.splice(matchingIndex);
      continue;
    }

    const attributes = new Map();
    for (const match of token[2].matchAll(/([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
      attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
    }
    const parentActive = stack.at(-1)?.active ?? true;
    const active = parentActive
      && !attributes.has("hidden")
      && !attributes.has("inert")
      && attributes.get("aria-hidden") !== "true";
    const element = { tagName, attributes, active, text: "", sourceIndex: token.index };
    elements.push(element);
    if (!VOID_ELEMENTS.has(tagName) && !token[0].endsWith("/>")) stack.push(element);
  }

  return elements.filter((element) => element.active);
}

function textContent(element) {
  return element.text.replace(/\s+/g, " ").trim();
}

function accessibleName(element, ids) {
  const label = element.attributes.get("aria-label")?.trim();
  if (label) return label;
  const references = element.attributes.get("aria-labelledby")?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (references.length > 0) return references.map((id) => textContent(ids.get(id))).join(" ").trim();
  return textContent(element);
}

for (const document of routes) {
  test(`${document.route} exposes a single logical landmark and heading sequence`, async () => {
    const html = await readFile(path.join(rootDir, document.file), "utf8");
    const elements = activeDocumentModel(html);
    const skipLinks = elements.filter((element) => element.tagName === "a" && classTokens(element).includes("skip-link"));
    const headers = elements.filter((element) => element.tagName === "header");
    const mains = elements.filter((element) => element.tagName === "main");
    const headings = elements.filter((element) => element.tagName === "h1");
    const footers = elements.filter((element) => element.tagName === "footer");

    assert.equal(skipLinks.length, 1, "expected exactly one active skip link");
    assert.equal(mains.length, 1, "expected exactly one active main landmark");
    assert.equal(headings.length, 1, "expected exactly one active h1");
    assert.ok(textContent(headings[0]), "the h1 must expose visible text");
    const mainId = mains[0].attributes.get("id");
    assert.ok(mainId, "main landmark needs an ID");
    assert.equal(skipLinks[0].attributes.get("href"), `#${mainId}`, "skip link must target the active main landmark");
    assert.equal(headers.length, 1, "expected exactly one active header");
    assert.equal(footers.length, 1, "expected exactly one active footer");
    assert.ok(skipLinks[0].sourceIndex < headers[0].sourceIndex, "skip link must precede the header");
    assert.ok(headers[0].sourceIndex < mains[0].sourceIndex, "header must precede main in source order");
    assert.ok(mains[0].sourceIndex < footers[0].sourceIndex, "main must precede footer in source order");
  });

  test(`${document.route} resolves active ARIA relationships and names navigation controls`, async () => {
    const html = await readFile(path.join(rootDir, document.file), "utf8");
    const elements = activeDocumentModel(html);
    const identified = elements.filter((element) => element.attributes.has("id"));
    const ids = new Map();
    for (const element of identified) {
      const id = element.attributes.get("id");
      assert.ok(id, "active IDs must not be empty");
      assert.equal(ids.has(id), false, `duplicate active ID: ${id}`);
      ids.set(id, element);
    }

    for (const element of elements) {
      for (const relationship of ["aria-labelledby", "aria-describedby"]) {
        const references = element.attributes.get(relationship)?.trim().split(/\s+/).filter(Boolean) ?? [];
        for (const reference of references) {
          assert.ok(ids.has(reference), `${relationship} must resolve active ID: ${reference}`);
          assert.ok(textContent(ids.get(reference)), `${relationship} target must expose text: ${reference}`);
        }
      }
    }

    const navigationControls = elements.filter((element) => (
      element.tagName === "nav" || (element.tagName === "button" && element.attributes.has("data-nav-toggle"))
    ));
    assert.ok(navigationControls.length >= 3, "fixture must include primary navigation, language navigation, and the menu control");
    for (const control of navigationControls) {
      assert.ok(accessibleName(control, ids), `${control.tagName} navigation control needs an accessible name`);
    }
  });

  test(`${document.route} hides decorative status and direction marks while preserving textual meaning`, async () => {
    const html = await readFile(path.join(rootDir, document.file), "utf8");
    const decorativeClasses = ["status-dot", "app-live-dot", "app-horizon-dot", "living-system-card__arrow"];
    for (const className of decorativeClasses) {
      for (const tag of openingTags(html, `class="${className}"`)) {
        assert.equal(attribute(tag, "aria-hidden"), "true", `${className} must remain decorative`);
      }
    }

    for (const freshness of scopedElements(html, "span").filter((scope) => /class="freshness(?:\s|\")/.test(scope))) {
      assert.match(freshness, /<span class="freshness-label">[^<]+<\/span>/, "freshness state needs visible text");
      assert.match(freshness, /<time\s+datetime="\d{4}-\d{2}-\d{2}">\d{4}-\d{2}-\d{2}<\/time>/, "freshness needs a visible absolute date");
    }
  });

  test(`${document.route} exposes one complete, internally linked navigation shell`, async () => {
    const html = await readFile(path.join(rootDir, document.file), "utf8");
    const toggles = openingTags(html, "data-nav-toggle");
    const panels = openingTags(html, "data-nav-panel");
    const backdrops = openingTags(html, "data-nav-backdrop");

    assert.equal(toggles.length, 1, "expected one menu toggle");
    assert.equal(panels.length, 1, "expected one menu panel");
    assert.equal(backdrops.length, 1, "expected one menu backdrop");
    assert.ok(attribute(panels[0], "id"), "menu panel needs an ID");
    assert.equal(attribute(toggles[0], "aria-controls"), attribute(panels[0], "id"));

    const ids = Array.from(html.matchAll(/\sid=(?:"([^"]+)"|'([^']+)')/gi), (match) => match[1] ?? match[2]);
    assert.equal(new Set(ids).size, ids.length, "all document IDs must be unique");

    const primaryLabel = document.locale === "tr" ? "Ana navigasyon" : "Primary navigation";
    const languageLabel = document.locale === "tr" ? "Dil seçimi" : "Language selection";
    assert.equal(openingTags(html, `aria-label="${primaryLabel}"`).filter((tag) => /^<nav\b/i.test(tag)).length, 1);
    assert.equal(openingTags(html, `aria-label="${languageLabel}"`).filter((tag) => /^<nav\b/i.test(tag)).length, 1);
  });

  test(`${document.route} describes every new-tab destination to assistive technology`, async () => {
    const html = await readFile(path.join(rootDir, document.file), "utf8");
    const expectedText = document.locale === "tr" ? "yeni sekmede açılır" : "opens in a new tab";
    const svgScopes = scopedElements(html, "svg");
    const htmlOnly = svgScopes.reduce((source, svg) => source.replace(svg, ""), html);
    const blankAnchors = anchors(htmlOnly).filter(({ openingTag }) => attribute(openingTag, "target") === "_blank");

    assert.ok(blankAnchors.length > 0, "fixture must exercise at least one new-tab link");
    for (const anchor of blankAnchors) {
      const relTokens = (attribute(anchor.openingTag, "rel") ?? "").toLowerCase().split(/\s+/);
      assert.ok(relTokens.includes("noreferrer"), `${anchor.openingTag} needs noreferrer`);
      assert.match(anchor.content, new RegExp(`<span\\s+class="sr-only">\\s*${expectedText}\\s*</span>`, "i"));
    }
  });
}

for (const document of routes.filter(({ route }) => route === "/" || route === "/tr/")) {
  test(`${document.route} presents the horizon path from world models through the twin lab to humanoid engineering`, async () => {
    const html = await readFile(path.join(rootDir, document.file), "utf8");
    const horizon = scopedElements(html, "aside").find((scope) => /class="learning-horizon"/.test(scope));
    const expectedBridgeCopy = document.locale === "tr"
      ? "algı, tahmin, planlama ve eylem"
      : "perception, prediction, planning, and action";

    assert.ok(horizon, "learning horizon callout must remain visible");
    assert.match(horizon, new RegExp(expectedBridgeCopy));
    assert.deepEqual(
      anchors(horizon).map(({ openingTag }) => attribute(openingTag, "href")),
      [
        "https://wfm.aserdargun.com/",
        "https://itl.aserdargun.com/",
        "https://eng.aserdargun.com/",
      ],
    );
  });

  test(`${document.route} exposes local and cloud deployment as two detailed learning cards`, async () => {
    const html = await readFile(path.join(rootDir, document.file), "utf8");
    const learning = scopedElements(html, "section").find((scope) => /class="learning-system"/.test(scope));
    const deploymentPaths = scopedElements(learning ?? "", "ul").find((scope) => /class="learning-deployment-paths"/.test(scope));
    const expectedQuestion = document.locale === "tr"
      ? "“Hangi laboratuvarı almalıyım?”"
      : "“Which local lab should I buy?”";

    assert.ok(deploymentPaths, "the detailed learning flow must expose a deployment-card group");
    const cards = scopedElements(deploymentPaths, "li");
    assert.equal(cards.length, 2);
    assert.deepEqual(
      cards.map((card) => card.match(/<code class="learning-code">([a-z]{3})<\/code>/)?.[1]),
      ["lcl", "cld"],
    );
    assert.deepEqual(
      cards.map((card) => card.match(/<span class="learning-order" aria-hidden="true">([^<]+)<\/span>/)?.[1]),
      ["7A", "7B"],
    );
    assert.equal(cards[0].includes(expectedQuestion), true);
    assert.deepEqual(
      cards.map((card) => anchors(card).find(({ openingTag }) => (
        (attribute(openingTag, "class") ?? "").split(/\s+/).includes("learning-node-link")
      ))?.openingTag).map((openingTag) => attribute(openingTag, "href")),
      ["https://lcl.aserdargun.com/", "https://cld.aserdargun.com/"],
    );
  });

  test(`${document.route} places the HNS harness card between model serving and deployment`, async () => {
    const html = await readFile(path.join(rootDir, document.file), "utf8");
    const learning = scopedElements(html, "section").find((scope) => /class="learning-system"/.test(scope));
    const harnessCard = scopedElements(learning ?? "", "article").find((scope) => (
      /<code class="learning-code">hns<\/code>/.test(scope)
    ));
    const expectedQuestion = document.locale === "tr"
      ? "“Model kabiliyetini nasıl güvenilir bir agent sistemine dönüştürürüm?”"
      : "“How do I turn model capability into a reliable agent system?”";

    assert.ok(harnessCard, "the detailed learning flow must expose the HNS harness card");
    assert.equal(harnessCard.includes(expectedQuestion), true);
    assert.deepEqual(
      anchors(harnessCard).map(({ openingTag }) => attribute(openingTag, "href")),
      ["https://hns.aserdargun.com/"],
    );
    assert.ok(
      (learning ?? "").indexOf(harnessCard) < (learning ?? "").indexOf('class="learning-deployment-paths"'),
      "HNS must precede the local and cloud deployment choices",
    );
  });

  test(`${document.route} places SEC between harness engineering and parallel deployment decisions`, async () => {
    const html = await readFile(path.join(rootDir, document.file), "utf8");
    const learning = scopedElements(html, "section").find((scope) => /class="learning-system"/.test(scope));
    const securityCard = scopedElements(learning ?? "", "article").find((scope) => (
      /<code class="learning-code">sec<\/code>/.test(scope)
    ));
    const expectedQuestion = document.locale === "tr"
      ? "“Bu agent sistemine neden güvenmeliyim?”"
      : "“Why should I trust this agent system?”";

    assert.ok(securityCard, "the detailed learning flow must expose the SEC assurance card");
    assert.equal(securityCard.includes(expectedQuestion), true);
    assert.deepEqual(
      anchors(securityCard).map(({ openingTag }) => attribute(openingTag, "href")),
      ["https://sec.aserdargun.com/"],
    );
    assert.ok(
      (learning ?? "").indexOf('<code class="learning-code">hns</code>') < (learning ?? "").indexOf(securityCard),
      "HNS must feed SEC",
    );
    assert.ok(
      (learning ?? "").indexOf(securityCard) < (learning ?? "").indexOf('class="learning-deployment-paths"'),
      "SEC must gate the local and cloud deployment choices",
    );
  });

  test(`${document.route} labels and contains the application table scroll region`, async () => {
    const html = await readFile(path.join(rootDir, document.file), "utf8");
    const wrappers = openingTags(html, "class=\"app-map-table-wrap\"");
    assert.equal(wrappers.length, 1, "expected one application table wrapper");
    assert.equal(attribute(wrappers[0], "role"), "region");
    assert.equal(attribute(wrappers[0], "aria-labelledby"), "app-map-title");
    assert.equal(attribute(wrappers[0], "tabindex"), "0", "overflow region must be keyboard reachable");
  });
}

for (const document of routes.filter(({ route }) => route === "/" || route === "/tr/")) {
  test(`${document.route} keeps all learning-diagram links valid, named SVG children`, async () => {
    const html = await readFile(path.join(rootDir, document.file), "utf8");
    const [svg, ...extraSvgScopes] = scopedElements(html, "svg");
    const expectedTitle = document.locale === "tr" ? "Yeni sekmede açılır" : "Opens in a new tab";
    const expectedNodes = [
      ["https://aia.aserdargun.com/", "AIA"],
      ["https://gpu.aserdargun.com/", "GPU"],
      ["https://llm.aserdargun.com/", "LLM"],
      ["https://usl.aserdargun.com/", "USL"],
      ["https://hns.aserdargun.com/", "HNS"],
      ["https://sec.aserdargun.com/", "SEC"],
      ["https://lcl.aserdargun.com/", "LCL"],
      ["https://cld.aserdargun.com/", "CLD"],
    ];

    assert.ok(svg, "learning diagram SVG must remain a closed source scope");
    assert.equal(extraSvgScopes.length, 0);
    assert.doesNotMatch(svg, /<(?:span|foreignObject)\b/i, "HTML must never be inserted into SVG");
    const svgBlankAnchors = anchors(svg).filter(({ openingTag }) => attribute(openingTag, "target") === "_blank");
    assert.equal(svgBlankAnchors.length, expectedNodes.length, "all eight diagram nodes must remain inside SVG");

    assert.deepEqual(svgBlankAnchors.map((anchor) => attribute(anchor.openingTag, "href")), expectedNodes.map(([href]) => href));
    for (const [index, anchor] of svgBlankAnchors.entries()) {
      const titleId = `ld-new-tab-${expectedNodes[index][1].toLowerCase()}-${document.locale}`;
      const relTokens = (attribute(anchor.openingTag, "rel") ?? "").toLowerCase().split(/\s+/);
      assert.ok(relTokens.includes("noreferrer"));
      assert.ok((attribute(anchor.openingTag, "aria-describedby") ?? "").split(/\s+/).includes(titleId));
      assert.match(anchor.content, new RegExp(`^\\s*<title id="${titleId}">${expectedTitle}</title>`));
      assert.equal((anchor.content.match(/<title\b/g) ?? []).length, 1, "new-tab SVG title must be singular");
      assert.match(anchor.content, new RegExp(`>${expectedNodes[index][1]}<`), "existing node name must be preserved");
    }
  });

  test(`${document.route} provides all eight mobile learning targets without exposing the undersized SVG set`, async () => {
    const html = await readFile(path.join(rootDir, document.file), "utf8");
    const studyList = scopedElements(html, "ol").find((scope) => /class="learning-study-list"/.test(scope));
    const expectedText = document.locale === "tr" ? "yeni sekmede açılır" : "opens in a new tab";
    const expectedDestinations = ["aia", "gpu", "llm", "usl", "hns", "sec", "lcl", "cld"].map((code) => `https://${code}.aserdargun.com/`);

    assert.ok(studyList, "the existing study-order list must host the mobile alternate UI");
    const studySteps = scopedElements(studyList, "li");
    const mobileTargets = anchors(studyList).filter(({ openingTag }) => (
      (attribute(openingTag, "class") ?? "").split(/\s+/).includes("learning-study-link")
    ));
    assert.equal(studySteps.length, 7, "HNS and SEC must precede the shared local and cloud decision step");
    assert.deepEqual(
      anchors(studySteps.at(-1)).map(({ openingTag }) => attribute(openingTag, "href")),
      ["https://lcl.aserdargun.com/", "https://cld.aserdargun.com/"],
      "the final mobile step must expose local and cloud deployment as parallel choices",
    );
    assert.equal(mobileTargets.length, 8, "mobile must expose exactly one eight-link alternate target set");
    assert.deepEqual(mobileTargets.map(({ openingTag }) => attribute(openingTag, "href")), expectedDestinations);
    for (const target of mobileTargets) {
      assert.equal(attribute(target.openingTag, "target"), "_blank");
      assert.ok((attribute(target.openingTag, "rel") ?? "").split(/\s+/).includes("noreferrer"));
      assert.match(target.content, new RegExp(`<span\\s+class="sr-only">\\s*${expectedText}\\s*</span>`, "i"));
    }
  });
}

test("mobile learning alternate exposes one non-overlapping 44px focus set while desktop keeps the SVG", async () => {
  const css = await readFile(path.join(rootDir, "styles.css"), "utf8");
  const svgBaseIndex = css.indexOf("/* Learning diagram (SVG) */");
  const finalMobileOverrideIndex = css.indexOf("@media (max-width: 900px)", svgBaseIndex);

  assert.match(css, /\.learning-study-link\s*\{[\s\S]*?display:\s*none;/, "mobile alternate links must not duplicate the desktop SVG focus set");
  assert.match(
    css,
    /@media\s*\(max-width:\s*900px\)[\s\S]*?\.learning-diagram-wrap\s*\{[\s\S]*?display:\s*none;[\s\S]*?\.learning-study-copy\s*\{[\s\S]*?display:\s*none;[\s\S]*?\.learning-study-link\s*\{[\s\S]*?display:\s*flex;[\s\S]*?width:\s*100%;[\s\S]*?min-height:\s*44px;/,
    "mobile must hide the SVG from layout/AT/interaction and expose only eight full-row 44px alternate links",
  );
  assert.ok(
    svgBaseIndex >= 0 && finalMobileOverrideIndex > svgBaseIndex,
    "the mobile SVG hiding rule must follow the base SVG display rule so the cascade cannot restore undersized anchors",
  );
  assert.match(
    css.slice(finalMobileOverrideIndex),
    /\.learning-diagram-wrap\s*\{[\s\S]*?display:\s*none;/,
    "the final mobile cascade must hide the SVG figure",
  );
});

test("detailed deployment cards use a two-column desktop and one-column mobile grid", async () => {
  const css = await readFile(path.join(rootDir, "styles.css"), "utf8");

  assert.match(
    css,
    /\.learning-deployment-paths\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*900px\)[\s\S]*?\.learning-deployment-paths\s*\{[^}]*grid-template-columns:\s*1fr;/,
  );
});

test("the learning horizon heading stays legible on its dark surface", async () => {
  const css = await readFile(path.join(rootDir, "styles.css"), "utf8");

  assert.match(
    css,
    /\.learning-horizon h3\s*\{[^}]*color:\s*var\(--white\);/s,
  );
});

test("mobile navigation state closes through every path, cleans up, and restores focus", async () => {
  const source = await readFile(path.join(rootDir, "scripts.js"), "utf8");
  const events = [];
  const context = {
    document: {
      documentElement: { classList: { add() {} } },
      addEventListener() {},
    },
  };
  vm.runInNewContext(`${source}\n;globalThis.__createMobileNavState = createMobileNavState;`, context);
  const createMobileNavState = context.__createMobileNavState;
  assert.equal(typeof createMobileNavState, "function");

  const state = createMobileNavState({
    applyOpen(open) { events.push(["open", open]); },
    restoreFocus() { events.push(["focus"]); },
  });

  state.toggle();
  assert.equal(state.isOpen(), true);
  state.onEscape();
  assert.equal(state.isOpen(), false);
  assert.deepEqual(events.slice(-2), [["open", false], ["focus"]]);

  for (const closePath of ["onBackdrop", "onLink", "onWideViewport"]) {
    state.toggle();
    state[closePath]();
    assert.equal(state.isOpen(), false, `${closePath} must close the panel`);
    assert.deepEqual(events.slice(-2), [["open", false], ["focus"]], `${closePath} must clean up and restore focus`);
  }
});

test("client freshness recomputes coherent EN/TR boundary presentations and preserves unsafe fallbacks", async () => {
  const source = await readFile(path.join(rootDir, "scripts.js"), "utf8");
  const makeFreshness = (dateOnly, state, label) => {
    const classes = new Set(["freshness", `freshness--${state}`]);
    const attributes = new Map([
      ["data-freshness-date", dateOnly],
      ["data-freshness-state", state],
    ]);
    const labelNode = { textContent: label };
    const dotClasses = new Set(["app-live-dot", "app-live-dot--pulsing"]);
    const dotNode = { classList: { toggle(token, force) { if (force) dotClasses.add(token); else dotClasses.delete(token); }, contains(token) { return dotClasses.has(token); } } };
    const children = [];
    return {
      attributes,
      children,
      classList: {
        add(...tokens) { tokens.forEach((token) => classes.add(token)); },
        remove(...tokens) { tokens.forEach((token) => classes.delete(token)); },
        toggle(token, force) { if (force) classes.add(token); else classes.delete(token); },
        contains(token) { return classes.has(token); },
      },
      getAttribute(name) { return attributes.get(name) ?? null; },
      setAttribute(name, value) { attributes.set(name, value); },
      querySelector(selector) {
        if (selector === ".freshness-label") return labelNode;
        if (selector === ".freshness-relative") return children.find((child) => child.className === "freshness-relative") ?? null;
        if (selector === ".app-live-dot") return dotNode;
        return null;
      },
      append(child) { children.push(child); },
      labelNode,
      dotNode,
    };
  };
  const applicationBadge = makeFreshness("2026-08-14", "current", "Current");
  const nowBadge = makeFreshness("2026-08-21", "current", "Current");
  const context = {
    document: {
      documentElement: { classList: { add() {} }, lang: "en" },
      addEventListener() {},
      createElement() { return { className: "", textContent: "", remove() {} }; },
      querySelectorAll(selector) { return selector === "[data-freshness-date]" ? [applicationBadge, nowBadge] : []; },
    },
  };
  vm.runInNewContext(`${source}\n;globalThis.__computeFreshnessPresentation = computeFreshnessPresentation;globalThis.__initializeRelativeFreshness = initializeRelativeFreshness;`, context);
  const compute = context.__computeFreshnessPresentation;
  assert.equal(typeof compute, "function");

  const today = new Date("2026-08-29T12:00:00Z");
  const cases = [
    ["2026-08-29", "en", "current", "Current", ""],
    ["2026-08-22", "en", "current", "Current", " · 7 days ago"],
    ["2026-08-21", "en", "aging", "Review soon", " · 8 days ago"],
    ["2026-08-15", "tr", "aging", "Yakında gözden geçir", " · 14 gün önce"],
    ["2026-08-14", "tr", "needs-refresh", "Yenilenmeli", " · 15 gün önce"],
  ];
  for (const [dateOnly, locale, state, label, relative] of cases) {
    assert.deepEqual(
      { ...compute(dateOnly, today, locale) },
      { state, label, relative },
    );
  }
  assert.equal(compute("not-a-date", today, "en"), null);
  assert.equal(compute("2026-08-30", today, "tr"), null);

  context.__initializeRelativeFreshness(today);
  assert.deepEqual(
    [applicationBadge, nowBadge].map((badge) => ({
      state: badge.attributes.get("data-freshness-state"),
      label: badge.labelNode.textContent,
      relative: badge.children[0]?.textContent ?? "",
      pulsing: badge.dotNode.classList.contains("app-live-dot--pulsing"),
    })),
    [
      { state: "needs-refresh", label: "Needs refresh", relative: " · 15 days ago", pulsing: false },
      { state: "aging", label: "Review soon", relative: " · 8 days ago", pulsing: false },
    ],
  );
});

test("mobile navigation styles preserve touch size, focus, zoom scrolling, and reduced motion", async () => {
  const css = await readFile(path.join(rootDir, "styles.css"), "utf8");

  assert.match(css, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.nav-toggle\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;/);
  assert.match(css, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.nav-links a[\s\S]*?min-height:\s*44px;/);
  assert.match(css, /:focus-visible[\s\S]*?outline:\s*(?:solid\s+)?2px\s+[^;]+;[\s\S]*?outline-offset:\s*[1-9][0-9]*px;/);
  assert.match(css, /\.nav-panel\s*\{[\s\S]*?max-height:\s*100dvh;[\s\S]*?overflow-y:\s*auto;/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.nav-panel,[\s\S]*?\.nav-backdrop\s*\{[\s\S]*?transition:\s*none\s*!important;/);
  assert.match(css, /a:focus-visible,\s*button:focus-visible\s*\{[\s\S]*?outline:\s*(?:solid\s+)?2px\s+[^;]+;[\s\S]*?outline-offset:\s*[1-9][0-9]*px;/, "every link and button needs a shared visible focus indicator");
  assert.match(css, /\.app-map-table-wrap:focus-visible\s*\{[\s\S]*?outline:\s*(?:solid\s+)?2px\s+[^;]+;/, "keyboard-scrollable tables need a visible focus indicator");
  assert.match(css, /@media\s*\(max-width:\s*900px\)[\s\S]*?a,\s*button\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;/, "mobile links and buttons need a shared 44px touch-target contract");
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?html\s*\{[\s\S]*?scroll-behavior:\s*auto;/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.career-transition\s*\{[\s\S]*?display:\s*none;/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.status-dot\s*\{[\s\S]*?animation:\s*none;/);
});
