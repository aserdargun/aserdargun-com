# Yeni Subdomain Onboarding Template

Yeni bir aserdargun subdomain projesi (örn. `mvp-aserdargun-com`) eklendiğinde izlenecek checklist. Bu template `repo-auditor` tarafından doldurulur, kullanıcıya sunulur, onay sonrası `content-curator` + `brand-guardian` uygular.

## Önce: kullanıcı onayı

Yeni subdomain projesi başlatmak için:

- Proje kodu (3 harf, örn. `mvp`)
- Proje tam adı (örn. `MVP Architecture Atlas`)
- Türü: atlas | observatory | system | utility
- Statü: live | preview | private
- Repository: `https://github.com/aserdargun/<code>-aserdargun-com`
- Subdomain: `https://<code>.aserdargun.com/`
- Üst vizyondaki yeri: foundation | agent-system | assurance | deployment | physical | research-bridge | horizon

## Adım 1 — `repo-auditor` template üretimi

Mevcut 16 projeyi tarar ve şu kalıpları çıkarır:

### `package.json` scripts standardı (yeni minimal zorunlu set)

Rapordaki 16 projenin 5 zorunlu + çoğunluk ortak script'lerine göre güncellenmiş set. aserdargun-com'a ait SSG generator script'leri (`check:js`, `generate:site`, `test:render` vb.) **subdomain'lere uygulanmaz** — onlar bu ana repo'nun pipeline'ıdır.

```json
{
  "dev": "<vite|next dev>",
  "build": "<validate-step> && <tsc -b> && <vite|next build>",
  "lint": "eslint .",
  "typecheck": "tsc -b --pretty false",
  "test": "vitest run",
  "test:e2e": "playwright test",
  "check": "npm run lint && npm run typecheck && npm test && npm run build",
  "validate:codex": "npm run check && npm run test:e2e && git diff --check"
}
```

