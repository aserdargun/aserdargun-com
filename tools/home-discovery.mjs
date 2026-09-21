// Homepage editorial selection. Addresses and research parents come from the registry.
const copy = {
  tr: {
    start: 'Neyi keşfetmek istiyorsun?',
    intro: 'Merak ettiğin konudan başla; bir deneyle derinleştir.',
    experiments: 'Bir fikri keşfet. Bir deney yap.',
    selection: 'Altı başlangıç deneyi. Bir soru seç, değişkenleri incele, sonucu yorumla.',
    scope: 'Görseller konuları temsil eder. Deneyler eğitim amaçlıdır; uygulamalar bağımsız çalışır.',
    explore: 'Deneyi keşfet', research: 'Temeli oku',
    next: 'Bir sonraki adımını seç.',
    nextIntro: 'Rehberli bir sırayla ilerle veya merak ettiğin başka bir uygulamaya geç.',
    journey: 'Öğrenme yolunu aç', all: 'Tüm uygulamaları gör',
    routes: [
      ['Modelleri anla', 'Bir isteğin tokenlara nasıl dönüştüğünü ve sunum kaynaklarının beklemeyi nasıl etkilediğini incele.', 'LLM → TFL', 'Token akışından başla', 'tfl'],
      ['Ajanları keşfet', 'Bir ajanın araç kullanımını, yürütme adımlarını ve insan onayına ihtiyaç duyduğu noktaları keşfet.', 'HNS → ARL', 'Ajan yürütmesinden başla', 'arl'],
      ['Fiziksel dünyayı incele', 'Önce pompa bileşenlerini tanı; ardından dijital üçüzde tahmin ve sonuçları karşılaştır.', 'PDT → DTR', 'Pompa anatomisinden başla', 'pdt'],
    ],
  },
  en: {
    start: 'What would you like to explore?',
    intro: 'Start with a question. Take it further with an experiment.',
    experiments: 'Explore an idea. Run an experiment.',
    selection: 'Six starting experiments. Pick a question, explore the variables, interpret the outcome.',
    scope: 'Illustrations represent the topics. Experiments are educational; applications run independently.',
    explore: 'Explore the experiment', research: 'Read the foundations',
    next: 'Choose your next step.',
    nextIntro: 'Follow a guided sequence or explore another application that sparks your curiosity.',
    journey: 'Open the learning path', all: 'View all applications',
    routes: [
      ['Understand models', 'Explore how a request becomes tokens and how serving resources affect the wait.', 'LLM → TFL', 'Start with token flow', 'tfl'],
      ['Explore agents', 'Inspect tool use, execution steps, and the points where an agent needs human approval.', 'HNS → ARL', 'Start with agent execution', 'arl'],
      ['Explore the physical world', 'Get to know pump components, then compare predictions and outcomes in a digital triplet.', 'PDT → DTR', 'Start with pump anatomy', 'pdt'],
    ],
  },
};

const experiments = [
  {code: 'tfl',
    tr: ['Bir token neden bekler?', 'Sentetik simülasyon', 'Kuyruk, ön doldurma ve üretim aşamalarını incele; sunum koşullarının gecikmeye etkisini karşılaştır.'],
    en: ['Why does a token wait?', 'Synthetic simulation', 'Explore queuing, prefill, and decoding; compare how serving conditions affect latency.']},
  {code: 'gex',
    tr: ['Bir kernel GPU’da nasıl yürür?', 'Eğitim modeli', 'Warp maskelerini ve bellek erişimini keşfet. Paralel yürütmeyi bir eğitim modeli üzerinde izle.'],
    en: ['How does a kernel run on a GPU?', 'Educational model', 'Explore warp masks and memory access. Follow parallel execution in an educational model.']},
  {code: 'arl',
    tr: ['Bir ajan ne zaman onay ister?', 'Ajan simülasyonu', 'Araç kullanımını, yürütme kanıtlarını ve tek kullanımlık insan onayını adım adım incele.'],
    en: ['When does an agent need approval?', 'Agent simulation', 'Inspect tool use, execution evidence, and single-use human approval step by step.']},
  {code: 'pdt',
    tr: ['Bir pompanın içinde ne var?', '3B öğrenme deneyimi', 'P-101’in bileşenlerini ve sensör konumlarını keşfet; kurgulanmış çalışma durumlarını karşılaştır.'],
    en: ['What is inside a pump?', '3D learning experience', 'Explore P-101 components and sensor locations; compare illustrative operating conditions.']},
  {code: 'dtr',
    tr: ['Tahmin ve sonuç neden farklılaşır?', 'Sentetik simülasyon', 'Pompalama alternatiflerini karşılaştır, kararını onayla ve tahminle simülasyon sonucunu birlikte incele.'],
    en: ['Why do predictions and outcomes differ?', 'Synthetic simulation', 'Compare pumping alternatives, approve a decision, and inspect its prediction alongside the simulated outcome.']},
  {code: 'hex',
    tr: ['Bir robot nasıl hareket eder?', 'Kinematik öğrenme modeli', 'İnsansı robotun eklemlerini, eyleyicilerini ve sensörlerini keşfet; kinematik hareket örneklerini incele.'],
    en: ['How does a robot move?', 'Kinematic learning model', 'Explore humanoid joints, actuators, and sensors; inspect examples of kinematic motion.']},
];

