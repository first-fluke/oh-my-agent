---
title: エージェント
description: oh-my-agentの全14エージェント完全リファレンス — ドメイン、技術スタック、リソースファイル、機能、チャータープリフライトプロトコル、2層スキルローディング、スコープ付き実行ルール、品質ゲート、ワークスペース戦略、オーケストレーションフロー、ランタイムメモリ。
---

# エージェント

oh-my-agentのエージェントは、専門化されたエンジニアリングロールです。各エージェントには定義されたドメイン、技術スタック知識、リソースファイル、品質ゲート、実行制約があります。エージェントは汎用チャットボットではなく、自分の守備範囲を厳守し、構造化されたプロトコルに従うスコープ付きワーカーです。

---

## エージェントカテゴリ

| カテゴリ | エージェント | 責務 |
|----------|--------|---------------|
| **アイデア出し** | oma-brainstorm | アイデアの探索、アプローチの提案、設計ドキュメントの作成 |
| **計画** | oma-pm | 要件分解、タスク分割、APIコントラクト、優先度割り当て |
| **実装** | oma-frontend、oma-backend、oma-mobile、oma-db | 各ドメインでのプロダクションコード作成 |
| **デザイン** | oma-design | デザインシステム、DESIGN.md、トークン、タイポグラフィ、カラー、モーション、アクセシビリティ |
| **インフラ** | oma-tf-infra | マルチクラウドTerraformプロビジョニング、IAM、コスト最適化、Policy-as-Code |
| **DevOps** | oma-dev-workflow | miseタスクランナー、CI/CD、マイグレーション、リリース調整、モノレポ自動化 |
| **品質** | oma-qa | セキュリティ監査（OWASP）、パフォーマンス、アクセシビリティ（WCAG）、コード品質レビュー |
| **デバッグ** | oma-debug | バグ再現、根本原因分析、最小限の修正、回帰テスト |
| **ローカライゼーション** | oma-translator | トーン、レジスター、ドメイン用語を保持するコンテキスト対応翻訳 |
| **協調** | oma-orchestrator、oma-coordination | 自動および手動マルチエージェントオーケストレーション |
| **Git** | oma-scm | Conventional Commits生成、機能ベースのコミット分割 |

---

## 詳細エージェントリファレンス

### oma-brainstorm

**ドメイン：** 計画や実装前のデザインファーストアイデア出し。

**使用すべき場合：** 新機能のアイデア探索、ユーザー意図の理解、アプローチの比較。複雑または曖昧なリクエストの`/plan`前に使用。

**使用すべきでない場合：** 要件が明確な場合（oma-pmへ）、実装（ドメインエージェントへ）、コードレビュー（oma-qaへ）。

**コアルール：**
- デザイン承認前に実装や計画を行わない
- 質問は一度に一つ（バッチではなく）
- 常に推奨オプション付きの2〜3のアプローチを提案
- セクションごとの設計とユーザー確認
- YAGNI — 必要なものだけ設計

**ワークフロー：** 6フェーズ：コンテキスト探索、質問、アプローチ、設計、ドキュメント（`docs/plans/`に保存）、`/plan`への遷移。

**リソース：** 共有リソースのみ使用（clarification-protocol、reasoning-templates、quality-principles、skill-routing）。

---

### oma-pm

**ドメイン：** プロダクトマネジメント — 要件分析、タスク分解、APIコントラクト。

**使用すべき場合：** 複雑な機能の分解、実現可能性の判断、作業の優先順位付け、APIコントラクトの定義。

**コアルール：**
- APIファースト設計：実装タスク前にコントラクトを定義
- 各タスクに必要：エージェント、タイトル、受入基準、優先度、依存関係
- 最大並列実行のため依存関係を最小化
- セキュリティとテストは各タスクの一部（別フェーズではない）
- タスクは単一エージェントで完了可能であること
- オーケストレータ互換のJSON plan + task-board.mdを出力

