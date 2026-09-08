# Private Subdomain Pattern

`nxt-aserdargun-com`, `stk-aserdargun-com`, `inf-aserdargun-com` üçü özel bir kategori: **private subdomain**. Bu döküman onların public ajanlardan nasıl izole edildiğini, neden korunduğunu ve yeni bir private app eklendiğinde nasıl davranılacağını sabitler.

## 1. Tanım: Private subdomain nedir?

Aserdargun.com primary navigation'ında "Private" bölümünde listelenen, halka açık olmayan subdomain'ler.

- **nxt** — özel Next.js tabanlı kişisel içerik alanı (`nxt.aserdargun.com`)
- **stk** — eski Stackfolio domain'inin private devamı (`stk.aserdargun.com`)
- **inf** — özel infrastructure / private infra dokümantasyon alanı (`inf.aserdargun.com`)

Public subdomain'lerden (aia, llm, hns, …) farkları:

- Public landing'e (`https://aserdargun.com/`) "Private systems" nav bölümünde **link** olarak görünür — ama bu link private içeriğe götürür, public içeriğe değil.
- Public validator'lara (`expectedApplicationRows`, `expectedLearningCodes`, vb.) **dahil değildir**. `data/living-system.json` `applications[]` dizisinde yer almaz.
- Public ajanların workspace'inde **YOK**. `content-curator` bu üç projeye dokunmaz; `brand-guardian` favicon/title/refactor patch atmaz; `repo-auditor` public raporlara dahil etmez.
- Repo adları ve URL'leri farklı şekilde korunur: `nxt-aserdargun-com`, `stk-aserdargun-com`, `inf-aserdargun-com` private kapsamdadır.

## 2. Neden public ajanlar onlara dokunmaz?

Birden fazla guard, bu izolasyonu garanti eder:

- **Capability matrix** (docs/superpowers/agent-team/capability-matrix.md) — public ajanlara `nxt`, `stk`, `inf` workspace'leri **explicit olarak yasak**. Her public ajan sözleşmesinde "forbidden targets" listesi var.
- **Memory lessons** (kullanıcı tarafı):
  - "nxt private blue" — nxt için ayrılmış `#3b82f6` mavi tonu public brand-guardian paletinde yok.
  - "Stackfolio kelimesi ve `stk-aserdargun-com` repo adı yasak" — eski retired ürünün markası public sayfalarda ve repo adlarında yeniden ortaya çıkmamalı.
  - "nxt private blue" + "Stackfolio yasak" maddeleri `~/.minimax/agents/<public-agent>/memory/MEMORY.md`'de explicit forbidden projects satırında yazılıdır.
- **Public landing sızıntı guard'ı** — `tools/validate-site.mjs` retired URL listesinde bu üç proje geçmez (geçseydi public HTML'de referans olarak yakalanırdı). `expectedApplicationRows` listesinde yoklar, dolayısıyla public agent tablosunda görünmezler.

## 3. Onboarding davranışı

Yeni bir private subdomain eklendiğinde public ajanların varsayılan davranışı: **görmezden gelmek**.

