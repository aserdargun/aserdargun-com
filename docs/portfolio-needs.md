# Portfolio Development Needs — 30 Uygulama

**Son denetim:** 30 Eylül 2026 (ikinci tur — eylem sabitlemesi, S11)
**Kapsam:** 30/30 uygulama + 33 depo (30 kamu + `inf`, `nxt`, `stk`)
**Yöntem:** İki geçişli denetim — Geçiş 1 hızlı tarama (30/30), Geçiş 2 tam kapı koşusu (11 uygulama)
**Durum:** Denetim **salt-okunur yapıldı**; 30 uygulamanın tamamı değişiklik yapılmadan tarandı. Ardından denetimde çıkan sorunlar giderildi ve 11 uygulama ile bu kayıt defteri değiştirildi. Değişikliklerin tamamı aşağıdaki "Düzeltme kaydı" bölümünde listelidir.
**30 Eylül turu:** S9'un "30/30 SHA sabitliyor" tespiti denetimde yanlış çıktı — fleet beş ayrı referans kullanıyordu. 33 deponun tamamı tek kanonik kümeye alındı, 5 uygulamanın bozulan sözleşme testleri düzeltildi, 30/30 yayın kimliği ilerletildi. Ayrıntı S11 ve "Düzeltme kaydı — 30 Eylül 2026".

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
| **Varsayılan dil, 9 uygulama** | ✅ **ÇÖZÜLDÜ** | `cld, cul, dtr, llm, lcl, mem, bee, aos, dpl` — canlıda 9/9 `<html lang="en">` ile doğrulandı; `gpu` tasarımı gereği zaten doğruymuş |
| **CSP, 12 uygulama** | ✅ **ÇÖZÜLDÜ** | `aia, mem, gpu, cld, eng, gex, arl, wml, pdt, hex, dpl, pol` — her biri kendi tarayıcı testiyle doğrulandı (gpu 242, dpl 22, gex/arl/pdt/wml/cld e2e). Canlıda 12/12 `content-security-policy` + `x-frame-options: DENY` + `nosniff` doğrulandı |
| **ESLint, 7 uygulama** | ✅ **ÇÖZÜLDÜ** | `hex, cul, mem, dtr, pdt, aos, eng` — kuruldu, kapının ilk adımı yapıldı, 19 ihlal düzeltildi, 7/7 CI yeşil ve yayınlandı |
| **lint toplamı** | ✅ **30/30** | `bee`, `pol`, `tfl`, `adp`, `dcl` de son anda eklendi. `tfl`/`adp`/`dcl`'in `lint` script'i aslında `tsc --noEmit` idi — tip kontrolü lint yerine geçiyordu. Artık 26 uygulama ESLint, 4 uygulama oxlint kullanıyor |
| **oxlint, 4 uygulama (TS 7)** | ✅ **ÇÖZÜLDÜ** | `dpl, wfm, arl, wml` — `typescript-eslint` TS 7 desteklemiyor; `oxlint` kullanıldı, 14 bulgu düzeltildi. Bkz. S3 |
| **aos P1 "8 gündür deploy edilmedi"** | ❌ **YANLIŞ POZİTİF — geri alındı** | `HEAD = origin/main = son deploy = b286ceb`. Yayınlanmamış commit yok; sadece 8 gündür değişiklik yok |
| **gpu "CI'da test adımı görünmüyor"** | ✅ **DOĞRULANDI, kök neden bulundu** | CI'da `npm test` **var** (`validate.yml:43-44`). Asıl sorun: `playwright.config.ts` içinde `webServer` bloğu **yok**, `test:e2e` elle başlatılan dev sunucusunu (5173) bekliyor. Bu yüzden tarayıcı testi hiçbir otomatik akışta çalışmıyor |

### Düzeltme kaydı — 30 Eylül 2026 (ikinci tur: eylem sabitlemesi)

Bu turun kapsamı 29 Eylül'de kapatılmış sayılan kalemlerden biriyle başladı: **S9, "30/30 workflow deploy eylemini SHA ile sabitliyor" diye kaydedilmiş, ama fiilen iki SHA kullanılıyordu.** Tam tur S11.