**出力：** `.agents/results/plan-{sessionId}.json`、`.agents/brain/current-plan.md`、オーケストレータ用メモリ書き込み。

**リソース：** `execution-protocol.md`、`examples.md`、`iso-planning.md`、`task-template.json`、`../_shared/core/api-contracts/`。

**ターン制限：** デフォルト10、最大15。

---

### oma-frontend

**ドメイン：** Web UI — React、Next.js、TypeScript、FSD-liteアーキテクチャ。

**使用すべき場合：** ユーザーインターフェース、コンポーネント、クライアントサイドロジック、スタイリング、フォームバリデーション、API統合の構築。

**技術スタック：**
- React + Next.js（Server Componentsがデフォルト、インタラクティビティにClient Components）
- TypeScript（strict）
- TailwindCSS v4 + shadcn/ui（読み取り専用プリミティブ、cva/ラッパーで拡張）
- FSD-lite：ルート`src/` + フィーチャー`src/features/*/`（クロスフィーチャーインポート禁止）

**ライブラリ：**
| 用途 | ライブラリ |
|---------|---------|
| 日付 | luxon |
| スタイリング | TailwindCSS v4 + shadcn/ui |
| フック | ahooks |
| ユーティリティ | es-toolkit |
| URL状態 | nuqs |
| サーバー状態 | TanStack Query |
| クライアント状態 | Jotai（使用を最小限に） |
| フォーム | @tanstack/react-form + Zod |
| 認証 | better-auth |

**コアルール：**
- shadcn/uiファースト、cvaで拡張、`components/ui/*`を直接変更しない
- デザイントークンの1:1マッピング（色のハードコード禁止）
- ミドルウェアよりプロキシ（Next.js 16+はプロキシロジックに`proxy.ts`を使用）
- 3レベル以上のpropsドリリング禁止 — Jotai atomsを使用
- `@/`による絶対インポート必須
- FCPターゲット < 1秒
- レスポンシブブレークポイント：320px、768px、1024px、1440px

**リソース：** `execution-protocol.md`、`tech-stack.md`、`tailwind-rules.md`、`component-template.tsx`、`snippets.md`、`error-playbook.md`、`checklist.md`、`examples/`。

**品質ゲートチェックリスト：**
- アクセシビリティ：ARIAラベル、セマンティック見出し、キーボードナビゲーション
- モバイル：モバイルビューポートで検証
- パフォーマンス：CLSなし、高速ロード
- レジリエンス：Error BoundariesとLoading Skeletons
- テスト：ロジックをVitestでカバー
- 品質：型チェックとリントがパス

**ターン制限：** デフォルト20、最大30。

---

### oma-backend

**ドメイン：** API、サーバーサイドロジック、認証、データベース操作。

**使用すべき場合：** REST/GraphQL API、データベースマイグレーション、認証、サーバービジネスロジック、バックグラウンドジョブ。

**アーキテクチャ：** Router（HTTP）-> Service（ビジネスロジック）-> Repository（データアクセス）-> Models。

**スタック検出：** プロジェクトマニフェスト（pyproject.toml、package.json、Cargo.toml、go.modなど）を読み取って言語とフレームワークを決定。`stack/`ディレクトリがあればフォールバック、なければ`/stack-set`の実行をユーザーに提案。

**コアルール：**
- クリーンアーキテクチャ：ルートハンドラにビジネスロジックを置かない
- すべての入力をプロジェクトのバリデーションライブラリで検証
- パラメータ化クエリのみ（SQLでの文字列補間禁止）
- 認証にJWT + bcrypt、認証エンドポイントにレート制限
- サポートされている場合は非同期、すべてのシグネチャに型注釈
- 集約エラーモジュールによるカスタム例外
- 明示的なORMローディング戦略、トランザクション境界、安全なライフサイクル

