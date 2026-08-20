# Japanese Target-Language Profile (`ja`)

Load this file whenever the **target** language is Japanese. It is read together
with `../anti-ai-patterns.md` (shared taxonomy) and `../translation-rubric.md`
(shared scoring), never instead of them.

- **Localizations** of shared anti-AI rules (`1`–`24`).
- **Japanese-only rules** (`JA-1`–`JA-9`).

---

## Register

| Style | Ending | Use for |
|---|---|---|
| です・ます体 (敬体) | `です` / `ます` | user-facing docs, READMEs, release notes, agent reports |
| だ・である体 (常体) | `だ` / `である` | specs, reference docs, academic prose, changelog bodies |

Resolution order:

1. Match the dominant style of sibling files in the same directory.
2. Otherwise map from `translation_voice`: `formal` → です・ます体 with fully
   expanded sentences, `balanced` → です・ます体 for prose and である体 for
   reference tables, `interpreter` → です・ます体 with shorter sentences and
   permitted 体言止め in label positions.

Never mix the two inside one document. Headings and table cells are exempt.

**Honorifics**: use 尊敬語 / 謙譲語 only where the source addresses a person or the
project already does. Avoid 二重敬語 (`お伺いいたします` → `伺います`,
`ご覧になられる` → `ご覧になる`).

---

## Japanese-only rules

### JA-1. 一文一義 — one proposition per sentence

Japanese tolerates long sentences grammatically but reads poorly when a single
sentence carries three or more clauses joined by `〜が`, `〜ため`, `〜ので`. English
compound sentences should be split rather than chained.

```
Bad:  この機能はキャッシュを使用しますが、初回実行時にはキャッシュがないため
      レイテンシが増加しますので、事前にウォームアップを実行してください。
Good: この機能はキャッシュを使用します。初回実行時はキャッシュがないため
      レイテンシが増加します。事前にウォームアップを実行してください。
```

### JA-2. Trim redundant potential and progressive forms

```
〜することができます  → 〜できます
〜を行います          → 〜します
〜という形になります  → 〜です / 〜になります
〜させていただきます  → 〜します   (unless the source is genuinely deferential)
```

### JA-3. 体言止め is positional

Noun-ending sentences are natural in headings, bullet labels, and table cells,
and unnatural in narrative body text. This is the same boundary as Korean
`KO-3`, but Japanese tolerates 体言止め in more list positions.

```
Bad (body):  `ANTHROPIC_API_KEY` の未設定。
Good (body): `ANTHROPIC_API_KEY` は設定されておらず、OAuth で認証します。
Good (cell): 結果: lint 失敗
```

### JA-4. Suffix abstraction overuse (`〜性` / `〜化` / `〜的`)

AI output stacks abstract suffixes where a verb or adjective is natural.

```
可用性の向上を実施します   → より安定して使えるようにします
自動化を行います           → 自動で処理します
構造的な問題               → 構造の問題
```

Keep the suffix when it is established terminology (`可用性`, `冪等性`,
`後方互換性` in technical specs).

### JA-5. Punctuation and script

- **句読点**: `、` and `。` (fullwidth). Never `，` `．` unless the project already
  uses them.
- **Brackets**: `「」` for quotation, `『』` for titles and nested quotation,
  fullwidth `（）` for asides in Japanese text, halfwidth `()` around ASCII-only
  content such as `(CLI)`.
- **Em dash**: `—` is not Japanese typography. Restructure, or use `。` to split.
  Do not swap it for `：` and stop there (shared rule `14a`).
- **中黒**: `・` for coordinating loanword nouns (`インストール・設定`).
- **Spacing**: follow the project convention for a space between Japanese and
  ASCII runs. Read three sibling files before choosing; do not switch mid-file.
- **波ダッシュ**: `〜` for ranges (`3〜5 件`), not `~`.

### JA-6. 長音符 policy

`サーバー` vs `サーバ`, `コンピューター` vs `コンピュータ`. Both conventions are in
active use. Match the project's existing files; if none exist, use the JIS-style
long form (`サーバー`) for user-facing docs.

### JA-7. カタカナ vs 漢語

Do not romanize a concept the project already writes in 漢語, and do not force a
kanji compound where the loanword is the industry standard.

