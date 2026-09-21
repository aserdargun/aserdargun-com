import { applicationUrl } from "./application-links.mjs";
import { applicationParents, applicationOwnership } from "./application-hierarchy.mjs";
import { systemFocusApplications } from "./system-focus.mjs";

const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const localized = (locale, en, tr) => locale === "tr" ? tr : en;

// Geometry follows the approved eight-stage reference. A family is an ownership
// boundary; inter-family arrows attach to its exterior, never through a child.
const POSITIONS = {
  aia: [570, 27, 176, 58], gpu: [309, 102, 258, 54],
  pol: [309, 164, 131, 49], gex: [449, 164, 118, 49],
  usl: [749, 102, 258, 54], adp: [751, 164, 254, 49],
  llm: [529, 257, 258, 54], tfl: [531, 319, 254, 49],
  hns: [312, 426, 692, 53], arl: [312, 490, 159, 68],
  dpl: [479, 490, 172, 68], cul: [659, 490, 157, 68], aos: [824, 490, 180, 68],
  ctx: [555, 617, 206, 46], mem: [557, 673, 202, 49],
  sec: [302, 638.5, 180, 60], evl: [827, 638.5, 194, 60],
  lcl: [430, 767, 222, 54], dcl: [552, 829, 212, 49], cld: [664, 767, 222, 54],
  wfm: [306, 941, 264, 47], wml: [308, 996, 260, 50],
  swi: [732, 941, 293, 47], ant: [733, 996, 144, 50], bee: [885, 996, 140, 50],
  itl: [490.5, 1091, 335, 47], pdt: [490.5, 1146, 163, 64], dtr: [662.5, 1146, 163, 64],
  eng: [529, 1250, 258, 54], hex: [531, 1312, 254, 49],
};
const FRAMES = {
  gpu: [298.5, 92, 279, 130], usl: [738.5, 92, 279, 130],
  llm: [518.5, 247, 279, 130], hns: [302, 416, 712, 154],
  ctx: [544, 607, 228, 123], deployment: [420, 757, 476, 130], wfm: [294, 933, 288, 122],
  swi: [720, 933, 316, 122], itl: [480.5, 1081, 355, 138],
  eng: [518.5, 1240, 279, 130],
};
const ROUTES = [
  ["aia-to-gpu", "M 570 56 H 438 V 92"],
  ["aia-to-usl", "M 746 56 H 878 V 92"],
  ["aia-to-llm", "M 658 85 V 247"],
  ["gpu-to-llm", "M 438 222 V 312 H 518.5"],
  ["usl-to-llm", "M 878 222 V 312 H 797.5"],
  ["llm-to-hns", "M 658 377 V 416"],
  ["hns-to-ctx", "M 658 570 V 607"],
  ["hns-to-sec", "M 392 570 V 638.5"],
  ["hns-to-evl", "M 924 570 V 638.5"],
  ["ctx-to-sec", "M 544 668.5 H 482", "decision", true],
  ["ctx-to-evl", "M 772 668.5 H 827", "decision", true],
  ["ctx-to-deployment", "M 658 730 V 757", "decision"],
  ["deployment-to-wfm", "M 658 904 H 438 V 933", "horizon"],
  ["deployment-to-swi", "M 658 904 H 878 V 933", "horizon"],
  ["wfm-to-itl", "M 438 1055 V 1150 H 480.5", "horizon"],
  ["swi-to-itl", "M 878 1055 V 1150 H 835.5", "horizon"],
  ["itl-to-eng", "M 658 1219 V 1240", "horizon"],
];
const CONNECTORS = [
  ["deployment-to-stage-06", "M 658 887 V 904"],
];
const ROLES = { pol: "learning-tool", aia: "map", gpu: "foundation", llm: "hub", usl: "adapt", hns: "harness", ctx: "context", sec: "security", evl: "evaluation", lcl: "deployment", cld: "deployment", dcl: "decision-lab", wfm: "world", swi: "collective", ant: "colony-lab", bee: "colony-lab", itl: "twin", eng: "horizon" };

