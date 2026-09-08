# Capability Matrix

Hangi agent hangi dizinde okur/yazar, hangi dış kaynağa erişir. Capability ihlali durumunda orchestrator'a rapor.

## Yazma izinleri

| Agent | aserdargun-com | diğer subdomain | ~/.minimax/agents | Diğer |
|-------|----------------|-----------------|-------------------|-------|
| `aserdargun-orchestrator` | read | read | read + `session send` | — |
| `deploy-watch` | read (state) | read (state) | read | read GitHub API, `curl` live URL |
| `content-curator` | **write** | read | — | commit + push (sadece aserdargun-com main) |
| `brand-guardian` | **write** | **write** (izinli scope) | — | commit + push (sıralı, 16 proje dahil) |
| `repo-auditor` | read | read | read | — |
| `memory-curator` | read | read | **read + edit (sadece `*/memory/`)** | — |
| `<code>-worker` (public) | read | **write** (sadece kendi scope) | — | commit + push (sadece kendi `<code>-aserdargun-com` main) |
| `nxt-worker` / `stk-worker` / `inf-worker` (PRIVATE) | **read only** | **read only** (public + private) | — | commit + push (sadece kendi private subdomain main) |

## Okuma izinleri

Tüm agent'lar şunları **okuyabilir**:

- `aserdargun-com/docs/superpowers/agent-team/` (bu dizin)
- `~/.minimax/agents/mavis/memory/MEMORY.md` (kullanıcı alışkanlıkları) — orchestrator özetleyerek aktarır, worker doğrudan okuyamaz.
- Kendi `~/.minimax/agents/<self>/memory/MEMORY.md` (yazma serbest)
- Hedef projenin `CLAUDE.md` veya `AGENTS.md`

## Yasaklı işlemler

- **Hiçbir agent `mavis`'in `MEMORY.md` dosyasına yazmaz.** Bu kullanıcının Mavis root session'ı içindir.
- **Hiçbir agent `~/.minimax/memory/user.md` dosyasına yazmaz.** Sadece orchestrator önerir, kullanıcı onaylar.
- **Hiçbir agent başka bir agent'ın memory dosyasına yazmaz.**
- **Worker agent'lar başka bir subdomain projesinde dosya düzenleyemez.**
- **`brand-guardian` `nxt-worker`, `stk-worker`, `inf-worker` scope'unda çalışmaz** (private içerik).
- **Agent'lar DNS, Azure kaynakları, GitHub Actions workflow'larında değişiklik yapmaz.**

## Capability ihlali prosedürü

1. Agent ihlali fark ederse işlemi durdurur.
2. `mavis session send aserdargun-orchestrator "capability violation: <agent> tried <action> in <path>"` ile bildirir.
3. Orchestrator kullanıcıya sunar, yönlendirme alır.
4. İhlal tekrarlarsa: agent memory'sine "bu agent X yapmamalı" notu düşülür; 3 tekrarda yetkisi kısıtlanır.

## Sahiplik

| Kaynak | Sahip |
|--------|-------|
| `aserdargun-com` | `content-curator` (yazma), `brand-guardian` (brand assets) |
| `<code>-aserdargun-com` | `<code>-worker` (yazma), `brand-guardian` (brand assets) |
| `~/.minimax/agents/*/memory/` | sahip agent (yazma), `memory-curator` (read + rapor) |
| `~/.minimax/agents/mavis/memory/MEMORY.md` | mavis (root session) — korunur |
| `~/.minimax/memory/user.md` | mavis (root session) — korunur |
| `docs/superpowers/agent-team/` | `aserdargun-orchestrator` (kullanıcı onayıyla) |

Aynı commit'e iki agent yazmamalı. Orchestrator her iş için tek "owner agent" belirler.
