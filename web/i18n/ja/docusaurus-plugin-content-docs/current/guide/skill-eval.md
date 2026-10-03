---
title: "スキルユーティリティ評価"
sidebar_label: スキル評価
description: oma skill eval の評価タスク用フィクスチャ、.agents/eval/ のディレクトリ規約、チェッカーの種類、モックとライブの実行モードを説明します。
---

# スキルユーティリティ評価

`oma skill eval` は、スキルを読み込むことでエージェントのタスク結果が実際に改善するか測定します。`oma skill audit`（「2 つのスキルは冗長か」を問う）とは別の問いで、「このスキルは役に立つか」を問います。

設計の根拠は 2 件の研究結果です。WikiSkill（arXiv:2608.27454）は、生の経験、永続知識、実行可能なスキルを分けながら、進化のための保留ゲートを維持します。SkillLens（arXiv:2605.23899）は、スキルの効用が説明の独自性とは別であることを示します。説明が独自なスキルでも役に立たない場合があり、内容が重なるスキルでも役立つ場合があります。

---

## 動作

各タスクフィクスチャで、コマンドは 2 つの実験群を実行します。

1. **ベースライン実験群** では、スキルを外したエージェントにタスクプロンプトをディスパッチします。
2. **処置実験群** では、`SKILL.md` をプロンプトの先頭に追加してから、同じタスクをディスパッチします。

各実験群をタスクのチェッカーで採点します。0 は失敗、1 は合格です。主な指標は次のとおりです。

```
utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)
```

`utilityLift ≥ 5%` のとき、スキルは合格します。しきい値未満では、改善幅が小さい場合は警告、改善がない場合は失敗になります。判定には、採点可能なタスクが少なくとも 5 つ必要です。

---

## `.agents/eval/<skill>/` の規約

タスクフィクスチャは `.agents/eval/<skill>/` に置きます。このパスは `.agents/` の中にありますが、スキルディレクトリ自体の外にあるため、`oma update` でユーザーが作成した評価が上書きされません。

```
.agents/eval/
└── oma-scholar/
    ├── claims-only.yaml        ← task fixture
    ├── entity-lookup.yaml
    ├── partial-fetch.yaml
    ├── structured-output.yaml
    ├── edge-empty-response.yaml
    └── _rollouts/
        └── a3f1b2c4d5e6f7a8.json   ← recorded arm outputs + judge verdicts
```

`_` で始まるファイルはタスクフィクスチャを読み込むときにスキップされます。`_rollouts/` サブディレクトリには、過去の `--live --record` 実行で記録した出力があります。

## タスクフィクスチャのスキーマ

各フィクスチャは、次のフィールドを持つ YAML ファイルです。

```yaml
id: claims-only
skill: oma-scholar
domain: research
prompt: "Fetch claims-only for knows:generated/reconvla/1.0.0"
checker:
  type: judge
  rubric: "Does the answer fetch ONLY the claims via the section=statements partial fetch?"
weight: 1
```

| フィールド | 必須 | 説明 |
|:------|:---------|:-----------|
| `id` | はい | このタスクの一意な識別子。ロールアウトのファイル名とレポートで使います。 |
| `skill` | はい | 評価するスキル。親ディレクトリ名と一致します。 |
| `domain` | はい | ドメインのラベル。グループ化と、負の転移の近隣タスクの選択に使います。 |
| `prompt` | はい | 両方の実験群へディスパッチするタスクプロンプト。 |
| `checker` | いいえ | 実験群の出力を採点する方法。省略時は `{ type: judge }`。 |
| `weight` | はい | 加重平均スコアでの相対的な重み。タスクの重要度が同じなら `1` を使います。 |
| `group` | いいえ | ファミリーのラベル。`oma skill optimize` は、同じグループを共有するフィクスチャを学習・検証・最終テストの同じ分割に保ちます。ほぼ重複するタスクが分割をまたいで漏れるのを防ぐためです。 |

