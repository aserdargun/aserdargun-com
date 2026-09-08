# Scope Router — Orchestrator Karar Matrisi

`aserdargun-orchestrator` gelen bir isteği nasıl uzmana yönlendirir. Bu matris Phase 0'da kaba sürüm, Phase 1 sonunda gerçek kullanımdan derslerle refine edilir.

## Giriş sinyali

Kullanıcı mesajı → orchestrator parse eder:

1. **Anahtar kelime taraması** (Türkçe + İngilizce).
2. **Hedef proje tespiti** (proje adı geçiyorsa).
3. **İş tipi tespiti** (yeni içerik, deploy izleme, refactor, onboarding, denetim).

## Yönlendirme matrisi

| İş tipi sinyali | Hedef proje | Uzman |
|-----------------|-------------|-------|
| `living-system.json` editi, knowledge note, now/archive, applications list güncelleme | aserdargun-com | `content-curator` |
| `portfolio.json` regenerate, `npm run generate:site`, validator fix | aserdargun-com | `content-curator` |
| Bilingual parity (en/tr), retired URL guard | aserdargun-com | `content-curator` |
| Yeni subdomain, yeni atlas, yeni proje onboarding | (yeni) | sırasıyla `repo-auditor` → `content-curator` → `brand-guardian` → `deploy-watch` + `<code>-worker` create |
| Favicon, title, OG image, wordmark, marka rengi, brand standardı | (multi) | `brand-guardian` |
| Cross-repo refactor, tutarlılık denetimi, e2e title fix | (multi) | `brand-guardian` |
| Deploy başarısız, commit SHA doğrulama, canlı URL kontrol | (subdomain) | `deploy-watch` |
| Freshness, güncellik, stale proje tarama | (tüm projeler) | `repo-auditor` (rapor) → `content-curator` (uygulama) |
| Memory temizliği, duplicate/stale raporu | (tüm agent memory'leri) | `memory-curator` |
| Tek subdomain projesinde bounded iş (içerik, validator fix, dependency update) | `<code>-aserdargun-com` | `<code>-worker` |

## Karar ağacı (sıralı)

```
1. Mesajda "yeni subdomain / yeni atlas / yeni proje" var mı?
   EVET → onboarding akışı
2. Mesajda "deploy / SHA / canlı URL / 404 / build failed" var mı?
   EVET → deploy-watch
3. Mesajda "favicon / title / brand / OG / wordmark" var mı?
   EVET → brand-guardian
4. Mesajda "memory / stale / duplicate" var mı?
   EVET → memory-curator
5. Mesajda belirli bir subdomain kodu geçiyor mu? (aia, llm, swi, ...)
   EVET → <code>-worker
6. Mesaj aserdargun-com'a yönelik mi? (knowledge, now, applications, validator)
   EVET → content-curator
7. Hiçbiri değil → kullanıcıya "bu işi hangi agent'a yönlendirmemi istersiniz?" diye sor
```

## Yönlendirme sonrası

- Orchestrator yönlendirilen agent'ın session id'sini alır.
- Kullanıcıya "yönlendirildi: <agent_name> (session <id>)" der.
- Agent bittiğinde session mesajlarından sonucu çekip kullanıcıya özetler.
- Agent hata bildirirse (capability violation, test failure, deploy timeout) orchestrator kullanıcıya sunar.

## Yasaklı yönlendirmeler

- `content-curator` ↔ `brand-guardian` arası ping-pong: biri başladıysa diğerine geçmeden bitirilmeli.
- Worker agent'lar arası doğrudan yönlendirme: yalnız orchestrator üzerinden.
- Birden fazla uzmana paralel yönlendirme: yok. Sıralı çağır.

## Phase 1 MVP kapsamı

Phase 1'de yalnızca şu yönlendirmeler aktive:

- ✅ İçerik senkronizasyonu → `content-curator`
- ✅ Deploy izleme → `deploy-watch`
- ❌ Brand refactor → Phase 2
- ❌ Onboarding → Phase 3
- ❌ Repo audit / memory curator → Phase 4

Diğer yönlendirmeler Phase 1 sırasında test edilir, refine edilir.
