import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  assertValidLivingSystemData,
  loadLivingSystemData,
  summarizeApplications,
} from "./living-system-data.mjs";
import { scanPublicHtmlFiles } from "./render-living-system.mjs";
import {
  discoverPublicIndexDocuments,
  validatePublicAccessibilityDocument,
  validatePublicIndexCoverage,
} from "./public-html-contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expectedStageKeys = [
  "ai-engineer",
  "full-stack-ai",
  "data-scientist",
  "production-manager",
  "production-engineer",
  "materials-manufacturing",
  "industrial-engineering",
  "mechanical-engineering",
];
const expectedStageNumbers = ["08", "07", "06", "05", "04", "03", "02", "01"];
const expectedStageImages = [
  "08-ai-engineer",
  "07-full-stack-ai-engineer",
  "06-data-scientist",
  "05-production-manager",
  "04-production-engineer",
  "03-materials-manufacturing",
  "02-industrial-engineering",
  "01-mechanical-engineering",
];
const expectedPortraitModes = [
  "ascii-depth",
  "ascii-depth",
  "ascii-depth",
  "pixel-analog",
  "pixel-analog",
  "pixel-analog",
  "pixel-analog",
  "pixel-analog",
];
const expectedPixelSizes = ["4", "6", "8", "11", "14"];
const expectedPaletteLevels = ["5", "4", "4", "3", "2"];
const expectedEnglishBridges = [
  "Turning intelligence into working systems",
  "From models to products",
  "From data to models",
  "From operations to data",
  "Making production measurable",
  "From materials to evidence",
  "Systems and flow",
  "Matter and mechanics",
];
const expectedTurkishBridges = [
  "Zekâyı çalışan sistemlere dönüştürmek",
  "Modellerden ürünlere",
  "Veriden modellere",
  "Operasyondan veriye",
  "Üretimi ölçülebilir kılmak",
  "Malzemeden kanıta",
  "Sistemler ve akış",
  "Madde ve mekanik",
];
const expectedAnchors = ["top", "apps", "learning", "journey", "horizon", "approach", "about"];
const expectedAssetVersion = "20260903-holistic-system";
const expectedStylesheetHref = `/styles.css?v=${expectedAssetVersion}`;
const expectedScriptSrc = `/scripts.js?v=${expectedAssetVersion}`;
const expectedApplicationRows = [
  { code: "aia", repository: "aia-aserdargun-com", repositoryUrl: "https://github.com/aserdargun/aia-aserdargun-com", productUrl: "https://aia.aserdargun.com/", productLabel: "aia.aserdargun.com" },
  { code: "llm", repository: "llm-aserdargun-com", repositoryUrl: "https://github.com/aserdargun/llm-aserdargun-com", productUrl: "https://llm.aserdargun.com/", productLabel: "llm.aserdargun.com" },
  { code: "hns", repository: "hns-aserdargun-com", repositoryUrl: "https://github.com/aserdargun/hns-aserdargun-com", productUrl: "https://hns.aserdargun.com/", productLabel: "hns.aserdargun.com" },
  { code: "sec", repository: "sec-aserdargun-com", repositoryUrl: "https://github.com/aserdargun/sec-aserdargun-com", productUrl: "https://sec.aserdargun.com/", productLabel: "sec.aserdargun.com" },
  { code: "ctx", repository: "ctx-aserdargun-com", repositoryUrl: "https://github.com/aserdargun/ctx-aserdargun-com", productUrl: "https://ctx.aserdargun.com/", productLabel: "ctx.aserdargun.com" },
  { code: "evl", repository: "evl-aserdargun-com", repositoryUrl: "https://github.com/aserdargun/evl-aserdargun-com", productUrl: "https://evl.aserdargun.com/", productLabel: "evl.aserdargun.com" },
  { code: "usl", repository: "usl-aserdargun-com", repositoryUrl: "https://github.com/aserdargun/usl-aserdargun-com", productUrl: "https://usl.aserdargun.com/", productLabel: "usl.aserdargun.com" },
  { code: "gpu", repository: "gpu-aserdargun-com", repositoryUrl: "https://github.com/aserdargun/gpu-aserdargun-com", productUrl: "https://gpu.aserdargun.com/", productLabel: "gpu.aserdargun.com" },
  { code: "cld", repository: "cld-aserdargun-com", repositoryUrl: "https://github.com/aserdargun/cld-aserdargun-com", productUrl: "https://cld.aserdargun.com/", productLabel: "cld.aserdargun.com" },
  { code: "lcl", repository: "lcl-aserdargun-com", repositoryUrl: "https://github.com/aserdargun/lcl-aserdargun-com", productUrl: "https://lcl.aserdargun.com/", productLabel: "lcl.aserdargun.com" },
  { code: "wfm", repository: "wfm-aserdargun-com", repositoryUrl: "https://github.com/aserdargun/wfm-aserdargun-com", productUrl: "https://wfm.aserdargun.com/", productLabel: "wfm.aserdargun.com" },
  { code: "itl", repository: "itl-aserdargun-com", repositoryUrl: "https://github.com/aserdargun/itl-aserdargun-com", productUrl: "https://itl.aserdargun.com/", productLabel: "itl.aserdargun.com" },
  { code: "eng", repository: "eng-aserdargun-com", repositoryUrl: "https://github.com/aserdargun/eng-aserdargun-com", productUrl: "https://eng.aserdargun.com/", productLabel: "eng.aserdargun.com" },
].map((row) => ({
  code: row.code,
  repository: row.repository,
  repositoryUrl: row.repositoryUrl,
  repositoryTarget: "_blank",
  repositoryRel: "noreferrer",
  repositoryArrow: "↗",
  repositoryArrowAriaHidden: "true",
  productUrl: row.productUrl,
  productTarget: "_blank",
  productRel: "noreferrer",
  productLabel: row.productLabel,
  productArrow: "↗",
  productArrowAriaHidden: "true",
}));
const retiredProjectUrls = [
  "https://stackfolio.aserdargun.com/",
  "https://unsloth.aserdargun.com/",
  "https://swapp.org.tr",
  "https://github.com/aserdargun/pipolars",
  "https://pypi.org/project/pipolars/",
  "https://github.com/aserdargun/ai-practitioner-dev-os",
  "https://projectpulsar.org/",
  "https://github.com/aserdargun/piwebapi",
  "https://scadanerve.com",
  "https://industry-learn.com",
  "https://scikit-play.org",
  "https://aeon-play.org",
  "https://pytorch-play.org",
  "https://dsml101.com",
];
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function matches(source, pattern) {
  return Array.from(source.matchAll(pattern), (match) => match[1]);
}

function tokenizeAttributes(source) {
  const attributes = new Map();
  const pattern = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of source.matchAll(pattern)) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    const values = attributes.get(name) ?? [];
    values.push(value);
    attributes.set(name, values);
  }
  return attributes;
}

function attribute(attributes, name) {
  const values = attributes.get(name.toLowerCase());
  return values?.length === 1 ? values[0] : null;
}

function parseMarkerContent(content) {
  const presentation = content.replace(/\s*<span\s+class=["']sr-only["']>[\s\S]*?<\/span>\s*$/i, "");
  const match = presentation.match(/^\s*([\s\S]*?)\s*<span\b([^>]*)>([\s\S]*?)<\/span>\s*$/i);
  if (!match) return null;
  const [, label, markerAttributes, marker] = match;
  return {
    label: label.trim(),
    marker: marker.trim(),
    markerAriaHidden: attribute(tokenizeAttributes(markerAttributes), "aria-hidden"),
  };
}

function parseAnchor(anchorHtml) {
  const match = anchorHtml.match(/^<a\b([^>]*)>([\s\S]*?)<\/a>$/i);
  if (!match) return null;
  const [, attributeSource, content] = match;
  const attributes = tokenizeAttributes(attributeSource);
  return {
    href: attribute(attributes, "href"),
    target: attribute(attributes, "target"),
    rel: attribute(attributes, "rel"),
    content,
  };
}

function onlyAnchor(cell) {
  const openingAnchorCount = Array.from(cell.matchAll(/<a\b/gi)).length;
  const anchors = Array.from(cell.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi), (match) => match[0]);
  return openingAnchorCount === 1 && anchors.length === 1 ? parseAnchor(anchors[0]) : null;
}

function parseApplicationMapRows(html) {
  const body = html.match(/<section class="app-map"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  return Array.from(body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g), (match) => {
    const row = match[1];
    const cells = Array.from(row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi), (cell) => cell[1]);
    const repositoryAnchor = cells.length === 3 ? onlyAnchor(cells[1]) : null;
    const productAnchor = cells.length === 3 ? onlyAnchor(cells[2]) : null;
    const repositoryPresentation = parseMarkerContent(repositoryAnchor?.content ?? "");
    const repository = repositoryPresentation?.label.match(/^<code>([^<]+)<\/code>$/)?.[1] ?? null;
    const productPresentation = parseMarkerContent(productAnchor?.content ?? "");
    const productLabel = productPresentation && !/[<>]/.test(productPresentation.label)
      ? productPresentation.label
      : null;
    return {
      code: row.match(/<th\s+scope="row">\s*<code>([^<]+)<\/code>\s*<\/th>/)?.[1] ?? null,
      repository,
      repositoryUrl: repositoryAnchor?.href ?? null,
      repositoryTarget: repositoryAnchor?.target ?? null,
      repositoryRel: repositoryAnchor?.rel ?? null,
      repositoryArrow: repositoryPresentation?.marker ?? null,
      repositoryArrowAriaHidden: repositoryPresentation?.markerAriaHidden ?? null,
      productUrl: productAnchor?.href ?? null,
      productTarget: productAnchor?.target ?? null,
      productRel: productAnchor?.rel ?? null,
      productLabel,
      productArrow: productPresentation?.marker ?? null,
      productArrowAriaHidden: productPresentation?.markerAriaHidden ?? null,
    };
  });
}

