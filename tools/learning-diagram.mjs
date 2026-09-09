const escape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const localized = (locale, en, tr) => locale === "tr" ? tr : en;

// Coordinates are shared by both locales. Only top-level applications need a
// place in the learning flow; child nodes and ownership frames derive from data.
const PARENTS = {
  aia: { cx: 550, y: 30, width: 180, role: "map" },
  gpu: { cx: 300, y: 140, width: 180, role: "foundation" },
  llm: { cx: 550, y: 330, width: 190, role: "hub", side: true },
  usl: { cx: 800, y: 140, width: 180, role: "adapt" },
  hns: { cx: 550, y: 440, width: 220, role: "harness" },
  ctx: { cx: 300, y: 560, width: 180, role: "context" },
  sec: { cx: 550, y: 560, width: 180, role: "security" },
  evl: { cx: 800, y: 560, width: 180, role: "evaluation" },
  lcl: { cx: 375, y: 710, width: 190, role: "deployment" },
  cld: { cx: 725, y: 710, width: 190, role: "deployment" },
  wfm: { cx: 300, y: 880, width: 210, role: "world" },
  swi: { cx: 800, y: 880, width: 230, role: "collective" },
  itl: { cx: 550, y: 1120, width: 220, role: "twin", side: true },
  eng: { cx: 550, y: 1270, width: 220, role: "horizon", side: true },
};

const ROUTES = [
  ["aia-to-gpu", "M 510 94 V 112 H 300 V 140"],
  ["aia-to-llm", "M 550 94 V 330"],
  ["aia-to-usl", "M 590 94 V 112 H 800 V 140"],
  ["gpu-to-llm", "M 390 172 H 470 V 304 H 510 V 330"],
  ["usl-to-llm", "M 800 204 V 304 H 590 V 330"],
  ["llm-to-hns", "M 550 394 V 440"],
  ["hns-to-ctx", "M 500 504 V 532 H 300 V 560"],
  ["hns-to-sec", "M 550 504 V 560"],
  ["hns-to-evl", "M 600 504 V 532 H 800 V 560"],
  ["ctx-to-llm", "M 210 592 H 170 V 362 H 455", "context"],
  ["sec-to-lcl", "M 510 624 V 652 H 375 V 710", "decision"],
  ["sec-to-cld", "M 590 624 V 652 H 725 V 710", "decision"],
  ["evl-to-cld", "M 820 624 V 675 H 765 V 710", "context"],
  ["ctx-to-lcl", "M 280 624 V 675 H 335 V 710", "context"],
  ["deployment-to-wfm", "M 550 846 H 300 V 880", "horizon"],
  ["deployment-to-swi", "M 550 846 H 800 V 880", "horizon"],
  ["wfm-to-itl", "M 405 912 H 470 V 1090 H 510 V 1120", "horizon"],
  ["swi-to-itl", "M 685 912 H 610 V 1090 H 590 V 1120", "horizon"],
  ["itl-to-eng", "M 550 1184 V 1270", "horizon"],
];

