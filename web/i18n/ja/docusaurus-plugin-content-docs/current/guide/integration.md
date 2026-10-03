---
title: "ガイド：既存プロジェクトへの統合"
sidebar_label: 既存プロジェクト
description: 既存プロジェクトに oh-my-agent を追加するための完全ガイドです。CLI パス、手動パス、検証、SSOT のシンボリックリンク構造、インストーラーの内部動作を扱います。
---

# ガイド：既存プロジェクトへの統合

## 2 つの統合方法

既存プロジェクトに oh-my-agent を追加する方法は 2 つあります。

1. **CLI パス**：`oma`（または `npx oh-my-agent`）を実行し、対話プロンプトに従います。ほとんどのユーザーにはこの方法を推奨します。
2. **手動パス**：ファイルをコピーし、シンボリックリンクを自分で設定します。制限された環境やカスタム構成で役立ちます。

どちらの方法でも結果は同じです。`.agents/` ディレクトリ（SSOT）と、`.claude/agents/`、`.codex/agents/`、`.qwen/agents/` などのベンダー固有の生成ファイルが作成されます。

---

## CLI パス：手順

### 1. CLI をインストールする

```bash
# Global install (recommended)
bun install --global oh-my-agent

# Or use npx for one-time runs
npx oh-my-agent
```

グローバルインストールが完了すると、`oma`（または `oh-my-agent`）コマンドを使えるようになります。

### 2. プロジェクトルートへ移動する

```bash
cd /path/to/your/project
```

設定したいプロジェクトディレクトリからインストーラーを実行します。OMA はインストールルートを基準に SSOT を書き込みます。レビューとロールバックのため Git リポジトリを推奨しますが、インストーラーに必須ではありません。

### 3. インストーラーを実行する

```bash
oma
```

サブコマンドを指定しないデフォルトコマンドで、対話型インストーラーが起動します。

### 4. プロジェクト種別を選択する

インストーラーには次のプリセットがあります。

| プリセット | 含まれるスキル |
|:-------|:---------------|
| **All** | 利用可能なすべてのスキル |
| **Fullstack** | Frontend + Backend + PM + QA |
| **Frontend** | React/Next.js のスキル |
| **Backend** | Python/Node.js/Rust のバックエンドスキル |
| **Mobile** | Flutter/Dart のモバイルスキル |
| **DevOps** | Terraform + CI/CD + Workflow のスキル |
| **Custom** | 全リストから個別のスキルを選択 |

### 5. バックエンド言語を選択する（該当する場合）

バックエンドスキルを含むプリセットを選んだ場合は、言語のバリアントを選びます。

- **Python**：FastAPI/SQLAlchemy（デフォルト）
- **Node.js**：NestJS/Hono + Prisma/Drizzle
- **Rust**：Axum/Actix-web
- **Other / Auto-detect**：後で `/stack-set` を使って設定します

### 6. IDE のシンボリックリンクを設定する

インストーラーは常に Claude Code のシンボリックリンク（`.claude/skills/`）を作成します。また、選択したベンダー向けのネイティブエージェントファイル、フック、設定、統合ファイルも生成します。現在のベンダーファミリーには Antigravity、Claude、Codex、Cursor、Kiro、Kimi、Qwen と、pi および OpenCode の拡張パスが含まれます。`.github/` ディレクトリがあれば、GitHub Copilot のシンボリックリンクも自動作成できます。**ZCode** を選ぶと、`.zcode/commands/*.md` のシンボリックリンクでワークフローをスラッシュコマンドとして公開します（ワークフローのみで、エージェントファイルやフックはありません）。それ以外の場合は、次の質問が表示されます。

```
Also create symlinks for GitHub Copilot? (.github/skills/)
```

### 7. 推奨するグローバル Git 設定

`oma install` と `oma update` の終盤で、CLI はマルチエージェントワークフローに役立つ 2 つの**グローバル** Git 設定を確認します。

| キー | 推奨値 | 理由 |
|:----|:--------------|:----|
| `rerere.enabled` | `true` | 記録した解決結果を再利用します。マルチエージェントのマージでは同じ競合が起きやすく、rerere が前回の修正を再適用します。 |
| `init.defaultBranch` | `main` | 新しいリポジトリのデフォルトブランチ名を統一します。 |

値がないか異なる場合、CLI は対話型の確認を表示します。デフォルトは**yes**です。

```
Enable git rerere? (Recommended for multi-agent merge conflict reuse) (unset)
Set git init.defaultBranch to main? (Recommended global default) (currently "master")
```

承認すると、次と同等のコマンドが実行されます。

```bash
git config --global rerere.enabled true
git config --global init.defaultBranch main
```

**非対話型のパス**（`--yes`、`--ci`、`CI=true`）では、グローバル Git 設定を書き込みません。手動で適用するためのコマンドを含むスキップメッセージだけを表示します。

