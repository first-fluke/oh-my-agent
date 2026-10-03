---
title: インストール
sidebar_label: インストール
description: oh-my-agent のインストール方法、スキルとプロバイダーの選択、作成されるプロジェクトファイル、モデルとランタイムのデフォルト、`oma doctor` による設定確認を説明します。
---

# インストール

## 前提条件

- **AI 搭載 IDE または CLI**: Claude Code、Codex CLI、Qwen Code、Antigravity CLI（`agy`）、Cursor、OpenCode、Kimi Code CLI、Kiro、CommandCode、pi、GitHub Copilot、Hermes など、サポート対象のホストを少なくとも1つ
- **bun**: JavaScript ランタイム兼パッケージマネージャー。ない場合はインストールスクリプトが自動で導入します。
- **uv**: Python パッケージマネージャー。ない場合はブートストラップスクリプトが導入を提案します。
- **コードインテリジェンスプロバイダー**: デフォルトは Serena です。プロバイダー設定で選択すれば Gortex も使えます。インストーラーは `uv tool install` で Serena を導入できます。任意の依存関係が利用できなくても、警告を出して処理を続けます。Gortex を選択している場合、プロジェクトモードの `oma install` と `oma update` は、まだ追跡されていないプロジェクトを Gortex デーモンに登録します（`gortex track`）。あわせて、OMA が生成するディレクトリを、Gortex CLI 経由でそのプロジェクトの除外リストに追加します。プロジェクトツリーには何も書き込みません。Gortex 自体は別途インストールする必要があります。

インストーラーは統合を機能別に扱います。フックベンダーは Antigravity、Claude、Codex、CommandCode、Cursor、Grok、Kimi、Kiro、Qwen です。OpenCode と pi は拡張ブリッジを使い、GitHub Copilot と Hermes にはスキルリンクを作り、ZCode にはワークフローコマンドを渡します。複数のベンダーを選べますが、最初のタスクに必要なのは使う予定のホストだけです。

---

## 方法0: skills CLI（スキルだけなら最速）

検出したエージェントランタイムに OMA スキルパックをインストールします。

```bash
npx skills add first-fluke/oh-my-agent
```

フルハーネスなしでスキルだけを使いたい場合に、最も手軽な導入方法です。ワークフロー、ルール、フック、ゲート、`oma agent spawn` が必要な場合は、下の方法1または方法2を使ってください。

## 方法1: ワンライナーインストール（フルハーネス）

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

2つのブートストラップスクリプトは同じように動作します。
1. プラットフォーム（macOS、Linux、Windows）を検出します。
2. bun と uv を確認し、選択した場合は Serena も確認します。ないものはインストールします。
3. プリセットとプロバイダーを選ぶ対話式インストーラーを起動します。
4. 選択したスキルと設定を含む `.agents/` を作成します。
5. 検出したベンダーにランタイム統合層（フック、シンボリックリンク、設定）を設定します。
6. コードインテリジェンスとメモリの MCP サーバーを設定します。

任意の依存関係で失敗してもブートストラップは処理を続け、後で実行するコマンドを表示します。インストーラーが終わったら `oma doctor` を実行してください。

---

## 方法2: bunx による手動インストール

```bash
bunx oh-my-agent@latest
```

このコマンドは依存関係のブートストラップなしで対話式インストーラーを起動します。事前に bun をインストールしてください。

インストーラーでスキルプリセットを選びます。現在のプリセットは `cli/constants/skill-data.ts` で定義されています。

### プリセット

