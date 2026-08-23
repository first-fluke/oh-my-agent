# Chinese Target-Language Profile (`zh`)

Load this file whenever the **target** language is Chinese. It is read together
with `../anti-ai-patterns.md` (shared taxonomy) and `../translation-rubric.md`
(shared scoring), never instead of them.

- **Localizations** of shared anti-AI rules (`1`–`24`).
- **Chinese-only rules** (`ZH-1`–`ZH-9`).

---

## Variant resolution (do this first)

`zh` is not a single target. Resolve the variant before translating a single
string, because script, vocabulary, and punctuation all diverge.

| Locale | Script | Region vocabulary |
|---|---|---|
| `zh-CN` / `zh-Hans` | 简体 | 软件, 网络, 程序, 服务器, 内存, 视频 |
| `zh-TW` / `zh-Hant-TW` | 繁體 | 軟體, 網路, 程式, 伺服器, 記憶體, 影片 |
| `zh-HK` / `zh-Hant-HK` | 繁體 | mostly TW vocabulary, HK-specific terms where established |

Resolution order: explicit locale in the file path or user request → dominant
script of sibling files → ask. If bare `zh` is requested with no signal, default
to `zh-CN` and say so once in the output notes. Never mix scripts in one file,
and never convert 简体 to 繁體 by character substitution alone: the vocabulary
must be converted too (`软件` → `軟體`, not `軟件`).

## Register

Chinese has no obligatory sentence-ending register system, so consistency lives
in vocabulary and sentence length instead.

| Voice | Effect |
|---|---|
| `formal` | 书面语, full sentences, 您 for the reader, no fragments |
| `balanced` | 书面语 in prose, fragments allowed in table cells and labels |
| `interpreter` | shorter clauses, 你 acceptable in product UI, spoken cadence |

Use `您` in enterprise and formal docs, `你` in developer-facing and product UI
when the project already does. Do not switch mid-document.

---

## Chinese-only rules

### ZH-1. `的` overuse (的的不休)

Chinese drops `的` far more readily than English drops `of`. Two `的` in one
noun phrase is a flag; three is a block.

```
Bad:  这是一个用于处理用户的请求的高性能的服务
Good: 这是处理用户请求的高性能服务

Bad:  系统的性能的提升
Good: 系统性能提升
```

Drop `的` between a monosyllabic modifier and its noun (`红花`, not `红的花`),
and after established compounds (`用户体验`, not `用户的体验`).

### ZH-2. `一个` as an indefinite article calque

English `a/an` has no Chinese equivalent. Insert a measure word only when the
count matters.

```
Bad:  这是一个强大的工具
Good: 这是强大的工具 / 这个工具很强大
```

### ZH-3. `们` plural forcing

Chinese marks plurality with context and quantifiers. `们` attaches only to
human nouns, and even then only when the plural reading would be lost.

```
Bad:  删除所有的文件们
Good: 删除所有文件
```

### ZH-4. Empty verbs (`进行` / `做出` / `实施` / `予以`)

```
进行了讨论 → 讨论了
做出了改进 → 改进了
实施优化   → 优化
予以处理   → 处理
```

### ZH-5. `关于` / `对于` overuse

```
Bad:  关于配置的检查已经完成
Good: 配置检查已完成

Bad:  对于这个问题，我们进行了修复
Good: 我们修复了这个问题
```

### ZH-6. Long pre-nominal modifiers

Chinese places modifiers before the noun, so English relative clauses pile up
into unreadable strings. Split into separate clauses or use a 把 / 被 pivot.

```
Bad:  基于 AI 的支持云端部署的实时数据监控系统
Good: 一套用 AI 在云端做实时数据监控的系统
```

Rule: more than about 12 characters of pre-nominal modifier → restructure.

### ZH-7. Punctuation and spacing

- **Fullwidth punctuation**: `，` `。` `、` `：` `；` `？` `！`. Never halfwidth in
  Chinese body text.
- **Enumeration comma**: `、` between list items inside a sentence, `，` between
  clauses. These are not interchangeable.
- **Quotes**: `“”` and `‘’` for `zh-CN`, `「」` and `『』` for `zh-TW` / `zh-HK`.
  This is the one target where curly quotes are correct; the shared curly-quote
  check must not strip them.
- **Brackets**: fullwidth `（）` around Chinese content, halfwidth `()` around
  ASCII-only content.
