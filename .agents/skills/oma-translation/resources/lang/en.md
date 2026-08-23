# English Target-Language Profile (`en`)

Load this file whenever the **target** language is English. It is read together
with `../anti-ai-patterns.md` (shared taxonomy) and `../translation-rubric.md`
(shared scoring), never instead of them.

Most oma translation runs go English → other. This profile covers the reverse
direction, where the source is CJK: commit-adjacent docs written in Korean,
Japanese issue threads, Chinese design notes, and Korean-authored READMEs being
published in English.

- **Localizations** of shared anti-AI rules (`1`–`24`).
- **English-only rules** (`EN-1`–`EN-8`).

---

## Register

| Voice | Effect |
|---|---|
| `formal` | full sentences, no contractions, third person, no fragments |
| `balanced` | contractions allowed, second person for instructions, fragments in labels and cells |
| `interpreter` | short sentences, direct address, fragments allowed where natural |

Documentation defaults to second-person imperative for instructions ("Run the
migration") and third person for descriptions. Do not drift into first-person
plural ("we recommend") unless the source has an authorial voice.

---

## English-only rules

### EN-1. Articles

CJK has no articles, so machine output either omits them or scatters them
randomly. This is the single most reliable tell of a CJK → EN translation.

```
Bad:  Run migration before starting server.
Good: Run the migration before starting the server.

Bad:  This is the useful tool for the developers.
Good: This is a useful tool for developers.
```

Rules of thumb: a specific, previously-mentioned, or uniquely-identified thing
takes `the`; a first mention of a countable thing takes `a`/`an`; generic plurals
and uncountables take no article.

### EN-2. Number marking

CJK does not inflect for number. Decide singular or plural for every countable
noun, and make the verb agree.

```
Bad:  The config file are loaded from three location.
Good: The config files are loaded from three locations.
```

### EN-3. Topic-comment to subject-predicate

Korean and Japanese front the topic with `은/는` or `は` and leave the subject
implicit. English needs an explicit subject in the right slot.

```
KO:   이 기능은 캐시를 쓰기 때문에 첫 실행이 느립니다
Bad:  This feature, because it uses cache, first run is slow.
Good: Because this feature uses a cache, the first run is slow.
```

### EN-4. Split long CJK sentences

A single Korean or Japanese sentence often carries three clauses joined by
`~므로`, `~는데`, `〜ため`. Rendering that as one English sentence produces a
run-on. Split at the clause boundaries.

```
Bad:  The scan reads the manifest and because the manifest may be stale it
      re-hashes each file and then reports the drift.
Good: The scan reads the manifest. Because the manifest may be stale, it
      re-hashes each file, then reports the drift.
```

### EN-5. Drop politeness padding

Korean and Japanese business register carries deference that becomes servile or
odd in English.

```
확인 부탁드립니다        → Please review.        (not "I humbly request your kind review")
~해 주시기 바랍니다      → Run ... / Please run ...
ご確認いただけますと幸いです → Please confirm.
参考にしてください       → See ... / For reference, see ...
```

Do not add "kindly", "please be informed", "as per", or "do the needful".

### EN-6. Unpack Sino-Korean and 漢語 nominalizations into verbs

```
검증을 수행합니다      → validates      (not "performs validation")
개선을 진행했습니다    → improved       (not "carried out an improvement")
最適化を実施する       → optimize       (not "implement optimization")
```

### EN-7. Em dash is allowed here, but not as a crutch

The shared em-dash restructuring requirement is a CJK-target rule. English
typography accepts `—`, so do not mechanically strip it. It still falls under
shared rule `14`: one per paragraph at most, and never as a substitute for
deciding the logical relationship between two clauses.

Use spaced or unspaced em dashes consistently with sibling files. Prefer a
colon for definitions and a comma pair for asides.

### EN-8. Typography

- **Quotes**: straight `"` and `'` in code-adjacent docs and Markdown source.
  Curly quotes only when the publishing pipeline requires them.
- **Headings**: sentence case unless sibling headings use title case. Do not
  introduce title case (shared rule `15`).
- **Serial comma**: follow sibling files; be consistent within a document.
- **Dates**: `2026-08-20` in tables and logs, `August 20, 2026` in US-audience
  prose, `20 August 2026` for international audiences. Follow siblings.
- **Units**: space between number and unit (`10 MB`, `200 ms`); no space before
  `%` (`40%`).
- **Spelling**: match the project's existing variety (US vs UK); do not mix.

---

## Localizations of shared rules

### Shared `5` — AI vocabulary overuse

The shared English watch list applies directly here: *additionally, crucial,
delve, enhance, foster, garner, highlight, interplay, intricate, key, landscape,
leverage, pivotal, robust, seamless, showcase, streamline, tapestry, testament,
underscore, utilize, vibrant*.

Frequent CJK-source triggers:

| Source | Bad | Good |
|---|---|---|
| `활용하다` / `活用する` / `利用` | leverage, utilize | use |
| `수행하다` / `実施する` / `进行` | perform, conduct, carry out | do the verb directly |
| `다양한` / `さまざまな` / `各种` | a variety of, diverse | often delete |
| `~를 통해` / `〜を通じて` / `通过` | through the use of | via, with, or restructure |
| `최적화` / `最適化` / `优化` | optimize (when source means "improve") | improve, tune |

### Shared `8` — synonym cycling

Keep one term per concept. If the source uses `사용자` throughout, use "user"
throughout; do not rotate through "client", "consumer", "end user".

### Shared `13`, `16a` — boldface and inline-header lists

CJK technical writing bolds far more freely than English documentation. Do not
carry every bold span through, and do not convert plain bullets into
`**Header:** description` form.

### Shared `19` — unnecessary connectives

Korean and Japanese place explicit connectives more often than English needs.

```
Bad:  Performance improved. Therefore, the user experience got better.
Good: Performance improved, and so did the user experience.
```

Watch therefore, moreover, furthermore, in addition, consequently, that being
said.

### Shared `20` — passive voice

CJK sources often front the object with `은/는` or `は`, which tempts a passive
rendering. Prefer active with an explicit agent when the agent is known.

```
Bad:  This feature was developed by the team.
Good: The team developed this feature.
```

### Shared `23` — pronouns

The inverse of the CJK rule. English requires the subject that the source
omitted; supply it from context rather than leaving a dangling clause. Do not
invent a first-person "we" where the source had no agent — use the passive or
name the actual component.

---

## English self-check

- [ ] Every countable noun has a correct article or a deliberate zero article (`EN-1`)
- [ ] Number and subject-verb agreement are correct throughout (`EN-2`)
- [ ] No topic-comment structure left untranslated (`EN-3`)
- [ ] No run-on carried over from a multi-clause CJK sentence (`EN-4`)
- [ ] No politeness padding, "kindly", or "do the needful" (`EN-5`)
- [ ] Nominalizations unpacked into verbs (`EN-6`)
- [ ] At most one em dash per paragraph, and it earns its place (`EN-7`)
- [ ] Heading case, serial comma, date format, and spelling variety match siblings (`EN-8`)
- [ ] No bold or inline-header lists carried over mechanically (shared `13`, `16a`)
- [ ] One term per concept (shared `8`)