| プリセット | 含まれるスキル |
|--------|----------------|
| **all** | 現在の33個のスキルパッケージすべて |
| **fullstack** | アーキテクチャ、ブレインストーミング、デザイン、フロントエンド、バックエンド、モバイル、データベース、PM、QA、デバッグ、SCM、Terraform、開発ワークフロー |
| **fullstack-web** | フルスタック Web 実装、アーキテクチャ、デザイン、PM、QA、デバッグ、SCM、開発ワークフロー |
| **fullstack-mobile** | モバイル中心のフルスタック実装、アーキテクチャ、デザイン、PM、QA、デバッグ、SCM、開発ワークフロー |
| **frontend** | アーキテクチャ、ブレインストーミング、デザイン、フロントエンド、PM、QA、デバッグ、SCM |
| **backend** | アーキテクチャ、ブレインストーミング、バックエンド、データベース、PM、QA、デバッグ、SCM、開発ワークフロー |
| **mobile** | アーキテクチャ、ブレインストーミング、モバイル、PM、QA、デバッグ、SCM |
| **devops** | アーキテクチャ、ブレインストーミング、Terraform、開発ワークフロー、オブザーバビリティ、PM、QA、デバッグ、SCM |
| **research** | Scholar、Market、PDF、HWP、Academic Writing、Search、Translation、SCM |
| **content** | Design、Image、Voice、Academic Writing、Translation、SCM |

プリセットはスキルのまとまりです。スキルごとにサブエージェント定義を1つ作るものではありません。`all` プリセットは実行時のスキルレジストリから展開されるため、リポジトリに追加されたスキルも一覧に反映されます。ドメインプリセットには、その用途に必要なスキルだけが含まれます。

共有リソース（`_shared/`）はプリセットに関係なく常にインストールされます。コアルーティング、コンテキスト読み込み、プロンプト構造、ベンダー検出、実行プロトコル、メモリプロトコルが含まれます。

### 作成されるもの

インストール後、プロジェクトには次のファイルとディレクトリができます。

```
.agents/
├── oma-config.yaml # Your preferences
├── oma-config.cue # Optional schema-backed configuration
├── skills/
│ ├── _shared/ # Shared resources (always installed)
│ │ ├── core/ # skill-routing, context-loading, etc.
│ │ ├── runtime/ # memory-protocol, execution-protocols/
│ │ └── conditional/ # quality-score, experiment-ledger, etc.
│ ├── oma-frontend/ # Per preset
│ │ ├── SKILL.md
│ │ └── resources/
│ └── ... # Other selected skills
├── workflows/ # Current workflow definitions (21 in this checkout)
├── agents/ # Subagent definitions
├── mcp.json # MCP server configuration
├── results/ # Plans and agent results (populated by workflows)
└── state/ # Persistent workflow and coordination state

.claude/
├── settings.json # Vendor settings, when Claude Code is selected
├── hooks/oma-hook.sh # Generated wrapper for the in-process hook chain
├── hooks/hud.ts # Optional [OMA] statusline indicator
├── skills/ # Symlinks → .agents/skills/
└── agents/ # Generated native subagent files, when supported

.agents/state/memories/
└── ... # Runtime coordination state
```

インストーラーは、選択したホストのベンダーディレクトリだけを作成します。フックのソースは `.agents/hooks/core/` に残り、ベンダー側に生成されるファイルは統合の出力です。古いプロジェクトでは、Serena が従来の `.serena/memories/` ディレクトリを使う場合もあります。

---

## 方法3: グローバルインストール

ダッシュボード、エージェントのスポーン、診断など CLI レベルで使う場合は、oh-my-agent をグローバルにインストールします。

### Homebrew (macOS/Linux)

```bash
brew install oh-my-agent
```

### npm / bun グローバル

```bash
bun install --global oh-my-agent
# or
npm install --global oh-my-agent
```

これで `oma` コマンドがグローバルにインストールされ、どのディレクトリからでも CLI コマンドを実行できます。

```bash
oma doctor # Health check
oma doctor --profile # Show resolved model/CLI per dispatch role
oma dashboard terminal # Terminal monitoring
oma dashboard web # Web dashboard at http://localhost:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update oh-my-agent
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # MCP stdio ↔ Streamable HTTP bridge
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives (alias: `oma s`)
oma image # Multi-vendor AI image generation (alias: `oma img`)
oma video # Video generation and capture
oma slide # Presentation generation and export
oma export # Export skills for external IDEs (e.g. cursor)
oma star # Star the repository
```

`oma` は `oh-my-agent` の短縮名です。どちらも CLI コマンドとして使えます。

---

## AI CLI ツールのインストール