- **Em dash**: Chinese uses `——` (double-width, two ems) for a genuine break,
  which is not the same mark as `—`. Prefer restructuring; do not carry the
  English `—` through.
- **Latin spacing**: follow the project convention for a space between Chinese
  and ASCII runs. Read three sibling files before choosing; do not switch
  mid-file.
- **Ellipsis**: `……` (six dots, two characters), not `...`.

### ZH-8. Abstract suffix overuse (`性` / `化` / `度`)

```
提高了系统的可用性和稳定性 → 系统更稳定、更少出问题
进行自动化处理             → 自动处理
```

Keep the suffix when it is established terminology (`可用性`, `幂等性`,
`向后兼容性`).

### ZH-9. Numbers, dates, units

- Dates: `2026年8月20日` in prose, `2026-08-20` in tables and logs.
- Numerals: halfwidth (`5 个`, `12,000`).
- Percent: `40%` with no space.
- Ranges: `3~5 个` or `3 到 5 个`; do not use `—`.
- Measure words must match the noun (`个`, `台`, `条`, `项`, `次`).

---

## Localizations of shared rules

### Shared `2` — `-ing` participle phrases

```
EN:   The update improves performance, ensuring a seamless experience
Bad:  这次更新提升了性能，确保了无缝的体验
Good: 这次更新提升了性能，用起来更顺畅
```

### Shared `5` — AI vocabulary overuse

| Watch | Prefer |
|---|---|
| 此外 / 另外 (sentence-initial, repeated) | restructure or drop |
| 关键的 / 至关重要的 | only when the source emphasizes |
| 利用 | 用, 使用 |
| 各种各样的 | usually delete |
| 通过...来 | restructure the clause |
| 优化 / 最大化 | match the source's intensity |

### Shared `7` — rule of three

```
EN:   a fast, reliable, and intuitive experience
Bad:  快速的、可靠的、直观的体验
Good: 又快又好用
```

### Shared `8` — synonym cycling

If `用户` is right, use `用户` throughout. Do not rotate through `使用者`,
`客户`, `终端用户`.

### Shared `10`, `11` — compound stacking

```
Bad:  一个 AI 驱动的、基于云的、企业级的解决方案
Good: 一套跑在云上的 AI 方案
```

### Shared `14a` — mechanical punctuation swap

```
Source: Documentation drift checks — broken refs and diff-affected docs
Lazy:   文档漂移检查：损坏的引用和受 diff 影响的文档
Better: 检查引用是否失效，并找出受改动影响的文档
```

### Shared `19` — unnecessary connectives

```
Bad:  性能提升了。因此，用户体验变好了。
Good: 性能提升了，用户体验也跟着变好。
```

Watch 因此, 然而, 此外, 另外, 同时, 综上所述.

### Shared `20` — passive voice

```
Bad:  这个功能被团队开发了
Good: 团队开发了这个功能
```

`被` is correct when the outcome is adverse or the agent is genuinely unknown
(`文件被删除了`). It is wrong as a blanket rendering of English passive.

### Shared `21` — noun pile-up

See `ZH-6`.

### Shared `22` — over-nominalization

See `ZH-4`.

### Shared `23` — forced pronouns

```
Bad:  我们推出了这个功能，我们得到了好的反馈
Good: 推出这个功能后，反馈不错
```

### Shared `24` — cleft calques

```
Bad:  重要的是用户体验
Good: 用户体验最重要
```

---

## Chinese self-check

- [ ] Variant resolved (`zh-CN` / `zh-TW` / `zh-HK`); script and vocabulary both
      converted, never script alone
- [ ] No noun phrase with two or more `的` (`ZH-1`)
- [ ] No `一个` inserted as an article (`ZH-2`)
- [ ] No `们` on non-human or contextually plural nouns (`ZH-3`)
- [ ] No `进行` / `做出` / `实施` empty verbs (`ZH-4`)
- [ ] No `关于` / `对于` sentence openers that add nothing (`ZH-5`)
- [ ] No pre-nominal modifier longer than about 12 characters (`ZH-6`)
- [ ] Fullwidth punctuation; `、` vs `，` used correctly; `……` not `...` (`ZH-7`)
- [ ] Quote style matches the variant; curly quotes preserved for `zh-CN`
- [ ] No English `—` carried through (`ZH-7`)
- [ ] `被` used only for adverse or agentless outcomes (shared `20`)
