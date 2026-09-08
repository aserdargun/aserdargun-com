# Deploy Protocol

`deploy-watch` agent'ının her subdomain için commit'ten canlı URL doğrulamasına kadar izlediği protokol. Phase 1'de kalibre edilir, Phase 4'te 1 hafta gözlemlenir.

## Akış

```
1. Commit SHA alınır (push sonrası veya cron self ile)
2. GitHub check-runs API ile durum sorgulanır
3. Status = "success" ise → canlı URL curl + içerik doğrulama
4. Status = "failure" ise → log + kullanıcıya bildirim (3 deneme sonra)
5. Status = "pending"/"queued" ise → 60s sonra tekrar (max 10dk)
6. Live URL doğrulama başarılı → cron kendini siler, success loglar
7. Live URL doğrulama başarısız (3 deneme) → kullanıcıya bildirim
```

## GitHub check-runs API

```
GET https://api.github.com/repos/aserdargun/<repo>/commits/<sha>/check-runs
```

Cevap: `conclusion: "success" | "failure" | "neutral" | "cancelled" | "stale" | null`

Deploy job adı: `Validate and deploy production site` (aserdargun-com kalıbı).

## Live URL doğrulama

Her subdomain için `<sub>.aserdargun.com/` üzerinde:

- `curl -sI https://<sub>.aserdargun.com/` → `HTTP 200`
- Asset version grep: `https://<sub>.aserdargun.com/?v=<expectedAssetVersion>`
- Unique content check: bilinen bir string veya class adı (memory'deki "Deploy-watch cron: verify by artifact" dersi)

**ÖNEMLİ (memory dersi):** Asset version label değişmiş olabilir. Her zaman içerik imzası + sürümü birlikte kontrol et; sadece versiyon yetmez.

## Cron kalıbı

```yaml
name: deploy-watch-<code>
schedule: event-driven (commit SHA ile tetiklenir)
session: aserdargun-orchestrator
prompt: |
  Commit: <sha>
  Repo: aserdargun/<code>-aserdargun-com
  Expected asset version: <expectedAssetVersion>

  Adımlar:
  1. GitHub check-runs: GET .../commits/<sha>/check-runs
     - status pending ise 60s bekle, max 10dk
     - success değilse failure logla, kullanıcıya bildir
  2. status = success ise:
     - curl -sI https://<code>.aserdargun.com/ → HTTP 200 doğrula
     - Unique content check: <known_string> (asset version değil)
     - 3/3 başarılı → cron kendini sil, success logla
     - 3/3 başarısız → kullanıcıya bildir
```

## State dosyaları

Her agent kendi state'ini tutar:

```
~/.minimax/agents/deploy-watch/workspace/state/
├── <sub>-<sha>.json     # pending / success / failure
└── cron-status.json     # aktif cron listesi
```

## Failure semantiği

| Failure | Anlam | Aksiyon |
|---------|-------|---------|
| GitHub check-runs 5dk'da "success" olmadı | Workflow bozuk veya hâlâ çalışıyor | 3 deneme sonra kullanıcıya bildir |
| Live URL HTTP 200 değil | Deploy olmamış veya bozuk | 3 deneme sonra kullanıcıya bildir |
| Live URL 200 ama unique content eksik | Cache, yanlış build, content kayıp | 3 deneme + cache-bust sonra kullanıcıya bildir |
| Cron kendini silemedi | Mavis state kaybolmuş | Orchestrator'a rapor, manuel temizlik |

## Phase 1 kalibrasyon

Phase 1'de `aserdargun-com` ve `aia.aserdargun.com` için 1 hafta cron'ları çalıştırılır. Aşağıdaki parametreler gözlemlenip ayarlanır:

- Poll aralığı (varsayılan 60s)
- Timeout (varsayılan 10dk)
- Retry sayısı (varsayılan 3)
- Cache-bust tekniği (asset version + unique content)

## Bilinen tuzaklar (memory'den)

- **GitHub Actions queue stuck:** `gh workflow run` 10dk+ pending kalıyorsa, web UI'dan "Run workflow" dene.
- **Cron self-discipline:** 3 ardışık skip sonrası gerçek poll at (memory: "Cron self-discipline: verify before skipping").
- **Deploy-watch artifact, not version:** Versiyon yerine unique content imzası kullan.
- **Web fetch 429/retry:** Rate limit; bekle ve tekrar.
