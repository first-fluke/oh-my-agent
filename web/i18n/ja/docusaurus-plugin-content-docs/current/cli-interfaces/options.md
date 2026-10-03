---
title: "CLIオプション"
description: グローバルフラグ、出力制御、コマンドごとのオプション、実際の使用パターンをまとめた CLI オプションの完全リファレンスです。
---

# CLIオプション {#cli-options}

## グローバルオプション {#global-options}

ルートの `oma` / `oh-my-agent` コマンドで使用できるオプションです。

| フラグ | 説明 |
|:-----|:-----------|
| `-g, --global` | `<cwd>/.agents/` ではなく HOME のインストール先（`~/.agents/`）を操作します。 |
| `-y, --yes` | 選択したコマンドが確認をサポートする場合にプロンプトを省略します。コマンド固有の安全確認は適用されます。 |
| `-V, --version` | バージョン番号を出力して終了します。 |
| `-h, --help` | コマンドのヘルプを表示します。 |

すべてのサブコマンドも `-h, --help` に対応し、それぞれのヘルプを表示します。

`--global` はプロセス全体のインストールルートを設定するため、`install`、`update`、`link`、`uninstall` は実行場所にかかわらず `~/.agents/` を解決します。`OMA_HOME=<abs-path>` で上書きできます。詳しくは [グローバルインストール](../guide/global-install.md) を参照してください。

---

## 出力オプション {#output-options}

多くのコマンドは CI/CD パイプラインや自動化向けの機械可読出力に対応しています。JSON 出力を求める方法は優先順位順に 3 つあります。

### 1. --json フラグ {#1---json-flag}

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

`--json` は、対応を宣言した個別のパスでだけ利用できます。コマンドファミリー全体が対応すると推測しないでください。たとえば `image`、`video`、`slide` のリーフはレジストリに記載された場合に `--output` を公開し、`search` は独自の JSON ストリームを持ちます。ページ末尾のレジストリ表がパスごとの正規一覧です。

### 2. --output フラグ {#2---output-flag}

```bash
oma stats get --output json
oma doctor --output text
```

`--output` は `text` または `json` を受け付けます。`--json` と同じ機能を持ちますが、環境変数が json のときに特定コマンドだけテキスト出力を明示できます。

**検証:** 無効な形式を指定すると、CLI は `Invalid output format: {value}. Expected one of text, json` を返します。

### 3. OH_MY_AG_OUTPUT_FORMAT 環境変数 {#3-oh_my_ag_output_format-environment-variable}

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
```

この環境変数を `json` に設定すると、対応するすべてのコマンドで JSON 出力を強制します。認識される値は `json` だけで、それ以外は無視してテキストを既定値にします。

**解決順序:** `--json` フラグ > `--output` フラグ > `OH_MY_AG_OUTPUT_FORMAT` 環境変数 > `text`（既定）。

### JSON出力に対応するコマンド {#commands-supporting-json-output}

| コマンド | `--json` | `--output` | 注記 |
|:--------|:---------|:----------|:------|
| `doctor` | Yes | Yes | CLI の確認、MCP の状態、スキルの状態を含みます。 |
| `stats` | Yes | Yes | メトリクス全体を返します。 |
| `retro` | Yes | Yes | メトリクス、作成者、コミット種別を含むスナップショットです。 |
| `cleanup` | Yes | Yes | クリーンアップした項目の一覧です。 |
| `auth status` | Yes | Yes | CLI ごとの認証状態です。 |
| `memory init` | Yes | Yes | 初期化結果です。 |
| `verify agent` / `verify triggers` | Yes | Yes | 各チェックの検証結果です。 |
| `visualize` | Yes | Yes | 依存グラフを JSON で返します。 |
| `describe` | 常に JSON | なし | 内省コマンドのため常に JSON を出力します。 |
| `recap` | Yes | Yes | ツールまたはセッションごとの会話履歴です。 |
| `image generate` / `image doctor` / `image vendor list` | なし | Yes | `--output json` を使います。`vendor list` が正規の検出パスです。 |
| `video generate` / `video doctor` / `video compose` / `video render` / `video provider list` | なし | Yes | 実行エンベロープまたは準備状況レポートには `--output json` を使います。 |
| `explain validate` | Yes | Yes | 成果物の検証レポートです。 |
| `diagram resolve` / `diagram update` | Yes | Yes | エンジン解決または管理キャッシュの結果です。 |
| `market resolve` / `market update` | Yes | Yes | 管理対象のリサーチエンジンの状態です。 |
| `docs verify` / `docs sync` / `docs i18n` / `docs lint` | Yes | なし | 各 docs パスが固有のレポートオプションを使います。 |
| `search ...` | 常に JSON | なし | `search` の全サブコマンドは JSON をストリーム出力します。人間が読む場合は `--pretty` を使います。 |

---

## コマンドごとのオプション {#per-command-options}

### install {#install}

```
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

対話式インストーラーは選択したプロバイダー設定を `.agents/oma-config.yaml` に書き込みます。プロバイダーフラグで web-search、code-intelligence、semantic-memory の連携先を選び、選択した場合は `--honcho-url` と `--honcho-workspace` で Honcho メモリーサービスを設定します。インストール中に確認を求められた場合はルートの `-y, --yes` フラグが適用されます。

### doctor {#doctor}

```
oma doctor [--json] [--output <format>] [--profile]
```

