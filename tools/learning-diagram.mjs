import { applicationParents, applicationOwnership } from "./application-hierarchy.mjs";
import { systemFocusApplications } from "./system-focus.mjs";

const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const localized = (locale, en, tr) => locale === "tr" ? tr : en;

// Geometry follows the approved eight-stage reference. A family is an ownership
// boundary; inter-family arrows attach to its exterior, never through a child.
const POSITIONS = {
  aia: [570, 27, 176, 58], gpu: [310, 102, 258, 54],
  pol: [310, 164, 131, 49], gex: [450, 164, 118, 49],
  usl: [727, 103, 200, 59], adp: [967, 104, 178, 58],
  llm: [530, 258, 210, 58], tfl: [778, 258, 177, 58],
  hns: [374, 366, 692, 53], arl: [374, 440, 159, 68],
  dpl: [541, 440, 172, 68], cul: [721, 440, 157, 68], aos: [886, 440, 180, 68],
  ctx: [293, 557, 206, 46], mem: [295, 613, 202, 49],
  sec: [550, 587, 180, 60], evl: [827, 587, 194, 60],
  lcl: [319, 707, 203, 57], dcl: [576, 707, 212, 58], cld: [849, 707, 222, 57],
  wfm: [347, 821, 264, 47], wml: [349, 876, 260, 50],
  swi: [766, 821, 293, 47], ant: [767, 876, 144, 50], bee: [919, 876, 140, 50],
  itl: [512, 971, 335, 47], pdt: [512, 1026, 163, 64], dtr: [684, 1026, 163, 64],
  eng: [572, 1126, 216, 57], hex: [846, 1126, 179, 57],
};
const FRAMES = {
  gpu: [300, 92, 279, 130], usl: [716, 92, 440, 82],
  llm: [519, 247, 447, 79], hns: [364, 356, 712, 164],
  ctx: [282, 547, 228, 123], wfm: [335, 813, 288, 122],
  swi: [754, 813, 316, 122], itl: [502, 961, 355, 138],
};
const ROUTES = [
  ["aia-to-gpu", "M 570 69 H 418 V 102"],
  ["aia-to-usl", "M 746 69 H 827 V 103"],
  ["aia-to-llm", "M 645 85 V 258"],
  ["gpu-to-llm", "M 558 222 V 258"],
  ["usl-to-llm", "M 826 174 V 224 H 714 V 258"],
  ["usl-to-adp", "M 927 133 H 967", "child"],
  ["llm-to-tfl", "M 740 287 H 778", "child"],
  ["llm-to-hns", "M 641 326 V 366"],
  ["hns-to-arl", "M 453.5 419 V 440", "child"],
  ["hns-to-dpl", "M 627 419 V 440", "child"],
  ["hns-to-cul", "M 799.5 419 V 440", "child"],
  ["hns-to-aos", "M 976 419 V 440", "child"],
  ["hns-to-ctx", "M 408 520 V 557"],
  ["hns-to-sec", "M 629 520 V 587"],
  ["hns-to-evl", "M 923 520 V 587"],
  ["ctx-to-sec", "M 510 617 H 550"],
  ["sec-to-evl", "M 730 617 H 827", "decision", true],
  ["assurance-to-lcl", "M 416 680 V 707", "decision"],
  ["assurance-to-dcl", "M 683 680 V 707", "decision"],
  ["assurance-to-cld", "M 962 680 V 707", "decision"],
  ["lcl-to-dcl", "M 522 735 H 576", "child", true],
  ["cld-to-dcl", "M 849 735 H 788", "child", true],
  ["deployment-to-wfm", "M 683 784 H 466 V 821", "horizon"],
  ["deployment-to-swi", "M 683 784 H 922 V 821", "horizon"],
  ["wfm-to-itl", "M 445 935 V 994 H 512", "horizon"],
  ["swi-to-itl", "M 920 935 V 994 H 847", "horizon"],
  ["itl-to-eng", "M 680 1099 V 1126", "horizon"],
  ["eng-to-hex", "M 788 1154 H 846", "child"],
];
const CONNECTORS = [
  ["assurance-bus", "M 416 680 H 962"],
  ["sec-to-deployment", "M 638 647 V 680"],
  ["evl-to-deployment", "M 922 647 V 680"],
  ["dcl-to-stage-06", "M 683 765 V 784"],
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
  const families = Object.entries(FRAMES).filter(([code]) => nodes.some(({ app }) => app.code === code)).map(([code, [x, y, width, height]]) => ({ code, x, y, width, height }));
  const edges = ROUTES.map(([id, path, kind = "primary", bidirectional = false]) => ({ id, path, kind, bidirectional }));
  const connectors = CONNECTORS.map(([id, path]) => ({ id, path }));
  const junctions = [{ x: 416, y: 680 }, { x: 638, y: 680 }, { x: 683, y: 680 }, { x: 922, y: 680 }, { x: 962, y: 680 }, { x: 683, y: 784 }];
  return { nodes, families, edges, connectors, junctions };
}

