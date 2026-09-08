# Auto Onboarding — Yeni Uygulama Algılama

Kullanıcı yeni bir aserdargun subdomain projesi eklediğinde agent team bunu algılayıp otomatik onboarding başlatır. Phase 4'te (Periyodik Gözlem) eklendi.

## Algılama mekanizması

`new-app-detector` adlı cron, `repo-auditor` agent'ı altında her saat başı çalışır:

1. `/Users/aserdargun/Documents/minimax/*-aserdargun-com/` dizinlerini listeler
2. `data/living-system.json` `applications[]` codes listesini okur
3. Diff hesaplar: yeni dizin var mı, registered codes'ta yok mu?
4. Sessiz skip (yeni dizin yoksa) veya onboarding başlat (yeni dizin varsa)

Cron ID: `42c0efd6-7a25-48b7-b478-e4853c3c7ea1`
Schedule: `0 * * * *` (saatlik)
Agent: `repo-auditor`

## Onboarding akışı (yeni dizin tespit edildiğinde)

repo-auditor otomatik olarak şu adımları başlatır:

1. **Agent kaydı**: `mavis agent create` ile `<code>-worker` agent'ı oluşturulur
2. **Workspace kurulumu**: `~/.minimax/agents/<code>-worker/{memory,sessions,skills,workspace}/` dizinleri + sembolik link
3. **Memory şablonu**: `memory/MEMORY.md` 8-madde identity template'iyle yazılır
4. **aserdargun-orchestrator yönlendirmesi**: Sırasıyla
   - **content-curator**: `data/living-system.json` applications[] entry, `validate-site.mjs` expected listeleri, statik SVG diagram node, regenerate, test, commit, push
   - **`<code>-worker`**: AGENTS.md master template'ten derive, commit, push
   - **deploy-watch**: `deploy-watch-<code>` cron kaydı + state dosyası
5. **Rapor**: tüm SHA'lar + canlı URL'ler + cron durumu → root session

## Bilinçli sınırlar

- **nxt, stk, inf private projeler** için kullanıcı onayı şart. Cron bunları "yeni dizin" olarak algılasa bile, `aserdargun-orchestrator` escalation yapıp kullanıcıya sorar; otomatik onboarding başlatmaz.
- **Mevcut 18 uygulama zaten registered.** Cron yeni dizin yoksa sessiz skip eder (rate-limit dostu).
- **Çakışma durumunda**: dizin var ama registered değilse → onboarding. Registered ama dizin yoksa → orphaned entry raporu (kullanıcıya bildirim, otomatik silme yok).
- **İlk tespit yanlış pozitif olabilir** (ör. kullanıcı henüz bitmemiş bir dizin oluşturmuş). repo-auditor önce `package.json` ve `index.html` varlığını kontrol eder; yoksa "henüz boş iskelet" notu ile skip eder.

## Phase 4 gözlem döneminde izlenecekler

- 1 hafta boyunca cron kaç kez tetiklendi (saatlik × 24 × 7 = 168)
- Kaç kez sessiz skip, kaç kez onboarding tetiklendi
- Hatalı onboarding girişimleri (escalation sayısı)
- Cron self-discipline: 3 ardışık skip sonrası gerçek poll at

## Onaylı override'lar

Kullanıcı doğrudan komutla da onboarding tetikleyebilir:

```
mavis session send aserdargun-orchestrator "Yeni uygulama: <code>-aserdargun-com eklendi. Hemen onboarding başlat."
```

Bu komut saatlik cron'u beklemeden manuel tetikler.