function escape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

const arrow = '<svg class="home-discovery__arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false"><path d="M3 10h13M11 5l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Small teaching symbols, not application screenshots or measured results.
function illustration(code) {
  const shapes = {
    tfl: '<path class="discovery-muted" d="M30 66h270"/><rect x="24" y="45" width="48" height="42" rx="5"/><rect x="94" y="45" width="48" height="42" rx="5"/><rect x="164" y="45" width="48" height="42" rx="5"/><rect class="discovery-accent-fill" x="234" y="45" width="48" height="42" rx="5"/><path d="m42 58-8 8 8 8m12-16 8 8-8 8m57-5h14m-14 6h10m60-6h14m-14 6h10"/><path class="discovery-dark" d="M249 61h18m-18 8h12"/><path class="discovery-muted" d="M48 101v8m70-8v8m70-8v8m70-8v8"/>',
    gex: '<rect x="26" y="42" width="58" height="48" rx="5"/><path d="m43 57-8 9 8 9m24-18 8 9-8 9m-15-21-5 24M88 66h30m-7-6 7 6-7 6"/><rect class="discovery-muted" x="132" y="19" width="157" height="96" rx="5"/>' + Array.from({length: 24}, (_, i) => `<rect ${[0, 7, 10, 14, 21].includes(i) ? 'class="discovery-accent-fill"' : 'class="discovery-muted"'} x="${143 + i % 6 * 23}" y="${30 + Math.floor(i / 6) * 21}" width="15" height="14" rx="1"/>`).join(''),
    arl: '<path class="discovery-muted" d="M24 65h62m42 0h36m48 0h68m-92 24v32h92"/><rect x="23" y="45" width="58" height="40" rx="5"/><path d="m43 65 6 6 13-13"/><rect x="99" y="45" width="39" height="40" rx="5"/><path d="M109 58h18m-18 8h18m-18 8h10"/><path class="discovery-accent" d="m188 37 28 28-28 28-28-28Z"/><circle class="discovery-accent" cx="188" cy="61" r="3"/><path class="discovery-accent" d="M188 68v8"/><rect x="251" y="41" width="46" height="48" rx="5"/><circle cx="274" cy="56" r="6"/><path d="M263 78v-4a11 11 0 0 1 22 0v4m-14 37 9 6-9 6"/>',
    pdt: '<path class="discovery-muted" d="M23 73h70m145 0h66m-18-6 9 6-9 6M119 113h113"/><path d="M86 60h31v27H86zM155 25h28v26m-39 65V99m52 17V96M197 59h42v29h-42"/><circle cx="160" cy="73" r="39"/><circle class="discovery-accent" cx="160" cy="73" r="25"/><circle cx="160" cy="73" r="7"/><path class="discovery-accent" d="M160 66c-14-3-20-10-16-17m23 24c8-10 17-12 22-7m-28 14c7 11 6 20-1 25m-7-28c-13 5-21 1-24-5"/><path d="M167 73h97M253 60h15v26h-15"/>',
    dtr: '<path class="discovery-muted" d="M37 23v92h252"/><path stroke-dasharray="5 6" d="M38 107C70 107 70 37 114 39s53 65 95 45 50-20 78-15"/><path class="discovery-accent" d="M38 107C79 111 79 57 113 58s55 52 91 37 55-16 83-6"/><path class="discovery-muted" d="M113 39v19m96 26v8"/><circle class="discovery-accent-fill" cx="113" cy="58" r="3"/><circle class="discovery-accent-fill" cx="209" cy="93" r="3"/>',
    hex: '<path d="M45 116h91v7H45zM69 116V95a20 20 0 0 1 40 0v21M98 79l38-39m-23 56 38-43m7-18 59-12m-57 26 59-13"/><circle cx="89" cy="95" r="13"/><circle class="discovery-accent" cx="149" cy="39" r="13"/><circle class="discovery-accent" cx="230" cy="26" r="13"/><circle cx="89" cy="95" r="5"/><circle cx="149" cy="39" r="5"/><circle cx="230" cy="26" r="5"/><path class="discovery-muted" stroke-dasharray="4 6" d="M253 31q41 25 40 66"/><path d="m288 90 5 9 7-8"/><circle class="discovery-accent-fill" cx="293" cy="108" r="3"/>',
  };
  return `<svg class="discovery-illustration" viewBox="0 0 320 140" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shapes[code]}</svg>`;
}

