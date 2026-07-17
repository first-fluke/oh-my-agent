---
title: プロジェクト構造
description: oh-my-agentインストール後の完全ディレクトリツリー解説。.agents/（config、skills、workflows、agents、state、results、mcp.json）、.claude/（settings、hooks、skillsシンボリックリンク、agents）、.serena/memories/、oh-my-agentソースリポジトリ構造の全ファイルを網羅します。
---

# プロジェクト構造

oh-my-agentインストール後、プロジェクトには3つのディレクトリツリーが追加されます：`.agents/`（唯一の信頼できるソース）、`.claude/`（IDE統合レイヤー）、`.serena/`（ランタイム状態）。このページではすべてのファイルとその目的を説明します。

---

## 完全ディレクトリツリー

```
your-project/
├── .agents/                          ← 唯一の信頼できるソース（SSOT）
│   ├── oma-config.yaml           ← 言語、model_preset、エージェントオーバーライド
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
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── tech-stack.md
│   │   │       ├── tailwind-rules.md
│   │   │       ├── component-template.tsx
│   │   │       ├── snippets.md
│   │   │       ├── error-playbook.md
│   │   │       ├── checklist.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── examples.md
│   │   │   │   ├── orm-reference.md
│   │   │   │   ├── checklist.md
│   │   │   │   └── error-playbook.md
│   │   │   └── stack/                 ← /stack-setで生成
│   │   │       ├── stack.yaml
│   │   │       ├── tech-stack.md
│   │   │       ├── snippets.md
│   │   │       └── api-template.*
│   │   │
│   │   ├── oma-mobile/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── tech-stack.md
│   │   │       ├── snippets.md
│   │   │       ├── screen-template.dart
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-db/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── document-templates.md
│   │   │       ├── anti-patterns.md
│   │   │       ├── vector-db.md
│   │   │       ├── iso-controls.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-design/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── anti-patterns.md
│   │   │   │   ├── checklist.md
│   │   │   │   ├── design-md-spec.md
│   │   │   │   ├── design-tokens.md
│   │   │   │   ├── prompt-enhancement.md
│   │   │   │   ├── stitch-integration.md
│   │   │   │   └── error-playbook.md
│   │   │   └── reference/
│   │   │       ├── typography.md
│   │   │       ├── color-and-contrast.md
│   │   │       ├── spatial-design.md
│   │   │       ├── motion-design.md
│   │   │       ├── responsive-design.md
│   │   │       ├── component-patterns.md
│   │   │       ├── accessibility.md
│   │   │       └── shader-and-3d.md
│   │   │
│   │   ├── oma-pm/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── examples.md
│   │   │       ├── iso-planning.md
│   │   │       ├── task-template.json
│   │   │       └── error-playbook.md
│   │   │
│   │   ├── oma-qa/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── iso-quality.md
│   │   │       ├── checklist.md
│   │   │       ├── self-check.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-debug/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── common-patterns.md
│   │   │       ├── debugging-checklist.md
│   │   │       ├── bug-report-template.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-tf-infra/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── multi-cloud-examples.md
│   │   │       ├── cost-optimization.md
│   │   │       ├── policy-testing-examples.md
│   │   │       ├── iso-42001-infra.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-dev-workflow/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── validation-pipeline.md
│   │   │       ├── database-patterns.md
│   │   │       ├── api-workflows.md
│   │   │       ├── i18n-patterns.md
│   │   │       ├── release-coordination.md
│   │   │       └── troubleshooting.md
│   │   │
│   │   ├── oma-translator/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── translation-rubric.md
│   │   │       └── anti-ai-patterns.md
│   │   │
│   │   ├── oma-orchestrator/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── subagent-prompt-template.md
│   │   │   │   └── memory-schema.md
│   │   │   ├── scripts/
│   │   │   │   ├── spawn-agent.sh
│   │   │   │   ├── parallel-run.sh
│   │   │   │   └── verify.sh
│   │   │   ├── templates/
│   │   │   └── config/
│   │   │       └── cli-config.yaml
│   │   │
│   │   ├── oma-brainstorm/
│   │   │   └── SKILL.md
│   │   │
│   │   ├── oma-coordination/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       └── examples.md
│   │   │
│   │   └── oma-scm/
│   │       ├── SKILL.md
│   │       ├── config/
│   │       │   └── commit-config.yaml
│   │       └── resources/
│   │           └── conventional-commits.md
│   │
│   ├── workflows/
│   │   ├── orchestrate.md             ← 永続：自動並列実行
│   │   ├── work.md             ← 永続：ステップバイステップ協調
│   │   ├── ultrawork.md              ← 永続：5フェーズ品質ワークフロー
│   │   ├── plan.md                   ← PMタスク分解 + プラントラッカー成果物
│   │   ├── brainstorm.md             ← デザインファーストのアイデア出し
│   │   ├── deepinit.md               ← プロジェクト初期化
│   │   ├── review.md                 ← QAレビューパイプライン
│   │   ├── debug.md                  ← 構造化デバッグ
│   │   ├── design.md                 ← 7フェーズデザインワークフロー
│   │   ├── scm.md                 ← Conventional commits
│   │   ├── tools.md                  ← MCPツール管理
│   │   └── stack-set.md              ← 技術スタック設定
│   │
│   ├── agents/
│   │   ├── backend-engineer.md        ← サブエージェント定義：backend
│   │   ├── frontend-engineer.md       ← サブエージェント定義：frontend
│   │   ├── mobile-engineer.md         ← サブエージェント定義：mobile
│   │   ├── db-engineer.md             ← サブエージェント定義：database
│   │   ├── qa-reviewer.md             ← サブエージェント定義：QA
│   │   ├── debug-investigator.md      ← サブエージェント定義：debug
│   │   └── pm-planner.md             ← サブエージェント定義：PM
│   │
│   ├── results/plan-{sessionId}.json                      ← 生成されたプラン出力（/planで作成）
│   ├── state/                         ← アクティブワークフロー状態ファイル
│   │   ├── orchestrate-state.json     ← （ワークフロー実行中のみ存在）
│   │   ├── ultrawork-state.json
│   │   └── work-state.json
│   ├── results/                       ← エージェント結果ファイル
│   │   └── result-{agent}.md          ← （完了したエージェントが作成）
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
│   │   ├── oma-frontend -> ../../.agents/skills/oma-frontend
│   │   ├── oma-backend -> ../../.agents/skills/oma-backend
│   │   └── ...
│   └── agents/                        ← Claude Code用サブエージェント定義
│       ├── backend-engineer.md
│       ├── frontend-engineer.md
│       └── ...
│
└── .serena/                           ← ランタイム状態（Serena MCP）
    └── memories/
        ├── orchestrator-session.md    ← セッションID、ステータス、フェーズ追跡
        ├── task-board.md              ← タスク割り当てとステータス
        ├── progress-{agent}.md        ← エージェントごとのターン単位の進捗
        ├── result-{agent}.md          ← エージェントごとの最終出力
        ├── session-metrics.md         ← Clarification DebtとQuality Scoreの追跡
        ├── experiment-ledger.md       ← 実験追跡（条件付き）
        ├── session-work.md      ← workワークフローのセッション状態
        ├── session-ultrawork.md       ← ultraworkワークフローのセッション状態
        ├── tool-overrides.md          ← 一時的ツール制限（/tools --temp）
        └── archive/
            └── metrics-{date}.md      ← アーカイブ済みセッションメトリクス
```

