---
title: "ガイド：エージェントごとのモデル設定"
description: oma-config.yamlのmodel_presetを通じて、各エージェントが使用するAIモデルを設定します。組み込みプリセット、エージェント単位のオーバーライド、インラインモデル定義、extendsを使ったカスタムプリセット、oma doctor --profile、レガシーagent_cli_mappingからの移行までをカバーします。
---

# ガイド：エージェントごとのモデル設定

## 概要

`model_preset`は、すべてのエージェントが使用するモデルを制御する単一のコンセプトです。組み込みプリセットから1つを選ぶだけで、すべてのエージェント（pm、backend、frontend、qaなど）が、そのベンダースタックに適したモデルへ接続されます。必要に応じて個別のエージェントをオーバーライドし、チームが標準外の組み合わせを採用している場合は追加のプリセットを定義できます。

すべての設定は1つのファイル（`.agents/oma-config.yaml`）に集約されます。

このページでは次の内容を扱います。

1. 組み込みプリセット
2. `agents:`マップによる個別エージェントのオーバーライド
3. `models:`によるカスタムモデルslugのインライン定義
4. `custom_presets:`と`extends:`によるカスタムプリセット定義
5. `oma doctor --profile`による解決済み設定の確認
6. レガシー`agent_cli_mapping`からの移行

---

## 組み込みプリセット

`model_preset`に、組み込みキーのうち1つを設定します。

```yaml
# .agents/oma-config.yaml
language: en
model_preset: antigravity
```

| キー | 説明 | 推奨ユースケース |
|:----|:-----------|:---------|
| `antigravity` | すべてのエージェントがAntigravity CLI（`agy`）を使用。実装・アーキテクチャにはGemini 3.1 Pro、orchestrationと検索にはGemini 3.5 Flashを採用。モデル選択は`agy`内部の設定により制御されるため、`--model`や`--thinking-budget`フラグは公開されていません。 | Antigravity CLIユーザー |
| `claude` | すべてのエージェントがClaude（Sonnet/Opus）を使用 | Claude Maxサブスクリプション利用者 |
| `codex` | すべてのエージェントがOpenAI Codex（GPT-5.x）をeffortレベル付きで使用 | ChatGPT Plus/Proユーザー |
| `gemini` | すべてのエージェントがGemini CLIを使用し、実装ロールでthinkingを有効化 | Google AI Proユーザー |
| `qwen` | すべてのエージェントがQwen Code経由で外部ルーティング、バイナリthinking（effortレベルなし） | ローカル/セルフホスト推論 |
| `cursor` | すべてのエージェントが Cursor `composer-2.5` を使用（orchestrator/qa/pm/docs/explore は `composer-2.5-fast`） | Cursor Pro / Pro Student ユーザー |
| `mixed` | 混在構成：実装ロールはCodex、architecture/qa/pmはClaude、exploreはGemini | エージェントごとの設定を管理せずに、各ベンダーの強みを活用 |

組み込みプリセットはCLIパッケージに同梱されており、`oh-my-agent`をアップグレードすると自動的に更新されます。ローカルで保守するファイルはありません。

---

## 個別エージェントのオーバーライド

`agents:`マップを使うと、有効なプリセットの上に特定のエージェントだけオーバーライドできます。影響を受けるのはリストに記載したエージェントのみで、その他はプリセットのデフォルト値が維持されます。

```yaml
# .agents/oma-config.yaml
language: en
model_preset: antigravity

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

各エントリは`AgentSpec`オブジェクトです。

| フィールド | 型 | 必須 | 説明 |
|:------|:-----|:---------|:-----------|
| `model` | string | はい | モデルslug（組み込みまたはユーザー定義） |
| `effort` | `low` \| `medium` \| `high` | いいえ | 推論effort（サポートしないモデルでは無視） |
| `thinking` | boolean | いいえ | 拡張thinkingを有効化（モデル依存） |
| `memory` | `user` \| `project` \| `local` | いいえ | エージェントのメモリスコープ |

有効なエージェントID：`orchestrator`、`architecture`、`qa`、`pm`、`backend`、`frontend`、`mobile`、`db`、`debug`、`tf-infra`、`explore`。

マージは浅いマージです。オーバーライド側の各フィールドは、そのフィールドのプリセット値を置き換えます。省略したフィールドはプリセット値のまま維持されます。

---

## モデルslugのインライン定義

組み込みレジストリにまだ含まれていないモデルslugは、`models:`の下に登録します。登録後は、`agents:`や`custom_presets:`の任意の場所でそのslugを使用できます。

```yaml
# .agents/oma-config.yaml
models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports:
      native_dispatch_from: [gemini]
      thinking: true
