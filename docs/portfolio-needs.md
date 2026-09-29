# Portfolio Development Needs — 30 Uygulama

**Son denetim:** 29 Eylül 2026
**Kapsam:** 30/30 uygulama
**Yöntem:** İki geçişli denetim — Geçiş 1 hızlı tarama (30/30), Geçiş 2 tam kapı koşusu (11 uygulama)
**Durum:** Salt-okunur denetim. Hiçbir uygulama reposunda kod, veri, yapılandırma veya CI değişikliği yapılmadı.

> Bu dosya `aserdargun-com/docs/` altındadır ve `.site-dist/` çıktısına **dahil değildir** — yayına çıkmaz.

---

## Öncelik özeti

| # | Uygulama | P0 | P1 | P2 | P3 | En önemli bulgu |
|---|---|:-:|:-:|:-:|:-:|---|
| 1 | **cld** | **1** | 2 | 2 | 1 | **CI kırık — deploy 8 gündür bloklu**, 52 veri kaydı bayat |
| 2 | **aos** | — | 2 | 3 | 1 | 8 gündür deploy edilmedi; kapı tek başına çalışmıyor |
| 3 | **aia** | — | 1 | 1 | — | Araştırma kesim tarihi 36 gün eski (en büyük uygulama) |
| 4 | **gpu** | — | 1 | 2 | — | Araştırma kesim tarihi 31 gün eski |
| 5 | **swi** | — | 1 | 1 | 1 | Kesim tarihi 23 gün; 2/10 CI hatası |
| 6 | **eng** | — | — | 3 | 1 | lint + typecheck yok (ufuk projesi) |
| 7 | **hex** | — | — | 3 | — | lint + typecheck yok; CSP yok |
| 8 | **bee** | — | — | 1 | 1 | e2e kapısı yerel port çakışmasıyla kırılıyor |
| 9 | **cul** | — | — | 3 | 1 | lint + typecheck + ajan sözleşmesi yok |
| 10 | **adp** | — | — | 2 | — | typecheck + ajan sözleşmesi yok |
| 11 | **wml** | — | — | 3 | — | lint + typecheck + CSP yok |
| 12 | **dpl** | — | — | 3 | 1 | lint + typecheck + ajan sözleşmesi yok; CSP ve DENY yok |
| 13 | **mem** | — | — | 3 | — | lint + typecheck + ajan sözleşmesi yok; DENY yok |
| 14 | **pol** | — | — | 3 | 1 | `staticwebapp.config.json` **hiç yok** |
| 15 | **tfl** | — | — | 2 | — | typecheck + ajan sözleşmesi yok; DENY yok |
| 16 | **arl** | — | — | 3 | — | lint + typecheck + ajan sözleşmesi + CSP yok |
| 17 | **dtr** | — | — | 2 | — | lint + typecheck + ajan sözleşmesi yok |
| 18 | **dcl** | — | — | 2 | — | typecheck + ajan sözleşmesi yok |
| 19 | **pdt** | — | — | 2 | — | lint + typecheck yok; CSP yok |
| 20 | **gex** | — | — | 2 | 1 | typecheck yok; DENY yok |
| 21 | **ant** | — | — | 1 | — | typecheck yok |
| 22 | **llm** | — | — | — | 1 | Araştırma kesim tarihi 25 gün |
| 23 | **lcl** | — | — | — | 1 | Araştırma kesim tarihi 25 gün |
| 24 | **wfm** | — | — | 1 | — | lint + typecheck yok |
| 25 | **sec** | — | — | — | — | Tutarlı |
| 26 | **ctx** | — | — | — | — | Tutarlı |
| 27 | **evl** | — | — | — | — | Tutarlı |
| 28 | **itl** | — | — | — | — | Tutarlı |
| 29 | **usl** | — | — | — | — | Tutarlı |
| 30 | **hns** | — | — | — | — | Tutarlı (referans kalıp) |

**Toplam:** P0 × 1 · P1 × 7 · P2 × 40 · P3 × 6 · Temiz × 5

---

## Yayın durumu

Tüm 30 uygulama **canlı ve 200 dönüyor**. Sorun yoklukta değil, tutarlılıkta.

| Uygulama | Canlı HTTP | Yönlendirme | `<html lang>` | Boyut | Son deploy | CI (son 10) | researchCutoff (yaş) |
|---|---|---|---|---|---|---|---|
| cld | 200 | — | tr | **929 B** | **09-28 ✗ BAŞARISIZ** | **4 hata** | 2026-08-14 (**46g**) |
| aos | 200 | — | tr | 9.0 KB | **09-21 (8 gün bayat)** | **3 hata** | — |
| aia | 200 | — | en | 570 KB | 09-28 ✓ | 0 | 2026-08-24 (**36g**) |
| gpu | 200 | — | tr | 40 KB | 09-28 ✓ | 2 | 2026-08-29 (**31g**) |
| swi | 200 | — | en | 11,5 KB | 09-28 ✓ | 2 | 2026-09-06 (23g) |
| eng | 200 | — | en | 30 KB | 09-28 ✓ | 2 | 2026-09-21 (8g) |
| hex | 200 | — | en | 3,3 KB | 09-28 ✓ | 2 | — |
| bee | 200 | — | tr | 37,7 KB | 09-28 ✓ | 2 | — |
| wml | 200 | — | en | 3,4 KB | 09-28 ✓ | 2 | — |
| cul | 200 | — | tr | 2,7 KB | 09-28 ✓ | 1 | — |
| adp | 200 | — | en | 3,5 KB | 09-28 ✓ | 1 | — |
| sec | 200 | `301 → /en` | en | 3,0 KB | 09-28 ✓ | 0 | 2026-09-21 (8g) |
| ctx | 200 | `301 → /en/pipeline` | en | 2,9 KB | 09-28 ✓ | 0 | 2026-09-04 (25g) |
| evl | 200 | `301 → /en` | en | 3,2 KB | 09-28 ✓ | 0 | 2026-09-04 (25g) |
| wfm | 200 | `301 → /en` | en | 27,8 KB | 09-28 ✓ | 0 | 2026-09-04 (25g) |
| gex | 200 | `302 → /gex/anatomy` | en | 2,8 KB | 09-28 ✓ | 0 | — |
| hns, llm, itl, usl, lcl, ant, pol, dpl, mem, gpu, tfl, arl, wml, dtr, pdt, dcl | 200 | — | — | — | 09-28 ✓ | 0 | — / 09-04 |

