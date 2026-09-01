const HTML_VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr",
]);
const RCDATA_ELEMENTS = new Set(["title", "textarea"]);
const RAW_TEXT_ELEMENTS = new Set([
  "script", "style", "xmp", "iframe", "noembed", "noframes", "noscript",
]);
const TEXT_ONLY_ELEMENTS = new Set([...RCDATA_ELEMENTS, ...RAW_TEXT_ELEMENTS]);
const NAMED_REFERENCES = Object.freeze({
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"',
});

export class ActiveHtmlStructureError extends Error {
  constructor(message) {
    super(`Malformed controlled HTML: ${message}`);
    this.name = "ActiveHtmlStructureError";
  }
}

function fail(message) {
  throw new ActiveHtmlStructureError(message);
}

export function decodeHtmlReferences(value) {
  return String(value).replace(/&(?:#([0-9]+);?|#x([0-9a-f]+);?|([a-z]+);)/gi, (reference, decimal, hexadecimal, named) => {
    if (named) return NAMED_REFERENCES[named.toLowerCase()] ?? reference;
    const codePoint = Number.parseInt(decimal ?? hexadecimal, decimal ? 10 : 16);
    if (!Number.isInteger(codePoint)
      || codePoint === 0
      || codePoint > 0x10ffff
      || (codePoint >= 0xd800 && codePoint <= 0xdfff)
      || (codePoint < 0x20 && ![0x09, 0x0a, 0x0c, 0x0d].includes(codePoint))
      || (codePoint >= 0x7f && codePoint <= 0x9f)
      || (codePoint >= 0xfdd0 && codePoint <= 0xfdef)
      || (codePoint & 0xffff) === 0xfffe
      || (codePoint & 0xffff) === 0xffff) return "\uFFFD";
    return String.fromCodePoint(codePoint);
  });
}

function scanTagEnd(source, start) {
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
    if (character === "<") fail("nested tag opener before the current tag closed");
  }
  fail("unclosed tag or quoted attribute");
}

function parseAttributes(source, tagName) {
  const attributes = new Map();
  let index = 0;
  while (index < source.length) {
    while (/\s/.test(source[index] ?? "")) index += 1;
    if (index >= source.length) break;
    const nameMatch = source.slice(index).match(/^[^\s"'<>\/=]+/);
    if (!nameMatch) fail(`malformed attribute on <${tagName}>`);
    const name = nameMatch[0].toLowerCase();
    if (attributes.has(name)) fail(`duplicate ${name} attribute on <${tagName}>`);
    index += nameMatch[0].length;
    while (/\s/.test(source[index] ?? "")) index += 1;
    if (source[index] !== "=") {
      attributes.set(name, true);
      continue;
    }
    index += 1;
    while (/\s/.test(source[index] ?? "")) index += 1;
    const quote = source[index];
    if (quote !== '"' && quote !== "'") fail(`unquoted ${name} attribute on <${tagName}>`);
    const valueStart = index + 1;
    const valueEnd = source.indexOf(quote, valueStart);
    if (valueEnd < 0) fail(`unclosed ${name} attribute on <${tagName}>`);
    attributes.set(name, decodeHtmlReferences(source.slice(valueStart, valueEnd)));
    index = valueEnd + 1;
  }
  return attributes;
}

function parseStartTag(token) {
  let body = token.slice(1, -1).trimEnd();
  const selfClosing = body.endsWith("/");
  if (selfClosing) body = body.slice(0, -1).trimEnd();
  const nameMatch = body.match(/^([A-Za-z][A-Za-z0-9:-]*)([\s\S]*)$/);
  if (!nameMatch || (nameMatch[2] !== "" && !/^\s/.test(nameMatch[2]))) fail(`malformed start tag ${token}`);
  const tagName = nameMatch[1].toLowerCase();
  return { tagName, attributes: parseAttributes(nameMatch[2], tagName), selfClosing };
}

function insertionNamespace(parent) {
  if (parent.type !== "element") return "html";
  if (parent.namespace === "svg" && parent.tagName !== "foreignobject") return "svg";
  return "html";
}

export function parseActiveHtml(source) {
  if (typeof source !== "string") fail("document source must be a string");
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
      if (commentEnd < 0) fail("unclosed HTML comment");
      cursor = commentEnd + 3;
      continue;
    }
    const tokenEnd = scanTagEnd(source, cursor);
    const token = source.slice(cursor, tokenEnd + 1);
    if (/^<!doctype\s+html\s*>$/i.test(token)) {
      cursor = tokenEnd + 1;
      continue;
    }
    if (token.startsWith("<!") || token.startsWith("<?")) fail(`unsupported declaration ${token}`);
    if (token.startsWith("</")) {
      const closingMatch = token.match(/^<\/([A-Za-z][A-Za-z0-9:-]*)\s*>$/);
      if (!closingMatch) fail(`malformed closing tag ${token}`);
      const tagName = closingMatch[1].toLowerCase();
      const opening = stack.at(-1);
      if (opening === root || opening.tagName !== tagName) fail(`mismatched closing tag </${tagName}>`);
      opening.contentEnd = cursor;
      opening.end = tokenEnd + 1;
      stack.pop();
      cursor = tokenEnd + 1;
      continue;
    }

    const { tagName, attributes, selfClosing } = parseStartTag(token);
    const parent = stack.at(-1);
    const parentNamespace = insertionNamespace(parent);
    const namespace = tagName === "svg" ? "svg" : parentNamespace;
    const htmlVoid = namespace === "html" && HTML_VOID_ELEMENTS.has(tagName);
    if (selfClosing && parentNamespace !== "svg" && !htmlVoid) fail(`self-closing non-void <${tagName}> element`);
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
    if (selfClosing || htmlVoid) continue;
    if (namespace === "html" && tagName === "plaintext") {
      if (cursor < source.length) node.children.push({ type: "text", value: source.slice(cursor), start: cursor, end: source.length, parent: node });
      node.contentEnd = source.length;
      node.end = source.length;
      cursor = source.length;
      continue;
    }
    if (namespace === "html" && TEXT_ONLY_ELEMENTS.has(tagName)) {
      const closingPattern = new RegExp(`<\\/${tagName}\\s*>`, "ig");
      closingPattern.lastIndex = cursor;
      const closing = closingPattern.exec(source);
      if (!closing) fail(`unclosed text-only <${tagName}> element`);
      if (closing.index > cursor) node.children.push({
        type: "text",
        value: source.slice(cursor, closing.index),
        start: cursor,
        end: closing.index,
        parent: node,
      });
      node.contentEnd = closing.index;
      node.end = closing.index + closing[0].length;
      cursor = node.end;
      continue;
    }
    stack.push(node);
  }
  if (stack.length !== 1) fail(`unclosed <${stack.at(-1).tagName}> element`);
  return root;
}