function validateApplicationMapRows(locale, html) {
  const rows = parseApplicationMapRows(html);
  check(rows.length === expectedApplicationRows.length, `${locale}: application map row count differs`);
  check(
    JSON.stringify(rows) === JSON.stringify(expectedApplicationRows),
    `${locale}: application map row tuples or order differ`,
  );
}

const expectedLearningCodes = ["aia", "gpu", "llm", "usl", "hns", "ctx", "sec", "evl", "lcl", "cld", "aia"];
const expectedLearningUrls = expectedLearningCodes.map((code) => `https://${code}.aserdargun.com/`);
const expectedLearningQuestions = {
  en: [
    "“What exists?”",
    "“How does compute work?”",
    "“How do models run?”",
    "“How do models learn/change?”",
    "“How do I turn model capability into a reliable agent system?”",
    "“What does the model actually see?”",
    "“Why should I trust this agent system?”",
    "“How do I know it works?”",
    "“Which local lab should I buy?”",
    "“How do I operate this at scale?”",
    "“Where does this technology fit?”",
  ],
  tr: [
    "“Neler var?”",
    "“Hesaplama nasıl çalışır?”",
    "“Modeller nasıl çalıştırılır?”",
    "“Modeller nasıl öğrenir/değişir?”",
    "“Model kabiliyetini nasıl güvenilir bir agent sistemine dönüştürürüm?”",
    "“Model gerçekte ne görüyor?”",
    "“Bu agent sistemine neden güvenmeliyim?”",
    "“Çalıştığını nereden biliyorum?”",
    "“Hangi laboratuvarı almalıyım?”",
    "“Bunu ölçekte nasıl işletirim?”",
    "“Bu teknoloji nereye oturur?”",
  ],
};
const expectedLearningStudyRoles = {
  en: [
    "Living map · never “done”",
    "Foundation",
    "Main project",
    "From running to changing models",
    "Reliable agent-system layer",
    "What the model actually sees",
    "Trust and assurance layer",
    "Evidence over assumption",
    "Local deployment decision",
    "Cloud deployment decision",
  ],
  tr: [
    "Yaşayan harita · hiç “bitmez”",
    "Temel katman",
    "Ana proje",
    "Çalıştırmadan değiştirmeye",
    "Güvenilir agent sistemi katmanı",
    "Modelin gerçekte gördüğü",
    "Güven ve güvence katmanı",
    "Varsayım yerine kanıt",
    "Yerel dağıtım kararı",
    "Bulut dağıtım kararı",
  ],
};
const expectedLearningTopics = {
  en: [
    "ecosystem → models → training → inference → runtime → hardware → cloud",
    "CPU vs GPU → GPU architecture → VRAM → memory bandwidth → CUDA / Tensor cores → FP32 / FP16 / BF16 / FP8 / INT8 / INT4 → matrix multiplication → CUDA kernels → FlashAttention → KV cache → quantization → multi-GPU → tensor parallelism",
    "model → architecture → precision → memory calculator → runtime → inference engine → serving → API → benchmark",
    "Ollama · llama.cpp · vLLM · SGLang · TensorRT-LLM · Transformers · MLX",
    "pretrained model → dataset → tokenization → LoRA → QLoRA → SFT → DPO → GRPO → evaluation → merged model → LLM runtime",
    "model capability → context → tools → orchestration → sandbox → memory → verification → observability → reliable agent system",
    "system message → context window → chunking → embeddings → vector DB → retrieval → memory → tool use → token budget",
    "model → agent → identity → credential → authorization → tool → sandbox → data → action → audit → incident",
    "golden set → metrics → LLM-as-judge → A/B test → regression suite → human eval → benchmark → online monitoring",
    "open-weight model → workload → memory → NVIDIA / AMD / Apple → privacy / power / noise → local lab",
    "model → vLLM → Docker → GPU instance → cloud GPU → load balancer → autoscaling → API",
  ],
  tr: [
    "ekosistem → modeller → eğitim → inference → runtime → donanım → bulut",
    "CPU vs GPU → GPU mimarisi → VRAM → bellek bant genişliği → CUDA / Tensor çekirdekleri → FP32 / FP16 / BF16 / FP8 / INT8 / INT4 → matris çarpımı → CUDA kernelleri → FlashAttention → KV cache → quantization → çoklu GPU → tensor paralellik",
    "model → mimari → hassasiyet → bellek hesabı → runtime → inference motoru → sunum → API → benchmark",
    "Ollama · llama.cpp · vLLM · SGLang · TensorRT-LLM · Transformers · MLX",
    "eğitilmiş model → veri seti → tokenization → LoRA → QLoRA → SFT → DPO → GRPO → değerlendirme → birleştirilmiş model → LLM runtime",
    "model kabiliyeti → bağlam → araçlar → orkestrasyon → sandbox → bellek → doğrulama → gözlemlenebilirlik → güvenilir agent sistemi",
    "sistem mesajı → bağlam penceresi → chunking → embedding → vektör veritabanı → retrieval → bellek → araç kullanımı → token bütçesi",
    "model → agent → kimlik → kimlik bilgisi → yetkilendirme → araç → sandbox → veri → eylem → denetim → olay",
    "golden set → metrikler → LLM-as-judge → A/B testi → regresyon paketi → insan değerlendirmesi → benchmark → online izleme",
    "açık ağırlıklı model → iş yükü → bellek → NVIDIA / AMD / Apple → gizlilik / güç / gürültü → yerel laboratuvar",
    "model → vLLM → Docker → GPU instance → bulut GPU → load balancer → autoscaling → API",
  ],
};