**Ek canlı gözlemler**
- Tüm 30 uygulamada HSTS (`strict-transport-security`) aktif.
- ~~**cld canlı sayfasında Open Graph etiketi yok**~~ → **DÜZELTİLDİ 29 Eylül 2026**: cld yeniden doğrulandı ve yayınlandı, canlı sayfa 7 OG etiketi ve "Son doğrulama: 2026-09-29" gösteriyor.
- Varsayılan dil dağınık: **20 uygulama İngilizce**, **10 uygulama Türkçe** açılıyor (`llm, dpl, cul, aos, mem, gpu, cld, lcl, bee, dtr`).

### Düzeltme kaydı — 29 Eylül 2026

| İş | Durum | Kanıt |
|---|---|---|
| **cld P0 — veri tazelik kapısı** | ✅ **ÇÖZÜLDÜ** | 51 kayıt resmî kaynaktan yeniden doğrulandı, `Run release checks` → `Deploy prebuilt static artifact` → success. Canlı: OG 0→7, "Son doğrulama: 2026-09-29" |
| **X-Frame-Options, 9 uygulama** | ✅ **ÇÖZÜLDÜ** | `dpl, aos, mem, gex, tfl, arl, wml, dtr, pol` — canlıda `x-frame-options: DENY` doğrulandı |
| **pol `staticwebapp.config.json`** | ✅ **ÇÖZÜLDÜ** | Tek istisna kapatıldı: güvenlik başlığı, önbellek ve mime tanımı |
| **CSP, 12 uygulama** | ✅ **ÇÖZÜLDÜ** | `aia, mem, gpu, cld, eng, gex, arl, wml, pdt, hex, dpl, pol` — her biri kendi tarayıcı testiyle doğrulandı (gpu 242, dpl 22, gex/arl/pdt/wml/cld e2e). Canlıda 12/12 `content-security-policy` + `x-frame-options: DENY` + `nosniff` doğrulandı |
| **ESLint, 7 uygulama** | ✅ **ÇÖZÜLDÜ** | `hex, cul, mem, dtr, pdt, aos, eng` — kuruldu, kapının ilk adımı yapıldı, 19 ihlal düzeltildi, 7/7 CI yeşil ve yayınlandı |
| **ESLint, 4 uygulama** | ⛔ **ENGELLİ** | `dpl, wfm, arl, wml` — TS 7.0.2, `typescript-eslint@8` TS `<6.1.0` istiyor. Bkz. S3 |
| **aos P1 "8 gündür deploy edilmedi"** | ❌ **YANLIŞ POZİTİF — geri alındı** | `HEAD = origin/main = son deploy = b286ceb`. Yayınlanmamış commit yok; sadece 8 gündür değişiklik yok |
| **gpu "CI'da test adımı görünmüyor"** | ✅ **DOĞRULANDI, kök neden bulundu** | CI'da `npm test` **var** (`validate.yml:43-44`). Asıl sorun: `playwright.config.ts` içinde `webServer` bloğu **yok**, `test:e2e` elle başlatılan dev sunucusunu (5173) bekliyor. Bu yüzden tarayıcı testi hiçbir otomatik akışta çalışmıyor |

### Yeni keşfedilen kapı — yayın kayıt defteri (P1)

Denetimin ilk turunda kaçırıldı, düzeltme sırasında ortaya çıktı. **`eng`, `hex` ve `nxt`** kendi commit'lerinin SHA'sı `aserdargun-com/data/living-system.json` içine yazılmadan **yayın yapmıyor**:

```
Check out canonical release registry   (aserdargun/aserdargun-com)
  → Verify registered release identity
  → Deploy prebuilt artifact
```

`eng` bu yüzden ilk deploy denemesinde düştü. `releaseSha` kayıt defterine yazılıp `gh run rerun` ile yeniden tetiklenince geçti. `hex` aynı kapıya rağmen geçti — tetiklenme koşulu bu iki uygulamada farklı işliyor, ayrı incelenmeli.

`aserdargun-com/tools/portfolio-phase-one.test.mjs` gex/wml/hex/pdt için doğrulanmış deploy koşu kimliklerini sabit kodluyor ("only a confirmed deployment run establishes a release date"). Yeniden deploy edilen bir uygulamanın kaydını güncellemek, o testin tablosunu da güncellemeyi gerektiriyor.

