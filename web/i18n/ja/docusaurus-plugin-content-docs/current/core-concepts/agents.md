---
title: エージェント
description: OMA の 33 スキルパッケージ、13 の正規ディスパッチロール、12 のリポジトリ内サブエージェント定義を参照します。各ドメイン、リソース、チャータープリフライト、段階的ロード、スコープ規則、品質ゲート、ワークスペース戦略、オーケストレーション、ランタイムメモリをまとめています。
---

# エージェント

OMA は、スキルパッケージ、ディスパッチロール、サブエージェント定義ファイルを分離します。スキルはドメインの指針をルーティングしてロードし、正規ロールはディスパッチで使うランタイム ID になり、リポジトリ内の定義はベンダー固有のペルソナを与えます。これらの層は意図的に重なるため、タスクの境界と受入基準に応じて、1 つのスキルで足りるかを判断します。

`.agents/agents/` にあるエージェント定義が正本です。OMA はカスタムサブエージェントに対応するランタイム向けに、次のベンダー固有ファイルへ投影します。

- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.cursor/agents/*`、`.opencode/agents/*`、または選択したベンダーが対応する別の投影先

ワークフローが現在のランタイムと同じベンダーにロールを割り当てる場合は、そのランタイムのネイティブエージェントファイルを先に使います。ベンダーが異なるタスクは `oma agent spawn` にフォールバックします。

> **エージェントごとのモデルディスパッチ：** 各エージェントは、`.agents/oma-config.yaml` の `model_preset`（任意の `agents:` オーバーライドを含む）から、モデルスラッグ、CLI ベンダー、推論強度を解決します。設定は[エージェント別モデル](../guide/per-agent-models.md)、実行中のマトリクスは [`oma doctor --profile`](../cli-interfaces/commands.md#doctor) で確認できます。

---

## エージェントカテゴリ

| カテゴリ | エージェント | 責務 |
|----------|--------|---------------|
| **アイデア出し** | oma-brainstorm | アイデアの探索、アプローチの提案、設計ドキュメントの作成 |
| **アーキテクチャ** | oma-architecture | システム／モジュール／サービス境界、ADR/ATAM/CBAM方式の分析、トレードオフ記録 |
| **計画** | oma-pm | 要件分解、タスク分割、APIコントラクト、優先度割り当て |
| **実装** | oma-frontend, oma-backend, oma-mobile, oma-db | 各ドメインのコード作成 |
| **デザイン** | oma-design | デザインシステム、DESIGN.md、トークン、タイポグラフィ、カラー、モーション、アクセシビリティ |
| **インフラ** | oma-tf-infra | マルチクラウド Terraform プロビジョニング、IAM、コスト最適化、ポリシーアズコード |
| **DevOps** | oma-dev-workflow | mise タスクランナー、CI/CD、マイグレーション、リリース調整、モノレポ自動化 |
| **オブザーバビリティ** | oma-observability | オブザーバビリティパイプライン、トレーサビリティルーティング、MELT+P シグナル（metrics/logs/traces/profiles/cost/audit/privacy）、SLO 管理、インシデントフォレンジック、トランスポートチューニング |
| **品質** | oma-qa | セキュリティ監査（OWASP）、パフォーマンス、アクセシビリティ（WCAG）、コード品質レビュー |
| **デバッグ** | oma-debug | バグ再現、根本原因分析、最小限の修正、回帰テスト |
| **ローカライゼーション** | oma-translation | トーン、レジスター、ドメイン用語を保持するコンテキスト対応翻訳 |
| **協調** | oma-orchestration, oma-coordination | 自動および手動のマルチエージェントオーケストレーション |
| **Git** | oma-scm | Conventional Commits の生成、機能単位のコミット分割 |
| **検索・取得** | oma-search | 信頼度スコアリング付きのインテントベース検索ルーター（Context7 ドキュメント、ウェブ、`gh`/`glab` コード、ローカルコードインテリジェンス） |
| **レトロスペクティブ** | oma-recap | ツール横断の会話履歴分析とテーマ別作業サマリー |
| **ドキュメント処理** | oma-hwp, oma-pdf | LLM/RAG 取り込みのための HWP/HWPX/HWPML および PDF から Markdown への変換 |
| **ドキュメント** | oma-docs | ドキュメントのドリフト検出（壊れた参照の検証、差分の影響を受けるドキュメントの同期パッチ提案） |
| **解説** | oma-explanation | 差分、ブランチ、PR、コミット範囲向けのオフライン対話型 HTML 解説 |
| **アカデミックライティング** | oma-academic-writing, oma-scholar | 出版品質の学術文の作成・監査、Knows サイドカーによる学術研究・検索・査読 |
| **セキュリティ** | oma-deepsec | Vercel の deepsec エージェント型脆弱性スキャナー（scan、PR ゲート、マッチャー、トリアージ）をコストを管理しながら運用 |
| **リファクタリング** | oma-refactor | ホットスポット、特性テストの安全網、リファクタリング専用コミットを使う、動作を保つ段階的な構造変更 |
| **市場調査** | oma-market | コミュニティシグナルからの課題・トレンド・競合・発見の調査と、意図に応じた SWOT/Porter の 5F/PESTEL の枠組み |
| **スキル作成** | oma-skill-creation | SSL-lite 形式での OMA スキルの作成と検証 |
| **メディア生成** | oma-image, oma-slide, oma-video, oma-voice | AI 画像生成、HTML プレゼンテーション、短編・解説・デモ動画、ローカル TTS/STT |

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
- YAGNI: 必要なものだけ設計

**ワークフロー：** 6フェーズ：コンテキスト探索、質問、アプローチ、設計、ドキュメント（`docs/plans/`に保存）、`/plan`への遷移。

**リソース：** 共有リソースのみ使用（clarification-protocol、quality-principles、skill-routing）。

---

### oma-architecture

**ドメイン：** ソフトウェア／システムアーキテクチャ（モジュール・サービス境界、トレードオフ分析、ステークホルダー統合、意思決定記録）。

**使用すべき場合：** システムアーキテクチャの選定またはレビュー、モジュール／サービス／オーナーシップ境界の定義、明示的なトレードオフを伴うアーキテクチャ選択肢の比較、アーキテクチャ上の痛み（変更増幅、隠れた依存関係、不自然なAPI）の調査、アーキテクチャ投資またはリファクタリングの優先順位付け、アーキテクチャ推奨事項またはADRの作成。

**使用すべきでない場合：** ビジュアル／デザインシステム（oma-designを使用）、機能計画とタスク分解（oma-pmを使用）、Terraform実装（oma-tf-infraを使用）、バグ診断（oma-debugを使用）、セキュリティ／パフォーマンス／アクセシビリティレビュー（oma-qaを使用）。

**方法論：** 診断ルーティング、design-twice比較、ATAM方式のリスク分析、CBAM方式の優先順位付け、ADR方式の意思決定記録。

**コアルール：**
- メソッドを選択する前にアーキテクチャ問題を診断
- 現在の意思決定に最も軽量で十分な方法論を使用
- アーキテクチャ設計をUI／ビジュアルデザインおよびTerraform実装と区別
- 意思決定が横断的でコストを正当化できる場合のみステークホルダーエージェントに相談
- 推奨事項の質が合意の演出より重要：広く相談し、明示的に決定
- すべての推奨事項は前提、トレードオフ、リスク、検証ステップを明記
- デフォルトでコストを意識：実装コスト、運用コスト、チーム複雑度、将来の変更コスト

**リソース：** `SKILL.md`、方法論ガイドが含まれる`resources/`ディレクトリ（diagnostic-routing、design-twice、ATAM、CBAM、ADRテンプレート）。

---

### oma-pm

**ドメイン：** プロダクトマネジメント（要件分析、タスク分解、APIコントラクト）。

**使用すべき場合：** 複雑な機能の分解、実現可能性の判断、作業の優先順位付け、APIコントラクトの定義。

**コアルール：**
- APIファースト設計：実装タスク前にコントラクトを定義
- 各タスクに必要：エージェント、タイトル、受入基準、優先度、依存関係
- 最大並列実行のため依存関係を最小化
- セキュリティとテストは各タスクの一部（別フェーズではない）
- タスクは単一エージェントで完了可能であること
- オーケストレータ互換のJSON plan + task-board.mdを出力

**出力：** `.agents/results/plan-{sessionId}.json`、`.agents/results/result-pm.md`、オーケストレータ用メモリ書き込み。

**リソース：** `execution-protocol.md`、`examples.md`、`iso-planning.md`、`task-template.json`、`../_shared/core/api-contracts/template.md`。成果物は `.agents/results/` と `.agents/results/api-contracts/` に書き込みます。

---

### oma-frontend

**ドメイン：** Web UI（React、Next.js、TypeScript、FSD-liteアーキテクチャ）。

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
| フック | ahooks または @mantine/hooks |
| ユーティリティ | es-toolkit |
| URL状態 | nuqs |
| サーバー状態 | TanStack Query（OpenAPI 仕様がある場合は orval 生成フック） |
| クライアント状態 | Jotai（使用を最小限に） |
| フォーム | @tanstack/react-form + Zod |
| 認証 | better-auth |

**コアルール：**
- shadcn/uiファースト、cvaで拡張、`components/ui/*`を直接変更しない
- デザイントークンの1:1マッピング（色のハードコード禁止）
- ミドルウェアよりプロキシ（Next.js 16+ はプロキシロジックに `proxy.ts` を使い、`middleware.ts` は使わない）
- 3レベル以上のpropsドリリング禁止。Jotai atomsを使用
- `@/`による絶対インポート必須
- FCPターゲット < 1秒
- レスポンシブブレークポイント：320px、768px、1024px、1440px

**リソース：** `execution-protocol.md`、`tech-stack.md`、`tailwind-rules.md`、`snippets.md`、`angular-rules.md`、`error-playbook.md`、`checklist.md`。

**品質ゲートチェックリスト：**
- アクセシビリティ：ARIAラベル、セマンティック見出し、キーボードナビゲーション
- モバイル：モバイルビューポートで検証
- パフォーマンス：CLSなし、高速ロード
- レジリエンス：Error BoundariesとLoading Skeletons
- テスト：ロジックをVitestでカバー
- 品質：型チェックとリントがパス

---

### oma-backend

**ドメイン：** API、サーバーサイドロジック、認証、データベース操作。

**使用すべき場合：** REST/GraphQL API、データベースマイグレーション、認証、サーバービジネスロジック、バックグラウンドジョブ。

**アーキテクチャ：** Router（HTTP）-> Service（ビジネスロジック）-> Repository（データアクセス）-> Models。

**スタック検出：** プロジェクトマニフェスト（pyproject.toml、package.json、Cargo.toml、go.mod など）を読み取って言語とフレームワークを決定します。プロジェクト固有の規約がない場合は `/stack-set` の実行をユーザーに提案し、解決済みの参照を `stack/` に展開します。

**コアルール：**
- クリーンアーキテクチャ：ルートハンドラにビジネスロジックを置かない
- すべての入力をプロジェクトのバリデーションライブラリで検証
- パラメータ化クエリのみ（SQLでの文字列補間禁止）
- 認証に JWT + Argon2id を使う（レガシー互換性では bcrypt も許容）。認証エンドポイントにはレート制限をかける
- サポートされている場合は非同期、すべてのシグネチャに型注釈
- 集約エラーモジュールによるカスタム例外
- 明示的なORMローディング戦略、トランザクション境界、安全なライフサイクル

**リソース：** `execution-protocol.md`、`orm-reference.md`、`checklist.md`、`error-playbook.md`。`variants/stack.schema.json` がスタックマニフェストの形を定義します。

<!-- oma-docs:ignore-start -->
プロジェクト固有の `stack/stack.yaml`、`stack/tech-stack.md`、snippets、API テンプレートは必要に応じて `/stack-set` が生成します。スタックを具体化するまでは存在しません。
<!-- oma-docs:ignore-end -->

---

### oma-mobile

**ドメイン：** クロスプラットフォームおよびネイティブのモバイルアプリ（Flutter、React Native、Swift ネイティブ iOS）。

**使用すべき場合：** ネイティブモバイルアプリ（iOS + Android）、モバイル固有の UI パターン、プラットフォーム機能（カメラ、GPS、プッシュ通知）、オフラインファーストアーキテクチャ、`swift-openapi-generator` を使う Swift ネイティブ iOS アプリ。

**アーキテクチャ：** クリーンアーキテクチャ（domain -> data -> presentation）。Swift iOS では `App/Core/Features/Shared` の配置を使います。

**技術スタック：**
- Flutter/Dart：Riverpod/Bloc（状態管理）、Dio with interceptors（API）、GoRouter（ナビゲーション）、Material Design 3（Android）+ iOS HIG
- Swift ネイティブ iOS（iOS 17+）：SwiftUI + `@Observable`（Observation framework）、Apple の `swift-openapi-generator` による API クライアント、`App/Core/Features/Shared` の配置

**コアルール：**
- Riverpod/Bloc を状態管理に使い、複雑なロジックで raw setState を使わない
- すべてのコントローラーを `dispose()` メソッドで破棄する
- API 呼び出しには Dio with interceptors を使い、オフラインを適切に処理する
- 60fps を目標にし、両プラットフォームでテストする
- Swift では iOS 17+ の `@Observable` を `ObservableObject` より優先し、OpenAPI 仕様から `swift-openapi-generator` で API クライアントを生成する

**リソース：** `execution-protocol.md`、`tech-stack.md`、`screen-template.dart`、`screen-template.swift`、`screen-template.tsx`、`checklist.md`、`error-playbook.md`。`variants/` には、`/stack-set` がスタックマニフェストを具体化したときに生成するスキーマとプラットフォーム参照が入ります。

---

### oma-db

**ドメイン：** データベースアーキテクチャ（SQL、NoSQL、ベクトルデータベース）。

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

**リソース：** `execution-protocol.md`、`anti-patterns.md`、`checklist.md`、`design-md-spec.md`、`design-tokens.md`、`prompt-enhancement.md`、`stitch-integration.md`、`error-playbook.md`、さらに`reference/`ディレクトリ（typography、color-and-contrast、spatial-design、motion-design、responsive-design、component-patterns、accessibility、shader-and-3d）。

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

### oma-observability

**ドメイン：** レイヤー、境界、シグナルにまたがるインテントベースのオブザーバビリティおよびトレーサビリティルーター。

**使用すべき場合：** オブザーバビリティパイプラインのセットアップ（OTel SDK + Collector + ベンダーバックエンド）、サービスおよびドメイン境界にまたがるトレーサビリティ（W3C propagator、baggage、マルチテナント、マルチクラウド）、トランスポートチューニング（UDP/MTU閾値、OTLP gRPC vs HTTP、Collector DaemonSet vs サイドカートポロジー、サンプリングレシピ）、インシデントフォレンジック（6次元ローカライゼーション：code / service / layer / host / region / infra）、ベンダーカテゴリ選定（OSSフルスタック vs 商用SaaS vs 高カーディナリティ特化 vs プロファイリング特化）、observability-as-code（Grafana Jsonnetダッシュボード、PrometheusRule CRD、OpenSLO YAML、SLO burn-rateアラート）、メタオブザーバビリティ（パイプラインの自己ヘルス、クロックスキュー、カーディナリティガードレール、保持マトリクス）、MELT+Pシグナルカバレッジ（metrics、logs、traces、profiles、cost、audit、privacy）、非推奨ツールからの移行（Fluentd -> Fluent BitまたはOTel Collector）。

**使用すべきでない場合：** LLM ops / gen_aiオブザーバビリティ（Langfuse、Arize Phoenix、LangSmith、Braintrustを使用）、データパイプラインlineage（OpenLineage + Marquez、dbt test、Airflow lineage）、IoT / データセンターの物理層テレメトリ（Nlyte、Sunbird、Device42）、カオスエンジニアリングオーケストレーション（Chaos Mesh、Litmus、Gremlin、ChaosToolkit）、GPU / TPUインフラ（NVIDIA DCGM Exporter）、ソフトウェアサプライチェーン（sigstore、in-toto、SLSA）、インシデントレスポンスワークフロー / ページング（PagerDuty、OpsGenie、Grafana OnCall）、該当ベンダーの固有スキルで既にカバーされている単一ベンダーセットアップ。

**コアルール：**
- ルーティング前にインテントを分類：setup | migrate | investigate | alert | trace | tune | route
- ベンダーレジストリではなくカテゴリファースト：`resources/vendor-categories.md`を介してベンダー所有スキルに委譲し、ベンダードキュメントを複製しない
- トランスポートチューニングが堀（moat）：UDP/MTU閾値、OTLPプロトコル選択、Collectorトポロジー、サンプリングレシピは他のスキルがカバーしない深さ
- メタオブザーバビリティは妥協不可：セットアップ完了を宣言する前にパイプラインの自己ヘルス、クロック同期（< 100 msドリフト）、カーディナリティ、保持を検証
- CNCFファースト優先：Prometheus、Jaeger、Thanos、Fluent Bit、OpenTelemetry、Cortex、OpenCost、OpenFeature、Flagger、Falco
- Fluentdは非推奨（CNCF 2025-10）：新規および移行作業にはFluent BitまたはOTel Collectorを推奨
- W3C Trace Contextをデフォルトpropagatorに；クラウドごとに変換（AWS X-Ray `X-Amzn-Trace-Id`、GCP Cloud Trace、Datadog、Cloudflare、Linkerd）
- 機能よりプライバシー優先：PIIのredaction、サンプリング対応baggageルール、SOC2/ISO不変監査 + GDPR/PIPA消去はストレージではなく収集時点で適用

**リソース：** `SKILL.md`、`resources/execution-protocol.md`、`resources/intent-rules.md`、`resources/vendor-categories.md`、`resources/matrix.md`、`resources/checklist.md`、`resources/anti-patterns.md`、`resources/examples.md`、`resources/meta-observability.md`、`resources/observability-as-code.md`、`resources/incident-forensics.md`、`resources/standards.md`、および`resources/layers/`配下の詳細リソース（L3-network、L4-transport、L7-application、mesh）、`resources/signals/`（metrics、logs、traces、profiles、cost、audit、privacy）、`resources/transport/`（collector-topology、otlp-grpc-vs-http、sampling-recipes、udp-statsd-mtu）、`resources/boundaries/`（cross-application、multi-tenant、release、slo）。

---

### oma-qa

**ドメイン：** 品質保証（セキュリティ、パフォーマンス、アクセシビリティ、コード品質）。

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
- 偽陽性なし。すべての指摘は再現可能であること
- 説明だけでなく修正コードを提供

**リソース：** `execution-protocol.md`、`iso-quality.md`、`checklist.md`、`self-check.md`、`error-playbook.md`、`examples.md`。

---

### oma-debug

**ドメイン：** バグ診断と修正。

**使用すべき場合：** ユーザー報告のバグ、クラッシュ、パフォーマンス問題、間欠的な障害、レースコンディション、回帰バグ。

**手法：** まず再現、次に診断。修正を推測しない。

**コアルール：**
- 症状ではなく根本原因を特定する
- 最小限の修正：必要な箇所だけを変更する
- すべての修正に回帰テストを付ける
- 他の場所で類似パターンを検索する
- `.agents/results/` に記録する

**使用するコードインテリジェンスツール（Gortex または Serena）：**
- `find_symbol("functionName")` または Gortex のシンボルナビゲーション：関数を特定する
- `find_referencing_symbols("Component")` または Gortex の影響分析：すべての使用箇所を調べる
- `search_for_pattern("error pattern")` または Gortex の検索：類似の問題を探す

**リソース：** `execution-protocol.md`、`common-patterns.md`、`debugging-checklist.md`、`bug-report-template.md`、`error-playbook.md`、`examples.md`。

---

### oma-translation

**ドメイン：** コンテキスト対応の多言語翻訳。

**使用すべき場合：** UI文字列、ドキュメント、マーケティングコピーの翻訳、既存翻訳のレビュー、用語集の作成。

**6 つの場面の流れ：** Prepare、Acquire、Reason、Act、Verify、Finalize。翻訳は、保護された構文と意味を読む、レジスターを選ぶ、ターゲット言語で再構成する、適切な箇所では著者の文体を保つ、という 4 段階で進めます。

**コアルール：**
- まず既存のロケールファイルをスキャンして規約に合わせる
- 単語ではなく意味を翻訳
- 感情的な含意を保持
- 逐語訳を絶対に行わない
- 一つの文章内でレジスターを混在させない
- ドメイン固有の用語はそのまま保持

**リソース：** `translation-rubric.md`、`anti-ai-patterns.md`（どちらも言語に依存しない）、`resources/lang/` 配下のターゲット言語別プロファイル（`ko`、`ja`、`zh`、`en`。追加は `_template.md` から）。

---

### oma-orchestration

**ドメイン：** CLIスポーンによる自動マルチエージェント協調。

**使用すべき場合：** 並列で複数エージェントを必要とする複雑な機能、自動実行、フルスタック実装。

**設定デフォルト：**

| 設定 | デフォルト | 説明 |
|---------|---------|-------------|
| MAX_PARALLEL | 3 | 同時サブエージェント最大数 |
| MAX_RETRIES | 2 | 失敗タスクのリトライ回数 |
| POLL_INTERVAL | 30秒 | ステータスチェック間隔 |

**ワークフローフェーズ：** Plan -> Setup（セッションID、メモリ初期化）-> Execute（優先度ティアごとにスポーン）-> Monitor（進捗ポーリング）-> Verify（自動 + クロスレビューループ）-> Collect（結果のコンパイル）。

**エージェント間レビューループ：**
1. セルフレビュー：エージェントが受入基準に対して自身のdiffをチェック
2. 自動検証：`oma verify agent {agent-type} --workspace {workspace}`
3. クロスレビュー：QAエージェントが変更をレビュー
4. 失敗時：修正のためにフィードバック（最大5回の合計ループ反復）

**セッションの証拠：** 有用な場合に、重要な訂正と判定済みのレビュー指摘を、原因、影響、検証結果とあわせて記録します。ペナルティスコアは適用されず、スコアによるセッション一時停止もありません。

**リソース：** `subagent-prompt-template.md`、`memory-schema.md`。

---

### oma-scm

**ドメイン：** ブランチ、マージ、競合、ワークツリー、ベースライン、監査対応、Conventional Commits を扱うソフトウェア構成管理（SCM）と Git。

**使用すべき場合：** コード変更後（`/scm`）、マージ競合、ブランチ戦略、リリース/タグ、またはリポジトリの構成管理に関する質問。

**コミットタイプ：** feat、fix、refactor、docs、test、chore、style、perf。

**ワークフロー（コミット）：** 変更を分析 → 必要なら機能ごとに分割 → タイプ → スコープ → 説明（命令形、72 文字未満、小文字、末尾のピリオドなし）→ 明示したパスでコミット。

**ルール：**
- `git add -A` や `git add .` を使わない
- シークレットファイルをコミットしない
- ステージング時は常にファイルを指定する
- 複数行のコミットメッセージには HEREDOC を使う
- Co-author trailer は、`scm.co_author` の設定が有効で名前とメールアドレスが指定されている場合だけ含める

---

### oma-coordination

**ドメイン：** 手動ステップバイステップのマルチエージェント協調ガイド。

**使用すべき場合：** 各ゲートで人間がループ制御したい複雑なプロジェクト、手動エージェントスポーンのガイダンス、ステップバイステップの協調レシピ。

**使用すべきでない場合：** 完全自動の並列実行（oma-orchestrationを使用）、単一ドメインのタスク（ドメインエージェントを直接使用）。

**コアルール：**
- エージェントをスポーンする前に必ず計画をユーザー確認のために提示
- 一度に一つの優先度ティア。次のティアの前に完了を待つ
- ユーザーが各ゲート遷移を承認
- マージ前のQAレビューは必須
- CRITICAL/HIGHの指摘に対する修正反復ループ

**ワークフロー：** PM計画 → ユーザー確認 → 優先度ティアごとにスポーン → モニタリング → QAレビュー → 問題修正 → 出荷。

**oma-orchestrationとの違い：** coordinationは手動ガイド型（ユーザーがペースを制御）、orchestratorは自動化（最小限のユーザー介入でエージェントがスポーン・実行）。

---

### oma-search

**ドメイン：** ドメイン信頼度スコアリングを使用するインテントベース検索ルーター。クエリを Context7（ドキュメント）、ネイティブウェブ検索、`gh`/`glab`（コード）、ローカルコードインテリジェンス（Gortex または Serena）にルーティングします。

**使用すべき場合：** 公式ライブラリ／フレームワークのドキュメント検索、チュートリアル／例／比較／解決策のためのウェブ調査、実装パターンのためのGitHub/GitLabコード検索、検索チャネルが不明なクエリ（自動ルーティング）、検索インフラが必要な他のスキル（共有呼び出し）。

**使用すべきでない場合：** ローカル専用のコードベース探索（コードインテリジェンス MCP を直接使用）、Git 履歴または blame 分析（oma-scm）、完全なアーキテクチャ調査（内部でこのスキルを呼ぶ可能性がある oma-architecture）。

**コアルール：**
- 検索前にインテントを分類。すべてのクエリはまずIntentClassifierを通過します
- 1つのクエリ、1つの最適ルート。インテントが曖昧でない限り冗長なマルチルートを避けます
- すべての結果に信頼度スコア。すべての非ローカル結果はレジストリからドメイン信頼度ラベルを取得します
- フラグが分類器より優先：`--docs`、`--code`、`--web`、`--strict`、`--wide`、`--gitlab`
- Fail forward：主要ルートが失敗した場合、優雅にフォールバック（docs→web、web→`oma search fetch`戦略）
- 追加 MCP は不要：ドキュメントは Context7、ウェブはランタイムネイティブ、コードは CLI、ローカルは設定済みプロバイダー（Gortex または Serena）
- ベンダー中立のウェブ検索：現在のランタイムが提供するものを使用（WebSearch、Google、Bing）
- ドメインレベルの信頼度のみ。サブパスまたはページレベルのスコアリングはありません

**リソース：** `SKILL.md`、インテント分類器・ルート定義・信頼レジストリを含む`resources/`ディレクトリ。

---

### oma-recap

**ドメイン：** 複数の AI ツール（Claude、Codex、Qwen、Cursor）の会話履歴分析とテーマ別の日次/期間作業サマリー。

**使用すべき場合：** 1日または期間の作業活動の要約、複数のAIツールにまたがる作業の流れの把握、セッション間のツール切り替えパターンの分析、デイリースタンドアップ／週次レトロ／作業ログの準備。

**使用すべきでない場合：** Gitコミットベースのコード変更レトロスペクティブ（`oma retro`を使用）、リアルタイムエージェントモニタリング（`oma dashboard terminal`を使用）、生産性メトリクス（`oma stats get`を使用）。

**プロセス：**
1. 自然言語入力（today、yesterday、last Monday、明示的な日付）から日付または時間範囲を解決
2. `oma recap --date YYYY-MM-DD`または`--since` / `--until`で会話データを取得
3. ツールおよびセッションごとにグループ化
4. テーマの抽出（取り組んだ機能、修正したバグ、探索したツール）
5. テーマ別の日次／期間サマリーをレンダリング

**リソース：** `SKILL.md`。重い作業は `oma recap` CLI に委任し、すべてのベンダーが `oma recap` を直接呼び出します。

---

### oma-hwp

**ドメイン：** `kordoc`を使用したHWP / HWPX / HWPML（韓国語ワードプロセッサ）→ Markdown変換。

**使用すべき場合：** 韓国語HWP文書（`.hwp`、`.hwpx`、`.hwpml`）のMarkdown変換、LLMコンテキストまたはRAGのための韓国の政府／企業文書の準備、HWPからの構造化コンテンツ（表、見出し、リスト、画像、脚注、ハイパーリンク）の抽出。

**使用すべきでない場合：** PDFファイル（oma-pdfを使用）、XLSX/DOCX（スコープ外）、HWP生成／編集（スコープ外）、既にテキストファイル（Readツールを直接使用）。

**コアルール：**
- 実行に`bunx kordoc@latest`を使用。インストール不要で、常に`@latest`または固定バージョンを渡します
- デフォルト出力形式はMarkdown
- 出力ディレクトリが指定されない場合、入力と同じディレクトリに出力
- kordocが構造保持を処理（見出し、表、ネストされた表、脚注、ハイパーリンク、画像）
- セキュリティ防御（ZIP bomb、XXE、SSRF、XSS）はkordocが提供。カスタム防御の追加は禁止です
- 暗号化またはDRMロックされたHWPの場合、制限をユーザーに明確に報告
- HTMLの`<table>`ブロックをGFMパイプテーブルに変換し、Hancomフォントの私用領域文字を削除するために、`resources/flatten-tables.ts`で後処理

**リソース：** `SKILL.md`、`config/`、`resources/flatten-tables.ts`。

---

### oma-pdf

**ドメイン：** `opendataloader-pdf`を使用したPDF → Markdown変換。

**使用すべき場合：** LLMコンテキストまたはRAGのためのPDF文書のMarkdown変換、PDFからの構造化コンテンツ（表、見出し、リスト）の抽出、AI消費のためのPDFデータの準備。

**使用すべきでない場合：** PDF生成／作成（適切な文書ツールを使用）、既存PDF編集（スコープ外）、既にテキストのファイルの単純な読み取り（Readツールを直接使用）。

**コアルール：**
- 実行に`uvx opendataloader-pdf`を使用。インストール不要です
- デフォルト出力形式はMarkdown
- 出力ディレクトリが指定されない場合、入力PDFと同じディレクトリに出力
- 文書構造を保持（見出し、表、リスト、画像）
- スキャンされたPDFの場合、OCR付きハイブリッドモードを使用
- Markdownフォーマット正規化のために、常に出力に`uvx mdformat`を実行
- 出力Markdownが読みやすく構造化されているか検証
- 変換の問題（欠落した表、文字化けしたテキスト）をユーザーに報告

**リソース：** `SKILL.md`、`config/`、`resources/`。

---

### oma-academic-writing

**ドメイン：** 出版品質の英語学術文。エッセイ、レポート、分析、エグゼクティブサマリー、結論、文献レビューの作成・改稿・監査。

**使用すべき場合：** 学術レポートやエッセイ、分析、エグゼクティブサマリー、結論、文献レビューの作成または改稿、AI らしい英語の書き換え、文の多様性・動詞・ヘッジ・アンチ AI の監査、HD/A/上位帯のルーブリックに合わせた推敲。

**使用すべきでない場合：** 翻訳（oma-translation）、出典の探索や引用収集（oma-scholar）、ルーブリック解析とタスク分解（oma-pm）、コードドキュメントや README、API リファレンス（該当するドメインスキル）、非英語の学術文（英語で作成してから oma-translation に渡す）。

**モード：** `draft`（見出し、本文、Writing Notes、Claim-Evidence Map）、`revise`（原文、改稿、変更一覧）、`review`（文構造、動詞、アンチ AI、具体性、ヘッジ、段落の明瞭さ、リズム、主張と証拠の対応を PASS/FAIL で監査）。

**コアルール：**
- 判断の前に引用：適用するルールの文字どおりのルーブリックや制約を引用する
- すべての文を検証可能にし、データ、統計、引用を捏造しない
- 禁止された一般動詞（`show`、`have`、`make`、`do`、`get`、`use` など）を主動詞にしない
- 文型、長さ、書き出しを変え、同じ型の文を 3 文以上続けない
- 根拠の強さに合わせてヘッジの強さを調整し、一人称の `I think` や `I believe` を使わない
- すべての主張を Claim-Evidence Map の証拠に対応付け、裏付けられない主張は弱めるか削除する

**ワークフロー：** 6 段階：制約を引用してルーブリックと原稿を読む、段落を Topic-Support-Conclude で計画する、4 つのプロトコルに従って下書きする、アンチ AI チェックリストで監査する、逆アウトラインと Claim-Evidence Map を作る、音読・結束性・具体性・語数・リズムを磨く。

**リソース：** `anti-ai-checklist.md`、`sentence-structure-reference.md`、`academic-verb-tiers.md`、`hedging-guide.md`、共有の `context-loading`、`quality-principles`。

---

### oma-deepsec

**ドメイン：** Vercel の `deepsec` エージェント型脆弱性スキャナーを、コストを管理しながら対象リポジトリで一通り運用すること。

**使用すべき場合：** 初回の deepsec 導入（`init`、`INFO.md` 作成、調整スキャン）、全体または範囲指定スキャンと指摘の処理、`process --diff` による PR/CI ゲート、プロジェクト固有マッチャー、重要度別のトリアージ、`revalidate` による誤検知削減、エクスポート、実行失敗の診断。

**使用すべきでない場合：** deepsec を使わない一般的な OWASP や lint レビュー（oma-qa）、一般的な CVE や依存関係の助言（oma-qa または oma-search）、deepsec 以外の SAST パイプライン設計（oma-architecture）、アプリケーションコードの作成や監査（該当するドメインエージェント）、クラウド/IAM/Terraform の強化（oma-tf-infra）、指摘への修正の検討（oma-debug）。

**コアルール：**
- サイズを測っていない、または 500 ファイルを超えるリポジトリで無制限の `process` を実行しない。未知のサイズや 500 超では `--limit 50 --concurrency 5` で調整する
- AI パスの前にコストと停止条件を示す（100 ファイルで約 $25-60、2,000 ファイルで $500-1,200、振れ幅は ×2-3）
- クォータ、ネットワーク、Ctrl+C の中断後はリセットせず同じコマンドを再実行し、`data/<id>/` を削除しない
- `INFO.md` は短くプロジェクト固有に保ち、各節を 50-100 行、例を 3-5 個に収める
- PR/CI ゲートには 2 ジョブ方式を使う。PR が制御するコードを実行するジョブに `pull-requests: write` を与えず、本番ではアクションを完全な SHA で固定する
- 最初の有料呼び出しの前に `codex`/`gpt-5.5` と `claude`/`claude-opus-4-8` のどちらを使うか確認し、資格情報を表示・コミットしない

**ワークフロー：** PREPARE（意図、リポジトリルート、資格情報、予算、重要度の下限、エージェント）→ ACQUIRE（設定、`INFO.md`、実行履歴、リポジトリのシグナル）→ REASON（最小限のパスを選択）→ ACT（`.deepsec/` 内で実行）→ VERIFY（`status`、`RunMeta`、終了コード）→ FINALIZE（重要度・判定ごとの指摘、費用、フォローアップ）。

**リソース：** `setup.md`、`scanning.md`、`pr-review.md`、`matchers.md`、`triage.md`、`config.md`。

---

### oma-docs

**ドメイン：** `docs/**/*.md` の参照を現行コードベースに対して検証する（verify）ことと、差分の影響を受けるドキュメントのパッチ候補を提案する（sync）こと。

**使用すべき場合：** リファクタリングや名前変更、ファイル削除後の古い参照の検出、リリース前の CLI コマンド・ファイルパス・設定キーの確認、大きな Git 差分後の候補ドキュメント抽出、ドキュメントが多いリポジトリの定期的なドリフト検査。

**使用すべきでない場合：** 未文書化の機能をゼロから文書化する作業、翻訳（oma-translation）、シンボル単位の意味的ドリフト、CI をブロックする強制検査（v1 は警告のみ）。

**コアルール：**
- どのモードでも `.agents/` を変更しない
- sync パッチを自動適用しない。sync は常に対話式で `[y]` の確認を必要とする
- LLM が使えない場合は verify を raw JSON、sync を候補一覧だけに縮退させる
- シークレットを含むファイル（`.env*`、`*.pem`、`*.key`、`id_rsa*`、Gitignore 対象）は sync 出力に含めない
- CLI から LLM API を直接呼ばず、構造化データを出力し、ホスト LLM が合成とパッチ作成を行う
- URL のリンク検査は `lychee` に委譲し、フックは v1 では警告のみで完了をブロックしない

**ワークフロー：** verify は extract → resolve → report（決定的 CLI、問題なしは終了 0、壊れた参照は終了 1）。sync は git diff → reverse lookup → 候補一覧 → ホスト LLM のパッチ提案 → 対話式の受理/拒否 → `doc-refs.json` の再生成。

**リソース：** 共有リソースのみ。実装は `cli/commands/docs/`（`extract.ts`、`resolve.ts`、`reporter.ts`、`sync-propose.ts`）にあります。

---

### oma-explanation

**ドメイン：** コード変更の対話型解説。

**使用すべき場合：** 背景、直感、コードの読み解き、短いクイズを 1 つのオフライン対応 HTML 成果物にまとめて、差分、プルリクエスト、ブランチ、コミット範囲を説明する場合。

**ワークフロー：** 指定された変更を読み、Background / Intuition / Code / Quiz を含む自己完結した HTML 解説を作り、成果物を検証して `.agents/results/explain/` に書き込みます。

**使用すべきでない場合：** 通常のドキュメントページ、実機能の実装、スライドデッキ（プレゼンテーションには `oma-slide`）。

**リソース：** 共有の実行・品質リソースと、成果物を検証する `/explain` ワークフロー。

---

### oma-image

**ドメイン：** 認証状態を考慮したマルチベンダー AI 画像生成。Codex の `gpt-image-2`、`agy` 経由の Antigravity Gemini 系「nano-banana」モデル（モデルは内部で選択）、Pollinations の flux/zimage を扱います。

**使用すべき場合：** 画像、ビジュアルアセット、イラスト、商品写真、コンセプトアート、モックアップの生成、同じプロンプトを複数の画像モデルで比較、エディターワークフロー内でのプロンプト画像生成。

**使用すべきでない場合：** 既存画像の編集や写真加工、動画や音声の生成（oma-video / oma-voice）、構造化データからのインライン SVG 作成、単純なリサイズや形式変換。

**コアルール：**
- 呼び出す前に、主題・スタイル・構図・用途が曖昧なら確認するかプロンプトを補強して、展開した内容を示す
- 認証状態に応じてディスパッチし、`--vendor all` では指定したすべてのベンダーが利用可能であることを確認する
- 推定費用が `$0.20` 以上の実行では確認する（`--yes`/`OMA_IMAGE_YES=1` で回避可能）。デフォルトの `pollinations` と `antigravity` は無料
- `$PWD` 外への出力には `--allow-external-output` を使い、`n` の上限は 5
- 各実行は画像の横に `manifest.json` を書く。プロンプト、ベンダー/モデル、入力、成果物メタデータを記録し、ピクセル単位の同一性は保証しない
- 添付された参照画像は `--reference <path>` で自動転送する（codex/antigravity）

**ワークフロー：** PREPARE（プロンプトの確認/補強、ベンダー選択）→ ACQUIRE（認証、参照、出力先の検証）→ ACT（`oma image generate`）→ VERIFY（manifest、ファイル、終了コード）→ FINALIZE（出力先と警告）。

**リソース：** `execution-protocol.md`、`vendor-matrix.md`、`prompt-tips.md`、`checklist.md`、`config/image-config.yaml`。

---

### oma-market

**ドメイン：** コミュニティシグナルから課題、トレンド、競合ポジション、発見を調査すること。調査は upstream の [`last30days`](https://github.com/mvanhorn/last30days-skill) エンジン（Reddit、X、YouTube、TikTok、Instagram、HN、Polymarket、GitHub、arXiv、Techmeme、Digg、LinkedIn、StockTwits、Bluesky、ウェブなど）を使い、oma は常に最新リリースを保持します。

**使用すべき場合：** コミュニティ投稿から実際の課題を抽出、7/30/90/180 日の期間でカテゴリのトレンド検出、競合センチメント分析と SWOT / Porter's 5F ポジショニング、`--discover` による探索、人・企業・ティッカーの調査、採用シグナル、フォローアップ調査。

**使用すべきでない場合：** 市場の枠組みを持たない一般ウェブ調査（oma-search）、学術文献（oma-scholar）、ライブダッシュボードやスケジュール監視（`oma schedule <action>` でこのスキルを包む）。

**コアルール：**
- detect-trap を最初に実行し、明示的な再確認がない限り（`--force`）エンジンを起動しない
- 常に最新の 1 エンジンを使う。`oma market resolve` は実行前に管理コピー（`~/.cache/oma-market/last30days/<tag>/`）を更新し、キャッシュがオフラインにない場合だけ古いユーザーインストールをフォールバックにする
- 解決したエンジンの `SKILL.md` に従い、raw `python3 scripts/last30days.py` の代わりに `oma market run <args>` を使うことだけを置き換える
- WebSearch だけで済ませない。エンジン、Python 3.12 以降、または正常終了がない場合は停止して報告する
- キー付きソースは upstream のセットアップウィザードでユーザーが同意した場合だけ有効にし、スキップしたソースはフッターに残す
- フレームワークはエンジンのクラスタだけを引用し、ファイル書き込み前にバッジの先頭行と upstream の LAWs を確認する
- 実行ごとに `.agents/results/market/{topic-slug}-{YYYYMMDD}.md` に 1 つのブリーフを書き、意図に応じてフレームワークを自動切替する（pain/trend → SWOT、competitor → SWOT + Porter's 5F、discovery → SWOT + PESTEL）

**ワークフロー：** detect-trap → `oma market resolve` → upstream の `SKILL.md` を読む → upstream の事前調査（セットアップウィザード、ハンドル/サブレディット解決、クエリ計画）→ `oma market run … --emit=compact` → upstream の OUTPUT CONTRACT に従って合成 → フレームワーク追加 → セルフチェック → 書き込み。

**リソース：** `intent-rules.md`、`output-laws.md`、`execution-protocol.md`、`checklist.md`、`error-playbook.md`、`frameworks/`（swot、porters-5f、pestel）。CLI は `oma market detect-trap | resolve | update | run`。

---

### oma-refactor

**ドメイン：** 動作を保つリファクタリング。コードスメル、SATD、ホットスポットを対象に、特性テストの安全網とリファクタリング専用コミットで段階的に構造を変更します。

**使用すべき場合：** 特定ファイル/モジュールのリファクタリング（抽出、移動、名前変更、分割、イディオム整合）、機能前の準備、レガシー救済（継ぎ目の発見と特性テスト）、ホットスポット（変更頻度 × 複雑度）による対象選定、現時点で安全に変更できるかの監査。

**使用すべきでない場合：** 報告されたバグや失敗動作の修正（oma-debug）、セキュリティ/パフォーマンス/アクセシビリティ監査（oma-qa）、システム設計や ADR（oma-architecture）、DB スキーマや移行の仕組み（oma-db）、コミット分割やステージング（oma-scm）、目的がパフォーマンス最適化である場合。

**コアルール：**
- 動作を保つ。利用者との契約（Hyrum を考慮）を破らず、改善は副作用であって目標にしない
- 検証可能にする。安全網がなければ、まず特性（ゴールデンマスター）テストを別コミットで書く
- 段階的にする。コミットごとに名前付き変換を 1 つだけ行い、失敗を繰り返す場合は前提を記録して完全に戻す Mikado を使う
- 分離する。動作変更をリファクタリングコミットに混ぜず、`refactor:` 型だけを使う
- 経済性を考える。可読性を優先し、削除予定または変更の少ないコードは触らない
- 規約からの逸脱は oma-architecture の ADR ルートに送り、ローカル修正で済ませない。メトリクスはすべて代理指標（Goodhart）である

**ワークフロー：** PREPARE（green/brownfield の分類、サイズゲート、ホットスポット順位）→ ACQUIRE（シンボルツールでコードを読み、メトリクスと Git シグナルを収集）→ REASON（原子的変換の順序/expand-contract を計画）→ ACT（エンジンファーストで 1 変換）→ VERIFY（テストを変えずに再実行してコミット、または Mikado で戻す）→ FINALIZE（メトリクス差分と可読性の判定）。

**リソース：** `definition.md`、`measurement.md`、`governance.md`、共有の `context-loading`、`quality-principles`。

---

### oma-scholar

**ドメイン：** Knows の `.knows.yaml` サイドカー仕様を使う学術研究コンパニオン。構造化された論文サイドカーの生成、検証、レビュー、クエリ、比較と、knows.academy からの取得を扱います。

**使用すべき場合：** サイドカーによるトークン効率の高い論文読解（主張だけなら約 700 トークン、PDF 全体は約 10K）、草稿/LaTeX/ノートからの `.knows.yaml` 生成、共有前の構造検証、サイドカー形式の査読、既存サイドカーの検索・要約、2 論文の構造比較、knows.academy からの検索/取得。

**使用すべきでない場合：** 一般ウェブ検索や非学術コンテンツ（oma-search）、論文翻訳（oma-translation）、サイドカーなしの PDF 解析だけ（oma-pdf）、編集システムを含む完全な査読ワークフロー。

**モード：** Generate、Validate、Review、Analyze、Compare、Remote（search/fetch）。

**コアルール：**
- 対象仕様は v0.9.0 / `paper@1` プロファイル。ホスト LLM がサイドカーを生成し、外部 LLM SDK をシェルから呼び出さない
- 捏造を防ぐ。DOI/会場/年がソースに見えなければキーごと省略し、`doi: TODO` を書いたり推測したりしない
- 正確なフィールド名、単一の `provenance.actor` オブジェクト、閉じた enum、引用しない数値
- ステートメントあたりの関係密度を 1.5 以上にし、すべての主張に `supported_by` 証拠を付ける
- 共有前に `oma scholar lint` で検証し、第三者サイドカーには `--lenient` を使う
- 古い/2026 年以前の論文は knows.academy から OpenAlex にフォールバックし、公開プロキシ API は認証不要

**ワークフロー：** PREPARE（モードとソース）→ ACQUIRE（メタデータ、節、またはローカルテキスト）→ REASON（主張、証拠、関係を抽出）→ ACT（生成/lint/レビュー/分析/比較/取得）→ VERIFY（スキーマ、enum、ID、関係）→ FINALIZE（留保付きのサイドカー/レポート/要約）。

**リソース：** `execution-protocol.md`、`sidecar-spec.md`、`api-endpoints.md`、`setup-openalex.md`、`upstream-spec-cache.md`、`fallback-providers.md`、`checklist.md`、`config/scholar-config.yaml`。

---

### oma-skill-creation

**ドメイン：** SSL-lite Markdown 形式（Scheduling / Structural Flow / Logical Operations / References）で OMA スキルを作成・検証します。

**使用すべき場合：** `.agents/skills/{name}/SKILL.md` の新規作成、既存スキルの SSL-lite 化、実行量の多いスキルへの正規コマンド/ワークフローパスの追加、ルーティング/実行/検証/復旧の詳細の監査、例を本文と `resources/` のどちらに置くかの判断。

**使用すべきでない場合：** `$CODEX_HOME/skills` への外部スキルのインストール、Codex プラグインバンドルの作成、一般的なプロジェクト計画（oma-pm）、製品/インフラ/フロントエンド/バックエンド/モバイルコードの直接編集。

**コアルール：**
- 上位セクションを Scheduling、Structural Flow、Logical Operations、References の 4 つに固定する
- 明確な `name` と `description` を含む YAML frontmatter を保ち、説明変更後に `oma skill audit` を実行する（TF-IDF cosine collision が 60% 以上で警告、75% 以上で失敗）
- 隣接スキルへのルートを含む具体的な `When NOT to use` 境界を置く
- インラインの正規パスは 1 つだけ（壊れやすい/反復的なコマンドなら `Canonical command path`、判断/調査フローなら `Canonical workflow path`）
- 長いバリエーション固有の詳細は本文ではなく `resources/` に置き、スキル内に README/変更履歴/インストール文書を作らない

**ワークフロー：** PREPARE（目的、トリガー、境界、入出力、依存関係）→ ACQUIRE（類似スキル 1-3 個と規約を読む）→ REASON（本文か `resources/` かを決定）→ ACT（SSL-lite テンプレートから下書き）→ VERIFY（構造、ルーティング、実行、形式を検査）→ FINALIZE（変更ファイルと検証レポート）。

**リソース：** `ssl-lite-template.md`、`validation-checklist.md`、共有の `context-loading`、`quality-principles`。

---

### oma-slide

**ドメイン：** 固定 1920×1080 ステージのアニメーション豊富な HTML プレゼンテーションを生成し、`oma slide` CLI で PDF/PNG/PPTX に決定的に検証・バンドル・出力します。

**使用すべき場合：** トピックやアウトラインからの新規プレゼンテーション、既存デッキの強化や再フォーマット、アニメーションとデザインドクトリンを備えたスライド別 HTML、PDF/PNG/PPTX 出力、名前付きスタイルプリセット、Canva への出力/取り込み。

**使用すべきでない場合：** スライドを使わない通常の文書、画像だけの生成（oma-image）、ブランド/デザインシステムの定義（oma-design）、生成なしの決定的な CLI 操作（`oma slide` CLI を直接呼ぶ）。

**コアルール：**
- HTML はスキルが作成し、CLI はその他（足場、検証、バンドル、出力）を行う
- ローカルアセットだけを使い、`<img src>`/`<video src>` にリモート URL を置かず、`./assets/<file>` だけを使う
- CJK のスライドでは Pretendard フォントを必須とする
- `prefers-reduced-motion` ラッパー、見えるフォーカス状態、`data-om-validate` をすべてのスライドに必須とする
- 検証の自動修正は最大 3 回。その後は差分をユーザーに示す
- 画像生成は oma-image に委譲し、Canva MCP は明示的な同意がある場合だけ任意で自動提供する

**ワークフロー：** 7 段階：DETECT（モード）→ DISCOVER（確認とアセット評価）→ STYLE（3 つのライブプレビューから選択）→ GENERATE（1920×1080 の `slide-NN.html`）→ VALIDATE（`oma slide validate`、自動修正ループは 3 回以内）→ REVIEW（ビューアーと任意の bbox エディター）→ DELIVER（`bundle` と、任意で PDF/PNG/PPTX 出力）。

**リソース：** `generation-protocol.md`、`design-doctrine.md`、`fixed-stage.md`、`style-presets.md`、`selection-index.json`、`animation-patterns.md`、`canva-integration.md`、`checklist.md`、`assets/` ディレクトリ。

---

### oma-video

**ドメイン：** `oma video` CLI で短編、解説、人間操作のデモ動画を生成し、スクリプト → ナレーション → ビジュアル → キャプション → HyperFrames レンダリングを構成します。

**使用すべき場合：** トピックからの短編動画（shorts/reels、9:16）、README/コード/データからの解説（16:9/9:16）、画面キャプチャ（`--source file`）または監督下のブラウザによる任意 URL のウェブアプリキャプチャ（`--source web`）、既存 run の決定的な再レンダリング。

**使用すべきでない場合：** 静止画 1 枚の生成（oma-image）、スライドデッキの生成（oma-slide。解説フレームの内部で呼び出す）、音声だけの生成（oma-voice）、完成した mp4 のノンリニア編集、ライブ配信（監督下のウェブキャプチャは対象）。

**コアルール：**
- 呼び出す前にモードを確認または推定し、曖昧な brief から黙ってレンダリングせず、推定した計画を示す
- 対応するアセットフォールバックのプロバイダー設定はキー任意。Pexels と Pixelle は環境キーがある場合だけ有効になり、コンポジターの失敗をフォールバック動画で置き換えない
- `$0.20` 以上でコスト確認（`--yes`/`OMA_VIDEO_YES=1` で回避）、上限は 180 秒 / 40 シーン
- レンダリング入力は `render-spec.json`、アセット、seed、埋め込み Pretendard に記録し、`OMA_VIDEO_MOCK=1` はユーザー成果物ではなくゴールデンフィクスチャ用のテストハーネス
- デモは人間参加型：ウェブキャプチャは headed browser を開き、人間がフローを操作している間だけ記録する。資格情報の自動化はしない。ログ/manifest では `--url` とトークンをマスクする
- `$PWD` 外への出力には `--allow-external-output` を使う

**ワークフロー：** PREPARE（モード/アスペクト/ロケール、brief の確認/補強）→ ACQUIRE（プロバイダー可用性、キャプチャパス、費用）→ ACT（スクリプト → 音声 ∥ ビジュアル ∥ キャプション → render-spec → render）→ VERIFY（スキーマ、manifest ハッシュ、終了コード、mp4）→ FINALIZE（run-dir、mp4 パス、カバレッジ警告）。

**リソース：** `execution-protocol.md`、`vendor-matrix.md`、`prompt-tips.md`、`checklist.md`、`hyperframes-authoring/` のモードガイド、ウェブキャプチャドライバー、`mpt/` フォールバックコンポジター、`config/video-config.yaml`。

---

### oma-voice

**ドメイン：** Voicebox MCP サーバーによるローカル優先の音声合成と音声認識。完全にデバイス上で動作し、クラウド、API キー、呼び出しごとの費用はありません。

**使用すべき場合：** エージェントの完了/ブロッカー通知、mp3/wav のナレーションや音声アセット、ローカル音声（mp3、wav、m4a、webm、flac）の Markdown 転写、同じテキストを異なる profile id で再実行する音声比較。

**使用すべきでない場合：** クラウド TTS や高忠実度の多言語クラウド音声、リアルタイム端末マイク入力（Voicebox のホットキー口述）、音声クローンのサンプルアップロード/プロファイル作成（Voicebox デスクトップアプリ UI）、動画/音楽/サウンドデザイン。

**コアルール：**
- Voicebox が必須。ハンドシェイク/`GET /health` 失敗時は一度だけインストール/起動ヒントを出して終了し、再試行や自動再起動をしない
- profile が必須。`voicebox_list_profiles` が空ならアプリ UI を案内して終了する
- 長さの上限：1 回の TTS は 5000 文字（2000 文字で警告）、STT は 30 分。v1 は自動分割しない
- 自動呼び出しの透明性：通知は `auto_notify_after_sec`（デフォルト 60 秒）を超えるタスクだけで発火し、意図を常に 1 行で告知する
- パスの安全：`$PWD` 外への出力は警告して確認し、SIGINT では部分出力を書かない
- 生成ごとに manifest が必須。Voicebox は無料なのでコストゲートはない

**ワークフロー：** PREPARE（テキスト/音声/言語/パス/profile の検証）→ ACQUIRE（シグナルが欠けている場合だけ 1 回確認）→ ACT（MCP の `voicebox_speak` または `voicebox_transcribe`）→ VERIFY（音声/転写と manifest フィールド）→ FINALIZE（`manifest.json` を書き、パスを報告）。

**リソース：** `voice-matrix.md`、`prompt-tips.md`、`execution-protocol.md`、`checklist.md`、`config/voice-config.yaml`。

---

## チャータープリフライト（CHARTER_CHECK）

コードを書く前に、すべての実装エージェントは次の CHARTER_CHECK ブロックを出力します。

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {agent domain}
- Must NOT do: {3 constraints from task scope}
- Success criteria: {measurable criteria}
- Assumptions: {defaults applied}
```