export function elements(scope, { includeTemplateContents = false } = {}) {
  const found = [];
  const visit = (node) => {
    for (const child of node.children) {
      if (child.type !== "element") continue;
      found.push(child);
      if (!includeTemplateContents && child.namespace === "html" && child.tagName === "template") continue;
      visit(child);
    }
  };
  visit(scope);
  return found;
}

export function elementsByTag(scope, tagName, options) {
  return elements(scope, options).filter((node) => node.tagName === tagName.toLowerCase());
}

export function directElements(node) {
  return node.children.filter((child) => child.type === "element");
}

export function attribute(node, name) {
  const value = node.attributes.get(name.toLowerCase());
  return typeof value === "string" ? value : null;
}

export function hasAttribute(node, name) {
  return node.attributes.has(name.toLowerCase());
}

export function classTokens(node) {
  return (attribute(node, "class") ?? "").split(/\s+/).filter(Boolean);
}

export function hasClass(node, className) {
  return classTokens(node).includes(className);
}

function hidesSemantics(node) {
  return hasAttribute(node, "hidden")
    || hasAttribute(node, "inert")
    || attribute(node, "aria-hidden")?.trim().toLowerCase() === "true"
    || (node.namespace === "html" && node.tagName === "template");
}

export function isActive(node) {
  let current = node;
  while (current?.type === "element") {
    if (hidesSemantics(current)) return false;
    current = current.parent;
  }
  return true;
}

export function isDescendantOf(node, ancestor) {
  for (let current = node.parent; current !== null; current = current.parent) {
    if (current === ancestor) return true;
  }
  return false;
}

export function directText(node, { requireActive = true } = {}) {
  return (!requireActive || isActive(node)) && node.children.length === 1 && node.children[0].type === "text"
    ? decodeHtmlReferences(node.children[0].value)
    : null;
}

export function semanticText(node) {
  if (node.type === "element") {
    if (!isActive(node)
      || (node.namespace === "html" && (TEXT_ONLY_ELEMENTS.has(node.tagName) || node.tagName === "plaintext"))) return "";
  }
  return node.children.map((child) => (
    child.type === "text" ? decodeHtmlReferences(child.value) : semanticText(child)
  )).join("").replace(/\s+/g, " ").trim();
}

export function hasOnlyWhitespaceTextChildren(node) {
  return node.children.every((child) => child.type === "element" || child.value.trim() === "");
}

export function sameNodes(left, right) {
  return left.length === right.length && left.every((node, index) => node === right[index]);
}

export function activeDocumentScope(tree) {
  const rootElements = directElements(tree);
  const htmlElements = elementsByTag(tree, "html");
  if (rootElements.length !== 1
    || rootElements[0].tagName !== "html"
    || htmlElements.length !== 1
    || rootElements[0] !== htmlElements[0]
    || !hasOnlyWhitespaceTextChildren(tree)) fail("document must contain one active top-level html element");
  const html = rootElements[0];
  const htmlChildren = directElements(html);
  const heads = elementsByTag(tree, "head");
  const bodies = elementsByTag(tree, "body");
  if (htmlChildren.length !== 2
    || htmlChildren[0].tagName !== "head"
    || htmlChildren[1].tagName !== "body"
    || heads.length !== 1
    || bodies.length !== 1
    || heads[0] !== htmlChildren[0]
    || bodies[0] !== htmlChildren[1]
    || !hasOnlyWhitespaceTextChildren(html)
    || !isActive(html)
    || !isActive(htmlChildren[1])) fail("document must contain one ordered active head and body");
  return { html, head: htmlChildren[0], body: htmlChildren[1] };
}
