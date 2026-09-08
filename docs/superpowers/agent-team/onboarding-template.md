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

- `package.json` `scripts` standardı: `dev`, `stop`, `test`, `check:js`, `test:deployment`, `test:environment`, `test:portrait`, `test:data`, `generate:site`, `check:generated`, `archive:now`, `test:archive`, `test:render`, `test:navigation`, `test:server`, `test:stop`, `validate:site`, `validate:codex`
- `CLAUDE.md` / `AGENTS.md` başlık kalıbı
- `staticwebapp.config.json` kalıbı: `/<lang>/*` yönlendirmesi + immutable cache + security headers
- `.github/workflows/azure-static-web-apps-*.yml` kalıbı
- `tools/validate-site.mjs` retired URL guard kalıbı
- `expectedAssetVersion` registry (validator'da)
- Favicon + title standartları (memory: "Aserdargun favicon + title standard")

## Adım 2 — `content-curator` aserdargun-com entegrasyonu

- `data/living-system.json` `applications[]` dizisine yeni entry eklenir.
  - `code`, `kind`, `systemRole`, `visibility`, `status`, `statusLabel.{en,tr}`
  - `title.{en,tr}`, `summary.{en,tr}`
  - `repository`, `address`, `updatedAt`
  - `researchCutoff`, `lastVerified`, `lastReleased`, `releaseSha`
  - `upstreamApps[]`, `downstreamApps[]`
  - `tracks[]`, `entityIds[]`
  - `portfolioLayer`, `focusState`, `relatedMemoryIds[]`
- `npm run generate:site` çalıştırılır.
- `npm test` exit code 0 doğrulanır.
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
- Sistem prompt: scope + workspace + capability matrix referansı
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
- [ ] CLAUDE.md, package.json scripts, expectedAssetVersion, deploy workflow, favicon hepsi template'e uygun
- [ ] `content-curator` aserdargun-com'da horizon/nav bölümüne link ekledi
- [ ] `<code>-worker` agent kaydı oluşturuldu
- [ ] Live URL `https://<code>.aserdargun.com/` HTTP 200, içerik + favicon mevcut
- [ ] Deploy cron'u kaydedildi
