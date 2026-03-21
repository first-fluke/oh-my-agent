---
title: 既存プロジェクトへの統合
description: 既存の Antigravity プロジェクトに oh-my-agent スキルを追加するための安全で非破壊的な統合ワークフロー。
---

# 既存プロジェクトへの統合

このガイドは、レガシーのルート `AGENT_GUIDE.md` ワークフローを置き換え、現在のワークスペース構成（`cli` + `web`）と CLI の動作を反映しています。

## 目的

既存のアセットを上書きせずに、既存プロジェクトに `oh-my-agent` スキルを追加します。

## 推奨パス（CLI）

対象プロジェクトのルートで以下を実行します:

```bash
bunx oh-my-agent
```

実行内容:

- `.agents/skills/*` をインストールまたは更新
- `.agents/skills/_shared` に共有リソースをインストール
- `.agents/workflows/*` をインストール
- `.agents/config/user-preferences.yaml` をインストール
- オプションで `~/.gemini/antigravity/global_workflows` にグローバルワークフローをインストール

## 安全な手動パス

コピーするディレクトリを完全に制御したい場合に使用します。

```bash
cd /path/to/your-project

mkdir -p .agents/skills .agents/workflows .agents/config

# Copy only missing skill directories (example)
for skill in oma-coordination oma-pm oma-frontend oma-backend oma-mobile oma-qa oma-debug oma-orchestrator oma-commit; do
  if [ ! -d ".agents/skills/$skill" ]; then
    cp -r /path/to/oh-my-agent/.agents/skills/$skill .agents/skills/$skill
  fi
done

# Copy shared resources if missing
[ -d .agents/skills/_shared ] || cp -r /path/to/oh-my-agent/.agents/skills/_shared .agents/skills/_shared

# Copy workflows if missing
for wf in coordinate.md orchestrate.md plan.md review.md debug.md setup.md tools.md; do
  [ -f ".agents/workflows/$wf" ] || cp /path/to/oh-my-agent/.agents/workflows/$wf .agents/workflows/$wf
done

# Copy default user preferences only if missing
[ -f .agents/config/user-preferences.yaml ] || cp /path/to/oh-my-agent/.agents/config/user-preferences.yaml .agents/config/user-preferences.yaml
```

## 検証チェックリスト

```bash
# 9 installable skills (excluding _shared)
find .agents/skills -mindepth 1 -maxdepth 1 -type d ! -name '_shared' | wc -l

# Shared resources
[ -d .agents/skills/_shared ] && echo ok

# 7 workflows
find .agents/workflows -maxdepth 1 -name '*.md' | wc -l

# Basic command health
bunx oh-my-agent doctor
```

## オプションのダッシュボード

ダッシュボードはオプションで、インストール済みの CLI を使用します:

```bash
bunx oh-my-agent dashboard
bunx oh-my-agent dashboard:web
```

Web ダッシュボードのデフォルト URL: `http://localhost:9847`

## ロールバック戦略

統合前に、プロジェクトでチェックポイントコミットを作成してください:

```bash
git add -A
git commit -m "chore: checkpoint before oh-my-agent integration"
```

元に戻す必要がある場合は、チームの通常のプロセスでそのコミットを取り消してください。

## マルチ CLI シンボリックリンクサポート

`bunx oh-my-agent` を実行すると、スキル選択後に以下のプロンプトが表示されます:

```text
Also develop with other CLI tools?
  ○ Claude Code (.claude/skills/)
  ○ OpenCode, Amp, Codex (.agents/skills/)
  ○ GitHub Copilot (.github/skills/)
```

Antigravity と併用する追加の CLI ツールを選択してください。インストーラーは以下を行います:

1. `.agents/skills/`（Antigravity のネイティブロケーション）にスキルをインストール
2. 選択した各 CLI のスキルディレクトリから `.agents/skills/` へのシンボリックリンクを作成

これにより、単一の正式なソースを維持しつつ、複数の CLI ツールでスキルを利用できます。

### シンボリックリンク構成

```
.agents/skills/oma-frontend/      ← ソース（SSOT）
.claude/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/
.agents/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/ (OpenCode, Amp, Codex)
.github/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/ (GitHub Copilot)
```

インストーラーは既存のシンボリックリンクをスキップし、ターゲットの場所に実ディレクトリが存在する場合は警告します。

## 注意事項

- カスタマイズされたスキルを置き換える意図がない限り、既存の `.agents/skills/*` フォルダを上書きしないでください。
- プロジェクト固有のポリシーファイル（`.agents/config/*`）はリポジトリの所有下に保持してください。
- マルチエージェントオーケストレーションパターンについては、[`使用ガイド`](./usage.md) に進んでください。