**Düzeltme sırasında çıkan dört kalıp hata (tekrar edilmesin):**
1. `staticwebapp.config.json` içinde **`globalHeaders` bloğu zaten varsa** yeni blok eklemek yedek anahtar yaratıyor; JSON.parse son kazanır, eklenen CSP görünmez oluyor. `gex`te bu oldu. Her eklemeden sonra blok sayısını say.
2. `aos` ve `mem` gibi **tek satırlık kompakt JSON**'da çok satırlı kalıba göre düzenleme yapmak girintiyi bozuyor; `dpl` ve `wml`de oldu, ikisi de düzeltildi.
3. `gex`in kök adresi `302` yönlendirdiği için `curl -I` **yönlendirme yanıtının** başlıklarını verir; CSP'yi `/gex/anatomy` üzerinde doğrulamak gerekiyor. Aksi halde yanlış negatif üretiyor.
4. **`git checkout package.json` ile bir script'i geri almak, kurulumun eklediği devDependencies'i de siler.** `hex`te `typecheck`'i geri alırken ESLint bağımlılıkları manifestten düştü. Yerel `node_modules` durduğu için yerel kapı **geçti**, CI'da `sh: 1: eslint: not found` oldu. Bir `package.json`'ı `npm install -D` sonrasında hiçbir koşulda toptan geri alma; alan bazlı düzelt.

> 4. madde, bu turda iki kez karşılaşılan asıl riski özetliyor: **yerelde geçen bir şeyin CI'da geçeceğini varsaymak.** Bu portföyde kapı zincirleri çok katmanlı ve her katman farklı bir ortam koşuluna bağlı.

---

## Sistemik ihtiyaçlar

Bunlar tek tek uygulamaya bağlı değil; toplu çözülebilir.

### S1 — Tazelik penceresi standardize edilmemiş (P1)
Dört uygulamada tazelik mantığı var ama pencere ve davranış farklı:

| Uygulama | Mekanizma | Pencere | CI'ya bağlı mı |
|---|---|---|---|
| `cld` | `src/data/validation.ts` | **30 gün → build'i düşürür** | **Evet (deploy'u bloklar)** |
| `dcl` | `src/core/freshness.ts` | 30g CURRENT / 90g AGING / 90g+ STALE | Hayır |
| `llm` | `src/features/freshness.ts` | **180 gün** | Hayır |
| `arl` | `src/core/runtime.ts` | Uygulama içi "stale" fault'u | Hayır |

`cld` 30 günlük pencereyi CI kapısına bağladığı için tek başına yayını durdurabiliyor. Diğer üç uygulama aynı veri 90–180 gün boyunca "taze" sayabiliyor. **Karar gerekli:** tek bir politika mı (ör. 90 gün CURRENT + 180 gün STALE), yoksa kaynak-yoğunluk mu esas alınacak (fiyat/kur = kısa, mimari = uzun)?

### S2 — `typecheck` kapısı 16 uygulamada "yok" görünüyordu — ❌ **YANLIŞ POZİTİF, 29 Eylül'de düzeltildi**
Eksik görünenler: `dpl, cul, aos, mem, wfm, ant, eng, gex, tfl, arl, adp, wml, dtr, pdt, hex, cld`.

**Gerçek durum:** 14 TypeScript uygulamanın **tamamı** `build` script'i içinde `tsc` çalıştırıyor (`tsc -b && vite build` ya da `tsc --noEmit && …`) ve 11 uygulamanın CI'ı o `build`'i koşuyor. Bağımsız `typecheck` script'i olmaması **kapsama boşluğu değil**, yalnızca erken-hızlı geri bildirim eksikliği. 14 script eklemek kapsama kazandırmadan CI süresini uzatırdı; **eklenmedi**.

Kalan gerçek boşluk: `aos` ve `eng` — tsconfig'i olmayan vanilla JS siteleri, burada `typecheck` uygulanamaz (JSDoc tabanlı kontrol ayrı ve büyük bir karar).

> Bu madde, statik taramada "script yok" ile "kontrol yok" ayrımının yapılmamasından doğdu. Aynı tuzak `lint` için de geçerliydi ama orada sonuç ters çıktı (aşağıya bakın).

### S3 — `lint` kapısı 11 uygulamada yok (P2) — 7'si 29 Eylül'de kapatıldı
Eksik olanlar: `dpl, cul, aos, mem, wfm, eng, arl, wml, dtr, pdt, hex`.

**✅ Çözülen (7):** `hex, cul, mem, dtr, pdt, aos, eng` — ESLint kuruldu, `lint` kapının ilk adımı yapıldı, çıkan **19 ihlalin tamamı** önemsizdi (kullanılmayan import/binding, iki gereksiz regex kaçışı, boş `catch` blokları) ve düzeltildi. 7/7 CI yeşil, 7/7 yayınlandı.

**⛔ Engellenen (4):** `dpl, wfm, arl, wml` — dördü de **TypeScript 7.0.2** kullanıyor, `typescript-eslint@8.71.0` ise `typescript >=4.8.4 <6.1.0` istiyor. `--legacy-peer-deps` ile kurulabilir ama tip-farkındalıklı kurallar sessizce atlatılır; yani **görünür ama işe yaramayan bir kapı** olur. TypeScript'ı düşürmek kabul edilemez. Karar: `typescript-eslint`'in TS 7 desteğini beklemek ya da ESLint 10 + yeni plugin setine geçmek.

Portföyde hâlihazırda lint kullanan uygulamalar da bölünmüş: `aia` ESLint 9 + TS 5.9, `hns`/`sec` ESLint 10 + TS 6. Tek bir kalıp yok.

### S4 — Ajan sözleşmesi 10 uygulamada yok (P2)
`AGENTS.md` olmayanlar: `dpl, cul, aos, mem, pol, tfl, arl, adp, dtr, dcl`.
`docs/superpowers/agent-team/` altında bu iş için bir takım tasarımı ve `bee` için 9 maddelik sözleşme kalıbı var, ancak **tasarlanan uzman ajanların hiçbiri kurulmamış** (`mavis agent list` yalnızca 4 yerleşik ajanı gösteriyor).