### チェッカーの種類

#### judge（デフォルト）

LLM がルーブリックに従って実験群の出力を評価し、PASS または FAIL を返します。`checker` を省略した場合、または `checker.type` がない場合のデフォルトです。

```yaml
checker:
  type: judge
  rubric: "Does the answer correctly cite the source and avoid hallucination?"
```

`rubric` は任意です。省略すると「回答はタスクプロンプトを正確かつ完全に満たしているか」というデフォルトルーブリックを使います。

簡潔にするため、ルーブリックをトップレベルに書くこともできます。

```yaml
id: minimal-fixture
skill: oma-scholar
domain: research
prompt: "What are the main claims in paper X?"
rubric: "Does the answer enumerate the main claims without adding fabricated ones?"
weight: 1
```

**注意：** `--mock` モードでは、judge タスクに `_rollouts/` の以前の記録済み判定が必要です。タスクの記録済み判定がない場合、そのタスクは警告付きでレポートから除外されます。まず `--live --record` でロールアウトを作成します。

このルールは、どのチェッカー種別でも一方の実験群が完全に欠けている場合に適用されます。タスクは 0 点として採点せず、除外します。データがないことは失敗した回答ではありません。採点すると両方が 0 になり、改善幅 0 が `decision: "fail"` と解釈されるためです。除外によって採点数が `MIN_TASKS` 未満になると、`coverage: "insufficient"` と表示されます。

#### assert（オプトイン）

出力に特定の部分文字列が含まれるかを決定的に確認します。期待する出力が厳密な契約や形式である場合、ツール呼び出しの検証に使います。

```yaml
checker:
  type: assert
  expect_contains:
    - "section=statements"
    - "partial_fetch=true"
```

`expect_contains` のすべての文字列が実験群の出力に含まれていれば合格です。

#### regex（オプトイン）

決定的な正規表現チェックです。完全一致ではなくパターンが必要な場合に使います。

```yaml
checker:
  type: regex
  pattern: "section=\\w+"
```

200 文字を超えるパターンは 0 点です（ReDoS 対策）。照合前に出力を 10,000 文字へ切り詰めます。

## 実行モード

### `--mock`（デフォルト）

`_rollouts/` に記録されたロールアウトを再生します。完全に決定的でオフラインです。LLM は呼び出しません。

- `assert`／`regex` チェッカーでは、記録済みの出力文字列からスコアを計算します。
- `judge` チェッカーでは、`--live --record` が記録した `score` フィールドを再生します。

judge タスクに `_rollouts/` の記録済みスコアがなければ、コンソール警告を出してレポートから除外します。これにより mock モードは厳密にオフラインになります。

使用前に記録が古くないかも確認します。スキル本文、プロンプト、タスク／チェッカーの契約、適用される judge ルーブリック、評価器プロトコルのリビジョンのいずれかが変わると、影響を受けるエントリは無効になります。出所情報がないエントリも、ファイル名と件数を示す警告とともに破棄されます。採点可能なタスクが `MIN_TASKS` 未満になった場合、判定ではなく `coverage: "insufficient"` を報告します。

:::note `oma skill optimize --mock`
最適化では候補の `SKILL.md` 本文を採点します。記録は作成時の本文に対してだけ有効なので、候補本文には一致するロールアウトがなく、未カバーとして報告されます。候補を採点するには `--live` を使います。
:::

CI でも安全に使えます。`OMA_SKILLEVAL_MOCK=1` を設定すると、このモードを強制します。

```bash
oma skill eval --skill oma-scholar
```

### `--live`

`oma agent spawn --read-only` で実際のエージェント実験群を起動します。各タスクの実験群はそれぞれ専用の一時ワークスペースで実行されるため、一方の実験群が生成したファイルが他方に影響することはありません。プロセスの失敗、API のエラーエンベロープ、judge の失敗があると、そのペア比較全体が採点と記録の対象から除外されます。部分的な出力は診断データとして扱われます。