function validateLearningSystem(locale, html) {
  const isTurkish = locale === "tr";
  const section = html.match(/<section class="learning-system"[\s\S]*?<\/section>/)?.[0] ?? "";
  check(section.length > 0, `${locale}: learning system section is missing`);
  if (section.length === 0) return;
  check(section.includes('id="learning"'), `${locale}: learning system anchor is missing`);
  check(section.includes('aria-labelledby="learning-title"'), `${locale}: learning system heading relationship is missing`);
  check(section.includes('aria-describedby="learning-description"'), `${locale}: learning system description relationship is missing`);
  const intro = section.match(/<div class="learning-intro">([\s\S]*?)<\/div>/)?.[1] ?? "";
  const expectedKicker = isTurkish
    ? "Öğrenme sistemi · AI Ekosistem Atlası"
    : "Learning system · AI Ecosystem Atlas";
  const expectedHeading = isTurkish
    ? "Atlas bir öğrenme sistemidir."
    : "The atlas is a learning system.";
  check(intro.includes(expectedKicker), `${locale}: learning system kicker is missing`);
  check(intro.includes(expectedHeading), `${locale}: learning system heading is missing`);
  const expectedSystemCount = isTurkish
    ? "On uygulama tek bir öğrenme döngüsü oluşturur"
    : "The ten applications form one learning loop";
  check(intro.includes(expectedSystemCount), `${locale}: learning system application count is stale`);
  check(
    section.includes('<figure class="learning-diagram-wrap">')
      && section.includes('class="ld-svg"'),
    `${locale}: learning system diagram is missing`,
  );
  const diagram = section.match(/<svg\b[^>]*class="ld-svg"[\s\S]*?<\/svg>/)?.[0] ?? "";
  check(diagram.includes("AIA") && diagram.includes("HNS") && diagram.includes("SEC") && diagram.includes("CLD") && diagram.includes("LCL") && diagram.includes("WFM") && diagram.includes("ITL") && diagram.includes("ENG"), `${locale}: learning system diagram endpoints are missing`);
  const deploymentNodes = Array.from(
    diagram.matchAll(/<a href="https:\/\/(lcl|cld)\.aserdargun\.com\/"[^>]*data-learning-plane="deployment"[^>]*>[\s\S]*?<rect x="[0-9]+" y="([0-9]+)"/g),
    (match) => ({ code: match[1], y: match[2] }),
  );
  check(
    JSON.stringify(deploymentNodes.map(({ code }) => code)) === JSON.stringify(["lcl", "cld"]),
    `${locale}: LCL and CLD must be the two deployment-plane diagram nodes`,
  );
  check(
    deploymentNodes.length === 2 && new Set(deploymentNodes.map(({ y }) => y)).size === 1,
    `${locale}: LCL must be parallel to CLD in the learning diagram`,
  );
  const nodeRoles = Array.from(
    diagram.matchAll(/<a href="https:\/\/([a-z]{3})\.aserdargun\.com\/"[^>]*data-learning-role="([^"]+)"[^>]*>/g),
    (match) => `${match[1]}:${match[2]}`,
  );
  check(
    JSON.stringify(nodeRoles) === JSON.stringify([
      "aia:map",
      "gpu:foundation",
      "llm:hub",
      "usl:adapt",
      "hns:harness",
      "ctx:context",
      "sec:security",
      "evl:evaluation",
      "lcl:deployment",
      "cld:deployment",
      "wfm:world",
      "itl:twin",
      "eng:horizon",
    ]),
    `${locale}: learning diagram node roles differ from the application content model`,
  );
  const learningEdges = matches(diagram, /<path data-learning-edge="([^"]+)"/g);
  check(
    JSON.stringify(learningEdges) === JSON.stringify([
      "aia-to-gpu",
      "aia-to-llm",
      "aia-to-usl",
      "gpu-to-llm",
      "usl-to-llm",
      "llm-to-hns",
      "hns-to-ctx",
      "hns-to-sec",
      "hns-to-evl",
      "ctx-to-llm",
      "sec-to-lcl",
      "sec-to-cld",
      "evl-to-cld",
      "ctx-to-lcl",
      "lcl-to-wfm",
      "cld-to-wfm",
      "wfm-to-itl",
      "itl-to-eng",
    ]),
    `${locale}: learning diagram edges differ from the application content model`,
  );
  const codes = matches(section, /<code class="learning-code">([a-z]{3})<\/code>/g);
  check(JSON.stringify(codes) === JSON.stringify(expectedLearningCodes), `${locale}: learning system node codes or order differ`);
  const deploymentCards = section.match(/<ul class="learning-deployment-paths"[\s\S]*?<\/ul>/)?.[0] ?? "";
  const deploymentCardCodes = matches(deploymentCards, /<code class="learning-code">([a-z]{3})<\/code>/g);
  const deploymentCardOrders = matches(deploymentCards, /<span class="learning-order" aria-hidden="true">([^<]+)<\/span>/g);
  check(
    JSON.stringify(deploymentCardCodes) === JSON.stringify(["lcl", "cld"]),
    `${locale}: detailed deployment cards must expose LCL and CLD in order`,
  );
  check(
    JSON.stringify(deploymentCardOrders) === JSON.stringify(["7A", "7B"]),
    `${locale}: detailed deployment cards must label LCL and CLD as 7A and 7B`,
  );
  const urls = matches(section, /<a class="learning-node-link" href="(https:\/\/[a-z]{3}\.aserdargun\.com\/)" target="_blank" rel="noreferrer">/g);
  check(JSON.stringify(urls) === JSON.stringify(expectedLearningUrls), `${locale}: learning system node links or order differ`);
  for (const [index, code] of expectedLearningCodes.entries()) {
    const newTabText = isTurkish ? "yeni sekmede açılır" : "opens in a new tab";
    const link = `<a class="learning-node-link" href="${expectedLearningUrls[index]}" target="_blank" rel="noreferrer">${code}.aserdargun.com <span aria-hidden="true">↗</span> <span class="sr-only">${newTabText}</span></a>`;
    check(section.includes(link), `${locale}: learning system node link is missing or malformed: ${code}`);
  }
  check(section.includes("gpu → llm") && section.includes("usl → llm") && section.includes("llm → gpu"), `${locale}: learning system feed markers are missing`);
  const questions = matches(section, /<p class="learning-question">([^<]+)<\/p>/g);
  check(
    JSON.stringify(questions) === JSON.stringify(isTurkish ? expectedLearningQuestions.tr : expectedLearningQuestions.en),
    `${locale}: learning system guiding questions or order differ`,
  );
  const studyCopies = matches(section, /<span class="learning-study-copy">([\s\S]*?)<\/span><a class="learning-study-link"/g);
  const studyCodes = studyCopies.map((copy) => copy.match(/<code>([a-z]{3})<\/code>/)?.[1] ?? "");
  check(JSON.stringify(studyCodes) === JSON.stringify(["aia", "gpu", "llm", "usl", "hns", "ctx", "sec", "evl", "lcl", "cld"]), `${locale}: learning study order codes differ`);
  const studyRoles = studyCopies.map((copy) => copy.match(/<span class="learning-study-role">([^<]+)<\/span>/)?.[1] ?? "");
  check(
    JSON.stringify(studyRoles) === JSON.stringify(isTurkish ? expectedLearningStudyRoles.tr : expectedLearningStudyRoles.en),
    `${locale}: learning study order roles differ`,
  );
  const topics = matches(section, /<p class="learning-topics">([\s\S]*?)<\/p>/g).map((topic) => topic.replace(/<span aria-hidden="true">([^<]*)<\/span>/g, "$1").replace(/\s+/g, " ").trim());
  check(
    JSON.stringify(topics) === JSON.stringify(isTurkish ? expectedLearningTopics.tr : expectedLearningTopics.en),
    `${locale}: learning system topic chains differ`,
  );
  check((section.match(/class="learning-stage-label"/g) || []).length === 6, `${locale}: learning system must expose six stages`);
}

function validateLearningHorizon(locale, html) {
  const isTurkish = locale === "tr";
  const section = html.match(/<section class="learning-system"[\s\S]*?<\/section>/)?.[0] ?? "";
  const aside = section.match(/<aside class="learning-horizon"[\s\S]*?<\/aside>/)?.[0] ?? "";
  check(aside.length > 0, `${locale}: learning horizon callout is missing`);
  if (aside.length === 0) return;
  const expectedKicker = isTurkish
    ? "Ufuk · bu döngünün hizmet ettiği şey"
    : "The horizon · what this loop serves";
  check(aside.includes(expectedKicker), `${locale}: learning horizon kicker is missing`);
  check(aside.includes("Open Humanoid Engineering"), `${locale}: learning horizon title is missing`);
  const horizonCodes = matches(aside, /href="https:\/\/([a-z]{3})\.aserdargun\.com\/"/g);
  check(JSON.stringify(horizonCodes) === JSON.stringify(["wfm", "itl", "eng"]), `${locale}: learning horizon bridge, lab, and destination order differ`);
  const bridgeCopy = isTurkish
    ? "algı, tahmin, planlama ve eylem"
    : "perception, prediction, planning, and action";
  check(aside.includes(bridgeCopy), `${locale}: learning horizon world-model bridge description is missing`);
  check(aside.includes('aria-labelledby="learning-horizon-title"'), `${locale}: learning horizon heading relationship is missing`);
  check(aside.includes('aria-describedby="learning-horizon-desc"'), `${locale}: learning horizon description relationship is missing`);
  check(!aside.includes("learning-stage"), `${locale}: learning horizon must not be a learning-stage`);
}

const expectedPrimaryNavigation = {
  en: [
    ["Journey", "/#journey"],
    ["Now", "/now/"],
    ["Horizon", "/#horizon"],
    ["Applications", "/#apps"],
    ["Knowledge", "/memory/"],
    ["About", "/#about"],
  ],
  tr: [
    ["Yolculuk", "/tr/#journey"],
    ["Şimdi", "/tr/now/"],
    ["Ufuk", "/tr/#horizon"],
    ["Uygulamalar", "/tr/#apps"],
    ["Bilgi", "/tr/memory/"],
    ["Hakkımda", "/tr/#about"],
  ],
};

