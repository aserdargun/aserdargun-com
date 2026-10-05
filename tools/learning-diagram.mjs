import { applicationUrl } from "./application-links.mjs";
import { applicationParents, applicationOwnership } from "./application-hierarchy.mjs";
import { systemFocusApplications } from "./system-focus.mjs";

const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const localized = (locale, en, tr) => locale === "tr" ? tr : en;

// Geometry follows the approved nine-stage reference. A family is an ownership
// boundary; inter-family arrows attach to its exterior, never through a child.
const POSITIONS = {
  aia: [543, 24, 364, 62],
  // foundation lane: serving on the left, kernels in the middle, vision on the right
  llm: [310, 210, 258, 54], tfl: [312, 272, 254, 49],
  gpu: [610, 210, 258, 54], pol: [610, 272, 131, 49], gex: [750, 272, 118, 49],
  vis: [919, 210, 240, 54],
  usl: [610, 366, 258, 54], adp: [612, 428, 254, 49],
  hns: [312, 534, 692, 53],
  arl: [312, 598, 132, 68], dpl: [452, 598, 132, 68], cul: [592, 598, 132, 68],
  agr: [732, 598, 132, 68], aos: [872, 598, 132, 68],
  ctx: [555, 725, 206, 46], mem: [557, 781, 202, 49],
  sec: [302, 746.5, 180, 60], evl: [827, 746.5, 194, 60],
  lcl: [430, 875, 222, 54], dcl: [552, 937, 212, 49], cld: [664, 875, 222, 54],
  wfm: [276, 1049, 264, 47], wml: [278, 1104, 260, 50],
  swi: [762, 1049, 293, 47], ant: [763, 1104, 144, 50], bee: [915, 1104, 140, 50],
  itl: [490.5, 1199, 335, 47], pdt: [490.5, 1254, 163, 64], dtr: [662.5, 1254, 163, 64],
  eng: [529, 1358, 258, 54], hex: [531, 1420, 254, 49],
};
const FRAMES = {
  llm: [290, 200, 279, 130], gpu: [600, 200, 279, 130], usl: [600, 356, 279, 130],
  hns: [302, 524, 712, 154], ctx: [544, 715, 228, 123], deployment: [420, 865, 476, 130],
  wfm: [264, 1041, 288, 122], swi: [750, 1041, 316, 122], itl: [480.5, 1189, 355, 138],
  eng: [518.5, 1348, 279, 133],
};
const ROUTES = [
  ["aia-to-llm", "M 600 86 V 150 H 429.5 V 200"],
  ["aia-to-gpu", "M 739.5 86 V 200"],
  ["aia-to-vis", "M 907 55 H 1039 V 210"],
  ["gpu-to-llm", "M 600 265 H 569"],
  // the runtime lane is fed from the left, from the right and from the top centre
  ["llm-to-usl", "M 429.5 330 V 343 H 610 V 393"],
  ["gpu-to-usl", "M 739.5 330 V 346.5 H 739 V 366"],
  ["vis-to-usl", "M 1039 264 V 343 H 868 V 393"],
  ["usl-to-hns", "M 739.5 486 V 505 H 658 V 524"],
  ["hns-to-ctx", "M 658 678 V 715"],
  ["hns-to-sec", "M 392 678 V 746.5"],
  ["hns-to-evl", "M 924 678 V 746.5"],
  ["ctx-to-sec", "M 544 776.5 H 482", "decision", true],
  ["ctx-to-evl", "M 772 776.5 H 827", "decision", true],
  ["ctx-to-deployment", "M 658 838 V 865", "decision"],
  ["deployment-to-wfm", "M 420 930 H 408 V 1041", "horizon"],
  ["deployment-to-swi", "M 896 930 H 908 V 1041", "horizon"],
  ["wfm-to-itl", "M 408 1163 V 1258 H 480.5", "horizon"],
  ["swi-to-itl", "M 908 1163 V 1258 H 835.5", "horizon"],
  ["itl-to-eng", "M 658 1327 V 1348", "horizon"],
];
const CONNECTORS = [];
const ROLES = { pol: "learning-tool", aia: "architect", gpu: "foundation", llm: "hub", usl: "adapt", hns: "harness", vis: "atlas", ctx: "context", sec: "security", evl: "evaluation", lcl: "deployment", cld: "deployment", dcl: "decision-lab", agr: "decision-lab", wfm: "world", swi: "collective", ant: "colony-lab", bee: "colony-lab", itl: "twin", eng: "horizon" };

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
  const junctions = [];
  return { nodes, families, edges, connectors, junctions };
}

