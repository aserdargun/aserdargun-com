// Public entry routes checked against each application's router or locale reader.
// DPL, CUL, DTR and MEM consume ?lang through their matching local fixes.
export const applicationLocaleRoutes = {
  aia: { en: '/', tr: '/' }, // English-only research console.
  pol: { en: '/', tr: '/' }, // English-only.
  itl: { en: '/', tr: '/' }, // English-only.
  eng: { en: '/', tr: '/' }, // English-only.
  gpu: { en: '/en/', tr: '/' },
  ...Object.fromEntries(['llm', 'hns', 'sec', 'ctx', 'evl', 'usl', 'lcl', 'wfm', 'swi', 'aos'].map((code) => [code, { en: '/en/', tr: '/tr/' }])),
  ...Object.fromEntries(['ant', 'bee', 'tfl', 'arl', 'adp', 'wml', 'dtr', 'pdt', 'hex', 'dcl', 'dpl', 'cul', 'mem', 'cld'].map((code) => [code, { en: '/?lang=en', tr: '/?lang=tr' }])),
  gex: { en: '/gex/anatomy?lang=en', tr: '/gex/anatomy?lang=tr' },
};

export function applicationUrl(application, locale) {
  if (!['en', 'tr'].includes(locale)) throw new Error(`Unsupported site locale: ${locale}`);
  const route = applicationLocaleRoutes[application.code]?.[locale];
  if (!route) return application.address;
  return new URL(route, application.address).href;
}