Örnek — Vite (lcl/llm/hns kalıbı):

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "typecheck": "tsc -b --pretty false",
  "test": "vitest run",
  "test:e2e": "playwright test",
  "check": "npm run lint && npm run typecheck && npm test && npm run build",
  "validate:codex": "npm run check && npm run test:e2e && git diff --check"
}
```

Örnek — Next.js (aia/swi/bee/itl kalıbı):

```json
{
  "dev": "next dev",
  "build": "next build",
  "lint": "next lint",
  "typecheck": "tsc -b --pretty false",
  "test": "vitest run",
  "test:e2e": "playwright test",
  "check": "npm run lint && npm run typecheck && npm test && npm run build",
  "validate:codex": "npm run check && npm run test:e2e && git diff --check"
}
```

### Build tool karar ağacı

| Eğer proje... | Seç | Örnekler |
|---|---|---|
| Statik içerik ağırlıklı, çoklu dil route'ları, OG/SEO kritik | `next` (static export → `out/`) | aia, swi, bee, itl |
| Etkileşimli atlas/lab, hızlı HMR, küçük bundle | `vite` (→ `dist/`) | llm, hns, sec, ctx, evl, cld, lcl, ant, eng |
| Cloudflare Pages + Azure SWA hibrit deploy | `vinext` (wrangler) → `out/` | usl, gpu |
| Sunucu tarafı rendering veya prerender zorunlu | `vite` + `prerender.mjs` (SSR) | wfm |
| Kernel compile / native addon gerekli | `vite` + `finalize-build.ts` | ant (özel) |

### Port tahsisi politikası (dev:codex / run:local)

| Port | Projeler | Not |
|---|---|---|
| 3000 | aia | next default |
| 3017 | bee | next + webpack offset |
| 4173 | usl, cld, gpu, lcl, llm, eng, itl | "Vite default preview + Codex standard" |
| 4174 | sec, evl | +1 offset |
| 4175 | ctx | +2 offset |
| 4187 | ant | +14 offset (özel) |
| dynamic | wfm | `preview-control.mjs` yönetiyor |

Yeni subdomain için önerilen boş port: **4180** (serbest, 4187'den uzakta).

### `AGENTS.md` zorunluluğu (bee kalıbı)

14/16 projede `AGENTS.md` **yok**. Sadece `bee-aserdargun-com` gerçek bir sözleşme örneği içeriyor. Yeni subdomain'de `AGENTS.md` zorunlu, referans bee kalıbı (rapor §1.7'den):

1. Tek cümle misyon
2. Domain truth kuralı (örn. "simulation truth `src/simulation`'da; React/DOM/clock yok")
3. Bilgi sınırları (örn. "Colony metrics observer output, decision input değil")
4. Schema versiyon disiplini
5. Replay/export garantisi
6. Dil eşitliği (tr/en)
7. Pre-handoff gate: `validate:codex` + `git diff --check`
8. Scope guard: "Local work only unless user authorizes external publication"

### `staticwebapp.config.json` kalıbı

`/<lang>/*` yönlendirmesi **sadece bilingual projeler için** (aserdargun-com, swi). Çoğu projede yok. Build tool'a göre iki referans kalıp:

- **Vite ise → `hns` kalıbı:** navigationFallback `/index.html`, exclude `/assets/*`, immutable cache, güçlü CSP.
- **Next.js static ise → `swi` kalıbı:** 404 responseOverrides + granular per-route cache headers + `/_next/static` immutable.

### CSP minimum standardı (yeni proje default)

- `Content-Security-Policy`: `default-src 'self'` (proje gereksinimine göre script/style varyasyonu)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY` (raporda 8/14 var; yeni projede default olmalı)
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` (proje gereksinimine göre genişletilebilir)

### Deploy workflow `app_location` kararı

`azure/static-web-apps/deploy@v1` action'ı tüm 16 projede ortak. `app_location` her build tool için sabit:

- **Next.js static export →** `app_location: out`, `output_location: ""`
- **Vite →** `app_location: dist`, `output_location: ""`
- **Vinext (usl/gpu) →** `app_location: out` (`build:azure` step'inden sonra)

Node sürümü: 22 (cld = 24, gpu = 22.x, usl = 22.13.1, swi = 22.23.1). Secret adı: `AZURE_STATIC_WEB_APPS_API_TOKEN_<CODE>`.

### `expectedAssetVersion` — tek global

`aserdargun-com/tools/validate-site.mjs` içinde **TEK global** `expectedAssetVersion` değeri var (örn. `"20260907-system-focus-edge"`). Subdomain'lerde ayrı `expectedAssetVersion` YOK; onun yerine statik asset cache-bust (`?v=` query) yeterli.

### `tools/validate-site.mjs` retired URL guard — merkezi

Subdomain'lerde `validate-site.mjs` **YOK**. Aserdargun-com'un merkezi validator'ı `retiredProjectUrls` listesini tutar (stackfolio, unsloth, swapp, pipolars, projectpulsar, scadanerve, industry-learn, scikit-play, aeon-play, pytorch-play, dsml101). Yeni subdomain eklendiğinde bu listeye dokunulmaz.

### Favicon + title standartları

- Favicon: `public/favicon.svg` (lime disc + glyph + monogram, 320×320 viewBox, 64px corner radius) — Vite; `app/icon.svg` — Next.js
- `public/apple-touch-icon.png` (180×180 PNG) — Vite; `app/apple-icon.png` — Next.js
- `public/favicon-32.png` legacy tarayıcılar için (lcl, ant kalıbı)
- Title format: `<CODE> - <Full Name>` (em-dash yok). Örnek: "LCL - Local Compute", "ANT - Ant Colony Intelligence Laboratory"

## Adım 2 — `content-curator` aserdargun-com entegrasyonu

- `data/living-system.json` `applications[]` dizisine yeni entry eklenir.
  - `code`, `kind`, `systemRole`, `visibility`, `status`, `statusLabel.{en,tr}`
  - `title.{en,tr}`, `summary.{en,tr}`
  - `repository`, `address`, `updatedAt`
  - `researchCutoff`, `lastVerified`, `lastReleased`, `releaseSha`
  - `upstreamApps[]`, `downstreamApps[]`
  - `tracks[]`, `entityIds[]`
  - `portfolioLayer`, `focusState`, `relatedMemoryIds[]`
- `tools/validate-site.mjs` `expectedApplicationRows` dizisine yeni satır eklenir (sıra önemli).
- (Opsiyonel) Learning diagram'a düğüm eklemek için: `expectedLearningCodes` + `expectedLearningNodeRoles` + `expectedLearningEdges` güncellenir (`upstreamApps`/`downstreamApps`'ten türetilir).
- **Subdomain'de `npm run generate:site` YOKTUR** — bu sadece aserdargun-com'un SSG pipeline'ıdır. Subdomain'de `npm run check && npm run build` exit 0 doğrulanır.
- `cd aserdargun-com && npm test` exit code 0 doğrulanır (validator gate).
- Horizon veya Nav bölümüne link eklenir.
- Commit + push + deploy + URL doğrulama.

## Adım 3 — `brand-guardian` yeni subdomain branding

- Favicon: `public/favicon.svg` (lime disc + glyph + monogram, 320×320 viewBox, 64px corner radius)
- `public/apple-touch-icon.png` (180×180 PNG)
- `public/favicon-32.png` legacy tarayıcılar için
- Next.js projeler: `app/icon.png` + `app/icon.svg` + `app/apple-icon.png`
- Title format: `<CODE> - <Full Name>` (em-dash yok)
- OG image: `images/og-<code>.jpg` 1200×630 JPEG ≤400 KB
- Brand palette: dark #121310, lime #c8ff36, ink #0c0d0a

## Adım 4 — `deploy-watch` cron kaydı

- `deploy-watch-<code>` adıyla periyodik cron.
- Prompt: "GitHub check-runs: <sha>. Status=success → curl https://<code>.aserdargun.com/ + unique content check. Failure → log."

## Adım 5 — `<code>-worker` agent kaydı

- `mavis agent create` ile `display_name`: "<Full Name> worker", `name`: "<code>-worker"
- Sistem prompt: scope + workspace + capability matrix referansı (memory'deki `usl-worker` kalıbı örnek alınır)
- Workspace sembolik linki: `~/.minimax/agents/<code>-worker/workspace` → `/Users/aserdargun/Documents/minimax/<code>-aserdargun-com`
- `memory/MEMORY.md` başlangıç şablonu

## Adım 6 — Kullanıcıya teslim

- Repo URL
- Subdomain canlı URL (HTTP 200 doğrulandı)
- Agent adı ve sistem prompt özeti
- İlk deploy cron durumu
- 24 saat içinde bir kez sağlık kontrolü

## Kabul kriterleri (Phase 3)

- [ ] `repo-auditor` `onboarding-template.md` üretti (Phase 3 dry-run)
- [ ] Yeni repo oluşturuldu (kullanıcının açık onayıyla; agent `git init` yapmaz)
- [ ] `package.json` scripts §1'deki yeni minimal zorunlu set ile uyumlu (8 script: dev/build/lint/typecheck/test/test:e2e/check/validate:codex)
- [ ] `AGENTS.md` bee kalıbıyla yazıldı (8 madde en az)
- [ ] `staticwebapp.config.json` Vite için hns kalıbı, Next.js için swi kalıbı
- [ ] CSP minimum standardı (DENY + nosniff + strict-origin-when-cross-origin)
- [ ] Deploy workflow `app_location` doğru (next=`out`, vite=`dist`)
- [ ] Port tahsisi politikasına uygun boş port seçildi
- [ ] `content-curator` aserdargun-com'da `expectedApplicationRows` + horizon/nav link ekledi
- [ ] `<code>-worker` agent kaydı oluşturuldu
- [ ] Live URL `https://<code>.aserdargun.com/` HTTP 200, içerik + favicon mevcut
- [ ] Deploy cron'u kaydedildi
