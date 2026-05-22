---
title: "ガイド：既存プロジェクトへの統合"
description: 既存プロジェクトへのoh-my-agent追加ガイド。CLIパス、手動パス、検証、SSOTシンボリックリンク構造、インストーラーの内部動作を解説します。
---

# ガイド：既存プロジェクトへの統合

## 2つの統合パス

1. **CLIパス**: `oma`（または`npx oh-my-agent`）を実行しインタラクティブプロンプトに従う。推奨。
2. **手動パス**: ファイルをコピーしシンボリックリンクを設定。制限された環境やカスタムセットアップ向け。

両パスとも同じ結果：`.agents/`ディレクトリ（SSOT）とIDE固有ディレクトリからのシンボリックリンク。

---

## CLIパス

### 1. CLIインストール

```bash
bun install --global oh-my-agent
# または
npx oh-my-agent
```

### 2. プロジェクトルートに移動

```bash
cd /path/to/your/project
```

### 3. インストーラー実行

```bash
oma
```

### 4. プリセット選択

All、Fullstack、Frontend、Backend、Mobile、DevOps、Custom。

### 5. バックエンド言語選択（該当する場合）

Python、Node.js、Rust、その他/自動検出。

### 6. IDEシンボリックリンク設定

Claude Codeシンボリックリンクは常に作成。インストーラーはAntigravity、Claude、Codex、Qwen向けのベンダーネイティブのエージェントファイルとフックも生成します。GitHub Copilotは`.github/`があれば自動、なければ確認。

### 7. Git Rerereセットアップ

マルチエージェントワークフローのマージコンフリクト解決を記憶するgit rerereの有効化を提案。

### 8. MCP設定

Antigravity IDEまたはGemini CLIのSerena MCPブリッジ設定を提案。

### 9. 完了

インストーラーが要約を表示します。インストールされたスキル、設定されたベンダー、生成されたシンボリックリンク、保留中のタスク（CLIをまだ起動していない場合の認証など）が含まれます。`oma doctor`を実行して全体の整合性を確認してください。

---

## 手動パス

### Step 1：ダウンロードと展開

```bash
# レジストリから最新tarballをダウンロード
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz
# チェックサム検証
sha256sum -c agent-skills.tar.gz.sha256
# 展開
tar -xzf agent-skills.tar.gz
```

### Step 2：プロジェクトへファイルコピー

```bash
# コアの.agents/ディレクトリをコピー
cp -r .agents/ /path/to/your/project/.agents/
# SSOTからベンダーネイティブファイルを再生成
cd /path/to/your/project && oma link
```

### Step 3：ユーザー設定の構成

`.agents/oma-config.yaml`を編集して`language`、`model_preset`、必要に応じて`agents:`オーバーライドを設定します。

### Step 4：メモリディレクトリの初期化

```bash
oma memory:init
# あるいは手動で:
mkdir -p /path/to/your/project/.serena/memories
```

---

## 検証チェックリスト

```bash
oma doctor        # フルヘルスチェック
oma doctor --json # CI向けJSON出力
```

チェック項目：CLIインストール（agy、claude、codex、qwen）、認証、MCP設定、スキルステータス。

手動検証：
```bash
ls -la .agents/           # ディレクトリ存在確認
ls .agents/skills/        # スキルインストール確認
ls -la .claude/skills/    # シンボリックリンク確認
cat .agents/oma-config.yaml  # 設定確認
```

---

## マルチIDEシンボリックリンク構造（SSOTコンセプト）

### ディレクトリレイアウト

```
your-project/
├── .agents/                  ← SSOT（唯一のソース）
│   ├── skills/
│   ├── workflows/
│   └── agents/
├── .claude/skills/           ← .agents/skills/へのシンボリックリンク
├── .codex/                   ← Codex用に生成されたファイル
├── .gemini/                  ← Gemini用に生成されたファイル
└── .qwen/                    ← Qwen用に生成されたファイル
```

`.agents/`が唯一のソースです。すべてのIDE固有ディレクトリはシンボリックリンクか、`oma link`によって生成された派生物にすぎません。

### なぜシンボリックリンクなのか

- **1回の更新で全IDE反映。** スキルを更新すれば、すべてのIDEで即時に反映されます。
- **重複なし。** スキルは1か所のみに保存。
- **安全な削除。** `.claude/`を消しても`.agents/`は無傷です。
- **Git互換。** シンボリックリンクは小さくdiffがクリーンです。

