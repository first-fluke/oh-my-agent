---
title: "CLIオプション"
description: oh-my-agent CLIの全オプション網羅的リファレンス。グローバルフラグ、出力制御、コマンドごとのオプション、実践的な使用パターンを解説します。
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

対応コマンド：`doctor`、`stats`、`retro`、`cleanup`、`auth:status`、`memory:init`、`verify`、`visualize`。

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

### JSON出力をサポートするコマンド

| コマンド | `--json` | `--output` | 備考 |
|:--------|:---------|:----------|:------|
| `doctor` | はい | はい | CLIチェック、MCPステータス、スキルステータスを含む |
| `stats` | はい | はい | フルメトリクスオブジェクト |
| `retro` | はい | はい | メトリクス、作者、コミットタイプを含むスナップショット |
| `cleanup` | はい | はい | クリーンアップされた項目のリスト |
| `auth:status` | はい | はい | CLIごとの認証ステータス |
| `memory:init` | はい | はい | 初期化結果 |
| `verify` | はい | はい | チェックごとの検証結果 |
| `visualize` | はい | はい | JSONとしての依存グラフ |
| `describe` | 常にJSON | N/A | 常にJSONを出力（イントロスペクションコマンド） |
| `recap` | はい | はい | ツール/セッションごとの会話履歴 |
| `export` | はい | はい | エクスポートステータスと出力先パス |
| `image generate` / `image doctor` / `image list-vendors` | `--format json` | N/A | `--json`の代わりに`--format json`を使用 |
| `search ...` | 常にJSON | N/A | すべての`search`サブコマンドはJSONをストリーム出力。人間用の整形には`--pretty`を使用 |

---

## コマンドごとのオプション

### oma（install）

```
oma
```