**リソース：** `execution-protocol.md`、`examples.md`、`orm-reference.md`、`checklist.md`、`error-playbook.md`。`stack/`内のスタック固有リソース（`/stack-set`で生成）：`tech-stack.md`、`snippets.md`、`api-template.*`、`stack.yaml`。

**ターン制限：** デフォルト20、最大30。

---

### oma-mobile

**ドメイン：** クロスプラットフォームモバイルアプリ — Flutter、React Native。

**使用すべき場合：** ネイティブモバイルアプリ（iOS + Android）、モバイル固有のUIパターン、プラットフォーム機能（カメラ、GPS、プッシュ通知）、オフラインファーストアーキテクチャ。

**アーキテクチャ：** クリーンアーキテクチャ：domain -> data -> presentation。

**技術スタック：** Flutter/Dart、Riverpod/Bloc（状態管理）、Dio with interceptors（API）、GoRouter（ナビゲーション）、Material Design 3（Android）+ iOS HIG。

**コアルール：**
- 状態管理にRiverpod/Bloc（複雑なロジックにraw setStateを使わない）
- すべてのコントローラーを`dispose()`メソッドで破棄
- API呼び出しにDio with interceptors、オフラインを適切に処理
- 60fpsターゲット、両プラットフォームでテスト

**リソース：** `execution-protocol.md`、`tech-stack.md`、`snippets.md`、`screen-template.dart`、`checklist.md`、`error-playbook.md`、`examples.md`。

**ターン制限：** デフォルト20、最大30。

---

### oma-db

**ドメイン：** データベースアーキテクチャ — SQL、NoSQL、ベクトルデータベース。

**使用すべき場合：** スキーマ設計、ERD、正規化、インデックス、トランザクション、キャパシティプランニング、バックアップ戦略、マイグレーション設計、ベクトルDB/RAGアーキテクチャ、アンチパターンレビュー、コンプライアンス対応設計（ISO 27001/27002/22301）。

**デフォルトワークフロー：** 探索（エンティティ、アクセスパターン、ボリュームの特定）-> 設計（スキーマ、制約、トランザクション）-> 最適化（インデックス、パーティショニング、アーカイブ、アンチパターン）。

**コアルール：**
- まずモデルを選択、次にエンジンを選択
- リレーショナルはデフォルト3NF、分散型はBASEトレードオフを文書化
- 3つのスキーマ層すべてを文書化：外部、概念、内部
- 整合性はファーストクラス：エンティティ、ドメイン、参照、ビジネスルール
- 並行性は暗黙にしない：トランザクション境界と分離レベルを定義
- ベクトルDBは検索インフラであり、信頼できるソースではない
- ベクトル検索を字句検索の直接代替として扱わない

**必須成果物：** 外部スキーマサマリー、概念スキーマ、内部スキーマ、データ標準テーブル、用語集、キャパシティ見積もり、バックアップ/リカバリ戦略。ベクトル/RAGの場合：エンベディングバージョンポリシー、チャンキングポリシー、ハイブリッド検索戦略。

**リソース：** `execution-protocol.md`、`document-templates.md`、`anti-patterns.md`、`vector-db.md`、`iso-controls.md`、`checklist.md`、`error-playbook.md`、`examples.md`。

---

### oma-design

**ドメイン：** デザインシステム、UI/UX、DESIGN.md管理。

**使用すべき場合：** デザインシステムの作成、ランディングページ、デザイントークン、カラーパレット、タイポグラフィ、レスポンシブレイアウト、アクセシビリティレビュー。

**ワークフロー：** 7フェーズ：Setup（コンテキスト収集）-> Extract（オプション、参照URLから）-> Enhance（曖昧なプロンプトの補強）-> Propose（2〜3のデザイン方向性）-> Generate（DESIGN.md + トークン）-> Audit（レスポンシブ、WCAG、Nielsen、AIスロップチェック）-> Handoff。