| İş | Durum | Kanıt |
|---|---|---|
| **Eylem sabitlemesi, 33 depo** | ✅ **ÇÖZÜLDÜ** | 44 workflow dosyası tek kanonik kümeye alındı. `npm run verify:pins` → `PASS (5 distinct references)`. 30/30 uygulama yeniden yayınlandı |
| **Test sözleşmeleri, 5 depo** | ✅ **ÇÖZÜLDÜ** | `gpu, eng, evl, itl, usl` — sabitleme değişimi kendi kapılarını kırmıştı; aşağıdaki 6. madde |
| **Yayın kayıt defteri, 30 uygulama** | ✅ **ÇÖZÜLDÜ** | `releaseSha` + `lastReleased` 30/30 ilerletildi (2026-09-30). `npm run audit:releases` → 30/30 eşleşiyor |
| **`eng` yayın kapısı** | ✅ **ÇÖZÜLDÜ** | İlk koşu `Release rejected: ENG releaseSha must be recorded` ile düştü — kapı tam da tasarlandığı gibi çalıştı. Kayıt defteri güncellenip yeniden tetiklendi |
| **S9 doküman** | ✅ **ÇÖZÜLDÜ** | Tarihli dry-run belgesinin gövdesi korundu, başına geçersiz kılma notu eklendi; kanonik küse `deploy-protocol.md`'ye taşındı |
| **Yeni kapı — `verify:pins`** | ✅ **EKLENDİ** | `tools/verify-action-pins.mjs`, 8 test, `npm test` içinde. Saptamayı sessizce geri dönemez hale getirir |

**Düzeltme sırasında çıkan kalıp hatalar (tekrar edilmesin):**

### Yeni keşfedilen kapı — yayın kayıt defteri (P1)

Denetimin ilk turunda kaçırıldı, düzeltme sırasında ortaya çıktı. **`eng`, `hex` ve `nxt`** kendi commit'lerinin SHA'sı `aserdargun-com/data/living-system.json` içine yazılmadan **yayın yapmıyor**:

```
Check out canonical release registry   (aserdargun/aserdargun-com)
  → Verify registered release identity
  → Deploy prebuilt artifact
```

`eng` bu yüzden ilk deploy denemesinde düştü. `releaseSha` kayıt defterine yazılıp `gh run rerun` ile yeniden tetiklenince geçti. `hex` aynı kapıya rağmen geçti — tetiklenme koşulu bu iki uygulamada farklı işliyor, ayrı incelenmeli.

`aserdargun-com/tools/portfolio-phase-one.test.mjs` gex/wml/hex/pdt için doğrulanmış deploy koşu kimliklerini sabit kodluyor ("only a confirmed deployment run establishes a release date"). Yeniden deploy edilen bir uygulamanın kaydını güncellemek, o testin tablosunu da güncellemeyi gerektiriyor.

