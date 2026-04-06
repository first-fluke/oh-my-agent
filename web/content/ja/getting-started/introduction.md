---
title: はじめに
description: oh-my-agentの包括的な概要 — AIコーディングアシスタントを14の専門エージェント、段階的スキルローディング、クロスIDE対応を備えた専門エンジニアリングチームへと変換するマルチエージェントオーケストレーションフレームワーク。
---

# はじめに

oh-my-agentは、AI搭載IDEおよびCLIツール向けのマルチエージェントオーケストレーションフレームワークです。単一のAIアシスタントにすべてを任せるのではなく、oh-my-agentは作業を14の専門エージェントに分散させます。各エージェントは実際のエンジニアリングチームの役割に基づいてモデリングされており、それぞれ固有の技術スタック知識、実行プロトコル、エラー対応手順、品質チェックリストを備えています。

システム全体はプロジェクト内のポータブルな`.agents/`ディレクトリに格納されます。Claude Code、Gemini CLI、Codex CLI、Antigravity IDE、Cursor、その他のサポートされたツール間を自由に切り替えられます。エージェント設定はコードとともに移動します。

---

## マルチエージェントパラダイム

従来のAIコーディングアシスタントはジェネラリストとして動作します。フロントエンド、バックエンド、データベース、セキュリティ、インフラストラクチャを同じプロンプトコンテキストと同じレベルの専門知識で扱います。これにより以下の問題が生じます：

- **コンテキストの希薄化** — すべてのドメインの知識をロードするとコンテキストウィンドウが無駄になる
- **品質の不安定さ** — ジェネラリストは単一ドメインにおいてスペシャリストに及ばない
- **協調の欠如** — 複数ドメインにまたがる複雑な機能が順次処理される

oh-my-agentは専門化によってこれを解決します：

1. **各エージェントが一つのドメインに精通。** フロントエンドエージェントはReact/Next.js、shadcn/ui、TailwindCSS v4、FSD-liteアーキテクチャを熟知しています。バックエンドエージェントはRepository-Service-Routerパターン、パラメータ化クエリ、JWT認証を理解しています。それぞれの守備範囲は重複しません。

2. **エージェントは並列で動作。** バックエンドエージェントがAPIを構築している間に、フロントエンドエージェントはすでにUIを作成しています。オーケストレータが共有メモリを介して調整します。

3. **品質が組み込み済み。** すべてのエージェントにドメイン固有のチェックリストとエラー対応手順があります。チャータープリフライトがコード記述前にスコープクリープを検出します。QAレビューは付け足しではなく、正式なステップです。

---

## 全14エージェント

### アイデア出しと計画

| エージェント | 役割 | 主な機能 |
|-------|------|-----------------|
| **oma-brainstorm** | デザインファーストのアイデア出し | ユーザーの意図を探り、2〜3のアプローチをトレードオフ分析とともに提案し、コード記述前に設計ドキュメントを作成。6フェーズワークフロー：Context、Questions、Approaches、Design、Documentation、`/plan`への遷移。 |
| **oma-pm** | プロダクトマネージャー | 要件を依存関係付きの優先タスクに分解。APIコントラクトを定義。`.agents/plan.json`と`task-board.md`を出力。ISO 21500コンセプト、ISO 31000リスクフレーミング、ISO 38500ガバナンスをサポート。 |

### 実装

| エージェント | 役割 | 技術スタックとリソース |
|-------|------|----------------------|
| **oma-frontend** | UI/UXスペシャリスト | React、Next.js、TypeScript、TailwindCSS v4、shadcn/ui、FSD-liteアーキテクチャ。ライブラリ：luxon（日付）、ahooks（フック）、es-toolkit（ユーティリティ）、Jotai（クライアント状態）、TanStack Query（サーバー状態）、@tanstack/react-form + Zod（フォーム）、better-auth（認証）、nuqs（URL状態）。リソース：`execution-protocol.md`、`tech-stack.md`、`tailwind-rules.md`、`component-template.tsx`、`snippets.md`、`error-playbook.md`、`checklist.md`、`examples/`。 |
| **oma-backend** | API・サーバーサイドスペシャリスト | クリーンアーキテクチャ（Router-Service-Repository-Models）。スタック非依存 — プロジェクトマニフェストからPython/Node.js/Rust/Go/Java/Elixir/Ruby/.NETを検出。認証にJWT + bcrypt。リソース：`execution-protocol.md`、`orm-reference.md`、`examples.md`、`checklist.md`、`error-playbook.md`。言語固有の`stack/`リファレンス生成に`/stack-set`をサポート。 |
| **oma-mobile** | クロスプラットフォームモバイル | Flutter、Dart、Riverpod/Bloc（状態管理）、Dio with interceptors（API呼び出し）、GoRouter（ナビゲーション）。クリーンアーキテクチャ：domain-data-presentation。Material Design 3（Android）+ iOS HIG。60fpsターゲット。リソース：`execution-protocol.md`、`tech-stack.md`、`snippets.md`、`screen-template.dart`、`checklist.md`、`error-playbook.md`。 |
| **oma-db** | データベースアーキテクチャ | SQL、NoSQL、ベクトルデータベースのモデリング。スキーマ設計（デフォルト3NF）、正規化、インデックス、トランザクション、キャパシティプランニング、バックアップ戦略。ISO 27001/27002/22301対応設計をサポート。リソース：`execution-protocol.md`、`document-templates.md`、`anti-patterns.md`、`vector-db.md`、`iso-controls.md`、`checklist.md`、`error-playbook.md`。 |