function validatePrimaryNavigation(locale, page, html) {
  const nav = html.match(/<nav class="nav-links"[\s\S]*?<\/nav>/)?.[0] ?? "";
  check(nav.length > 0, `${locale}/${page}: primary navigation is missing`);
  if (nav.length === 0) return;
  const primaryLinks = Array.from(
    nav.matchAll(/<a class="nav-links__primary-link" href="([^"]+)"(?: aria-current="page")?>([^<]+)<\/a>/g),
    (match) => [match[2], match[1]],
  );
  check(
    JSON.stringify(primaryLinks) === JSON.stringify(expectedPrimaryNavigation[locale]),
    `${locale}/${page}: primary concepts, destinations, count, or order differ`,
  );
  for (const [concept] of expectedPrimaryNavigation[locale]) {
    check(primaryLinks.filter(([label]) => label === concept).length === 1, `${locale}/${page}: primary concept must appear exactly once: ${concept}`);
  }
  const currentLinks = Array.from(nav.matchAll(/<a class="nav-links__primary-link"[^>]*aria-current="page"[^>]*>([^<]+)<\/a>/g), (match) => match[1]);
  const expectedCurrent = page === "memory"
    ? [locale === "tr" ? "Bilgi" : "Knowledge"]
    : ["now", "archive"].includes(page) ? [locale === "tr" ? "Şimdi" : "Now"] : [];
  check(JSON.stringify(currentLinks) === JSON.stringify(expectedCurrent), `${locale}/${page}: routed primary current state differs`);
  const learningLabel = locale === "tr" ? "Öğrenme" : "Learning";
  const localeRoot = locale === "tr" ? "/tr/" : "/";
  check(nav.includes(`<a class="nav-links__secondary-link" href="${localeRoot}#learning">${learningLabel}</a>`), `${locale}/${page}: secondary Learning link is missing`);
  check(!primaryLinks.some(([concept]) => concept === learningLabel), `${locale}/${page}: Learning must not be a seventh primary concept`);
  check(!primaryLinks.some(([concept]) => ["Approach", "Yaklaşım"].includes(concept)), `${locale}/${page}: Approach remains in top-level navigation`);

  const groupExpectations = [
    ["horizon", locale === "tr" ? "Ufuk" : "The horizon", ["wfm", "itl", "eng"]],
    ["private", locale === "tr" ? "Özel sistemler" : "Private systems", ["stk", "inf", "nxt"]],
  ];
  for (const [groupName, groupLabel, expectedCodes] of groupExpectations) {
    const group = nav.match(new RegExp(`<div class="nav-links__group" data-nav-group="${groupName}"[\\s\\S]*?<\\/div>`))?.[0] ?? "";
    check(group.length > 0, `${locale}/${page}: ${groupName} navigation group is missing`);
    if (!group) continue;
    const expectedLabelId = `nav-${groupName}-label-${locale}`;
    const groupOpening = group.match(/^<div\b[^>]*>/)?.[0] ?? "";
    check(groupOpening.includes('role="group"'), `${locale}/${page}: ${groupName} navigation container must expose a group role`);
    check(groupOpening.includes(`aria-labelledby="${expectedLabelId}"`), `${locale}/${page}: ${groupName} navigation group is not named by its visible label`);
    const labelElement = group.match(/<span class="nav-links__section"[^>]*>([^<]+)<\/span>/)?.[0] ?? "";
    check(labelElement.includes(`>${groupLabel}<`), `${locale}/${page}: ${groupName} navigation label differs`);
    check(labelElement.includes(`id="${expectedLabelId}"`), `${locale}/${page}: ${groupName} visible label id does not match its group name reference`);
    check(!labelElement.includes('aria-hidden="true"'), `${locale}/${page}: ${groupName} navigation label is hidden from assistive technology`);
    const codes = matches(group, /href="https:\/\/([a-z]{3})\.aserdargun\.com\/"/g);
    check(JSON.stringify(codes) === JSON.stringify(expectedCodes), `${locale}/${page}: ${groupName} navigation destinations differ`);
  }
}

function validateLivingSystem(locale, html) {
  const section = html.match(/<section class="living-system"[\s\S]*?<\/section>/)?.[0] ?? "";
  check(section.length > 0, `${locale}: living-system section is missing`);
  if (!section) return;
  const cards = Array.from(
    section.matchAll(/<a class="living-system-card" href="([^"]+)">[\s\S]*?<span class="living-system-card__eyebrow">([^<]+)<\/span>[\s\S]*?<h2>([^<]+)<\/h2>[\s\S]*?<p>([^<]+)<\/p>[\s\S]*?<\/a>/g),
    (match) => ({ href: match[1], eyebrow: match[2], heading: match[3], description: match[4] }),
  );
  const expected = locale === "tr" ? [
    ["Geçmiş", "/tr/#journey"], ["Şimdi", "/tr/now/"], ["Gelecek", "/tr/#horizon"], ["Bilgi", "/tr/memory/"], ["Uygulamalar", "/tr/#apps"],
  ] : [
    ["Past", "/#journey"], ["Now", "/now/"], ["Future", "/#horizon"], ["Knowledge", "/memory/"], ["Applications", "/#apps"],
  ];
  check(JSON.stringify(cards.map((card) => [card.heading, card.href])) === JSON.stringify(expected), `${locale}: living-system order or destinations differ`);
  check(cards.length === 5 && cards.every((card) => card.eyebrow.length > 0 && card.description.length > 0), `${locale}: living-system cards require localized eyebrows and descriptions`);
  check(section.indexOf("<a ") >= 0 && !section.includes("onclick="), `${locale}: living-system destinations must be normal anchors`);
  check(html.indexOf(section) > html.indexOf('class="hero-copy"') && html.indexOf(section) < html.indexOf('class="story-content"'), `${locale}: living-system must follow the hero and precede the detailed journey`);
}

function validateLearningInvest(locale, html) {
  const isTurkish = locale === "tr";
  const section = html.match(/<section class="learning-invest"[\s\S]*?<\/section>/)?.[0] ?? "";
  check(section.length > 0, `${locale}: learning investment section is missing`);
  if (section.length === 0) return;
  const segments = matches(section, /<span class="learning-invest-seg(?:\s+learning-invest-seg-horizon)?" style="flex-basis: \d+%;"><code>([a-z]{3})<\/code> ([^<]+)<\/span>/g);
  const expectedCodes = ["llm", "gpu", "usl", "cld", "aia", "wfm", "itl", "eng"];
  check(JSON.stringify(segments) === JSON.stringify(expectedCodes), `${locale}: learning investment segment codes or order differ`);
  const labels = Array.from(
    section.matchAll(/<span class="learning-invest-seg(?:\s+learning-invest-seg-horizon)?" style="flex-basis: \d+%;"><code>[a-z]{3}<\/code> ([^<]+)<\/span>/g),
    (match) => match[1].trim(),
  );
  const expectedLabels = isTurkish
    ? ["%30", "%25", "%20", "%15", "%7", "%1", "%1", "%1"]
    : ["30%", "25%", "20%", "15%", "7%", "1%", "1%", "1%"];
  check(JSON.stringify(labels) === JSON.stringify(expectedLabels), `${locale}: learning investment percentages differ`);
  const expectedBasis = ["30", "25", "20", "15", "7", "1", "1", "1"];
  const basis = matches(section, /flex-basis: (\d+)%;/g);
  check(JSON.stringify(basis) === JSON.stringify(expectedBasis), `${locale}: learning investment weights differ`);
}

function stripCssComments(source) {
  let result = "";
  let quote = null;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      result += character;
      if (character === "\\") {
        index += 1;
        result += source[index] ?? "";
      } else if (character === quote) {
        quote = null;
      }
    } else if (character === '"' || character === "'") {
      quote = character;
      result += character;
    } else if (character === "/" && source[index + 1] === "*") {
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) index += 1;
      index += 1;
      result += " ";
    } else {
      result += character;
    }
  }
  return result;
}

function findCssDelimiter(source, start) {
  let quote = null;
  let parentheses = 0;
  let brackets = 0;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === "(") parentheses += 1;
    else if (character === ")") parentheses = Math.max(0, parentheses - 1);
    else if (character === "[") brackets += 1;
    else if (character === "]") brackets = Math.max(0, brackets - 1);
    else if (parentheses === 0 && brackets === 0 && (character === "{" || character === ";")) {
      return { character, index };
    }
  }
  return null;
}

function findMatchingCssBrace(source, openIndex) {
  let depth = 1;
  let quote = null;
  for (let index = openIndex + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) return index;
  }
  return -1;
}

function splitCssSelectorList(source) {
  const selectors = [];
  let start = 0;
  let quote = null;
  let parentheses = 0;
  let brackets = 0;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = null;
    } else if (character === '"' || character === "'") quote = character;
    else if (character === "(") parentheses += 1;
    else if (character === ")") parentheses = Math.max(0, parentheses - 1);
    else if (character === "[") brackets += 1;
    else if (character === "]") brackets = Math.max(0, brackets - 1);
    else if (character === "," && parentheses === 0 && brackets === 0) {
      selectors.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }
  selectors.push(source.slice(start).trim());
  return selectors.filter(Boolean);
}

function scanCssRules(source) {
  const rules = [];
  const groupingAtRules = new Set(["container", "document", "layer", "media", "scope", "starting-style", "supports"]);

  function scanBlock(block) {
    let cursor = 0;
    while (cursor < block.length) {
      while (/\s/.test(block[cursor] ?? "")) cursor += 1;
      const delimiter = findCssDelimiter(block, cursor);
      if (!delimiter) break;
      if (delimiter.character === ";") {
        cursor = delimiter.index + 1;
        continue;
      }
      const closeIndex = findMatchingCssBrace(block, delimiter.index);
      if (closeIndex < 0) break;
      const prelude = block.slice(cursor, delimiter.index).trim();
      const body = block.slice(delimiter.index + 1, closeIndex);
      if (prelude.startsWith("@")) {
        const atRuleName = prelude.match(/^@([\w-]+)/)?.[1].toLowerCase();
        if (groupingAtRules.has(atRuleName)) scanBlock(body);
      } else if (prelude) {
        rules.push({ selectors: splitCssSelectorList(prelude), declarations: body });
      }
      cursor = closeIndex + 1;
    }
  }

  scanBlock(stripCssComments(source));
  return rules;
}