### S5 — Güvenlik başlığı kapsaması eşit değil (P2) — ✅ **29 Eylül'de kapatıldı**
- `X-Frame-Options` yok (9): `dpl, aos, mem, pol, gex, tfl, arl, wml, dtr` → **hepsi eklendi, canlıda doğrulandı**
- `Content-Security-Policy` yok (12): `aia, dpl, mem, gpu, cld, eng, gex, arl, wml, pdt, hex, pol` → **hepsi eklendi, her biri kendi tarayıcı testiyle doğrulandı**
- Kalan tek eksik: `pol`da tarayıcı testi yok (yalnız 16 düğüm testi), bu yüzden CSP canlıda gözle doğrulandı.
- `nosniff` **30/30 var** · HSTS **30/30 canlıda var**
- `hns` ve `swi` referans kalıp (DENY + CSP + immutable cache).

### S6 — Varsayılan dil politikası yok (P2)
20 uygulama `/` adresinde İngilizce, 10 uygulama Türkçe açılıyor. `sec, ctx, evl, wfm` `/ → /en` yönlendirmesiyle İngilizce'yi zorunlu kılarken `llm, dpl, cul, aos, mem, gpu, cld, lcl, bee, dtr` sessizce Türkçe açılıyor. `aserdargun.com` ana portföyde `/` İngilizce, `/tr/` Türkçe — subdomain'ler bu kalıbı tutmuyor.

### S7 — Kullanıcıya görünen davranış farkı (P3)
- `gex` kök adresi `302 → /gex/anatomy` yapıyor (bilinçli, `staticwebapp.config.json` `routes` bloğunda tanımlı — çalışma mantığı doğru ama kök sayfa "boş" kalıyor).
- `aos` kök adresi Türkçe açılıyor, `<title>` "Genel bakış — AOS".
- `cld` kök adresi 929 bayt — ince bir kabuk, karşılaştırma arayüzü JavaScript ile yükleniyor.

### S8 — Yerel port yönetimi eksik (P3)
`bee`nin Playwright config'i `reuseExistingServer: false` kullanıyor ve 4017 portunu sabit. Yerelde unutulmuş bir `node scripts/serve.mjs` süreci (PID 2718) portu tuttuğunda kapı şu mesajla düşüyor:

```
Error: http://127.0.0.1:4017 is already used, make sure that nothing is running on the port/url
```

Bu bir ürün hatası değil (CI temiz runner kullanıyor) ama geliştirici deneyimini bozuyor ve hata mesajı yanıltıcı. `aserdargun-com/docs/superpowers/agent-team/capability-matrix.md` ve önceki denetim notunda da port çakışması riski işaretlenmişti.

### S9 — Dokümantasyon tutarsızlığı (P3)
`docs/superpowers/agent-team/repo-auditor-phase3-dryrun.md` (8 Eylül 2026) diyor ki *"16/16 `azure/static-web-apps/deploy@v1` kullanıyor"*. Bugün gerçek durum: **30/30 workflow deploy eylemini SHA ile sabitliyor** (`Azure/static-web-apps-deploy@1a947af9…`). Bu, sürüm etiketinden daha güçlü bir arz zinciri önlemi — doküman geride kalmış.

### S10 — `pol` yönlendirme ve güvenlik yapılandırması eksik (P2)
`pol-aserdargun-com` içinde `staticwebapp.config.json` **yok** (tek istisna). `app_location: "/"` ile doğrudan kökten yayın yapıyor; bu yüzden özel yönlendirme, önbellek ve güvenlik başlığı tanımı yok.

---

## Uygulama blokları

Format:
```
### <KOD> — <Tam Ad>
Durum: <kapı> | Canlı: <HTTP> | Son deploy: <tarih>
<bulgular>
Önerilen sıra: <öncelik kodları>
```

---

### CLD — Cloud Provider Cost Comparison
Durum: `npm run check` **BAŞARISIZ** (yerelde doğrulandı) | Canlı: 200 (bayat) | Son deploy: 2026-09-28 başarısız

1. **P0 · Deploy bloklu.** CI'da "Run release checks" adımı başarısız, "Deploy prebuilt static artifact" adımı skipped. `main`'e push edilen `abf5429` yayınlanmadı. Kanıt: `gh run view 36398710671`.
2. **P1 · 52 veri kaydı bayat.** 30 günlük pencere aşılmış; kayıtlar 46–47 gün eski. Kategoriler: `offer` (aws / hetzner / oracle / cloudflare / digitalocean / vultr), `free tier` (azure / gcp), `exchange rate` (ECB). Kanıt: `npm run check` → `grep -c '^FAIL stale'` = **52**. Bu kod hatası değil, kaynak yeniden doğrulama işidir (Azure/GCP fiyat sayfaları + ECB resmî kaynakları).
3. **P1 · Canlı yayın bayat.** Canlı sayfada 0 Open Graph etiketi; kaynak kodda 7. Canlı gövde 929 bayt. → Canlı sürüm 2026-09-21'den kalma.
4. **P2 · `typecheck` script'i yok.** CI `lint` + `test` + `build` çalıştırıyor ama ayrı tip kontrolü yok. Kanıt: `package.json`.
5. **P2 · CSP yok.** `public/staticwebapp.config.json` içinde `Content-Security-Policy` tanımlı değil.
6. **P3 · Varsayılan dil Türkçe.** Portföy ana kuralıyla (İngilizce varsayılan) uyumsuz.