`oma doctor` は同じ確認を **Git Config** の下で報告し、不一致を問題として数え、`--json` 出力では `gitRecommended` として公開します。対話型で修正を適用することもできます。

### 8. MCP を設定する

Antigravity IDE の MCP 設定（`~/.gemini/antigravity/mcp_config.json`）がある場合、インストーラーは Serena MCP ブリッジの設定を提案します。

```
Configure Serena MCP with bridge? (Required for full functionality)
```

承認すると、次の設定を作成します。

```json
{
  "mcpServers": {
    "serena": {
      "command": "npx",
      "args": ["-y", "oh-my-agent@latest", "bridge", "http://localhost:12341/mcp"],
      "disabled": false
    }
  }
}
```

同様に、Gemini CLI の設定（`~/.gemini/settings.json`）がある場合は、Gemini CLI の HTTP モードで Serena を設定するかどうかを尋ねます。

```json
{
  "mcpServers": {
    "serena": {
      "url": "http://localhost:12341/mcp"
    }
  }
}
```

### 9. 完了

インストーラーは、インストールした内容の概要を表示します。

- インストールしたスキルの一覧
- スキルディレクトリの場所
- 作成したシンボリックリンク
- スキップした項目（ある場合）

---

## 手動パス

対話型 CLI を利用できない環境（CI パイプライン、制限されたシェル、企業内のマシンなど）で使います。

### Step 1：ダウンロードして展開する

```bash
# Download the latest tarball from the registry
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz

# Verify checksum
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz.sha256" -o agent-skills.tar.gz.sha256
sha256sum -c agent-skills.tar.gz.sha256

# Extract
tar -xzf agent-skills.tar.gz
```

### Step 2：プロジェクトへファイルをコピーする

```bash
# Copy the core .agents/ directory
cp -r .agents/ /path/to/your/project/.agents/

# Regenerate vendor-native files from the SSOT
cd /path/to/your/project
oma link
```

`oma link` は `.agents/agents/` から `.claude/`、`.codex/`、`.qwen/` と関連するベンダー固有ファイルを再生成します。実行時に OMA がネイティブディスパッチを使うのは、現在のランタイムのベンダーがエージェントの対象ベンダーと一致するときだけです。ベンダーが混在する構成も動作しますが、一致しないエージェントは外部の `oma agent spawn` にフォールバックします。

Qwen Code では、生成された Markdown 定義が `.qwen/agents/` に置かれます。OMA のロールは Agent ツールの `subagent_type` で選びます（例: `backend-engineer`）。利用できる定義は、Qwen Code の `/agents manage` で確認できます。ネイティブエージェントは、CLI スポーンと同じ[結果ライフサイクル](./agent-results-and-resume.md)（`oma agent begin`、`oma agent verify`、`oma agent finish`）を使います。`model_preset: free` の場合は、子エージェントがゲートウェイ設定を受け取れるよう `oma agent spawn` を使ってください。

Qwen Code は、ほかのベンダーと同じ `code-intelligence-primer` を使います。Claude Code と同様に、共有プライマーを `SessionStart` と `UserPromptSubmit` に登録します。ガイダンスはセッションごとに 1 回、コンパクション後にもう一度注入されます。プライマーは設定されたプロバイダー（Serena または Gortex）に従い、遅延ツール（deferred tool）のガイダンスを含みます。プロバイダーが利用できない場合やタイムアウトした場合は、ネイティブ検索へのフォールバックを許可します。Qwen は、コード検索のブロックやプロバイダー結果の追跡を別途追加しません。

CLI を更新したら、`oma link qwen` を実行してフック設定とラッパーを再生成し、新しい Qwen セッションを開始してください。フック出力のテストが検証するのは統合の契約であり、モデルがどのツールを選ぶかまでは保証しません。

### Step 3：ユーザー設定を構成する

```bash
mkdir -p /path/to/your/project/.agents
cat > /path/to/your/project/.agents/oma-config.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
model_preset: antigravity
EOF
```

### Step 4：メモリディレクトリを初期化する

```bash
oma memory init
# Or manually:
mkdir -p /path/to/your/project/.agents/state/memories
```

---

## 検証チェックリスト

どちらの方法でインストールした場合も、セットアップが正しいことを確認します。

```bash
# Run the doctor command for a full health check
oma doctor

# Check output format for CI
oma doctor --json
```

doctor コマンドは次を確認します。

| チェック | 確認内容 |
|:------|:----------------|
| **CLI installations** | agy、claude、codex、qwen のバージョンと利用可能性 |
| **Authentication** | 各 CLI の API キーまたは OAuth の状態 |
| **MCP configuration** | 各 CLI 環境の Serena MCP サーバー設定 |
| **Skill status** | インストール済みスキルと最新状態 |