ディスパッチ前に、タスク数、実験群のディスパッチ数、judge のディスパッチ数、判定されたベンダーを含むコストプレビューを表示します。`y` で確認するか、`--yes` で省略します。

以下の制御は CI とカバレッジ調査に便利です。

| オプション | 効果 |
| --- | --- |
| `--task-dir <path>` | `.agents/eval/<skill>` 以外のディレクトリからフィクスチャを評価します。 |
| `--max-tasks <n>` | ライブ実行で評価するフィクスチャ数に上限を設けます。 |
| `--trials <n>` | すべての実験群を `n` 回繰り返します（1〜10）。先に開始する実験群は試行ごとに交互に入れ替わり、タスクごとのスコアは平均され、レポートにはタスク内分散が加わります。`--neg-transfer` の近隣タスクは 1 回だけ実行されます。 |
| `--neg-transfer` | 同じドメインにある他のスキルのタスクで、候補スキルを測定します。デフォルトは無効です。 |
| `--routing` | 起動（activation）を測定します。各タスクについて、すべてのスキルの `description` を前提に、どのインストール済みスキルが読み込まれるかを尋ねます。ライブでは実測し（タスクごとに追加のディスパッチが 1 回）、モックでは同じカタログで作成したルーティングの記録を再生します。 |
| `--require-coverage` | 採点可能なペアタスクが 5 未満になった場合、または要求した負の転移チェックが不完全な場合に、終了コードを 0 以外にします。 |

```bash
# Preview and confirm
oma skill eval --skill oma-scholar --live

# Skip confirmation
oma skill eval --skill oma-scholar --live --yes
```

#### 負の転移の測定

`--neg-transfer` を指定すると、選択した各近隣タスクが 2 回実行されます。まず候補を含まない新しいベースライン、次に候補本文をそのまま注入した処置群です。近隣タスクとは、同じ `domain` にある他のスキルのタスクを指します。同じドメインを共有する他のスキルがない場合は、代わりに、他のスキルに分散させた上限付きのドメイン横断サンプル（最大 6 タスク）を使い、`negativeTransferCoverage.scope` は `cross-domain` を報告します。この代替は、注入された本文による干渉が自身のドメインに限られず、ドメインが一意だからといってチェックが不可能になってはならないためです。どちらの実験群も、同じ評価器と、別々の空のワークスペースを使います。差分（delta）は処置群のスコアからベースラインのスコアを引いた値で、負の値は候補がその近隣タスクに悪影響を与えたことを意味します。ライブのプレビューには、これらの追加の実験群と judge のディスパッチが含まれます。`--max-tasks` は近隣サンプルにも上限を設け、タスクが省かれる場合は警告を表示します。

候補固有の比較を `.agents/eval/<candidate>/_negative-transfer/<neighbor>/<body-hash>/_rollouts/` に保存するには、`--live --neg-transfer --record` を使います。モック再生には、候補の識別情報、本文のハッシュ、タスク／チェッカー全体のハッシュ、両方の実験群で共通の比較 ID が一致している必要があります。近隣タスクの通常の評価記録で、この測定を代用することはできません。

各 `negativeTransfer` エントリは `trials`（`delta` の元になったペア比較の数）を持ちます。最適化では、候補を却下する前に、回帰した近隣タスクを 1 回再測定し、`confirmed` を追加します（再測定でも回帰した場合は `true`、回帰しなかった場合は `false`）。`oma skill eval --neg-transfer` は 1 回の比較だけを報告します。レポートには、`status`、`expected`、`scored` を持つ `negativeTransferCoverage` が含まれます。`status` は、フラグがない場合は `not-requested`、選択した近隣タスクすべてに有効なペア結果があり、サンプルが空でない場合は `measured`、近隣タスクが 0 件の場合や比較が 1 つでも欠けている場合は `insufficient` です。`negativeTransfer` 配列が空でも、回帰がないことの証拠にはなりません。要求した負の転移のカバレッジが不十分な場合、JSON の `ok` は false になります。