export function learningDiagramLayout(applications) {
  const diagramApplications = systemFocusApplications(applications);
  const nodes = diagramApplications.map((app) => {
    const position = POSITIONS[app.code];
    if (!position) throw new Error(`Add a learning-diagram position and routes for ${app.code}.`);
    const [x, y, width, height] = position;
    const role = ROLES[app.code] ?? "practice-lab";
    return { app, x, y, width, height, cx: x + width / 2, role };
  });
  nodes.sort((a, b) => Object.keys(POSITIONS).indexOf(a.app.code) - Object.keys(POSITIONS).indexOf(b.app.code));
  const families = Object.entries(FRAMES).map(([code, [x, y, width, height]]) => {
    const owners = code === "deployment" ? ["lcl", "cld"] : [code];
    const members = nodes.filter(({ app }) => owners.includes(app.code) || applicationParents(app).some((parent) => owners.includes(parent))).map(({ app }) => app.code);
    return { code, x, y, width, height, members };
  }).filter(({ members }) => members.length > 0);
  const edges = ROUTES.map(([id, path, kind = "primary", bidirectional = false]) => ({ id, path, kind, bidirectional }));
  const connectors = CONNECTORS.map(([id, path]) => ({ id, path }));
  const junctions = [{ x: 658, y: 904 }];
  return { nodes, families, edges, connectors, junctions };
}

const STAGES = [
  [22, 230, "FOUNDATION", "TEMEL", "Ecosystem, compute, runtime and adaptation foundations; explore programming foundations in POL and experiment with GEX, TFL and ADP.", "Ekosistem, hesaplama, çalışma ortamı ve uyarlama temelleri; POL ile programlamayı keşfet, GEX, TFL ve ADP ile deneyler yap."],
  [230, 405, "RUNTIME", "ÇALIŞTIRMA", "Model runtime and serving layer; support multiple providers and hardware backends.", "Model çalıştırma ve sunum katmanı; farklı sağlayıcıları ve donanım altyapılarını keşfet."],
  [405, 594, "AGENT SYSTEM", "AJAN SİSTEMİ", "Agents reason, use context, tools and computer environments; turn research into open-source runtimes and reusable components.", "Ajanlar akıl yürütür, bağlamı, araçları ve bilgisayar ortamlarını kullanır; araştırma açık kaynaklı çalışma ortamlarına ve yeniden kullanılabilir bileşenlere dönüşür."],
  [594, 740, "CONTEXT & ASSURANCE", "BAĞLAM VE GÜVENCE", "Design context, memory, security and evaluation together for bounded, reviewable behavior.", "Sınırlı ve incelenebilir davranış için bağlam, bellek, güvenlik ve değerlendirmeyi birlikte tasarla."],
  [740, 924, "DEPLOYMENT", "DAĞITIM", "Local and cloud deployment options; test workload, memory, privacy and cost assumptions.", "Yerel ve bulut dağıtım seçenekleri; iş yükü, bellek, gizlilik ve maliyet varsayımlarını sına."],
  [924, 1068, "PHYSICAL AI", "FİZİKSEL AI", "World models and swarm intelligence; connect to industrial twins and humanoid systems.", "Dünya modelleri ve sürü zekâsı; endüstriyel ikizlerle ve insansı robot sistemleriyle bağlantı kur."],
  [1068, 1230, "INDUSTRIAL TWIN", "ENDÜSTRİYEL İKİZ", "Digital twins and digital triplets for industrial systems and real-world research.", "Endüstriyel sistemler ve gerçek dünya araştırmaları için dijital ikizler ve dijital üçüzler."],
  [1230, 1385, "EMBODIED AI", "BEDENLENMİŞ AI", "Humanoid and embodied intelligence research.", "İnsansı robotlar ve bedenlenmiş zekâ araştırmaları."],
];
function wrap(text, limit) {
  const lines = [];
  for (const word of text.split(/\s+/)) {
    if (!lines.length || lines.at(-1).length + word.length + 1 > limit) lines.push(word);
    else lines[lines.length - 1] += ` ${word}`;
  }
  return lines;
}
const LABELS = {
  pol: ["Programming basics", "Programlama temeli"],
  ant: ["Ant colony", "Karınca kolonisi"],
  bee: ["Honey bee", "Bal arısı"],
  itl: ["Industrial twin lab", "Endüstriyel ikiz laboratuvarı"],
  wml: ["World model laboratory", "Dünya modeli laboratuvarı"],
  pdt: ["P-101 interactive digital twin", "P-101 etkileşimli dijital ikiz"],
  eng: ["Humanoid engineering", "İnsansı robot mühendisliği"],
  hex: ["Humanoid exploration", "İnsansı robot keşfi"],
  dcl: ["Shared lab", "Ortak laboratuvar"],
};

