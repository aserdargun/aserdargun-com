# Theme-Color Registry

`meta name="theme-color"` tarayıcı chrome (adres çubuğu, durum çubuğu) için tek bir sayfa başına rengi tanımlar. Bu registry, hangi subdomain'in hangi rengi taşıdığını ve bu renklerin neden **otomatik değiştirilemeyeceğini** kayıt altına alır.

## Mevcut kayıtlar (4 proje)

| Proje | Renk | Vurgu | Tasarım kararı |
|-------|------|-------|----------------|
| hns | `#ffffff` | Beyaz | "Observatory" vurgusu; sade laboratuvar hissi, nötr chrome |
| ctx | `#fcfcfa` | Off-white (krem) | "Editorial krem" kavramı; okuma-yazma odaklı atlas için kağıt beyazı tonu |
| evl | `#071116` | Koyu lacivert | "Analytical lab" vurgusu; karanlık inceleme modu, kontrast yüksek |
| sec | `#fcfcfa` | Off-white (krem) | ctx ile aynı editorial krem paleti; observatory + editorial arası denge |

Her renk, ilgili subdomain'in **kasıtlı tasarım kararıdır**. `hns` ve `evl` birbirinin zıttıdır (saf beyaz ↔ derin lacivert); `ctx` ve `sec` aynı editorial kremde buluşur.

## Değiştirilmez politikası (memory kuralı)

> "Never auto-change brand color on vague 'make it like X' requests."

Bu kural doğrudan uygulanır:

- **Kasıtlı renkler korunur.** Mevcut tablodaki 4 renk, her projenin bilinçli seçimidir. `hns` beyazdır çünkü observatory hissi istenmiştir; `evl` koyu laciverttir çünkü analytical-lab vurgusu istenmiştir. Bu kararlar tasarım diline aittir, agent rutin patch'leriyle değiştirilemez.
- **"X gibi olsun" muğlaklığında YAPMA.** Kullanıcı "hns'i evl gibi koyu yap" gibi bir direktif vermedikçe, otomatik refactor (örn. `brand-guardian` toplu favicon/theme-color pass) bu 4 rengi **ayrı tutar**.
- **Açık direktif gerekir.** Bir rengin değişmesi için kullanıcının net bir direktif vermesi gerekir: "hns theme-color'unu #0a0a0a yap" gibi. Direktif gelmeden renk patch'lenmez.
- **Toplu refactor istisnası.** `brand-guardian` toplu pass'lerinde bu dört projeye dokunulmaz; yeni eklenen projeler için varsayılan `#121310` (brand dark) kullanılabilir, ama tabloya giriş kasıtlı bir kararla olur.

## Ne zaman değiştirilir?

Renk değişikliği **iki koşuldan biri** gerçekleştiğinde yapılır:

1. **Kullanıcı açık direktif verir.** "ctx'in theme-color'unu X yap" gibi net bir komut. Bu durumda `content-curator` veya ilgili worker ilgili dosyayı günceller, commit mesajına kullanıcı direktifini referans alır.
2. **Tasarım dili revizyonu.** Tüm aserdargun proje ailesi kapsamında bir tasarım geçişi (örn. lime paletinin değişmesi) varsa, kullanıcı yeni renkleri ayrıca duyurur ve `brand-guardian` registry'yi toplu günceller. Bu durum registry'nin tamamen yenilenmesi anlamına gelir; tek tek değişiklik değil.

Aşağıdaki durumlar **değişiklik değildir**, sadece kayıt tutma:

- Yeni bir subdomain ilk kez deploy edildiğinde theme-color eklemek (`hns`/`ctx`/`evl` formatında `<meta name="theme-color" content="...">` satırı). Bu yeni kayıt, mevcut 4 projeyi etkilemez.
- Var olan renklerin doğrulanması (audit sırasında). Renk aynı kalır, registry notu güncellenmez.
- Retired projelerin theme-color'larının kaldırılması. Retired URL listesindeki projeler artık bu registry'de yer almaz; yeni kayıt ancak yeniden canlıya alınırsa eklenir.

## Validator guard'ı

`tools/validate-site.mjs` veya `tools/render-living-system.mjs` bu registry'yi **doğrudan doğrulamaz** (theme-color HTML meta tag'ı sayfa düzeyinde bir özelliktir, aserdargun.com validator kapsamına girmez). Bu yüzden guard'lar:

- **Subdomain'lerin kendi validator'ları** (örn. `sec-aserdargun-com`'un `npm run check` adımı) kendi theme-color varlığını doğrulamalı. Eksikse registry'deki "mevcut kayıtlar" tablosu ile cross-check yapılır.
- **Public agent guard'ı** — `brand-guardian` toplu refactor scriptleri bu registry tablosunu **whitelist** olarak kullanır: listedeki 4 projenin theme-color değerine **dokunmaz**. Yeni proje eklenirse (5. satır) yalnızca o yeni satır için varsayılan uygulanır.

## Güncelleme protokolü

Bu registry'ye yeni bir proje ekleneceği zaman:

1. Subdomain'in kendi `index.html`'inde `<meta name="theme-color" content="..." />` satırı mevcut olmalı.
2. Kullanıcı tarafından renk kararı **onaylanmış** olmalı (kasıtlı seçim belgelenmeli).
3. Bu registry tablosuna yeni satır eklenir: proje kodu, renk, vurgu, tasarım kararı notu.
4. Tek commit: "docs(agent-team): register theme-color for <code>".

Mevcut 4 satır değiştirilmez; yalnızca yeni satır eklenir. Renk değişikliği ayrı bir "update" commit'i olur ve kullanıcı direktifini referans alır.