少なくとも1つの AI CLI ツールをインストールしてください。oh-my-agent は複数のベンダーをサポートしており、エージェントと CLI のマッピングを使って、エージェントごとに異なる CLI を選べます。

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# or
npm install --global @anthropic-ai/claude-code
```

初回実行時に認証が自動で行われます。Claude Code はフックと設定に `.claude/` を使い、`.agents/skills/` からスキルをシンボリックリンクします。

### Codex CLI

```bash
bun install --global @openai/codex
# or
npm install --global @openai/codex
```

インストール後、`codex login` を実行して認証します。

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

インストール後、CLI 内で `/auth` を実行して認証します。

### Antigravity CLI (`agy`)

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

初回実行時の認証は `agy` が処理します。バイナリ名は `agy` です。ヘッドレス環境では、代わりに `ANTIGRAVITY_API_KEY` 環境変数を設定します。`oma doctor` は `~/.gemini/antigravity-cli/cache/onboarding.json` から認証状態を報告します。

---

## oma-config.yaml

`oma install` コマンドは `.agents/oma-config.yaml` を作成します。これは oh-my-agent 全体の動作を設定する中心ファイルです。

```yaml
# Required
language: en
model_preset: auto          # follows the current runtime's native model settings

# Optional — date/time preferences
date_format: ISO
timezone: Australia/Sydney  # omit to use the system timezone

# Optional — auto-update the CLI in background
auto_update_cli: true
telemetry: false

# Optional — capability providers (defaults are context7/native/serena/agentmemory)
# providers:
#   docs: context7
#   web: native
#   code_intelligence: serena
#   code_intelligence_guard: block   # deny native Grep/Glob/rg while serena is configured (off to disable)
#   semantic_memory: agentmemory

# Optional — browser DevTools MCP. Omit to preserve the current setup.
# mcp:
#   devtools_browsers: [aside]

# Optional — partial override per agent (object-only, shallow merge)
agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }

