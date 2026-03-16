# oh-my-agent: どのIDEでも使えるマルチエージェントハーネス

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md)

AIで本気の開発をしたいチームのためのエージェントハーネス。役割ごとにエージェントが分かれていて、特定のIDEに縛られません。

**Serena Memory**で10の専門エージェント（PM、Frontend、Backend、DB、Mobile、QA、Debug、Brainstorm、DevWorkflow、Terraform）を連携させます。`oh-my-agent`は`.agents/`をスキルとワークフローの原本として使い、そこから他のAI IDEやCLIにつなぎます。役割を持ったエージェント、明確なワークフロー、リアルタイム監視、標準に沿ったガイドを組み合わせて、AIが雑に生成したコードを減らし、チームが体系的に動けるようにします。

## 目次

- [アーキテクチャ](#アーキテクチャ)
- [何が違うのか](#何が違うのか)
- [互換性](#互換性)
- [`.agents` 仕様](#agents-仕様)
- [何ができるのか](#何ができるのか)
- [クイックスタート](#クイックスタート)
- [スポンサー](#スポンサー)
- [ライセンス](#ライセンス)

## アーキテクチャ

```mermaid
flowchart TD
    subgraph Workflows["ワークフロー"]
        direction TB
        W0["/brainstorm"]
        W1["/coordinate"]
        W1b["/ultrawork"]
        W2["/orchestrate"]
        W3["/plan"]
        W4["/review"]
        W5["/debug"]
        W6["/deepinit"]
    end

    subgraph Orchestration["オーケストレーション"]
        direction TB
        PM[pm-agent]
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

## 何が違うのか

- **`.agents/`が原本です**: スキル、ワークフロー、共有リソース、設定がひとつのプロジェクト構造に入っていて、特定のIDEプラグインに閉じ込められません。
- **エンジニアリング組織のように動きます**: PM、QA、DB、Infra、Frontend、Backend、Mobile、Debug、Workflowの各エージェントが、プロンプトの寄せ集めではなくチームとして役割を分担します。
- **ワークフローが最初に来ます**: 企画、レビュー、デバッグ、協調実行がおまけではなく、コアのワークフローとして設計されています。
- **標準を知っています**: ISO基準の企画、QA、DBセキュリティ、インフラガバナンスのガイドがエージェントに組み込まれています。
- **検証できます**: ダッシュボード、マニフェスト生成、実行プロトコル、構造化された出力で結果を追跡できます。ただ生成するだけではありません。

## 互換性

`oh-my-agent`は`.agents/`を中心に設計されていて、必要に応じて他のツールのスキルフォルダとつなぎます。

| ツール / IDE | スキルソース | 連携方式 | 備考 |
|------------|---------------|--------------|-------|
| Antigravity | `.agents/skills/` | ネイティブ | 原本のレイアウト |
| Claude Code | `.claude/skills/` + `.claude/agents/` | ネイティブ + アダプター | ドメインスキルはシンボリックリンク、ワークフロースキル・サブエージェント・CLAUDE.mdはネイティブ |
| OpenCode | `.agents/skills/` | 互換 | 同じスキルソースを使用 |
| Amp | `.agents/skills/` | 互換 | 同じソースを共有 |
| Codex CLI | `.agents/skills/` | 互換 | 同じスキルソースで動作 |
| Cursor | `.agents/skills/` | 互換 | 同じスキルソースを使用可能 |
| GitHub Copilot | `.github/skills/` | シンボリックリンク（任意） | セットアップ時に選択するとインストール |

サポート状況と連携方法は[SUPPORTED_AGENTS.md](./SUPPORTED_AGENTS.md)を参照してください。

### Claude Codeとのネイティブ連携

Claude Codeはシンボリックリンクだけでなく、直接連携できます:

- **`CLAUDE.md`** — プロジェクト情報、アーキテクチャ、ルール（Claude Codeが自動で読み込み）
- **`.claude/skills/`** — `.agents/workflows/`から取り込んだ12のワークフロースキル（`/orchestrate`、`/coordinate`、`/ultrawork`など）
- **`.claude/agents/`** — Task toolで起動する7つのサブエージェント（backend-impl、frontend-impl、mobile-impl、db-impl、qa-reviewer、debug-investigator、pm-planner）
- **ループパターン** — CLIポーリングなしで、Task toolの同期結果を使ったReview Loop、Issue Remediation Loop、Phase Gate Loop

ドメインスキル（backend-agent、frontend-agentなど）は`.agents/skills/`からのシンボリックリンクです。ワークフロースキルは`.agents/workflows/*.md`の原本を参照するネイティブSKILL.mdファイルです。

## `.agents` 仕様

`oh-my-agent`は`.agents/`を、エージェントスキル・ワークフロー・共有コンテキストを入れるプロジェクト規約として使います。

- スキル: `.agents/skills/<skill-name>/SKILL.md`
- 共有リソース: `.agents/skills/_shared/`
- ワークフロー: `.agents/workflows/*.md`
- プロジェクト設定: `.agents/config/`
- CLIメタデータとパッケージングは生成されたマニフェストで管理

レイアウト、必須ファイル、連携ルールの詳細は[AGENTS_SPEC.md](./AGENTS_SPEC.md)を参照してください。

## 何ができるのか

複数のエージェントが協力して開発する**Agent Skills**のコレクションです。専門エージェントに役割を分けて任せます:

| エージェント | 担当 | こういう時に呼びます |
|-------|---------------|----------|
| **Brainstorm** | 企画前にアイデアを探る | "brainstorm"、"ideate"、"explore idea" |
| **PM Agent** | 要件分析、タスク分解、アーキテクチャ | "plan"、"break down"、"what should we build" |
| **Frontend Agent** | React/Next.js、TypeScript、Tailwind CSS | "UI"、"component"、"styling" |
| **Backend Agent** | FastAPI、PostgreSQL、JWT認証 | "API"、"database"、"authentication" |
| **DB Agent** | SQL/NoSQLモデリング、正規化、整合性、バックアップ | "ERD"、"schema"、"DB設計"、"index tuning" |
| **Mobile Agent** | Flutterクロスプラットフォーム開発 | "mobile app"、"iOS/Android" |
| **QA Agent** | OWASP Top 10セキュリティ、パフォーマンス、アクセシビリティ | "review security"、"audit"、"check performance" |
| **Debug Agent** | バグ診断、原因分析、回帰テスト | "bug"、"error"、"crash" |
| **Developer Workflow** | モノレポ自動化、mise、CI/CD、リリース | "dev workflow"、"mise"、"CI/CD" |
| **TF Infra Agent** | マルチクラウドIaC（AWS、GCP、Azure、OCI） | "infrastructure"、"terraform"、"cloud" |
| **Orchestrator** | CLIでエージェントを並列実行 + Serena Memory | "spawn agent"、"parallel execution" |
| **Commit** | Conventional Commitsのルールでコミット | "commit"、"save changes" |

## クイックスタート

### 必要なもの

- **AI IDE**（Antigravity、Claude Code、Codex、Geminiなど）

### オプション1: ワンラインインストール（推奨）

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

足りない依存関係（bun、uv）を自動で見つけてインストールし、対話型セットアップを始めます。

### オプション2: 手動インストール

```bash
# bunがなければ:
# curl -fsSL https://bun.sh/install | bash

# uvがなければ:
# curl -LsSf https://astral.sh/uv/install.sh | sh

bunx oh-my-agent
```

プロジェクトタイプを選ぶと`.agents/skills/`にスキルがインストールされます。

| プリセット | スキル |
|--------|--------|
| ✨ All | すべて |
| 🌐 Fullstack | brainstorm, frontend, backend, db, pm, qa, debug, commit |
| 🎨 Frontend | brainstorm, frontend, pm, qa, debug, commit |
| ⚙️ Backend | brainstorm, backend, db, pm, qa, debug, commit |
| 📱 Mobile | brainstorm, mobile, pm, qa, debug, commit |
| 🚀 DevOps | brainstorm, tf-infra, dev-workflow, pm, qa, debug, commit |

### オプション3: グローバルインストール（Orchestrator用）

SubAgent Orchestratorを使うか、ツールをグローバルで使うには:

```bash
bun install --global oh-my-agent
```

CLIツールが最低1つ必要です:

| CLI | インストール | 認証 |
|-----|---------|------|
| Gemini | `bun install --global @google/gemini-cli` | `gemini auth` |
| Claude | `curl -fsSL https://claude.ai/install.sh \| bash` | `claude auth` |
| Codex | `bun install --global @openai/codex` | `codex auth` |
| Qwen | `bun install --global @qwen-code/qwen` | `qwen auth` |

### オプション4: 既存プロジェクトに追加

プロジェクトルートで実行すると、スキルとワークフローが自動インストールされます:

```bash
bunx oh-my-agent
```

> **ヒント:** インストール後に`bunx oh-my-agent doctor`を実行すると、設定が正しいか確認できます。

### 2. チャットで使う

**複雑なプロジェクト**（/coordinate）:

```
"ユーザー認証付きのTODOアプリを作って"
→ /coordinate → PM Agentが企画 → Agent Managerでエージェント起動
```

**全力投入**（/ultrawork）:

```
"認証モジュールのリファクタリング、APIテスト追加、ドキュメント更新"
→ /ultrawork → 独立したタスクがエージェント間で同時実行
```

**簡単なタスク**（エージェントが自動で起動）:

```
"Tailwind CSSでログインフォームを作って"
→ frontend-agentが起動
```

**コミット**（Conventional Commits）:

```
/commit
→ 変更を分析、コミットタイプ/スコープを提案、Co-Author付きでコミット
```

### 3. ダッシュボードで監視

ダッシュボードの設定と使い方は[`web/content/ja/guide/usage.md`](./web/content/ja/guide/usage.md#リアルタイムダッシュボード)を参照してください。

## スポンサー

このプロジェクトはスポンサーの皆さんのおかげで維持されています。

> **気に入りましたか？** スターをお願いします！
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> スターターテンプレートもあります: [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

<a href="https://github.com/sponsors/first-fluke">
  <img src="https://img.shields.io/badge/Sponsor-♥-ea4aaa?style=for-the-badge" alt="Sponsor" />
</a>
<a href="https://buymeacoffee.com/firstfluke">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-FFDD00?style=for-the-badge" alt="Buy Me a Coffee" />
</a>

### 🚀 Champion

<!-- Champion ($100/月) ロゴ -->

### 🛸 Booster

<!-- Booster ($30/月) ロゴ -->

### ☕ Contributor

<!-- Contributor ($10/月) 名前 -->

[スポンサーになる →](https://github.com/sponsors/first-fluke)

サポーターの一覧は[SPONSORS.md](./SPONSORS.md)を参照してください。

## スター履歴

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)

## ライセンス

MIT