#### スキルの隔離（ベースラインを正しく保つ） {#skill-isolation-keeping-the-baseline-honest}

`utilityLift` は、**ベースライン実験群が対象スキルなしで実行される場合だけ**意味があります。ディスパッチされたエージェントはランタイムにインストールされた全スキルを自動ロードするため、単純なベースラインでも測定対象のスキルを読み込むことがあります。これでは比較が汚染され、ベースラインと処置群がほぼ同じになり、改善幅がほぼ 0 になります。

これを防ぐため、`--live` は**両方の実験群を別々の一時ワークスペース**で実行します。保護された Claude と Codex のプロファイルは、スキルと指示の自動検出、およびエージェントツールを無効にします。処置群は、注入された `SKILL.md` **だけ**を通じて対象スキルを受け取ります。探索用のプロファイルは、対象を除いたフィルタ済みの skills ディレクトリを使いますが、それだけでは隔離が保たれた証明にはなりません。

クリーンな作業ディレクトリは、プロジェクトローカルのスキル検出を隠せます。ただし、ランタイムの隔離はベンダーのプロファイルにも左右されます。レポートの `isolation` フィールドには、検証された隔離の水準が示されます。

| 状態 | 意味 |
|---|---|
| `enforced` | 対象 ID が有効で HOME にコピーがない、保護された Claude。または、検出とツールの抑止およびランタイムのスレッド検査を備えたネイティブ Codex。ランタイム契約に失敗するとディスパッチを中止する。 |
| `best-effort` | 保護されたテキストプロファイルを持たないランタイム、無効な対象 ID、Claude の HOME のコピーのいずれか。隔離は検証されない。 |
| `unavailable` | HOME ベースのベンダー（例: `~/.gemini/antigravity-cli/skills` を読む **antigravity**）。クリーンな cwd では隠せない。警告を表示し、結果を低信頼度として扱う。 |
| `n/a` | モックモード。ライブのディスパッチはありません。 |

他のランタイムプロファイルも探索的な評価には使えますが、`best-effort` と `unavailable` の結果は、ライブ最適化の昇格をブロックします。評価ベンダーはプロジェクトのモデル設定に従います。Codex は、ネイティブの CLI ログインと設定済みのモデル／プロバイダーを `app-server` 経由で使い、黙って Claude や API キーのクライアントへ切り替えることはありません。保護された Codex の契約は、macOS/Linux 上の CLI 0.154.x で、ネイティブのファイル認証情報ストレージと既存の `auth.json` を使う構成を対象とします。専用の一時的な設定ホームが、元の設定ファイルと認証ファイルを参照しつつ、共有のブートストラップ状態は除外します。認証情報はコピーされず、ネイティブのリフレッシュは元の認証ファイルを使います。keyring、auto、ephemeral の認証情報ストアは、現時点では未対応です。未対応のバージョン、ストレージモード、契約の失敗は、ディスパッチエラーになります。

judge は、最適化メモリを無効にした新しい一時ディレクトリで実行されます。Claude と Codex の judge は、評価の実験群と同じ保護されたテキストトランスポートを使います。judge のベンダー設定は、その実行中は固定されます。

### `--live --record`

ライブ実験群を実行し、取得した出力（judge チェッカーのタスクでは判定も含む）を `_rollouts/<hash>.json` に書き込みます。ファイル名はタスク ID セットの決定的な SHA-256 ハッシュです。日付や乱数は使いません。

自分の環境で `--mock` 実行用の記録を作成すると、繰り返しをオフラインに保てます。

各エントリには出所情報があり、後の再生で適用できるか判断できます。