```
デプロイ  keep (not 配備)
ロールバック keep (not 巻き戻し)
認証 keep (not オーセンティケーション)
検証 keep (not バリデーション) — unless the codebase uses バリデーション
```

Consistency with the project's existing translations decides.

### JA-8. Avoid 二重否定 and hedge stacking

```
Bad:  対応していないわけではありません
Good: 対応しています / 一部だけ対応しています

Bad:  可能性があるかもしれません
Good: 可能性があります
```

### JA-9. Numbers, dates, units

- Dates: `2026年8月20日` in prose, `2026-08-20` in tables and logs.
- Numerals: halfwidth (`5 件`, `12,000`), not `５件`.
- Percent: `40%` with no space.
- Counters must match the noun (`件`, `個`, `台`, `回`, `つ`).

---

## Localizations of shared rules

### Shared `2` — `-ing` participle phrases

```
EN:   The update improves performance, ensuring a seamless experience
Bad:  このアップデートはパフォーマンスを向上させ、シームレスな体験を保証します
Good: このアップデートでパフォーマンスが改善され、より快適に使えます
```

### Shared `5` — AI vocabulary overuse

| Watch | Prefer |
|---|---|
| また (sentence-initial, repeated) | restructure or drop |
| 重要な / 不可欠な | only when the source emphasizes |
| 活用する | 使う, 利用する |
| さまざまな | usually delete |
| 〜を通じて | restructure the clause |
| 最適化する / 最大化する | match the source's intensity |

### Shared `7` — rule of three

```
EN:   a fast, reliable, and intuitive experience
Bad:  高速で、信頼性が高く、直感的な体験
Good: 速くて使いやすい
```

### Shared `8` — synonym cycling

If `ユーザー` is right, use `ユーザー` throughout. Do not rotate through
`利用者`, `使用者`, `エンドユーザー`.

### Shared `10`, `11` — compound stacking

```
Bad:  AI 搭載のクラウドベースのエンタープライズグレードのソリューション
Good: クラウド上で動く AI ソリューション
```

### Shared `14a` — mechanical punctuation swap

```
Source: Documentation drift checks — broken refs and diff-affected docs
Lazy:   ドキュメントドリフトチェック：壊れた参照と diff 影響ドキュメント
Better: 参照の整合性チェックと、変更の影響を受けるドキュメントの特定
```

### Shared `19` — unnecessary connectives

```
Bad:  パフォーマンスが向上しました。したがって、ユーザー体験が良くなりました。
Good: パフォーマンスが向上し、ユーザー体験も良くなりました。
```

Watch したがって, しかしながら, さらに, また, その結果.

### Shared `20` — passive voice

```
Bad:  この機能はチームによって開発されました
Good: チームがこの機能を開発しました
```

### Shared `21` — noun pile-up

```
Bad:  AI ベースのクラウド対応リアルタイムデータ監視システム
Good: AI を使ってクラウド上でデータをリアルタイムに監視するシステム
```

### Shared `22` — over-nominalization

```
議論を行いました → 議論しました
改善を実施する   → 改善する
検討を進める     → 検討する
```

### Shared `23` — forced pronouns

```
Bad:  私たちはこの機能をリリースし、私たちは良い反応を得ました
Good: この機能をリリースしたところ、反応は良好でした
```

Japanese omits subjects freely. Insert `私たち` only when the actor genuinely
changes or contrast requires it.

### Shared `24` — cleft calques

```
Bad:  重要なのはユーザー体験であるということです
Good: ユーザー体験が最も重要です
```

---

## Japanese self-check

- [ ] One style throughout; no です・ます / である mixing
- [ ] No sentence chaining three or more clauses (`JA-1`)
- [ ] No `〜することができます` / `〜を行います` redundancy (`JA-2`)
- [ ] No 体言止め in narrative body text (`JA-3`)
- [ ] No stacked `〜性` / `〜化` / `〜的` where a verb works (`JA-4`)
- [ ] `、` `。` used; no `—`; no curly quotes (`JA-5`)
- [ ] 長音符 and カタカナ / 漢語 choices match sibling files (`JA-6`, `JA-7`)
- [ ] No 二重否定 or stacked hedges (`JA-8`)
- [ ] No 二重敬語
- [ ] Halfwidth numerals with correct counters (`JA-9`)