export function learningDiagramLayout(applications) {
  const nodes = [];
  const families = [];
  const edges = ROUTES.map(([id, path, kind = "primary"]) => ({ id, path, kind }));
  const parents = applications.filter((app) => !app.parentApp);
  for (const app of parents) {
    if (!PARENTS[app.code]) throw new Error(`Add a learning-diagram position and routes for ${app.code}.`);
  }
  for (const [code, layout] of Object.entries(PARENTS)) {
    const app = parents.find((candidate) => candidate.code === code);
    if (!app) continue;
    const parent = { ...layout, x: layout.cx - layout.width / 2, height: 64, app };
    nodes.push(parent);
    const children = applications.filter((child) => child.parentApp === code);
    const childNodes = children.map((child, index) => {
      const width = 150;
      const cx = layout.side ? 840 : layout.cx + (index - (children.length - 1) / 2) * 170;
      const y = layout.side ? layout.y + 7 + index * 72 : layout.y + 100;
      const node = { app: child, cx, x: cx - width / 2, y, width, height: 50, role: code === "swi" ? "colony-lab" : "practice-lab" };
      const sourceX = layout.side ? parent.x + parent.width : layout.cx + (index - (children.length - 1) / 2) * 70;
      const sourceY = layout.side ? parent.y + 32 + index * 8 : parent.y + parent.height;
      const path = layout.side
        ? `M ${sourceX} ${sourceY} H ${710 + index * 16} V ${y + 25} H ${node.x}`
        : `M ${sourceX} ${sourceY} V ${y - 18} H ${cx} V ${y}`;
      edges.push({ id: `${code}-to-${child.code}`, path, kind: "child" });
      return node;
    });
    if (childNodes.length) {
      const members = [parent, ...childNodes];
      const x = Math.min(...members.map((node) => node.x)) - 16;
      const y = parent.y - 20;
      families.push({ code, x, y, width: Math.max(...members.map((node) => node.x + node.width)) + 16 - x, height: Math.max(...members.map((node) => node.y + node.height)) + 16 - y });
      nodes.push(...childNodes);
    }
  }
  if (nodes.length !== applications.length) throw new Error("Every application needs a visible diagram node; extend the layout for deeper hierarchies.");
  return { nodes, edges, families };
}

