---
title: "CLIコマンド"
description: oh-my-agent CLIの全コマンド完全リファレンス — 構文、オプション、使用例をカテゴリ別に整理。
---

# CLIコマンド

グローバルインストール（`bun install --global oh-my-agent`）後、`oma`または`oh-my-ag`を使用。環境変数`OH_MY_AG_OUTPUT_FORMAT`を`json`に設定すると、対応コマンドで機械読み取り可能な出力を強制。

---

## セットアップとインストール

### oma（install）

引数なしでインタラクティブインストーラーを起動。

```bash
cd /path/to/my-project
oma
```

レガシーマイグレーション、競合ツール検出、プリセット選択、tarballダウンロード、スキルインストール、ベンダー適応、シンボリックリンク作成、git rerere、MCP設定を実行。

### doctor

```
oma doctor [--json] [--output <format>]
```

CLIインストール、認証、MCP設定、スキルステータスを検証。

### update

```
oma update [-f | --force] [--ci]
```

| フラグ | 説明 |
|:-----|:-----------|
| `-f, --force` | ユーザーカスタム設定を上書き |
| `--ci` | 非インタラクティブCIモード |

### setup（ワークフロー）

エージェントセッション内の`/setup`で、インストール済みインスタンスの対話型設定。

---

## モニタリングとメトリクス

### dashboard

```
oma dashboard
```

`.serena/memories/`を監視するリアルタイムターミナルダッシュボード。`MEMORIES_DIR`環境変数でパス変更可能。

### dashboard:web

```
oma dashboard:web
```

`http://localhost:9847`でWebダッシュボード起動。`DASHBOARD_PORT`でポート変更可能。

### stats

```
oma stats [--json] [--output <format>] [--reset]
```

セッション数、使用スキル、完了タスク、セッション時間、ファイル変更統計。`--reset`でリセット。

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| 引数/フラグ | 説明 |
|:---------|:-----------|
| `window` | 分析期間（`7d`、`2w`、`1m`） |
| `--interactive` | 手動入力モード |
| `--compare` | 前期間との比較 |

コミット、貢献者、コミット種別、ホットスポットを分析。

---

## エージェント管理

### agent:spawn

```
oma agent:spawn <agent-id> <prompt> <session-id> [-v <vendor>] [-w <workspace>]
```

| 引数 | 必須 | 説明 |
|:---------|:---------|:-----------|
| `agent-id` | はい | `backend`、`frontend`、`mobile`、`qa`、`debug`、`pm` |
| `prompt` | はい | タスク説明（テキストまたはファイルパス） |
| `session-id` | はい | セッションID |

| フラグ | 説明 |
|:-----|:-----------|
| `-v, --vendor` | CLIベンダーオーバーライド |
| `-w, --workspace` | 作業ディレクトリ |

### agent:status

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

ステータス値：`completed`、`running`、`crashed`。出力形式：`{agent-id}:{status}`（1行ごと）。

### agent:parallel

```
oma agent:parallel [tasks...] [-v <vendor>] [-i | --inline] [--no-wait]
```

YAML形式またはインライン（`agent:task[:workspace]`）でタスク指定。`--no-wait`でバックグラウンド実行。

---

## メモリ管理

### memory:init

```
oma memory:init [--json] [--output <format>] [--force]
```

`.serena/memories/`ディレクトリとスキーマファイルを初期化。

---

## 統合とユーティリティ

### auth:status

```
oma auth:status [--json] [--output <format>]
```

全CLI（Gemini、Claude、Codex、Qwen）の認証状態を確認。

### usage:anti

```
oma usage:anti [--json] [--output <format>] [--raw]
```

Antigravity IDEのモデル使用クォータを表示。

### bridge

```
oma bridge [url]
```

MCP stdioとStreamable HTTPトランスポート間のブリッジ。Antigravity IDEで必要。

### verify

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

ビルド成功、テスト結果、スコープ準拠を検証。

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

孤立PIDファイル、ログファイル、Gemini Antigravityディレクトリをクリーンアップ。

### visualize

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```

プロジェクト構造の依存関係グラフを生成。

### star

```
oma star
```

GitHubでoh-my-agentにスターを付ける。`gh` CLIが必要。

### describe

```
oma describe [command-path]
```

コマンドのJSON説明を出力。AIエージェントのイントロスペクション用。

### help / version

```
oma help
oma version
```

---

## 環境変数

| 変数 | 説明 | 使用コマンド |
|:---------|:-----------|:--------|
| `OH_MY_AG_OUTPUT_FORMAT` | `json`でJSON出力を強制 | 全`--json`対応コマンド |
| `DASHBOARD_PORT` | Webダッシュボードのポート | `dashboard:web` |
| `MEMORIES_DIR` | メモリディレクトリパスの上書き | `dashboard`、`dashboard:web` |

## エイリアス

| エイリアス | 正式コマンド |
|:------|:------------|
| `oma` | `oh-my-ag` |
| `viz` | `visualize` |