Doğrulanan geçen taraflar: `lint` **PASS** (exit 0), `test` **PASS** (3/3 `node --test` betiği). Kırılma yalnızca veri tazeliğinden kaynaklanıyor — kod tabanı sağlıklı.

Önerilen sıra: **P0 → P1 → P1 → P2 → P2 → P3**

---

### AOS — Agent Operating System
Durum: `npm run validate` **PASS** (20s) | Canlı: 200 | Son deploy: **2026-09-21 (8 gün)**

1. **P1 · 8 gündür deploy edilmedi.** 30 uygulamanın tamamı 2026-09-28'de deploy edildi; `aos` tek istisna. `main` temiz ve `origin/main` ile senkron — yani güncel commit var ama **yayınlanmamış**.
2. **P1 · `npm run check` tek başına çalışmıyor.** `check` doğrudan `dist/staticwebapp.config.json` okuyor; build çalıştırılmadan `ENOENT` veriyor. Doğru kapı `validate` (= `build && check && test`). Kapı adı CI'da doğru tanımlı, ama geliştirici `npm run check` çalıştırıp hata görüyor.
3. **P2 · `lint` ve `typecheck` yok.** Ayrıca ajan sözleşmesi (`AGENTS.md`) yok.
4. **P2 · `X-Frame-Options` yok.** CSP var, DENY yok.
5. **P3 · Kök sayfa Türkçe açılıyor** ve `<title>` "Genel bakış — AOS". Portföy ana kuralıyla uyumsuz.

Kapı geçtiği için canlı/publika ayrışması yok; sorun yalnızca yayın yaşı.

Önerilen sıra: **P1 → P1 → P2 → P2 → P3**

---

### AIA — AI Ecosystem Atlas
Durum: Geçiş 1 (tam kapı koşusu sırasına girmedi) | Canlı: 200 (570 KB) | Son deploy: 2026-09-28 ✓

1. **P1 · Araştırma kesim tarihi 36 gün eski** (2026-08-24). Portföydeki en eski kesim tarihi; en büyük ve temel katman uygulaması olduğu için tazelik en çok burada önemli.
2. **P2 · CSP yok** — `public/staticwebapp.config.json` içinde tanımlı değil.
3. **P2 · 12 uygulamada `typecheck`/6 uygulamada `researchCutoff` uyarısı yok.** AIA'nın `sourceCount`/`claimCount` alanları `null`; kanonik kayıtta kanıt sayıları diğer bazı uygulamalarda (hns 46/79, sec 11/13, lcl 18/17, dtr 5) doldurulmuş durumda.
4. Not: `sourceCount`/`claimCount` null olması bir eksik kanıt beyanı değil, kayıt defteri alanının doldurulmamış olmasıdır — kanonik dosya `data/living-system.json`.

Önerilen sıra: **P1 → P2**

---

### GPU — GPU Kernel Engineering (Kernel Atlas)
Durum: `npm run lint` **PASS** (6s) | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P1 · Araştırma kesim tarihi 31 gün eski** (2026-08-29).
2. **P2 · CSP yok.** `staticwebapp.config.json` kök dizinde, CSP tanımlı değil.
3. **P3 · 2/10 CI koşusu başarısız.** En son koşu başarılı.
4. **Düzeltildi (yanlış pozitif kapandı):** CI'da test adımı **mevcut** — `validate.yml:43-44` `npm test` çalıştırıyor. Önceki kuşkunda "CI'da test görünmüyor" varsayımı yanlıştı.
5. Not: Drizzle şeması (`db/`, `drizzle/`) ve `worker/` içeren hibrit mimari; `build:azure` + `verify:azure` adımları sağlıklı.

Önerilen sıra: **P1 → P2 → P3**

---

### SWI — Swarm Intelligence
Durum: `npm run validate:codex` **PASS** (41s) | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P1 · Araştırma kesim tarihi 23 gün eski** (2026-09-06).
2. **P2 · İçerik hizası notu 21 Eylül'de yazılmış ve kök portföy `updatedAt` 2026-09-21.** `docs/roadmap.md` "Current status reviewed on 21 September 2026" diyor — bu, tazelik açısından tutarlı, ancak biçim açıklaması (aşırı-eski biçim: em-dash başlık) diğer yeni uygulamalardan (TFL, ARL, ADP, DTR, DCL) farklı.
3. **P3 · 2/10 CI koşusu başarısız.** En son koşu başarılı.
4. Not: `docs/roadmap.md` bakım önceliklerini açıkça listeliyor; `AGENTS.md` var, kapı `validate:codex` kapsamlı. Sağlıklı bir referans.

Önerilen sıra: **P1 → P2 → P3**

---

### ENG — Open Humanoid Engineering
Durum: `npm run validate:codex` **PASS** (12s) | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P2 · `lint` ve `typecheck` yok.** Bu, tüm evveliyatın hizmet ettiği ufuk projesi — kapı kapsamı diğerlerine göre daha zayıf.
2. **P2 · CSP yok.** `public/staticwebapp.config.json` içinde tanımlı değil.
3. **P3 · 2/10 CI koşusu başarısız.** En son koşu başarılı.
4. Not: Sürüm sözleşmesi (`src/versions.json`, davranış 2.1.0 / şema 2.0.0) ve `release-manifest.json` SHA-256 doğrulaması mevcut; `living-system.json`daki `releaseSha` ile eşleşme kontrolü workflow'da var. Kanıt disiplini güçlü.

Önerilen sıra: **P2 → P2 → P3**

---

