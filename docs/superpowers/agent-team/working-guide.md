# aserdargun Agent Team — Çalışma Kılavuzu

Bu rehber, **aserdargun platformu + 18 subdomain + 3 private proje** üzerindeki agent team'le günlük nasıl çalışılacağını anlatır. Adım adım örneklerle.

## 1. Temel mimari (1 dakika)

```
SEN (kök session, Mavis)
  └─> aserdargun-orchestrator (yönlendirme)
        ├─> 6 uzman (content-curator, deploy-watch, brand-guardian, repo-auditor, memory-curator, ...)
        ├─> 18 public worker (aia, llm, hns, ..., pdt, hex)
        └─> 3 private worker (nxt, stk, inf)
```

- **Her zaman kök session'dasınız.** Agent'lar kendi session'larında çalışır.
- **aserdargun-orchestrator** yönlendirme yapar; dosya yazmaz.
- **Uzmanlar** kendi alanlarında iş yapar (içerik, deploy, brand, audit, memory).
- **Worker'lar** sadece kendi subdomain projesinde yazar.

Tüm agent'lar `~/.minimax/agents/<name>/` altında, her birinin `config.yaml` + `memory/MEMORY.md` + `sessions/` + `skills/` + `workspace/` (sembolik link) var.

## 2. Günlük iş akışları (en sık kullanacağın pattern'ler)

### 2.1 Yeni knowledge note eklemek (aserdargun-com)

```
mavis session send aserdargun-orchestrator "yeni knowledge note ekle: <slug>, type=learning, title{tr:...,en:...}, summary{tr:...,en:...}, tags=[...]"
```

**Akış:** orchestrator → content-curator → `data/living-system.json` edit → `npm run generate:site` → validator → commit + push → deploy-watch cron → URL verify → ✅.

**Eğer validator fail olursa:** content-curator escalation yapar (örn. "5 publicMemory sabit kısıtı"). Karar verirsin, devam eder.

### 2.2 Tek subdomain'de bounded iş (örn. hns'te başlık güncelle)

```
mavis session send aserdargun-orchestrator "hns: og:title 'HNS — ' em-dash kaldır, ASCII dash yap"
```

**Akış:** orchestrator → `hns-worker` → dosya düzenleme → `npm test` → commit + push → deploy-watch → rapor.

### 2.3 Cross-repo refactor (örn. tüm projelerde favicon standardı)

```
mavis session send aserdargun-orchestrator "16 projede favicon standardizasyonu: lime #c8ff36, 320×320 viewBox, 64px corner radius, 3-harf monogram"
```

**Akış:** orchestrator → `brand-guardian` (uzman, cross-repo kapsam). brand-guardian:
1. **Audit** → her proje için dosya + test + meta tara, `[{file, find, replace}]` listesi üret.
2. Sana sunar, **onay** ister.
3. **Onay sonrası sıralı patch**: 1 proje → test → commit → push → next.
4. Her push sonrası deploy-watch tetiklenir.
5. Final rapor.

### 2.4 Yeni bir uygulama eklemek (otomatik)

```
1. Klasör oluştur: /Users/aserdargun/Documents/minimax/yeni-aserdargun-com/
2. (package.json + index.html + AGENTS.md iskeleti)
3. Saat başı new-app-detector çalışır → algılar → orchestrator'a yönlendirir
4. content-curator living-system.json + validate-site.mjs + SVG diagram ekler
5. yeni-worker AGENTS.md oluşturur (master template'ten)
6. deploy-watch-<code> cron kurulur
7. Sana rapor
```

**Manuel tetikleme** (saati beklemeden):
```
mavis session send aserdargun-orchestrator "Yeni uygulama: yeni-aserdargun-com eklendi. Hemen onboarding başlat."
```

### 2.5 Deploy hata tespiti

Eğer bir subdomain'de canlıda bir sorun varsa (404, yanlış içerik, eski SHA):

```
mavis session send deploy-watch "<subdomain> için son 5 commit'i GitHub check-runs'tan kontrol et, hata varsa log tail'i bana ver"
```

deploy-watch kendi alanındadır; deploy + cron + canlı URL doğrulama yapar.

## 3. Trigger'lar (otomatik vs manuel)

### 3.1 Manuel trigger

```
mavis session send <agent_name> "..."
```

