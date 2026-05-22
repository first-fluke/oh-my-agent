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
| `cursor` | すべてのエージェントが Cursor `composer-2.5` を使用（orchestrator/qa/pm/docs/retrieval は `composer-2.5-fast`） | Cursor Pro / Pro Student ユーザー |
| `mixed` | 混在構成：実装ロールはCodex、architecture/qa/pmはClaude、retrievalはGemini | エージェントごとの設定を管理せずに、各ベンダーの強みを活用 |

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

有効なエージェントID：`orchestrator`、`architecture`、`qa`、`pm`、`backend`、`frontend`、`mobile`、`db`、`debug`、`tf-infra`、`retrieval`。

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
│ retrieval    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
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
