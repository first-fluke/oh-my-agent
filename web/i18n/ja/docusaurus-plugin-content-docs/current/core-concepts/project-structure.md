---
title: プロジェクト構造
description: oh-my-agentインストール後の完全ディレクトリツリー — .agents/（config、skills、workflows、agents、state、results、mcp.json）、.claude/（settings、hooks、skillsシンボリックリンク、agents）、.serena/memories/、oh-my-agentソースリポジトリ構造の全ファイル解説。
---

# プロジェクト構造

oh-my-agentインストール後、プロジェクトには3つのディレクトリツリーが追加されます：`.agents/`（唯一の信頼できるソース）、`.claude/`（IDE統合レイヤー）、`.serena/`（ランタイム状態）。このページではすべてのファイルとその目的を説明します。

---

## 完全ディレクトリツリー

```
your-project/
├── .agents/                          ← 唯一の信頼できるソース（SSOT）
│   ├── config/
│   │   └── oma-config.yaml    ← 言語、タイムゾーン、CLIマッピング
│   │
│   ├── skills/
│   │   ├── _shared/                  ← 全エージェント共通リソース
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
│   │   │   │   ├── reasoning-templates.md
│   │   │   │   ├── quality-principles.md
│   │   │   │   ├── vendor-detection.md
│   │   │   │   ├── session-metrics.md
│   │   │   │   ├── common-checklist.md
│   │   │   │   ├── lessons-learned.md
│   │   │   │   └── api-contracts/
│   │   │   │       ├── README.md
│   │   │   │       └── template.md
│   │   │   ├── runtime/
│   │   │   │   ├── memory-protocol.md
│   │   │   │   └── execution-protocols/
│   │   │   │       ├── claude.md
│   │   │   │       ├── gemini.md
│   │   │   │       ├── codex.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/             ← 各エージェントスキル
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   └── stack/                ← /stack-setで生成
│   │   ├── oma-mobile/
│   │   ├── oma-db/
│   │   ├── oma-design/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   ├── reference/            ← 深いリファレンス資料
│   │   │   └── examples/
│   │   ├── oma-pm/
│   │   ├── oma-qa/
│   │   ├── oma-debug/
│   │   ├── oma-tf-infra/
│   │   ├── oma-dev-workflow/
│   │   ├── oma-translator/
│   │   ├── oma-orchestrator/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   ├── scripts/
│   │   │   └── config/
│   │   ├── oma-brainstorm/
│   │   ├── oma-coordination/
│   │   └── oma-scm/
│   │
│   ├── workflows/                     ← 14のワークフロー定義
│   │   ├── orchestrate.md             ← 永続：自動並列実行
│   │   ├── work.md             ← 永続：ステップバイステップ協調
│   │   ├── ultrawork.md              ← 永続：5フェーズ品質ワークフロー
│   │   ├── plan.md
│   │   ├── exec-plan.md
│   │   ├── brainstorm.md
│   │   ├── deepinit.md
│   │   ├── review.md
│   │   ├── debug.md
│   │   ├── design.md
│   │   ├── scm.md
│   │   ├── tools.md
│   │   └── stack-set.md
│   │
│   ├── agents/                        ← 7つのサブエージェント定義
│   │   ├── backend-engineer.md
│   │   ├── frontend-engineer.md
│   │   ├── mobile-engineer.md
│   │   ├── db-engineer.md
│   │   ├── qa-reviewer.md
│   │   ├── debug-investigator.md
│   │   └── pm-planner.md
│   │
│   ├── results/plan-{sessionId}.json                      ← 生成されたプラン出力
│   ├── state/                         ← アクティブワークフロー状態ファイル
│   ├── results/                       ← エージェント結果ファイル
│   └── mcp.json                       ← MCPサーバー設定
│
├── .claude/                           ← IDE統合レイヤー
│   ├── settings.json                  ← フック登録とパーミッション
│   ├── hooks/
│   │   ├── triggers.json              ← キーワード-ワークフローマッピング（11言語）
│   │   ├── keyword-detector.ts        ← 自動検出ロジック
│   │   ├── persistent-mode.ts         ← 永続ワークフロー強制
│   │   └── hud.ts                     ← [OMA]ステータスラインインジケーター
│   ├── skills/                        ← シンボリックリンク → .agents/skills/
│   └── agents/                        ← Claude Code用サブエージェント定義
│
└── .serena/                           ← ランタイム状態（Serena MCP）
    └── memories/
        ├── orchestrator-session.md    ← セッションメタデータ
        ├── task-board.md              ← タスク割り当てとステータス
        ├── progress-{agent}.md        ← エージェントごとの進捗
        ├── result-{agent}.md          ← エージェントごとの最終出力
        ├── session-metrics.md         ← Clarification DebtとQuality Score
        ├── experiment-ledger.md       ← 実験追跡（条件付き）
        └── archive/
            └── metrics-{date}.md      ← アーカイブ済みメトリクス
```

---

## .agents/ — 信頼できるソース

