---
title: "CLIコマンド"
description: oh-my-agent CLIの全コマンド完全リファレンス。構文、オプション、使用例をカテゴリ別に整理しています。
---

# CLIコマンド

グローバルインストール（`bun install --global oh-my-agent`）後、`oma`または`oh-my-agent`を使用。環境変数`OH_MY_AG_OUTPUT_FORMAT`を`json`に設定すると、対応コマンドで機械読み取り可能な出力を強制。

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
oma doctor [--json] [--output <format>] [--profile]
```

CLIインストール、認証、MCP設定、スキルステータスを検証します。`--profile`を付けると、アクティブな`model_preset`と`agents:`オーバーライドからエージェントごとに解決されたモデル、CLI、認証ステータスのプロファイルヘルスマトリクスを表示します。詳細は[エージェント別モデル](../guide/per-agent-models.md)を参照。

### update

```
oma update [-f | --force] [--ci]
```

| フラグ | 説明 |
|:-----|:-----------|
| `-f, --force` | ユーザーカスタム設定を上書き |
| `--ci` | 非インタラクティブCIモード |

### link

`.agents/`ソースから、再インストールせずにベンダーネイティブファイルを再生成します。

```
oma link [vendors...]
```

**例：**

```bash
# 設定済みのすべてのベンダーを再生成
oma link