export function renderLearningDiagram({ locale, data }) {
  const { nodes, families, edges, connectors, junctions } = learningDiagramLayout(data.applications);
  const description = localized(locale,
    "Eight stages connect foundations, runtime, agent systems, assurance, deployment, physical AI, industrial twins and embodied AI. Frames group GPU with POL and GEX; USL with ADP; LLM with TFL; HNS with ARL, DPL, CUL and AOS; CTX with MEM; WFM with WML; SWI with ANT and BEE; and ITL with PDT and DTR. The CTX/MEM group exchanges feedback with SEC and EVL. LCL and CLD share one frame, with their joint laboratory DCL below them. ENG and its sub-application HEX share a frame, with HEX below ENG. Arrows describe learning relationships, not runtime integrations.",
    "Sekiz aşama temelleri, çalıştırmayı, ajan sistemlerini, güvenceyi, dağıtımı, fiziksel AI'ı, endüstriyel ikizleri ve bedenlenmiş AI'ı bağlar. Çerçeveler GPU ile POL ve GEX'i; USL ile ADP'yi; LLM ile TFL'yi; HNS ile ARL, DPL, CUL ve AOS'u; CTX ile MEM'i; WFM ile WML'yi; SWI ile ANT ve BEE'yi; ITL ile PDT ve DTR'yi gruplar. CTX/MEM grubu, SEC ve EVL ile karşılıklı geri bildirim paylaşır. LCL ve CLD aynı dış çerçevede, ortak laboratuvarları DCL ise ikisinin altında yer alır. ENG ve alt uygulaması HEX aynı çerçevede, HEX altta olacak şekilde yer alır. Oklar öğrenme ilişkilerini gösterir; çalışma zamanı entegrasyonu değildir.");
  const renderNode = ({ app, x, y, width, height, cx, role }) => {
    const isChild = applicationParents(app).length > 0;
    const parentLabel = isChild ? `${applicationOwnership(app, locale)}. ` : "";
    const tag = app.address ? "a" : "g";
    const link = app.address ? ` href="${escape(applicationUrl(app, locale))}" target="_blank" rel="noreferrer"` : ' role="group"';
    const label = LABELS[app.code] ? localized(locale, ...LABELS[app.code]) : app.diagramLabel?.[locale] ?? app.title[locale];
    const lines = wrap(label, Math.floor((width - 16) / 6));
    const subtitle = app.subtitle?.[locale];
    const lineHeight = 15;
    const codeSize = isChild ? 16 : 20;
    const contentHeight = codeSize + 19 + (lines.length - 1) * lineHeight + 3 + (subtitle ? 15 : 0);
    const codeY = y + (height - contentHeight) / 2 + codeSize;
    return `            <${tag}${link} class="ld-node ${isChild ? "ld-node-child" : "ld-node-parent"}${app.code === "aia" ? " ld-node-aia" : ""}" data-learning-app="${app.code}" data-learning-role="${role}"${role === "deployment" ? ' data-learning-plane="deployment"' : ""}${app.sharedParentApps ? ` data-learning-parents="${app.sharedParentApps.join(" ")}"` : ""}${app.parentApp ? ` data-learning-parent="${app.parentApp}"` : ""} aria-label="${escape(`${app.code.toUpperCase()} ${app.title[locale]}. ${parentLabel}${app.summary?.[locale] ?? label}${subtitle ? `. ${subtitle}` : ""}`)}">
              <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="7"/>
              <text x="${cx}" y="${codeY}" class="ld-code">${app.code.toUpperCase()}</text>
              <text x="${cx}" y="${codeY + 19}" class="ld-label">${lines.map((line, i) => `<tspan x="${cx}" dy="${i ? lineHeight : 0}">${escape(line)}</tspan>`).join("")}</text>${subtitle ? `\n              <text x="${cx}" y="${codeY + 19 + lines.length * lineHeight}" class="ld-subtitle">${escape(subtitle)}</text>` : ""}
            </${tag}>`;
  };
  return [
    '      <figure class="learning-diagram-wrap">',
    `        <p class="mobile-map-hint" id="diagram-scroll-hint">${localized(locale, "Pinch with two fingers to zoom. Drag to explore the enlarged map.", "İki parmağınla açıp kapatarak boyutu ayarla. Büyüttüğün haritada parmağınla gezin.")}</p>`,
    `        <div class="learning-diagram-viewport" tabindex="0" role="region" aria-label="${localized(locale, "Application connection map", "Uygulama bağlantı haritası")}">`,
    '        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1224 1465" role="group" aria-labelledby="ld-title" aria-describedby="ld-desc" class="ld-svg">',
    `          <title id="ld-title">${localized(locale, "Connected applications and their sub-applications", "Bağlı üst uygulamalar ve alt uygulamaları")}</title>`,
    `          <desc id="ld-desc">${escape(description)}</desc>`,
    '          <defs><marker id="ld-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9 z" fill="#b7f45d"/></marker></defs>',
    '          <g class="ld-stage-index">',
    '            <path class="ld-stage-rule" d="M 258 22 V 1385 M 30 1385 H 1192"/>',
    ...STAGES.flatMap(([top, bottom, en, tr, enCopy, trCopy], index) => {
      const copyLines = wrap(localized(locale, enCopy, trCopy), 29);
      const lineHeight = Math.min(19, (bottom - top - 70) / Math.max(1, copyLines.length - 1));
      return [
      `            <path class="ld-stage-rule" d="M 30 ${top} H 1192"/>`,
      `            <text x="33" y="${top + 33}" class="ld-stage-title"${index === 3 ? ' style="font-size: 11px"' : ""}><tspan class="ld-stage-number">${String(index + 1).padStart(2, "0")}</tspan><tspan dx="12">· ${escape(localized(locale, en, tr))}</tspan></text>`,
      `            <text x="33" y="${top + 59}" class="ld-stage-copy">${copyLines.map((line, index) => `<tspan x="33" dy="${index ? lineHeight : 0}">${escape(line)}</tspan>`).join("")}</text>`,
    ]; }),
    '          </g>',
    '          <g class="ld-families" aria-hidden="true">',
    ...families.map(({ code, x, y, width, height }) => `            <g data-learning-family="${code}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12"/></g>`),
    '          </g>',
    '          <g class="ld-links" aria-hidden="true">',
    ...connectors.map(({ id, path }) => `            <path data-learning-connector="${id}" d="${path}"/>`),
    ...edges.map(({ id, path, kind, bidirectional }) => `            <path data-learning-edge="${id}" class="ld-edge-${kind}" d="${path}"${bidirectional ? ' marker-start="url(#ld-arrow)"' : ""} marker-end="url(#ld-arrow)"/>`),
    ...junctions.map(({x,y}) => `            <circle class="ld-junction" cx="${x}" cy="${y}" r="2.2"/>`),
    '          </g>',
    '          <g class="ld-nodes">', ...nodes.map(renderNode), '          </g>',
    '          <text x="1192" y="1420" class="ld-brand">ASERDARGUN.COM</text>',
    '          <text x="1192" y="1438" class="ld-brand-subtitle">AI Learning System</text>',
    '        </svg>', '        </div>',
    '      </figure>',
  ].join("\n");
}
