import { applicationUrl } from "./application-links.mjs";
import { applicationParents, applicationOwnership } from "./application-hierarchy.mjs";
import { systemFocusApplications } from "./system-focus.mjs";

const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const localized = (locale, en, tr) => locale === "tr" ? tr : en;

// Geometry follows the approved nine-stage reference. A family is an ownership
// boundary; inter-family arrows attach to its exterior. Arrows between framed
// applications meet frame midpoints, never box edges, so a frame is the
// attachment surface as well as a boundary.
const POSITIONS = {
  // AIA sits on the runtime column axis (739), so its bottom midpoint is also the
  // kernel frame's top midpoint and the architect arrow runs straight down
  aia: [557, 24, 364, 62],
  // foundation lane: serving on the left, kernels in the middle, vision on the right
  llm: [310, 210, 258, 54], tfl: [312, 272, 254, 49],
  gpu: [610, 210, 258, 54], pol: [610, 272, 131, 49], gex: [750, 272, 118, 49],
  // vision sits on the kernel frame's mid-height (265), so the arrow GPU hands
  // it is one straight horizontal between two frame midpoints
  vis: [919, 238, 240, 54],
  usl: [610, 366, 258, 54], adp: [612, 428, 254, 49],
  // one column from HNS down: every x below is the runtime column (739) plus an
  // inset, so the adaptation-to-harness arrow can run straight down
  hns: [393, 534, 692, 53],
  arl: [393, 598, 132, 68], dpl: [533, 598, 132, 68], cul: [673, 598, 132, 68], agr: [813, 598, 132, 68], aos: [953, 598, 132, 68],
  ctx: [636, 725, 206, 46], mem: [638, 781, 202, 49],
  sec: [383, 746.5, 180, 60], evl: [908, 746.5, 194, 60],
  lcl: [511, 875, 222, 54], dcl: [633, 937, 212, 49], cld: [745, 875, 222, 54],
  wfm: [357, 1049, 264, 47], wml: [359, 1104, 260, 50],
  swi: [843, 1049, 293, 47], ant: [844, 1104, 144, 50], bee: [996, 1104, 140, 50],
  itl: [571.5, 1199, 335, 47], pdt: [571.5, 1254, 163, 64], dtr: [743.5, 1254, 163, 64],
  eng: [610, 1358, 258, 54], hex: [612, 1420, 254, 49],
};
// A frame is centred on the content it owns: LLM+TFL is inset 10 on both sides,
// so the frame axis matches the LLM box axis at 439. The runtime frames are 278
// wide so their axis matches the runtime column at 739, and the harness, context
// and twin frames share it. VIS holds a frame of its own: it has no
// sub-application, but all three of its arrows meet a frame midpoint.
const FRAMES = {
  llm: [300, 200, 278, 130], gpu: [600, 200, 278, 130], vis: [909, 228, 260, 74], usl: [600, 356, 278, 130],
  hns: [383, 524, 712, 154], ctx: [625, 715, 228, 123], deployment: [501, 865, 476, 130],
  wfm: [345, 1041, 288, 122], swi: [831, 1041, 316, 122], itl: [561.5, 1189, 355, 138],
  eng: [599.5, 1348, 279, 133],
};
const ROUTES = [
  // three arrows leave the architect, each on a frame midpoint: the serving
  // frame's top middle from the left, the kernel frame's top middle from the
  // bottom, the vision frame's top middle from the right
  ["aia-to-llm", "M 557 55 H 439 V 200"],
  ["aia-to-gpu", "M 739 86 V 200"],
  ["aia-to-vis", "M 921 55 H 1039 V 228"],
  ["gpu-to-llm", "M 600 265 H 578"],
  // kernels hand the vision frame their own lane: one straight horizontal
  // between the two frames' mid-height
  ["gpu-to-vis", "M 878 265 H 909"],
  // the runtime lane is fed from the left, from the right and from the top centre
  ["llm-to-usl", "M 439 330 V 421 H 600"],
  ["gpu-to-usl", "M 739 330 V 356"],
  ["vis-to-usl", "M 1039 302 V 421 H 878"],
  // one straight column: adaptation frame, harness frame, assurance, deployment
  ["usl-to-hns", "M 739 486 V 524"],
  ["hns-to-ctx", "M 739 678 V 715"],
  ["hns-to-sec", "M 473 678 V 746.5"],
  ["hns-to-evl", "M 1005 678 V 746.5"],
  ["ctx-to-sec", "M 625 776.5 H 563", "decision", true],
  ["ctx-to-evl", "M 853 776.5 H 908", "decision", true],
  ["ctx-to-deployment", "M 739 838 V 865", "decision"],
  ["deployment-to-wfm", "M 501 930 H 489 V 1041", "horizon"],
  ["deployment-to-swi", "M 977 930 H 989 V 1041", "horizon"],
  ["wfm-to-itl", "M 489 1163 V 1258 H 561.5", "horizon"],
  ["swi-to-itl", "M 989 1163 V 1258 H 916.5", "horizon"],
  ["itl-to-eng", "M 739 1327 V 1348", "horizon"],
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
    "Nine stages: the architect lane sits above eight topical lanes. The architect derives the foundation below it with frontier models. Three arrows leave AIA, each from a midpoint: the left midpoint drops into the serving frame's top middle, the bottom midpoint runs straight down the runtime column into the kernel frame's top middle, and the right midpoint enters the vision frame's top middle. In the foundation lane LLM, GPU and VIS stand side by side: the serving atlas on the left, the kernel atlas in the middle and the vision knowledge bank on the right, placed on the kernel frame's mid-height so GPU feeds VIS with one straight horizontal between the two frames' midpoints. The runtime lane holds USL, and it is fed from three directions: from the serving frame's bottom middle on the left, from the kernel frame straight down the top centre and from the vision frame, which drops out of its own bottom middle and turns in at the adaptation frame's right middle. HNS and everything below it share one vertical column with ADP, so the adaptation-to-harness arrow runs straight down from the adaptation frame's bottom middle to the harness frame's top middle. Frames group LLM with TFL; GPU with POL and GEX; USL with ADP; HNS with ARL, DPL, CUL, AOS and AGR; CTX with MEM; WFM with WML; SWI with ANT and BEE; ITL with PDT and DTR; ENG with HEX. VIS keeps a frame of its own: it has no sub-application, but all three of its arrows meet a frame midpoint. The CTX/MEM group exchanges feedback with SEC and EVL. LCL and CLD share one frame, with their joint laboratory DCL below them. Arrows describe learning relationships, not runtime integrations.",
    "Dokuz aşama: mimar şeridi sekiz konu şeridinin üzerinde durur. Mimar, aşağıdaki temeli sınır modelleriyle türetir. AIA’dan üç ok çıkar ve her biri bir orta noktadan ayrılır: sol orta noktası sunum çerçevesinin üst ortasına iner, alt orta noktası çalıştırma sütunu boyunca dik aşağı inip çekirdek çerçevesinin üst ortasına ulaşır, sağ orta noktası görü çerçevesinin üst ortasına girer. Temel şeridinde LLM, GPU ve VIS yan yana durur: solda sunum atlası, ortada çekirdek atlası, sağda görü bilgi bankası; VIS çekirdek çerçevesinin orta yüksekliğine oturur, böylece GPU görüyü iki çerçevenin orta noktaları arasında tek düz yatay okla besler. Çalıştırma şeridinde USL vardır ve üç yönden beslenir: soldan sunum çerçevesinin alt ortasından, üst ortadan çekirdek çerçevesinden dik aşağı ve sağdan görü çerçevesinden; görü çerçevesi kendi alt ortasından çıkıp uyarlama çerçevesinin sağ ortasına döner. HNS ve altındaki her şey ADP ile aynı dikey sütunda durur, böylece uyarlamadan ajan sistemine ok uyarlama çerçevesinin alt ortasından ajan sistemi çerçevesinin üst ortasına dik aşağı iner. Çerçeveler LLM ile TFL’yi; GPU ile POL ve GEX’i; USL ile ADP’yi; HNS ile ARL, DPL, CUL, AOS ve AGR’yi; CTX ile MEM’i; WFM ile WML’yi; SWI ile ANT ve BEE’yi; ITL ile PDT ve DTR’yi; ENG ile HEX’i gruplar. VIS kendi çerçevesini korur: alt uygulaması yoktur ama üç oku da bir çerçeve orta noktasında buluşur. CTX/MEM grubu, SEC ve EVL ile karşılıklı geri bildirim paylaşır. LCL ve CLD aynı dış çerçevede, ortak laboratuvarları DCL ise ikisinin altında yer alır. Oklar öğrenme ilişkilerini gösterir; çalışma zamanı entegrasyonu değildir.");
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
