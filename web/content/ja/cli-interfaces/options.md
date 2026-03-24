---
title: "CLIオプション"
description: oh-my-agent CLIの全オプション網羅的リファレンス — グローバルフラグ、出力制御、コマンドごとのオプション、実践的な使用パターン。
---

# CLIオプション

## グローバルオプション

| フラグ | 説明 |
|:-----|:-----------|
| `-V, --version` | バージョン番号を出力して終了 |
| `-h, --help` | コマンドのヘルプを表示 |

すべてのサブコマンドも`-h, --help`で固有のヘルプテキストを表示。

---

## 出力オプション

### 1. --jsonフラグ

```bash
oma stats --json
oma doctor --json
```

対応コマンド：`doctor`、`stats`、`retro`、`cleanup`、`auth:status`、`usage:anti`、`memory:init`、`verify`、`visualize`。

### 2. --outputフラグ

```bash
oma stats --output json
oma doctor --output text
```

`text`または`json`を受け付け。無効な値は`Invalid output format`エラー。

### 3. OH_MY_AG_OUTPUT_FORMAT環境変数

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats    # JSON出力
```

**解決順序：** `--json` > `--output` > 環境変数 > `text`（デフォルト）。

---

## コマンドごとのオプション

### update

```
oma update [-f | --force] [--ci]
```

| フラグ | 説明 | デフォルト |
|:-----|:-----------|:--------|
| `--force` / `-f` | ユーザーカスタム設定を上書き。`user-preferences.yaml`、`mcp.json`、`stack/`が対象。 | `false` |
| `--ci` | 非インタラクティブCIモード。確認プロンプトスキップ、プレーンテキスト出力。 | `false` |

### stats

| フラグ | 説明 |
|:-----|:-----------|
| `--reset` | メトリクスデータをリセット |

### retro

| フラグ | 説明 |
|:-----|:-----------|
| `--interactive` | 手動データ入力モード |
| `--compare` | 前期間との比較表示 |

ウィンドウ形式：`7d`（7日）、`2w`（2週間）、`1m`（1ヶ月）。

### cleanup

| フラグ | 説明 |
|:-----|:-----------|
| `--dry-run` | プレビューのみ、変更なし |
| `--yes` / `-y` | 確認プロンプトをスキップ |

クリーンアップ対象：孤立PIDファイル（`/tmp/subagent-*.pid`）、孤立ログファイル、Gemini Antigravityディレクトリ。

### usage:anti

| フラグ | 説明 |
|:-----|:-----------|
| `--raw` | Antigravity IDEの生RPCレスポンスをダンプ |

### agent:spawn

| フラグ | 説明 | デフォルト |
|:-----|:-----------|:--------|
| `--vendor` / `-v` | CLIベンダーオーバーライド。`gemini`、`claude`、`codex`、`qwen`。 | 設定から解決 |
| `--workspace` / `-w` | エージェントの作業ディレクトリ。省略時はモノレポ設定から自動検出。 | 自動検出または`.` |

**バリデーション：** `agent-id`は`backend`/`frontend`/`mobile`/`qa`/`debug`/`pm`のいずれか。`session-id`に`..`、`?`、`#`、`%`、制御文字は使用不可。

**ベンダー固有の動作：**

| ベンダー | コマンド | 自動承認フラグ | プロンプトフラグ |
|:-------|:--------|:-----------------|:-----------|
| gemini | `gemini` | `--approval-mode=yolo` | `-p` |
| claude | `claude` | （なし） | `-p` |
| codex | `codex` | `--full-auto` | （位置引数） |
| qwen | `qwen` | `--yolo` | `-p` |

### agent:status

| フラグ | 説明 |
|:-----|:-----------|
| `--root` / `-r` | メモリファイルとPIDファイルのルートパス |

ステータス判定：`result-{agent}.md`存在→`completed`、PIDファイル存在+プロセス生存→`running`、それ以外→`crashed`。

### agent:parallel

| フラグ | 説明 |
|:-----|:-----------|
| `--vendor` / `-v` | 全エージェントに適用するベンダーオーバーライド |
| `--inline` / `-i` | `agent:task[:workspace]`形式のインラインタスク指定 |
| `--no-wait` | バックグラウンドモード |

インラインタスク形式：`backend:Implement auth API:./api`（最後のコロン区切りが`./`、`/`、`.`で始まればワークスペース）。

### memory:init

| フラグ | 説明 |
|:-----|:-----------|
| `--force` | 既存スキーマファイルを上書き |

### verify

| フラグ | 説明 |
|:-----|:-----------|
| `--workspace` / `-w` | 検証するワークスペースディレクトリ |

エージェントタイプ：`backend`、`frontend`、`mobile`、`qa`、`debug`、`pm`。

---

## 実践例

### CIパイプライン：更新と検証

```bash
oma update --ci
oma doctor --json | jq '.healthy'
```

### 自動メトリクス収集

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### バッチエージェント実行とステータスモニタリング

```bash
oma agent:parallel tasks.yaml --no-wait
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent:status $SESSION_ID backend frontend mobile"
```

### CI後のクリーンアップ

```bash
oma cleanup --yes --json
```

### ワークスペース対応の検証

```bash
oma verify backend -w ./apps/api
oma verify frontend -w ./apps/web
oma verify mobile -w ./apps/mobile
```

### スプリントレビュー向け比較振り返り

```bash
oma retro 2w --compare
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### フルヘルスチェックスクリプト

```bash
#!/bin/bash
set -e
echo "=== oh-my-agent Health Check ==="
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "MISSING" end)"'
oma auth:status --json | jq -r '.[] | "\(.name): \(.status)"'
oma stats --json | jq -r '"Sessions: \(.sessions), Tasks: \(.tasksCompleted)"'
echo "=== Done ==="
```

### エージェントイントロスペクション

```bash
oma describe | jq '.command.subcommands[] | {name, description}'
oma describe agent:spawn | jq '.command.options[] | {flags, description}'
```