---

## .agents/: 信頼できるソース

すべてのエージェント動作の核心ディレクトリ。他のディレクトリはここから派生します。

### config/

**`oma-config.yaml`**: 中央設定ファイル。以下を含みます。
- `language`：応答言語コード（en、ko、ja、zh、es、fr、de、pt、ru、nl、pl）
- `date_format`：タイムスタンプ形式の文字列（デフォルト：`YYYY-MM-DD`）
- `timezone`：タイムゾーン識別子（デフォルト：`UTC`）
- `model_preset`：アクティブなモデルプリセットキー（ビルトインまたはカスタム）
- `agents`：エージェントごとの部分オーバーライド（オブジェクト型`AgentSpec`、任意）
- `models`：ユーザー定義モデルのスラグ（任意）
- `custom_presets`：ユーザー定義プリセット。`extends:`で部分継承が可能（任意）

### skills/

エージェントの専門知識が格納されます。22ディレクトリ：21エージェントスキル + 1共有リソース。

**`_shared/`**: 全エージェント共通リソース。
- `core/`: ルーティング、コンテキストローディング、プロンプト構造、明確化プロトコル、コンテキスト予算、難易度評価、推論テンプレート、品質原則、ベンダー検出、セッションメトリクス、共通チェックリスト、学び、APIコントラクトテンプレート
- `runtime/`: CLIサブエージェント用メモリプロトコル、ベンダー固有実行プロトコル
- `conditional/`: 特定条件下でのみロード（Quality Score、Experiment Ledger、Exploration Loop）

**`oma-{agent}/`**: エージェントごとのスキルディレクトリ。
- `SKILL.md`（約800バイト）: レイヤー1、常にロード
- `resources/`: レイヤー2、オンデマンド
- 一部エージェントに追加ディレクトリ：`stack/`（oma-backend）、`reference/`（oma-design）、`scripts/`（oma-orchestrator）

### workflows/

スラッシュコマンドの動作を定義する16のMarkdownファイル。各ファイルには以下が含まれます。
- `description`を含むYAMLフロントマター
- 必須ルールセクション（応答言語、ステップ順序、MCPツール要件）
- ベンダー検出指示
- ステップバイステップの実行プロトコル
- ゲート定義（永続ワークフローのみ）

永続ワークフロー：`orchestrate.md`、`work.md`、`ultrawork.md`。
非永続：`plan.md`、`brainstorm.md`、`deepinit.md`、`review.md`、`debug.md`、`design.md`、`scm.md`、`tools.md`、`stack-set.md`。

### agents/

