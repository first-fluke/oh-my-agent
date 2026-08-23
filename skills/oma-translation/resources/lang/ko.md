# Korean Target-Language Profile (`ko`)

Load this file whenever the **target** language is Korean. It is read together
with `../anti-ai-patterns.md` (shared taxonomy) and `../translation-rubric.md`
(shared scoring), never instead of them.

Two kinds of rules live here:

- **Localizations** of shared anti-AI rules (`1`–`24`): how the shared pattern
  surfaces in Korean and what the fix looks like.
- **Korean-only rules** (`KO-1`–`KO-12`): grammar, typography, and register
  requirements that have no equivalent in the shared taxonomy.

All examples are illustrative pairs in `bad → good` form. Do not translate the
rule text itself into the output.

---

## Register

Korean forces a sentence-ending choice on every sentence. Pick once per
document and never drift.

| Style | Ending | Use for |
|---|---|---|
| 합니다체 | `-습니다` / `-ㅂ니다` | reports, user-facing docs, release notes, agent output |
| 해요체 | `-어요` / `-아요` | conversational UI, onboarding microcopy, casual product voice |
| 한다체 (평서체) | `-다` / `-이다` | reference docs, specs, academic prose, changelog bodies |

Resolution order:

1. Match the dominant ending of sibling files in the same directory.
2. If no siblings exist, map from `translation_voice` in `.agents/oma-config.yaml`:
   `formal` → 합니다체, `balanced` → 합니다체 for prose and 한다체 for reference
   tables, `interpreter` → 합니다체 with shorter sentences and permitted
   label-position fragments.
3. If the source is dialogue or subtitle content, follow the speaker relationship
   in the source rather than the file convention.

Never mix 합니다체 with 한다체 inside one document. Headings and table cells are
exempt because they carry no ending at all.

**Honorific target**: raise the listener (`-시-`, `-께서`, 공손 어휘) only when the
source addresses a person directly or the project already does so. Do not add
`사용자님`-class honorifics to documentation that addresses a generic reader.

---

## Korean-only rules

### KO-1. Do not drop particles or endings

Compressed agent Korean drops 조사 and 어미 to save tokens, which strips out the
grammatical relations that carry the meaning. Restore them. Use 부사, 보조사,
선어말어미, and 보조 용언 actively rather than treating them as optional padding.

```
이 결정은 이후 중요 정책이 갈리는 자리. 컨텍스트 압축 전 신중 반영한다.
→ 이 결정은 이후 중요한 정책에 지속적으로 영향을 주기 때문에, 컨텍스트가
  압축되기 전에 신중히 반영합니다.
```

This is a restoration of grammar, not an addition of meaning. It must not
introduce facts, opinions, or emphasis that the source does not carry.

### KO-2. Genitive `의` chains hide dropped sentence elements

`의` linking two or more nouns is a diagnostic signal, not merely a style
preference: the predicate and the particles that belong in that position have
been deleted. Two `의` in one noun phrase is a hard flag; three is a block.

```
사본의 문구는 작업의 상황을
→ 사본에 기재된 문구는 작업이 진행되는 상황을

지출 비용 추론 용도의 토큰 카운트 함수의 오류 상황에서
→ 지출한 비용을 추론하는 토큰 카운트 함수에 오류가 발생하면
```

Also delete `의` that entered as a calque of Japanese `の` or English `of` where
Korean would use no particle at all: `최대의 성능` → `최대 성능`,
`두 개의 파일` → `파일 두 개`.

This rule catches what shared rule `21` (noun pile-up) misses, because a `의`
chain can hide a dropped predicate without ever stacking three modifiers.

### KO-3. Finish the sentence

End body sentences with a predicate and a final ending. Three failure shapes:

| Shape | Bad | Good |
|---|---|---|
| Noun ending | `lint 실패.` | `lint가 실패했습니다.` |
| Adverbial ending | `설정 파일을 읽지 못한 채로.` | `설정 파일을 읽지 못한 채로 종료했습니다.` |
| Connective ending | `캐시를 비우고 다시 실행했으며,` | `캐시를 비우고 다시 실행했습니다.` |

Exempt positions: headings, list items that act as labels, table cells, and
`key: value` pairs. `결과: lint 실패` is correct; a bare `lint 실패.` sitting in a
paragraph is not.

**Trailing negation calque**: English tacks short negation fragments onto a
sentence end (`..., no guessing`). Calquing this produces `..., 추측 없이`, which
is a noun fragment in Korean body text.

```
선택된 항목에서 옵션이 나옵니다, 추측 없이.
→ 선택된 항목에서 바로 옵션을 가져오므로 사용자가 추측할 필요가 없습니다.
```

### KO-4. Sino-Korean vocabulary is not the problem; bare Sino-Korean nouns are