**Düzeltme sırasında çıkan kalıp hatalar (tekrar edilmesin):**
1. `staticwebapp.config.json` içinde **`globalHeaders` bloğu zaten varsa** yeni blok eklemek yedek anahtar yaratıyor; JSON.parse son kazanır, eklenen CSP görünmez oluyor. `gex`te bu oldu. Her eklemeden sonra blok sayısını say.
2. `aos` ve `mem` gibi **tek satırlık kompakt JSON**'da çok satırlı kalıba göre düzenleme yapmak girintiyi bozuyor; `dpl` ve `wml`de oldu, ikisi de düzeltildi.
3. `gex`in kök adresi `302` yönlendirdiği için `curl -I` **yönlendirme yanıtının** başlıklarını verir; CSP'yi `/gex/anatomy` üzerinde doğrulamak gerekiyor. Aksi halde yanlış negatif üretiyor.
4. **`git checkout package.json` ile bir script'i geri almak, kurulumun eklediği devDependencies'i de siler.** `hex`te `typecheck`'i geri alırken ESLint bağımlılıkları manifestten düştü. Yerel `node_modules` durduğu için yerel kapı **geçti**, CI'da `sh: 1: eslint: not found` oldu. Bir `package.json`'ı `npm install -D` sonrasında hiçbir koşulda toptan geri alma; alan bazlı düzelt.
5. **Deploy sonrası canlı doğrulama yayılma yarışına açık.** `dpl` ("Verify live release and asset hashes") ve `dtr` ("Verify live commit and asset hashes") ilk koşuda düştü, ikincisinde de `dpl`in canlı kullanıcı akış testi zaman aşımına uğradı. Her ikisinde de **deploy adımı başarılıydı ve canlı site yeni içerikti**; yeniden koşuda tüm adımlar geçti. Yani bu, ürün hatası değil; doğrulama, CDN yeni sürümü görmeden önce çalışıyor. Kapı kendi kendini kapatıyor ama yanlış sebeple.
6. **Eylem sabitlemesini değiştirmek, onu sözleşme olarak kullanan testleri kırar.** 30 Eylül turunda 33 depo tek SHA'ya alınınca **5 uygulamanın kapısı kırmızıya döndü** — ve üçü pilot (`hns`, `dtr`, `lcl`) yeşil olduğu için bu ikinci dalgada göründü. İki ayrı sınıf vardı:
   - `gpu`, `eng`, `evl`, `itl` deploy SHA'sını **sabit kodluyordu**; değişince kırmızı.
   - `usl` `uses:` satırlarını `/^\s+(?:- )?uses: ([^\s]+)$/gm` ile okuyordu. Bu desen **satır sonuna** bağlı olduğu için `uses:` satırına açıklayıcı bir `# sürüm` yorumu eklemek satırı eşleşmez hale getirdi ve yakalanan liste küçüldü. `lcl` aynı işi `[^\s#]+` ile zaten toleranslı yapıyordu.

   > **Öğrenilen ilke:** pilot yeşil demek "etki alanı dar" demek değildir. Değişikliğin dokunabileceği sözleşmeleri **önce** ara (`grep -rl "1a947af9\|@v[0-9]" --include="*.mjs" --include="*.ts"`), sonra pilotla. Bir de: *yorum eklemek* de bir davranış değişikliğidir — onu da kapıya sor.

> 4. ve 6. maddeler bu turda karşılaşılan asıl riski özetliyor: **yerelde geçen bir şeyin CI'da geçeceğini varsaymak.** Bu portföyde kapı zincirleri çok katmanlı ve her katman farklı bir ortam koşuluna bağlı.

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

### S3 — `lint` kapısı 11 uygulamada yok (P2) — ✅ **29 Eylül'de 11/11 kapatıldı (iki araç, tek politika)**
Eksik olanlar: `dpl, cul, aos, mem, wfm, eng, arl, wml, dtr, pdt, hex`.

**TypeScript sürümü ikiye bölüyordu.** Yedi uygulama TS 5.9/6 ve standart ESLint + `typescript-eslint` alıyor. Dördü (`dpl, wfm, arl, wml`) **TS 7.0.2** kullanıyor ve `typescript-eslint@8.71.0` yalnızca `typescript >=4.8.4 <6.1.0` destekliyor. `--legacy-peer-deps` ile kurulabilirdi ama tip-farkındalıklı kurallar sessizce atlatılırdı — yani **görünür ama işe yaramayan bir kapı**. Bu yüzden dördü **`oxlint`** kullanıyor: TypeScript 7 için tasarlanmış, `oxlint-tsgolint` eşlikçisiyle tip-farkındalıklı çalışıyor ve gerçekten kırılan şeyleri buluyor (denendi: kasıtlı bir ihlal bırakıldığında yakaladı).

**Kural seti farkında değil, politikada tutarlılık hedeflendi.** oxlint'in varsayılanı `typescript-eslint`'in `recommended`'ından daha katı. Kapatılan kurallar ve gerekçeleri:

| Kural | Neden kapalı |
|---|---|
| `no-await-in-loop` | Testlerde ve sıralı simülasyonda kasıtlı bekliyor (19 bulgu) |
| `typescript/no-unsafe-type-assertion`, `no-unnecessary-type-assertion` | Derleyicinin daraltamadığı ama çalışma zamanında sağlam desenleri işaretliyor — `e.target.value as PolicyId` gibi. Diğer yedi uygulama da bu kuralları açmıyor |
| `consistent-return` | React effect temizliği: temizlenecek şey yokken `return;` doğru |
| `unicorn/no-array-reverse` | `.slice()` kopyasında `reverse()` güvenli |
| `oxc/no-map-spread` | Değişmez (immutable) `map` kalıbı için gürültü |
| `typescript/require-array-sort-compare` | ISO tarih dizilerinde varsayılan sıralama zaten kronolojik |