**アンチパターン強制（「AIスロップ排除」）：**
- タイポグラフィ：システムフォントスタックがデフォルト、正当な理由なしにデフォルトのGoogle Fontsを使わない
- カラー：紫から青のグラデーション禁止、グラデーションオーブ/ブロブ禁止、純黒の上に純白禁止
- レイアウト：ネストされたカード禁止、デスクトップ専用レイアウト禁止、テンプレ的な3メトリック統計レイアウト禁止
- モーション：バウンスイージングの乱用禁止、800ms超のアニメーション禁止、prefers-reduced-motionを尊重
- コンポーネント：グラスモーフィズムの乱用禁止、すべてのインタラクティブ要素にキーボード/タッチ代替手段

**コアルール：**
- まず`.design-context.md`を確認、なければ作成
- システムフォントスタックがデフォルト（ko/ja/zh用CJK対応フォント）
- すべてのデザインでWCAG AA最低基準
- レスポンシブファースト（モバイルがデフォルト）
- 2〜3の方向性を提示し、確認を得る

**リソース：** `execution-protocol.md`、`anti-patterns.md`、`checklist.md`、`design-md-spec.md`、`design-tokens.md`、`prompt-enhancement.md`、`stitch-integration.md`、`error-playbook.md`、さらに`reference/`ディレクトリ（typography、color-and-contrast、spatial-design、motion-design、responsive-design、component-patterns、accessibility、shader-and-3d）と`examples/`（design-context-example、landing-page-prompt）。

---

### oma-tf-infra

**ドメイン：** TerraformによるInfrastructure-as-Code、マルチクラウド。

**使用すべき場合：** AWS/GCP/Azure/Oracle Cloudでのプロビジョニング、Terraform設定、CI/CD認証（OIDC）、CDN/ロードバランサー/ストレージ/ネットワーキング、状態管理、ISOコンプライアンスインフラ。

**クラウド検出：** Terraformプロバイダーとリソースプレフィックスを読み取り（`google_*` = GCP、`aws_*` = AWS、`azurerm_*` = Azure、`oci_*` = Oracle Cloud）。

**コアルール：**
- プロバイダー非依存：プロジェクトコンテキストからクラウドを検出
- バージョニングとロック付きのリモートステート
- CI/CD認証にOIDCファースト
- 常にapply前にplan
- 最小権限IAM
- すべてにタグ付け（Environment、Project、Owner、CostCenter）
- コード内にシークレット禁止
- すべてのプロバイダーとモジュールをバージョンピン
- 本番でのauto-approve禁止

**リソース：** `execution-protocol.md`、`multi-cloud-examples.md`、`cost-optimization.md`、`policy-testing-examples.md`、`iso-42001-infra.md`、`checklist.md`、`error-playbook.md`、`examples.md`。

---

### oma-dev-workflow

**ドメイン：** モノレポタスク自動化とCI/CD。

**使用すべき場合：** 開発サーバーの実行、アプリ横断のlint/format/typecheck、データベースマイグレーション、API生成、i18nビルド、本番ビルド、CI/CD最適化、pre-commitバリデーション。

**コアルール：**
- パッケージマネージャー直接コマンドではなく常に`mise run`タスクを使用
- 変更されたアプリのみでlint/testを実行
- commitlintでコミットメッセージを検証
- CIは変更されていないアプリをスキップ
- miseタスクが存在する場合、パッケージマネージャーの直接コマンドを使わない

**リソース：** `validation-pipeline.md`、`database-patterns.md`、`api-workflows.md`、`i18n-patterns.md`、`release-coordination.md`、`troubleshooting.md`。

---

### oma-qa

**ドメイン：** 品質保証 — セキュリティ、パフォーマンス、アクセシビリティ、コード品質。

**使用すべき場合：** デプロイ前の最終レビュー、セキュリティ監査、パフォーマンス分析、アクセシビリティコンプライアンス、テストカバレッジ分析。