| フィールド | 記録する場所 | 比較対象 |
|---|---|---|
| `skillBodyHash` | `treatment` のみ（処置群） | 評価対象の SKILL.md 本文 |
| `promptHash` | 両方の実験群 | フィクスチャの現在の `prompt` |
| `taskHash` | 両方の実験群 | タスク全体、適用されるチェッカーまたはデフォルトの judge ルーブリック、`SKILL_EVAL_PROTOCOL_REVISION` |
| `trial` | 両方の実験群（`--trials` が 1 より大きい場合） | 1 回の繰り返しのベースラインと処置群を対応付ける。単一の試行では存在しない |
| `judgeResponse` | judge タスク | judge の判定テキスト（エンベロープを展開済み、長さに上限あり）。保存された `score` を監査できるように残す |

実験群の出力は、回答テキストとして記録されます。ベンダー CLI が JSON の結果エンベロープを返す場合は、`result` フィールドを保存して採点します。エンベロープの管理用データが `assert`／`regex` チェッカーに照合されることも、judge のパーサーに読まれることもありません。

ベースラインはスキルを外すため、`SKILL.md` を編集しただけでは、その記録は無効になりません。タスクまたは評価器の契約が変わると、両方の実験群が無効になります。ライブ記録では両方の実験群を再実行します。

タスクと評価器の出所情報が完全に揃う前の記録は、`--live --record`（近隣の比較には `--neg-transfer` も）で再生成する必要があります。古いスコアに新しいハッシュを追加しても、検証はできません。同じ契約が最適化スイートの識別情報にも使われるため、スイート単位の既存の知識は、更新後の契約では再利用されません。採点器の動作、judge のプロンプトや判定のパース、その他の暗黙の評価器の動作が変わったときは、`SKILL_EVAL_PROTOCOL_REVISION` を上げて維持してください。

:::caution `_rollouts/` はローカル専用。コミットしないでください
記録が再生されるのは、作成時と完全に同じ `SKILL.md` 本文に対してだけです。スキルを編集すると処置群の記録は次の `--mock` 実行で破棄され、リポジトリを取得した人に警告が出ます。ディレクトリは gitignore 済みなので、ローカルで記録してください。
:::

```bash
oma skill eval --skill oma-scholar --live --record --yes
```

ライブ実行が成功すると、レポートにはベースラインと処置群の件数、`utilityLift`、`coverage: "ok"`、隔離状態、`pass`／`warn`／`fail` の判定が含まれます。後のモック実行は、タスクプロンプトと処置群のスキル本文が一致する記録だけを再利用します。

---

### 並行実行とディスパッチのタイムアウト

ライブの実験群、近隣の実験群、judge の呼び出し、ルーティングのプローブは、`OMA_SKILL_EVAL_CONCURRENCY` 個のサブプロセスからなる上限付きプール（デフォルト 4、最大 16）で実行されます。1 回の試行の 2 つの実験群は、常に別々の空のディレクトリで一緒に実行され、先に開始する実験群は試行ごとに交互に入れ替わります。結果はタスクの順序を保つため、記録とスコアは直列実行と同じになります。直列化するには、この変数を 1 に設定します。

ライブの各実験群と judge の呼び出しは、`OMA_SKILL_EVAL_TIMEOUT_MS`（デフォルト 180000）が経過すると強制終了されます。タイムアウトしたディスパッチは、タスクがレポートから除外される前に 1 回だけ再試行されます。1 回の遅い応答は回答ではなく、トランスポートの失敗だからです。2 回続けてタイムアウトすると、そのタスクは除外されます（最適化では、その分割のカバレッジ判定が失敗します）。長い回答が正当に必要なフィクスチャでは、この上限を引き上げてください。

## ルーティング：スキルは選択されるか

効用の改善幅が測るのは、本文が読み込まれた後の働きです。スキルを読み込むかどうかは、ベンダーが frontmatter の `description` から判断するため、より良い本文でも選ばれなければ改善とは言えません。`--routing` は、各タスクのプロンプトを、インストール済みのすべてのスキルの名前と説明とともに、同じ保護されたモデルへ送り、読み込むスキルを 1 つだけ（または `NONE`）答えさせます。対象のスキルが選ばれれば起動（activation）、別のスキルが選ばれれば誤ルーティング、`NONE` なら未選択（miss）です。