`agent_name` yerine direkt **session_id** de kullanılabilir (rootSessionId, agent list'ten alınır). **agent_name** daha okunabilir, genelde tercih edilir.

### 3.2 Cron tetikleyiciler (8 aktif)

| Cron adı | Interval | Agent | Ne zaman çalışır? |
|----------|----------|-------|-------------------|
| `deploy-watch-aserdargun-com` | */2 min | deploy-watch | Yeni commit algılarsa |
| `deploy-watch-pdt` | */2 min | deploy-watch | Yeni commit algılarsa |
| `deploy-watch-hex` | */2 min | deploy-watch | Yeni commit algılarsa |
| `freshness-check` | günlük 06:00 | repo-auditor | 60+ gün stale proje varsa |
| `now-archive-check` | Pazar 00:00 | content-curator | /now/ 7+ gündür güncellenmediyse |
| `weekly-memory-curator` | Pazar 03:00 | memory-curator | memory 50KB+ / 90+ gün stale / duplicate varsa |
| `memory-archive-policy` | Pazar 04:00 | memory-curator | 50KB+ memory arşiv adayı varsa |
| `new-app-detector` | saatlik | repo-auditor | Yeni `*-aserdargun-com/` dizini varsa |

**Cron durumunu görmek:** `mavis cron list`

**Cron manuel tetikleme:** `mavis cron trigger --cron-id <id>`

## 4. Capability Matrix (en kritik bilgi)

Her agent'ın yazma izni sınırlı. Yanlış agent'a yazma isteği göndermemek için bunu bilmek önemli.

| Agent | aserdargun-com | diğer subdomain | private (nxt/stk/inf) |
|-------|----------------|------------------|----------------------|
| `content-curator` | **write** | read | read |
| `brand-guardian` | **write** | **write** (izinli) | **YASAK** |
| `repo-auditor` | read | read | read |
| `memory-curator` | sadece memory/ | sadece memory/ | sadece memory/ |
| `<code>-worker` (public) | read | **write** (kendi) | **YASAK** |
| `nxt-worker`/`stk-worker`/`inf-worker` | **read only** | **read only** | **write** (kendi) |

**Yasaklı kalıplar (her agent için):**
- nxt/stk/inf → public agent'lar **yazamaz**
- public landing (aserdargun-com) → private agent'lar **yazamaz**
- `~/.minimax/memory/user.md` → hiçbir agent yazamaz (sadece orchestrator önerir)
- `~/.minimax/agents/mavis/memory/MEMORY.md` → hiçbir agent yazamaz (kullanıcı Mavis memory'si)

## 5. Memory sistemi (bilgi birikimi nerede durur?)

### 5.1 Üç katman

1. **Agent memory** (`~/.minimax/agents/<name>/memory/MEMORY.md`): Agent'ın kendi deneyimleri.
2. **Team contract** (`aserdargun-com/docs/superpowers/agent-team/`): Sözleşme + capability matrix.
3. **User memory** (`~/.minimax/memory/user.md`): Kullanıcı düzeyinde alışkanlıklar (senin tercihlerin).

### 5.2 Ders keşfedildiğinde

- Agent kendi memory'sine yazar (öğrendiği şeyleri).
- 2+ projede geçerli ise → aserdargun-orchestrator'a bildirilir, kendi memory'sine de yazabilir.
- Kullanıcı alışkanlığı ise (örn. "Stackfolio kelimesi yasak") → user memory'ye kullanıcı onayıyla yazılır.

### 5.3 Okuma

- Kök session'dan: `mavis session send aserdargun-orchestrator "memory'deki X dersini hatırlat"`
- Direkt: `cat ~/.minimax/agents/mavis/memory/MEMORY.md`
- Workspace'te: `~/.minimax/agents/<name>/memory/MEMORY.md`

## 6. Dokümanlar (referans)

`aserdargun-com/docs/superpowers/agent-team/` altında 11 dosya:

| Dosya | İçerik |
|-------|--------|
| `README.md` | Takım kimliği, 22 agent listesi, iletişim |
| `capability-matrix.md` | Kim ne yazabilir, yasaklı işlemler, sahiplik |
| `onboarding-template.md` | Yeni subdomain checklist (8-madde contract + tooling) |
| `scope-router.md` | Orchestrator karar matrisi (5 yönlendirme kuralı) |
| `deploy-protocol.md` | deploy-watch akışı, GH check-runs, canlı URL doğrulama |
| `AGENTS-template.md` | 8-madde contract master template (worker'lar bunu kullanır) |
| `auto-onboarding.md` | Yeni app algılama, onboarding akışı |
| `private-subdomain-pattern.md` | nxt/stk/inf politikası (private routing, validator guards) |
| `theme-color-registry.md` | 4 projenin theme-color paleti + değiştirilmez politikası |
| `repo-auditor-phase3-dryrun.md` | 22+ proje yapısal denetim raporu |
| `webhook-architecture.md` | Polling-as-Webhook pattern (mavis local olduğu için) |

Canlı: `https://aserdargun.com/docs/superpowers/agent-team/<dosya>.md`

## 7. Sık karşılaşılan senaryolar

### Yeni bir fikri denemek istiyorum ama emin değilim

1. `mavis session send aserdargun-orchestrator "<fikrinizi açıklayın>"`
2. Orchestrator scope belirler (örn. "bu brand refactor" → brand-guardian)
3. brand-guardian audit yapar, sana sunar
4. Onay verirsen patch uygular

### Bir agent düzgün çalışmıyor / takıldı

1. `mavis session messages --session-id <session_id>` → son mesajları gör
2. `mavis session send <agent_name> "durumu özetle, nerede takıldın?"`
3. Gerekirse `mavis session list` → aktif session'ları gör

### Tüm agent'ları görmek

```
mavis agent list  # tüm kayıtlı agent'lar
ls /Users/aserdargun/.minimax/agents/  # dizin bazlı liste (daha hızlı)
```

### Bir agent'ın memory'sini görmek

```
cat /Users/aserdargun/.minimax/agents/<agent_name>/memory/MEMORY.md
```

### Tüm cron'ları görmek

```
mavis cron list  # tüm crons
mavis cron list --agent-name deploy-watch  # sadece deploy-watch
```

### Bugün ne yapıldı?

```
cd /Users/aserdargun/Documents/minimax/aserdargun-com
git log --oneline | head -20  # son 20 commit
```

### Bir şey bozuldu, geri almak istiyorum

```
git log --oneline  # son commit'i gör
git revert <commit_sha>  # revert yap
git push  # revert'i push'le
```

Büyük geri alma için: önce root session'da `mavis session send aserdargun-orchestrator "X commit'ini revert et, gerekçe: <sebep>"` de. Orchestrator uygun agent'ı yönlendirir.

## 8. Hata yönetimi

| Hata | Belirti | Çözüm |
|------|---------|-------|
| Capability violation | Agent "Yasak" diyor | Capability matrix'e bak, doğru agent'ı kullan |
| Test fail | `npm test` exit ≠ 0 | Auto-fix yok. İncele, karar ver, manual düzeltme yönlendir |
| Validator fixture (sayı/tarih kısıtı) | Sabit bir sayı (örn. 16) artık 18 olmuş | "Validator'ı gevşet: X → X+1" de, content-curator halleder |
| Cron kayboldu | Liste 0 cron gösteriyor | `mavis cron create` ile yeniden kur |
| Live URL 404 | Deploy tamam ama 404 | Staticwebapp.config.json kontrol et + 5dk bekle (cache) |
| Commit başarısız | `git push` exit ≠ 0 | `git pull --rebase` ile remote'taki yeni commit'leri entegre et (memory kuralı: `--ours` YASAK) |
| Rebase conflict | `CONFLICT` mesajı | Conflict'li dosyayı doğrudan edit, `git add` + `git rebase --continue` |

## 9. Gözlem (production monitoring)

**Cron tabanlı (otomatik, müdahalesiz):**
- Her 2dk → 3 subdomain deploy verify
- Saatlik → new-app-detector
- Günlük 06:00 → freshness-check
- Pazar 03:00 → weekly-memory-curator
- Pazar 04:00 → memory-archive-policy

**Sorgulama:**
```
mavis cron list  # durum
mavis session list  # aktif session'lar
```

**Cron self-discipline (memory kuralı):** 3 ardışık skip sonrası bir sonraki tick'te gerçek poll at. Sessiz skip spam yapma.

## 10. Faz boundary'leri (Phase 4 gözlem dönemi)

Şu an **Phase 4 gözlem dönemindeyiz**. 1 hafta boyunca cron'lar çalışacak, memory temizliği + başarı oranı raporlanacak. Bu süreçte:
- Müdahale gerekmez
- Sadece freshness-check, weekly-memory-curator raporları gelirse karar ver
- Yeni bir uygulama eklerseniz `new-app-detector` otomatik algılar
- Bir sorun olursa (örn. cron stuck) root session'a escalation gelir

**Phase 5 (gelecek):** Memory arşiv politikası uygulaması, webhook-based hook (şu an polling), agent prompt tutarsızlığı normalizasyonu.

## 11. Hızlı kontrol listesi (her oturum başlangıcı)

- [ ] Bugün için yeni karar var mı?
- [ ] Aktif cron'lar düzgün çalışıyor mu? (`mavis cron list`)
- [ ] Gündemdeki subdomain/commit'ler canlıda mı?
- [ ] Yeni eklenen app var mı? (`ls Documents/minimax/`)
- [ ] Bir agent tıkandı mı? (`mavis session list`)