Task tool（Claude Code）またはCLIでサブエージェントをスポーンする際に使用される7つの定義ファイル。各ファイルは以下を定義します。
- フロントマター：`name`、`description`、`skills`（ロードするスキル）
- 実行プロトコル参照
- Charter Preflight（CHARTER_CHECK）テンプレート
- アーキテクチャサマリ
- ドメイン固有ルール（10項目）
- ステートメント：「`.agents/`ファイルを変更しない」

### plan-\{sessionId\}.json

`/plan`ワークフローで生成。エージェント割り当て、優先度、依存関係、受入基準を含む構造化タスク分解。`/orchestrate`と`/work`が消費します。対応する人間可読のトラッカーは`docs/plans/work/{NNN}-{name}.md`に存在します（ライフサイクルは`Status`フィールドで管理）。永続的なデザインリファレンスは`docs/plans/designs/{NNN}-{name}.md`に並列して保存されます。

### state/

永続ワークフローのアクティブ状態ファイル。ワークフロー実行中のみ存在。削除で非アクティブ化。

### results/

完了エージェントの結果ファイル。ステータス、サマリー、変更ファイル、受入基準チェックリスト。

### mcp.json

MCPサーバー設定：サーバー定義、メモリ設定（`memoryConfig`）、ツールグループ定義。

---

## .claude/: IDE統合

Claude Codeおよびその他のIDEとoh-my-agentを接続するディレクトリ。

### settings.json

Claude Code用のフックとパーミッション登録。

### hooks/

- **`triggers.json`**: キーワード-ワークフローマッピング。以下を定義します。
  - `workflows`: ワークフロー名から `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] } }` へのマップ。`keywords` はリテラルなフレーズ、`patterns` は生の正規表現文字列（`iu` フラグでコンパイル）です。
  - `informationalPatterns`: 質問を示すフレーズ（自動検出からフィルタリングされます）
  - `excludedWorkflows`: 明示的な `/command` 呼び出しを必要とするワークフロー
  - `cjkScripts`: CJK スクリプトを使用する言語コード（ko、ja、zh）

  `keywords`、`patterns`、`informationalPatterns` 内の言語セクションは次の規約に従います：
  - `*`: ユニバーサル/英語。`.agents/oma-config.yaml` の `language` 設定に関わらず常にロードされます。
  - `en`: 後方互換性のためにロードされます。機能的には `*` と等価です。新しい英語コンテンツは `*` に追加してください。
  - `ko` / `ja` / `zh` など: 言語固有。`.agents/oma-config.yaml` で `language: <code>` が設定されている場合のみロードされます。
- **`keyword-detector.ts`**: 以下を行う TypeScript フックです。
  1. 入力をサニタイズ（コードブロック、引用符付き文字列、貼り付けられたシステムエコーブロックを除去）
  2. クリーンアップされた入力をトリガー `keywords`（リテラル）と `patterns`（正規表現）に対してスキャン
  3. 各マッチの周囲 60 文字のウィンドウで情報パターンを確認
  4. 強化ガードを適用（同じワークフローが 60 秒以内に 2 回以上トリガーされた場合は抑制）
  5. `[OMA WORKFLOW: ...]` または `[OMA PERSISTENT MODE: ...]` をコンテキストに注入
- **`persistent-mode.ts`**: アクティブ状態ファイル確認と永続モード強制
- **`hud.ts`**: [OMA]インジケーター表示（モデル名、コンテキスト使用率、ワークフロー状態）

### skills/

`.agents/skills/`を指すシンボリックリンク。IDEが`.claude/skills/`から読み取る場合でもSSOTは`.agents/`。

### agents/

Claude CodeのAgent tool用サブエージェント定義。

---

## .serena/memories/: ランタイム状態

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

oh-my-agent自体を開発する場合（単に利用するのではなく）、リポジトリはモノレポ構成です。

```
oh-my-agent/
├── cli/                  ← CLIツールソース（TypeScript、bunビルド）
│   ├── src/              ← ソースコード
│   ├── package.json
│   └── install.sh        ← ブートストラップインストーラー
├── web/                  ← ドキュメントサイト（Docusaurus）
│   ├── docs/             ← 英語ドキュメントページ（ベースロケール）
│   └── i18n/             ← 翻訳ドキュメントページ
├── action/               ← 自動スキル更新用GitHub Action
├── docs/                 ← 翻訳READMEと仕様
├── .agents/              ← ソースリポジトリでは編集可能（これがソース本体）
├── .claude/              ← IDE統合
├── .serena/              ← 開発時ランタイム状態
├── CLAUDE.md             ← Claude Code向けプロジェクト指示
└── package.json          ← ルートワークスペース設定
```

ソースリポジトリでは`.agents/`の変更が許可されています（ソースリポジトリ自体に対するSSOTの例外）。`.agents/`を変更しないというルールは利用側プロジェクトに適用され、oh-my-agentリポジトリには適用されません。

開発コマンド（リポジトリルートから実行）：
- `bun run test`: CLIテスト（vitest）
- `bun run lint`: CLIとwebワークスペースのリント
- `bun run build`: CLIビルド
- `bun run typecheck`: CLIとwebの型チェック
- コミットはConventional Commit形式に従う必要があります（commitlintで強制）