### デザイン

| エージェント | 役割 | 主な機能 |
|-------|------|-----------------|
| **oma-design** | デザインシステムスペシャリスト | トークン、タイポグラフィ、カラーシステム、モーションデザイン（motion/react、GSAP、Three.js）、レスポンシブファーストレイアウト、WCAG 2.2準拠のDESIGN.mdを作成。7フェーズワークフロー：Setup、Extract、Enhance、Propose、Generate、Audit、Handoff。アンチパターン（「AIスロップ」排除）を強制。オプションでStitch MCP統合。リソース：`design-md-spec.md`、`design-tokens.md`、`anti-patterns.md`、`prompt-enhancement.md`、`stitch-integration.md`、さらにタイポグラフィ、カラー、空間、モーション、レスポンシブ、コンポーネント、アクセシビリティ、シェーダーの各ガイドを含む`reference/`ディレクトリ。 |

### インフラストラクチャとDevOps

| エージェント | 役割 | 主な機能 |
|-------|------|-----------------|
| **oma-tf-infra** | Infrastructure-as-Code | マルチクラウドTerraform（AWS、GCP、Azure、Oracle Cloud）。OIDCファースト認証、最小権限IAM、Policy-as-Code（OPA/Sentinel）、コスト最適化。ISO/IEC 42001 AI制御、ISO 22301継続性、ISO/IEC/IEEE 42010アーキテクチャドキュメントをサポート。リソース：`multi-cloud-examples.md`、`cost-optimization.md`、`policy-testing-examples.md`、`iso-42001-infra.md`、`checklist.md`。 |
| **oma-dev-workflow** | モノレポタスク自動化 | miseタスクランナー、CI/CDパイプライン、データベースマイグレーション、リリース調整、gitフック、pre-commitバリデーション。リソース：`validation-pipeline.md`、`database-patterns.md`、`api-workflows.md`、`i18n-patterns.md`、`release-coordination.md`、`troubleshooting.md`。 |

### 品質とデバッグ

| エージェント | 役割 | 主な機能 |
|-------|------|-----------------|
| **oma-qa** | 品質保証 | セキュリティ監査（OWASP Top 10）、パフォーマンス分析、アクセシビリティ（WCAG 2.1 AA）、コード品質レビュー。重要度：CRITICAL/HIGH/MEDIUM/LOWにファイル:行と修正コードを添付。ISO/IEC 25010品質特性とISO/IEC 29119テスト準拠をサポート。リソース：`execution-protocol.md`、`iso-quality.md`、`checklist.md`、`self-check.md`、`error-playbook.md`。 |
| **oma-debug** | バグ診断と修正 | 再現ファーストの手法。根本原因分析、最小限の修正、回帰テスト必須、類似パターンスキャン。シンボルトレースにSerena MCPを使用。リソース：`execution-protocol.md`、`common-patterns.md`、`debugging-checklist.md`、`bug-report-template.md`、`error-playbook.md`。 |

### ローカライゼーション、協調、Git

| エージェント | 役割 | 主な機能 |
|-------|------|-----------------|
| **oma-translator** | コンテキスト対応翻訳 | 4段階翻訳法：原文分析、意味抽出、ターゲット言語での再構成、検証。トーン、レジスター、ドメイン用語を保持。アンチAIパターン検出。バッチ翻訳（i18nファイル）をサポート。出版品質向けのオプション7段階精密モード。リソース：`translation-rubric.md`、`anti-ai-patterns.md`。 |
| **oma-orchestrator** | 自動マルチエージェントコーディネーター | CLIサブエージェントを並列で起動し、MCPメモリで調整、進捗を監視、検証ループを実行。設定可能：MAX_PARALLEL（デフォルト3）、MAX_RETRIES（デフォルト2）、POLL_INTERVAL（デフォルト30秒）。エージェント間レビューループとClarification Debtモニタリングを含む。リソース：`subagent-prompt-template.md`、`memory-schema.md`。 |
| **oma-commit** | Conventional Commits | 変更を分析し、タイプ/スコープを決定し、適切な場合は機能ごとに分割し、Conventional Commits形式でコミットメッセージを生成。Co-Author：`First Fluke <our.first.fluke@gmail.com>`。 |

---

## 段階的開示モデル

oh-my-agentはコンテキストウィンドウの枯渇を防ぐため、2層スキルアーキテクチャを採用しています：