**レビュー優先順位：** セキュリティ > パフォーマンス > アクセシビリティ > コード品質。

**重要度レベル：**
- **CRITICAL**：セキュリティ侵害、データ損失リスク
- **HIGH**：ローンチブロッカー
- **MEDIUM**：今スプリントで修正
- **LOW**：バックログ

**コアルール：**
- すべての指摘にfile:line、説明、修正を含める
- まず自動化ツールを実行（npm audit、bandit、lighthouse）
- 偽陽性なし — すべての指摘は再現可能であること
- 説明だけでなく修正コードを提供

**リソース：** `execution-protocol.md`、`iso-quality.md`、`checklist.md`、`self-check.md`、`error-playbook.md`、`examples.md`。

**ターン制限：** デフォルト15、最大20。

---

### oma-debug

**ドメイン：** バグ診断と修正。

**使用すべき場合：** ユーザー報告のバグ、クラッシュ、パフォーマンス問題、間欠的な障害、レースコンディション、回帰バグ。

**手法：** まず再現、次に診断。修正を推測しない。

**コアルール：**
- 症状ではなく根本原因を特定
- 最小限の修正：必要な箇所のみ変更
- すべての修正に回帰テスト
- 他の場所で類似パターンを検索
- `.agents/brain/bugs/`にドキュメント化

**使用するSerena MCPツール：**
- `find_symbol("functionName")` — 関数の特定
- `find_referencing_symbols("Component")` — すべての使用箇所の検索
- `search_for_pattern("error pattern")` — 類似問題の検索

**リソース：** `execution-protocol.md`、`common-patterns.md`、`debugging-checklist.md`、`bug-report-template.md`、`error-playbook.md`、`examples.md`。

**ターン制限：** デフォルト15、最大25。

---

### oma-translator

**ドメイン：** コンテキスト対応の多言語翻訳。

**使用すべき場合：** UI文字列、ドキュメント、マーケティングコピーの翻訳、既存翻訳のレビュー、用語集の作成。

**4段階メソッド：** 原文分析（レジスター、意図、ドメイン用語、文化的参照、感情的含意、比喩的言語マッピング）-> 意味抽出（原文構造を取り除く）-> ターゲット言語での再構成（自然な語順、レジスター一致、文の分割/結合）-> 検証（自然さルーブリック + アンチAIパターンチェック）。

**オプションの7段階精密モード：** 出版品質向けにCritical Review、Revision、Polishステージを拡張。

**コアルール：**
- まず既存のロケールファイルをスキャンして規約に合わせる
- 単語ではなく意味を翻訳
- 感情的な含意を保持
- 逐語訳を絶対に行わない
- 一つの文章内でレジスターを混在させない
- ドメイン固有の用語はそのまま保持

**リソース：** `translation-rubric.md`、`anti-ai-patterns.md`。

---

### oma-orchestrator

**ドメイン：** CLIスポーンによる自動マルチエージェント協調。

**使用すべき場合：** 並列で複数エージェントを必要とする複雑な機能、自動実行、フルスタック実装。

**設定デフォルト：**

| 設定 | デフォルト | 説明 |
|---------|---------|-------------|
| MAX_PARALLEL | 3 | 同時サブエージェント最大数 |
| MAX_RETRIES | 2 | 失敗タスクのリトライ回数 |
| POLL_INTERVAL | 30秒 | ステータスチェック間隔 |
| MAX_TURNS（実装） | 20 | backend/frontend/mobileのターン制限 |
| MAX_TURNS（レビュー） | 15 | qa/debugのターン制限 |
| MAX_TURNS（計画） | 10 | pmのターン制限 |

**ワークフローフェーズ：** Plan -> Setup（セッションID、メモリ初期化）-> Execute（優先度ティアごとにスポーン）-> Monitor（進捗ポーリング）-> Verify（自動 + クロスレビューループ）-> Collect（結果のコンパイル）。

