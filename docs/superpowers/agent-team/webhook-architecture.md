# Webhook Architecture — Polling-as-Webhook Pattern

## Background

Klasik webhook mimarisinde: GitHub push event → HTTP POST → receiver service → mavis session. Bu pattern için:
- Mavis'in public bir HTTP endpoint'i olmalı
- GitHub Actions'tan Mavis'e ulaşılabilir olmalı
- Payload routing için dispatcher mantığı olmalı

**Mavis runtime local** (kullanıcının makinesinde). True webhook endpoint'i yok. GitHub Actions public sunucuda, mavis local'da — direkt ulaşım yok.

## Çözüm: Polling-as-Webhook

Mavis cron sistemi ile polling tabanlı "webhook equivalent" kullanıyoruz. Her cron tetiklendiğinde GitHub API'ye veya filesystem'e sorgu atıp, yeni event varsa ilgili agent'ı tetikliyoruz. Gecikme polling intervali kadardır.

### Aktif polling cronları (webhook equivalent)

| Cron adı | Interval | Polling hedefi | Tetiklenen agent |
|----------|----------|----------------|------------------|
| `deploy-watch-aserdargun-com` | */2 (2 dk) | GitHub main commit SHA | deploy-watch (doğrulama) |
| `deploy-watch-pdt` | */2 | GitHub main SHA | deploy-watch |
| `deploy-watch-hex` | */2 | GitHub main SHA | deploy-watch |
| `new-app-detector` | 0 * * * * (saatlik) | filesystem directory listing | repo-auditor → orchestrator → onboarding |
| `freshness-check` | 0 6 * * * (günlük) | git last commit + canonical updatedAt | repo-auditor → orchestrator → content-curator |
| `now-archive-check` | 0 0 * * 0 (haftalık) | aserdargun-com/now/ mtime | content-curator |
| `weekly-memory-curator` | 0 3 * * 0 (haftalık) | agent memory dosyaları | memory-curator |
| `memory-archive-policy` | 0 4 * * 0 (haftalık) | agent memory boyutları | memory-curator |

**Toplam gecikme:**
- Deploy verify: max 2 dakika
- Yeni app algılama: max 1 saat
- Freshness: max 24 saat
- /now/ hatırlatma: max 7 gün

Bu gecikmeler Phase 4 gözlem döneminde kabul edilebilir. Phase 5'te daha agresif interval veya true webhook geçişi düşünülebilir.

## Polling guard'ları (cron self-discipline)

memory'deki "Cron self-discipline" kuralı: 3 ardışık skip sonrası gerçek poll at. Yani:
- Eğer SHA/state değişmediyse sessiz skip
- 3 kez üst üste skip olursa (örn. hiç yeni event yok), bir sonraki tick'te gerçek bir kontrol yap
- Başarılı işlemde cron kendini siler; kalıcı izleme cron'da sessiz skip yeterli

## True webhook geçiş yolu (Phase 5)

Eğer ileride mavis public bir HTTP endpoint açarsa (ör. `https://mavis.aserdargun.com/webhook/<agent>/`):

1. **Local receiver** — mavis makinesinde Node.js / Python HTTP server:
   - Port 8080'de dinler
   - GitHub webhook payload'ını parse eder
   - `mavis session send <agent> ...` ile forwarding yapar
   - HMAC doğrulama (GitHub secret)

2. **GitHub Actions / webhook config**:
   - aserdargun-com repo'sunda webhook: payload URL = `https://<user-public-domain>/webhook/`
   - Events: push, pull_request, workflow_run
   - Secret: env'de tutulan HMAC key

3. **mavis-side forwarding**:
   - Mavis HTTP server payload'ı alır
   - Agent'a session send ile iletir
   - Agent poll yok, doğrudan event-driven

**Mevcut durumda (Phase 4):** Polling tabanlı webhook equivalent. Phase 5'te geçiş opsiyonel.

## Crontab yerine mavis cron

Linux `crontab` yerine `mavis cron` kullanıyoruz çünkü:
- mavis cron'ları session-scoped (agent-specific)
- Mavis runtime'ın logging/observability araçlarıyla entegre
- Session-id ve agent-name parametreleri routing'i kolaylaştırır
- Background task watchdog'ı var

## Özet

| Boyut | Polling (mevcut) | True webhook (gelecek) |
|-------|------------------|------------------------|
| Gecikme | 2dk-7gün | <1 saniye |
| Mavis public endpoint | gereksiz | gerekli |
| GitHub webhook config | gereksiz | gerekli |
| Local HTTP server | gereksiz | gerekli |
| HMAC güvenlik | gereksiz (GitHub API zaten auth) | gerekli |
| Setup karmaşıklığı | düşük | orta-yüksek |
| Phase | 4 (aktif) | 5 (henüz değil) |
