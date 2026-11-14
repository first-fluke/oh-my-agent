---
title: インストール
sidebar_label: インストール
description: oh-my-agent のインストール方法、スキルとプロバイダーの選択、作成されるプロジェクトファイル、モデルとランタイムのデフォルト、`oma doctor` による設定確認を説明します。
---

# インストール

タスク 1 つだけなら、[単一スキル](./choose-setup.md#load-one-skill)から始めます。プロジェクトフックやチームワークフローが必要な場合は、以下のランタイムインストールを使います。[セットアップガイド](./choose-setup.md)では、指示の読み込み、スキルプリセット、Claude Code マーケットプレイス経由のインストールを区別して説明しています。

Grok Bot を使う場合は [Grok Bot インストールページ](/grok-bot/) を参照してください。ネイティブの **Add to Grok Bot** リンクは承認済みの Cursor Marketplace 掲載が必要なため、登録審査中は利用できません。Bot マシン向けの `oma install --target grok-bot` については、別途[手動インストールガイド](https://github.com/first-fluke/oh-my-agent/blob/main/integrations/grok-bot/README.md)で説明しています。下の Grok Build ランタイム統合は別のインストール対象です。

## AI エージェントでインストールする

コーディングエージェントに以下を貼り付けます。

```text
Install and configure oh-my-agent in this project by following this guide:
https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/docs/agent-install.md
```

[エージェントインストールガイド](https://github.com/first-fluke/oh-my-agent/blob/main/docs/agent-install.md)では、CLI の準備、非対話のプロジェクトセットアップ、`oma doctor` による確認を扱っています。

## 前提条件

- **AI 搭載 IDE または CLI**: Claude Code、Codex CLI、Qwen Code、Antigravity CLI（`agy`）、Cursor、OpenCode、Kimi Code CLI、Kiro、CommandCode、pi、GitHub Copilot、Hermes など、サポート対象のホストを少なくとも1つ
- **bun**: JavaScript ランタイム兼パッケージマネージャー。ない場合はインストールスクリプトが自動で導入します。
- **uv**: Python パッケージマネージャー。ない場合はブートストラップスクリプトが導入を提案します。
- **コードインテリジェンスプロバイダー**: デフォルトは Serena です。プロバイダー設定で選択すれば Gortex も使えます。インストーラーは `uv tool install` で Serena を導入できます。任意の依存関係が利用できなくても、警告を出して処理を続けます。Gortex を選択している場合、プロジェクトモードの `oma install` と `oma update` は、まだ追跡されていないプロジェクトを Gortex デーモンに登録します（`gortex track`）。あわせて、OMA が生成するディレクトリを、Gortex CLI 経由でそのプロジェクトの除外リストに追加します。プロジェクトツリーには何も書き込みません。Gortex 自体は別途インストールする必要があります。

インストーラーは統合を機能別に扱います。フックベンダーは Antigravity、Claude、Codex、CommandCode、Copilot、Cursor、Grok、Kimi、Kiro、Qwen です。OpenCode と pi は拡張ブリッジを使い、Hermes にはスキルリンクを作り、ZCode にはワークフローコマンドを渡します。複数のベンダーを選べますが、最初のタスクに必要なのは使う予定のホストだけです。

---

## 方法1: ワンライナーインストール

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
3. `oma` がまだ PATH にない場合は、`bun install --global oh-my-agent` で `oma` コマンドをグローバルにインストールします（フックとワークフローがこのコマンドを呼び出します）。
4. プリセットとプロバイダーを選ぶ対話式インストーラーを起動します。
5. 選択したスキルと設定を含む `.agents/` を作成します。
6. 検出したベンダーにランタイム統合層（フック、シンボリックリンク、設定）を設定します。
7. コードインテリジェンスとメモリの MCP サーバーを設定します。

任意の依存関係で失敗してもブートストラップは処理を続け、後で実行するコマンドを表示します。AgentMemory はデフォルトのセマンティックメモリプロバイダーです。そのインストール、起動、ヘルスチェックのいずれかに失敗すると、`oma install` と `oma update` は失敗します。`providers.semantic_memory: none` または `honcho` を選ぶか、`OMA_NO_AGENTMEMORY=1` を設定すると、AgentMemory の自動準備をスキップします。インストーラーが終わったら `oma doctor` を実行してください。

### インストーラーがデフォルトで行うこと {#what-the-installer-also-does-by-default}

- **Aside ブラウザ MCP**: 対話式セットアップであらかじめ選択されており、選択したままにした場合にのみ、未インストールなら `curl -fsSL https://releases.aside.com/install.sh | bash` でインストールされます。ブラウザ MCP のステップで、または後から `oma update mcp` で選択を外せます。
- **AgentMemory サービス**: `bun install -g @agentmemory/agentmemory` でインストールされ、ログインサービス（launchd、systemd ユーザーユニット、または Windows のスケジュールされたタスク）として登録されます。
- **CUE**: ブートストラップスクリプトが `brew install cue`（macOS/Linux）または `winget`（Windows）でインストールし、Serena がコードインテリジェンスプロバイダーの場合は `oma install` も再度インストールします。
- **プロジェクト外への書き込み**: `~/.claude.json`（プロジェクトを信頼済みの Claude Code ワークスペースとしてマーク）、`~/.serena/`（OMA コンテキスト、回答サイズの下限、プロジェクト登録）、`~/.cursor/cli-config.json`（Cursor のコミット attribution をオフ）、`~/.grok/config.toml`（テレメトリー）、`~/.gemini/antigravity-cli/`（HUD）で、いずれも選択したベンダーの分だけです。ホームディレクトリのベンダーフォルダー（Antigravity、Hermes、Kimi）にスキルをリンクする前には確認します。
- **テレメトリーのオプトアウト**: Claude の `DISABLE_TELEMETRY=1`（これで Claude Code の Remote Control もオフになります）と、Gemini、Qwen、Codex、Grok の使用統計が対象です。ベンダーのデフォルトを維持するには `telemetry: true` を設定してください。
- **Claude Code 設定**: `.claude/settings.json` の未設定のキーが補完されます。`skipDangerousModePermissionPrompt: true`、`effortLevel: high`、`cleanupPeriodDays: 180` と、auto memory、adaptive thinking、エラーレポート、組み込みの git 指示をオフにする env フラグが含まれます。すでに設定している値は保持されます。
- **co-author トレーラー**: Claude Code のコミット attribution が `Co-Authored-By: First Fluke <our.first.fluke@gmail.com>` になり、PR には "Generated with oh-my-agent" の一行が付きます。オフにするには `scm.co_author.enabled: false` を設定してください。
- **commit-msg ガード**: `.githooks/commit-msg` は、`.githooks/co-authors.allow` にも `scm.co_author.email` にもない `Co-authored-by` アドレスを拒否します。`git config --local core.hooksPath .githooks` はほかのフックが有効でない場合にのみ設定され、有効な場合は oma がガードをチェーンする方法を表示します。オプトアウトするには `scm.co_author.enforce_hook: false` を設定してください。
- **バックグラウンド更新**: `oma update` はバックグラウンドで `oma` CLI を更新し（止めるには `auto_update_cli: false` または `OMA_SKIP_VERSION_CHECK=1`）、`uv tool upgrade serena-agent --prerelease=allow` を実行します（止めるには `serena.auto_update: false`）。
- **Serena クリーンアップタイマー**: Serena がデフォルトの `bridge` モードのとき、共有 Serena サーバーを最初に起動したエージェントセッションが、アイドル状態の共有 Serena サーバーを 5 分ごとに停止するタイマーを登録します（launchd `dev.oma.serena-daemon-gc`、systemd ユーザータイマー `oma-serena-daemon-gc.timer`、または Windows のスケジュールされたタスク `OMA Serena Daemon GC`）。共有サーバーとタイマーを使わない場合は `serena.mode: stdio` を設定してください。`oma uninstall` はこのタイマーを削除しません。
- **非対話の実行**（`-y`、`OMA_YES=1`、`CI=true`）では、`--preset` で別のプリセットを選ばない限り `All` スキルプリセットと `model_preset: auto`、バックエンド言語として Python を使います。`mcp.devtools_browsers` にブラウザがすでに登録されていない限り、ブラウザ MCP は選択されません（Aside のインストールスクリプトも実行しません）。

---

## 方法2: bunx による手動インストール

```bash
bunx oh-my-agent@latest
```

このコマンドは依存関係のブートストラップなしで対話式インストーラーを起動します。事前に bun をインストールしてください。

インストーラーで[スキルプリセット](./glossary.md#skill-preset)を選びます。現在のプリセットは `cli/constants/skill-data.ts` の `PRESETS` で定義されています。

### プリセット {#presets}

リポジトリで必要な作業に合うプリセットを選んでください。下の表のスキル名は `oma-` 接頭辞を省略しています。

| プリセット | 選ぶ場面（プロジェクトの種類） | 含まれるスキル | 数 |
|--------|-------------------------------|-----------------|-------|
| **all** | 任意のプロジェクト、またはすべてのワークフローをそのまま使いたい場合 | レジストリ内のすべてのスキル | 33 |
| **fullstack** | バックエンドと Terraform インフラを持つ Web とモバイルのクライアント | architecture, brainstorm, design, frontend, backend, mobile, db, pm, qa, debug, scm, tf-infra, dev-workflow | 13 |
| **fullstack-web** | バックエンドとデータベースを持つ Web フロントエンド | architecture, brainstorm, design, frontend, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **fullstack-mobile** | バックエンドとデータベースを持つモバイルアプリ | architecture, brainstorm, design, mobile, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **frontend** | Web UI のみ | architecture, brainstorm, design, frontend, pm, qa, debug, scm | 8 |
| **backend** | データベースを持つ API またはサービス | architecture, brainstorm, backend, db, pm, qa, debug, scm, dev-workflow | 9 |
| **mobile** | モバイルアプリのみ | architecture, brainstorm, mobile, pm, qa, debug, scm | 7 |
| **devops** | インフラ、CI/CD、オブザーバビリティの作業 | architecture, brainstorm, tf-infra, dev-workflow, observability, pm, qa, debug, scm | 9 |
| **security** | セキュリティスキャン、コードレビュー、修正 | security, architecture, qa, debug, refactor, scm | 6 |
| **research** | 論文、市場調査、PDF/HWP の変換 | scholar, market, pdf, hwp, academic-writing, search, translation, scm | 8 |
| **content** | デザインアセット、画像、音声、文章コンテンツ | design, image, voice, academic-writing, translation, scm | 6 |

プリセットはスキルのまとまりです。スキルごとにサブエージェント定義を1つ作るものではありません。`all` プリセットは実行時のスキルレジストリから展開されるため、リポジトリに追加されたスキルも一覧に反映されます。ドメインプリセットには、その用途のスキルだけが含まれます。

コマンドラインからプリセットを選ぶこともできます。

```bash
oma install --preset frontend --yes
```

`--preset` には表内の名前を指定でき、対話式のスキル選択や非対話時のデフォルトである `all` より優先されます。未知の名前はインストール開始前に拒否されます。オプションを省略すると、従来の選択フローが維持されます。このオプションが選ぶのはスキルのみであり、共有ファイル、エージェント、ワークフロー、フック、プロバイダー設定は引き続きランタイムインストーラーに従って導入されます。より小さいプリセットで再インストールしても、以前にインストール済みのスキルは保持されます。カスタム選択は対話式メニューでのみ利用でき、`custom` や空の値は `--preset` では受け付けられません。

インストール後は、選択されたスキル一覧とワークフローの利用可能状況レポートを確認してください。ワークフローが公開されるのは、必要なスキルマニフェストに有効な名前と説明が揃っている場合だけです。既存で保持されたスキルによってそれらの要件を満たすこともできます。条件付き参照は別途報告され、選択したプリセットを拡張することはありません。このチェックはマニフェストを対象としており、ツール、プロバイダー、認証情報、実行については別途確認が必要です。

### プリセット外のスキルが必要なワークフロー {#workflows-that-need-skills-outside-a-preset}

どのプリセットもワークフローとエージェントの定義をすべてコピーします。ただし、コマンドやプロンプトが公開されるのは、必要なスキルが利用可能なワークフローだけです。たとえば、新規の `frontend` インストールでは `oma-coordination` がないため `/work` は利用できません（一方で既存の PM スキルと QA スキルがほかのエントリー要件を満たしています）。インストーラーは `all` へ切り替えずに、その不足スキルを報告します。

| ワークフロー | 必須のエントリースキル | それらを含むプリセット |
|----------|-------------|-------------------------|
| `/work`, `/ultrawork`, `/ralph` | oma-coordination, oma-pm, oma-qa | all |
| `/orchestrate` | oma-coordination, oma-orchestration, oma-qa | all |
| `/docs` | oma-docs | all |
| `/explain` | oma-explanation | all |
| `/security` | oma-security | all, security |
| `/recap` | oma-recap | all |
| `/video` | oma-video | all |
| `/design` | oma-design | all, fullstack, fullstack-web, fullstack-mobile, frontend, content |
| `/architecture` | oma-architecture | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops, security |
| `/plan` | oma-pm | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops |
| `/review` | oma-qa | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops, security |
| `/scm` | oma-scm | すべてのプリセット |

分岐固有の参照は引き続き参考情報扱いです。たとえば `/convert` は入力を検査したうえで PDF、HWP、動画ツールを選び、`/ralph` と `/ultrawork` はリファクタリングの分岐で `oma-refactor` を必要とする場合があります。これらは無条件のエントリー要件ではありません。

不足しているマニフェストや無効なマニフェストを診断するには `oma doctor` を実行します。不足しているスキルを追加するには `oma install` を実行して **Select individually** を選びます。マニフェストを修復した後は `oma link` を実行してワークフローの公開状態を更新してください（再インストールでも更新されます）。OMA のグローバルインストールには対応する `--global` スコープを使います。利用できない OMA コマンドが削除されても、既存のユーザーコマンドは保持されます。

### ドメインプラグイン

Claude Code マーケットプレイスのユーザーは、`oh-my-agent` マーケットプレイスを追加した後にドメインエントリーを選択できます。

```bash
claude plugin install oma-frontend@oh-my-agent
# Alternatives: oma-security@oh-my-agent, oma-research@oh-my-agent
```

ドメインエントリーにはそれぞれ frontend 用 8 個、security 用 6 個、research 用 8 個のスキルと、対応するネイティブエージェント選択が含まれます。セッションのブートストラップはそのプリセットをランタイムインストーラーへ渡します。共有ランタイムのセットアップと既存のインストール済みスキルは、上述のインストーラーの動作に従います。`oma` エントリーには引き続きフルプラグインが含まれます。同じドメインルートは、生成された Codex マーケットプレイスカタログおよび Grok Build、ZCode のカタログでも宣言されています。Antigravity CLI（生成されたツリーまたはリリースアセット `oma-antigravity-plugin.tar.gz` に対して `agy plugin install ./antigravity-plugin`）、Grok Build CLI、ZCode、Kimi Code（`/plugins install`）はそれぞれ独自に生成されたマニフェストを読み込みます。ホスト別の正確な手順は [Claude 互換プラグインホスト](../guide/vendor-capabilities.md#claude-compatible-plugin-hosts) を参照してください。

固定されたホスト CI ジョブは、クリーンなランナー上にローカルマーケットプレイスを登録してドメインエントリーをインストールし、結果のインベントリを検査します。これらのチェックはモデル呼び出しなしで実行されます。ランタイム認証情報、外部プロバイダー、最初のタスクの成功については別途確認が必要です。リリースチェックでは、すべてのドメインルートの両マニフェストが CLI バージョンと一致し、Release Please のバージョンアップデーターを持つことも求められます。

共有リソース（`_shared/`）はプリセットに関係なく常にインストールされます。コアルーティング、コンテキスト読み込み、プロンプト構造、ベンダー検出、実行プロトコル、メモリプロトコルが含まれます。

### 作成されるもの

インストール後、プロジェクトには次のファイルとディレクトリができます。

```text
.agents/
├── oma-config.yaml          # Your preferences
├── oma-config.cue           # Optional schema-backed configuration
├── mcp.json                 # MCP server configuration
├── skills/
│   ├── _shared/             # Shared resources (always installed)
│   │   ├── core/            # skill-routing, context-loading, etc.
│   │   ├── runtime/         # memory-protocol, execution-protocols/
│   │   └── conditional/     # quality-score, experiment-ledger, etc.
│   ├── oma-frontend/        # Per preset
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                  # Other selected skills
├── workflows/               # Workflow definitions (all 20, every preset)
├── agents/                  # Subagent definitions (all 12, every preset)
├── hooks/                   # Hook sources (core/, variants/)
├── rules/                   # Project rules
├── results/                 # Plans and agent results (populated by workflows)
└── state/                   # Persistent workflow and coordination state
    └── memories/            # Runtime coordination state

.claude/
├── settings.json            # Vendor settings, when Claude Code is selected
├── hooks/
│   ├── oma-hook.sh          # Generated wrapper for the in-process hook chain
│   └── hud.ts               # Optional [OMA] statusline indicator
├── skills/                  # Symlinks → .agents/skills/
└── agents/                  # Generated native subagent files, when supported
```

インストーラーは、選択したホストのベンダーディレクトリだけを作成します。フックのソースは `.agents/hooks/core/` に残り、ベンダー側に生成されるファイルは統合の出力です。古いプロジェクトでは、Serena が従来の `.serena/memories/` ディレクトリを使う場合もあります。

---

## 方法3: グローバルインストール {#method-3-global-install}

ダッシュボード、エージェントのスポーン、診断など CLI レベルで使う場合は、oh-my-agent をグローバルにインストールします。

:::note
この節では `oma` コマンドをインストールします。`oma install --global` とは別物です。`oma install --global` は、スキル、ワークフロー、ルールを OMA のグローバルホーム（`~/.oma/.agents/`）にインストールし、すべてのプロジェクトで使えるようにします。[グローバルインストール](../guide/global-install.md)を参照してください。
:::

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
oma dashboard web # Web dashboard at http://127.0.0.1:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update installed skills from the registry
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # Proxy MCP stdio to a shared per-project Serena server
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives
oma image # Multi-vendor AI image generation
oma video # Video generation and capture
oma slide # Presentation generation and export
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
  backend: { model: openai/gpt-6.1-terra, effort: high }
  qa:      { model: anthropic/claude-sonnet-5-5 }

# Optional — user-defined model slugs
# models:
#   my-fast:
#     cli: antigravity
#     cli_model: "Gemini 3.8 Flash (Medium)"
#     supports: { thinking: true }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-6.1-terra, effort: high }
```

### フィールドリファレンス

| フィールド | 型 | 必須 | 説明 |
|-------|------|-------------|-------------|
| `language` | string | はい | 応答言語コード。en、ko、ja、zh、es、fr、de、pt、ru、nl、pl に対応します。 |
| `model_preset` | string | はい | アクティブな[モデルプリセット](./glossary.md#model-preset)キー。`auto` は現在のランタイムに従います。固定キーには `free`、`antigravity`、`claude`、`codex`、`qwen`、`cursor`、`kiro`、`mixed` があります。カスタムプリセットキーも使えます。[エージェント別モデル](../guide/per-agent-models.md)を参照してください。 |
| `agents` | map | いいえ | ロールごとのモデル上書き設定です。`agents.default` には `cli`（明示的なエージェント設定と選択したプリセットでベンダーが決まらないときに `oma agent spawn` が使うフォールバック CLI）と、デフォルトの `effort`、`thinking`、`memory` を指定します。 |
| `providers` | map | いいえ | 機能プロバイダーです。`code_intelligence`（`serena` または `gortex`）、`code_intelligence_guard`（`block` または `off`）、`docs`（`context7`）、`web`（`native` または `brave`）、`semantic_memory`（`agentmemory`、`honcho`、`none`）に加え、それらの認証情報セクション（`brave`、`exa`、`honcho`）、さらに `free`（`model_preset: free` が使う FreeLLMAPI ゲートウェイ）などの名前付き LLM プロバイダーを指定します。API キーは環境変数に置いてください。 |
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

エージェントをスポーンするとき、CLI は `agents.<id>`、選択した `model_preset`、プリセットのオーケストレーター用フォールバック、`agents.default.cli` の順で設定を解決します。`model_preset: auto` では現在のランタイムのネイティブ設定がモデルを決めます。ランタイムが不明なら `agents.default.cli` にフォールバックします。完全な対応表は[エージェント別モデル](../guide/per-agent-models.md)を参照してください。

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

```text
"Build a login form with email validation using Tailwind CSS"
```

または、ワークフローコマンドを使います。

```text
/plan authentication feature with JWT and refresh tokens
```

詳しい例は[使い方ガイド](/docs/guide/usage)を、各スペシャリストの役割は[エージェント](/docs/core-concepts/agents)を参照してください。インストールやフックが期待どおりに動かない場合は、[トラブルシューティング](../guide/troubleshooting.md)を参照してください。
