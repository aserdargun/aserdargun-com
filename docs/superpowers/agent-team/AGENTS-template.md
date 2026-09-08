# AGENTS.md master template — aserdargun subdomain projeleri

Bu template, 14 aserdargun subdomain projesinde `AGENTS.md` oluşturmak için kullanılır. `bee-aserdargun-com/AGENTS.md`'den derive edilmiştir. Her proje kendi 8-maddelik sözleşmesini bu template'ten doldurur.

---

## 8-madde şablon

Her madde `<PLACEHOLDER>` token'ı ile gösterilir. `<PLACEHOLDER>` değerini proje özelinde doldur. Bee örnekleri kaynak olarak gösterilmiştir; farklı projede uyarlanmalıdır.

### 1. Mission

Projenin tek cümlelik misyonu. Kod adı (3 harf) ve tam adı içermeli.

```
- {{MISSION_PLACEHOLDER}}
```

Örnek (bee-aserdargun-com'dan):

```
- Build the deterministic scientific laboratory, with Apis mellifera as inspiration.
```

### 2. Domain truth

Kaynak kodun nerede yaşadığı, bu alanda neyin yasak olduğu, hangi kuralların değişmez olduğu.

```
- {{DOMAIN_TRUTH}}
```

Örnek (bee-aserdargun-com'dan):

```
- Keep simulation truth in `src/simulation`; no React, DOM, wall clock, or unseeded randomness there.
```

### 3. Information boundaries

Neyin observer output (sadece raporlanan) neyin decision input (karara etki eden) olduğu. Bu ayrım bilgi simetrisi için kritik.

```
- {{INFO_BOUNDARIES}}
```

Örnek (bee-aserdargun-com'dan):

```
- A bee receives local observations, private memory, and nearby social signals only. Colony metrics are observer outputs, never decision inputs.
```

### 4. Schema discipline

Schema versiyonları açık olmalı; semantik değişince ilgili versiyonlar güncellenmeli. Liste tüm projelerde standarttır:

```
- Behavior, experiment, world, simulation, metric, and export schema versions are explicit. Update affected versions when semantics change.
```

### 5. Replay/export guarantees

Her intervention tick-stamped olmalı, replay export'a dahil edilmeli. Geçersiz veya desteklenmeyen run'lar reddedilmeli.

```
- {{REPLAY_GUARANTEES}}
```

Örnek (bee-aserdargun-com'dan):

```
- Every intervention is tick stamped and included in replay exports. Reject invalid or unsupported runs.
```

### 6. Bilingual parity (tr/en)

Türkçe ve İngilizce kontrol + açıklamalar eşdeğer olmalı. Model varsayımları ve simülasyon birimleri etiketlenmeli.

```
- Keep Turkish and English controls and explanations equivalent. Label model assumptions and simulation units.
```

### 7. Pre-handoff gate

Handoff öncesi zorunlu kontroller: `validate:codex` + `git diff --check`.

```
- Verify `npm run validate:codex` and review `git diff --check` before handoff.
```

### 8. Scope guard

Kullanıcı açıkça yetki verene kadar yalnızca local çalışma. İlgisiz iş ve süreçler korunmalı.

```
- Local work only unless the user authorizes external publication. Preserve unrelated work and processes.
```

---

## Next.js projeler için ek

Next.js tabanlı subdomain'lerde (aia, swi, bee, itl) 8-maddenin altına Next.js'in auto-generated marker bloğu eklenir. `next dev` bu bloğu otomatik ekler; silmek anlamsız, commit'lemek temizdir.

```
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
```

---

## Kullanım

Bu template, her `<code>-worker` tarafından kendi projesi için doldurulur. Mission, domain truth, info boundaries ve replay/export guarantees kısımları proje özelinde customize edilir; diğer maddeler (schema discipline, bilingual parity, pre-handoff gate, scope guard) standarttır.

Üretim adımları:

1. `<code>-worker` bu template'i okur.
2. `{{MISSION_PLACEHOLDER}}` vb. token'ları proje gerçekliğiyle değiştirir.
3. Vite projesi ise 8 maddeyle bitirir; Next.js projesi ise son bölümü (nextjs-agent-rules marker) ekler.
4. `AGENTS.md` dosyasını repo köküne yazar, `git add AGENTS.md && git commit -m "docs: add AGENTS.md per master template"` ile commit'ler.
5. `npm run validate:codex` ve `git diff --check` pre-handoff gate'ini geçer.

Bee-aserdargun-com referans implementasyon olarak kalır; ileride yeni madde eklenirse bu template güncellenir ve 14 proje yeniden senkronize edilir.