const STAGES = [
  [22, 118, "ARCHITECT", "MİMAR", "The architect lane: we derive and build everything below it with frontier models.", "Mimar şeridi: aşağıdakilerin tamamını sınır modelleriyle türetip geliştiriyoruz."],
  [130, 338, "FOUNDATION", "TEMEL", "Kernels, model serving and machine vision: the compute, the engine and the way machines see.", "Çekirdekler, model sunumu ve makine görüşü: hesaplama, motor ve makinelerin gördüğü."],
  [338, 513, "RUNTIME", "ÇALIŞTIRMA", "Model adaptation runs here: training and fine-tuning on the foundation below.", "Model uyarlaması burada çalışır: temelin üzerinde eğitim ve ince ayar."],
  [513, 702, "AGENT SYSTEM", "AJAN SİSTEMİ", "Agents reason, use context, tools and computer environments; turn research into open-source runtimes and reusable components.", "Ajanlar akıl yürütür, bağlamı, araçları ve bilgisayar ortamlarını kullanır; araştırma açık kaynaklı çalışma ortamlarına ve yeniden kullanılabilir bileşenlere dönüşür."],
  [702, 848, "CONTEXT & ASSURANCE", "BAĞLAM VE GÜVENCE", "Design context, memory, security and evaluation together for bounded, reviewable behavior.", "Sınırlı ve incelenebilir davranış için bağlam, bellek, güvenlik ve değerlendirmeyi birlikte tasarla."],
  [848, 1032, "DEPLOYMENT", "DAĞITIM", "Local and cloud deployment options; test workload, memory, privacy and cost assumptions.", "Yerel ve bulut dağıtım seçenekleri; iş yükü, bellek, gizlilik ve maliyet varsayımlarını sına."],
  [1032, 1176, "PHYSICAL AI", "FİZİKSEL AI", "World models and swarm intelligence; connect to industrial twins and humanoid systems.", "Dünya modelleri ve sürü zekâsı; endüstriyel ikizlerle ve insansı robot sistemleriyle bağlantı kur."],
  [1176, 1338, "INDUSTRIAL TWIN", "ENDÜSTRİYEL İKİZ", "Digital twins and digital triplets for industrial systems and real-world research.", "Endüstriyel sistemler ve gerçek dünya araştırmaları için dijital ikizler ve dijital üçüzler."],
  [1338, 1493, "EMBODIED AI", "BEDENLENMİŞ AI", "Humanoid and embodied intelligence research.", "İnsansı robotlar ve bedenlenmiş zekâ araştırmaları."],
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
  vis: ["Vision knowledge bank", "Görü bilgi bankası"],
  aia: ["Architect", "Mimar"],
  dcl: ["Shared lab", "Ortak laboratuvar"],
};

export function renderLearningDiagram({ locale, data }) {
  const { nodes, families, edges, connectors, junctions } = learningDiagramLayout(data.applications);
  const description = localized(locale,
    "Nine stages: the architect lane sits above eight topical lanes. The architect derives the foundation below it with frontier models. In the foundation lane LLM, GPU and VIS stand side by side: the serving atlas on the left, the kernel atlas in the middle and the vision knowledge bank on the right. The runtime lane holds USL, and it is fed from three directions: from LLM on the left, from GPU at the top centre and from VIS on the right. Frames group LLM with TFL; GPU with POL and GEX; USL with ADP; HNS with ARL, DPL, CUL, AOS and AGR; CTX with MEM; WFM with WML; SWI with ANT and BEE; ITL with PDT and DTR; ENG with HEX. The CTX/MEM group exchanges feedback with SEC and EVL. LCL and CLD share one frame, with their joint laboratory DCL below them. VIS carries no frame because it has no sub-application. Arrows describe learning relationships, not runtime integrations.",
    "Dokuz aşama: mimar şeridi sekiz konu şeridinin üzerinde durur. Mimar, aşağıdaki temeli sınır modelleriyle türetir. Temel şeridinde LLM, GPU ve VIS yan yana durur: solda sunum atlası, ortada çekirdek atlası, sağda görü bilgi bankası. Çalıştırma şeridinde USL vardır ve üç yönden beslenir: soldan LLM'den, üst ortadan GPU'dan ve sağdan VIS'ten. Çerçeveler LLM ile TFL’yi; GPU ile POL ve GEX’i; USL ile ADP’yi; HNS ile ARL, DPL, CUL, AOS ve AGR’yi; CTX ile MEM’i; WFM ile WML’yi; SWI ile ANT ve BEE’yi; ITL ile PDT ve DTR’yi; ENG ile HEX’i gruplar. CTX/MEM grubu, SEC ve EVL ile karşılıklı geri bildirim paylaşır. LCL ve CLD aynı dış çerçevede, ortak laboratuvarları DCL ise ikisinin altında yer alır. VIS çerçevesizdir çünkü alt uygulaması yoktur. Oklar öğrenme ilişkilerini gösterir; çalışma zamanı entegrasyonu değildir.");
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
    '        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1224 1581" role="group" aria-labelledby="ld-title" aria-describedby="ld-desc" class="ld-svg">',
    `          <title id="ld-title">${localized(locale, "Connected applications and their sub-applications", "Bağlı üst uygulamalar ve alt uygulamaları")}</title>`,
    `          <desc id="ld-desc">${escape(description)}</desc>`,
    '          <defs><marker id="ld-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9 z" fill="#b7f45d"/></marker></defs>',
    '          <g class="ld-stage-index">',
    '            <path class="ld-stage-rule" d="M 258 22 V 1493 M 30 1493 H 1192"/>',
    ...STAGES.flatMap(([top, bottom, en, tr, enCopy, trCopy], index) => {
      const copyLines = wrap(localized(locale, enCopy, trCopy), 29);
      const lineHeight = Math.min(19, (bottom - top - 70) / Math.max(1, copyLines.length - 1));
      return [
      `            <path class="ld-stage-rule" d="M 30 ${top} H 1192"/>`,
      `            <text x="33" y="${top + 33}" class="ld-stage-title"${index === 4 ? ' style="font-size: 11px"' : ""}><tspan class="ld-stage-number">${String(index).padStart(2, "0")}</tspan><tspan dx="12">· ${escape(localized(locale, en, tr))}</tspan></text>`,
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