# ClaudeとCodexのファイルだけを再生成
oma link claude codex
```

**動作内容：**
1. `.agents/agents/`からベンダーネイティブのエージェントファイルを再構築
2. 選択されたベンダーのフックとローカル設定をリフレッシュ
3. `CLAUDE.md`、`GEMINI.md`、`AGENTS.md`の統合ブロックを再生成
4. 該当する場合、Cursor MCPリンクとCLIスキルのシンボリックリンクをリフレッシュ

`.agents/agents/`、`.agents/workflows/`、`.agents/rules/`、フック定義を編集した後に使用します。

**モデル動作：**
- 同一ベンダーのネイティブディスパッチは、生成されたベンダーエージェントファイルで定義されたモデルを使用します。
- 外部フォールバックディスパッチは、`.agents/skills/oma-orchestrator/config/cli-config.yaml`の各ベンダーの`default_model`を使用します。

**ディスパッチ動作：**
- ターゲットベンダーが現在のランタイムと一致し、そのランタイムがネイティブのロールエージェントをサポートする場合、OMAはネイティブディスパッチを使用します。
- それ以外の場合、OMAは`oma agent:spawn`にフォールバックします。

### setup（workflow）

`/setup`ワークフロー（エージェントセッション内で呼び出し）は、言語、CLIインストール、MCP接続、エージェント-CLIマッピングのインタラクティブな設定を提供します。これは`oma`（インストーラー）とは異なります。`/setup`はすでにインストール済みのインスタンスを設定するためのものです。

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

### recap

Claude、Codex、Qwen、CursorのセッションをまたいでAIツールの会話履歴を要約します。

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

**オプション：**

| フラグ | 説明 | デフォルト |
|:-----|:-----------|:--------|
| `--window <period>` | 時間ウィンドウ：`1d`、`3d`、`7d`、`2w`、`30d` | `1d` |
| `--date <date>` | 特定の日付（`YYYY-MM-DD`）。`--window`より優先 | |
| `--tool <tools>` | カンマ区切りフィルタ：`claude,codex,qwen,cursor` | すべて |
| `--top <n>` | 上位N件のプロジェクト/トピックを表示 | |
| `--sort <metric>` | `count`または`duration`でソート | `count` |
| `--mermaid` | Mermaid Ganttチャートとして出力 | |
| `--graph` | ブラウザでインタラクティブグラフを開く | |
| `--json` / `--output <format>` | 機械可読出力 | `text` |

**例：**

```bash
oma recap                                     # 今日（1d）
oma recap --window 7d                         # 直近1週間
oma recap --date 2026-04-20 --tool claude,codex
oma recap --window 7d --mermaid > week.mmd
oma recap --window 30d --graph                # ブラウザのインタラクティブグラフ
```

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
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

| 引数 | 必須 | 説明 |
|:---------|:---------|:-----------|
| `agent-id` | はい | `backend`、`frontend`、`mobile`、`qa`、`debug`、`pm` |
| `prompt` | はい | タスク説明（テキストまたはファイルパス） |
| `session-id` | はい | セッションID |

| フラグ | 説明 |
|:-----|:-----------|
| `-m, --model` | CLIベンダーオーバーライド |
| `-w, --workspace` | 作業ディレクトリ |

### agent:status

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

ステータス値：`completed`、`running`、`crashed`。出力形式：`{agent-id}:{status}`（1行ごと）。

### agent:parallel

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

YAML形式またはインライン（`agent:task[:workspace]`）でタスク指定。`--no-wait`でバックグラウンド実行。

### agent:review

外部AI CLI（agy、codex、claude、またはqwen）を使用してコードレビューを実行。

```
oma agent:review [-m <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

| フラグ | 説明 |
|:-----|:-----------|
| `-m, --model <vendor>` | 使用するCLIベンダー：`antigravity`、`codex`、`claude`、`qwen`。デフォルトは設定から解決されたベンダー。 |
| `-p, --prompt <prompt>` | カスタムレビュープロンプト。省略時はデフォルトのコードレビュープロンプトを使用。 |
| `-w, --workspace <path>` | レビュー対象パス。デフォルトはカレントディレクトリ。 |
| `--no-uncommitted` | 未コミット変更のレビューをスキップ。セッション内のコミット済み変更のみをレビュー。 |

**動作：**
- 環境または最近のgitアクティビティからセッションIDを自動検出。
- `codex`の場合：ネイティブの`codex review`サブコマンドを使用。
- `agy`、`claude`、`qwen`の場合：レビュープロンプトを構成してCLIを呼び出し。
- デフォルトでは作業ディレクトリの未コミット変更をレビュー。
- `--no-uncommitted`指定時は、現在のセッション内でコミットされた変更のみをレビュー。

**例：**
```bash
# デフォルトベンダーで未コミット変更をレビュー
oma agent:review

# codexでレビュー（ネイティブcodex reviewコマンドを使用）
oma agent:review -m codex

# claudeでカスタムプロンプトを使用してレビュー
oma agent:review -m claude -p "セキュリティ脆弱性と入力バリデーションに焦点を当てて"

# 特定パスをレビュー
oma agent:review -w ./apps/api

# コミット済み変更のみをレビュー（作業ツリーをスキップ）
oma agent:review --no-uncommitted
```

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

全CLI（GitHub CLI（`gh`）、Antigravity CLI（`agy`）、Gemini、Claude、Codex、Cursor、Qwen）の認証状態を確認。

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

### search

fetch、メタデータ、RSS、メディア、コード、信頼スコアリングなどを含むメカニカル検索プリミティブです。`oma s`としてエイリアスされています。すべてのサブコマンドはJSONを標準出力に出力します（1行に1オブジェクト、または`--pretty`で整形）。

```
oma search <subcommand> ...
oma s <subcommand> ...
```

**サブコマンド：**

| サブコマンド | 用途 |
|:-----------|:--------|
| `fetch <url>` | 自動エスカレーション戦略パイプラインでURLを取得（api → probe → impersonate → browser → archive） |
| `api <url>` | 一致したプラットフォームAPIハンドラ経由で取得（Phase 0） |
| `api:search <query>` | サポートされるプラットフォームをまたいだファンアウトキーワード検索（`--platforms <list>`） |
| `meta <url>` | OGP / JSON-LD / Schema.orgメタデータを抽出 |
| `rss <url>` | RSS / Atomフィードを発見してパース |
| `rss:google <query>` | クエリのGoogle News RSS URLを構築 |
| `media <url>` | `yt-dlp`（1858サイト対応）でメディアメタデータを抽出 |
| `archive <url>` | AMP / archive.today / Waybackフォールバックで取得 |
| `trust <domain>` | ドメインの信頼レベル/スコアを解決 |
| `code <query>` | `gh`（GitHub）または`glab`（GitLab）でコードを検索 |
| `doctor` | 依存関係を確認（Chrome、`python3` + `curl_cffi`、`yt-dlp`、`gh`） |

**URL/queryサブコマンドの共通オプション：**

| フラグ | 説明 | デフォルト |
|:-----|:-----------|:--------|
| `--timeout <seconds>` | 戦略ごとのタイムアウト | `15`（`media`では`30`） |
| `--locale <value>` | `Accept-Language`ヘッダ | `en-US,en;q=0.9` |
| `--pretty` | JSON出力を整形 | `false` |

**`fetch`の追加：**

| フラグ | 説明 |
|:-----|:-----------|
| `--only <strategies>` | 実行する戦略（`api,probe,impersonate,browser,archive`、カンマ区切り） |
| `--skip <strategies>` | スキップする戦略（カンマ区切り） |
| `--include-archive` | アーカイブ戦略を最終フォールバックとして追加 |

**`media`の追加：**

| フラグ | 説明 |
|:-----|:-----------|
| `--subs` | 字幕を書き出す |
| `--sub-lang <list>` | 字幕言語（カンマ区切り、デフォルト：`en`） |
| `--format <spec>` | yt-dlpフォーマット仕様 |

**`code`の追加：**

| フラグ | 説明 | デフォルト |
|:-----|:-----------|:--------|
| `--host <github\|gitlab>` | ホスト | `github` |
| `--language <lang>` | 言語フィルタ | |
| `--repo <owner/repo>` | リポジトリスコープ | |
| `--limit <n>` | 最大結果数 | `20` |

**終了コード：** `0` ok、`1` error、`2` blocked、`3` not-found、`4` invalid-input、`5` auth-required、`6` timeout。

**例：**

```bash
# 自動エスカレーションのfetch
oma search fetch https://example.com/article --pretty

# 単一戦略を強制
oma search fetch https://example.com --only browser

# APIハンドラ経由のクロスプラットフォームキーワード検索
oma search api:search "RAG patterns" --platforms hackernews,reddit

# リポジトリの信頼スコアを取得
oma search trust github.com

# コード検索（デフォルトはGitHub）
oma search code "useEffect cleanup" --language ts --limit 10

# ローカル依存関係の検証
oma search doctor
```

### image

認証認識付きの並列ディスパッチを伴う、マルチベンダーAI画像生成。`oma img`としてエイリアスされています。

```
oma image <subcommand> ...
oma img <subcommand> ...
```

**サブコマンド：**

| サブコマンド | 用途 |
|:-----------|:--------|
| `generate <prompt...>` | `pollinations`（flux/zimage、無料）、`codex`（ChatGPT OAuth経由のgpt-image-2）、または`gemini`（APIキー + 課金が必要、デフォルトでは無効）で画像を生成 |
| `doctor` | ベンダーごとの認証とインストール状態を確認 |
| `list-vendors` | 登録済みベンダーとサポートモデルを一覧表示 |

**`image generate`オプション：**

| フラグ | 説明 | デフォルト |
|:-----|:-----------|:--------|
| `--vendor <name>` | `auto` \| `pollinations` \| `codex` \| `gemini` \| `all` | `auto` |
| `--size <size>` | `1024x1024` \| `1024x1536` \| `1536x1024` \| `auto` | ベンダーデフォルト |
| `--quality <level>` | `low` \| `medium` \| `high` \| `auto` | ベンダーデフォルト |
| `-n, --count <n>` | 画像数（1..5） | `1` |
| `--out <dir>` | 出力ディレクトリ | `.agents/results/images/{timestamp}/` |
| `--allow-external-out` | `--out`に`$PWD`外のパスを許可 | `false` |
| `--model <name>` | ベンダー固有のモデルオーバーライド | |
| `--strategy <list>` | Geminiのフォールバック順、カンマ区切り（`mcp,stream,api`） | |
| `--timeout <seconds>` | 画像ごとのタイムアウト | ベンダーデフォルト |
| `-r, --reference <path>` | リファレンス画像。複数指定可（`-r a.png -r b.png`）またはカンマ区切り。`codex`と`gemini`でサポート、`pollinations`では拒否。各≤5MB、PNG/JPEG/GIF/WebP（マジックバイトで検証）、最大10件。 | |
| `-y, --yes` | コスト確認をスキップ | `false` |
| `--no-prompt-in-manifest` | 生テキストの代わりにプロンプトのSHA256を保存 | `false` |
| `--dry-run` | プランとコスト見積もりを表示。実行しない | `false` |
| `--format <format>` | CLI出力フォーマット：`text` \| `json` | `text` |

各実行では生成画像の隣に`manifest.json`が書き出され、ベンダー、モデル、プロンプト（またはハッシュ）、サイズ、品質、コストが記録されます。

**例：**

```bash
# 設定不要・無料での生成
oma image generate "minimalist sunrise over mountains"

# 特定ベンダー + サイズ + 件数、コスト確認をスキップ
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# 比較のために全ベンダーを並列実行
oma image generate "cat astronaut" --vendor all

# 課金なしのコスト見積もり
oma image generate "test prompt" --dry-run

# スタイル/サブジェクトを誘導するためのリファレンス画像（codexまたはgemini）
oma image generate "same otter in dramatic lighting" --vendor codex -r ~/Downloads/otter.jpeg

# 複数のリファレンス（複数指定またはカンマ区切り）
oma image generate "blend these styles" --vendor gemini -r a.png -r b.png
oma image generate "blend these styles" --vendor gemini -r a.png,b.png

# ベンダーごとのdoctorチェック
oma image doctor --format json
```

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
| `viz` | `visualize` |