function declarationExists(rule, property, value) {
  const declarations = rule.split(";");
  return declarations.some((declaration) => {
    const colonIndex = declaration.indexOf(":");
    if (colonIndex < 0) return false;
    const actualProperty = declaration.slice(0, colonIndex).trim().toLowerCase();
    const actualValue = declaration.slice(colonIndex + 1).trim().toLowerCase();
    return actualProperty === property && actualValue === value;
  });
}

const canonicalRepositoryCodeSelector = ".app-map tbody td:nth-of-type(2) a code";
const retiredRowSelectorSuffixes = [
  ".app-map tbody tr:first-child",
  ".app-map tbody > tr:first-child",
  ".app-map > tbody tr:first-child",
  ".app-map > tbody > tr:first-child",
  ".app-map tbody tr:nth-child(1)",
  ".app-map tbody > tr:nth-child(1)",
  ".app-map > tbody tr:nth-child(1)",
  ".app-map > tbody > tr:nth-child(1)",
];

function normalizeCssSelectorComponent(selector) {
  return selector
    .trim()
    .replace(/[ \t\r\n\f]+/g, " ")
    .replace(/[ \t\r\n\f]*>[ \t\r\n\f]*/g, " > ");
}

function isCanonicalRepositoryCodeSelector(selector) {
  return normalizeCssSelectorComponent(selector) === canonicalRepositoryCodeSelector;
}

function isRetiredRowSelector(selector) {
  const normalized = normalizeCssSelectorComponent(selector);
  return retiredRowSelectorSuffixes.some(
    (suffix) => normalized === suffix || normalized.endsWith(` ${suffix}`),
  );
}

function readPngDimensions(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function pngHasAlpha(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") return false;
  const colorType = buffer.readUInt8(25);
  if ([4, 6].includes(colorType)) return true;
  if (colorType !== 3) return false;
  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("latin1", offset + 4, offset + 8);
    if (type === "tRNS") return true;
    if (type === "IDAT") break;
    offset += 12 + length;
  }
  return false;
}

function readJpegDimensions(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  return null;
}

const pages = {
  en: await readFile(path.join(root, "index.html"), "utf8"),
  tr: await readFile(path.join(root, "tr/index.html"), "utf8"),
};
async function readRoute(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), "utf8");
  } catch {
    failures.push(`Required route is missing: ${relativePath}`);
    return "";
  }
}
const routePages = {
  en: {
    home: pages.en,
    now: await readRoute("now/index.html"),
    memory: await readRoute("memory/index.html"),
  },
  tr: {
    home: pages.tr,
    now: await readRoute("tr/now/index.html"),
    memory: await readRoute("tr/memory/index.html"),
  },
};

async function listArchiveWeeks(relativePath) {
  try {
    const entries = await readdir(path.join(root, relativePath), { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && /^\d{4}-W\d{2}$/.test(entry.name))
      .map((entry) => entry.name)
      .sort()
      .reverse();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

const archiveWeeksByLocale = {
  en: await listArchiveWeeks("now/archive"),
  tr: await listArchiveWeeks("tr/now/archive"),
};
check(
  JSON.stringify(archiveWeeksByLocale.en) === JSON.stringify(archiveWeeksByLocale.tr),
  "Now archives must exist as complete bilingual week pairs",
);
const archiveWeeks = [...new Set([...archiveWeeksByLocale.en, ...archiveWeeksByLocale.tr])].sort().reverse();
const archiveRoutePages = { en: {}, tr: {} };
for (const week of archiveWeeks) {
  archiveRoutePages.en[week] = await readRoute(`now/archive/${week}/index.html`);
  archiveRoutePages.tr[week] = await readRoute(`tr/now/archive/${week}/index.html`);
}
const styles = await readFile(path.join(root, "styles.css"), "utf8");
check(
  /a:focus-visible,\s*button:focus-visible\s*\{[\s\S]*?outline:\s*(?:solid\s+)?2px\s+[^;]+;[\s\S]*?outline-offset:\s*[1-9][0-9]*px;/.test(styles),
  "Shared link/button focus-visible contract is missing",
);
check(
  /\.app-map-table-wrap:focus-visible\s*\{[\s\S]*?outline:\s*(?:solid\s+)?2px\s+[^;]+;/.test(styles),
  "Application table scroll region focus indicator is missing",
);
check(
  /@media\s*\(max-width:\s*900px\)[\s\S]*?a,\s*button\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;/.test(styles),
  "Mobile links/buttons need the shared 44px touch-target contract",
);
const livingSystem = await loadLivingSystemData(path.join(root, "data", "living-system.json"));
assertValidLivingSystemData(livingSystem, { sourcePath: "data/living-system.json" });
for (const diagnostic of await scanPublicHtmlFiles(root)) {
  failures.push(`Public HTML privacy validation failed: ${diagnostic}`);
}
const publicIndexDocuments = await discoverPublicIndexDocuments(root);
const validatedPublicIndexPaths = [];
for (const document of publicIndexDocuments) {
  const html = await readFile(document.absolutePath, "utf8");
  validatedPublicIndexPaths.push(document.relativePath);
  for (const diagnostic of validatePublicAccessibilityDocument({ html, relativePath: document.relativePath })) {
    failures.push(`Public HTML accessibility validation failed: file=${diagnostic.relativePath} code=${diagnostic.code} ${diagnostic.message}`);
  }
}
for (const diagnostic of validatePublicIndexCoverage(publicIndexDocuments, validatedPublicIndexPaths)) {
  failures.push(`Public HTML accessibility coverage failed: file=${diagnostic.relativePath} code=${diagnostic.code} ${diagnostic.message}`);
}
const applicationSummaries = summarizeApplications(livingSystem.applications);

for (const [locale, html] of Object.entries(pages)) {
  const expectedCanonical = locale === "tr" ? "https://aserdargun.com/tr/" : "https://aserdargun.com/";
  check(html.includes(`<html lang="${locale}" data-locale="${locale}">`), `${locale}: html language marker is missing`);
  check(html.includes(`<link rel="canonical" href="${expectedCanonical}">`), `${locale}: canonical URL is incorrect`);
  check(!html.includes("https://aserdargun.com/en/"), `${locale}: retired /en/ URL remains`);
  check(html.includes("hreflang=\"en\""), `${locale}: English hreflang is missing`);
  check(html.includes("hreflang=\"tr\""), `${locale}: Turkish hreflang is missing`);
  check(html.includes("hreflang=\"x-default\""), `${locale}: x-default hreflang is missing`);
  check(html.includes("data-language-link=\"tr\""), `${locale}: Turkish language link is missing`);
  check(html.includes("data-language-link=\"en\""), `${locale}: English language link is missing`);
  const trLanguageLink = html.match(/<a[^>]+data-language-link="tr"[^>]*>/)?.[0] ?? "";
  const enLanguageLink = html.match(/<a[^>]+data-language-link="en"[^>]*>/)?.[0] ?? "";
  check(trLanguageLink.includes('aria-label="TR —'), `${locale}: Turkish language label must contain visible text TR`);
  check(enLanguageLink.includes('aria-label="EN —'), `${locale}: English language label must contain visible text EN`);
  const wordmarkLink = html.match(/<a class="wordmark"[^>]*>/)?.[0] ?? "";
  check(wordmarkLink.includes('aria-label="SG — Serdar Gündoğdu'), `${locale}: wordmark accessible name must contain all visible text`);
  check(html.includes("/styles.css") && html.includes("/scripts.js"), `${locale}: shared root assets are not linked`);
  check(html.includes(`<link rel="stylesheet" href="${expectedStylesheetHref}">`), `${locale}: stylesheet cache version is stale`);
  check(html.includes(`<script src="${expectedScriptSrc}" defer></script>`), `${locale}: script cache version is stale`);
  check(html.includes("data-career-portrait"), `${locale}: career portrait stage is missing`);
  check(html.includes("data-career-transition"), `${locale}: career transition canvas is missing`);
  check(html.includes('width="640" height="800"'), `${locale}: normalized career portrait dimensions are missing`);
  check(!html.includes("current-stage-link"), `${locale}: current-stage Explore buttons must be removed`);

  const stageKeys = matches(html, /data-stage-key="([^"]+)"/g);
  check(JSON.stringify(stageKeys) === JSON.stringify(expectedStageKeys), `${locale}: timeline stage keys or order differ`);
  const stageNumbers = matches(html, /class="timeline-index">(\d+)<\/span>/g);
  check(JSON.stringify(stageNumbers) === JSON.stringify(expectedStageNumbers), `${locale}: timeline stage numbers must descend from 08 to 01`);
  const portraitModes = matches(html, /data-stage-portrait-mode="([^"]+)"/g);
  check(JSON.stringify(portraitModes) === JSON.stringify(expectedPortraitModes), `${locale}: portrait modes or order differ`);
  const pixelSizes = matches(html, /data-stage-pixel-size="([^"]+)"/g);
  check(JSON.stringify(pixelSizes) === JSON.stringify(expectedPixelSizes), `${locale}: analog pixel sizes must be 4, 6, 8, 11, 14 in reverse timeline order`);
  const paletteLevels = matches(html, /data-stage-palette-levels="([^"]+)"/g);
  check(JSON.stringify(paletteLevels) === JSON.stringify(expectedPaletteLevels), `${locale}: analog palette levels must be 5, 4, 4, 3, 2 in reverse timeline order`);
  const expectedBridges = locale === "tr" ? expectedTurkishBridges : expectedEnglishBridges;
  const bridges = matches(html, /class="portrait-story-bridge">([^<]+)<\/span>/g);
  check(JSON.stringify(bridges) === JSON.stringify(expectedBridges), `${locale}: physical-to-digital bridge copy differs`);
  check((html.match(/class="portrait-story"/g) || []).length === 8, `${locale}: every portrait needs one visible story`);
  const worldLabels = matches(html, /class="portrait-story-world"><span aria-hidden="true">[^<]*<\/span>\s*([^<]+)<\/span>/g);
  const expectedWorldLabels = expectedPortraitModes.map((mode) => (
    locale === "tr"
      ? mode === "pixel-analog" ? "FİZİKSEL DÜNYA" : "DİJİTAL DÜNYA"
      : mode === "pixel-analog" ? "PHYSICAL WORLD" : "DIGITAL WORLD"
  ));
  check(JSON.stringify(worldLabels) === JSON.stringify(expectedWorldLabels), `${locale}: physical/digital world labels differ`);
  for (const assetName of expectedStageImages) {
    check(html.includes(`/images/career/${assetName}.webp`), `${locale}: WebP career portrait is missing: ${assetName}`);
    check(html.includes(`/images/career/${assetName}.png`), `${locale}: PNG career portrait is missing: ${assetName}`);
  }
  const withoutCredential = html.replaceAll("AWS Certified AI Practitioner", "");
  check(!/AI Practitioner/i.test(withoutCredential), `${locale}: AI Practitioner remains as a personal title`);

  for (const anchor of expectedAnchors) {
    check(new RegExp(`id="${anchor}"`).test(html), `${locale}: #${anchor} anchor is missing`);
  }

  check(html.includes('class="app-map"'), `${locale}: application map is missing`);
  check(html.includes('class="app-map-band"'), `${locale}: standalone application map band is missing`);
  check(html.includes('aria-labelledby="app-map-title"'), `${locale}: application map heading relationship is missing`);
  check(html.includes('aria-describedby="app-map-description"'), `${locale}: application map description relationship is missing`);
  validateApplicationMapRows(locale, html);
  validateLearningSystem(locale, html);
  validateLearningHorizon(locale, html);
  validateLivingSystem(locale, html);
  validateLearningInvest(locale, html);

  const appMapIntro = html.match(/<div class="app-map-intro">([\s\S]*?)<\/div>/)?.[1] ?? "";
  const expectedKicker = locale === "tr"
    ? "Uygulama haritası · canlı adresler"
    : "Application map · live destinations";
  const expectedHeading = locale === "tr"
    ? "Tek portföy. Odaklı uygulamalar."
    : "One portfolio. Focused applications.";
  check(appMapIntro.includes(expectedKicker), `${locale}: number-neutral application map kicker is missing`);
  check(appMapIntro.includes(expectedHeading), `${locale}: number-neutral application map heading is missing`);
  check(appMapIntro.includes(applicationSummaries[locale]), `${locale}: application map count summary must come from semantic system roles`);
  const introWithoutDerivedSummary = appMapIntro.replace(applicationSummaries[locale], "");
  check(
    !/\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|sıfır|bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|\d+)\s+(?:live|core|learning|applications?|lab|labs?|long-term|horizon|horizons?|canlı|çekirdek|öğrenme|uygulamalar?|laboratuvar|uzun|vadeli|ufuk)\b/i.test(introWithoutDerivedSummary),
    `${locale}: hand-maintained application count phrase remains outside the manifest-derived summary`,
  );

  check(!html.includes("Stackfolio"), `${locale}: Stackfolio product content remains`);
  check(!html.includes("stk-aserdargun-com"), `${locale}: Stackfolio repository name remains`);
  check(!html.includes("https://github.com/aserdargun/stk-aserdargun-com"), `${locale}: Stackfolio repository URL remains`);
  check(html.includes('href="https://stk.aserdargun.com/"'), `${locale}: private system stk link is missing from primary navigation`);
  check(html.includes('href="https://inf.aserdargun.com/"'), `${locale}: private system inf link is missing from primary navigation`);
  for (const retiredUrl of retiredProjectUrls) {
    check(!html.includes(`href="${retiredUrl}"`), `${locale}: retired project URL remains: ${retiredUrl}`);
  }

  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  check(Boolean(jsonLdMatch), `${locale}: JSON-LD is missing`);
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      check(jsonLd["@type"] === "Person", `${locale}: JSON-LD type must be Person`);
      check(jsonLd.url === (locale === "tr" ? "https://aserdargun.com/tr/" : "https://aserdargun.com/"), `${locale}: JSON-LD URL is incorrect`);
      check(!String(jsonLd.image || "").includes("?"), `${locale}: JSON-LD image URL must not carry a cache-busting query`);
    } catch (error) {
      failures.push(`${locale}: JSON-LD is invalid JSON (${error.message})`);
    }
  }

  check(html.includes('rel="preload" href="/fonts/inter-var-latin.woff2"'), `${locale}: self-hosted Inter preload is missing`);
  check(html.includes('class="contact-kicker"'), `${locale}: contact section heading is missing`);
}