すべてのエージェント動作の核心ディレクトリ。他のディレクトリはここから派生します。

### config/

**`oma-config.yaml`** — 中央設定ファイル：`language`（応答言語）、`date_format`、`timezone`、`default_cli`、`agent_cli_mapping`。

### skills/

エージェントの専門知識が格納されます。15ディレクトリ：14エージェントスキル + 1共有リソース。

**`_shared/`** — 全エージェント共通リソース：
- `core/` — ルーティング、コンテキストローディング、プロンプト構造、明確化プロトコル、コンテキスト予算、難易度評価、推論テンプレート、品質原則、ベンダー検出、セッションメトリクス、共通チェックリスト、学び、APIコントラクトテンプレート
- `runtime/` — CLIサブエージェント用メモリプロトコル、ベンダー固有実行プロトコル
- `conditional/` — 特定条件下でのみロード（Quality Score、Experiment Ledger、Exploration Loop）

**`oma-{agent}/`** — エージェントごとのスキルディレクトリ：
- `SKILL.md`（約800バイト） — レイヤー1：常にロード
- `resources/` — レイヤー2：オンデマンド
- 一部エージェントに追加ディレクトリ：`stack/`（oma-backend）、`reference/`（oma-design）、`scripts/`（oma-orchestrator）

### workflows/

14のMarkdownファイル。各ファイルにYAMLフロントマター、ルールセクション、ベンダー検出指示、ステップバイステップ実行プロトコル、ゲート定義（永続ワークフロー）を含む。

### agents/

Task/Agentツールまたは CLIでサブエージェントをスポーンする際に使用される7つの定義ファイル。

### plan-\{sessionId\}.json

`/plan`ワークフローで生成。エージェント割り当て、優先度、依存関係、受入基準を含む構造化タスク分解。

### state/

永続ワークフローのアクティブ状態ファイル。ワークフロー実行中のみ存在。削除で非アクティブ化。

### results/

完了エージェントの結果ファイル。ステータス、サマリー、変更ファイル、受入基準チェックリスト。

### mcp.json

MCPサーバー設定：サーバー定義、メモリ設定（`memoryConfig`）、ツールグループ定義。

---

## .claude/ — IDE統合

Claude Codeおよびその他のIDEとoh-my-agentを接続するディレクトリ。

### settings.json

Claude Code用のフックとパーミッション登録。

### hooks/

- **`triggers.json`** — 11言語のキーワード-ワークフローマッピング、情報パターン、除外ワークフロー
- **`keyword-detector.ts`** — 入力スキャン、情報パターンチェック、ワークフローコンテキスト注入
- **`persistent-mode.ts`** — アクティブ状態ファイル確認と永続モード強制
- **`hud.ts`** — [OMA]インジケーター表示（モデル名、コンテキスト使用率、ワークフロー状態）

### skills/

`.agents/skills/`を指すシンボリックリンク。IDEが`.claude/skills/`から読み取る場合でもSSOTは`.agents/`。

### agents/

Claude CodeのAgent tool用サブエージェント定義。

---

## .serena/memories/ — ランタイム状態

オーケストレーションセッション中にエージェントが進捗を書き込む場所。ダッシュボードがリアルタイム監視。

| ファイル | オーナー | 目的 |
|------|-------|---------|
| `orchestrator-session.md` | オーケストレータ | セッションID、ステータス、開始時刻、フェーズ |
| `task-board.md` | オーケストレータ | タスク割り当て、優先度、ステータス |
| `progress-{agent}.md` | 当該エージェント | ターンごとの進捗更新 |
| `result-{agent}.md` | 当該エージェント | 最終出力と受入基準 |
| `session-metrics.md` | オーケストレータ | Clarification DebtとQuality Score |
| `experiment-ledger.md` | オーケストレータ/QA | Quality Score有効時の実験追跡 |
| `tool-overrides.md` | /toolsワークフロー | 一時的ツール制限 |
| `archive/metrics-{date}.md` | システム | アーカイブ済みメトリクス（30日保持） |

メモリファイルのパスとツール名は`.agents/mcp.json`の`memoryConfig`で設定可能。

---

## oh-my-agentソースリポジトリ構造

oh-my-agent自体を開発する場合のリポジトリ構造：

```
oh-my-agent/
├── cli/                  ← CLIツールソース（TypeScript、bunビルド）
│   ├── src/
│   ├── package.json
│   └── install.sh
├── web/                  ← ドキュメントサイト（Next.js）
│   └── content/
│       └── en/
├── action/               ← 自動スキル更新用GitHub Action
├── docs/                 ← 翻訳READMEと仕様
├── .agents/              ← ソースリポジトリでは編集可能
├── .claude/
├── .serena/
├── CLAUDE.md
└── package.json
```

ソースリポジトリでは`.agents/`の変更が許可されています（SSOTの例外）。

開発コマンド：
- `bun run test` — CLIテスト（vitest）
- `bun run lint` — リント
- `bun run build` — CLIビルド
- Conventional Commit形式が必須（commitlint強制）