```text
  routing: measured  activated 5/6 (83%)  misrouted 1 [oma-docs×1]  none 0  unparsed 0  catalog 33
```

JSON レポートには、`status`、件数、`activationRate`、`misroutedTo`、`catalogSize` を持つ `routing` が含まれます。`findings` の各エントリには `routing: target | other | none | unparsed` が付きます。`--record` を付けると、選択結果はカタログのハッシュとともに `_rollouts/<hash>.routing.json` に保存されます。後の `--mock --routing` は、すべての説明とタスクが変わっていない間だけそれらを再生します。変わっていれば `status` は `stale` になり、何もカウントされません。

これは、保護されたトランスポートを通じて、カタログに対する `description` の働きを測ります。ベンダー独自の検出の仕組みは働かせません。保護されたプロファイルが意図的に無効にしているためです。また、読み込まれたスキルの手順が守られるかどうかも測定しません。それは効用の測定の役割です。

## 最小限の動作するフィクスチャセット

判定には 5 個のフィクスチャ（`MIN_TASKS = 5`）が必要です。架空の `oma-scholar` スキル用の最小セットを示します。

```yaml
# .agents/eval/oma-scholar/claims-only.yaml
id: claims-only
skill: oma-scholar
domain: research
prompt: "Fetch claims-only for knows:generated/reconvla/1.0.0"
rubric: "Does the answer fetch ONLY the claims via the section=statements partial fetch?"
weight: 1
```

```yaml
# .agents/eval/oma-scholar/entity-lookup.yaml
id: entity-lookup
skill: oma-scholar
domain: research
prompt: "Look up the entity knows:concept/attention-mechanism"
rubric: "Does the answer return the entity name, description, and at least one related concept?"
weight: 1
```

少なくとも 3 つのタスクを追加してから実行します。

```bash
# Seed rollouts (local only — re-run after any SKILL.md edit)
oma skill eval --skill oma-scholar --live --record --yes

# Offline replay
oma skill eval --skill oma-scholar --json
```

---

## レポートを読む

**テキスト出力：**

```
Skill utility eval  (skill: oma-scholar)
  tasks: 7
  isolation: enforced [claude]

  baseline: 42.9%  treatment: 71.4%
  utilityLift: 28.6%  (stddev: 14.3%)
  [PASS]
  Skill shows positive utility lift >= 5%.

  Per-task findings:
    claims-only: baseline=0 treatment=1 lift=+1.000
    entity-lookup: baseline=1 treatment=1 lift=+0.000
    ...

  Thresholds: fail <= 0%, warn < 5%
```

