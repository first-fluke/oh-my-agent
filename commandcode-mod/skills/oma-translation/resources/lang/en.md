# English Target-Language Profile (`en`)

Load this profile when the **target** primary language subtag is `en`, including
`en-US` and `en-GB`. Read it with `../translation-rubric.md` for substantive
content or review. For substantive prose style, follow
`../style-skills.md`.

This profile owns source-to-English grammar and project conventions.

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

CJK sources do not supply English articles. Choose the article from the noun's
meaning and context.

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

### EN-8. Typography

- **Quotes**: straight `"` and `'` in code-adjacent docs and Markdown source.
  Curly quotes only when the publishing pipeline requires them.
- **Headings**: match the case used by sibling headings.
- **Serial comma**: follow sibling files; be consistent within a document.
- **Dates**: `2026-08-20` in tables and logs, `August 20, 2026` in US-audience
  prose, `20 August 2026` for international audiences. Follow siblings.
- **Units**: space between number and unit (`10 MB`, `200 ms`); no space before
  `%` (`40%`).
- **Spelling**: match the project's existing variety (US vs UK); do not mix.

---

## English self-check

- [ ] Every countable noun has a correct article or a deliberate zero article (`EN-1`)
- [ ] Number and subject-verb agreement are correct throughout (`EN-2`)
- [ ] No topic-comment structure left untranslated (`EN-3`)
- [ ] No run-on carried over from a multi-clause CJK sentence (`EN-4`)
- [ ] No politeness padding, "kindly", or "do the needful" (`EN-5`)
- [ ] Nominalizations unpacked into verbs (`EN-6`)
- [ ] Heading case, serial comma, date format, and spelling variety match siblings (`EN-8`)