# Optional — user-defined model slugs
# models:
#   my-fast:
#     cli: antigravity
#     cli_model: "Gemini 3.6 Flash (Medium)"
#     supports: { thinking: true }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-5.5, effort: high }
```

### フィールドリファレンス

| フィールド | 型 | 必須 | 説明 |
|-------|------|-------------|-------------|
| `language` | string | はい | 応答言語コード。en、ko、ja、zh、es、fr、de、pt、ru、nl、pl に対応します。 |
| `model_preset` | string | はい | アクティブなプリセットキー。`auto` は現在のランタイムに従います。固定キーには `free`、`antigravity`、`claude`、`codex`、`qwen`、`cursor`、`kiro`、`mixed` があります。カスタムプリセットキーも使えます。[エージェント別モデル](../guide/per-agent-models.md)を参照してください。 |
| `default_cli` | string | いいえ | 明示的なエージェント設定と選択したプリセットでベンダーが決まらないとき、`oma agent spawn` が使うフォールバック CLI です。 |
| `free` | map | いいえ | `model_preset: free` のときに使う FreeLLMAPI ゲートウェイ設定です。API キーは環境変数に置いてください。 |
| `providers` | map | いいえ | 機能プロバイダーです。`code_intelligence`（`serena` または `gortex`）、`code_intelligence_guard`（`block` または `off`）、`docs`（`context7`）、`web`（`native` または `brave`）、`semantic_memory`（`agentmemory`、`honcho`、`none`）を指定します。 |
| `date_format` | string | いいえ | タイムスタンプ形式（`ISO`、`US`、`EU`）。デフォルトは `ISO` です。 |
| `timezone` | string | いいえ | タイムゾーン識別子（例: `Asia/Seoul`）。省略するとホストのシステムタイムゾーンを使います。 |
| `auto_update_cli` | boolean | いいえ | 通常の CLI チェックでバックグラウンド更新を許可するかどうか。デフォルトは `true` で、`false` にすると無効になります。 |
| `telemetry` | boolean | いいえ | ベンダーのテレメトリーを許可するかどうか。デフォルトは `false` です。 |
| `agents` | map | いいえ | エージェントごとの部分オーバーライド（オブジェクト型の `AgentSpec`）。プリセットのデフォルトに浅くマージします。 |
| `models` | map | いいえ | ユーザー定義のモデルスラッグ。以前は `models.yaml` に置かれていました。 |
| `custom_presets` | map | いいえ | ユーザー定義のプリセット。組み込みプリセットから部分的に継承する `extends:` に対応します。 |
| `mcp.devtools_browsers` | list | いいえ | DevTools MCP で使うブラウザー。`aside`、`chrome`、`firefox` を指定できます。省略すると既存の設定を保持し、`[]` はブラウザーサーバーを明示的に無効にします。 |
| `serena.mode` | string | いいえ | `bridge` はプロジェクトの Serena サーバーを共有するデフォルトです。`stdio` を選ぶとセッションごとに1プロセス起動します。 |
| `serena.auto_update` | boolean | いいえ | `oma update` で Serena を更新するかどうか。デフォルトは `true` です。 |

> **設定形式:** 有効な `.agents/oma-config.cue` は共有設定として評価されます。共有 CUE の評価に失敗すると、ローダーは `.agents/oma-config.yaml` にフォールバックできます。ローカルオーバーレイ（`oma-config.local.cue` または `.yaml`）は任意ですが、無効なローカル指定は致命的なエラーになります。`OMA_MODEL_PRESET` は現在のプロセスに対してファイルの値を上書きします。

### ベンダー解決

エージェントをスポーンするとき、CLI は `agents.<id>`、選択した `model_preset`、プリセットのオーケストレーター用フォールバック、`default_cli` の順で設定を解決します。`model_preset: auto` では現在のランタイムのネイティブ設定がモデルを決めます。ランタイムが不明なら `default_cli` にフォールバックします。完全な対応表は[エージェント別モデル](../guide/per-agent-models.md)を参照してください。

---

## 検証: `oma doctor`

インストールと設定の後、次のコマンドで動作を確認します。

```bash
oma doctor
```

このコマンドは次を確認します。
- 選択したホスト CLI がインストールされ、実行できること。任意ツールは別に報告されます。
- 設定した MCP サーバーのエントリが有効であること（Serena、Gortex、Context7、DevTools など）。
- 有効な SKILL.md フロントマターを持つスキルファイルが存在すること。
- シンボリックリンクとフックスクリプトが有効な対象を指すこと。
- ベンダー設定ファイルでフックが正しく設定されていること。
- 選択したコードインテリジェンスとメモリのプロバイダーに到達できること（Gortex の場合は、現在のプロジェクトがデーモンの追跡対象に含まれているかも確認します）。
- `oma-config.cue` または `oma-config.yaml` が必須フィールドを含む有効な設定であること。

問題がある場合、`oma doctor` は欠落または無効な項目を特定し、最初のタスクを止める問題と任意の統合に関する警告を分けて表示します。

すべてのエージェントで解決されたモデルと CLI を確認するには、次を実行します。

```bash
oma doctor --profile
```

完全な対応表と移行の詳細は[エージェント別モデル](../guide/per-agent-models.md)を参照してください。

---

## 更新

### CLI の更新

```bash
oma update
```

これでグローバルの oh-my-agent CLI が最新バージョンに更新されます。

### プロジェクトスキルの更新

プロジェクトのスキルとワークフローは、自動更新用 GitHub Action（`action/`）またはインストーラーの再実行で更新できます。

```bash
bunx oh-my-agent@latest
```

インストーラーは既存のインストールを検出し、`oma-config.yaml` とカスタム設定を保持したまま更新を提案します。

---

## 次のステップ

選択した AI IDE または CLI でプロジェクトを開き、oh-my-agent を使い始めます。スキルのルーティングはホストに依存し、有効なフックはワークフローを検出できます。次を試してください。

```
"Build a login form with email validation using Tailwind CSS"
```

または、ワークフローコマンドを使います。

```
/plan authentication feature with JWT and refresh tokens
```

詳しい例は[使い方ガイド](/docs/guide/usage)を、各スペシャリストの役割は[エージェント](/docs/core-concepts/agents)を参照してください。