```

> ユーザー定義のslugが組み込みのslugと衝突した場合、ユーザー定義側が優先され、警告が出力されます。

---

## カスタムプリセット

`custom_presets:`に追加のプリセットを定義します。`extends:`を使うと、組み込みプリセットからすべてのエージェントデフォルトを継承し、必要なエージェントのみをオーバーライドできます。

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude              # ベースプリセット（部分マージ）
    description: "Team A — sonnet base, codex for implementation"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }
      # その他のエージェントはすべてclaudeから継承
```

`extends:`を指定しない場合、11個のエージェントロール全てに対して`agent_defaults`を提供する必要があります。`extends:`を指定した場合は、リストに記載したエントリのみがオーバーライドされ、残りはベースプリセットから継承されます。

---

## `oma doctor --profile`

`oma doctor --profile`を実行すると、プリセットのデフォルト、`custom_presets`、`agents:`オーバーライドがマージされた後の、完全に解決済みのモデルマトリクスを確認できます。

```bash
oma doctor --profile
```

**出力例：**

```
oh-my-agent — Profile Health (preset=mixed)

┌──────────────┬──────────────────────────────┬──────────┬──────────────────┬──────────┐
│ Role         │ Model                        │ CLI      │ Auth Status      │ Source   │
├──────────────┼──────────────────────────────┼──────────┼──────────────────┼──────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ architecture │ anthropic/claude-opus-4-7    │ claude   │ ✓ logged in      │ (preset) │
│ qa           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ backend      │ openai/gpt-5.5         │ codex    │ ✗ not logged in  │ (override)│
│ explore    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┴──────────┘
```

各行には、解決済みのモデルslugと、それを適用したソース（`(preset)`または`(override)`）が表示されます。サブエージェントが想定外のベンダーを選択した場合は、このコマンドを使ってください。

---

## レガシー`agent_cli_mapping`からの移行

Migration 008は`oma install`および`oma update`の実行時に自動で起動し、レガシープロジェクトをその場で変換します。

| レガシー設定 | Migration 008適用後の結果 |
|:-------------|:--------------------------|
| 全エントリが同一ベンダー（例：すべて`gemini`） | `model_preset: gemini`、`agents:`なし |
| ベンダー混在 | 最頻ベンダーを`model_preset`に、それ以外を`agents:`オーバーライドへ |
| `AgentSpec`オブジェクト値 | そのまま`agents:`へ移動 |
| `models.yaml`の内容 | `oma-config.yaml.models`にインライン化 |
| カスタマイズ済みの`defaults.yaml` | `custom_presets.user-customized`として警告付きで保持 |

オリジナルファイルは変更前に`.agents/.backup-pre-008-{timestamp}/`へバックアップされます。マイグレーションは冪等であり、`model_preset`がすでに存在する場合はスキップされます。

マイグレーション完了後、`.agents/config/defaults.yaml`、`.agents/config/models.yaml`、および`.agents/config/`ディレクトリは削除されます。

---

## セッションクォータ上限

`session.quota_cap`は変更されていません。サブエージェントの暴走的なスポーンを抑制するには、`oma-config.yaml`に追加してください。

```yaml
session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

上限に達すると、orchestratorはそれ以上のスポーンを拒否し、`QUOTA_EXCEEDED`ステータスを返します。

---

## フル設定例

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports: { native_dispatch_from: [gemini], thinking: true }

custom_presets:
  my-team:
    extends: claude
    description: "Sonnet base, Codex for backend/db"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
```

`oma doctor --profile`を実行して解決結果を確認したうえで、通常通りワークフローを開始してください。

---

## OpenCodeを介したディスパッチ

