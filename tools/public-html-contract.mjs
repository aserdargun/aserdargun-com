import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  activeDocumentScope,
  elements as activeHtmlElements,
  isActive as isActiveHtmlNode,
  isDescendantOf as isActiveDescendantOf,
  parseActiveHtml,
  semanticText,
} from "./active-html-model.mjs";

export const PUBLIC_INDEX_EXCLUDED_DIRECTORIES = Object.freeze([
  ".git",
  ".superpowers",
  ".worktrees",
  "node_modules",
]);

const excludedDirectoryNames = new Set(PUBLIC_INDEX_EXCLUDED_DIRECTORIES);
const HTML_VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr",
]);
const DECORATIVE_CLASSES = new Set([
  "status-dot",
  "app-live-dot",
  "app-horizon-dot",
  "living-system-card__arrow",
]);

function toPosixPath(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function routeFromRelativePath(relativePath) {
  if (relativePath === "index.html") return "/";
  return `/${relativePath.slice(0, -"index.html".length)}`;
}

export async function discoverPublicIndexDocuments(rootDir) {
  const documents = [];

  async function visit(directory) {
    const entries = (await readdir(directory, { withFileTypes: true }))
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (entry.isDirectory() && excludedDirectoryNames.has(entry.name)) continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (entry.isFile() && entry.name === "index.html") {
        const relativePath = toPosixPath(path.relative(rootDir, absolutePath));
        documents.push({
          absolutePath,
          relativePath,
          route: routeFromRelativePath(relativePath),
        });
      }
    }
  }

  await visit(rootDir);
  return documents.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function parseAttributes(source) {
  const attributes = new Map();
  for (const match of source.matchAll(/([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function parseDocumentElementsLegacy(html) {
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

    const attributes = parseAttributes(token[2]);
    const parent = stack.at(-1) ?? null;
    const active = (parent?.active ?? true)
      && !attributes.has("hidden")
      && !attributes.has("inert")
      && attributes.get("aria-hidden")?.toLowerCase() !== "true";
    const element = {
      active,
      attributes,
      parent,
      sourceIndex: token.index,
      tagName,
      text: "",
    };
    elements.push(element);
    if (!HTML_VOID_ELEMENTS.has(tagName) && !token[0].endsWith("/>")) stack.push(element);
  }

  return elements;
}

function parseDocumentElements(html) {
  const tree = parseActiveHtml(html);
  const skeleton = activeDocumentScope(tree);
  const nodes = [skeleton.html, skeleton.head, skeleton.body, ...activeHtmlElements(tree)];
  const uniqueNodes = [...new Set(nodes)];
  for (const node of uniqueNodes) {
    node.active = isActiveHtmlNode(node)
      && (node === skeleton.html || node === skeleton.head || node === skeleton.body || isActiveDescendantOf(node, skeleton.body));
  }
  return uniqueNodes;
}

function classTokens(element) {
  return (element.attributes.get("class") ?? "").split(/\s+/).filter(Boolean);
}

function textContent(element) {
  return element ? semanticText(element) : "";
}

function relationshipReferences(element, name) {
  return (element.attributes.get(name) ?? "").trim().split(/\s+/).filter(Boolean);
}

function isDescendantOf(element, ancestor) {
  for (let parent = element.parent; parent; parent = parent.parent) {
    if (parent === ancestor) return true;
  }
  return false;
}

function accessibleName(element, ids) {
  const directLabel = element.attributes.get("aria-label")?.trim();
  if (directLabel) return directLabel;
  const references = relationshipReferences(element, "aria-labelledby");
  if (references.length > 0) return references.map((reference) => textContent(ids.get(reference))).join(" ").trim();
  return textContent(element);
}

function diagnostic(code, relativePath, message) {
  return { code, message, relativePath };
}

export function validatePublicAccessibilityDocument({ html, relativePath }) {
  const diagnostics = [];
  let elements;
  try {
    elements = parseDocumentElements(html);
  } catch {
    return [diagnostic("document-structure", relativePath, "document must be well formed with one active html, head, and body scope")];
  }
  const activeElements = elements.filter(({ active }) => active);
  const body = activeElements.find(({ tagName }) => tagName === "body") ?? null;
  const skipLinks = activeElements.filter((element) => (
    element.tagName === "a" && classTokens(element).includes("skip-link")
  ));
  const mains = activeElements.filter(({ tagName }) => tagName === "main");
  const h1s = activeElements.filter(({ tagName }) => tagName === "h1");
  const pageHeaders = body
    ? activeElements.filter((element) => element.tagName === "header" && element.parent === body)
    : [];
  const pageFooters = body
    ? activeElements.filter((element) => element.tagName === "footer" && element.parent === body)
    : [];

  if (skipLinks.length !== 1) {
    diagnostics.push(diagnostic("skip-link-count", relativePath, "exactly one active skip link is required"));
  }
  if (mains.length !== 1) {
    diagnostics.push(diagnostic("main-count", relativePath, "exactly one active main landmark is required"));
  }
  if (h1s.length !== 1 || (h1s[0] && !textContent(h1s[0]))) {
    diagnostics.push(diagnostic("h1-count", relativePath, "exactly one non-empty active h1 is required"));
  }
  if (pageHeaders.length > 1) {
    diagnostics.push(diagnostic("page-header-count", relativePath, "at most one direct page header is allowed"));
  }
  if (pageFooters.length > 1) {
    diagnostics.push(diagnostic("page-footer-count", relativePath, "at most one direct page footer is allowed"));
  }

  if (mains.length === 1) {
    const mainId = mains[0].attributes.get("id")?.trim();
    if (!mainId) diagnostics.push(diagnostic("main-id", relativePath, "the active main landmark needs an ID"));
    else if (skipLinks.length === 1 && skipLinks[0].attributes.get("href") !== `#${mainId}`) {
      diagnostics.push(diagnostic("skip-target", relativePath, "the skip link must target the active main landmark"));
    }
  }
  if (skipLinks.length === 1 && !textContent(skipLinks[0])) {
    diagnostics.push(diagnostic("skip-name", relativePath, "the active skip link needs visible text"));
  }

  if (skipLinks.length === 1 && mains.length === 1) {
    const sequence = [skipLinks[0], ...pageHeaders, mains[0], ...pageFooters];
    if (sequence.some((element, index) => index > 0 && sequence[index - 1].sourceIndex >= element.sourceIndex)) {
      diagnostics.push(diagnostic("source-order", relativePath, "source order must remain skip, page header when present, main, and page footer when present"));
    }
  }

  const ids = new Map();
  for (const element of activeElements.filter(({ attributes }) => attributes.has("id"))) {
    const id = element.attributes.get("id")?.trim();
    if (!id) {
      diagnostics.push(diagnostic("id-empty", relativePath, "active document IDs must not be empty"));
    } else if (ids.has(id)) {
      diagnostics.push(diagnostic("id-duplicate", relativePath, `duplicate active ID: ${id}`));
    } else {
      ids.set(id, element);
    }
  }

  for (const element of activeElements) {
    for (const relationship of ["aria-labelledby", "aria-describedby"]) {
      for (const reference of relationshipReferences(element, relationship)) {
        const target = ids.get(reference);
        if (!target || !textContent(target)) {
          diagnostics.push(diagnostic("aria-reference", relativePath, `${relationship} must resolve a non-empty active ID: ${reference}`));
        }
      }
    }
  }

  for (const control of activeElements.filter((element) => (
    element.tagName === "nav"
      || (element.tagName === "button" && element.attributes.has("data-nav-toggle"))
  ))) {
    if (!accessibleName(control, ids)) {
      diagnostics.push(diagnostic("navigation-name", relativePath, `${control.tagName} navigation control needs an accessible name`));
    }
  }

  const htmlElement = activeElements.find(({ tagName }) => tagName === "html");
  const newTabText = htmlElement?.attributes.get("lang")?.toLowerCase().startsWith("tr")
    ? "yeni sekmede açılır"
    : "opens in a new tab";
  for (const anchor of activeElements.filter((element) => (
    element.tagName === "a" && element.attributes.get("target") === "_blank"
  ))) {
    const relTokens = (anchor.attributes.get("rel") ?? "").toLowerCase().split(/\s+/);
    if (!relTokens.includes("noreferrer") || !textContent(anchor).toLowerCase().includes(newTabText)) {
      diagnostics.push(diagnostic("new-tab-text", relativePath, `new-tab destinations need noreferrer and localized hidden text: ${newTabText}`));
    }
  }

  for (const element of elements) {
    if (classTokens(element).some((className) => DECORATIVE_CLASSES.has(className))
      && element.attributes.get("aria-hidden")?.toLowerCase() !== "true") {
      diagnostics.push(diagnostic("decorative-visible", relativePath, "decorative status/direction marks must be hidden from assistive technology"));
    }
  }

  for (const freshness of activeElements.filter((element) => classTokens(element).includes("freshness"))) {
    const descendants = activeElements.filter((element) => isDescendantOf(element, freshness));
    const hasLabel = descendants.some((element) => classTokens(element).includes("freshness-label") && textContent(element));
    const hasDate = descendants.some((element) => (
      element.tagName === "time"
      && /^\d{4}-\d{2}-\d{2}$/.test(element.attributes.get("datetime") ?? "")
      && /^\d{4}-\d{2}-\d{2}$/.test(textContent(element))
    ));
    if (!hasLabel || !hasDate) {
      diagnostics.push(diagnostic("freshness-text", relativePath, "freshness requires visible state text and an absolute date"));
    }
  }

  return diagnostics;
}

export function validatePublicIndexCoverage(discoveredDocuments, coveredRelativePaths) {
  const diagnostics = [];
  const discoveredPaths = new Set(discoveredDocuments.map(({ relativePath }) => relativePath));
  const coveredCounts = new Map();
  for (const relativePath of coveredRelativePaths) {
    coveredCounts.set(relativePath, (coveredCounts.get(relativePath) ?? 0) + 1);
  }

  for (const relativePath of [...discoveredPaths].sort()) {
    const count = coveredCounts.get(relativePath) ?? 0;
    if (count === 0) diagnostics.push(diagnostic("coverage-missing", relativePath, "discovered public index document was not validated"));
    else if (count > 1) diagnostics.push(diagnostic("coverage-duplicate", relativePath, "public index document was validated more than once"));
  }
  for (const relativePath of [...coveredCounts.keys()].sort()) {
    if (!discoveredPaths.has(relativePath)) {
      diagnostics.push(diagnostic("coverage-unexpected", relativePath, "coverage includes a document outside recursive public discovery"));
    }
  }

  return diagnostics;
}