Do not read shared rules `5` and `11` as "avoid 한자어". A precise Sino-Korean
root combined with Korean inflection produces the clearest technical Korean
available. What fails is the Sino-Korean noun left bare, with no particle and no
verb ending, so that the action disappears.

```
지출 비용 추론 용도의 토큰 카운트 함수의 오류 상황에서   (no particles, relations unclear)
쓴 비용을 구하는 토큰 카운트 함수에 문제가 생기면        (over-nativized, imprecise)
→ 지출한 비용을 추론하는 토큰 카운트 함수에 오류가 발생하면
```

`발생하면`, `추론하는`, `지출한` are all Sino-Korean and all correct, because each
carries an ending.

### KO-5. No noun-pinned verbs

Pinning a verb into Korean as a bare noun, whether an English loanword or a
stiff Sino-Korean noun, reads as jargon.

```
skill을 로드              → skill을 불러옵니다
프로젝트에 시드           → 프로젝트에 심습니다
`<HARD-GATE>` 발동        → `<HARD-GATE>`가 걸렸습니다
마이그레이션 진행         → 마이그레이션을 실행했습니다
```

### KO-6. No figurative substitution for plain vocabulary

Shared rules `1`–`3` cover figurative language arriving from the source. This
rule covers figurative vocabulary the model invents on the Korean side, where
the source had a plain noun or verb. It lowers readability and shifts meaning.

```
분석의 흐름        → 분석의 방향성
코드로 박는 자리    → 코드에 명시하는 위치
요청을 받습니다     → 요청을 확인했습니다
테스트를 태웁니다   → 테스트를 실행합니다
```

Keep expressions that are already established idiom in the field and would sound
stilted if flattened (`병목`, `롤백`, `핫픽스`).

### KO-7. Prefer vocabulary that is actually in circulation

A word can be in the dictionary, unambiguous, and still hurt communication
because readers rarely meet it. Choose the common word over the rare one when
both are precise. This is the inverse of shared rule `5`, which targets
overused words; both failures are live in Korean output.

### KO-8. Korean translation-ese constructions

| Pattern | Bad | Good |
|---|---|---|
| 이중 피동 | `보여집니다`, `불려집니다`, `되어집니다` | `보입니다`, `불립니다`, `됩니다` |
| `~에 대한` overuse | `설정에 대한 검토를 했습니다` | `설정을 검토했습니다` |
| `~에 있어서` (JA `における`) | `배포에 있어서 중요한 것은` | `배포에서 중요한 점은` |
| `~로부터` (JA `から`) | `서버로부터 응답을 받았습니다` | `서버에서 응답을 받았습니다` |
| `~에 의해` (EN passive) | `팀에 의해 개발되었습니다` | `팀이 개발했습니다` |
| `~적(的)` stacking | `구조적, 기능적 개선` | `구조와 기능을 개선` |
| `~들` plural forcing | `파일들을 모두 삭제했습니다` | `파일을 모두 삭제했습니다` |
| `~하는 것이 가능하다` | `재시도하는 것이 가능합니다` | `재시도할 수 있습니다` |
| `~화(化)` nominalizing | `자동화를 진행합니다` | `자동으로 처리합니다` |

Korean marks plurality with quantifiers and context. Use `들` only when the
plural reading would otherwise be lost.

### KO-9. Typography and spacing

- **Inline code + particle**: no space between a backtick span and the particle
  that follows. `` `prompt` 로 `` → `` `prompt`로 ``.
- **Counters**: no space between numeral and counter. `5 개` → `5개`, `3 번째` →
  `3번째`. Units keep a space: `10 MB`, `200 ms`.
- **Em dash**: `—` does not exist in Korean typography. Restructure the clause;
  never swap it for `:` or parentheses and stop there (shared rule `14a`).
- **Quotes**: straight `"` and `'`, or `「」` only when the project already uses
  them. Do not emit curly quotes.
- **Parentheses**: halfwidth `()` with no leading space when attached to a term:
  `하네스(harness)`.
- **Ellipsis**: `...` rather than `…` unless the source file already uses `…`.
- **Middle dot**: `·` for tight coordination in headings (`설치·설정`), commas in
  body text.

### KO-10. Loanword orthography (외래어 표기법)

Use the standard form. Frequent misspellings in machine output:

```
컨텐츠 → 콘텐츠      메세지 → 메시지      데이타 → 데이터
윈도우즈 → 윈도우    타겟 → 타깃          레퍼런스 → 레퍼런스 (ok)
쉐이더 → 셰이더      플래폼 → 플랫폼      비지니스 → 비즈니스
어플리케이션 → 애플리케이션              스케쥴 → 스케줄
```

When the project's existing translations consistently use a non-standard form,
follow the project and note the conflict once.

### KO-11. Numbers, dates, units

- Dates: `2026년 8월 20일` in prose, `2026-08-20` in tables and logs.
- Ranges: `3~5개` in prose, `3-5` inside code or config values.
- Large numbers: comma grouping (`12,000`), and `만`/`억` only when the source
  uses a comparable scale word.