**Gerçekten düzeltilen 14 bulgu:** 10 × `no-shadow` (değişken gölgesi), 1 × kullanılmayan import, 1 × gereksiz regex kaçışı, 1 × `!!` yerine açık `?? false`, 1 × bağlanmamış metot referansı.

> Dört uygulamada iki araç kullanılıyor ama **uygulanan politika aynı.** Bu, tek bir araç zorlamak yerine kapının ne anlama geldiğini sabitlemeyi tercih etti.

### S4 — Ajan sözleşmesi 10 uygulamada yok (P2)
`AGENTS.md` olmayanlar: `dpl, cul, aos, mem, pol, tfl, arl, adp, dtr, dcl`.
`docs/superpowers/agent-team/` altında bu iş için bir takım tasarımı ve `bee` için 9 maddelik sözleşme kalıbı var, ancak **tasarlanan uzman ajanların hiçbiri kurulmamış** (`mavis agent list` yalnızca 4 yerleşik ajanı gösteriyor).

### S5 — Güvenlik başlığı kapsaması eşit değil (P2) — ✅ **29 Eylül'de kapatıldı**
- `X-Frame-Options` yok (9): `dpl, aos, mem, pol, gex, tfl, arl, wml, dtr` → **hepsi eklendi, canlıda doğrulandı**
- `Content-Security-Policy` yok (12): `aia, dpl, mem, gpu, cld, eng, gex, arl, wml, pdt, hex, pol` → **hepsi eklendi, her biri kendi tarayıcı testiyle doğrulandı**
- Kalan tek eksik: `pol`da tarayıcı testi yok (yalnız 16 düğüm testi), bu yüzden CSP canlıda gözle doğrulandı.
- `nosniff` **30/30 var** · HSTS **30/30 canlıda var**
- `hns` ve `swi` referans kalıp (DENY + CSP + immutable cache).

### S6a — `researchCutoff` bir **beyan**; 11 uygulamada doğrulanamaz (P1) — yeni bulgu

Denetimde "kesim tarihi bayat" diye kaydedilen P1 kalemi, ölçüm sonrası **çerçevesi değişti.** `researchCutoff` `data/living-system.json` içinde tek bir alan; her uygulamanın kendi deposunda bu tarihi *yeniden türetilebilir* kılan bir kanıt izi var mı, ona bakıldı:

| Uygulama | Depodaki doğrulama izi | Durum |
|---|---|---|
| `cld` | 65 kaydın `verifiedAt` + kaynak `accessedAt` | ✅ **yeniden doğrulanabilir** — 29 Eylül'de yapıldı |
| `aia` | **445** `verifiedAt` (en eski 2026-08-11) | ✅ yeniden doğrulanabilir ama **büyük bir araştırma işi** |
| `llm` | 30 `verifiedAt` | ✅ yeniden doğrulanabilir, ölçek makul |
| `evl` | 9 | ✅ küçük |
| `swi` | tek bir `<time dateTime="2026-09-06">` — "Initial collection" | ⚠️ toplama tarihi, kayıt başına kanıt değil |
| `ctx, wfm, hns, sec, itl` | tarihler var ama **içerik tarihleri** (makale yılı, olay tarihi) | ⚠️ doğrulama tarihi değil |
| `usl, lcl` | 2026 tarihleri var, nitelikleri belirsiz | ⚠️ doğrulanamadı |
| `gpu, eng` | **hiç tarih alanı yok** | ❌ doğrulanamaz |

**Sonuç:** 14 araştırma uygulamasının 11'inde `researchCutoff` yalnızca kayıt defterindeki bir iddia. Onu ilerletmek, o uygulamanın araştırmasını gerçekten yeniden okumak demek — ve bugün için ucuz bir yol yok. Bu, "tarihleri tazele" listesinden "11 uygulamada doğrulanabilir bir kanıt izi kur" işine dönüşüyor.