const STAGES = [
  [22, 230, "FOUNDATION", "TEMEL", "Ecosystem, compute, runtime and adaptation foundations; explore programming foundations in POL and experiment with GEX, TFL and ADP.", "Ekosistem, hesaplama, çalışma ortamı ve uyarlama temelleri; POL ile programlamayı keşfet, GEX, TFL ve ADP ile deneyler yap."],
  [230, 345, "RUNTIME", "ÇALIŞTIRMA", "Model runtime and serving layer; support multiple providers and hardware backends.", "Model çalıştırma ve sunum katmanı; farklı sağlayıcıları ve donanım altyapılarını keşfet."],
  [345, 534, "AGENT SYSTEM", "AJAN SİSTEMİ", "Agents reason, use context, tools and computer environments; turn research into open-source runtimes and reusable components.", "Ajanlar akıl yürütür, bağlamı, araçları ve bilgisayar ortamlarını kullanır; araştırma açık kaynaklı çalışma ortamlarına ve yeniden kullanılabilir bileşenlere dönüşür."],
  [534, 680, "ASSURANCE", "GÜVENCE", "Security and evaluation contracts for bounded, reviewable behavior.", "Sınırlı ve incelenebilir davranış için güvenlik ve değerlendirme sözleşmeleri."],
  [680, 804, "DEPLOYMENT", "DAĞITIM", "Local and cloud deployment options; test workload, memory, privacy and cost assumptions.", "Yerel ve bulut dağıtım seçenekleri; iş yükü, bellek, gizlilik ve maliyet varsayımlarını sına."],
  [804, 948, "PHYSICAL AI", "FİZİKSEL AI", "World models and swarm intelligence; connect to industrial twins and humanoid systems.", "Dünya modelleri ve sürü zekâsı; endüstriyel ikizlerle ve insansı robot sistemleriyle bağlantı kur."],
  [948, 1110, "INDUSTRIAL TWIN", "ENDÜSTRİYEL İKİZ", "Digital twins and digital triplets for industrial systems and real-world research.", "Endüstriyel sistemler ve gerçek dünya araştırmaları için dijital ikizler ve dijital üçüzler."],
  [1110, 1205, "EMBODIED AI", "BEDENLENMİŞ AI", "Humanoid and embodied intelligence research.", "İnsansı robotlar ve bedenlenmiş zekâ araştırmaları."],
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
    "Eight stages connect foundations, runtime, agent systems, assurance, deployment, physical AI, industrial twins and embodied AI. Frames group GPU with POL and GEX; USL with ADP; LLM with TFL; HNS with ARL, DPL, CUL and AOS; CTX with MEM; WFM with WML; SWI with ANT and BEE; and ITL with PDT and DTR. SEC and EVL exchange feedback. LCL and CLD connect bidirectionally through their shared laboratory DCL. ENG leads to HEX. Arrows describe learning relationships, not runtime integrations.",
    "Sekiz aşama temelleri, çalıştırmayı, ajan sistemlerini, güvenceyi, dağıtımı, fiziksel AI'ı, endüstriyel ikizleri ve bedenlenmiş AI'ı bağlar. Çerçeveler GPU ile POL ve GEX'i; USL ile ADP'yi; LLM ile TFL'yi; HNS ile ARL, DPL, CUL ve AOS'u; CTX ile MEM'i; WFM ile WML'yi; SWI ile ANT ve BEE'yi; ITL ile PDT ve DTR'yi gruplar. SEC ve EVL karşılıklı geri bildirim sağlar. LCL ve CLD, ortak laboratuvarları DCL üzerinden çift yönlü bağlanır. ENG, HEX'e bağlanır. Oklar öğrenme ilişkilerini gösterir; çalışma zamanı entegrasyonu değildir.");
  const renderNode = ({ app, x, y, width, height, cx, role }) => {
    const isChild = applicationParents(app).length > 0;
    const parentLabel = isChild ? `${applicationOwnership(app, locale)}. ` : "";
    const tag = app.address ? "a" : "g";
    const link = app.address ? ` href="${escape(app.address)}" target="_blank" rel="noreferrer"` : ' role="group"';
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
    '        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1224 1285" role="group" aria-labelledby="ld-title" aria-describedby="ld-desc" class="ld-svg">',
    `          <title id="ld-title">${localized(locale, "Connected applications and their sub-applications", "Bağlı üst uygulamalar ve alt uygulamaları")}</title>`,
    `          <desc id="ld-desc">${escape(description)}</desc>`,
    '          <defs><marker id="ld-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9 z" fill="#b7f45d"/></marker></defs>',
    '          <g class="ld-stage-index">',
    '            <path class="ld-stage-rule" d="M 258 22 V 1205 M 30 1205 H 1192"/>',
    ...STAGES.flatMap(([top, bottom, en, tr, enCopy, trCopy], index) => {
      const copyLines = wrap(localized(locale, enCopy, trCopy), 29);
      const lineHeight = Math.min(19, (bottom - top - 70) / Math.max(1, copyLines.length - 1));
      return [
      `            <path class="ld-stage-rule" d="M 30 ${top} H 1192"/>`,
      `            <text x="33" y="${top + 33}" class="ld-stage-title"><tspan class="ld-stage-number">${String(index + 1).padStart(2, "0")}</tspan><tspan dx="12">· ${escape(localized(locale, en, tr))}</tspan></text>`,
      `            <text x="33" y="${top + 59}" class="ld-stage-copy">${copyLines.map((line, index) => `<tspan x="33" dy="${index ? lineHeight : 0}">${escape(line)}</tspan>`).join("")}</text>`,
    ]; }),
    '          </g>',
    '          <g class="ld-families" aria-hidden="true">',
    ...families.map(({ code, x, y, width, height }) => `            <g data-learning-family="${code}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12"/></g>`),
    '          </g>',
    '          <g class="ld-links" aria-hidden="true">',
    ...connectors.map(({ id, path }) => `            <path data-learning-connector="${id}" d="${path}"/>`),
    ...edges.map(({ id, path, kind, bidirectional }) => `            <path data-learning-edge="${id}" class="ld-edge-${kind}" d="${path}"${bidirectional ? ' marker-start="url(#ld-arrow)"' : ""} marker-end="url(#ld-arrow)"/>`),
    ...junctions.filter(({x}) => ![416, 962].includes(x)).map(({x,y}) => `            <circle class="ld-junction" cx="${x}" cy="${y}" r="2.2"/>`),
    '          </g>',
    '          <g class="ld-nodes">', ...nodes.map(renderNode), '          </g>',
    '          <g class="ld-legend" aria-hidden="true">',
    '            <path d="M 33 1240 H 58" marker-end="url(#ld-arrow)"/>',
    `            <text x="68" y="1244">${localized(locale, "Learning flow", "Öğrenme akışı")}</text>`,
    '            <rect x="240" y="1231" width="28" height="18" rx="4"/>',
    `            <text x="278" y="1244">${localized(locale, "Application family", "Uygulama ailesi")}</text>`,
    '          </g>',
    '          <text x="1192" y="1240" class="ld-brand">ASERDARGUN.COM</text>',
    '          <text x="1192" y="1258" class="ld-brand-subtitle">AI Learning System</text>',
    '        </svg>', '        </div>',
    `        <figcaption>${localized(locale, "Frames group applications with their sub-applications. Double-headed arrows show reciprocal learning relationships. DCL is the shared laboratory of CLD and LCL; ENG connects to HEX. These paths describe learning relationships, not runtime integrations.", "Dış çerçeveler üst uygulamaları alt uygulamalarıyla gruplar. Çift yönlü oklar karşılıklı öğrenme ilişkilerini gösterir. DCL, CLD ve LCL’nin ortak laboratuvarıdır; ENG, HEX’e bağlanır. Bu yollar öğrenme ilişkileridir; çalışma zamanı entegrasyonu değildir.")}</figcaption>`,
    '      </figure>',
  ].join("\n");
}
