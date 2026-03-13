# oh-my-agent: マルチエージェントオーケストレーター

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md)

エージェントコーディングのための究極のマルチエージェントオーケストレーター。

**Serena Memory**を通じて10の専門ドメインエージェント(PM, Frontend, Backend, DB, Mobile, QA, Debug, Brainstorm, DevWorkflow, Terraform)を統合管理します。並列CLI実行、リアルタイム監視ダッシュボード、ゼロコンフィグの段階的スキルロードをサポート。エージェントベースのコーディングに必要なものすべてが揃ったオールインワンソリューションです。

> **このプロジェクトが気に入りましたか？** スターをお願いします！
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> 最適化されたスターターテンプレートをお試しください: [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

## 目次

- [アーキテクチャ](#アーキテクチャ)
- [なぜ違うのか](#なぜ違うのか)
- [互換性](#互換性)
- [`.agents` 仕様](#agents-仕様)
- [これは何ですか？](#これは何ですか)
- [クイックスタート](#クイックスタート)
- [スポンサー](#スポンサー)
- [ライセンス](#ライセンス)

## なぜ違うのか

- **`.agents/` が真の情報源**: スキル、ワークフロー、共有リソース、設定が 1 つのポータブルなプロジェクト構造に存在し、1 つの IDE プラグイン内に閉じ込められません。
- **役割に基づくエージェントチーム**: PM、QA、DB、Infra、Frontend、Backend、Mobile、Debug、Workflow の各エージェントは、単なるプロンプトの山ではなく、エンジニアリング組織のようにモデル化されています。
- **ワークフローファーストのオーケストレーション**: 計画、レビュー、デバッグ、調整された実行は、後付けではなくファーストクラスのワークフローです。
- **標準認識設計**: エージェントは、ISO 駆動の計画、QA、データベースの継続性/セキュリティ、インフラガバナンスのための焦点を絞ったガイドを持っています。
- **検証のために構築**: ダッシュボード、マニフェスト生成、共有実行プロトコル、構造化された出力は、トレース可能性を優先します。

## 互換性

`oh-my-agent` は `.agents/` を中心に設計されており、必要に応じて他のツール固有のスキルフォルダにブリッジします。

| ツール / IDE | スキルソース | 相互運用モード | 備考 |
|------------|---------------|--------------|-------|
| Antigravity | `.agents/skills/` | ネイティブ | 主要な真の情報源レイアウト |
| Claude Code | `.claude/skills/` | `.agents/skills/` へのシンボリックリンク | インストーラーが管理 |
| OpenCode | `.agents/skills/` | ネイティブ互換 | 同じプロジェクトレベルのスキルソースを使用 |
| Amp | `.agents/skills/` | ネイティブ互換 | 同じプロジェクトレベルのソースを共有 |
| Codex CLI | `.agents/skills/` | ネイティブ互換 | 同じプロジェクトスキルソースから動作 |
| Cursor | `.agents/skills/` | ネイティブ互換 | 同じプロジェクトレベルのスキルソースを消費可能 |
| GitHub Copilot | `.github/skills/` | オプションのシンボリックリンク | 設定中に選択した場合にインストール |

現在のサポートマトリックスと相互運用性のメモについては、[SUPPORTED_AGENTS.md](./SUPPORTED_AGENTS.md) を参照してください。

## `.agents` 仕様

`oh-my-agent` は `.agents/` を、エージェントスキル、ワークフロー、共有コンテキストのためのポータブルなプロジェクト規約として扱います。

- スキル: `.agents/skills/<skill-name>/SKILL.md`
- 共有リソース: `.agents/skills/_shared/`
- ワークフロー: `.agents/workflows/*.md`
- プロジェクト設定: `.agents/config/`
- CLI メタデータとパッケージング: 生成されたマニフェストを通じて整合性を維持

プロジェクトレイアウト、必須ファイル、相互運用性ルール、真の情報源モデルの詳細については、[AGENTS_SPEC.md](./AGENTS_SPEC.md) を参照してください。

## アーキテクチャ

```mermaid
flowchart TD
    subgraph Workflows["ワークフロー"]
        direction TB
        W0["/brainstorm"]
        W1["/coordinate"]
        W1b["/coordinate-pro"]
        W2["/orchestrate"]
        W3["/plan"]
        W4["/review"]
        W5["/debug"]
    end

    subgraph Orchestration["オーケストレーション"]
        direction TB
        PM[pm-agent]
        WF[workflow-guide]
        ORC[orchestrator]
    end

    subgraph Domain["ドメインエージェント"]
        direction TB
        FE[frontend-agent]
        BE[backend-agent]
        DB[db-agent]
        MB[mobile-agent]
        TF[tf-infra-agent]
    end

    subgraph Quality["品質"]
        direction TB
        QA[qa-agent]
        DBG[debug-agent]
    end


    Workflows --> Orchestration
    Orchestration --> Domain
    Domain --> Quality
    Quality --> CMT([commit])
```

## これは何ですか？

マルチエージェント協業開発を可能にする**Agent Skills**のコレクションです。作業を専門エージェントに分散します:

| エージェント | 専門分野 | トリガー |
|-------|---------------|----------|
| **Brainstorm** | プランニング前のデザインファーストのアイデア出し | "brainstorm"、"ideate"、"explore idea" |
| **Workflow Guide** | 複雑なマルチエージェントプロジェクトの調整 | "multi-domain"、"complex project" |
| **PM Agent** | 要件分析、タスク分解、アーキテクチャ設計 | "plan"、"break down"、"what should we build" |
| **Frontend Agent** | React/Next.js、TypeScript、Tailwind CSS | "UI"、"component"、"styling" |
| **Backend Agent** | FastAPI、PostgreSQL、JWT認証 | "API"、"database"、"authentication" |
| **DB Agent** | SQL/NoSQLモデリング、正規化、整合性、バックアップ、容量見積もり | "ERD"、"スキーマ"、"データベース設計"、"インデックスチューニング" |
| **Mobile Agent** | Flutterクロスプラットフォーム開発 | "mobile app"、"iOS/Android" |
| **QA Agent** | OWASP Top 10セキュリティ、パフォーマンス、アクセシビリティ | "review security"、"audit"、"check performance" |
| **Debug Agent** | バグ診断、根本原因分析、リグレッションテスト | "bug"、"error"、"crash" |
| **Developer Workflow** | モノレポタスク自動化、mise タスク、CI/CD、マイグレーション、リリース | 「開発ワークフロー」「mise タスク」「CI/CD パイプライン」 |
| **TF Infra Agent** | マルチクラウド IaC プロビジョニング（AWS、GCP、Azure、OCI） | 「インフラ」「terraform」「クラウドセットアップ」 |
| **Orchestrator** | CLIベースの並列エージェント実行とSerena Memory | "spawn agent"、"parallel execution" |
| **Commit** | Conventional Commitsによるプロジェクト固有のルール | "commit"、"save changes" |

## クイックスタート

### 前提条件

- **AI IDE** (Antigravity, Claude Code, Codex, Gemini, etc.)
- **Bun** (CLIとダッシュボード用)
- **uv** (Serenaセットアップ用)

### オプション1: 対話型CLI (推奨)

```bash
# bunがない場合は先にインストール:
# curl -fsSL https://bun.sh/install | bash

# uvがない場合は先にインストール:
# curl -LsSf https://astral.sh/uv/install.sh | sh

bunx oh-my-agent
```

プロジェクトタイプを選択すると、スキルが`.agents/skills/`にインストールされます。

| プリセット | スキル |
|--------|--------|
| ✨ All | すべて |
| 🌐 Fullstack | brainstorm, frontend, backend, db, pm, qa, debug, commit |
| 🎨 Frontend | brainstorm, frontend, pm, qa, debug, commit |
| ⚙️ Backend | brainstorm, backend, db, pm, qa, debug, commit |
| 📱 Mobile | brainstorm, mobile, pm, qa, debug, commit |
| 🚀 DevOps | brainstorm, tf-infra, dev-workflow, pm, qa, debug, commit |

### オプション2: グローバルインストール (Orchestrator用)

コアツールをグローバルに使用するか、SubAgent Orchestratorを実行するには:

```bash
bun install --global oh-my-agent
```

最低1つのCLIツールも必要です:

| CLI | インストール | 認証 |
|-----|---------|------|
| Gemini | `bun install --global @anthropic-ai/gemini-cli` | `gemini auth` |
| Claude | `curl -fsSL https://claude.ai/install.sh \| bash` | `claude auth` |
| Codex | `bun install --global @openai/codex` | `codex auth` |
| Qwen | `bun install --global @qwen-code/qwen` | `qwen auth` |

### オプション3: 既存プロジェクトへの統合

**推奨方法 (CLI):**

プロジェクトルートで次のコマンドを実行すると、スキルとワークフローが自動的にインストール/更新されます:

```bash
bunx oh-my-agent
```

> **ヒント:** インストール後に`bunx oh-my-agent doctor`を実行して、すべてが正しくセットアップされているか確認してください（グローバルワークフローを含む）。

### 2. チャット

**シンプルなタスク** (単一エージェントが自動起動):

```
"Tailwind CSSとフォームバリデーションでログインフォームを作成"
→ frontend-agentが起動
```

**複雑なプロジェクト** (workflow-guideが調整):

```
"ユーザー認証付きのTODOアプリを構築"
→ workflow-guide → PM Agentが計画 → Agent Managerでエージェントを起動
```

**明示的な調整** (ユーザートリガーのワークフロー):

```
/coordinate
→ ステップバイステップ: PM計画 → エージェント起動 → QAレビュー
```

**変更をコミット** (conventional commits):

```
/commit
→ 変更を分析し、コミットタイプ/スコープを提案し、Co-Authorでコミットを作成
```

### 3. ダッシュボードで監視

ダッシュボードのセットアップと使用方法の詳細は、[`web/content/ja/guide/usage.md`](./web/content/ja/guide/usage.md#リアルタイムダッシュボード)を参照してください.

## スポンサー

このプロジェクトは寛大なスポンサーの皆様のおかげで維持されています。

<a href="https://github.com/sponsors/first-fluke">
  <img src="https://img.shields.io/badge/Sponsor-♥-ea4aaa?style=for-the-badge" alt="Sponsor" />
</a>
<a href="https://buymeacoffee.com/firstfluke">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-FFDD00?style=for-the-badge" alt="Buy Me a Coffee" />
</a>

### 🚀 Champion

<!-- Championティア ($100/月) のロゴ -->

### 🛸 Booster

<!-- Boosterティア ($30/月) のロゴ -->

### ☕ Contributor

<!-- Contributorティア ($10/月) の名前 -->

[スポンサーになる →](https://github.com/sponsors/first-fluke)

サポーターの完全なリストは[SPONSORS.md](./SPONSORS.md)を参照してください。

## スター履歴

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)

## ライセンス

MIT
