import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applicationLocaleRoutes, applicationUrl } from './application-links.mjs';
import { systemFocusApplications } from './system-focus.mjs';

const data = JSON.parse(await readFile(new URL('../data/living-system.json', import.meta.url), 'utf8'));
const applications = systemFocusApplications(data.applications);

test('every diagram and catalog application has an explicit language route', () => {
  assert.deepEqual(Object.keys(applicationLocaleRoutes).sort(), applications.map(app => app.code).sort());
});

test('English and Turkish entry routes bypass the destination default language', () => {
  const paths = { llm: ['/en/', '/tr/'], aos: ['/en/', '/tr/'], lcl: ['/en/', '/tr/'], gpu: ['/en/', '/'],
    cld: ['/?lang=en', '/?lang=tr'], dpl: ['/?lang=en', '/?lang=tr'], cul: ['/?lang=en', '/?lang=tr'], mem: ['/?lang=en', '/?lang=tr'],
    bee: ['/?lang=en', '/?lang=tr'], dtr: ['/?lang=en', '/?lang=tr'], gex: ['/gex/anatomy?lang=en', '/gex/anatomy?lang=tr'] };
  for (const [code, [en, tr]] of Object.entries(paths)) {
    const app = applications.find(app => app.code === code);
    assert.equal(applicationUrl(app, 'en'), `https://${code}.aserdargun.com${en}`);
    assert.equal(applicationUrl(app, 'tr'), `https://${code}.aserdargun.com${tr}`);
  }
});

for (const locale of ['en', 'tr']) {
  test(`${locale}: generated diagram, catalog and experiment links preserve the selected language`, async () => {
    const prefix = locale === 'tr' ? 'tr/' : '';
    for (const path of [`${prefix}index.html`, `${prefix}applications/index.html`]) {
      const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
      const links = [...html.matchAll(/href="(https:\/\/([a-z]{3})\.aserdargun\.com[^\"]*)"/g)];
      assert.ok(links.length >= 30);
      for (const [, href, code] of links) assert.equal(href, applicationUrl(applications.find(app => app.code === code), locale), `${path}: ${code}`);
    }
  });
}

test('single-language destinations retain their real entry point', () => {
  for (const code of ['aia', 'pol', 'itl', 'eng']) {
    const app = applications.find(app => app.code === code);
    for (const locale of ['en', 'tr']) assert.equal(applicationUrl(app, locale), app.address);
  }
});
