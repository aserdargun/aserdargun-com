import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

for (const locale of ["en", "tr"]) {
  const root = locale === "tr" ? "tr/" : "";
  test(`${locale}: the homepage, About, and Application Map have distinct responsibilities`, async () => {
    const [home, about, applications, data, journey] = await Promise.all([
      read(`${root}index.html`), read(`${root}about/index.html`),
      read(`${root}applications/index.html`), read("data/living-system.json").then(JSON.parse), read(`${root}journey/index.html`),
    ]);
    assert.match(home, /<main[^>]*>\s*<!-- GENERATED:system-focus:start -->\s*<section class="system-focus"/);
    assert.match(home, /<h1[^>]*>[^<]+<\/h1>/);
    assert.doesNotMatch(home, /class="(?:journey-shell|app-map|section section-about)"/);
    assert.doesNotMatch(home, /class="(?:learning-study|learning-flow|learning-horizon)"/);
    assert.equal((journey.match(/class="learning-stage-label"/g) ?? []).length, 6);
    assert.ok(journey.includes('id="horizon"'));
    assert.ok(home.includes(`href="/${root}journey/"`));
    assert.equal((about.match(/data-timeline-step /g) ?? []).length, 8);
    for (const id of ["journey", "about", "approach"]) assert.ok(about.includes(`id="${id}"`));
    assert.doesNotMatch(about, /class="(?:learning-system|app-map)"/);
    assert.equal((applications.match(/data-app-code=/g) ?? []).length, data.applications.length);
    assert.doesNotMatch(applications, /class="(?:journey-shell|learning-system)"/);
    for (const html of [home, about, applications]) {
      assert.ok(html.includes(`href="/${root}applications/"`));
      assert.ok(html.includes(`href="/${root}about/"`));
    }
  });

  test(`${locale}: routed metadata and agent discovery identify the author and correct language pair`, async () => {
    for (const page of ["about", "applications", "journey"]) {
      const html = await read(`${root}${page}/index.html`);
      const url = `https://aserdargun.com/${root}${page}/`;
      assert.ok(html.includes(`<link rel="canonical" href="${url}">`));
      for (const prefix of ["", "tr/"]) {
        assert.ok(html.includes(`href="/${prefix}${page}/" lang=`));
        assert.ok(html.includes(`href="https://aserdargun.com/${prefix}${page}/"`));
      }
      const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
      assert.equal(schema.url, url);
      assert.equal(schema["@type"], page === "about" ? "Person" : page === "journey" ? "WebPage" : "CollectionPage");
      assert.ok(html.includes('href="/llms.txt"'));
    }
    const home = await read(`${root}index.html`);
    const schema = JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema.name, "AI Learning System · Serdar Gündoğdu");
    assert.equal(schema.creator["@id"], "https://aserdargun.com/about/#person");
  });
}

test("legacy homepage fragments retain deep links without redirecting new routes", async () => {
  const source = await read("scripts.js");
  for (const root of ["/", "/tr/"]) {
    for (const hash of ["#about", "#approach", "#journey", "#journey-stage-01", "#apps", "#learning", "#horizon"]) {
      const redirects = [];
      const context = {
        window: { location: { pathname: root, hash, replace: (url) => redirects.push(url) } },
        document: { documentElement: { classList: { add() {} } }, addEventListener() {} },
      };
      vm.runInNewContext(source, context);
      assert.deepEqual(redirects, hash === "#apps" ? [`${root}applications/`]
        : hash === "#horizon" ? [`${root}journey/#horizon`] : hash === "#learning" ? [] : [`${root}about/${hash}`]);
      context.window.location.pathname = `${root}about/`;
      redirects.length = 0;
      vm.runInNewContext(source, { ...context });
      assert.deepEqual(redirects, []);
    }
  }
});

test("legacy fragments also redirect when only the hash changes in an already-open homepage", async () => {
  const source = await read("scripts.js");
  const redirects = [];
  const listeners = new Map();
  const context = {
    window: {
      location: { pathname: "/tr/", hash: "", replace: (url) => redirects.push(url) },
      addEventListener: (name, callback) => listeners.set(name, callback),
    },
    document: { documentElement: { classList: { add() {} } }, addEventListener() {} },
  };
  vm.runInNewContext(source, context);
  assert.deepEqual(redirects, []);
  context.window.location.hash = "#journey-stage-01";
  listeners.get("hashchange")();
  assert.deepEqual(redirects, ["/tr/about/#journey-stage-01"]);
  context.window.location.hash = "#learning";
  listeners.get("hashchange")();
  assert.equal(redirects.length, 1);
});