**Öneri (karar gerekli):** ya bu izi kur (`cld` ve `aia`ın yaptığı gibi kayıt başına `verifiedAt`), ya da `researchCutoff` alanının "beyan mı kanıt mı" olduğunu kayıt defterinde açıkça belirt. Şu an ikisinin arasında bir yerde duruyor ve bu, sessizce bayatlayan bir iddiaya davet çıkarıyor.
### S6 — Varsayılan dil politikası yok (P2) — ✅ **29 Eylül'de kapatıldı (8 uygulama + 1 zaten doğru)**
Başlangıçtaki durum: 20 uygulama `/` adresinde İngilizce, 10 uygulama Türkçe açılıyordu. `sec, ctx, evl, wfm` `/ → /en` yönlendirmesiyle İngilizce'yi zorunlu kılarken `llm, dpl, cul, aos, mem, gpu, cld, lcl, bee, dtr` sessizce Türkçe açılıyordu.

**Çözülen ve yayınlanan (9):** `cld, cul, dtr, llm, lcl, mem, bee, aos, dpl` — hepsi artık `/` adresinde İngilizce açılıyor, Türkçe tek adım uzakta. Her biri kendi tam kapısıyla doğrulandı ve canlıda `<html lang="en">` ile teyit edildi.

**Değişiklik zaten doğru olan — `gpu` (değiştirilmedi):** `gpu` ham HTML'de `lang="tr"` basıyor ama istemci tarafı `navigator.language`'ı okuyor ve **Türkçe değilse İngilizce seçiyor** (`app/atlas/state.mjs:25-27`). Depo sabitinde de niyet açıkça yazılı: *"the path is the production/static locale contract, so an unqualified root is always Turkish"* — yani sunucu tarafı Türkçe, ziyaretçinin diline göre düzeltilen tasarım bilinçli. Proxy'yi değiştirmek bu iki locale testini kırdı ve geri alındı. **Denetimdeki "gpu / = tr" gözlemi yanlış pozitifti**: ham HTML'e bakmak, istemci tarafı çözümlemeyi görmez.

**Öğrenilen ilke — testler varsayılanı devralmasın.** İlk denemede (`dpl`) varsayılanı çevirince 22 tarayıcı testinden 10'u düştü ve iş "büyük" görünüyordu. Asıl mesele başkaydı: testler Türkçe yüzeyi iddia ediyor ama **dili beyan etmiyordu**. Çözüm iddiaları çevirmek değil, testlere dili açıkça vermekti:

```ts
// cld — src/test/setup.ts
window.history.replaceState({}, '', '/?lang=tr')
```

Bu tek satır `cld`'de 113 düşen birim iddiasını kurtardı. `cul` ve `dtr` yalnızca birer `goto` değişikliğiyle geçti; `lcl` hiç test değişikliği istemedi. Her uygulamaya ayrıca **giriş davranışını iki yönlü kilitleyen** bir tarayıcı testi eklendi, böylece varsayılan bir daha sessizce kayamaz.

> Bu ilke tek başına bir kodlama tercihi değil, bir doğrulama tercihi: *yazıldığı dili kapsamayan bir test, o dili kapsamıyormuş gibi yeşil kalır.*

### S7 — Kullanıcıya görünen davranış farkı (P3)
- `gex` kök adresi `302 → /gex/anatomy` yapıyor (bilinçli, `staticwebapp.config.json` `routes` bloğunda tanımlı — çalışma mantığı doğru ama kök sayfa "boş" kalıyor).
- `aos` kök adresi Türkçe açılıyor, `<title>` "Genel bakış — AOS".
- `cld` kök adresi 929 bayt — ince bir kabuk, karşılaştırma arayüzü JavaScript ile yükleniyor.

### S8 — Yerel port yönetimi eksik (P3) — ölçüldü, kalıcı çözüm yok
`bee`nin Playwright config'i `reuseExistingServer: false` kullanıyor ve 4017 portunu sabit. Port doluysa kapı şu mesajla düşüyor:

```
Error: http://127.0.0.1:4017 is already used, make sure that nothing is running on the port/url
```

**29 Eylül'de ölçüldü:** engelleyen süreç, unutulmuş bir kullanıcı süreci değil, **test koşusunun kendisinin bıraktığı bir yetimdi** (39 saniye yaşındaydı). Playwright normalde temizliyor; yarım kalan ya da zorla kesilen koşular yetim bırakıyor ve sonraki koşuyu yanlış sebeple düşürüyor. CI temiz runner kullandığı için orada görünmüyor.

**Daha sinsi bir varyant:** `cul` ve `dtr` `reuseExistingServer: true` kullanıyor ve **başka bir checkout'tan gelen bayat sunucu** testlere eski kodu servis etti. `bee`deki gibi hata fırlatmak yerine testler **yanlış ürünü doğrulayarak yeşil** göründü.

