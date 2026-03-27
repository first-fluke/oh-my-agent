---
title: "ガイド：既存プロジェクトへの統合"
description: 既存プロジェクトへのoh-my-agent追加ガイド — CLIパス、手動パス、検証、SSOTシンボリックリンク構造、インストーラーの内部動作。
---

# ガイド：既存プロジェクトへの統合

## 2つの統合パス

1. **CLIパス** — `oma`（または`npx oh-my-agent`）を実行しインタラクティブプロンプトに従う。推奨。
2. **手動パス** — ファイルをコピーしシンボリックリンクを設定。制限された環境やカスタムセットアップ向け。

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

Claude Codeシンボリックリンクは常に作成。GitHub Copilotは`.github/`があれば自動、なければ確認。

### 7. Git Rerereセットアップ

マルチエージェントワークフローのマージコンフリクト解決を記憶するgit rerereの有効化を提案。

### 8. MCP設定

Antigravity IDEまたはGemini CLIのSerena MCPブリッジ設定を提案。

---

## 手動パス

```bash
# tarbollダウンロード・展開
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz
sha256sum -c agent-skills.tar.gz.sha256
tar -xzf agent-skills.tar.gz

# ファイルコピーとシンボリックリンク作成
cp -r .agents/ /path/to/your/project/.agents/
mkdir -p /path/to/your/project/.claude/skills
ln -sf ../../.agents/skills/oma-frontend /path/to/your/project/.claude/skills/oma-frontend
# ... その他のスキルも同様

# 設定ファイル作成
mkdir -p /path/to/your/project/.agents/config
# user-preferences.yamlを作成

# メモリディレクトリ初期化
oma memory:init
```

---

## 検証チェックリスト

```bash
oma doctor        # フルヘルスチェック
oma doctor --json # CI向けJSON出力
```

チェック項目：CLIインストール、認証、MCP設定、スキルステータス。

手動検証：
```bash
ls -la .agents/           # ディレクトリ存在確認
ls .agents/skills/        # スキルインストール確認
ls -la .claude/skills/    # シンボリックリンク確認
cat .agents/config/user-preferences.yaml  # 設定確認
```

---

## マルチIDEシンボリックリンク構造（SSOTコンセプト）

`.agents/`が唯一のソース。すべてのIDE固有ディレクトリはシンボリックリンクのみ。

**利点：**
- **1回の更新で全IDE反映。**
- **重複なし。** スキルは1か所のみに保存。
- **安全な削除。** `.claude/`を消しても`.agents/`は無傷。
- **Git互換。** シンボリックリンクは小さくdiffがクリーン。

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

## インストーラーの内部動作

1. **レガシーマイグレーション** — `.agent/`→`.agents/`
2. **競合ツール検出**
3. **tarballダウンロード**
4. **共有リソースインストール** — `_shared/`
5. **ワークフローインストール** — 14ワークフロー
6. **設定インストール** — 既存設定は保持
7. **スキルインストール** — 選択されたプリセット分
8. **ベンダー適応** — Claude、Codex、Gemini、Qwen向け
9. **CLIシンボリックリンク** — IDE→SSOTのリンク
10. **Git Rerere + MCP設定**