**目的：**
- エージェントが実施することと実施しないことを宣言する
- コードを書く前にスコープクリープを検出する
- ユーザーがレビューできるよう前提を明示する
- テスト可能な成功基準を示す

**明確化レベル：**
- **LOW**：要件が明確。記載した前提で進行する。
- **MEDIUM**：部分的に曖昧。選択肢を示し、最も可能性の高いものとして進行する。
- **HIGH**：非常に曖昧。blocked にして質問を列挙し、コードを書かない。

サブエージェントモード（CLI 起動）では、エージェントはユーザーに直接質問できません。LOW は進行し、MEDIUM は絞って解釈し、HIGH は停止してオーケストレータに質問を返します。

---

## 2層スキルローディング

各エージェントの知識は 2 つの層に分かれています。

**レイヤー 1: SKILL.md（スキルがルーティングされたときにロード）**
frontmatter（名前、説明）、使用/非使用条件、コアルール、アーキテクチャ概要、ライブラリ一覧、レイヤー 2 リソースへの参照を含みます。

**レイヤー 2: resources/（オンデマンドでロード）**
エージェントが作業中のときだけ、タスクに必要なリソースだけをロードします。難易度が決めるのはソフトなトークン予算で、固定のファイル一覧ではありません。[タスクごとのリソースロード](./skills.md#resource-loading-by-task)を参照してください。

実行中は必要に応じて追加リソースをロードします。
- `checklist.md`: Verify ステップで使用
- `error-playbook.md`: エラーが発生したときだけ使用
- `common-checklist.md`: Complex タスクの最終検証で使用

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

マルチエージェントプロジェクトでは、ファイル競合を防ぐためにワークスペースを分けます。

```
./apps/api → backend agent workspace
./apps/web → frontend agent workspace
./apps/mobile → mobile agent workspace
```

エージェントをスポーンするときは `-w` フラグでワークスペースを指定します。

```bash
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## オーケストレーションフロー

マルチエージェントワークフロー（`/orchestrate` または `/work`）を実行する場合：

1. **PM エージェント**がリクエストを、優先度（P0、P1、P2）と依存関係を持つドメイン別タスクに分解する
2. **セッションを初期化：** セッション ID を生成し、設定済みメモリストアに `orchestrator-session-{sessionId}.md` と `task-board-{sessionId}.md` を作成する
3. **P0 タスク**を並列でスポーンする（同時実行は MAX_PARALLEL まで）
4. **進捗を監視：** オーケストレータが `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` を POLL_INTERVAL ごとにポーリングする
5. **P1 タスク**を P0 完了後にスポーンし、以降も同じ順序で進める
6. **検証ループ**を完了した各エージェントで実行する（セルフレビュー → 自動検証 → QA によるクロスレビュー）
7. **結果を収集：** 実行単位の結果ファイルと構造化された申告から集める
8. **最終レポート：** セッションの要約、変更ファイル、残りの課題をまとめる

---

## エージェント定義

エージェントは 2 か所で定義されます。

**`.agents/agents/`**: 正本となる、チェックイン済みのサブエージェント定義を 12 個含みます。
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`
- `architecture-reviewer.md`
- `tf-infra-engineer.md`
- `docs-curator.md`
- `refactor-engineer.md`
- `research-explorer.md`

これらのファイルは、エージェントのアイデンティティ、実行プロトコル参照、CHARTER_CHECK テンプレート、アーキテクチャ概要、ルールを定義します。Claude Code の Task/Agent ツールまたは CLI でサブエージェントをスポーンするときに使われます。

ランタイムには、次の 13 個の正規ディスパッチロールも公開されます：`orchestrator`、`architecture`、`qa`、`pm`、`backend`、`frontend`、`mobile`、`db`、`debug`、`refactor`、`docs`、`tf-infra`、`explore`。`research-explorer.md` は `explore` にエイリアスされたチェックイン済み定義で、`orchestrator` は個別の定義ファイルを持たないランタイム調整ロールです。

**ベンダー固有の投影：** OMA は正本の定義をランタイム固有のエージェントファイルに展開します。
- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.cursor/agents/*`、`.opencode/agents/*`、および対応するその他の選択ベンダー投影

これらの生成ファイルは `oma link`、`oma install`、`oma update` で更新されます。

---

## ランタイム状態（プロジェクトメモリストア）

オーケストレーションセッション中、エージェントは `.agents/state/memories/` の共有メモリファイルで連携します（古いプロジェクトは従来の `.serena/memories/` にフォールバックし、`mcp.json` で設定できます）。

| ファイル | オーナー | 目的 | その他 |
|------|-------|---------|--------|
| `orchestrator-session-{sessionId}.md` | オーケストレータ | セッション ID、状態、開始時刻、フェーズ追跡 | 読み取り専用 |
| `task-board-{sessionId}.md` | オーケストレータ | タスク割り当て、優先度、状態更新 | 読み取り専用 |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | その実行 | ターンごとの進捗：実行内容、読み取り/変更ファイル、現在の状態 | オーケストレータが読む |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | その実行 | 最終出力：状態（completed/failed）、要約、変更ファイル、受入基準チェックリスト | オーケストレータが読む |
| `session-metrics.md` | オーケストレータ | 任意のセッションの証拠と、測定した実験結果 | QA が読む |
| `experiment-ledger.md` | オーケストレータ/QA | 実際の実験の証拠 | 全員が読む |

メモリツールは設定できます。デフォルトではエージェントがネイティブのファイルツール（`Read`、`Write`、`Edit`）でこれらの調整ファイルを直接読み書きします。`mcp.json` でカスタムツールとカスタムベースパスも設定できます。

```json
{
"memoryConfig": {
"basePath": ".agents/state/memories",
"tools": {
"read": "Read",
"write": "Write",
"edit": "Edit"
}
}
}
```

ダッシュボード（`oma dashboard terminal` と `oma dashboard web`）はこれらのメモリファイルを監視し、リアルタイムの状態を表示します。