手動で確認するコマンドは次のとおりです。

```bash
# Verify .agents/ directory exists
ls -la .agents/

# Verify skills are installed
ls .agents/skills/

# Verify symlinks point to correct targets
ls -la .claude/skills/

# Verify config exists
cat .agents/oma-config.yaml

# Verify memory directory
ls .agents/state/memories/ 2>/dev/null || echo "Memory not initialized"

# Check version
cat .agents/skills/_version.json 2>/dev/null
```

---

## 複数 IDE のシンボリックリンク構造（SSOT の概念）

oh-my-agent は Single Source of Truth（SSOT）アーキテクチャを使います。スキル、ワークフロー、設定、エージェント定義が存在する場所は `.agents/` だけです。IDE 固有のディレクトリには `.agents/` を指すシンボリックリンクだけが入ります。

### ディレクトリ構成

```
your-project/
  .agents/                          # SSOT — the real files live here
    agents/                         # Agent definition files
      backend-engineer.md
      frontend-engineer.md
      qa-reviewer.md
      ...
    config/                         # Shipped auxiliary config files
      ...
    oma-config.yaml                 # User-owned project configuration
    mcp.json                        # MCP server configuration
    results/plan-{sessionId}.json    # Current plan (generated by /plan)
    skills/                         # Installed skills
      _shared/                      # Shared resources across all skills
        core/                       # Core protocols and references
        runtime/                    # Runtime execution protocols
        conditional/                # Conditionally-loaded resources
      oma-frontend/                 # Frontend skill
      oma-backend/                  # Backend skill
      oma-qa/                       # QA skill
      ...
    workflows/                      # Workflow definitions
      orchestrate.md
      work.md
      ultrawork.md
      plan.md
      ...
    state/                          # Runtime coordination state
      memories/                     # Coordination artifacts (progress-*, result-*, task-board, session-cost-*)
    results/                        # Agent execution results
  .claude/                          # Claude Code — symlinks only
    skills/                         # -> .agents/skills/* and .agents/workflows/*
    agents/                         # -> .agents/agents/*
  .github/                          # GitHub Copilot — symlinks only (optional)
    skills/                         # -> .agents/skills/*
  .zcode/                           # ZCode — workflow commands only (optional)
    commands/                       # -> .agents/workflows/*
  .serena/                          # Serena MCP storage (separate from OMA state)
    memories/                       # Serena's own onboarding memories
    metrics.json                    # Productivity metrics
```

### シンボリックリンクを使う理由

`oma update` が `.agents/` を更新すると、そこを参照するすべての IDE に変更が反映されます。スキルは 1 か所だけに保存されるため、コピーが重複しません。`.claude/` を削除しても SSOT の `.agents/` は残ります。シンボリックリンクは小さく、Git の差分も確認しやすくなります。

---

## 安全のためのヒントとロールバック戦略

### インストール前

1. **現在の作業をコミットする。** インストーラーは新しいディレクトリとファイルを作成します。Git の状態をクリーンにしておけば、`git checkout .` で変更を取り消せます。
2. **既存の `.agents/` ディレクトリを確認する。** 別のツールが作成したものがある場合は、先にバックアップしてください。インストーラーはそれを上書きします。

### インストール後

1. **作成されたものを確認する。** `git status` で新しいファイルを確認します。インストーラーが作成するのは `.agents/`、`.claude/`、必要に応じて `.github/` 内のファイルだけです。
2. **`.gitignore` を確認する。** Git リポジトリでは、install、update、link がルートの `.gitignore` にランタイム用のエントリ（`.antigravitycli/`、`.agents/results/`、`.agents/state/`、`.agents/backup/`、`docs/plans/`）を自動で追加します。追加されたことを確認してください。多くのチームではセットアップを共有するために `.agents/` と `.claude/` をコミットします。判断が必要なエントリは `.serena/` です。Serena は内部の `.serena/.gitignore` でキャッシュを管理するため、`.serena/project.yml`（共有プロジェクト設定）だけをコミットするか、ディレクトリ全体を無視できます。

```gitignore
# optional — ignore Serena entirely (runtime memory)
.serena/
```

### ロールバック

プロジェクトから oh-my-agent を完全に削除するには、次を実行します。

```bash
# Remove the SSOT directory
rm -rf .agents/

# Remove IDE symlinks
rm -rf .claude/skills/ .claude/agents/
rm -rf .github/skills/  # if created

# Remove runtime files
rm -rf .serena/
```

または、Git で単に元へ戻します。

```bash
git checkout -- .agents/ .claude/
git clean -fd .agents/ .claude/ .serena/
```

---

## ダッシュボードのセットアップ