**レイヤー1 — SKILL.md（約800バイト、常にロード済み）：**
エージェントのアイデンティティ、ルーティング条件、コアルール、「使うべき場合/使うべきでない場合」のガイダンスを含みます。エージェントがアクティブに作業していないときにロードされるのはこれだけです。

**レイヤー2 — resources/（オンデマンドでロード）：**
実行プロトコル、技術スタックリファレンス、コードスニペット、エラー対応手順、チェックリスト、サンプルを含みます。エージェントがタスクのために呼び出されたときのみロードされ、その場合でも特定のタスクタイプに関連するリソースのみがロードされます（`context-loading.md`の難易度評価とタスク-リソースマッピングに基づく）。

この設計により、すべてを事前にロードする場合と比較して約75%のトークンを節約できます。Flashティアモデル（128Kコンテキスト）では、総リソース予算は約3,100トークン — コンテキストウィンドウのわずか2.4%です。

---

## .agents/ — 唯一の信頼できるソース（SSOT）

oh-my-agentに必要なすべてが`.agents/`ディレクトリに格納されています：

```
.agents/
├── config/                 # oma-config.yaml
├── skills/                 # 15のスキルディレクトリ（14エージェント + _shared）
│   ├── _shared/            # 全エージェント共通のコアリソース
│   └── oma-{agent}/        # エージェントごとのSKILL.md + resources/
├── workflows/              # 14のワークフロー定義
├── agents/                 # 7つのサブエージェント定義
├── plan.json               # 生成されたプラン出力
├── state/                  # アクティブワークフロー状態ファイル
├── results/                # エージェント結果ファイル
└── mcp.json                # MCPサーバー設定
```

`.claude/`ディレクトリはIDE統合レイヤーとしてのみ存在し、`.agents/`を指すシンボリックリンクと、キーワード検出やHUDステータスラインのフックを含みます。`.serena/memories/`ディレクトリはオーケストレーションセッション中のランタイム状態を保持します。

このアーキテクチャにより、エージェント設定は：
- **ポータブル** — IDEを切り替えても再設定不要
- **バージョン管理可能** — `.agents/`をコードとともにコミット
- **共有可能** — チームメンバーが同じエージェント設定を取得

---

## サポートされるIDEとCLIツール

oh-my-agentはスキル/プロンプトローディングをサポートする任意のAI搭載IDEまたはCLIで動作します：

| ツール | 統合方法 | 並列エージェント |
|------|-------------------|----------------|
| **Claude Code** | ネイティブスキル + Agent tool | 真の並列処理にTask tool |
| **Gemini CLI** | `.agents/skills/`からスキル自動ロード | `oma agent:spawn` |
| **Codex CLI** | スキル自動ロード | モデル仲介並列リクエスト |
| **Antigravity IDE** | スキル自動ロード | `oma agent:spawn` |
| **Cursor** | `.cursor/`統合によるスキル | 手動スポーン |
| **OpenCode** | スキルローディング | 手動スポーン |

エージェントスポーンはベンダー検出プロトコルにより各ベンダーに自動適応します。これはベンダー固有のマーカーをチェックします（例：Claude CodeのAgent tool、Codex CLIの`apply_patch`）。

---

## スキルルーティングシステム

プロンプトを送信すると、oh-my-agentはスキルルーティングマップ（`.agents/skills/_shared/core/skill-routing.md`）を使用してどのエージェントが処理するかを決定します：

| ドメインキーワード | ルーティング先 |
|----------------|-----------|
| API、endpoint、REST、GraphQL、database、migration | oma-backend |
| auth、JWT、login、register、password | oma-backend |
| UI、component、page、form、screen（Web） | oma-frontend |
| style、Tailwind、responsive、CSS | oma-frontend |
| mobile、iOS、Android、Flutter、React Native、app | oma-mobile |
| bug、error、crash、broken、slow | oma-debug |
| review、security、performance、accessibility | oma-qa |
| UI design、design system、landing page、DESIGN.md | oma-design |
| brainstorm、ideate、explore、idea | oma-brainstorm |
| plan、breakdown、task、sprint | oma-pm |
| automatic、parallel、orchestrate | oma-orchestrator |

複数ドメインにまたがる複雑なリクエストの場合、ルーティングは確立された実行順序に従います。例えば、「フルスタックアプリを作成」は：oma-pm（計画）→ oma-backend + oma-frontend（並列実装）→ oma-qa（レビュー）にルーティングされます。

---

## 次のステップ

- **[インストール](./installation)** — 3つのインストール方法、プリセット、CLIセットアップ、検証
- **[エージェント](/core-concepts/agents)** — 全14エージェントとチャータープリフライトの詳細
- **[スキル](/core-concepts/skills)** — 2層アーキテクチャの解説
- **[ワークフロー](/core-concepts/workflows)** — トリガーとフェーズ付きの全14ワークフロー
- **[使い方ガイド](/guide/usage)** — 単一タスクからフルオーケストレーションまでの実例