---

## 安全なヒントとロールバック戦略

### インストール前

1. **現在の作業をコミット。** gitの状態をクリーンにしておく。
2. **既存の`.agents/`を確認。** 別ツールのものがあればバックアップ。

### インストール後

```gitignore
# oh-my-agentランタイムファイル
.serena/
.agents/results/
.agents/state/
```

### ロールバック

```bash
rm -rf .agents/ .claude/skills/ .claude/agents/ .serena/
# または
git checkout -- .agents/ .claude/
```

---

## ダッシュボードのセットアップ

インストール完了後は`oma dashboard`または`oma dashboard:web`で実行中のエージェントセッションを観察できます。詳細は[ダッシュボード監視ガイド](./dashboard-monitoring.md)を参照してください。

---

## インストーラーの内部動作

`oma`（インストールコマンド）を実行したときに何が行われるかを順に説明します。

### 1. レガシーマイグレーション

旧来の`.agent/`（単数形）ディレクトリを検出し、`.agents/`（複数形）に移行します。これは旧バージョンからアップグレードするユーザー向けの一回限りの移行です。

### 2. 競合ツール検出

競合するツールをスキャンし、衝突を避けるため削除を提案します。

### 3. tarballダウンロード

GitHub Releasesから最新のリリースtarballをダウンロードします。tarballには、すべてのスキル、共有リソース、ワークフロー、設定、エージェント定義を含む完全な`.agents/`ディレクトリが含まれます。

### 4. 共有リソースインストール

`installShared()`が`_shared/`ディレクトリを`.agents/skills/_shared/`にコピーします。以下が含まれます。
- `core/`: スキルルーティング、コンテキストローディング、プロンプト構造、品質原則、ベンダー検出、APIコントラクト
- `runtime/`: メモリプロトコル、ベンダーごとの実行プロトコル
- `conditional/`: 特定条件が満たされた場合のみロード（quality score、exploration loopなど）

### 5. ワークフローインストール

`installWorkflows()`がすべてのワークフローファイルを`.agents/workflows/`にコピーします。`/orchestrate`、`/work`、`/ultrawork`、`/plan`、`/brainstorm`、`/deepinit`、`/review`、`/debug`、`/design`、`/scm`、`/tools`、`/stack-set`の定義です。

### 6. 設定インストール

`installConfigs()`が`oma-config.yaml`と`mcp.json`を含むデフォルト設定ファイルを`.agents/config/`にコピーします。これらのファイルがすでに存在する場合は、`--force`が指定されない限り保持されます（上書きされません）。

### 7. スキルインストール

選択された各スキルについて、`installSkill()`がスキルディレクトリを`.agents/skills/{skill-name}/`にコピーします。バリアントが選択されている場合（例：バックエンドのPython）、言語固有のリソースを含む`stack/`ディレクトリもセットアップします。

### 8. ベンダー適応

`installVendorAdaptations()`がサポートする全ベンダー（Antigravity、Claude、Codex、Qwen）向けにIDE固有のファイルをインストールします。
- エージェント定義（`.claude/agents/*.md`、`.codex/agents/*.toml`、`.gemini/agents/*.md`）
- フック設定（`.claude/hooks/`）
- 設定ファイルとベンダー統合ドキュメント（`CLAUDE.md`、`AGENTS.md`、`GEMINI.md`）

### 9. CLIシンボリックリンク

`createCliSymlinks()`がIDE固有のディレクトリからSSOTへのシンボリックリンクを作成します。
- `.claude/skills/{skill}` -> `../../.agents/skills/{skill}`
- `.claude/skills/{workflow}.md` -> `../../.agents/workflows/{workflow}.md`
- `.github/skills/{skill}` -> `../../.agents/skills/{skill}`（Copilotが有効な場合）

ベンダーネイティブのエージェントファイルは、シンボリックリンクではなく`oma link`、`oma install`、`oma update`によって`.agents/agents/`から生成されます。

### 10. グローバルワークフロー

`installGlobalWorkflows()`がプロジェクトディレクトリ外でも必要となるワークフローファイルをインストールします。

### 11. Git Rerere + MCP設定

上述のCLIパスで述べたとおり、インストーラーはオプションでgit rerereとMCP設定を構成します。