- **new-app-detector** (cron prompt'unda zaten var) — public cron `new-app-detector` private workspace'leri taramaz. Bu üç proje diskte var olsa bile "yeni dizin" olarak algılanmaz.
- **otomatik yönlendirme yok** — kullanıcı "nxt-aserdargun-com ekledim, agent kur" demedikçe `aserdargun-orchestrator` private projeye yönlendirmez. Public ajanlar bu üç projeyi "kendi işi değil" olarak bırakır.
- **kullanıcı onayı geldiğinde** sıralı yol:
  1. `aserdargun-orchestrator` → onay alır, scope'u "private subdomain onboarding" olarak işaretler.
  2. `content-curator` — `data/living-system.json` `applications[]` dizisine **canonical entry ekler** (visibility, status, vs. ayarlanır) **AMA public validator'a dahil etmez**. `tools/validate-site.mjs` `expectedApplicationRows` listesine dokunulmaz. Public HTML render'ında yansımaz; sadece `living-system.json` kayıt defteri olarak güncellenir.
  3. **private routing** — subdomain URL'i public değil, `/private/<code>/` yolu altında servis edilir. Mevcut aserdargun-com mimarisi zaten bu pattern'i destekler; public landing'de "Private" nav bölümü external `target="_blank"` linkine sahiptir, public site çatısı altında proxy etmez.
  4. **<code>-worker** — sadece o private subdomain için bir worker kaydı açılır (örn. `nxt-worker`). Capability: read + write sadece o workspace; public kaynaklara dokunmaz.

## 4. Renk standardı (memory dersi)

Private subdomain'lerin kendi paletleri vardır ve public brand-guardian bunlara **DOKUNMAZ**.

- **nxt** — `#3b82f6` (private blue). Bu renk public lime/c8ff36 paletinde yoktur; nxt'in marka kimliğidir.
- **stk** — ayrı palet (private domain tarafından belirlenir, brand-guardian public standardıyla çelişmemeli).
- **inf** — ayrı palet (yukarıdaki gibi).

`brand-guardian` public projelerde toplu refactor yaparken bu üç projeyi listeden **hariç tutar**. Private brand kararları sadece private worker'ların yetkisindedir.

## 5. Validator guards

`tools/validate-site.mjs` ve bağlı test fixture'larında private projelere özel guard'lar:

- `retiredProjectUrls` listesi — public HTML'de `stackfolio.aserdargun.com` gibi retired URL'ler geçmemeli. `stk.aserdargun.com` ise aktif private URL'dir; validator HTML'de `stk.aserdargun.com` referansını **reddetmez** (private nav bölümünde geçerli). Ancak `https://github.com/aserdargun/stk-aserdargun-com` repo adı ve `Stackfolio` kelimesi **yasak** (kullanıcı memory'si).
- `expectedApplicationRows` — bu üç proje **yok**. Public landing'de görünmez.
- `expectedLearningCodes` — bu üç proje **yok**. Public learning diagram'da görünmez.
- `expectedSystemFocusLayers` — public focus katmanları (`foundation`, `agent-system`, `assurance`, `deployment`, `physical-ai`) private projeler için geçerli değildir; private projeler kendi focus alanlarını `data/living-system.json` içinde taşır ama public render'a yansımaz.
- `data-app-code` HTML guard'ı — public application map yalnızca `expectedApplicationCodes` içindeki kodları kabul eder; `nxt`/`stk`/`inf` bu listede yok.

`tools/validate-site.mjs` üzerinde güncelleme yapılırken bu üç guard'ın kapsamı korunmalıdır.

## 6. Açık karar noktası

Kullanıcı bu üç proje için agent kaydı isterse nasıl davranılacak? Mevcut plan: "yok, kullanıcı açıkça isteyince kur."

Bu döküman şu an için **taslaktır**. Phase 6'da şu kararlar netleşmeli:

- Private worker'ın capability matrix'i: read+write kendi workspace, public kaynaklara kesinlikle dokunmaz.
- Private worker'ın memory template'i: public MAVEN kalıbından ayrı olmalı, private brand kurallarını (renk, isim, terminoloji) kendi içinde taşımalı.
- Private deploy cron: public `deploy-watch-<code>` kalıbından ayrı, internal monitor; public landing'de hiçbir private build durumu görünmez.
- Kullanıcı onay mekanizması: orchestrator özel onay mesajı + kullanıcı imzalı ack kaydı `~/.minimax/agents/<root>/memory/private-onboardings.md` dosyasında.

Şu anki durum: üç private subdomain diskte var, public landing'de nav linkleri var, agent kaydı **yok**. Yeni bir private subdomain eklenene kadar bu döküman statik kalır; ekleme olursa Phase 6 §6 finalize edilir.
