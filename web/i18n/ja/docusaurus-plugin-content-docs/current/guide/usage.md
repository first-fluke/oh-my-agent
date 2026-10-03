---
title: 使い方ガイド
sidebar_label: OMAの使い方
description: 読者が先にタスクを選ぶための手順、単一スキルとマルチドメインの例、ワークフロー、自動検出、33 個のスキルパッケージ、CLI による並列実行、ダッシュボード、デフォルト、復旧を説明します。
---

# oh-my-agent の使い方

## クイックスタート

1. 対応する AI 搭載 IDE または CLI（Claude Code、Codex CLI、Cursor、Antigravity、OpenCode、Kimi、Kiro、Qwen など）でプロジェクトを開きます。
2. 選択したホストは `.agents/skills/` からスキルをロードできます。有効なフックは自然言語のキーワードからワークフローを検出します。
3. やりたいことを自然言語で説明します。ホストまたは選択したワークフローがタスクを適切なスキルへルーティングします。
4. 複数のエージェントを使う場合は `/work` または `/orchestrate` を使います。

単一ドメインのタスクに特別な構文は必要ありません。[スキルとワークフローの選択ガイド](/docs/core-concepts/workflows#choosing-a-skill-or-workflow)で、単一スキル、`/work`、`/orchestrate`、`/ultrawork`、`/ralph` のどれを選ぶか確認してください。セットアップは[クイックスタート](../getting-started/quick-start.md)を、プロバイダーを変更する前の確認事項は[重要なデフォルト](../getting-started/important-defaults.md)を参照してください。

---

## 例 1：単純な単一タスク

**入力例：**

```
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**実行されること：**

1. ホストが「form」「component」「Tailwind CSS」などのキーワードを手がかりに、リクエストを `oma-frontend` へルーティングします。
2. Layer 1（SKILL.md）にはエージェントの識別情報、コアルール、ライブラリ一覧がすでにロードされています。
3. Layer 2 のリソースがオンデマンドでロードされます。
   - `execution-protocol.md`：4 ステップのワークフロー（Analyze、Plan、Implement、Verify）
   - `snippets.md`：フォームと Zod のバリデーションパターン
   - スキルが提供する既存コンポーネントパターンと `snippets.md`
4. エージェントが **CHARTER_CHECK** を出力します。
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: email/password validation, accessible labels, keyboard-friendly
   - Assumptions: React + TypeScript, shadcn/ui, TailwindCSS v4, @tanstack/react-form + Zod
   ```
<!-- oma-docs:ignore-start -->
5. エージェントが実装します。
   - TypeScript の React コンポーネント：`src/features/auth/components/login-form.tsx`
   - Zod のバリデーションスキーマ：`src/features/auth/utils/login-validation.ts`
   - Vitest テスト：`src/features/auth/utils/__tests__/login-validation.test.ts`
   - ローディングスケルトン：`src/features/auth/components/skeleton/login-form-skeleton.tsx`
<!-- oma-docs:ignore-end -->
6. エージェントがチェックリストを実行します。アクセシビリティ（ARIA ラベル、セマンティック HTML、キーボード操作）、モバイルビューポート、パフォーマンス（CLS なし）、エラーバウンダリを確認します。

**期待される結果：** プロジェクトが対応するチェックを実行できる場合、スコープを限定した TypeScript の React コンポーネント、バリデーション、テスト、アクセシビリティの根拠が得られます。実際に実行されるファイルとチェックは、プロンプトと選択したワークフローで決まります。

---

## 例 2：マルチドメインプロジェクト

**入力例：**

```
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**実行されること：**

1. このリクエストはフロントエンド、バックエンド、モバイルにまたがります。その範囲から、ホストエージェントは調整方法を提案できます。
2. キーワード検出フックが有効なら、「Build a TODO app」が設定済みの `/orchestrate` パターンに一致して起動する場合があります。フックは入力テキストを照合するだけで、リクエストをマルチドメインとは分類しません。使うワークフローを明示的なコマンドで選びます。

**`/work` を使う場合（ユーザーが段階ごとに制御）：**

```
/work Build a TODO app with user authentication, task CRUD, and a mobile app
```

3. **Step 1、PM エージェントが計画します。**
   - ドメインを特定：バックエンド（認証 API、タスク CRUD）、フロントエンド（ログイン、タスクリスト UI）、モバイル（Flutter アプリ）
   - API コントラクトを定義：`POST /auth/register`、`POST /auth/login`、`POST /auth/refresh`、`GET /tasks`、`POST /tasks`、`PUT /tasks/:id`、`DELETE /tasks/:id`
   - 優先度付きタスク分解を作成：
     - P0：バックエンド認証 API、バックエンドのタスク CRUD API
     - P1：フロントエンドのログイン/登録、フロントエンドのタスクリスト、モバイルの認証画面、モバイルのタスクリスト
     - P2：QA レビュー
   - `.agents/results/plan-{sessionId}.json` に保存

4. **Step 2、プランをレビューします。** エージェントはプランを提示し、既存の承認範囲で続行します。確認するのは、未決定の重要な事項や、新しい承認が必要な操作だけです。

5. **Step 3、優先度ごとにエージェントをスポーンします。**
   ```bash
   # P0 tier (parallel)
   oma agent spawn backend "JWT auth API + task CRUD endpoints" session-todo-01 -w ./apps/api &
   oma agent spawn db "User and task schema design" session-todo-01 &
   wait

   # P1 tier (parallel, after P0 completes)
   oma agent spawn frontend "Login, register, task list UI" session-todo-01 -w ./apps/web &
   oma agent spawn mobile "Auth and task screens" session-todo-01 -w ./apps/mobile &
   wait
   ```

6. **Step 4、QA エージェントがレビューします。**
   - セキュリティ：OWASP Top 10 への準拠（JWT 検証、CSRF、SQL インジェクションの確認）
   - パフォーマンス：N+1 クエリの確認、ページネーションの検証
   - アクセシビリティ：すべてのフロントエンドコンポーネントで WCAG 2.1 AA
   - ドメイン間：フロントエンド、モバイル、バックエンドの API コントラクトの整合性

7. **Step 5、反復します。** QA が CRITICAL な問題を見つけたら、QA レポートを添えて担当エージェントを再スポーンします。

---

## 例 3：バグ修正

**入力例：**

```
There's a bug. Clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

**実行されること：**

1. 「bug」「error」「Cannot read property」などのキーワードで `oma-debug` が自動的に起動します。
2. **Step 1、収集：** エラーメッセージとコンテキストを取り込みます。
<!-- oma-docs:ignore-start -->
3. **Step 2、再現：** MCP の `search_for_pattern` が `src/features/tasks/components/task-list.tsx` の `.map()` 呼び出しを見つけます。
<!-- oma-docs:ignore-end -->
4. **Step 3、診断：** MCP の `find_referencing_symbols` でデータの流れを追跡します。
   - `useQuery` フックが API からタスクを取得する
   - データの到着前にコンポーネントが描画される
   - ローディング中は `tasks` が `undefined` になる
   - 根本原因：`.map()` の前にローディング状態を確認していない
5. **Step 4、修正案：** ローディング状態の確認と null ガードを追加する最小変更を提示します。
6. **Step 5、実装：**
   - データ取得中にローディングスケルトンを表示
   - null チェックを追加：`tasks?.map()` またはローディング中の早期 return
   - `tasks` が `undefined` のときも正しく描画できることを確認する回帰テストを作成
7. **Step 6、類似パターンのスキャン：** MCP の `search_for_pattern` で、`undefined` の可能性がある配列に対する他の `.map()` 呼び出しを検索します。
   - `user-list.tsx`、`comment-list.tsx`、`notification-list.tsx` に似たパターンを 3 件見つける
   - 同じ修正パターンを先回りして適用する
8. **Step 7、記録：** 根本原因、修正、予防策を含むバグレポートをメモリに書き込みます。

---

## 例 4：デザインシステム

**入力例：**

```
Design a dark premium landing page for my B2B SaaS analytics product
```

**実行されること：**

1. 「design」「landing page」「dark」「premium」などのキーワードで `oma-design` が起動します。
2. **Phase 1、SETUP：** `.design-context.md` を確認します。ない場合は次を質問します。
   - サービスはどの言語に対応するか（英語のみ / CJK を追加）
   - 対象ユーザー（B2B、技術ユーザー、25〜45 歳）
   - ブランドの個性（プロフェッショナル / プレミアム）
   - 美的方向性（ダークプレミアム）
   - 参考サイト（ユーザーが例を提供）
   - アクセシビリティ（WCAG AA）
3. **Phase 3、ENHANCE：** プロンプトが曖昧なら、セクションごとの仕様へ変換します。
4. **Phase 4、PROPOSE：** 3 つのデザイン方向を提示します。
   - **方向 A「Midnight Observatory」**：深いネイビー（#0f1729）、シアンのアクセント（#22d3ee）、Inter + JetBrains Mono、ベン​​トグリッド、スクロール連動の表示
   - **方向 B「Carbon Interface」**：ニュートラルグレー（#18181b）、アンバーのアクセント（#f59e0b）、システムフォント、チェス盤レイアウト、ホバー連動のマイクロインタラクション
   - **方向 C「Deep Space」**：純粋なダーク（#0a0a0a）、エメラルドのアクセント（#10b981）、Geist + Geist Mono、全面幅セクション、入場アニメーション
5. **Phase 5、GENERATE：** 選択した方向に基づいて次を生成します。
   - 6 セクションの `DESIGN.md`（タイポグラフィ、カラー、スペーシング、モーション、コンポーネント、アクセシビリティ）
   - CSS カスタムプロパティ
   - Tailwind 設定の拡張
   - shadcn/ui のテーマ変数
6. **Phase 6、AUDIT：** レスポンシブ（最小 320px）、WCAG 2.2、Nielsen ヒューリスティクス、AI スロップ検出を確認します。
7. **Phase 7、HANDOFF：** 「デザインが完了しました。`oma-frontend` で実装するには `/orchestrate` を実行してください」と案内します。

---

## 例 5：CLI による並列実行

```bash
# Single agent for a simple task
oma agent spawn frontend "Add dark mode toggle to the header" session-ui-01

# Three agents in parallel for a full-stack feature
oma agent spawn backend "Implement notification API with WebSocket support" session-notif-01 -w ./apps/api &
oma agent spawn frontend "Build notification center with real-time updates" session-notif-01 -w ./apps/web &
oma agent spawn mobile "Add push notification screens and in-app notification list" session-notif-01 -w ./apps/mobile &
wait

# After editing .agents/agents/ or workflows, regenerate vendor-native files
oma link claude codex antigravity

# Monitor while agents work (separate terminal)
oma dashboard terminal        # Terminal UI with live table
oma dashboard web    # Web UI at http://localhost:9847

# After implementation, run QA
oma agent spawn qa "Review notification feature across all platforms" session-notif-01

# Check session statistics after completion
oma stats get
```

現在のランタイムが `.agents/oma-config.yaml` の対象ベンダーと一致する場合、ワークフローはネイティブサブエージェントを優先します。

- Claude Code -> `.claude/agents/*.md`
- Codex CLI -> `.codex/agents/*.toml`
- Qwen Code -> `.qwen/agents/*.md`（Agent ツールの `subagent_type` で選択）
- Antigravity CLI/IDE -> `agy` 経由の `oma agent spawn`

ベンダーをまたぐタスクと `model_preset: free` では `oma agent spawn` を使います。ネイティブディスパッチでも、検証の証拠を記録するには[結果ライフサイクル](./agent-results-and-resume.md)が必要です。

---

## 例 6：最高品質のための ultrawork

**入力例：**

```
/ultrawork Build a payment processing module with Stripe integration
```

**実行されること（5 フェーズ、17 ステップ、12 個の分離レビュー）：**

**Phase 1、PLAN（Step 1〜4、PM エージェントがインラインで実行）：**
- Step 1：タスク分解、API コントラクト、依存関係を含むプランを作成
- Step 2：プランレビュー（すべての要件が対応付いているか確認）
- Step 3：メタレビュー（レビューが十分だったかを自己検証）
- Step 4：過剰エンジニアリングレビュー（MVP に集中し、不要な複雑さを避ける）
- PLAN_GATE：プランを文書化し、前提を列挙し、スコープを承認

**Phase 2、IMPL（Step 5、開発エージェントをスポーン）：**
- バックエンドエージェントが Stripe 統合（Webhook、冪等性、エラーハンドリング）を実装
- フロントエンドエージェントがチェックアウトフローと決済状態 UI を作成
- Step 5.2：定義された計測比較が必要な場合だけ、ベースラインを記録
- IMPL_GATE：適用対象のチェックとテストが通り、計画したファイルだけを変更。ビルドチェックは明示的に依頼された場合だけ実行

**Phase 3、VERIFY（Step 6〜8、QA エージェントをスポーン）：**
- Step 6：整合性レビュー（実装がプランに一致するか）
- Step 7：セキュリティ/バグレビュー（OWASP、npm audit、Stripe のセキュリティベストプラクティス）
- Step 8：改善/回帰レビュー（回帰がないか）
- VERIFY_GATE：CRITICAL ゼロ、HIGH ゼロ、適用対象のプロジェクト計測目標を満たす

**Phase 4、REFINE（Step 9〜13、Refactor エージェントをスポーン）：**
- Step 9：大きなファイル（500 行超）と関数（50 行超）を分割
- Step 10：統合/再利用レビュー（重複ロジックをなくす）
- Step 11：副作用レビュー（`find_referencing_symbols` でカスケード影響を追跡）
- Step 12：変更全体のレビュー（命名の一貫性、スタイルの整合性）
- Step 13：デッドコードを整理
- REFINE_GATE：未解決の計測上の回帰がなく、コードが整理されている

**Phase 5、SHIP（Step 14〜17、QA エージェントをスポーン）：**
- Step 14：コード品質レビュー（lint、型、カバレッジ）
- Step 15：UX フロー検証（決済ユーザージャーニーを端から端まで）
- Step 16：関連課題レビュー（最終的なカスケード影響の確認）
- Step 17：デプロイ準備（シークレット管理、マイグレーションスクリプト、ロールバック計画）
- SHIP_GATE：すべてのチェックが通る。既存の承認を引き継ぎ、公開やデプロイにはその操作への承認が必要

---

## すべてのワークフローコマンド

| コマンド | 種類 | 内容 | 使う場面 |
|---------|------|------|---------|
| `/orchestrate` | 永続 | プランをロードまたは作成し、モニタリングと検証を伴う並列実行を委任 | 自動並列調整に適した独立タスク |
| `/work` | 永続 | 承認済み範囲で、段階的に計画、実装、QA を進める | 複数ドメインにまたがり、調整が必要な機能 |
| `/ultrawork` | 永続 | 12 個の分離レビューを含む 5 フェーズ、17 ステップの品質ワークフロー | 最高品質のデリバリー、プロダクションに重要なコード |
| `/plan` | 非永続 | PM 主導のタスク分解、API コントラクト、`docs/plans/work/` の追跡付きプラン成果物（連番 `NNN-name.md`、ライフサイクル用 Status フィールド） | 複雑なマルチエージェント作業の前、追跡が必要な複雑な機能 |
| `/brainstorm` | 非永続 | 2〜3 のアプローチを提案するデザインファーストのアイデア出し | 実装方針を決める前 |
| `/deepinit` | 非永続 | プロジェクト全体の初期化（AGENTS.md、ARCHITECTURE.md、docs/） | 既存のコードベースに oh-my-agent を設定するとき |
| `/review` | 非永続 | QA パイプライン（OWASP セキュリティ、パフォーマンス、アクセシビリティ、コード品質） | マージ前、デプロイ前のレビュー |
| `/debug` | 非永続 | 再現、診断、修正、回帰テスト、スキャンを行う構造化デバッグ | バグやエラーの調査 |
| `/design` | 非永続 | トークン付きの DESIGN.md を作る 7 フェーズのデザインワークフロー | デザインシステム、ランディングページ、UI の再設計 |
| `/scm` | 非永続 | Git（ブランチ、マージ、競合、ワークツリー、ベースライン）と Conventional Commit 生成を自動的に型・スコープ検出して扱う | コード変更後、リポジトリ構成の管理 |
| `/tools` | 非永続 | MCP ツールの可視性を管理（グループの有効化/無効化） | 使える MCP ツールを制御するとき |
| `/stack-set` | 非永続 | プロジェクトの技術スタックを自動検出し、バックエンドまたはモバイル（Swift / Flutter / RN）のリファレンスを生成 | 言語固有のコーディング規約を設定するとき |
| `/architecture` | 非永続 | アーキテクチャの診断、比較、意思決定記録 | 境界をレビュー、アーキテクチャを選択するとき |
| `/convert` | 非永続 | ドキュメント変換を適切なスキルへルーティング | HWP/HWPX または PDF の変換 |
| `/docs` | 非永続 | ドキュメントの検証と、差分対象の同期提案 | コードベースに対してドキュメントを確認するとき |
| `/explain` | 非永続 | オフライン HTML のコード変更解説を生成・検証 | 差分、PR、ブランチ、コミット範囲を説明するとき |
| `/recap` | 非永続 | 対応する AI ツールの履歴を要約 | 日次または期間の振り返り |
| `/schedule` | 非永続 | エージェントの定期ジョブを登録 | 夜間のリキャップ、スキャン、定期メンテナンス |
| `/video` | 非永続 | スクリプト、ナレーション、映像から再現可能な動画を作成 | ショート、解説、デモ |
| `/ralph` | 永続 | 独立した判定とループのセーフガードを伴う ultrawork の反復実行 | 機械的な完了基準に達するまで繰り返すことを明示的に依頼するとき |

---

## 自動検出の例

oh-my-agent は 11 言語のワークフローキーワードを検出します。自然言語の入力からワークフローが起動する例を示します。

| 入力 | 検出されるワークフロー | 言語 |
|------|------------------|------|
| "plan the authentication feature" | `/plan` | English |
| "do everything in parallel" | `/orchestrate` | English |
| "review the code for security" | `/review` | English |
| "brainstorm some ideas for the dashboard" | `/brainstorm` | English |
| "design a landing page for our product" | `/design` | English |
| "fix the login bug" | `/debug` | English |
| "계획 세워줘" | `/plan` | Korean |
| "버그 수정해줘" | `/debug` | Korean |
| "디자인 시스템 만들어줘" | `/design` | Korean |
| "자동으로 실행해" | `/orchestrate` | Korean |
| "コードレビューして" | `/review` | Japanese |
| "計画を立てて" | `/plan` | Japanese |
| "修复这个 bug" | `/debug` | Chinese |
| "设计一个着陆页" | `/design` | Chinese |
| "revisar código" | `/review` | Spanish |
| "diseña la página" | `/design` | Spanish |
| "debuggen" | `/debug` | German |
| "coordonner étape par étape" | `/work` | French |
| "don't stop until it's done" | `/ralph` | English |
| "끝까지 해" | `/ralph` | Korean |
| "最後までやって" | `/ralph` | Japanese |

**情報を尋ねる入力は除外されます。**

| 入力 | 結果 |
|------|--------|
| "what is orchestrate?" | ワークフローを起動しない（情報パターン：「what is」） |
| "explain how /plan works" | ワークフローを起動しない（情報パターン：「explain」） |
| "어떻게 사용해?" | ワークフローを起動しない（情報パターン：「어떻게」） |
| "レビューとは何ですか" | ワークフローを起動しない（情報パターン：「とは」） |

---

## 33 スキルのクイックリファレンス

インストーラーの `all` プリセットは、現在のレジストリに従います。この表は各スキルを主な用途で分類しています。境界では別のスキルと連携できます。

| スキル | 得意なこと | 主な出力 |
|-------|---------|---------------|
| **oma-academic-writing** | 学術的な執筆、改稿、アンチ AI レビュー | 出版向けの文章と主張/根拠の改稿 |
| **oma-architecture** | システム境界、トレードオフ、ADR | アーキテクチャの推奨案または意思決定記録 |
| **oma-backend** | API、認証、サーバーロジック、マイグレーション | Router / Service / Repository の変更と検証 |
| **oma-brainstorm** | 曖昧なアイデアとアプローチ比較 | `docs/plans/designs/` の設計ドキュメント |
| **oma-coordination** | 手動のマルチエージェント調整 | 段階的なタスクとハンドオフの指針 |
| **oma-db** | スキーマ設計、ERD、クエリ調整、容量計画 | スキーマ文書、マイグレーション、復旧計画 |
| **oma-debug** | バグの再現と根本原因分析 | 最小修正、回帰の根拠、類似パターンスキャン |
| **oma-deepsec** | エージェント駆動の脆弱性スキャン | スキャン、トリアージ、再検証、ゲートのレポート |
| **oma-design** | デザインシステム、ランディングページ、トークン | `DESIGN.md`、トークン、コンポーネント指針 |
| **oma-dev-workflow** | CI/CD、モノレポ、マイグレーション、リリース自動化 | ワークフロー設定とリリースチェック |
| **oma-docs** | 壊れた参照とドキュメントドリフト | 検証レポートまたは差分対象の同期候補 |
| **oma-explanation** | 差分、PR、ブランチ、コミットの解説 | Background、Intuition、Code、Quiz を含むオフライン HTML 解説 |
| **oma-frontend** | UI コンポーネント、フォーム、ページ、Angular / React のスタイリング | フロントエンドの変更と関連チェック |
| **oma-hwp** | HWP / HWPX / HWPML の変換 | 見出し、表、画像、リンクを含む Markdown |
| **oma-image** | 画像生成とビジュアルアセット | マニフェスト付きの再現可能な画像実行 |
| **oma-market** | ペインポイント、トレンド、競合、発見調査 | フレームワーク付き LAW 準拠の調査ブリーフ |
| **oma-mobile** | Flutter、React Native、Swift iOS の作業 | モバイル画面、状態、プラットフォーム統合、テスト |
| **oma-observability** | トレース、メトリクス、ログ、プロファイル、SLO、インシデントフォレンジック | レイヤー化したオブザーバビリティの推奨または実装指針 |
| **oma-orchestration** | 自動並列エージェント実行 | 調整済みプラン、メモリ更新、結果収集 |
| **oma-pdf** | PDF 変換と OCR 対応の抽出 | 読み順、表、リスト、画像を保った Markdown |
| **oma-pm** | 要件、タスク分解、API コントラクト | `.agents/results/plan-{sessionId}.json` とタスクボード |
| **oma-qa** | セキュリティ、パフォーマンス、アクセシビリティ、品質レビュー | 重要度と修正根拠付きの指摘レポート |
| **oma-recap** | ツール横断の作業振り返り | `.agents/results/recap/` の日次または期間リキャップ |
| **oma-refactor** | 挙動を保った再構成 | 特性テストと品質根拠を伴うリファクタリング変更 |
| **oma-scholar** | 学術検索と論文サイドカー | 検証済み `.knows.yaml` サイドカーの操作 |
| **oma-scm** | Git ブランチ、ワークツリー、ベースライン、コミット規約 | SCM プランまたは Conventional Commit の出力 |
| **oma-search** | 信頼度付きのドキュメント、Web、コード、ローカル検索 | 信頼ラベル付きのルーティング済み検索結果 |
| **oma-skill-creation** | OMA スキルの作成と監査 | SSL-lite 形式のスキルファイルと `oma skill audit` の結果 |
| **oma-slide** | HTML プレゼンテーションとエクスポート | 検証済みのバンドル HTML、PDF、PNG、PPTX |
| **oma-tf-infra** | Terraform インフラ、IAM、Policy-as-Code | Terraform モジュール、プラン、統制 |
| **oma-translation** | UI、ドキュメント、マーケティングのローカライズ | 文脈を保った翻訳コンテンツ |
| **oma-video** | ショート、解説、デモ | アセットとマニフェスト付きの再現可能な動画実行 |
| **oma-voice** | ローカル TTS、STT、ボイスオーバー | マニフェスト付き音声または文字起こし成果物 |

---

## ダッシュボードのセットアップ

### ターミナルダッシュボード

```bash
oma dashboard terminal
```

ターミナルに次の情報を含むライブ更新の表を表示します。

- セッション ID と全体の状態（RUNNING / COMPLETED / FAILED）
- エージェントごとの行：状態、ターン数、最新アクティビティ、経過時間
- `.agents/state/memories/` を監視したリアルタイムの進捗

### Web ダッシュボード

```bash
oma dashboard web
# Opens http://localhost:9847
```

機能は次のとおりです。

- WebSocket によるリアルタイム更新（手動更新不要）
- 接続が切れたときの自動再接続
- 色分けされたエージェント状態（緑=完了、黄=実行中、赤=失敗）
- 進捗ファイルと結果ファイルからストリーミングするアクティビティログ
- 過去のセッションデータ

### 推奨レイアウト

3 つのターミナルを使います。

1. **ダッシュボード用ターミナル：** 継続的な監視のための `oma dashboard terminal`
2. **コマンド用ターミナル：** エージェントのスポーン、ワークフロー、その他のコマンド
3. **ビルド用ターミナル：** テスト、ビルドログ、Git 操作

---

## 主要コンセプトの解説

### Progressive disclosure

スキルはトークンを節約するために 2 層でロードされます。Layer 1（現在の 33 スキルツリーで中央値約 2,631 トークンの `SKILL.md`）はホストがスキルをルーティングしたときにコンテキストへ入り、インジェクターが渡すのは本文ではなくパスです。Layer 2（`resources/`）は難易度の階層に従い、タスクに必要なときだけ読まれます。5 エージェントのセッションで測定すると、Simple または Medium タスクは 73K の上限に対して約 18〜19K トークンのスキルコンテキストを使うため、128K コンテキストのうちおよそ 109K を実作業に使えます。Complex タスクは約 39K なので、約 89K を使えます。測定表と再現スクリプトは[トークン節約の計算](../core-concepts/skills.md#token-savings-math)を参照してください。

### トークン最適化

段階的開示に加えて、oh-my-agent は次の方法でトークンを最適化します。

- **コンテキスト予算管理：** ファイル全体を読まず、`read_file` ではなく `find_symbol` を使う
- **遅延リソースロード：** エラープレイブックはエラー時だけ、チェックリストは検証時だけ読む
- **難易度による分岐：** Simple タスクは分析を省略し、最小限のチェックリストを使う
- **進捗追跡：** エージェントが読んだファイルを記録し、再読を防ぐ

### CLI スポーン

`oma agent spawn` を実行すると CLI は次の処理を行います。

1. 明示的なオプション、エージェントのオーバーライド、モデルプリセット、設定済みのフォールバックに基づいてロールのベンダーを解決
2. `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md` からベンダー固有の実行プロトコルを注入
3. SKILL.md のコアルール、実行プロトコル、タスクに関係するリソースを使ってエージェントのプロンプトを構成
4. エージェントを独立した CLI プロセスとしてスポーン
5. `.agents/state/agent-runs/` に構造化された実行記録を保存し、申告パスを注入
6. エージェントが構造化された結果の申告を書き、人間向けの進捗と結果の Markdown は補足として保存

### プロジェクトメモリストア

エージェントは `.agents/state/memories/` の永続ファイル（古いプロジェクトでは `.serena/memories/` にフォールバック）で調整します。オーケストレータは実行単位のセッションファイルとタスクボードを作成します。Markdown の進捗または結果出力が有効な場合、各実行は `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` と `result-{agentId}-{taskId}-{runId}-{sessionId}.md` を作成します。`.agents/state/agent-runs/` の構造化された実行記録と申告が CLI スポーンの正本です。エージェントはネイティブのファイルツールでこれらのファイルを読み書きし、ツールの対応付けは `.agents/mcp.json → memoryConfig.tools` で設定できます。

### ワークスペース

<!-- oma-docs:ignore-start -->
`agent spawn` の `-w` フラグはエージェントを特定のディレクトリに分離します。これは並列実行で重要です。ワークスペース分離なしに実行すると、2 つのエージェントが同じファイルを同時に変更して競合が起こります。標準的なワークスペース構成は `./apps/api`（バックエンド）、`./apps/web`（フロントエンド）、`./apps/mobile`（モバイル）です。
<!-- oma-docs:ignore-end -->

---

## ヒント

1. **プロンプトを具体的にする。** 「JWT 認証、React フロントエンド、Express バックエンド、PostgreSQL を使う TODO アプリを作る」の方が、「アプリを作って」よりよい結果になります。
2. **並列エージェントにはワークスペースを使う。** 実行中のエージェント間の競合を防ぐため、必ず `-w ./path` を渡します。
3. **実装エージェントをスポーンする前に API コントラクトを固定する。** `/plan` を実行して、フロントエンドとバックエンドがエンドポイントの形に合意できるようにします。
4. **積極的にモニタリングする。** ダッシュボード用ターミナルを開き、すべてのエージェントが終わるまで問題を放置しないようにします。
5. **再スポーンで反復する。** エージェントの出力が不十分なら、元のタスクと修正内容を添えて再スポーンします。最初からやり直しません。
6. **タスクに合わせて調整方法を選ぶ。** 1 つのドメインなら単一スキルから始め、調整や明示的な品質プロセスが必要なら[選択ガイド](/docs/core-concepts/workflows#choosing-a-skill-or-workflow)を使います。
7. **曖昧なアイデアには `/plan` の前に `/brainstorm` を使う。** Brainstorm で意図とアプローチを整理してから、PM エージェントがタスクを分解します。
8. **新しいコードベースでは `/deepinit` を実行する。** AGENTS.md と ARCHITECTURE.md を作成し、すべてのエージェントがプロジェクト構成を理解できるようにします。
9. **`model_preset` を設定する。** `auto` から始めるか、`claude`、`antigravity`、`codex`、`qwen`、`cursor`、`kiro`、`mixed` などの固定プリセットを選びます。ローカルゲートウェイを使う場合は `free` を選び、細かい制御には `agents:` のオーバーライドを追加します。詳しくは[エージェント別モデル](./per-agent-models.md)を参照してください。
10. **完全なレビュー工程を明示的に求めるときは `/ultrawork` を使う。** 5 フェーズのワークフローで 12 個の分離レビューを行います。スキルのロードだけではこれらのチェックは実行されません。

---

## トラブルシューティング

| 問題 | 原因 | 対処 |
|---------|------|-----|
| IDE でスキルが検出されない | `.agents/skills/` がない、または `SKILL.md` ファイルがない | インストーラー（`bunx oh-my-agent@latest`）を実行し、`.claude/skills/` のシンボリックリンクを確認して IDE を再起動 |
| スポーン時に CLI が見つからない | 選択した AI CLI が未インストール、または `PATH` の外にある | `which <selected-cli>`（例：`claude`、`codex`、`agy`、`qwen`、`kiro`）を実行し、新しいシェルを開くかインストールガイドに従ってインストール |
| エージェントが競合するコードを生成する | ワークスペース分離がない | 別々のワークスペースを使う：`-w ./apps/api`、`-w ./apps/web` |
| ダッシュボードに「No agents detected」と表示される | エージェントがまだメモリへ書き込んでいない | エージェントの開始を待つ（最初の書き込みはターン 1）か、セッション ID が一致することを確認 |
| Web ダッシュボードが起動しない | 依存関係が未インストール | web/ ディレクトリで `bun install` を実行 |
| QA レポートに 50 件以上の問題がある | 大きなコードベースの初回レビューでは通常の結果 | まず CRITICAL と HIGH に集中し、MEDIUM / LOW は次のスプリントに記録 |
| 自動検出が誤ったワークフローを起動する | キーワードが曖昧 | 自然言語ではなく明示的な `/command` を使い、誤検出を改善用に報告 |
| 永続ワークフローを停止できない | 状態ファイルが残っている | チャットで「workflow done」と言うか、`.agents/state/` から状態ファイルを手動で削除 |
| エージェントが HIGH の明確化で停止する | 要件が曖昧すぎる | エージェントが求めた具体的な回答を示し、再実行 |
| MCP ツールが動かない | Serena が設定されていない、または起動していない | `oma doctor` を実行して MCP 設定を確認 |
| エージェントが実行予算を超える | 1 回の実行にはタスクが複雑すぎる | タスクを分解し、明確な境界を持つワークフローを使うか、より狭い受入契約で再試行 |
| エージェントに誤った CLI が使われる | `model_preset` が未設定、またはエージェントのオーバーライドがない | `oma install` を実行して設定するか、`oma-config.yaml` で `model_preset` を設定。詳しくは[エージェント別モデル](../guide/per-agent-models.md)を参照 |

---

単一ドメインのタスクパターンは[単一スキルガイド](./single-skill.md)を、プロジェクト統合の詳細は[統合ガイド](./integration.md)を参照してください。