export function renderHomeDiscovery({locale, data}) {
  const text = copy[locale];
  if (!text) throw new Error(`Unknown discovery locale: ${locale}`);
  const root = locale === 'tr' ? '/tr/' : '/';
  const appByCode = (code) => {
    const app = data.applications.find((item) => item.code === code);
    if (!app?.address) throw new Error(`Homepage discovery needs a registered address for ${code}`);
    return app;
  };
  const external = (app, content, className) => `<a class="${className}" href="${escape(app.address)}" target="_blank" rel="noreferrer"><span class="sr-only">${locale === 'tr' ? 'yeni sekmede açılır' : 'opens in a new tab'}</span>${content}</a>`;
  const routes = text.routes.map(([title, description, path, action, code], index) => `<article class="discovery-route">
          <span class="discovery-route__number" aria-hidden="true">0${index + 1}</span>
          <h3>${escape(title)}</h3>
          <p>${escape(description)}</p>
          <p class="discovery-route__path">${escape(path)}</p>
          <a class="home-discovery__link" href="#experiment-${code}">${escape(action)} ${arrow}</a>
        </article>`).join('\n');
  const cards = experiments.map(({code, [locale]: [title, kind, description]}) => {
    const app = appByCode(code);
    const parent = appByCode(app.parentApp);
    return `<article class="discovery-experiment" id="experiment-${code}" tabindex="-1" aria-labelledby="experiment-${code}-title-${locale}" data-featured-experiment="${code}">
          <div class="discovery-experiment__visual">${illustration(code)}</div>
          <div class="discovery-experiment__body">
            <h3 id="experiment-${code}-title-${locale}">${escape(title)}</h3>
            <p class="discovery-experiment__kind"><code>${code.toUpperCase()}</code><span aria-hidden="true"> · </span>${escape(kind)}</p>
            <p class="discovery-experiment__description">${escape(description)}</p>
            <div class="discovery-experiment__actions">
              ${external(app, `${escape(text.explore)}<span class="sr-only"> · ${code.toUpperCase()}</span> ${arrow}`, 'home-discovery__link')}
              ${external(parent, `${escape(text.research)}<span class="sr-only"> · ${parent.code.toUpperCase()}</span>`, 'home-discovery__secondary')}
            </div>
          </div>
        </article>`;
  }).join('\n');
  return `      <div class="home-discovery" id="explore">
      <section class="discovery-start" aria-labelledby="discovery-start-${locale}">
        <h2 id="discovery-start-${locale}">${escape(text.start)}</h2>
        <p class="home-discovery__intro">${escape(text.intro)}</p>
        <div class="discovery-routes">${routes}</div>
      </section>
      <section class="discovery-experiments" aria-labelledby="practice-title-${locale}">
        <h2 id="practice-title-${locale}">${escape(text.experiments)}</h2>
        <p class="home-discovery__intro">${escape(text.selection)}</p>
        <div class="discovery-grid">${cards}</div>
        <p class="home-discovery__scope">${escape(text.scope)}</p>
      </section>
      <section class="discovery-next" aria-labelledby="discovery-next-${locale}">
        <h2 id="discovery-next-${locale}">${escape(text.next)}</h2>
        <p class="home-discovery__intro">${escape(text.nextIntro)}</p>
        <div class="discovery-next__actions">
          <a class="home-discovery__link" href="${root}journey/">${escape(text.journey)} ${arrow}</a>
          <a class="home-discovery__secondary" href="${root}applications/">${escape(text.all)} ${arrow}</a>
        </div>
      </section>
      </div>`;
}