export function renderLearningDiagram({ locale, data }) {
  const { nodes, edges, families } = learningDiagramLayout(data.applications);
  const stages = [
    [62, "01 · ORIENT", "01 · YÖN BUL"], [172, "02 · FOUNDATIONS", "02 · TEMELLER"],
    [362, "03 · RUNTIME", "03 · ÇALIŞTIRMA"], [472, "04 · AGENT SYSTEM", "04 · AJAN SİSTEMİ"],
    [592, "05 · QUALITY LOOP", "05 · KALİTE DÖNGÜSÜ"], [742, "06 · DEPLOY", "06 · DAĞITIM"],
    [912, "07 · PHYSICAL AI", "07 · FİZİKSEL AI"], [1152, "08 · INDUSTRIAL TWIN", "08 · ENDÜSTRİYEL İKİZ"],
    [1302, "09 · EMBODIED AI", "09 · BEDENLENMİŞ AI"],
  ];
  const description = localized(locale,
    "Large boxes show the connected main applications. Smaller boxes are sub-applications, enclosed with their parent in a shared frame. AIA connects GPU and USL to LLM, then HNS, CTX, SEC and EVL. CTX feeds back to LLM. Assurance informs parallel LCL and CLD deployment; both connect to WFM and SWI, then ITL and ENG. GPU owns GEX, WFM owns WML, SWI owns ANT and BEE, ITL owns PDT, and ENG owns HEX. A dot marks the shared deployment junction.",
    "Büyük kutular birbirine bağlı üst uygulamaları gösterir. Küçük kutular alt uygulamalardır; üst uygulamalarıyla ortak çerçeve içindedir. AIA, GPU ve USL üzerinden LLM, HNS, CTX, SEC ve EVL’ye bağlanır. CTX, LLM’ye geri bildirim verir. Güvence katmanı paralel LCL ve CLD dağıtımına, bunlar WFM ve SWI’ye, ardından ITL ve ENG’ye bağlanır. GPU altında GEX, WFM altında WML, SWI altında ANT ve BEE, ITL altında PDT, ENG altında HEX bulunur. Nokta, ortak dağıtım bağlantısını gösterir.");
  const renderNode = ({ app, x, y, width, height, cx, role }) => {
    const parentLabel = app.parentApp ? localized(locale, `Sub-application of ${app.parentApp.toUpperCase()}. `, `${app.parentApp.toUpperCase()} alt uygulaması. `) : "";
    return `            <a href="${escape(app.address)}" target="_blank" rel="noreferrer" class="ld-node ${app.parentApp ? "ld-node-child" : "ld-node-parent"}${app.code === "aia" ? " ld-node-aia" : ""}" data-learning-app="${app.code}" data-learning-role="${role}"${role === "deployment" ? ' data-learning-plane="deployment"' : ""}${app.parentApp ? ` data-learning-parent="${app.parentApp}"` : ""} aria-label="${escape(`${app.code.toUpperCase()} ${app.title[locale]}. ${parentLabel}${app.summary[locale]}`)}">
              <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${app.parentApp ? 7 : 10}"/>
              <text x="${cx}" y="${y + (app.parentApp ? 21 : 27)}" class="ld-code">${app.code.toUpperCase()}</text>
              <text x="${cx}" y="${y + (app.parentApp ? 39 : 48)}" class="ld-label">${escape(app.diagramLabel?.[locale] ?? app.title[locale])}</text>
            </a>`;
  };
  return [
    '      <figure class="learning-diagram-wrap">',
    `        <p class="mobile-map-hint" id="diagram-scroll-hint">${localized(locale, "Pinch with two fingers to zoom. Drag to explore the enlarged map.", "İki parmağınla açıp kapatarak boyutu ayarla. Büyüttüğün haritada parmağınla gezin.")}</p>`,
    `        <div class="learning-diagram-viewport" tabindex="0" role="region" aria-label="${localized(locale, "Application connection map", "Uygulama bağlantı haritası")}">`,
    `        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 1430" role="img" aria-labelledby="ld-title ld-desc" class="ld-svg">`,
    `          <title id="ld-title">${localized(locale, "Connected applications and their sub-applications", "Bağlı üst uygulamalar ve alt uygulamaları")}</title>`,
    `          <desc id="ld-desc">${escape(description)}</desc>`,
    '          <defs><marker id="ld-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9 z" fill="#c8ff36"/></marker></defs>',
    '          <g class="ld-stage-index" aria-hidden="true">',
    ...stages.map(([y, en, tr]) => `            <text x="12" y="${y}">${escape(localized(locale, en, tr))}</text>`),
    '          </g>',
    '          <g class="ld-families" aria-hidden="true">',
    ...families.map((family) => `            <g data-learning-family="${family.code}"><rect x="${family.x}" y="${family.y}" width="${family.width}" height="${family.height}" rx="15"/><text x="${family.x + family.width - 10}" y="${family.y + family.height + 14}">${localized(locale, `${family.code.toUpperCase()} + sub-applications`, `${family.code.toUpperCase()} + alt uygulamalar`)}</text></g>`),
    '          </g>',
    '          <g class="ld-links" aria-hidden="true">',
    '            <path data-learning-connector="lcl-to-stage-07" class="ld-edge-horizon" d="M 375 774 V 806 H 550 V 846"/>',
    '            <path data-learning-connector="cld-to-stage-07" class="ld-edge-horizon" d="M 725 774 V 806 H 550"/>',
    ...edges.map(({ id, path, kind }) => `            <path data-learning-edge="${id}" class="ld-edge-${kind}" d="${path}" marker-end="url(#ld-arrow)"/>`),
    '            <circle class="ld-junction" cx="550" cy="806" r="3"/><circle class="ld-junction" cx="550" cy="846" r="3"/>',
    '          </g>',
    '          <g class="ld-nodes">',
    ...nodes.map(renderNode),
    '          </g>',
    '          <g class="ld-legend" aria-hidden="true">',
    `            <path d="M 200 1400 H 232"/><text x="244" y="1404">${localized(locale, "Main application flow", "Üst uygulama akışı")}</text>`,
    `            <path class="ld-legend-context" d="M 455 1400 H 487"/><text x="499" y="1404">${localized(locale, "Context / decision", "Bağlam / karar")}</text>`,
    `            <path class="ld-legend-child" d="M 710 1400 H 742"/><text x="754" y="1404">${localized(locale, "Sub-application", "Alt uygulama")}</text>`,
    '          </g>',
    '        </svg>',
    '        </div>',
    `        <figcaption>${localized(locale, "Follow the arrows between main applications. The smaller boxes share a frame with their parent application.", "Üst uygulamalar arasındaki okları takip et. Küçük kutular, bağlı oldukları üst uygulamayla aynı çerçevededir.")}</figcaption>`,
    '      </figure>',
  ].join("\n");
}