インストール後はリアルタイム監視を設定できます。詳しくは[ダッシュボード監視ガイド](/docs/guide/dashboard-monitoring)を参照してください。

簡単なセットアップ：

```bash
# Terminal dashboard (watches .agents/state/memories/ for changes)
oma dashboard terminal

# Web dashboard (browser-based; OMA prints a tokenized loopback URL)
oma dashboard web
```

---

## インストーラーの内部動作

`oma`（インストールコマンド）を実行すると、次の処理が行われます。

### 1. レガシー移行

インストーラーは古い `.agent/` ディレクトリ（単数形）を確認し、見つかった場合は `.agents/`（複数形）へ移行します。以前のバージョンからアップグレードするユーザー向けの一度限りの移行です。

### 2. 競合するツールの検出

インストーラーは競合するツールをスキャンし、衝突を避けるために削除するかどうかを尋ねます。

### 3. Tarball のダウンロード

インストーラーは oh-my-agent の GitHub リリースから最新のリリース tarball をダウンロードします。この tarball には、すべてのスキル、共有リソース、ワークフロー、設定、エージェント定義を含む完全な `.agents/` ディレクトリが入っています。

### 4. 共有リソースのインストール

`installShared()` は `_shared/` ディレクトリを `.agents/skills/_shared/` にコピーします。次の内容が含まれます。

- `core/`：スキルのルーティング、コンテキストの読み込み、プロンプト構造、品質原則、ベンダー検出、API コントラクト。
- `runtime/`：メモリプロトコル、ベンダーごとの実行プロトコル。
- `conditional/`：品質スコアや探索ループなど、特定の条件でだけ読み込むリソース。

### 5. ワークフローのインストール

`installWorkflows()` はすべてのワークフローファイルを `.agents/workflows/` にコピーします。ここには `/orchestrate`、`/work`、`/ultrawork`、`/plan`、`/brainstorm`、`/deepinit`、`/review`、`/debug`、`/design`、`/scm`、`/tools`、`/stack-set` の定義が入ります。

### 6. 設定のインストール

`installConfigs()` は補助設定を `.agents/config/` にコピーし、`.agents/mcp.json` を作成して、ユーザーが管理する `.agents/oma-config.yaml` または `.agents/oma-config.cue` を初期化します。`--force` を使わない限り既存のユーザーファイルは保持されます。`oma update` は必要に応じて新しいトップレベルのテンプレートキーも追加します。

### 7. スキルのインストール

選択したスキルごとに、`installSkill()` はスキルディレクトリを `.agents/skills/{skill-name}/` にコピーします。バリアント（たとえばバックエンドの Python）を選択した場合は、言語固有のリソースを含む `stack/` ディレクトリも設定します。

### 8. ベンダー適応

`installVendorAdaptations()` は、選択した対応ベンダー向けに IDE 固有のファイルをインストールします。

- エージェント定義（`.claude/agents/*.md`、`.codex/agents/*.toml`、`.gemini/agents/*.md`）
- フック設定（`.claude/hooks/`、`.codex/hooks.json`）
- 設定ファイルと、共有のベンダー統合ドキュメント（`AGENTS.md` のみ。Claude Code ≥ 2.1.277 も含みます）。`CLAUDE.md` と `GEMINI.md` に OMA ブロックが追加されることはありません。ユーザーが所有する既存の `CLAUDE.md` には、Claude Code が `AGENTS.md` を読み飛ばさないよう `@AGENTS.md` のインポート行だけを追記します。

Codex は一度だけ必要な信頼手順の後ろでフックを有効にするため、Codex の `/hooks` ブラウザーで一度確認するまで `.codex/hooks.json` は実行されません。詳しくは[Codex フックの信頼設定](/docs/guide/codex-hook-trust)を参照してください。

### 9. CLI シンボリックリンク

`createCliSymlinks()` は IDE 固有のディレクトリから SSOT へのシンボリックリンクを作成します。

- `.claude/skills/{skill}` -> `../../.agents/skills/{skill}`
- `.claude/skills/{workflow}.md` -> `../../.agents/workflows/{workflow}.md`
- `.github/skills/{skill}` -> `../../.agents/skills/{skill}`（Copilot を有効にした場合）

ベンダー固有のネイティブエージェントファイルは直接シンボリックリンクするのではなく、`oma link`、`oma install`、`oma update` が `.agents/agents/` から生成します。

### 10. グローバルワークフロー

`installGlobalWorkflows()` はプロジェクトディレクトリの外でグローバルに必要になるワークフローファイルをインストールします。

### 11. 推奨 Git 設定と MCP

CLI パスで説明したとおり、install と update は対話的な同意を得て推奨する**グローバル** Git 設定（`rerere.enabled`、`init.defaultBranch`）を任意で構成し、該当する場合は MCP 設定も構成します。