フラグなし。インタラクティブインストーラーがプリセット選択を促し、`.agents/oma-config.yaml`に`model_preset`を書き込みます。

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| フラグ | 説明 | デフォルト |
|:-----|:-----------|:--------|
| `--json` | フォーマット済みテキストの代わりにJSONを出力。 | `false` |
| `--output <format>` | 明示的な出力フォーマット（`text`または`json`）。[出力オプション](#出力オプション)を参照。 | `text` |
| `--profile` | プロファイルヘルスマトリクスを表示。アクティブな`model_preset`と`agents:`オーバーライドから、エージェントごとに解決されたモデルスラグ、CLI、認証ステータスを表示します。詳細は[エージェント別モデル](../guide/per-agent-models.md)を参照。 | `false` |

### update

```
oma update [-f | --force] [--ci]
```

| フラグ | 説明 | デフォルト |
|:-----|:-----------|:--------|
| `--force` / `-f` | ユーザーカスタム設定を上書き。`oma-config.yaml`、`mcp.json`、`stack/`が対象。 | `false` |
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

### agent:spawn

| フラグ | 説明 | デフォルト |
|:-----|:-----------|:--------|
| `--model` / `-m` | CLIベンダーオーバーライド。`antigravity`、`claude`、`codex`、`qwen`。 | 設定から解決 |
| `--workspace` / `-w` | エージェントの作業ディレクトリ。省略時はモノレポ設定から自動検出。 | 自動検出または`.` |

**バリデーション：** `agent-id`は`backend`/`frontend`/`mobile`/`qa`/`debug`/`pm`のいずれか。`session-id`に`..`、`?`、`#`、`%`、制御文字は使用不可。`vendor`は`antigravity`、`claude`、`codex`、`qwen`のいずれか。

**ベンダー固有の動作：**

| ベンダー | コマンド | 自動承認フラグ | プロンプトフラグ |
|:-------|:--------|:-----------------|:-----------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
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
| `--model` / `-m` | 全エージェントに適用するベンダーオーバーライド |
| `--inline` / `-i` | `agent:task[:workspace]`形式のインラインタスク指定 |
| `--no-wait` | バックグラウンドモード |

インラインタスク形式：`backend:Implement auth API:./api`（最後のコロン区切りが`./`、`/`、`.`で始まればワークスペース）。

### recap

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

| フラグ | 説明 | デフォルト |
|:-----|:-----------|:--------|
| `--window <period>` | 時間ウィンドウ：`1d`、`3d`、`7d`、`2w`、`30d`。`--date`が指定されている場合は無視。 | `1d` |
| `--date <date>` | 特定の日付（`YYYY-MM-DD`）。`--window`より優先。 | |
| `--tool <tools>` | ツールでセッションをフィルタ。カンマ区切り：`claude`、`codex`、`qwen`、`cursor`。 | すべてのツール |
| `--top <n>` | サマリ内の上位N件のプロジェクト/トピックのみ表示。 | 無制限 |
| `--sort <metric>` | セッションを`count`または`duration`でソート。 | `count` |
| `--mermaid` | デフォルトサマリの代わりにMermaid Ganttチャートを出力。 | `false` |
| `--graph` | ブラウザでインタラクティブグラフを開く。`--mermaid`と排他。 | `false` |

### export

```
oma export <format> [-d <path>] [--json] [--output <format>]
```

| フラグ | 短縮形 | 説明 | デフォルト |
|:-----|:------|:-----------|:--------|
| `--dir <path>` | `-d` | エクスポートしたルールを書き込むターゲットディレクトリ。 | `process.cwd()` |

**サポートされるフォーマット：** `cursor`（インストール済みスキルから派生した`.cursor/rules`ファイルを書き出す）。

### search

```
oma search <subcommand> [...]
```

`search`グループは独自のJSON出力を持ちます（`--json` / `--output`フラグなし）。URL/queryサブコマンドでは`--pretty`で整形でき、サブコマンド固有のオプションは以下のとおりです。

| サブコマンド | 主なオプション |
|:-----------|:---------------|
| `fetch <url>` | `--only`、`--skip`、`--include-archive`、`--timeout`、`--locale`、`--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`、`--locale`、`--pretty` |
| `api:search <query>` | `--platforms <list>`、`--timeout`、`--locale`、`--pretty` |
| `rss:google <query>` | `--locale`（デフォルト`en-US`） |
| `media <url>` | `--subs`、`--sub-lang <list>`（デフォルト`en`）、`--format <spec>`、`--timeout`（デフォルト`30`）、`--pretty` |
| `code <query>` | `--host <github\|gitlab>`（デフォルト`github`）、`--language`、`--repo`、`--limit`（デフォルト`20`）、`--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | なし。Chrome / `python3 curl_cffi` / `yt-dlp` / `gh`のバイナリチェックを実行します |

**終了コード：** `0` ok、`1` error、`2` blocked、`3` not-found、`4` invalid-input、`5` auth-required、`6` timeout。スクリプト中で一時的なブロッカーと無効入力を区別するために使用してください。

### image

```
oma image <subcommand> [...]
```

出力フォーマットはサブコマンドごとに`--format <text|json>`で制御します（共有の`--json`フラグではありません）。

`image generate`が受け付けるフラグ：

| フラグ | 短縮形 | 説明 | デフォルト |
|:-----|:------|:-----------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `gemini` \| `all`。`auto`は`image-config.yaml`と利用可能な認証から解決。 | `auto` |
| `--size <size>` | | `1024x1024` \| `1024x1536` \| `1536x1024` \| `auto`。 | ベンダーデフォルト |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`。 | ベンダーデフォルト |
| `--count <n>` | `-n` | 画像数、1..5。 | `1` |
| `--out <dir>` | | 出力ディレクトリ。`--allow-external-out`が指定されない限り`$PWD`内である必要があります。 | `.agents/results/images/{timestamp}/` |
| `--allow-external-out` | | `--out`に`$PWD`外のパスを許可。 | `false` |
| `--model <name>` | | ベンダー固有のモデルオーバーライド（例：`gpt-image-2`、`flux`、`imagen-4`）。 | ベンダーデフォルト |
| `--strategy <list>` | | Geminiのフォールバック順、カンマ区切りで`mcp`、`stream`、`api`を指定。 | ベンダーデフォルト |
| `--timeout <seconds>` | | 画像ごとのタイムアウト。 | ベンダーデフォルト |
| `--reference <path>` | `-r` | スタイル/サブジェクト転送用のリファレンス画像。複数指定可（`-r a.png -r b.png`）またはカンマ区切り。サイズ（≤5MB）、フォーマット（PNG/JPEG/GIF/WebP、マジックバイトで判定）、件数（≤10）が検証されます。`codex`（`codex exec`に`-i`を渡す）と`gemini`（base64の`inlineData`としてインライン化）でサポート。`pollinations`では終了コード4で拒否。 | |
| `--yes` | `-y` | コスト確認プロンプトをスキップ。 | `false` |
| `--no-prompt-in-manifest` | | `manifest.json`にプロンプトの生テキストではなくSHA256を保存。 | `false` |
| `--dry-run` | | プランとコスト見積もりを表示。実行しない。 | `false` |
| `--format <format>` | | `text` \| `json`。 | `text` |

`image doctor`と`image list-vendors`は`--format <text|json>`のみを受け付けます。

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