for (const [locale, localizedPages] of Object.entries(routePages)) {
  for (const [page, html] of Object.entries(localizedPages)) {
    validatePrimaryNavigation(locale, page, html);
    check(html.includes(`<link rel="stylesheet" href="${expectedStylesheetHref}">`), `${locale}/${page}: stylesheet cache version is stale`);
    check(html.includes(`<script src="${expectedScriptSrc}" defer></script>`), `${locale}/${page}: script cache version is stale`);
  }
  const tableWrapper = localizedPages.home.match(/<div class="app-map-table-wrap"[^>]*>/)?.[0] ?? "";
  check(tableWrapper.includes('role="region"'), `${locale}/home: application table scroll region role is missing`);
  check(tableWrapper.includes('aria-labelledby="app-map-title"'), `${locale}/home: application table scroll region label is missing`);
  check(tableWrapper.includes('tabindex="0"'), `${locale}/home: application table scroll region must be keyboard reachable`);
  const memory = localizedPages.memory;
  const memoryPath = locale === "tr" ? "/tr/memory/" : "/memory/";
  const memoryCanonical = `https://aserdargun.com${memoryPath}`;
  const emptyState = locale === "tr"
    ? "Henüz onaylanmış kamusal hafıza kaydı yok."
    : "No public memory snapshots have been approved yet.";
  check(memory.includes(`<html lang="${locale}" data-locale="${locale}">`), `${locale}/memory: localized document marker is missing`);
  check(/<title>[^<]+<\/title>/.test(memory), `${locale}/memory: localized title is missing`);
  check(/<meta name="description" content="[^"]+">/.test(memory), `${locale}/memory: localized description is missing`);
  check(memory.includes(`<link rel="canonical" href="${memoryCanonical}">`), `${locale}/memory: canonical URL differs`);
  check(memory.includes('hreflang="en"') && memory.includes('hreflang="tr"') && memory.includes('hreflang="x-default"'), `${locale}/memory: reciprocal hreflang metadata is incomplete`);
  check(memory.includes("<!-- GENERATED:public-memory:start -->") && memory.includes("<!-- GENERATED:public-memory:end -->"), `${locale}/memory: public-memory generated marker is missing`);
  check(!/<(?:base|plaintext)\b/i.test(memory), `${locale}/memory: browser-active base or plaintext is forbidden`);
  if (livingSystem.publicMemory.length === 0) {
    check(memory.includes(emptyState), `${locale}/memory: honest empty state is missing`);
    check((memory.match(/class="memory-card"/g) ?? []).length === 0, `${locale}/memory: empty allowlist rendered a memory card`);
  } else {
    check(!memory.includes(emptyState), `${locale}/memory: populated allowlist retained the empty state`);
    check(
      (memory.match(/class="memory-card"/g) ?? []).length === livingSystem.publicMemory.length,
      `${locale}/memory: rendered card count differs from the canonical allowlist`,
    );
  }

  const expectedArchiveLinks = archiveWeeks.map((week) => [
    `${locale === "tr" ? "/tr" : ""}/now/archive/${week}/`,
    week,
  ]);
  const renderedArchiveLinks = Array.from(
    localizedPages.now.matchAll(/<a class="now-archive-link" href="([^"]+)">([^<]+)<\/a>/g),
    (match) => [match[1], match[2]],
  );
  check(
    JSON.stringify(renderedArchiveLinks) === JSON.stringify(expectedArchiveLinks),
    `${locale}/now: weekly archive links must list every local pair newest-first`,
  );
}