### HEX — Humanoid Engineering Explorer
Durum: `npm run validate:codex` **PASS** (157s — en yavaş kapı) | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P2 · `lint` ve `typecheck` yok.**
2. **P2 · CSP yok.**
3. **P3 · Kapı süresi 157s.** ILS v0.1 katalog doğrulama + `validate-glb.mjs` + build + 2 cihaz (desktop + mobile) Playwright. Kabul edilebilir ama portföyde en yavaş kapı; ilerleme adımı (timeout/heartbeat) yok, CI'da sessiz görünüyor.
4. Not: `model:build` / `model:render` Blender'a bağlı ve CI kapısının **dışında** — doğru karar (Blender CI'da kurulu değil), ama model yeniden üretimi ile deploy arasındaki bağ zorlayıcı değil.

Önerilen sıra: **P2 → P2 → P3**

---

### BEE — Honey Bee Collective Intelligence Laboratory
Durum: `npm run validate:codex` **ORTAM ENGELİ** (build + test + artifact PASS, e2e port çakışması) | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P2 · e2e kapısı yerel port çakışmasıyla kırılıyor.** `playwright.config.ts:11` `reuseExistingServer: false` ve port 4017 sabit. Yerelde unutulmuş bir `node scripts/serve.mjs` (PID 2718) portu tuttu → kapı "port already used" ile düşüyor. Kanıt: `npm run validate:codex` çıktısı, `lsof -nP -iTCP:4017`.
2. **P3 · 2/10 CI koşusu başarısız.** En son koşu başarılı.
3. Not: `AGENTS.md` mevcut ve `docs/` 8 dosya — portföydeki en iyi sözleşme örneklerinden. `verify:artifact` 10 varlığı doğruluyor. `experiment:batch` betiği üretim deneyi için ayrı akış.

Önerilen sıra: **P2 → P3**

---

### WML — World Model Laboratory
Durum: `npm run build` **PASS** | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P2 · `lint` ve `typecheck` yok.**
2. **P2 · CSP ve `X-Frame-Options` yok** — bu uygulamada güvenlik başlığı kapsamı en dar (yalnız `nosniff`).
3. **P3 · 2/10 CI koşusu başarısız.** En son koşu başarılı.
4. Not: CI'da `test:e2e:production` ayrı adım — yayın öncesi tarayıcı doğrulaması için iyi kalıp.

Önerilen sıra: **P2 → P2 → P3**

---

### CUL — Computer Use Laboratory
Durum: `npm run validate` **PASS** (68s) | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P2 · `lint`, `typecheck` ve ajan sözleşmesi yok** — üçü birden.
2. **P3 · 1/10 CI koşusu başarısız.** En son koşu başarılı.
3. Not: CI'da `test:ui` ayrı adım; `verify:live` canlı doğrulama yapıyor. `schemas/` klasörü ayrı — şema disiplini iyi.

Önerilen sıra: **P2 → P3**

---

### ADP — Model Adaptation Laboratory
Durum: `npm run validate` **PASS** (9s) | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P2 · `typecheck` ve ajan sözleşmesi yok.**
2. **P3 · 1/10 CI koşusu başarısız.** En son koşu başarılı.
3. Not: `format:check` CI kapısına giriyor; `predev`/`prebuild` hook'ları tanımlı. Tutarlı, düşük riskli uygulama.

Önerilen sıra: **P2 → P3**

---

### DPL — Decision Plane Laboratory
Durum: Geçiş 1 | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P2 · `lint`, `typecheck` ve ajan sözleşmesi yok.**
2. **P2 · `X-Frame-Options` ve CSP yok.**
3. **P3 · `<title>` biçim farkı.** "DPL — Decision Plane Laboratory" (em-dash) — yeni uygulamaların çoğu "DPL - ..." (tire) kullanıyor.
4. Not: `verify:live` CI'da; `docs/` 6 dosya. `schemas/` mevcut.

Önerilen sıra: **P2 → P2 → P3**

---

### MEM — Agent Memory Laboratory
Durum: Geçiş 1 | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P2 · `lint`, `typecheck` ve ajan sözleşmesi yok.**
2. **P2 · `X-Frame-Options` ve CSP yok.**
3. Not: `verify:live` CI'da; `vitest.config.ts` mevcut.

Önerilen sıra: **P2 → P2**

---

### POL — Programming Languages
Durum: Geçiş 1 | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P2 · `staticwebapp.config.json` hiç yok** — portföydeki tek istisna. `app_location: "/"` ile doğrudan kökten yayın; özel yönlendirme, önbellek ve güvenlik başlığı tanımı yok. Ayrıca `AGENTS.md`, `lint`, `typecheck`, `docs/` klasörü de yok.
2. **P3 · CI tek adımlı.** `npm run check` ve `verify` dışında e2e adımı görünmüyor; ölçüm sonucu (route/id) başlığı 200.
3. Not: Bağımsız (vanilla) mimari; `data/`, `tools/`, `cs-coverage-assessment.md` içerik odaklı.

Önerilen sıra: **P2 → P3**

---

### TFL — Token Flow Laboratory
Durum: Geçiş 1 | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P2 · `typecheck` ve ajan sözleşmesi yok.**
2. **P2 · `X-Frame-Options` yok.**
3. Not: `format` betiği var ama CI kapısına bağlı değil (yalnız `validate` koşuluyor).

Önerilen sıra: **P2 → P2**

---

### ARL — Agent Runtime Laboratory
Durum: Geçiş 1 | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P2 · `lint`, `typecheck`, ajan sözleşmesi ve CSP yok** — dört eksik birlikte.
2. **P2 · `X-Frame-Options` yok.**
3. Not: `src/core/runtime.ts` içinde uygulama-içi "stale" fault modeli var; CI kapısına bağlı değil (bkz. S1).