**エージェント間レビューループ：**
1. セルフレビュー：エージェントが受入基準に対して自身のdiffをチェック
2. 自動検証：`oma verify {agent-type} --workspace {workspace}`
3. クロスレビュー：QAエージェントが変更をレビュー
4. 失敗時：修正のためにフィードバック（最大5回の合計ループ反復）

**Clarification Debtモニタリング：** セッション中のユーザー訂正を追跡。イベントスコア：clarify（+10）、correct（+25）、redo（+40）。CD >= 50で必須RCA発動。CD >= 80でセッション一時停止。

**リソース：** `subagent-prompt-template.md`、`memory-schema.md`。

---

### oma-scm

**ドメイン：** Conventional Commitsに従ったGitコミット生成。

**使用すべき場合：** コード変更完了後、`/scm`実行時。

**コミットタイプ：** feat、fix、refactor、docs、test、chore、style、perf。

**ワークフロー：** 変更を分析 -> 機能ごとに分割（5ファイル以上で異なるスコープにまたがる場合）-> タイプを決定 -> スコープを決定 -> 説明を記述（命令形、72文字未満、小文字、末尾ピリオドなし）-> 即座にコミット実行。

**ルール：**
- `git add -A`や`git add .`を使わない
- シークレットファイルをコミットしない
- ステージング時は常にファイルを指定
- 複数行コミットメッセージにHEREDOCを使用
- Co-Author：`First Fluke <our.first.fluke@gmail.com>`

---

## チャータープリフライト（CHARTER_CHECK）

コードを記述する前に、すべての実装エージェントはCHARTER_CHECKブロックを出力する必要があります：

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {エージェントドメイン}
- Must NOT do: {タスクスコープからの3つの制約}
- Success criteria: {測定可能な基準}
- Assumptions: {適用されるデフォルト}
```

**目的：**
- エージェントが何をし、何をしないかを宣言
- コード記述前にスコープクリープを検出
- 前提をユーザーレビュー用に明示
- テスト可能な成功基準を提供

**明確化レベル：**
- **LOW**：要件が明確。記載された前提で進行。
- **MEDIUM**：部分的に曖昧。オプションを列挙し、最も可能性の高いもので進行。
- **HIGH**：非常に曖昧。ステータスをブロックに設定し、質問を列挙し、コードを記述しない。

サブエージェントモード（CLI起動）では、エージェントはユーザーに直接質問できません。LOWは進行、MEDIUMは絞り込んで解釈、HIGHはブロックしてオーケストレータに質問を返します。

---

## 2層スキルローディング

各エージェントの知識は2つの層に分割されます：

**レイヤー1 — SKILL.md（約800バイト）：**
常にロード。フロントマター（名前、説明）、使用/非使用条件、コアルール、アーキテクチャ概要、ライブラリリスト、レイヤー2リソースへの参照を含む。

**レイヤー2 — resources/（オンデマンドロード）：**
エージェントがアクティブに作業中で、タスクタイプと難易度に一致するリソースのみロード：

| 難易度 | ロードされるリソース |
|-----------|-----------------|
| **Simple** | execution-protocol.mdのみ |
| **Medium** | execution-protocol.md + examples.md |
| **Complex** | execution-protocol.md + examples.md + tech-stack.md + snippets.md |

実行中に必要に応じて追加リソースがロードされます：
- `checklist.md` — 検証ステップで
- `error-playbook.md` — エラー発生時のみ
- `common-checklist.md` — Complexタスクの最終検証で

---

## スコープ付き実行

エージェントは厳格なドメイン境界の下で動作します：

- フロントエンドエージェントはバックエンドコードを変更しない
- バックエンドエージェントはUIコンポーネントに触れない
- DBエージェントはAPIエンドポイントを実装しない
- エージェントはスコープ外の依存関係を他のエージェント向けにドキュメント化

実行中に別のドメインに属するタスクが発見された場合、エージェントはそれを処理しようとせず、結果ファイルにエスカレーション項目として記録します。

---

## ワークスペース戦略

マルチエージェントプロジェクトでは、ファイル競合を防ぐために個別のワークスペースを使用します：

```
./apps/api      → バックエンドエージェントのワークスペース
./apps/web      → フロントエンドエージェントのワークスペース
./apps/mobile   → モバイルエージェントのワークスペース
```

ワークスペースはエージェントスポーン時に`-w`フラグで指定します：

```bash
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## オーケストレーションフロー