**JSON 出力**（`--json`）：

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "taskCount": 7,
  "coverage": "ok",
  "decision": "pass",
  "baselineScore": 0.4286,
  "treatmentScore": 0.7143,
  "utilityLift": 0.2857,
  "utilityStdDev": 0.1429,
  "repeatability": {
    "trials": 1,
    "liftCi95": { "lower": 0.0918, "upper": 0.4796 },
    "withinTaskStdDev": null,
    "status": "single-trial"
  },
  "findings": [
    { "taskId": "claims-only", "baseline": 0, "treatment": 1, "lift": 1.0, "trials": 1, "liftStdDev": 0, "routing": "target" }
  ],
  "usage": { "status": "actual", "dispatches": 14, "inputTokens": 61234, "outputTokens": 9876, "costUsd": 0.8123, "judge": { "status": "actual", "dispatches": 6, "inputTokens": 12000, "outputTokens": 30, "costUsd": 0.1401 } },
  "routing": { "status": "measured", "measured": 7, "activated": 6, "misrouted": 1, "none": 0, "unparsed": 0, "activationRate": 0.8571, "misroutedTo": { "oma-search": 1 }, "catalogSize": 33 },
  "negativeTransfer": [],
  "negativeTransferCoverage": { "status": "not-requested", "expected": 0, "scored": 0 },
  "isolation": "enforced",
  "isolationVendor": "claude"
}
```

`usage` は、採点した実験群についてベンダーが報告した内容と、それとは別に judge 呼び出しについて報告した内容を合計します。ディスパッチ数、入力トークンと出力トークン（キャッシュの読み取りと書き込みを含む）、USD のコストです。`status` は、すべてのディスパッチが使用量を報告した場合は `actual`、一部が報告しなかった場合は `partial`、どれも報告しなかった場合は `unknown` になります（Codex ブリッジのようなテキストのみのトランスポートは、何も報告しません）。記録済みのロールアウトはエントリごとに `usage` と `judgeUsage` を持つため、モック再生では、ゼロではなく、再利用する記録のコストが報告されます。

`repeatability` は、タスク間のばらつきと、再実行によるばらつきを分けます。`liftCi95` は、タスクごとの改善幅に対する、対応のある 95% t 区間です（採点されたタスクが 2 つ未満の場合は null）。`--trials` が 2 以上のとき、`withinTaskStdDev` は、試行ごとの改善幅について、タスクごとの標準偏差を平均した値です。`status` が `stable` になるのは、区間が改善幅と同じ符号の側でゼロを含まない場合だけで、そうでなければ `unstable` になり、`pass` は `warn` に格下げされます。単一試行の実行は `single-trial` を報告します。改善幅は示せても、その改善幅が繰り返し得られることは示せません。

`ok` が `true` になるのは、`coverage === "ok"` かつ `decision === "pass"` で、要求した負の転移チェックがあればそのカバレッジが十分な場合だけです。`isolation` フィールドは、ベースライン実験群が対象スキルなしで実際に実行されたかを示します。[スキルの隔離](#skill-isolation-keeping-the-baseline-honest)を参照してください。`--mock` モードでは `isolation` は `"n/a"` です。

## CI への統合

```bash
# Fail the build if the skill regresses or has insufficient coverage
oma skill eval --skill oma-scholar --json --require-coverage
```

終了コード：
- `0` の場合は `pass` または `warn` です。
- `1` の場合は `fail`、または `--require-coverage` 使用時のタスクまたは負の転移のカバレッジ不足です。

## `live` と `mock` の選び方

オープンエンドのタスクで実際の効用を測るには、judge チェッカーと `--live` を使います。以前記録した judge 判定をオフラインで再生する場合、または決定的な `assert`／`regex` 契約チェックを行う場合は `--mock` を使います。

`--live --record` の実行中に judge の二値判定（PASS／FAIL）をロールアウトエントリへ記録し、後の `--mock` 実行で記録済みのスコアを再生するため、モックの決定性が保たれます。LLM を再度呼び出しません。

**データ送信：** `--live` では、judge が候補実験群の出力を設定されたベンダーへ送って採点します。各ライブ実行の開始時に 1 回限りの警告を表示します。

モック実行でカバレッジ不足が出た場合は、破棄または欠落した `_rollouts` エントリの警告を確認し、フィクスチャまたはスキルを修正してからライブ記録を行います。ライブでの昇格には、動作する保護された Claude または Codex のプロファイルと `isolation: "enforced"` が必要です。他のプロファイルは探索用のままです。

## スキルと一緒に評価タスクを配布する

スキルは `.agents/eval/<skill>/` にフィクスチャを置くことで評価タスクセットを含められます。これはスキルディレクトリ外のユーザー作成ファイルなので、`oma update` 後も残ります。`oma-skill-creation` で新しいスキルを作る場合は、将来の作成者がスキルの効果を確認できるよう、対応する `eval/` フィクスチャセットを追加します。スキル作成のワークフローは `.agents/skills/oma-skill-creation/SKILL.md` を参照してください。
