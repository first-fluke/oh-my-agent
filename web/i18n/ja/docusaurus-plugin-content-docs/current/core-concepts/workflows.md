---
title: ワークフロー
description: oh-my-agentの全16ワークフロー完全リファレンス。スラッシュコマンド、永続/非永続モード、11言語対応のトリガーキーワード、フェーズとステップ、読み書きされるファイル、自動検出の仕組み、情報パターンフィルタリング、永続モードの状態管理を網羅します。
---

# ワークフロー

ワークフローは、スラッシュコマンドまたは自然言語キーワードによってトリガーされる構造化されたマルチステッププロセスです。エージェントがタスクでどう協力するかを定義します。16のワークフローがあり、そのうち4つが永続的です（状態を維持し、誤って中断されません）。

---

## 永続ワークフロー

永続ワークフローはすべてのタスクが完了するまで実行を続けます。`.agents/state/`に状態を維持し、各ユーザーメッセージに`[OMA PERSISTENT MODE: ...]`コンテキストを再注入します。

### /orchestrate

**説明：** 自動CLIベースの並列エージェント実行。CLIでサブエージェントをスポーンし、MCPメモリで調整、進捗を監視、検証ループを実行。

**永続：** はい。状態ファイル：`.agents/state/orchestrate-state.json`。

**トリガーキーワード：**
| 言語 | キーワード |
|----------|----------|
| 共通 | "orchestrate" |
| 英語 | "parallel", "do everything", "run everything" |
| 日本語 | "オーケストレート", "並列実行", "自動実行" |
| 韓国語 | "자동 실행", "병렬 실행", "전부 실행" |
| 中国語 | "编排", "并行执行", "自动执行" |