マルチエージェントワークフロー（`/orchestrate`または`/work`）の実行時：

1. **PMエージェント**がリクエストを優先度（P0、P1、P2）と依存関係付きのドメイン固有タスクに分解
2. **セッション初期化** — セッションIDを生成、メモリに`orchestrator-session.md`と`task-board.md`を作成
3. **P0タスク**を並列でスポーン（MAX_PARALLEL同時エージェントまで）
4. **進捗モニタリング** — オーケストレータがPOLL_INTERVALごとに`progress-{agent}.md`ファイルをポーリング
5. **P1タスク**がP0完了後にスポーン、以降同様
6. **検証ループ**が完了したエージェントごとに実行（セルフレビュー -> 自動検証 -> QAによるクロスレビュー）
7. **結果収集**：すべての`result-{agent}.md`ファイルから
8. **最終レポート**：セッションサマリー、変更ファイル、残存課題

---

## エージェント定義

エージェントは2か所で定義されます：

**`.agents/agents/`** — 7つのサブエージェント定義ファイルを含む：
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`

これらのファイルはエージェントのアイデンティティ、実行プロトコル参照、CHARTER_CHECKテンプレート、アーキテクチャサマリー、ルールを定義します。Task/Agentツール（Claude Code）またはCLIでサブエージェントをスポーンする際に使用されます。

**`.claude/agents/`** — IDE固有のサブエージェント定義で、`.agents/agents/`ファイルをシンボリックリンクまたはClaude Code互換のダイレクトコピーで参照。

---

## ランタイム状態（Serenaメモリ）

オーケストレーションセッション中、エージェントは`.serena/memories/`の共有メモリファイルを通じて協調します（`mcp.json`で設定可能）：

| ファイル | オーナー | 目的 | 他エージェント |
|------|-------|---------|--------|
| `orchestrator-session.md` | オーケストレータ | セッションID、ステータス、開始時刻、フェーズ追跡 | 読み取り専用 |
| `task-board.md` | オーケストレータ | タスク割り当て、優先度、ステータス更新 | 読み取り専用 |
| `progress-{agent}.md` | 当該エージェント | ターンごとの進捗：実行アクション、読み取り/変更ファイル、現在のステータス | オーケストレータが読み取り |
| `result-{agent}.md` | 当該エージェント | 最終出力：ステータス（completed/failed）、サマリー、変更ファイル、受入基準チェックリスト | オーケストレータが読み取り |
| `session-metrics.md` | オーケストレータ | Clarification Debt追跡、Quality Score推移 | QAが読み取り |
| `experiment-ledger.md` | オーケストレータ/QA | Quality Score有効時の実験追跡 | 全員が読み取り |

メモリツールは設定可能です。デフォルトはSerena MCP（`read_memory`、`write_memory`、`edit_memory`）を使用しますが、`mcp.json`でカスタムツールを設定できます：

```json
{
  "memoryConfig": {
    "provider": "serena",
    "basePath": ".serena/memories",
    "tools": {
      "read": "read_memory",
      "write": "write_memory",
      "edit": "edit_memory"
    }
  }
}
```

ダッシュボード（`oma dashboard`および`oma dashboard:web`）はリアルタイムモニタリングのためにこれらのメモリファイルを監視します。