Önerilen sıra: **P2 → P2**

---

### DTR — Digital Triplet Laboratory
Durum: Geçiş 1 | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P2 · `lint`, `typecheck` ve ajan sözleşmesi yok.**
2. **P2 · `X-Frame-Options` yok** (immutable cache ve CSP var).
3. Not: CI'da `test:ui` + `verify:live` birlikte. `sourceCount: 5` kanonik kayıtta dolu.

Önerilen sıra: **P2 → P2**

---

### DCL — Deployment Choice Laboratory
Durum: Geçiş 1 | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P2 · `typecheck` ve ajan sözleşmesi yok.**
2. Not: `src/core/freshness.ts` ile 30/90 günlük kademeli tazelik mantığı var — `cld` ve `dcl` arasındaki politika farkının en somut örneği (bkz. S1).

Önerilen sıra: **P2**

---

### PDT — P-101 Interactive Digital Twin
Durum: Geçiş 1 | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P2 · `lint` ve `typecheck` yok.**
2. **P2 · CSP yok.**
3. Not: `asset:build` ayrı adım; `source/` klasörüyle ikili içerik yapısı.

Önerilen sıra: **P2 → P2**

---

### GEX — GPU Execution Explorer
Durum: Geçiş 1 | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P2 · `typecheck` yok.**
2. **P2 · `X-Frame-Options` ve CSP yok.**
3. **P3 · Kök adres 302 ile `/gex/anatomy`'ye yönleniyor.** `staticwebapp.config.json` `routes` bloğunda tanımlı — kasıtlı ve doğru çalışıyor, ancak kök (`/`) bir giriş noktası olarak boş kalıyor; ziyaretçi doğrudan alt sayfaya düşüyor.
4. Not: `app_location: azure-artifact` — portföydeki tek farklı yayın yolu; `build:atlas` + `assets:blender` Blender varlıkları üretiyor.

Önerilen sıra: **P2 → P2 → P3**

---

### ANT — Ant Colony Intelligence Laboratory
Durum: Geçiş 1 | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P2 · `typecheck` yok.** Ayrı bir `tsconfig.kernel.json` var (`lint` mevcut).
2. Not: `verify:live`, `evidence` betiği ve `lab.manifest.json` güçlü kanıt disiplini. `vendor/` bağımlılıkları `npm install` gerektiriyor. Araştırma kesim tarihi beyanı yok (kasıtlı — biyolojik ölçüm iddiası taşımıyor).

Önerilen sıra: **P2**

---

### WFM — World Models Atlas
Durum: `npm run validate:codex` **PASS** (10s) | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P2 · `lint` ve `typecheck` yok.**
2. **P1 notu · Araştırma kesim tarihi 25 gün eski** (2026-09-04) — kalabalıkta, tek başına yüksek risk değil.
3. Not: Vite + SSR + `prerender.mjs` — portföydeki tek SSR uygulaması; `research:scan` betiği kaynak taraması yapıyor. `AGENTS.md` mevcut.

Önerilen sıra: **P2**

---

### LLM — LLM Runtime & Serving Atlas
Durum: Geçiş 1 | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P1 notu · Araştırma kesim tarihi 25 gün eski** (2026-09-04).
2. **P3 notu · Tazelik penceresi 180 gün** (`src/features/freshness.ts:3`) — `cld`nin 30 günü ile en keskin fark (bkz. S1).
3. Not: `test:local-contract` ayrı test; kapı kapsamlı. `design-qa.md` tasarım denetimi dokümanı mevcut.

Önerilen sıra: **P1 notu → P3 notu**

---

### LCL — Local Compute Lab
Durum: Geçiş 1 | Canlı: 200 | Son deploy: 2026-09-28 ✓

1. **P1 notu · Araştırma kesim tarihi 25 gün eski** (2026-09-04).
2. Not: `refresh:data` betiği veriyi kendisi tazelemeye çalışıyor ama CI kapısına `validate`/`validate:data` olarak giriyor; `sync:portfolio` ile portföye bağlı. `sourceCount: 18`, `claimCount: 17` dolu.

Önerilen sıra: **P1 notu**

---

### SEC / CTX / EVL / ITL / USL / HNS
Durum: Geçiş 1 | Tümü canlı 200 | 2026-09-28 deploy ✓ | CI 0 hata

Bu altı uygulama portföyün tutarlı çekirdeğini oluşturuyor.

- **SEC, CTX, EVL** — `validate:codex` + `artifact:check` + `runtime:check` üçlüsü; DENY + CSP + immutable cache tam. Kesim tarihleri güncel (8–25 gün). Üçü de `/ → /en` yönlendirmesi uyguluyor — İngilizce varsayılan kuralıyla uyumlu.
- **HNS** — referans kalıp. DENY + CSP + immutable cache; `check` + `test:e2e` kapısı; `AGENTS.md` ve 4 `docs/` dosyası.
- **ITL** — `validate:codex` + `content:validate` + `test:metadata-export`; kök `staticwebapp.config.json` ile DENY + CSP. EN 96 KB ile portföydeki en ağır sayfa.
- **USL** — `build:azure` + `validate:content` + 3 ayrı test katmanı (`test:unit`, `test:rendered`, `test:static-rendered`). `content:sync` ile portföye bağlı. En kapsamlı kapı.

Önerilen sıra: **P1 notu** (llm/lcl benzeri kesim tarihi notu) — aksi halde düzeltme gerekmiyor.

---

## Düzeltme sırası