**トリガー正規表現パターン**（意図 + 名詞ホワイトリスト、[自動検出：パターンフィールド](#pattern-field-raw-regex)を参照）：
| セクション | パターン | トリガーされる例 |
|---------|---------|----------------------|
| `*`（ユニバーサル） | `(build\|create\|make\|develop\|implement\|scaffold) + (a\|an\|the) + [modifier]{0,3} + <noun>` | "Build a TODO app with user authentication", "Create an awesome web service", "Develop a backend with PostgreSQL" |
| `*`（ユニバーサル） | `i want a/an + <noun>` | "I want a CLI for parsing logs" |
| `ko` | `<noun> + (을\|를\|이\|가)? + (만들어\|구현해\|개발해 + 변형)` | "TODO 앱 만들어줘", "REST API 구현해", "백엔드를 개발해주세요" |

名詞ホワイトリスト（15個）：app、api、service、server、cli、tool、website、dashboard、system、feature、backend、frontend、prototype、mvp、bot。

**ステップ：**
1. **Step 0（準備）：** スキル、コンテキストローディングガイド、メモリプロトコルを読み込み。ベンダーを検出。
2. **Step 1（プランのロード/作成）：** `.agents/results/plan-{sessionId}.json`を確認。なければ`/plan`の実行を促す。
3. **Step 2（セッション初期化）：** `oma-config.yaml`をロード、セッションID生成、メモリに`orchestrator-session.md`と`task-board.md`を作成。
4. **Step 3（エージェントスポーン）：** 優先度ティアごとにスポーン。MAX_PARALLELを超えない。
5. **Step 4（モニタリング）：** `progress-{agent}.md`をポーリング、`task-board.md`を更新。
6. **Step 5（検証）：** 完了エージェントごとに`verify.sh`を実行。失敗時は再スポーン（最大2回）。2回後もだめならExploration Loopを起動。
7. **Step 6（収集）：** すべての`result-{agent}.md`を読み取りサマリーを取りまとめ。
8. **Step 7（最終レポート）：** セッションサマリーを提示。Quality Scoreを測定した場合はExperiment Ledgerのサマリーを含み、教訓を自動生成。

**使用すべき場合：** 自動協調による最大並列処理が必要な大規模プロジェクト。

---

### /work

**説明：** ステップバイステップのマルチドメイン協調。PMがまず計画し、各ゲートでユーザー確認後にエージェントが実行、QAレビューと課題修正。

**永続：** はい。状態ファイル：`.agents/state/work-state.json`。

**トリガーキーワード：**
| 言語 | キーワード |
|----------|----------|
| 共通 | "work", "step by step" |
| 日本語 | "コーディネート", "ステップバイステップ" |
| 韓国語 | "코디네이트", "단계별" |

**ステップ：**
1. **Step 0（準備）：** スキル、コンテキストローディング、メモリプロトコルを読み込み。
2. **Step 1（要件分析）：** 関連ドメインを特定。
3. **Step 2（PMエージェント計画）：** 要件分解、APIコントラクト定義、`.agents/results/plan-{sessionId}.json`に保存。
4. **Step 3（プランレビュー）：** ユーザーにプランを提示。**確認必須。**
5. **Step 4（エージェントスポーン）：** 優先度ティアごとにスポーン。
6. **Step 5（モニタリング）：** 進捗ポーリング、APIコントラクト整合性検証。
7. **Step 6（QAレビュー）：** セキュリティ、パフォーマンス、アクセシビリティ、コード品質。
8. **Step 7（反復）：** CRITICAL/HIGH課題は再スポーン。同問題2回失敗でExploration Loop。

**使用すべき場合：** ステップバイステップの制御と各ゲートでのユーザー承認が必要な機能。

---

### /ultrawork

**説明：** 品質にこだわるワークフロー。5フェーズ、17ステップ合計、うち11がレビューステップ。

**永続：** はい。状態ファイル：`.agents/state/ultrawork-state.json`。

**トリガーキーワード：** "ultrawork", "ulw"（共通）

**フェーズとステップ：**

| フェーズ | ステップ | エージェント | レビュー観点 |
|-------|-------|-------|-------------------|
| **PLAN** | 1-4 | PMエージェント（インライン） | 完全性、メタレビュー、過剰エンジニアリング/シンプルさ |
| **IMPL** | 5 | 開発エージェント（スポーン） | 実装 |
| **VERIFY** | 6-8 | QAエージェント（スポーン） | 整合性、安全性（OWASP）、回帰防止 |
| **REFINE** | 9-13 | デバッグエージェント（スポーン） | ファイル分割、再利用性、カスケード影響、一貫性、デッドコード |
| **SHIP** | 14-17 | QAエージェント（スポーン） | コード品質、UXフロー、関連課題、デプロイ準備 |

**ゲート定義：**
- **PLAN_GATE：** プラン文書化、前提リスト化、代替案検討、ユーザー確認。
- **IMPL_GATE：** ビルド成功、テストパス、計画ファイルのみ変更。
- **VERIFY_GATE：** CRITICALゼロ、HIGHゼロ、回帰なし、Quality Score >= 75。
- **REFINE_GATE：** 大ファイルなし（500行超/50行超）、Quality Score非劣化。
- **SHIP_GATE：** 品質チェックパス、UX検証、最終承認。

**ゲート失敗時：** 1回目は修正して再試行。同問題2回目でExploration Loop起動。

**使用すべき場合：** 最高品質のデリバリー。プロダクション準備完了が必要な場合。

---

### /ralph

**説明：** 永続的な自己参照実行ループ。ultrawork を独立したベリファイアでラップし、各イテレーション後に完了基準をチェック。すべての基準が通過するか、セーフガードが発動するまでループを継続します。

**永続：** はい。状態ファイル：`.agents/state/ralph-state.json`。

**トリガーキーワード：**
| 言語 | キーワード |
|------|-----------|
| 共通 | "ralph" |
| 英語 | "don't stop", "until done", "keep going", "finish everything", "run to completion" |
| 韓国語 | "랄프", "멈추지마", "끝까지", "완료될때까지", "끝장내" |
| 日本語 | "止まるな", "完了まで", "最後まで", "全部終わらせて" |
| 中国語 | "不要停", "直到完成", "全部完成", "做完为止" |
| スペイン語 | "no pares", "hasta completar", "termina todo" |
| フランス語 | "n'arrête pas", "jusqu'à complétion", "termine tout" |
| ドイツ語 | "hör nicht auf", "bis zur fertigstellung", "alles fertigstellen" |

**フェーズ：**
1. **Phase 0（INIT）：** 前提条件をロード（context-loading、メモリプロトコル、judge プロトコル）。検証可能な完了基準を定義（各基準は機械的に検証可能であること、たとえばテストのパス、ビルド成功、ファイル存在など）。基準をユーザーに提示して確認。`max_iterations: 5` でセッション初期化。
2. **Phase 1（WORK）：** ultrawork（PLAN → IMPL → VERIFY → REFINE → SHIP）を 1 イテレーションとして実行。
3. **Phase 2（JUDGE）：** 独立したベリファイアが各完了基準を実際のプロジェクト状態と照合（テスト実行、ビルド確認、ファイル存在検証）。各基準を PASS/FAIL で採点し、エビデンスを添付。
4. **Phase 3（DECIDE）：** すべての基準が PASS → ループ終了、最終レポート生成。いずれかが FAIL → イテレーションカウンタを増加、失敗コンテキストをフィードバックして Phase 1 に戻る。
5. **セーフガード：** `current_iteration >= max_iterations`（デフォルト 5）に達した場合、または同じ基準が同じ根本原因で連続 3 回失敗した場合（スタック検知）にループ停止。

**/ultrawork との主な違い：** ultrawork は 1 パスの 5 フェーズワークフロー。ralph は ultrawork を独立した judge が客観的に完了を検証するリトライループでラップします。「レビュー完了」ではなく、実際に作業が完了するまで継続します。

**読み込むファイル：** `.agents/workflows/ralph/resources/judge-protocol.md`、および ultrawork の全ファイル。
**書き込むファイル：** `session-ralph.md`（メモリ）、イテレーションログ、最終レポート。

**使用すべき場合：** 確実な完了が必要な場合。1 回パスしてレポートするのではなく、検証可能な基準が通過するまでエージェントが作業を続ける必要があるときに使用します。

---

## 非永続ワークフロー

### /plan

**説明：** PM主導のタスク分解。要件分析、技術スタック選択、優先タスク分解、APIコントラクト定義。

**トリガーキーワード：** "task breakdown"（共通）、"plan"（英語）、"計画"、"要件分析"、"タスク分解"（日本語）

**ステップ：** 要件収集 -> 技術的実現可能性の分析（MCPコード解析） -> 複雑度の評価（Simple/Medium/Complex） -> APIコントラクト定義（境界をまたぐ場合） -> タスク分解 -> ユーザーレビュー -> プラン成果物の保存（機械可読のJSON、加えてMedium/Complexでは人間可読のMarkdownトラッカー）。

**出力：** `.agents/results/plan-{sessionId}.json`、メモリ書き込み、そしてMedium/Complexでは`docs/plans/work/{NNN}-{name}.md`（タスクテーブル、決定ログ、進捗ノート付き）。ライフサイクルはMarkdownヘッダーの`Status`フィールドで管理されます（`Active` -> `Completed`）。プランをフォルダ間で移動することはありません。`/brainstorm`で作成されたデザインは`docs/plans/designs/{NNN}-{name}.md`に保存されます。

**実行：** インライン（サブエージェントはスポーンしません）。`/orchestrate`または`/work`で使用され、これらが実行中にタスク/ステータスフィールドを更新します。

---

### /brainstorm

**説明：** デザインファーストのアイデア出し。意図探索、制約明確化、アプローチ提案、設計ドキュメント作成。

**トリガーキーワード：** "brainstorm"（共通）、"ブレインストーミング"、"アイデア"、"設計探索"（日本語）

**ルール：** デザイン承認前に実装や計画なし。コード出力なし。YAGNI。

---

### /architecture

**説明：** ソフトウェアアーキテクチャワークフローです。アーキテクチャ問題を診断し、適切な分析手法（診断ルーティング / design-twice / ATAM / CBAM / ADR）を選択し、選択肢を比較し、ステークホルダーの意見を統合し、推奨案・レビュー・ADRを生成します。

**トリガーキーワード：** "architecture"、"ADR"、"ATAM"、"CBAM"（共通）、"architecture review"、"architectural tradeoff"（英語）、"アーキテクチャ"（日本語）、"아키텍처"、"설계 검토"（韓国語）、"架构"（中国語）

**ステップ：** 決定のフレーミング（新規アーキテクチャ / レビュー / トレードオフ分析 / 投資優先順位付け / ADR作成） -> 診断ルーティングで方法論を選択 -> MCPコード解析（`get_symbols_overview`、`find_symbol`、`find_referencing_symbols`）で現在のアーキテクチャを分析 -> ステークホルダーの意見を統合（コストを正当化できるほど横断的な場合のみ） -> 明示的な前提、トレードオフ、リスク、検証ステップを含む推奨案を生成 -> 実装が必要な場合は`/plan`にハンドオフ。

**ルール：** このワークフローでは実装コードやタスク計画を記述しません。アーキテクチャ決定後に`/plan`にハンドオフ。MCPツールを一貫して使用し、生のファイル読み取りやgrepで代替しません。

**使用すべき場合：** システムアーキテクチャの選択、モジュール/サービス/所有権境界の決定、リファクタ優先順位付け、ADR作成、アーキテクチャ上の痛み（変更増幅、隠れた依存関係、扱いにくいAPI）の調査。

---

### /deepinit

**説明：** 完全なプロジェクト初期化。コードベース分析、AGENTS.md、ARCHITECTURE.md、`docs/`知識ベース生成。

**トリガーキーワード：** "deepinit"（共通）、"プロジェクト初期化"（日本語）

---

### /review

**説明：** 完全なQAレビューパイプライン。OWASP Top 10セキュリティ監査、パフォーマンス分析、WCAG 2.1 AAアクセシビリティ、コード品質レビュー。

**トリガーキーワード：** "code review"、"security audit"（共通）、"レビュー"、"コードレビュー"、"セキュリティ監査"（日本語）

**オプションの修正-検証ループ**（`--fix`付き）：QAレポート後にCRITICAL/HIGH課題を修正、最大3回繰り返し。

**委任：** 大規模スコープではステップ2-7をスポーンしたQAエージェントサブエージェントに委任。

---

### /deepsec

**説明：** `oma-deepsec`スキルをエンドツーエンドで駆動。`.deepsec/`をインストールし、コストを校正し、scan/process/triage/revalidate/exportパスを実行、`process --diff`でPRをゲートし、カスタムマッチャーを作成し、発見を専門エージェントへルーティング。インライン実行（サブエージェントのスポーンなし）。

**トリガーキーワード：** "/deepsec"、"deepsec workflow"（共通）、"run deepsec"、"deepsec scan this repo"、"deepsec pr review"、"deepsec ci gate"、"deepsec triage"、"deepsec matchers"（英語）、"딥섹 워크플로우"、"딥섹 실행"、"딥섹 PR 리뷰"（韓国語）、"ディープセック実行"、"deepsecワークフロー"、"deepsecでスキャン"、"deepsec PRレビュー"（日本語）、"运行 deepsec"、"deepsec 工作流"、"deepsec PR 审查"（中国語）。

**ステップ：**
1. **ステップ1、スキル読み込み：** `.agents/skills/oma-deepsec/SKILL.md`を読み、解決されたインテントに対応するリソースファイル（`setup.md`、`scanning.md`、`pr-review.md`、`matchers.md`、`triage.md`、`config.md`）のみをロード。リポジトリ直下に`.deepsec/`があれば増分実行として扱い、再度`init`しない。
2. **ステップ2、インテント分類：** `setup`、`scan`、`pr-review`、`matchers`、`triage`、`config`、`troubleshoot`のいずれか一つに解決。複数インテントは順次実行。`.deepsec/`が無い場合、AI呼び出しインテントの前に`setup`を挿入。
3. **ステップ3、エージェント選択の確認：** 有料呼び出し前に`claude`（最強推論・最も高価）と`codex`（読み取り専用サンドボックス・安価）を確認。ユーザー指定、`deepsec.config.ts`の`defaultAgent`固定、またはユーザー委任時はスキップ。
4. **ステップ4、解決済みインテントの実行：** `setup`は`bunx deepsec init` + `data/<id>/INFO.md`作成（ユーザー確認必須）。`scan`は`--limit 50 --concurrency 5`で校正→コスト外挿→フル`process`→`triage --severity HIGH` + `revalidate --min-severity HIGH`→`export`。`pr-review`は`process --diff origin/${BASE_REF} --comment-out comment.md`の2ジョブCIパターン。`matchers`は`.deepsec/matchers/<slug>.ts`を`precise`/`normal`/`noisy`の適切な階層で作成し`scan --matchers`で検証。`triage`は`true-positive`/`uncertain`のみにフィルタしFP形状をメモ。`config`/`troubleshoot`は`resources/config.md`の症状表を適用。
5. **ステップ5、要約とルーティング：** 実行サマリ（project id、pass type、agent/model、files scanned、findings、TP after revalidate、cost、wall time、stop conditions）を生成。脆弱ファイルの**レイヤー**で後続をルーティング（backend → `oma-backend`、frontend → `oma-frontend`、mobile → `oma-mobile`、IaC → `oma-tf-infra`、DB → `oma-db`、CI → `oma-dev-workflow`、ドキュメント乖離 → `oma-docs`、エントリーポイント欠落 → ステップ4D再入）。レイヤー曖昧または`revalidation.verdict === "uncertain"`の場合はまず`oma-debug`をトリアージホップとして実行。
6. **ステップ6、停止条件：** インテント完了 + ステップ5要約、ブロッキング前提条件（認証情報欠落、`INFO.md`拒否）、または安全再開コマンド付きクォータ停止で終了。

**ルール：** 製品ソースコードを変更しない（専門家に委任）。認証情報（`vck_…`、`sk-ant-…`、OIDCトークン）をエコーしたりコミットしたりしない。PR制御コードを実行するCIジョブに`pull-requests: write`を付与しない。再開し、リセットしない：中断時は同じコマンドを再実行し、ユーザーの明示的指示なしに`rm -rf data/<id>/`を行わない。

**使用場面：** リポジトリのエージェント駆動型脆弱性スキャン、`process --diff`によるCI/PRセキュリティゲート、エントリーポイント網羅のためのプロジェクト固有マッチャー作成、既存発見のトリアージとFP削減。

---

### /debug

**説明：** 構造化されたバグ診断と修正。回帰テスト作成と類似パターンスキャン。

**トリガーキーワード：** "debug"（共通）、"デバッグ"、"バグ修正"、"エラー修正"（日本語）

**サブエージェントスポーン基準：** エラーが複数ドメインにまたがる、スキャンスコープ10ファイル超、深い依存関係トレースが必要。

---

### /design

**説明：** 7フェーズデザインワークフロー。DESIGN.md、トークン、コンポーネントパターン、アクセシビリティルールを生成。

**トリガーキーワード：** "design system"、"DESIGN.md"、"design token"（共通）、"デザイン"、"ランディングページ"、"デザインシステム"（日本語）

**フェーズ：** SETUP -> EXTRACT -> ENHANCE -> PROPOSE -> GENERATE -> AUDIT -> HANDOFF

---

### /scm

**説明：** 自動機能ベース分割付きConventional Commits生成。

**トリガーキーワード：** なし（明示的呼び出しのみ）。

---

### /tools

**説明：** MCPツールの可視性と制限の管理。ツールグループの有効化/無効化。

**トリガーキーワード：** なし（明示的呼び出しのみ）。

**ツールグループ：** memory、code-analysis、code-edit、file-ops

---

### /pdf

**説明：** `opendataloader-pdf`を用いてPDFをMarkdownに変換します。正しい読み順でテキスト、表、見出し、画像を抽出します。

**トリガーキーワード：** なし（入力ファイルパスを指定して明示的に呼び出し）。

**ステップ：** 入力検証（ファイル存在確認） -> 出力場所の決定（ユーザー指定または入力と同じディレクトリ） -> `uvx opendataloader-pdf`を実行（インストール不要） -> スキャンPDFにはOCR付きハイブリッドモードを使用 -> `uvx mdformat`で出力を正規化 -> 可読性と構造を検証 -> 変換に関する問題（表の欠落、文字化け）を報告。

**ルール：** デフォルトの出力場所は入力PDFと同じディレクトリ。ステップを決してスキップしません。応答言語は`.agents/oma-config.yaml`に従います。

**使用すべき場合：** LLMコンテキストまたはRAG取り込みのためのPDFドキュメントのMarkdown変換、PDFからの構造化コンテンツ（表、見出し、リスト）抽出。

---

### /stack-set

**説明：** プロジェクト技術スタック自動検出とバックエンドスキル用言語固有リファレンス生成。

**トリガーキーワード：** なし（明示的呼び出しのみ）。出力：`.agents/skills/oma-backend/stack/`。

---

## スキル vs ワークフロー

| 側面 | スキル | ワークフロー |
|--------|--------|-----------|
| **定義** | エージェントの専門知識 | オーケストレーションプロセス |
| **場所** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **アクティベーション** | スキルルーティングキーワードにより自動 | スラッシュコマンドまたはトリガーキーワード |
| **スコープ** | 単一ドメイン実行 | マルチステップ、多くの場合マルチエージェント |

---

## 自動検出の仕組み

### フックシステム

`UserPromptSubmit`フックが各メッセージ処理前に実行されます：

1. **`triggers.json`**：11言語のキーワード-ワークフローマッピングを定義。
2. **`keyword-detector.ts`**：入力をトリガーキーワードに対してスキャン、ワークフローコンテキストを注入。
3. **`persistent-mode.ts`**：アクティブ状態ファイルを確認し永続ワークフロー実行を強制。

### 検出フロー

1. ユーザーが自然言語を入力します
2. フックが明示的な `/command` の存在を確認します（ある場合は重複を避けるため検出をスキップします）
3. フックが入力をサニタイズし（コードブロック、引用符付き文字列、貼り付けられたシステムエコーブロックを除去）、`.agents/hooks/core/triggers.json` に対してキーワードリスト（リテラルなフレーズ）と `patterns`（生の正規表現）の両方をスキャンします。強化ガードにより、同じワークフローが直近 60 秒以内に 2 回以上発火している場合は再トリガーを抑制します
4. マッチが見つかった場合、入力が情報パターンに一致するかを確認します
5. 情報的な場合（例：「what is orchestrate?」）はフィルタリングし、ワークフローはトリガーしません
6. アクション可能な場合、`[OMA WORKFLOW: {workflow-name}]` をコンテキストに注入します
7. エージェントが注入されたタグを読み取り、`.agents/workflows/` から対応するワークフローファイルをロードします

### 言語セクション規約

`.agents/hooks/core/triggers.json` は `keywords`、`patterns`、`informationalPatterns` に対して言語ごとのセクション構造を使用します：

| セクション | 動作 |
|---------|----------|
| `*` | ユニバーサル。`.agents/oma-config.yaml` の `language` 設定に関わらず常にロードされます。英語コンテンツ（共通言語）や、真に言語をまたぐトークン（例：ワークフロー名 `"orchestrate"`）に使用してください。 |
| `en` | 英語。後方互換性のためにロードされます。機能的には `*` と等価です。新しい英語コンテンツは `*` に追加してください。 |
| `ko`、`ja`、`zh`、`es`、`fr`、`de`、`pt`、`ru`、`nl`、`pl` | 言語固有。`.agents/oma-config.yaml` で `language: <lang>` が設定されている場合のみロードされます。 |

**含意**：`.agents/oma-config.yaml` で `language: en` を設定した場合、`*` と `en` のパターンのみがロードされます。ユーザーが韓国語や日本語などで入力しても、それらの自然言語トリガーは発火しません。英語以外の言語を有効化するには、`language: <code>` を適切に設定してください。`*` の英語フォールバックは常に有効のままです。

### パターンフィールド（生の正規表現） {#pattern-field-raw-regex}

リテラルな `keywords` に加えて、各ワークフローは `patterns` を宣言できます。`patterns` は `iu` フラグでコンパイルされる生の正規表現文字列です。パターンは、組み合わせ爆発するキーワードリストを必要とするマルチトークン意図マッチングを可能にします。

```jsonc
{
  "workflows": {
    "orchestrate": {
      "persistent": true,
      "keywords": { "*": ["orchestrate"], "en": ["parallel", ...] },
      "patterns": {
        "*": ["\\b(build|create|make)\\s+(?:an?|the)\\s+...\\b"],
        "ko": ["(앱|API|...)\\s*(?:을|를)?\\s*(?:만들어\\s*(?:주세요|줘)?|...)"]
      }
    }
  }
}
```

オーサリングルール：
- 文字列はそのままコンパイルされます。バックスラッシュは JSON 用と正規表現用で 2 重にエスケープしてください（`\\b`、`\\s+`）
- 自動的な単語境界ラップはありません。パターン作者が `\b` を自分で扱います
- 不正な正規表現は実行時にサイレントにスキップされます（設定編集時にはテスト失敗で可視化されます）

### 情報パターンフィルタリング

`.agents/hooks/core/triggers.json` の `informationalPatterns` セクションは、コマンドではなく質問を示すフレーズを定義します。各潜在的なワークフローマッチの周囲 60 文字のウィンドウで確認されます：

| セクション | パターン例 |
|---------|----------------------|
| `*`（ユニバーサル英語） | "what is", "what are", "how to", "how does", "how do", "should we", "should i", "could we", "would you", "what if", "what about", "why build", "false positive", "trigger when", "auto-trigger" |
| `ko` | "뭐야", "무엇", "어떻게", "설명해", "알려줘", "트리거", "발동", "메타", "왜 만들", "어떻게 만들", "어떨까", "한다면", "할까요" |
| `ja` | "とは", "って何", "どうやって", "説明して" |
| `zh` | "是什么", "什么是", "怎么", "解释" |

入力がワークフロートリガーと情報パターンの両方にマッチする場合、情報パターンが優先されワークフローはトリガーされません。これにより以下のようなプロンプトがブロックされます：
- `"How do you build a TODO app?"`: `*` の `how do` が orchestrate の意図正規表現をブロック
- `"orchestrate 트리거 해주면 되나요?"`（`language: ko` の場合）: `ko` の `트리거` が orchestrate のキーワードをブロック

### 除外ワークフロー

自動検出から除外（明示的`/command`が必要）：`/scm`、`/tools`、`/stack-set`、`/pdf`

---

## 永続モードの仕組み

### 状態ファイル

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
└── work-state.json
```

ワークフロー名、現在のフェーズ/ステップ、セッションID、タイムスタンプ、および保留中の状態を含みます。

### 再注入

永続ワークフローがアクティブな間、`persistent-mode.ts`フックが各ユーザーメッセージに`[OMA PERSISTENT MODE: {workflow-name}]`を注入します。これにより、会話ターンをまたいでもワークフローの実行が継続されます。

### 非アクティブ化

永続ワークフローを無効にするには、ユーザーが「workflow done」（または設定言語の同等表現）と言います。これにより：
1. `.agents/state/`から状態ファイルを削除
2. 永続モードコンテキストの注入を停止
3. 通常動作に復帰

すべてのステップが完了し最終ゲートを通過した場合にも自然終了します。

---

## 典型的なワークフローシーケンス

### クイック機能
```
/plan → 出力レビュー → /work
```

### 複雑なマルチドメインプロジェクト
```
/work → PM計画 → ユーザー確認 → エージェントスポーン → QAレビュー → 課題修正 → 出荷
```

### 最高品質デリバリー
```
/ultrawork → PLAN（4レビュー）→ IMPL → VERIFY（3レビュー）→ REFINE（5レビュー）→ SHIP（4レビュー）
```

### バグ調査
```
/debug → 再現 → 根本原因 → 最小修正 → 回帰テスト → 類似パターンスキャン
```

### デザインから実装へ
```
/brainstorm → 設計ドキュメント → /plan → タスク分解 → /orchestrate → 並列実装 → /review → /scm
```

### 新規コードベースセットアップ
```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/
```
