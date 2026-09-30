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

## Kanonik eylem pinleri

Her subdomain deposundaki GitHub eylemleri **fleet genelinde tek bir SHA kümesine**
sabitlenir. Sürüm etiketi (`@v7`) kullanılmaz: etiket hareket eder, SHA etmez.

| Eylem | SHA | Sürüm | Doğrulama |
|---|---|---|---|
| `actions/checkout` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | v7.0.1 | 30 Eylül 2026 |
| `actions/setup-node` | `820762786026740c76f36085b0efc47a31fe5020` | v7.0.0 | 30 Eylül 2026 |
| `actions/upload-artifact` | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` | v7.0.1 | 30 Eylül 2026 |
| `Azure/static-web-apps-deploy` | `4d27395796ac319302594769cfe812bd207490b1` | `v1` dal başı | 30 Eylül 2026 |

**Deploy eylemi neden `v1` etiketi değil.** `Azure/static-web-apps-deploy`
 deposunda `v1` **etiketi** 2021'deki `1a947af9` commitine işaret ediyor ve
 donmuş; `v1` **dalının başı** ise `4d273957` (11 Eylül 2024). İkisi arasındaki
 fark saf ekleme: `action.yml` içinde 21 satır eklenmiş, hiçbir satır silinmemiş —
 `config_file_location`, `skip_api_build`, `is_static_export`,
 `data_api_location` ve `production_environment` girdileri ile daha yeni
 konteyner çalışma zamanı. Bu yüzden fleet `v1` dal başını sabitler ve satır
 yorumunda bunu açıkça yazar; `# v1` yorumu etiketi işaret ettiği için yanıltıcıdır.

**Sapma tespiti.** Yeni bir subdomain kurulurken veya bir depo güncellenirken
 şu komut tek satırda iki işi birden ayırır — hangi eylem, hangi SHA'da:

```bash
grep -rho "uses: *[A-Za-z0-9._/-]*@[^ ]*" */.github/workflows/*.yml \
  | sed 's/uses: *//' | sort | uniq -c | sort -rn
```

Çıktıda tek bir satır her eylem görünmelidir. Aynı eylemin iki SHA'da
 görünmesi **sürüm drift'idir** ve `main`'e alınmadan önce giderilir.

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