const archiveUpdatedDates = new Map();
for (const [locale, localizedArchives] of Object.entries(archiveRoutePages)) {
  for (const [week, html] of Object.entries(localizedArchives)) {
    const localePrefix = locale === "tr" ? "/tr" : "";
    const canonicalPath = `${localePrefix}/now/archive/${week}/`;
    const englishUrl = `https://aserdargun.com/now/archive/${week}/`;
    const turkishUrl = `https://aserdargun.com/tr/now/archive/${week}/`;
    const updatedAt = html.match(/data-updated-at="(\d{4}-\d{2}-\d{2})"/)?.[1] ?? "";
    const existingDate = archiveUpdatedDates.get(week);
    if (existingDate) check(existingDate === updatedAt, `${week}: bilingual archive update dates differ`);
    else archiveUpdatedDates.set(week, updatedAt);

    validatePrimaryNavigation(locale, "archive", html);
    check(html.includes(`<html lang="${locale}" data-locale="${locale}">`), `${locale}/${week}: archive language marker is missing`);
    check(html.includes(`data-archive-week="${week}"`), `${locale}/${week}: canonical archive week is missing`);
    check(/^\d{4}-\d{2}-\d{2}$/.test(updatedAt), `${locale}/${week}: absolute archive update date is missing`);
    check(html.includes(`<time datetime="${updatedAt}">${updatedAt}</time>`), `${locale}/${week}: visible absolute archive update date differs`);
    check(html.includes(`<link rel="canonical" href="https://aserdargun.com${canonicalPath}">`), `${locale}/${week}: archive canonical URL differs`);
    check(html.includes(`<link rel="alternate" hreflang="en" href="${englishUrl}">`), `${locale}/${week}: English archive hreflang differs`);
    check(html.includes(`<link rel="alternate" hreflang="tr" href="${turkishUrl}">`), `${locale}/${week}: Turkish archive hreflang differs`);
    check(html.includes(`<link rel="alternate" hreflang="x-default" href="${englishUrl}">`), `${locale}/${week}: default archive hreflang differs`);
    check(
      html.includes(`<a class="now-archive-back" href="${locale === "tr" ? "/tr/now/" : "/now/"}">${locale === "tr" ? "Güncel Şimdi sayfasına dön" : "Back to current Now"}</a>`),
      `${locale}/${week}: archive back-to-current link differs`,
    );
    check(
      (html.match(/<article class="now-card now-card-this">/g) ?? []).length === livingSystem.now.items.length,
      `${locale}/${week}: archive card count differs from canonical Now data`,
    );
    check(!/<(?:form|input|textarea|select)\b|contenteditable=|data-(?:edit|delete|publish)/i.test(html), `${locale}/${week}: archive exposes a mutation control`);
    check(html.includes(`<link rel="stylesheet" href="${expectedStylesheetHref}">`), `${locale}/${week}: archive stylesheet cache version is stale`);
    check(html.includes(`<script src="${expectedScriptSrc}" defer></script>`), `${locale}/${week}: archive script cache version is stale`);
    const ids = matches(html, /\sid="([^"]+)"/g);
    check(new Set(ids).size === ids.length, `${locale}/${week}: archive document IDs must be unique`);
  }
}

const localDestinationSources = [
  ...Object.values(routePages).flatMap((localizedPages) => Object.values(localizedPages)),
  ...Object.values(archiveRoutePages).flatMap((localizedPages) => Object.values(localizedPages)),
];
const localDestinations = new Set(localDestinationSources.flatMap((html) => Array.from(
  html.matchAll(/<a class="(?:nav-links__primary-link|nav-links__secondary-link|living-system-card)" href="(\/[^"]*)"/g),
  (match) => match[1],
)));
for (const destination of localDestinations) {
  const url = new URL(destination, "https://aserdargun.com");
  const relativePath = url.pathname === "/" ? "index.html" : `${url.pathname.slice(1)}index.html`;
  const target = await readRoute(relativePath);
  check(target.length > 0, `Local navigation destination does not exist: ${destination}`);
  if (url.hash) {
    const id = url.hash.slice(1);
    check(target.includes(`id="${id}"`), `Local navigation fragment does not exist: ${destination}`);
  }
}

const externalAnchorPattern = /<a[^>]+href="(https:\/\/[^"#]+)"/g;
const enExternalLinks = matches(pages.en, externalAnchorPattern).sort();
const trExternalLinks = matches(pages.tr, externalAnchorPattern).sort();
check(JSON.stringify(enExternalLinks) === JSON.stringify(trExternalLinks), "TR/EN external links differ");