[OpenCode](https://opencode.ai)は拡張クラスのベンダーです。piと同様にモデルのオーナーではなく、自身のカタログからモデルを実行するCLIであり、無料の`opencode`プロバイダー、低コストの`opencode-go`サブスクリプションプラン、`opencode-zen`ゲートウェイを提供します。omaはこれを**インプロセスプラグインベンダー**として統合します。opencodeは設定ファイルのフックを登録する代わりに`.opencode/plugins/oma/`を自動ロードし、各エージェントのペルソナを生成済みの`.opencode/agents/<id>.md`ファイルから解決します。

### 明示的なディスパッチ

`-m opencode`オーバーライドで、任意のエージェントをopencode経由でルーティングします。

```bash
oma agent:spawn pm "Draft the rollout plan" <session> -m opencode
```

これは`opencode run --agent pm --dir <workspace> "<prompt>"`を実行します。プロンプトは**末尾の位置引数**です。opencodeの`-p`フラグはプロンプトではなく`--password`を意味します。

### エージェントごとのOpenCodeモデル

特定のエージェントをopencodeモデルへルーティングするには、`models:`の下にモデルを登録し、`agents:`から参照します。2つの要件が適用されます（[モデルslugのインライン定義](#inlining-model-slugs)を参照）。

1. **slugは`owner/model`形式でなければなりません。** opencodeの`provider/model` slugをレジストリキーとして使用してください。素の名前は`agents.<id>.model`スキーマによって拒否されます。
2. **仕様は完全でなければなりません。** `cli`、`cli_model`、`auth_hint`、およびすべての`supports`ブール値が必要です。不完全な仕様はバリデーションに失敗し、サイレントにコアレジストリへフォールバックします（そのためエージェントはopencodeへルーティングされません）。

```yaml
# .agents/oma-config.yaml
language: en
model_preset: claude          # heavier impl roles stay on Claude

models:
  opencode-go/deepseek-v4-flash:
    cli: opencode
    cli_model: opencode-go/deepseek-v4-flash
    auth_hint: "OpenCode Go subscription — run: opencode auth login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [opencode]
      api_only: false

agents:
  pm:      { model: opencode-go/deepseek-v4-flash }
  qa:      { model: opencode-go/deepseek-v4-flash }
  docs:    { model: opencode-go/deepseek-v4-flash }
  explore: { model: opencode-go/deepseek-v4-flash }
```

ルーティングされた各エージェントは`opencode run -m opencode-go/deepseek-v4-flash --agent <id> --dir <workspace> "<prompt>"`をディスパッチします。これは軽量で高速なロール（pm、qa、docs、explore）に適しており、より重い実装エージェントはCodex/Claudeなどに残せます。

### モデルslugの検証

opencodeのカタログはサブスクリプションおよびログインによってゲートされるため、omaはopencodeのモデルslugをハードコード**しません**。インストール済みカタログに対して検証してください。

```bash
oma model:probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```

`oma model:probe`は、slugが`opencode models`によって列挙されている場合は`accepted`を、列挙されていない場合は`rejected`を、プロバイダーがログインまたはサブスクリプションを必要とする場合は`auth_required`を報告します。

### 認証と生成ファイル

- **認証：** `opencode auth login`は資格情報を`~/.local/share/opencode/auth.json`に保存します。`oma auth:status` / `oma doctor`は、他のCLIと並べてopencodeの認証を報告します（ベンダーレベルでのデフォルトのプロバイダーチェック：`opencode-go`）。一方、`oma doctor --profile`はプロバイダーを区別し、各行を登録済み`cli_model`のプロバイダー接頭辞で確認します。そのため`cli_model: zai-coding-plan/glm-5.3`のモデルは`zai-coding-plan`の資格情報で確認されます。登録済みの`provider/model`形式の`cli_model`を持たない行は、認証失敗と断定せず`? unknown`と報告します。
- **生成ファイル：** `oma link`（または`oma link opencode`）は、エージェントごとに1つの`.opencode/agents/<id>.md`ペルソナと、`.opencode/plugins/oma/`ブリッジを書き出します。これらは`.agents/` SSOTから生成されるため、直接編集せず、`oma link`を再実行して再生成してください。

> **永続ワークフローに関する注意：** opencodeの`session.idle`イベント（Claudeの`Stop`フックに最も近い対応物）は通知専用であり、セッションの終了をブロックできません。そのため、永続ワークフロー（orchestrate / work / ultrawork）はopencode下では**Stopセマンティクスが低下した状態**で動作します。ワークフローの補強は、セッションを開いたまま保持するのではなく、次のメッセージ時に行われます。
