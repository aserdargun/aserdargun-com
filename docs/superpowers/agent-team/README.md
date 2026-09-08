# aserdargun Agent Team

Hiyerarşik, tam izole bir agent team. Amaç: kişisel landing (`aserdargun-com`) ve 16+ subdomain projesi üzerinde içerik/veri senkronizasyonu, deploy + CI gözlemi, cross-repo refactor (favicon/title/brand) ve yeni proje onboarding işlerini yürütmek.

## Takım

| Agent | Tip | Sorumluluk |
|-------|-----|------------|
| `aserdargun-orchestrator` | root | Gelen isteği parse eder, scope'a göre uygun uzmana yönlendirir. Dosya yazmaz. |
| `deploy-watch` | uzman | Her subdomain için GitHub check-runs + live URL doğrulaması. |
| `content-curator` | uzman | `living-system.json` editi, jeneratör, validator, bilingual parity, aserdargun-com commit/push. |
| `brand-guardian` | uzman | Cross-repo refactor: favicon, title, renk, OG image, wordmark. Toplu audit + sıralı patch. |
| `repo-auditor` | utility | 22+ repoda yapısal tutarlılık raporlar (yalnız raporlar). |
| `memory-curator` | utility | Tüm agent memory'lerini tarar, stale/duplicate raporlar (silmez). |
| `aia-worker` ... `eng-worker` | worker | Tek subdomain projesinde bounded iş: içerik, validator fix, dependency, e2e title. |

`nxt-worker`, `stk-worker`, `inf-worker` **başlangıçta kayıt dışı**. Private içerik sızıntısı riski. Yalnız orchestrator özel onayıyla açılır.

## İletişim

- Root → orchestrator: `mavis session send aserdargun-orchestrator ...`
- Orchestrator → uzman: yine `mavis session send`
- Agent'lar arası dosya: paylaşılan sözleşme bu dizin (`docs/superpowers/agent-team/`)
- Cross-agent memory: yok. Her agent kendi memory'sine yazar.

## Dosya yapısı

```
docs/superpowers/agent-team/
├── README.md                  ← bu dosya
├── capability-matrix.md       ← kim ne yazabilir
├── onboarding-template.md     ← yeni subdomain checklist
├── scope-router.md            ← orchestrator karar matrisi
└── deploy-protocol.md         ← deploy-watch akışı
```

## Kurallar

- **Tam izolasyon.** Her agent kendi `~/.minimax/agents/<name>/` altında. Paylaşılan memory yok.
- **Worker = tek proje.** `*-worker` sadece kendi workspace'inde yazar. Cross-repo yapmaz.
- **`brand-guardian` = sıralı.** 16 projeyi paralel patch'lemez; sırayla.
- **Yasaklı kalıplar:** `git checkout --ours` rebase conflict'te, `nxt` private içeriği public sayfalara, Stackfolio/stk URL'leri, "X gibi olsun" muğlaklığında color/brand değişimi.
- **Deploy kuralı:** main branch'te her commit sonunda push + cron + URL doğrulama.
- **Phase 1 MVP:** orchestrator + 3 uzman + 2 utility + ilk worker (aia). Diğer 14 worker Phase 1 sonrası şablondan kopyalanır.