| フラグ | 説明 | デフォルト |
|:-----|:-----------|:--------|
| `--json` | 整形テキストではなく JSON を出力します。 | `false` |
| `--output <format>` | 出力形式を明示します（`text` または `json`）。[出力オプション](#output-options) を参照してください。 | `text` |
| `--profile` | 有効な `model_preset` と `agents:` の上書きから解決したモデルスラッグ、CLI、エージェントごとの認証状態をプロファイルのヘルスマトリクスで表示します。[エージェント別モデル](../guide/per-agent-models.md) を参照してください。 | `false` |

### update {#update}

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
oma update mcp [-y | --yes] [--ci] [--all] [--vendor <vendors>]
```

| フラグ | 短縮形 | 説明 | デフォルト |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | 更新中にユーザーが変更した設定ファイルを上書きします。対象は `oma-config.yaml`、`mcp.json`、`stack/` ディレクトリです。このフラグを付けない場合、更新前にバックアップし、完了後に復元します。 | `false` |
| `--with-new-skills` | | 現在のインストール以降にレジストリへ追加されたスキルをインストールします。 | `false` |
| `--ci` | | 非対話式 CI モードで実行します。確認プロンプトをすべて省略し、スピナーやアニメーションの代わりに通常のコンソール出力を使います。stdin を利用できない CI/CD パイプラインで必要です。 | `false` |
| `--yes` | `-y` | プロンプトを省略します。`--all` または `--vendor` と組み合わせない限り、不足しているベンダーディレクトリは作成しません。 | `false` |
| `--all` | | 対応するプロジェクト対象ベンダーをすべて作成または更新します。 | `false` |
| `--vendor <vendors>` | | `claude,qwen` のようなカンマ区切りのベンダー一覧を作成または更新します。 | 既存のベンダーディレクトリのみ |

`oma update mcp` はブラウザー MCP サーバーを選択するときも同じ `--yes`、`--ci`、`--all`、`--vendor` 制御を使います。`--force` と `--with-new-skills` は使いません。

**--force の動作:**
- `oma-config.yaml` はレジストリの既定値に置き換わります。
- `mcp.json` はレジストリの既定値に置き換わります。
- Backend の `stack/` ディレクトリ（言語固有のリソース）は置き換わります。
- このフラグにかかわらず、その他のファイルは常に更新されます。

**--ci の動作:**
- 開始時に `console.clear()` を呼びません。
- `@clack/prompts` は通常の `console.log` に置き換わります。
- 競合ツールの検出プロンプトを省略します。
- `process.exit(1)` を呼ばず、エラーを送出します。

**ベンダーの対象範囲:**
- `oma update` はすでに存在するベンダーディレクトリだけを更新します。
- `oma update --yes` はプロンプトを出さず、同じベンダー範囲を使います。
- `oma update --all` は対応するプロジェクト対象ベンダーをすべて作成または更新します。
- `oma update --vendor claude,qwen` は指定したベンダーだけを作成または更新します。

### stats {#stats}

```
oma stats get [--json] [--output <format>]
oma stats reset
```

| フラグ | 説明 | デフォルト |
|:-----|:-----------|:--------|
| `--json` | reset 結果を JSON で出力します。 | `false` |
| `--output <format>` | `text` または `json` で出力します。 | `text` |

`oma stats reset` がリセット用コマンドです。以前の `oma stats get --reset` という表記は、現在の公開サーフェスにはありません。

### retro {#retro}

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| フラグ | 説明 | デフォルト |
|:-----|:-----------|:--------|
| `--interactive` | 手動入力を行う対話モードです。Git から収集できない補足情報（気分や特記事項など）を尋ねます。 | `false` |
| `--compare` | 現在の期間を同じ長さの直前の期間と比較し、差分メトリクス（コミット +12、追加行 -340 など）を表示します。 | `false` |

**window 引数の形式:**
- `7d`: 7 日間
- `2w`: 2 週間
- `1m`: 1 か月
- 省略時は既定の 7 日間です。

### cleanup {#cleanup}

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| フラグ | 短縮形 | 説明 | デフォルト |
|:-----|:------|:-----------|:--------|
| `--dry-run` | | 実行予定を表示します。変更は行わず、検出結果にかかわらず終了コードは 0 です。 | `false` |
| `--yes` | `-y` | すべての確認プロンプトを省略し、確認なしで全件をクリーンアップします。スクリプトや CI に便利です。 | `false` |

**クリーンアップ対象:**
1. 孤立した PID ファイル: 参照先のプロセスが動いていない `/tmp/subagent-*.pid`。
2. 孤立したログファイル: 終了した PID に対応する `/tmp/subagent-*.log`。
3. Gemini Antigravity のディレクトリ: `.gemini/antigravity/brain/`、`.gemini/antigravity/implicit/`、`.gemini/antigravity/knowledge/`。時間とともに状態が蓄積し、大きくなる可能性があります。

### agent spawn {#agent-spawn}

```
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

| フラグ | 短縮形 | 説明 | デフォルト |
|:-----|:------|:-----------|:--------|
| `--resumed-from` | なし | 直前の実行 ID に再試行をリンクします。 | |
| `--fallback-vendors` | なし | 順序付きの明示的なフォールバックベンダーチェーンです。 | |
| `--task-id` | なし | セッション計画にあるタスク ID です。 | エージェント ID |
| `--vendor` | なし | CLI ベンダーの上書きです。ランタイムは `antigravity`、`claude`、`codex`、`cursor`、`opencode`、`qwen`、`grok`、`pi` を受け付けます。 | 設定から解決 |
| `--workspace` | `-w` | 省略または `.` の場合、CLI はモノレポ設定ファイル（pnpm-workspace.yaml、package.json、lerna.json、nx.json、turbo.json、mise.toml）から作業ディレクトリを自動検出します。 | 自動検出または `.` |
| `--isolation` | なし | 分離モードです。`worktree` は起動ごとに Git worktree を作成し、既定値は `none` です。 | `none` |
| `--read-only` | なし | 起動したエージェントを非破壊ツールに制限し、自動承認フラグを抑止します。 | `false` |

**検証:**
- `agent-id` は `backend`、`frontend`、`mobile`、`qa`、`debug`、`pm` のいずれかです。
- `session-id` に `..`、`?`、`#`、`%`、制御文字を含めることはできません。
- `vendor` は `antigravity`、`claude`、`codex`、`cursor`、`opencode`、`qwen`、`grok`、`pi` のいずれかです。

**ベンダー固有の動作:**

| ベンダー | コマンド | 自動承認フラグ | プロンプトフラグ |
|:-------|:--------|:-----------------|:-----------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| claude | `claude` | なし | `-p` |
| codex | `codex` | `--sandbox workspace-write` | なし（プロンプトは位置引数） |
| cursor | `cursor-agent` | ベンダー固有 | `-p` |
| opencode | `opencode` | ベンダー固有 | `-p` |
| qwen | `qwen` | `--yolo` | `-p` |
| grok | `grok` | ベンダー固有 | `-p` |
| pi | `pi` | `--read-only` では抑止 | プロンプトは位置引数 |

これらの既定値は `.agents/skills/oma-orchestration/config/cli-config.yaml` で上書きできます。

### agent status {#agent-status}

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

| フラグ | 短縮形 | 説明 | デフォルト |
|:-----|:------|:-----------|:--------|
| `--root` | `-r` | メモリーファイル（`.agents/state/memories/result-{agent}.md`）と PID ファイルを探すルートパスです。 | カレントディレクトリ |

**状態判定のロジック:**
1. `.agents/state/memories/result-{agent}.md` が存在する場合は `## Status:` ヘッダーを読みます。ヘッダーがなければ `completed` を返します。
2. `/tmp/subagent-{session-id}-{agent}.pid` に PID ファイルがあれば PID が有効か確認します。有効なら `running`、終了済みなら `crashed` を返します。
3. どちらのファイルもなければ `crashed` を返します。

### agent parallel {#agent-parallel}

```
oma agent parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

| フラグ | 短縮形 | 説明 | デフォルト |
|:-----|:------|:-----------|:--------|
| `--vendor` | なし | すべての起動エージェントに適用する CLI ベンダーの上書きです。 | エージェント設定から解決 |
| `--inline` | `-i` | ファイルパスではなく、`agent:task[:workspace]` 形式のタスク引数として解釈します。 | `false` |
| `--no-wait` | | バックグラウンドモードです。全エージェントを起動して待たずに戻ります。PID 一覧とログを `.agents/results/parallel-{timestamp}/` に保存します。 | `false`（完了まで待機） |

インラインタスク形式: `agent:task` または `agent:task:workspace`
- 最後のコロン区切り要素が `./`、`/` で始まるか `.` と等しいかを確認してワークスペースを検出します。
- 例: `backend:Implement auth API:./api` は agent=backend、task="Implement auth API"、workspace=./api です。
- 例: `frontend:Build login page` は agent=frontend、task="Build login page"、workspace=自動検出です。

**YAML タスクファイルの形式:**
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional
- agent: frontend
task: "Build user dashboard"
```

### recap {#recap}

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

| フラグ | 説明 | デフォルト |
|:-----|:-----------|:--------|
| `--window <period>` | 期間: `1d`、`3d`、`7d`、`2w`、`30d`。`--date` を指定した場合は無視されます。 | `1d` |
| `--date <date>` | 指定日（`YYYY-MM-DD`）。`--window` より優先されます。 | |
| `--tool <tools>` | ツールでセッションを絞り込みます。カンマ区切り: `grok`、`claude`、`codex`、`qwen`、`cursor`、`antigravity`。 | すべてのツール |
| `--top <n>` | 概要に表示するプロジェクトまたはトピックを上位 N 件に限定します。 | 上限なし |
| `--sort <metric>` | セッションを `count` または `duration` で並べ替えます。 | `count` |
| `--mermaid` | 既定の概要ではなく Mermaid のガントチャートを出力します。 | `false` |
| `--graph` | ブラウザーでインタラクティブなグラフを開きます。`--mermaid` とは併用できません。 | `false` |

> **注:** インストール済みスキルからベンダールールファイル（例: `.cursor/rules`）を生成する処理は、独立した `export` コマンドではなく [`oma link <vendor>`](./commands.md#link) が担当します。

### search {#search}

```
oma search <subcommand> [...]
```

検索グループは独自の JSON 出力を持つため、`--json` / `--output` フラグはありません。URL / クエリ系サブコマンドで `--pretty` を使うと結果を整形表示できます。以下のサブコマンド固有オプションを使います。

| サブコマンド | 主なオプション |
|:-----------|:---------------|
| `fetch <url>` | `--only`、`--skip`、`--include-archive`、`--timeout`、`--locale`、`--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`、`--locale`、`--pretty` |
| `api:search <query>` | `--platforms <list>`、`--timeout`、`--locale`、`--pretty` |
| `rss:google <query>` | `--locale`（既定: `en-US`） |
| `media <url>` | `--subs`、`--sub-lang <list>`（既定 `en`）、`--format <spec>`、`--timeout`（既定 `30`）、`--pretty` |
| `code <query>` | `--host <github\|gitlab>`（既定 `github`）、`--language`、`--repo`、`--limit`（既定 `20`）、`--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | なし（Chrome / `python3 curl_cffi` / `yt-dlp` / `gh` のバイナリを確認） |

**終了コード:** `0` 成功、`1` エラー、`2` ブロック、`3` 未検出、`4` 入力不正、`5` 認証必須、`6` タイムアウト。スクリプトでは一時的なブロックと入力不正を区別するために使います。

### image {#image}

```
oma image <subcommand> [...]
```

出力形式はサブコマンドごとに `--output <text|json>` で制御します。

`image generate` のオプション:

| フラグ | 短縮形 | 説明 | デフォルト |
|:-----|:------|:-----------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all`。`auto` は有効な `image:` 設定と利用可能な認証から解決します。 | `auto` |
| `--size <size>` | | 両辺が 16 の倍数で 16〜3840、アスペクト比が 1:3〜3:1 の `WxH`、または `auto`。 | ベンダー既定 |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`。 | ベンダー既定 |
| `--count <n>` | `-n` | 画像数（1〜5）。 | `1` |
| `--output-dir <dir>` | | 出力ディレクトリ。`--allow-external-output` を付けない限り `$PWD` 内である必要があります。 | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | | `$PWD` 外の `--output-dir` を許可します。 | `false` |
| `--model <name>` | | ベンダー固有のモデル上書き。antigravity のモデルは `agy` が選びます。 | ベンダー既定 |
| `--timeout <duration>` | | 画像ごとのタイムアウト（期間値）。 | ベンダー既定 |
| `--reference <path>` | `-r` | スタイルまたは被写体を移す参照画像。繰り返し（`-r a.png -r b.png`）またはカンマ区切りで指定できます。サイズ（≤5MB）、形式（マジックバイトで PNG/JPEG/GIF/WebP を検証）、数（≤10）を確認します。`codex` と `antigravity` が対応し、`pollinations` では終了コード 4 で拒否されます。 | |
| `--yes` | `-y` | コスト確認プロンプトを省略します。 | `false` |
| `--no-prompt-in-manifest` | | `manifest.json` にプロンプト本文を保存せず、SHA256 を保存します。 | `false` |
| `--dry-run` | | 計画とコスト見積もりを表示し、実行しません。 | `false` |
| `--output <format>` | | `text` \| `json`。 | `text` |

`image doctor` と `image vendor list` は `--output <text|json>` を受け付けます。`image list-vendors` はヘルプ用エイリアスとして残っています。正規の検出パスは `vendor list` です。

### video {#video}

```
oma video generate <brief...> [options]
oma video doctor [--output <format>] [--install|--upgrade|--install-mpt|--install-strudel]
oma video compose <run-dir> [--output <format>] [--refresh] [--offline]
oma video render <run-dir> [--output <format>]
oma video provider list [--output <format>]
```

`video generate` は計画およびキャプチャ制御の `--mode`、`--aspect`、`--locale`、`--captions`、`--visual`、`--voice`、`--music`、`--duration`、`--compositor`、`--capture`、`--source`、`--url`、`--device`、`--ready-selector`、`--show-cursor`、`--polish`、`--capture-timeout`、`--capture-stop` を受け付けます。さらに `--output-dir`、`--allow-external-output`、`--max-usd`、`--seed`、`--timeout`、`--script`、`--dry-run`、`--yes`、`--output`、`--no-brief-in-manifest` も使えます。ブラウザーキャプチャには `--source web --url <url>` を使い、既定のソースは `file` です。通常のレンダーには作成済みの composition と動作する compositor が必要です。プレースホルダーは `OMA_VIDEO_MOCK=1` のテスト経路に限られます。

`video doctor` は Remotion/MPT/Strudel ツールチェーンを確認または準備します。`compose` は実行用 composition の契約を準備し、`render` は型チェック、レンダー、出力検査を行います。`provider list` はプロバイダーとキーの状態を報告します。実行マニフェストと復旧手順は [動画生成](../guide/video-generation.md) を参照してください。

### memory init {#memory-init}

```
oma memory init [--json] [--output <format>] [--force]
```

| フラグ | 説明 | デフォルト |
|:-----|:-----------|:--------|
| `--force` | `.agents/state/memories/` 内の空または既存のスキーマファイルを上書きします。このフラグがなければ既存ファイルには触れません。 | `false` |

### verify {#verify}

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

| フラグ | 短縮形 | 説明 | デフォルト |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | 検証対象のワークスペースディレクトリです。 | カレントディレクトリ |

**エージェント種別:** `backend`、`frontend`、`mobile`、`qa`、`debug`、`pm`。

`verify triggers` はラベル付きコーパスに対するキーワード検出精度を測定します。割合のしきい値がゲートになります。CI ジョブで個々の検出結果を確認する場合は JSON 出力を使います。旧来の `oma verify <agent-type>` 表記は互換ヘルプ形式です。登録済みパスは `verify agent` です。

---

## 実践例 {#practical-examples}

### CIパイプライン: 更新と検証 {#ci-pipeline-update-and-verify}

```bash
# Update in CI mode, then run doctor to verify installation
oma update --ci
oma doctor --json | jq '.healthy'
```

### メトリクスの自動収集 {#automated-metrics-collection}

```bash
# Collect metrics as JSON and pipe to a monitoring system
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### エージェントのバッチ実行とステータス監視 {#batch-agent-execution-with-status-monitoring}

```bash
# Start agents in background
oma agent parallel tasks.yaml --no-wait

# Check status periodically
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent status $SESSION_ID backend frontend mobile"
```

### テスト後のCIクリーンアップ {#cleanup-in-ci-after-tests}

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### ワークスペースを指定した検証 {#workspace-aware-verification}

```bash
# Verify each domain in its workspace
oma verify agent backend -w ./apps/api
oma verify agent frontend -w ./apps/web
oma verify agent mobile -w ./apps/mobile
```

### スプリントレビュー向け振り返り比較 {#retro-with-comparison-for-sprint-reviews}

```bash
# Two-week sprint retro with comparison to previous sprint
oma retro 2w --compare

# Save as JSON for sprint report
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### 完全なヘルスチェック用スクリプト {#full-health-check-script}

```bash
#!/bin/bash
set -e

echo "=== oh-my-agent Health Check ==="

# Check CLI installations
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "MISSING" end)"'

# Check auth status
oma auth status --json | jq -r '.[] | "\(.name): \(.status)"'

# Check metrics
oma stats get --json | jq -r '"Sessions: \(.sessions), Tasks: \(.tasksCompleted)"'

echo "=== Done ==="
```

### エージェントのイントロスペクション用describe {#describe-for-agent-introspection}

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe "agent spawn" | jq '.command.options[] | {flags, description}'
```
## 公開オプションレジストリ全体 {#complete-public-option-registry}

以下のマトリクスは、リポジトリに固定された公開コマンドレジストリから生成されています。このページの網羅性インデックスです。`—` の行にはコマンド固有オプションがなく、共通ルートフラグとヘルプエイリアスは上で説明しています。値の文法が変わった場合は `oma describe "<path>"` で実行時ヘルプを確認してください。

| Command path | Public options | Purpose |
|---|---|---|
| `install` | `--web-search <provider>, --code-intelligence <provider>, --semantic-memory <provider>, --honcho-url <url>, --honcho-workspace <id>` | oh-my-agent のスキルと設定をインストールします。 |
| `describe` | なし | CLI コマンドを実行時の内省用 JSON として説明します。 |
| `uninstall` | `--dry-run, -y, --yes` | oh-my-agent が所有するファイルを削除します。`oma-config.yaml`、`mcp.json`、ユーザー作成スキルは保持します。 |
| `update` | `-f, --force, --with-new-skills, --ci, -y, --yes, --all, --vendor <vendors>` | レジストリからスキルを最新状態へ更新します。 |
| `update mcp` | `-y, --yes, --ci, --all, --vendor <vendors>` | ブラウザー MCP サーバー（Aside、Chrome DevTools、Firefox DevTools）を選択します。 |
| `link` | `--dry-run` | `.agents/` の SSOT からベンダーファイル（`.claude/`、`.cursor/` など）を再生成します。 |
| `intel` | なし | プロダクトインテリジェンスのパイプラインです。調査、ギャップ、PRD、課題提案を扱います。 |
| `intel suggest` | `--config <path>, --topic <topic>, --target <target>, --repos <repos>, --since <window>, --last-commits <n>, --output-dir <path>, --dry-run, --fixture <path>, --create-issue, --base-repo <owner/name>, --yes, --json, --output <format>` | 市場とコードのインテリジェンスから価値の高いプロダクト作業を提案します。 |
| `market` | なし | 常に最新の last30days エンジンによるコミュニティシグナル市場調査です。 |
| `market detect-trap` | `--force` | キーワードトラップになるクエリを拒否する事前チェックです。 |
| `market resolve` | `--refresh, --offline, --json, --output <format>` | oma が実行する last30days エンジン（管理対象の最新、固定版、ローカルコピー）と利用する Python を報告します。 |
| `market update` | `--json, --output <format>` | 最新の last30days リリースを oma の管理キャッシュへダウンロードします。 |
| `market run` | なし | 指定引数で last30days エンジン（scripts/last30days.py）を実行します。`--save-dir` の既定値は `market.save_dir` です。 |
| `doctor` | `--profile, --heal-check <agentType>, --json, --output <format>` | CLI のインストール、MCP 設定、スキルの状態を確認します。 |
| `profile` | なし | ローカル OMA 実行プロファイルを管理します。 |
| `profile list` | `--json, --output <format>` | ローカルプロファイルを一覧表示します。 |
| `profile show` | `--json, --output <format>` | ローカルプロファイルを表示します。 |
| `profile create` | `--json, --output <format>` | ローカルプロファイルを作成します。 |
| `profile use` | `--shell <shell>, --json, --output <format>` | 既存プロファイルを有効にするシェルコードを出力します。 |
| `profile run` | なし | 子プロセスに `OMA_PROFILE` を設定して 1 つのコマンドを実行します。 |
| `retro` | `--interactive, --compare, --json, --output <format>` | メトリクスと傾向を含むエンジニアリング振り返りです。 |
| `recap` | `--window <period>, --date <date>, --tool <tools>, --top <n>, --sort <metric>, --mermaid, --graph, --json, --output <format>` | AI ツールの会話履歴を振り返ります。 |
| `docs` | なし | ドキュメントのずれを検出し、変更の影響を受ける docs の参照を確認して更新候補を提案します。 |
| `docs verify` | `--json, --report-file <path>, --no-urls, --urls-sync` | docs から L2 参照を抽出し、壊れたリンク先を報告します。`docs/generated/doc-refs.json` を再生成します。終了コードは 0 が正常、1 が壊れた参照ありです。URL の確認は `lychee` に委譲します。 |
| `docs sync` | `--json` | Git 差分を受け取り、変更ファイルを参照する docs を一覧表示します。ホスト LLM が差分とともに読み、SKILL.md の契約に沿うパッチを提案します。CLI は docs を自動編集しません。既定の差分範囲は `--cached`、代替は `HEAD~1..HEAD` です。 |
| `docs i18n` | `--json, --min-severity <level>` | 英語の原文 docs と `web/i18n/{lang}/...` の翻訳のずれを検出します。行数、見出し数、最終コミット時刻を構造シグナルとして報告します。翻訳は編集しません。 |
| `docs lint` | `--json, --locales <list>` | 翻訳 docs の内容上のアンチパターンを検査します。`oma docs i18n` の構造検査を補完し、CJK の長いダッシュなどを報告します。自動修正は行いません。 |
| `emit` | `--target <target>, --output-dir <path>, --json, --output <format>` | .agents の SSOT から仕様準拠の成果物（Agent Skills、Agent Plugins、Claude Code プラグインマーケットプレイス、AGENTS.md、cli/ 対象ベンダー docs）を出力します。 |
| `cleanup` | `--dry-run, -y, --yes, --json, --output <format>` | 孤立したサブエージェントプロセスと一時ファイルをクリーンアップします。 |
| `bridge` | `--context <name>` | MCP stdio をオンデマンドで起動するプロジェクト共有 Serena サーバーへプロキシします。 |
| `verify` | なし | サブエージェント出力（backend/frontend/mobile/qa/debug/pm）を検証するか、キーワード検出のトリガー精度を測定します。 |
| `verify agent` | `-w, --workspace <path>, --json, --output <format>` |  |
| `verify triggers` | `--corpus <path>, --max-false-fire <pct>, --max-missed-fire <pct>, --json, --output <format>` | ラベル付きプロンプトコーパスに対するキーワード検出のトリガー精度を測定します。 |
| `vault` | なし | OS キーチェーン（macOS Keychain、Linux Secret Service、Windows Credential Manager）で API キーと秘密情報を管理します。 |
| `vault store` | `--value <value>` | `<name>` に秘密情報を対話式入力で保存します。 |
| `vault get` | なし | 保存値を装飾なしで標準出力へ出します。 |
| `vault list` | `--json` | 保存された秘密情報の名前を一覧表示します。値は表示しません。 |
| `vault delete` | なし | キーチェーンとインデックスから秘密情報を削除します。 |
| `star` | なし | GitHub で oh-my-agent にスターを付けます。 |
| `visualize` | `--focus <node-or-path>, --affected <paths...>, --json, --output <format>` | プロジェクト構造を依存グラフとして可視化します。 |
| `search` | なし | fetch、meta、rss、media、trust、code を扱う検索プリミティブです。 |
| `search providers` | `--json, --pretty` | ネットワーク接続なしで登録済み検索プロバイダーと選択結果を確認します。 |
| `search web` | `--provider <id>, --limit <n>, --timeout <duration>, --json, --pretty` | 選択した Web プロバイダーで検索します。Brave には CLI アダプターがあります。 |
| `search fetch` | `--only <strategies>, --skip <strategies>, --include-archive, --timeout <duration>, --locale <value>, --pretty` | 段階的に昇格する戦略パイプラインで URL を取得します。 |
| `search meta` | `--timeout <duration>, --locale <value>, --pretty` | URL から OGP / JSON-LD / Schema.org メタデータを抽出します。 |
| `search media` | `--subs, --sub-lang <list>, --format <spec>, --timeout <duration>, --pretty` | yt-dlp（1858 サイト）でメディアメタデータを抽出します。 |
| `search archive` | `--timeout <duration>, --locale <value>, --pretty` | AMP / archive.today / Wayback 経由で取得します。 |
| `search trust` | `--pretty` | ドメインの信頼レベルまたはスコアを解決します。 |
| `search code` | `--host <github\|gitlab>, --language <lang>, --repo <owner/repo>, --limit <n>, --pretty` | gh / glab 経由でコードを検索します。 |
| `search doctor` | なし | 依存関係（Chrome、python3 curl_cffi、yt-dlp、gh）を確認します。 |
| `search api` | なし |  |
| `search api fetch` | `--timeout <duration>, --locale <value>, --pretty` | 一致したプラットフォーム API 経由で取得します（Phase 0）。 |
| `search api search` | `--platforms <list>, --timeout <duration>, --locale <value>, --pretty` | 対応するプラットフォームへキーワード検索を分散します。 |
| `search rss` | なし |  |
| `search rss fetch` | `--timeout <duration>, --locale <value>, --pretty` | URL の RSS/Atom フィードを検出して解析します。 |
| `search rss google` | `--locale <value>` | クエリ用の Google News RSS URL を組み立てます。 |
| `harness` | なし | 分離したリポジトリタスクに対して OMA ハーネスのオーバーレイを評価します。 |
| `harness eval` | `--suite <path>, --candidate <path>, --mock, --live, --record, --record-file <path>, --yes, --timeout <duration>, --require-coverage, --json, --output <format>` | 候補の `.agents` オーバーレイを現在のベースラインと比較します。 |
| `slide` | なし | 1920×1080 の HTML スライドデッキを作成、検証、エクスポート、編集するツールキットです。 |
| `slide validate` | `--workspace <path>, --output <format>, --slide <file>, --report-file <path>` | puppeteer-core でスライドをレンダーし、はみ出し、重なり、フォントサイズを確認する幾何品質ゲートです。 |
| `slide bundle` | `--workspace <path>, --output-file <path>, --inline-fonts` | スライド単位のファイルを単一の自己完結 `.html` 成果物へまとめます。 |
| `slide edit` | `--workspace <path>, --port <n>` | ブラウザーの bbox エディターを開き、127.0.0.1 の node:http サーバーから oma のエージェントランナーへ送ります。 |
| `slide doctor` | なし | 必須依存（chrome、puppeteer-core）と任意依存（yt-dlp、pptxgenjs）を確認します。 |
| `slide create` | `--output-dir <path>, --force` | スターター HTML、assets/、meta.json を含む新しいスライド作業ディレクトリを作成します。 |
| `slide preview` | `--workspace <path>` | viewer.html（deck-stage Web コンポーネントと speaker-notes パネル、`n` で切替）を作成します。 |
| `slide export` | なし |  |
| `slide export pdf` | `--workspace <path>, --output-file <path>, --mode <mode>` | puppeteer-core でスライドを PDF にエクスポートします。 |
| `slide export png` | `--workspace <path>, --output-dir <path>, --resolution <res>` | puppeteer-core で各スライドを PNG 画像としてエクスポートします。 |
| `slide export pptx` | `--workspace <path>, --output-file <path>` | 実験的に pptxgenjs で PPTX にエクスポートします。ラスター方式で、グラデーションもラスター化します。 |
| `slide import` | なし |  |
| `slide import pptx` | `--workspace <path>` | officeparser（bunx、ベストエフォート）で `.pptx` をスライド断片へ取り込みます。 |
| `slide asset` | なし |  |
| `slide asset fetch-video` | `--workspace <path>, --output-name <name>` | yt-dlp で動画を ./assets/ にダウンロードし、ローカル参照を出力します。 |
| `slide style` | なし | デザインスタイルのプリセットを閲覧して取得します。 |
| `slide style list` | なし | 利用可能なスタイルプリセット（同梱版と bold-template インデックス）を一覧表示します。 |
| `slide style preview` | なし | ターミナルでスタイルプリセットをプレビューします。 |
| `slide style get` | `--refresh` | bold template の design.md を取得します。main は常に最新で、オフライン時はキャッシュを使います。 |
| `scholar` | なし | Knows.academy の論文 sidecar（OpenAlex と Semantic Scholar のフォールバック）を扱います。 |
| `scholar search` | `--limit <n>, --year-min <year>, --always-fallback` | Knows.academy、OpenAlex、Semantic Scholar の順で論文を検索します。 |
| `scholar resolve` | なし | Knows.academy、OpenAlex、Semantic Scholar から最適な論文候補を探します。 |
| `scholar get` | `--section <name>` | sidecar（Knows の record_id）または研究メタデータ（W-id、DOI、arXiv:<id>、CorpusId:<n>、S2 paperId）を取得します。 |
| `scholar lint` | `--lenient, --fail-on-warning` | .knows.yaml または .knows.json sidecar（v0.9.0）を検証します。 |
| `image` | なし | 認証を考慮した並列ディスパッチでマルチベンダー AI 画像生成を行います。 |
| `image generate` | `--vendor <name>, --size <size>, --quality <level>, -n, --count <n>, --output-dir <path>, --allow-external-output, --model <name>, --timeout <duration>, -r, --reference <path>, -y, --yes, --no-prompt-in-manifest, --dry-run, --output <format>` | pollinations（flux/zimage、無料）、codex（gpt-image-2、ChatGPT OAuth）、antigravity（`agy` CLI 経由の gemini nano-banana）で画像を生成します。 |
| `image doctor` | `--output <format>` | ベンダーごとの認証とインストール状態を確認します。 |
| `image vendor` | なし |  |
| `image vendor list` | `--output <format>` | 登録済みベンダーと対応モデルを一覧表示します。 |
| `video` | なし | 短編、解説、デモ動画を生成します。 |
| `video generate` | `--mode <mode>, --aspect <aspect>, --locale <lang>, --captions <style>, --visual <mode>, --voice <profile>, --music <mode>, --duration <sec>, --compositor <name>, --capture <path>, --source <kind>, --url <url>, --device <name>, --ready-selector <css>, --show-cursor, --polish, --capture-timeout <sec>, --capture-stop <mode>, --output-dir <path>, --allow-external-output, --max-usd <n>, --seed <n>, --timeout <duration>, -y, --yes, --dry-run, --script <path>, --output <format>, --no-brief-in-manifest` | brief から動画の実行ディレクトリを生成します。 |
| `video doctor` | `--output <format>, --install, --upgrade, --install-mpt, --install-strudel` | 動画プロバイダーと compositor の準備状況を確認します。 |
| `video compose` | `--output <format>, --refresh, --offline` | 最新ツールチェーンと remotion-dev/skills を使って実行用 Remotion プロジェクトを作成し、作成規約を表示します。 |
| `video render` | `--output <format>` | render-spec.json から実行ディレクトリを再レンダーします。 |
| `video provider` | なし |  |
| `video provider list` | `--output <format>` | 動画プロバイダーと利用可能性を一覧表示します。 |
| `serena` | なし | Serena MCP 言語サーバーのライフサイクルユーティリティです。 |
| `serena reap` | `--dry-run, --quiet` | アイドル状態の Serena LSP 子プロセスを終了してメモリーを回収します。Serena は次のツール呼び出しで自己修復します。 |
| `serena reaper` | なし |  |
| `serena reaper enable` | `--dry-run` | 5 分ごとに動く Serena Reaper の定期タスクをインストールします。 |
| `serena reaper disable` | `--dry-run` | Serena Reaper の定期タスクをアンインストールします。 |
| `explain` | なし | 説明成果物の管理と品質検証ツールを扱います。 |
| `explain validate` | `--input-dir <path>, --output <format>, --report-file <path>, --json` | 自己完結した explain HTML レポート成果物を検証します。 |
| `diagram` | なし | ダイアグラムエンジンのヘルパー（archify の対話型 HTML または Mermaid フォールバック）です。 |
| `diagram resolve` | `--engine <engine>, --refresh, --offline, --json, --output <format>` | ワークフローが使うダイアグラムエンジンと archify の場所を報告します。 |
| `diagram update` | `--json, --output <format>` | 最新の archify リリースを oma の管理キャッシュへダウンロードします。 |
| `diagram archify` | なし | インストール済み archify CLI（doctor \| guide \| validate \| deliver \| visual-check …）を、更新チェックを無効にして実行します。 |
| `help` | なし | ヘルプ情報を表示します。 |
| `version` | なし | バージョン番号を表示します。 |
| `dashboard` | なし |  |
| `dashboard terminal` | なし | ターミナルダッシュボードを起動します。エージェントをリアルタイムで監視します。 |
| `dashboard web` | なし | http://127.0.0.1:9847 で Web ダッシュボードを起動します。 |
| `auth` | なし |  |
| `auth status` | `--json, --output <format>` | 対応するすべての CLI の認証状態を確認します。 |
| `hook` | なし |  |
| `hook run` | `--vendor <v>, --event <e>, --matcher <m>` | 中央の oma hook ルーター（design 019）経由でベンダーフックイベントをディスパッチします。 |
| `hook probe` | `--vendor <list>, --output <format>, --hooks-dir <dir>` | ベンダーごとの L1 フック互換性を調べ、マトリクス（D63）を表示します。 |
| `state` | なし |  |
| `state emit` | `--session-id <id>, --category <category>, --vendor <vendor>, --vendor-sid <vendorSid>, --parent-event-id <eventId>, --causality-key <key>, --ts <iso>, --no-mirror, --json, --output <format>` | OMA L1 ワークフローイベントを追加します。 |
| `state migrate` | `--include-active, --dry-run, --json, --output <format>` | 従来のセッションをホームプロファイルへ移し、検証済みの元データを削除します。 |
| `state get` | `--json, --output <format>` | ID で OMA L1 セッションを 1 件確認します。 |
| `state list` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | OMA L1 ワークフロー状態を確認します。 |
| `state repair` | `--dry-run, --json, --output <format>` | OMA L1 ワークフロー状態ファイルを修復します。 |
| `state verify` | `--workflow <workflow>, --checkpoint <checkpoint>, --session-id <id>, --category <category>, --no-emit-missing, --json, --output <format>` | ワークフローのチェックポイントに必要な L1 イベントを検証します。 |
| `state decisions` | なし |  |
| `state decisions list` | `--json, --output <format>` | 必須の L1 decision.made チェックポイントを一覧表示します。 |
| `state inject-log` | なし |  |
| `state inject-log list` | `--entry <file>, --json, --output <format>` | 境界ごとの inject 監査ログ（D52）を一覧表示または表示します。 |
| `state inject-log get` | `--json, --output <format>` | 境界ごとの inject 監査ログ（D52）を一覧表示または表示します。 |
| `state summary` | `--category <category>, --json, --output <format>` | セッション概要を調整ストアへエクスポートします。 |
| `state heal-check` | `--agent <agentType>, --json, --output <format>` | エージェントの自己修復が許可されているか確認します。 |
| `state activate` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | OMA L1 ワークフロー状態を確認します。 |
| `state archive` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | OMA L1 ワークフロー状態を確認します。 |
| `state purge` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | OMA L1 ワークフロー状態を確認します。 |
| `ralph` | なし |  |
| `ralph verify` | `--session-id <id>, --newer-than <iso>, --no-emit, --json, --output <format>` | ralph EXEC 成果物を検証します。迂回防止ゲートは ralph.md Step 1.3 にあります。 |
| `goal` | なし |  |
| `goal set` | `--workflow <name>, --session-id <id>, --gate <keyword>, --budget-minutes <n>, --description <text>, --json, --output <format>` | 決定的な停止ゲートと実時間予算の目標契約を、アクティブな永続ワークフローに付与します。 |
| `stats` | なし |  |
| `stats get` | `--json, --output <format>` | 生産性メトリクスを表示します。 |
| `stats reset` | `--json, --output <format>` | 生産性メトリクスを表示します。 |
| `agent` | なし |  |
| `agent context` | `--project-root <path>, --difficulty <level>` | グラフで選択したコンテキストをネイティブディスパッチ用プロンプトに読み込みます。 |
| `agent resume` | `--project-root <path>, --dry-run, --max-attempts <count>` | 現在の受け入れ証拠を再利用して、安全に未完了タスクを再開します。 |
| `agent begin` | `--project-root <path>, -w, --workspace <path>` | 証拠に基づくネイティブエージェント実行を開始します。 |
| `agent verify` | `--project-root <path>, --required, --affected <paths...>` | `--` の後にある検証 argv を実行し、実際の終了コードを記録します。 |
| `agent finish` | `--project-root <path>` | 検証の受領情報に照らしてネイティブエージェント結果を確認します。 |
| `agent spawn` | `--resumed-from <run-id>, --fallback-vendors <vendors>, --task-id <id>, --vendor <vendor>, -w, --workspace <path>, --isolation <mode>, --read-only` | インラインテキストまたはファイルパスのプロンプトでサブエージェントを起動します。 |
| `agent status` | `--project-root <path>` | サブエージェントの状態を確認します。 |
| `agent parallel` | `--session-id <id>, --vendor <vendor>, -i, --inline, --no-wait` | 複数のサブエージェントを並列実行します。 |
| `agent review` | `--vendor <vendor>, -p, --prompt <prompt>, -w, --workspace <path>, --no-uncommitted` | 外部 CLI（codex/claude/qwen/grok）でコードレビューを実行します。 |
| `model` | なし |  |
| `model check` | `--json, --fail-on-drift, --owner <name>, --probe` | モデルレジストリを稼働中のベンダーモデル一覧と照合します。 |
| `model probe` | `--json, --timeout <duration>` | モデルスラッグをベンダー CLI に渡し、受け付けられるか確認します。 |
| `model propose` | `--json, --owner <name>, --write, --timeout <duration>` | 内部で model:check --probe を実行し、受理された候補の oma-config `models:` パッチを生成します。 |
| `memory` | なし |  |
| `memory keys` | `--kind <kind>, --profile <name>, --key-env <name>, --from-env <name>, --dry-run, --json, --output <format>` | Honcho 接続またはローカル埋め込み認証情報を設定します。 |
| `memory init` | `--force, --json, --output <format>` | `.agents/state/memories` に調整ストアを初期化します。 |
| `memory setup` | `--endpoint <url>, --port <port>, --install, --start, --dry-run, --json, --output <format>` | AgentMemory エンドポイント設定を準備します。 |
| `memory daemon` | なし | OMA 所有の AgentMemory デーモンプロセスを管理します。 |
| `memory daemon status` | `--json, --output <format>` | デーモンの状態を表示します。 |
| `memory daemon start` | `--port <port>, --dry-run, --json, --output <format>` | AgentMemory をバックグラウンドで起動します。 |
| `memory daemon stop` | `--dry-run, --json, --output <format>` | OMA 所有の AgentMemory デーモンを停止します。 |
| `memory daemon restart` | `--port <port>, --dry-run, --json, --output <format>` | OMA 所有の AgentMemory デーモンを再起動します。 |
| `memory service` | なし | AgentMemory の OS サービス連携を管理します。 |
| `memory service install` | `--port <port>, --dry-run, --json, --output <format>` | AgentMemory の launchd/systemd サービス連携をインストールします。 |
| `memory service uninstall` | `--dry-run, --json, --output <format>` | AgentMemory の launchd/systemd サービス連携をアンインストールします。 |
| `memory status` | `--json, --output <format>` | 選択した semantic-memory プロバイダーの健全性を表示します。 |
| `memory retry` | なし |  |
| `memory retry drain` | `--dry-run, --json, --output <format>` | キューに入った AgentMemory observe 再試行を排出します。 |
| `memory import` | `--source <source>, --since <since>, --dry-run, --force-partial, --json, --output <format>` | ベンダーの会話履歴を AgentMemory にインポートします。 |
| `memory maintain` | `--keep <count>, --dry-run, --json, --output <format>` | AgentMemory のローカルストレージを保守します。対象は backup、prune、vacuum です。 |
| `memory maintain backup` | `--keep <count>, --dry-run, --json, --output <format>` | AgentMemory のローカルストレージをバックアップします。 |
| `memory maintain prune` | `--keep <count>, --dry-run, --json, --output <format>` | AgentMemory のローカルストレージから古いデータを整理します。 |
| `memory maintain vacuum` | `--keep <count>, --dry-run, --json, --output <format>` | AgentMemory のローカルストレージを vacuum します。 |
| `memory gc` | `--scope <scope>, --keep <count>, --max-age <duration>, --dry-run, --json, --output <format>` | プロジェクトローカルメモリーを GC します。古い L1 セッションと一時的な Serena ファイルを整理します。 |
| `memory upgrade` | `--port <port>, --dry-run, --json, --output <format>` | AgentMemory を停止、バックアップ、アップグレード、再起動し、健全性を確認します。 |
| `skill` | なし | インストール済みスキルを確認および監査します。 |
| `skill audit` | `--json, --output <format>` | インストール済みスキル間の frontmatter 説明の類似度を確認します。 |
| `skill lint` | `--skill <id>, --json, --output <format>` | スキル単位の作成上の問題（frontmatter、構造、壊れた参照）を検出します。 |
| `skill eval` | `--skill <id>, --mock, --live, --record, --yes, --task-dir <path>, --max-tasks <n>, --require-coverage, --neg-transfer, --json, --output <format>` | 保留したタスクで処置とベースラインを比較し、スキル単位の有用性向上を測定します。 |
| `skill optimize` | `--skill <id>, --dry-run, --apply, --mock, --live, --max-epochs <n>, --edits-per-epoch <k>, --lr <chars>, --yes, --json, --output <format>` | 測定した保留タスクの有用性向上を最大化するよう SKILL.md を最適化します。 |
| `schedule` | なし |  |
| `schedule create` | `--cron <expr>, --every <phrase>, --vendor <vendor>, -w, --workspace <path>, --once, --expires-after <duration>, --env <keys>, --dry-run, --accept-rounded` | スケジュール実行するエージェントジョブを登録します。 |
| `schedule list` | `--json, --output <format>` | OS とのドリフト状態（synced/missing-in-os/orphan-in-os）付きで、プロジェクトごとにスケジュールジョブを一覧表示します。 |
| `schedule delete` | なし | マニフェストと OS スケジューラーからスケジュールジョブを削除します。 |
| `schedule run` | なし | OS スケジューラーが呼び出すスケジュールジョブを ID で実行します。通常は直接呼び出しません。 |
| `schedule sync` | `--prune` | マニフェストを OS スケジューラーへ再同期します。`--prune` で孤立した OS ジョブを削除できます。 |