- Percent: `40%` with no space.

### KO-12. Subagent and multi-hop Korean

When Korean text will be consumed by another agent rather than by a person
(subagent prompts, intermediate result files, handoff summaries), apply `KO-1`
through `KO-3` before handing it off. Quality loss compounds at every hop in
`orchestrate`, `ultrawork`, and `ralph`, and a dropped particle in a stage-1
prompt becomes a wrong decision in stage 3.

Internal status keywords, workflow markers, and log levels stay in English per
`.agents/rules/i18n-guide.md`.

---

## Localizations of shared rules

### Shared `2` — `-ing` participle phrases

```
EN: The update improves performance, ensuring a seamless experience
Bad: 업데이트는 성능을 향상시키며, 원활한 경험을 보장합니다
Good: 이번 업데이트로 성능이 개선되어 더 매끄럽게 사용할 수 있습니다
```

### Shared `5` — AI vocabulary overuse

| Watch | Prefer |
|---|---|
| 또한 (sentence-initial, repeated) | 그리고, 게다가, or restructure |
| 핵심적인 / 중요한 / 필수적인 | use only when the source emphasizes |
| 활용하다 | 쓰다, 사용하다 |
| 다양한 | usually delete |
| ~를 통해 | restructure the clause |
| 극대화하다 / 최적화하다 | match the source's actual intensity |

### Shared `7` — rule of three

```
EN: a fast, reliable, and intuitive experience
Bad: 빠르고, 안정적이며, 직관적인 경험
Good: 빠르고 쓰기 편한 경험
```

### Shared `8` — synonym cycling

Terminology consistency outranks variety. If `사용자` is right, use `사용자`
throughout; do not rotate through `이용자`, `유저`, `참여자`.

### Shared `10`, `11` — compound stacking

```
Bad: AI 기반의, 클라우드 기반의, 엔터프라이즈급 솔루션
Good: 클라우드에서 돌아가는 AI 솔루션

Bad: 직관적인 UI와 강력한 성능, 원활한 연동을 제공합니다
Good: UI는 쓰기 편하고, 성능이 좋고, 연동도 매끄럽습니다
```

### Shared `14a` — mechanical punctuation swap

```
Source: Documentation drift checks — broken refs and diff-affected docs
Lazy swap: 문서 drift 체크: 깨진 참조와 diff 영향받는 docs
Restructured: 참조 무결성 검사, 변경 영향 문서 식별
```

### Shared `19` — unnecessary connectives

```
Bad: 성능이 향상되었다. 따라서 사용자 경험이 좋아졌다.
Good: 성능이 향상되면서 사용자 경험도 좋아졌다.
```

Watch 따라서, 그러므로, 하지만, 게다가, 또한, 더 나아가.

### Shared `20` — passive voice

```
Bad: 이 기능은 팀에 의해 개발되었다
Good: 팀이 이 기능을 개발했다
```

### Shared `21` — noun pile-up

```
Bad: AI 기반의 클라우드 지원 실시간 데이터 모니터링 시스템
Good: AI를 활용해 클라우드에서 실시간으로 데이터를 모니터링하는 시스템
```

### Shared `22` — over-nominalization

```
논의를 진행했다 → 논의했다
개선을 실시하다 → 개선하다
검토를 수행하다 → 검토하다
```

### Shared `23` — forced pronouns

```
Bad: 우리는 이 기능을 출시했고, 우리는 좋은 반응을 얻었다
Good: 이 기능을 출시했고, 반응이 좋았다
```

### Shared `24` — cleft calques

```
Bad: 중요한 것은 사용자 경험이다
Good: 사용자 경험이 가장 중요하다
```

---

## Korean self-check

Run after the shared self-check, before emitting.

- [ ] One sentence-ending style throughout; no 합니다체 / 한다체 mixing
- [ ] No dropped 조사 or 어미 in body text (`KO-1`)
- [ ] No noun phrase with two or more chained `의` (`KO-2`)
- [ ] No body sentence ending in a noun, adverbial, or connective (`KO-3`)
- [ ] No bare Sino-Korean or loanword noun standing in for a verb (`KO-4`, `KO-5`)
- [ ] No invented figurative vocabulary where the source was plain (`KO-6`)
- [ ] No rare vocabulary chosen over an equally precise common word (`KO-7`)
- [ ] No 이중 피동, `~에 대한`, `~에 있어서`, `~들` forcing (`KO-8`)
- [ ] No space between inline code and its particle; no space in `5개` (`KO-9`)
- [ ] No `—`, no curly quotes (`KO-9`)
- [ ] Loanwords follow 외래어 표기법 or the project's established forms (`KO-10`)
- [ ] Korean handed to another agent passes `KO-1`–`KO-3` (`KO-12`)