**29 Eylül'de kapatılan kısım:** `cul` ve `dtr`'de `reuseExistingServer` **kapalı** yapıldı. Artık başka bir checkout'un sunucusu portu tutsa kapı port mesajıyla **gürültülü biçimde düşüyor**; daha önce sessizce yanlış ürünü doğrulayıp yeşil görünüyordu. Kapı yerel geliştirmede artık daha sıkı ama dürüst.

**Kapanmayan kısım:** üç uygulamada da `webServer` bloğu, çalışan sunucunun bu checkout'a ait olduğunu **doğrulamıyor**; yalnızca portun dolu olmadığına bakıyor. Bekleyen yanıtta bu checkout'un benzersiz bir işareti aransa (ör. çalıştırma başına üretilen bir belirteç) doğrulama yapılabilir. Bu, yerel geliştirme ergonomisini etkileyen P3 bir iş; kapı artık yanlış yeşil vermiyor, dolayısıyla doğruluğu etkilemiyor.

Bu bir ürün hatası değil (CI temiz runner kullanıyor) ama geliştirici deneyimini bozuyor ve hata mesajı yanıltıcı. `aserdargun-com/docs/superpowers/agent-team/capability-matrix.md` ve önceki denetim notunda da port çakışması riski işaretlenmişti.

### S9 — Dokümantasyon tutarsızlığı (P3) — ✅ **30 Eylül'de kapatıldı**
`docs/superpowers/agent-team/repo-auditor-phase3-dryrun.md` (8 Eylül 2026) diyor ki *"16/16 `azure/static-web-apps/deploy@v1` kullanıyor"*.

**30 Eylül'de fleet taraması bunu sandığından daha kötü buldu:** 30/30 workflow deploy eylemini SHA ile sabitliyordu ama **iki farklı SHA'ya**. Denetimin yazdığı `1a947af9…` yalnızca 14 uygulamada vardı; diğer 21'de `4d273957…` idi. Yani "sürüm drift'i yok" tespiti, tek bir SHA varmış gibi yazılmıştı.

Doküman artık **tarihsel kayıt olarak** duruyor (gövdesi silinmedi) ve başına tarihli bir geçersiz kılma notu eklendi; kanonik küme `docs/superpowers/agent-team/deploy-protocol.md` §"Kanonik eylem pinleri" altında. Bkz. S11.

### S11 — Eylem sabitlemesi fleet genelinde dört parçaydı (P2) — ✅ **30 Eylül'de kapatıldı**

29 Eylül denetimi "30/30 SHA sabitliyor" diye yazıp geçti. Gerçek tablo beş ayrı referanstı:

| Eylem | 29 Eylül'deki durum | Sonuç |
|---|---|---|
| `Azure/static-web-apps-deploy` | **14 depo** `1a947af9` (2021) · **21 depo** `4d273957` (2024) | iki ayrı commit |
| `actions/checkout` | `dtr`, `gex`, `lcl` **v6.1.0**; geri kalan v7.0.1 | iki ayrı ana sürüm |
| `actions/setup-node` | `dtr`, `gex`, `lcl` **v6.5.0**; geri kalan v7.0.0 | iki ayrı ana sürüm |
| `hns` `ci.yml` | `actions/checkout@v7` + `actions/setup-node@v7` — **kayan etiket, SHA sabitlemesi yok** | politikaya aykırı |
| `aserdargun-com` `verify-applications.yml` | `actions/upload-artifact@ea165f8` (**v4**, Mart 2025) | geride |

**Neden deploy eylemi 2021'deydi.** Upstream deposunda `v1` **etiketi** 2021'deki `1a947af9`'a işaret ediyor ve donmuş; `v1` **dalının başı** ise `4d273957` (11 Eylül 2024). İkisi arasındaki fark saf ekleme: `action.yml` içinde **21 satır eklenmiş, hiçbir satır silinmemiş** — `config_file_location`, `skip_api_build`, `is_static_export`, `data_api_location` ve `production_environment` girdileri. Bu yüzden fleet dal başını sabitler ve satır yorumunda bunu yazar; `# v1` yorumu etiketi işaret ettiği için yanıltıcıdır.