check(pages.en.includes("https://aserdargun.com/images/og-ascii.jpg"), "English Open Graph image is incorrect");
check(pages.tr.includes("https://aserdargun.com/images/og-ascii-tr.jpg"), "Turkish Open Graph image is incorrect");
check(pages.en.includes('<meta property="og:image:type" content="image/jpeg">'), "English Open Graph image MIME type is missing");
check(pages.tr.includes('<meta property="og:image:type" content="image/jpeg">'), "Turkish Open Graph image MIME type is missing");
check(pages.en.includes("AI Engineer"), "English AI Engineer status is missing");
check(pages.tr.includes("AI Engineer"), "Turkish AI Engineer status is missing");
check(pages.en.includes("Reading direction · 08 → 01"), "English reverse-chronology explanation is missing");
check(pages.tr.includes("Okuma yönü · 08 → 01"), "Turkish reverse-chronology explanation is missing");
check(pages.en.includes("https://gpu.aserdargun.com/") && pages.tr.includes("https://gpu.aserdargun.com/"), "Kernel Atlas link is missing");
check(pages.en.includes("https://usl.aserdargun.com/") && pages.tr.includes("https://usl.aserdargun.com/"), "Unsloth Studio Learning link is missing");
check(pages.en.includes("One portfolio. Focused applications."), "English application map definition is missing");
check(pages.tr.includes("Tek portföy. Odaklı uygulamalar."), "Turkish application map definition is missing");
check(!pages.en.includes("<h3>GPU Kernel Engineer") && !pages.tr.includes("<h3>GPU Kernel Engineer"), "Legacy GPU Kernel Engineer career title is still present");
check(styles.includes(".career-transition"), "Career transition canvas styles are missing");
check(styles.includes(".career-portrait-fallback"), "Career portrait fallback styles are missing");
check(/\.living-system-grid\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\);/.test(styles), "Living-system grid must use five minmax-safe columns where space permits");
check(styles.includes(".living-system-grid {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n  }"), "Living-system grid must collapse to two columns");
check(styles.includes(".living-system-grid {\n    grid-template-columns: minmax(0, 1fr);\n  }"), "Living-system grid must collapse to one column");
check(/\.living-system-card\s*\{[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere;/.test(styles), "Living-system cards must prevent horizontal overflow");
check(/\.has-js \.timeline-step\s*\{[^}]*opacity:\s*1;/.test(styles), "Inactive timeline steps must not reduce descendant contrast with parent opacity");
check(/\.section-kicker\s*\{[^}]*color:\s*rgba\(18, 19, 16, 0\.65\);/.test(styles), "Section kicker contrast is below the required token");
const cssRules = scanCssRules(styles);
check(
  !cssRules.some((rule) => rule.selectors.some(isRetiredRowSelector)),
  "Stackfolio-first application map styling remains",
);
const requiredRepositoryCodeDeclarations = [
  ["color", "inherit"],
  ["font", "inherit"],
  ["overflow-wrap", "anywhere"],
  ["white-space", "inherit"],
];
const repositoryCodeRules = cssRules.filter(
  (rule) => rule.selectors.some(isCanonicalRepositoryCodeSelector),
);
check(repositoryCodeRules.length > 0, "Repository code labels do not inherit application map link styling");
check(
  repositoryCodeRules.some((rule) => requiredRepositoryCodeDeclarations.every(
    ([property, value]) => declarationExists(rule.declarations, property, value),
  )),
  "Repository code labels must declare color: inherit, font: inherit, overflow-wrap: anywhere, and white-space: inherit in the same canonical rule",
);
check(styles.includes(".app-map tbody td:nth-of-type(1) span"), "Application descriptions are not styled");
for (const selector of ["credentials-heading", "credentials small"]) {
  const selectorPattern = selector.replace(" ", "\\s+");
  check(new RegExp(`\\.${selectorPattern}\\s*\\{[^}]*color:\\s*rgba\\(18, 19, 16, 0\\.7\\);`).test(styles), `${selector} contrast is below the required token`);
}

const rootPage = await readFile(path.join(root, "index.html"), "utf8");
check(rootPage.includes('<html lang="en" data-locale="en">'), "Root English language marker is missing");
check(rootPage.includes('<link rel="canonical" href="https://aserdargun.com/">'), "Root canonical URL is incorrect");
check(rootPage.includes('<meta property="og:url" content="https://aserdargun.com/">'), "Root Open Graph URL is incorrect");
check(rootPage.includes(`<link rel="stylesheet" href="${expectedStylesheetHref}">`), "Root stylesheet cache version is stale");
check(rootPage.includes(`<script src="${expectedScriptSrc}" defer></script>`), "Root script cache version is stale");
check(rootPage.includes('"url": "https://aserdargun.com/"'), "Root JSON-LD URL is incorrect");
check(!rootPage.includes("window.location.replace"), "Root must not redirect with client JavaScript");
check(rootPage.includes('href="/tr/"') && rootPage.includes('data-language-link="en"'), "Root language links are missing");
check(JSON.stringify(matches(rootPage, /data-stage-key="([^"]+)"/g)) === JSON.stringify(expectedStageKeys), "Root timeline stage keys or order differ");
check(JSON.stringify(matches(rootPage, /class="timeline-index">(\d+)<\/span>/g)) === JSON.stringify(expectedStageNumbers), "Root timeline stage numbers must descend from 08 to 01");
check(JSON.stringify(matches(rootPage, /data-stage-portrait-mode="([^"]+)"/g)) === JSON.stringify(expectedPortraitModes), "Root portrait modes or order differ");
check(JSON.stringify(matches(rootPage, /data-stage-pixel-size="([^"]+)"/g)) === JSON.stringify(expectedPixelSizes), "Root analog pixel sizes must be 4, 6, 8, 11, 14 in reverse timeline order");
check(JSON.stringify(matches(rootPage, /data-stage-palette-levels="([^"]+)"/g)) === JSON.stringify(expectedPaletteLevels), "Root analog palette levels must be 5, 4, 4, 3, 2 in reverse timeline order");
check(JSON.stringify(matches(rootPage, /class="portrait-story-bridge">([^<]+)<\/span>/g)) === JSON.stringify(expectedEnglishBridges), "Root physical-to-digital bridge copy differs");
check((rootPage.match(/class="portrait-story"/g) || []).length === 8, "Root every portrait needs one visible story");
const rootWorldLabels = matches(rootPage, /class="portrait-story-world"><span aria-hidden="true">[^<]*<\/span>\s*([^<]+)<\/span>/g);
check(JSON.stringify(rootWorldLabels) === JSON.stringify(expectedPortraitModes.map((mode) => mode === "pixel-analog" ? "PHYSICAL WORLD" : "DIGITAL WORLD")), "Root physical/digital world labels differ");
for (const assetName of expectedStageImages) {
  check(rootPage.includes(`/images/career/${assetName}.webp`), `Root WebP career portrait is missing: ${assetName}`);
  check(rootPage.includes(`/images/career/${assetName}.png`), `Root PNG career portrait is missing: ${assetName}`);
}
check(!/AI Practitioner/i.test(rootPage.replaceAll("AWS Certified AI Practitioner", "")), "Root AI Practitioner personal title remains");
validateApplicationMapRows("Root", rootPage);
validateLearningSystem("Root", rootPage);
validateLearningInvest("Root", rootPage);
const rootAppMapIntro = rootPage.match(/<div class="app-map-intro">([\s\S]*?)<\/div>/)?.[1] ?? "";
check(rootAppMapIntro.includes("Application map · live destinations"), "Root number-neutral application map kicker is missing");
check(rootAppMapIntro.includes("One portfolio. Focused applications."), "Root number-neutral application map heading is missing");
check(!/\b(?:05|five)\b/i.test(rootAppMapIntro), "Root stale application count remains in the map introduction");
check(!rootPage.includes("Stackfolio"), "Root Stackfolio product content remains");
check(!rootPage.includes("stk-aserdargun-com"), "Root Stackfolio repository name remains");
check(!rootPage.includes("https://github.com/aserdargun/stk-aserdargun-com"), "Root Stackfolio repository URL remains");
check(rootPage.includes('href="https://stk.aserdargun.com/"'), "Root private system stk link is missing from primary navigation");
check(rootPage.includes('href="https://inf.aserdargun.com/"'), "Root private system inf link is missing from primary navigation");
check(rootPage.includes("<h3>AI Engineer</h3>") && !rootPage.includes("<h3>GPU Kernel Engineer"), "Root AI Engineer career content is incorrect");
check(!rootPage.includes("current-stage-link"), "Root current-stage Explore buttons must be removed");

const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
check(sitemap.includes("<loc>https://aserdargun.com/</loc>"), "Sitemap is missing root URL");
check(!sitemap.includes("https://aserdargun.com/en/"), "Sitemap must not list the redirected /en/ URL");
check(sitemap.includes("<loc>https://aserdargun.com/tr/</loc>"), "Sitemap is missing /tr/");
const publicMemoryUrls = {
  en: "https://aserdargun.com/memory/",
  tr: "https://aserdargun.com/tr/memory/",
};
const memoryLocations = matches(sitemap, /<loc>(https:\/\/aserdargun\.com\/(?:tr\/)?memory\/[^<]*)<\/loc>/g);
check(
  JSON.stringify(memoryLocations) === JSON.stringify([publicMemoryUrls.en, publicMemoryUrls.tr]),
  "Sitemap must list only the English and Turkish public-memory index routes",
);
for (const url of Object.values(publicMemoryUrls)) {
  const entry = sitemap.match(new RegExp(`<url>\\s*<loc>${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/loc>[\\s\\S]*?<\\/url>`))?.[0] ?? "";
  check(entry.includes(`hreflang="en" href="${publicMemoryUrls.en}"`), `Sitemap English memory alternate differs: ${url}`);
  check(entry.includes(`hreflang="tr" href="${publicMemoryUrls.tr}"`), `Sitemap Turkish memory alternate differs: ${url}`);
  check(entry.includes(`hreflang="x-default" href="${publicMemoryUrls.en}"`), `Sitemap default memory alternate differs: ${url}`);
}
check(!sitemap.includes("https://nxt.aserdargun.com/p/"), "Sitemap must never list an individual NXT public snapshot URL");
for (const week of archiveWeeks) {
  const englishUrl = `https://aserdargun.com/now/archive/${week}/`;
  const turkishUrl = `https://aserdargun.com/tr/now/archive/${week}/`;
  for (const url of [englishUrl, turkishUrl]) {
    const entry = sitemap.match(new RegExp(`<url>\\s*<loc>${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/loc>[\\s\\S]*?<\\/url>`))?.[0] ?? "";
    check(entry.length > 0, `Sitemap is missing archive URL: ${url}`);
    check(entry.includes(`<lastmod>${archiveUpdatedDates.get(week)}</lastmod>`), `Sitemap archive lastmod differs: ${url}`);
    check(entry.includes(`hreflang="en" href="${englishUrl}"`), `Sitemap English archive alternate differs: ${url}`);
    check(entry.includes(`hreflang="tr" href="${turkishUrl}"`), `Sitemap Turkish archive alternate differs: ${url}`);
    check(entry.includes(`hreflang="x-default" href="${englishUrl}"`), `Sitemap default archive alternate differs: ${url}`);
  }
}

for (const asset of [
  "images/og-ascii.jpg",
  "images/og-ascii-tr.jpg",
  "fonts/inter-var-latin.woff2",
  "fonts/inter-var-latin-ext.woff2",
  "styles.css",
  "scripts.js",
]) {
  try {
    await stat(path.join(root, asset));
  } catch {
    failures.push(`Required asset is missing: ${asset}`);
  }
}

const trOgBuffer = await readFile(path.join(root, "images/og-ascii-tr.jpg"));
const trOgDimensions = readJpegDimensions(trOgBuffer);
check(trOgDimensions?.width === 1200 && trOgDimensions?.height === 630, "Turkish Open Graph image must be 1200×630 JPEG");
check(trOgBuffer.length <= 400_000, "Turkish Open Graph image exceeds 400 KB");

const enOgBuffer = await readFile(path.join(root, "images/og-ascii.jpg"));
check(readJpegDimensions(enOgBuffer)?.width === 1200 && readJpegDimensions(enOgBuffer)?.height === 630, "English Open Graph image must be 1200×630 JPEG");
check(enOgBuffer.length <= 400_000, "English Open Graph image exceeds 400 KB");

for (const assetName of expectedStageImages) {
  const pngPath = path.join(root, `images/career/${assetName}.png`);
  const webpPath = path.join(root, `images/career/${assetName}.webp`);
  const pngBuffer = await readFile(pngPath).catch(() => null);
  const pngStats = await stat(pngPath).catch(() => null);
  const webpStats = await stat(webpPath).catch(() => null);

  check(Boolean(pngBuffer), `Career PNG is missing: ${assetName}`);
  check(Boolean(webpStats), `Career WebP is missing: ${assetName}`);
  if (pngBuffer) {
    const dimensions = readPngDimensions(pngBuffer);
    check(dimensions?.width === 640 && dimensions?.height === 800, `Career PNG must be 640×800: ${assetName}`);
    check(pngHasAlpha(pngBuffer), `Career PNG must support transparency: ${assetName}`);
  }
  if (pngStats) check(pngStats.size <= 250_000, `Career PNG exceeds 250 KB after palette optimization: ${assetName}`);
  if (webpStats) check(webpStats.size <= 300_000, `Career WebP exceeds 300 KB: ${assetName}`);
}

if (failures.length > 0) {
  console.error("Site validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("Site validation passed: TR/EN routes, application map, timeline parity, metadata, links, and assets are consistent.");
}