| Sıra | İş | Kapsam | Gerekçe |
|:-:|---|---|---|
| **1** | cld veri kayıtlarını resmî kaynaktan yeniden doğrula (AWS/Azure/GCP/Hetzner/Oracle/Cloudflare/DO/Vultr fiyat sayfaları + ECB) ve `verifiedAt` tarihlerini ilerlet | cld tek başına | Tek P0. Kapı açıldığında deploy otomatik akışa döner. Kapıyı susturmak için tarih uydurmak yasak — kaynak yeniden doğrulama şart. |
| **2** | Tazelik politikasını kararlaştır ve `llm` (180g) / `dcl` (30/90g) / `arl` (uygulama-içi) ile hizala | S1, 4 uygulama | Politika kararı diğerlerinin önkoşuludur; her yeniden doğrulama turunun maliyetini belirler. |
| **3** | aos'u yayınla (commit hâlihazırda `main`'de) | aos tek başına | 8 günlük yayın boşluğu, kod değişikliği gerektirmiyor. |
| **4** | aia + gpu + swi araştırma kesim tarihlerini yenile | 3 uygulama | 23–36 gün; içerik değeri doğrudan etkiler. |
| **5** | Eksik `typecheck` kapılarını ekle (16 uygulama) | S2 | Toplu, düzenli, düşük riskli. CI süresi artar. |
| **6** | Eksik `lint` kapılarını ekle (11 uygulama) | S3 | 5'ten sonra doğal sıra. |
| **7** | Eksik ajan sözleşmelerini ekle (10 uygulama) | S4 | `bee` kalıbı hazır. |
| **8** | Eksik CSP / `X-Frame-Options` başlıklarını ekle (12 + 9) | S5 | `hns` kalıbı hazır, mekanik iş. |
| **9** | Varsayılan dil politikasını kararlaştır ve tutarsız 10 uygulamayı hizala | S6 | Ürün kararı; SEO ve beklenen kullanıcı deneyimini etkiler. |
| **10** | `pol` için `staticwebapp.config.json` yaz | pol tek başına | Tek istisna, mekanik iş. |
| **11** | Yerel port yönetimini düzenle (`bee` ve diğerleri) | S8 | Geliştirici deneyimi; CI'yi etkilemez. |
| **12** | `repo-auditor-phase3-dryrun.md` içindeki bayat "@v1" iddiasını güncelle | S9 | Doküman geriliği. |

**Bağımlılık notu:** 5, 6, 7, 8 ve 10 birbirinden bağımsız ve paralel yapılabilir. 2 numaralı politika kararı, 4 numaralı kesim tarihi tazelemesinin hangi pencerede yapılacağını belirler — bu yüzden 2, 4'ten önce gelmelidir.

---

## Denetim yöntemi ve kanıt

**Geçiş 1 (30/30).** Git dalı/son commit/senkron durumu; CI workflow'undan çıkarılan gerçek kapı komutları; `package.json` script envanteri; `staticwebapp.config.json` varlığı ve güvenlik başlıkları; `AGENTS.md`/`CLAUDE.md`; README bölümleri ve `docs/` sayısı; canlı HTTP kodu, yönlendirme zinciri, gövde boyutu, `<title>`, `<html lang>`, favicon/OG sayısı, HSTS/CSP başlıkları; `researchCutoff`/`updatedAt`/`lastReleased` yaşları; son 10 CI koşusunun hata sayısı; açık issue/PR sayısı.

**Geçiş 2 (11 uygulama, gerçek kapı koşusu).**

| Uygulama | Kapı | Sonuç | Süre |
|---|---|---|---|
| cld | `npm run check` | **FAIL** — 52 bayat kayıt | ~5s |
| aos | `npm run validate` | PASS | 20s |
| gpu | `npm run lint` | PASS | 6s |
| eng | `npm run validate:codex` | PASS | 12s |
| hex | `npm run validate:codex` | PASS | 157s |
| swi | `npm run validate:codex` | PASS | 41s |
| wml | `npm run build` | PASS | 1s |
| cul | `npm run validate` | PASS | 68s |
| adp | `npm run validate` | PASS | 9s |
| wfm | `npm run validate:codex` | PASS | 10s |
| bee | `npm run validate:codex` | ORTAM ENGELİ — port 4017 çakışması (build/test/artifact PASS) | 12s |

Ek doğrulama: cld'de `npm run lint` **PASS** (exit 0) ve `npm run test` **PASS** (3/3) — kırılma yalnızca veri tazeliğinden.

**Sıfır değişiklik kanıtı.** Denetim sonunda 30/30 repo `git status --porcelain` ile **temiz** (build çıktıları `.gitignore` kapsamında). `aserdargun-com` yalnızca denetim öncesinden mevcut olan `node_modules/` ve `pnpm-lock.yaml` untracked girdilerini taşıyor; bu dosyaya dokunulmadı.

---

## Çözülmemiş kararlar

1. **Tazelik penceresi politikası** — tek standart mı, yoksa kaynak türüne göre mi? (S1, düzeltme sırası #2)
2. **Varsayılan dil** — tüm subdomain'ler İngilizce mi açılmalı, yoksa Türkçe açılış mevcut kural mı? (S6)
3. **CSP kapsamı** — 12 uygulamada CSP yok. `unsafe-inline` gereken yerler olacak mı, yoksa sıkı politika mı uygulanacak? (S5)
4. **Düzeltme turunun kapsamı** — P2'ler mekanik ve toplu; P1'ler içerik araştırması gerektiriyor. Hepsinin tek oturumda bitmesi beklenmiyor.