**Kapatılan:** 33 deponun 44 workflow dosyası tek kanonik kümeye alındı — `checkout` v7.0.1, `setup-node` v7.0.0, `upload-artifact` v7.0.1, `cache` v6.1.0, `static-web-apps-deploy` dal başı. Fleet taraması artık **5 referansın hepsinde tek SHA** gösteriyor.

**Yeni kapı:** `tools/verify-action-pins.mjs` (`npm run verify:pins`) kardeş depoları tarar, tek satırda iki işi birden ayırır ve `uses:` referansları kanonik küme dışına çıktığında başarısız olur. Kayan etiket, yanlış commit ve yanıltıcı sürüm yorumu **ayrı ayrı** raporlanır. 8 testle kapsandı, `npm test` içine alındı. Bu, S9'daki kalıcı boşluğu kapatır: sapma bir kez oldu, artık sessizce geri dönemez.

> **Kapsam notu:** bu bir yerel operatör aracı, CI adımı **değil**. `aserdargun-com`'un tek başına bir checkout'unda kardeş depolar bulunmaz; CI'da çalıştırmak "denetlenecek bir şey yok" diye sessizce geçerdi. Yeni bir subdomain kurulduğunda elle çalıştırılır.


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

## Kalan iş ve gerekçeleri

| İş | Durum | Gerekçe |
|---|---|---|
| **P1 — `researchCutoff` doğrulanabilirliği** | ⏸ **beklemede, karar gerekiyor** | 14 araştırma uygulamasının 11'inde bu alan yalnızca kayıt defterinde bir iddia; depoda yeniden türetilebilir kayıt yok. İleriletmek araştırma işidir. `cld` bu yolu izleyerek 51 kaydı doğruladı — aynı yol `aia` için 445 kayıt demek. |
| **P1 — `cld` veri tazelik penceresi** | ⏸ **beklemede, politika kararı gerekiyor** | 30 günlük pencere korundu ve kayıtlar doğrulandı, ancak pencere 30 Eylül'de yeniden açıldı. Aynı kapı önümüzdeki dört haftada yeniden kapanacak. `llm` 180 gün, `dcl` 30/90 gün ile çalışıyor; tek bir politika belirlenmeli. |
| **P1 — aia / gpu araştırma kesim tarihi** | ⏸ **beklemede** | `aia` 36 gün (445 doğrulanabilir kayıt), `gpu` 31 gün (depoda hiç doğrulama tarihi alanı yok). |
| **P3 — yerel sunucu sahiplik doğrulaması** | ⏸ **beklemede, düşük öncelik** | `bee`, `cul`, `dtr` web sunucusu bu checkout'a ait mi diye bakmıyor; ancak kapı artık yanlış yeşil vermiyor, bu yüzden doğruluk değil ergonomik eksik. Bkz. S8. |
| **P3 — varsayılan dil kalıbının kalanı** | ✅ karar verildi, uygulandı | `gpu` dışındaki 9 uygulama İngilizce açılıyor; `gpu` tarayıcı diline göre çözüyor ve bu bilinçli. |
| **P3 — eylem sabitlemesi sapması** | ✅ karar verildi, uygulandı | S11. Tek kanonik küme + `npm run verify:pins` kapısı. Artık sessizce geri dönemez. |
| **P3 — doküman geçersiz kılma** | ✅ karar verildi, uygulandı | S9. Tarihli denetim belgesinin gövdesi korunur, başına tarihli not gider; kanonik politika ayrı bir referans belgesinde durur. |

## Çözülmemiş kararlar

1. **Tazelik penceresi politikası** — tek standart mı, yoksa kaynak türüne göre mü? (S1, düzeltme sırası #2)
2. **`researchCutoff` beyan mı kanıt mı** — 11 uygulamada yeniden türetilebilir kayıt kur, yoksa kayıt defterinde "beyan" olduğunu açıkça yaz? (S6a)
3. **Düzeltme turunun kapsamı** — P2'ler mekanik ve toplu; P1'ler içerik araştırması gerektiriyor. Hepsinin tek oturumda bitmesi beklenmiyor.

> Kapatılan kararlar: varsayılan dil (S6, İngilizce varsayılan — `gpu` hariç istisna) ve CSP kapsamı (S5, 12 uygulamada eklendi ve tarayıcı testiyle doğrulandı).
