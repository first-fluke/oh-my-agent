---
title: 使い方ガイド
description: oh-my-agentの包括的な使い方ガイド — クイックスタート、単一タスクからマルチドメインプロジェクト、バグ修正、デザインシステム、CLI並列実行、ultraworkまでの実践例。全ワークフローコマンド、複数言語での自動検出例、全14スキルのユースケース、ダッシュボードセットアップ、主要概念、ヒント、トラブルシューティング。
---

# oh-my-agentの使い方

## クイックスタート

1. AI搭載IDE（Claude Code、Gemini CLI、Cursor、Antigravityなど）でプロジェクトを開く
2. スキルは`.agents/skills/`から自動検出される
3. 自然言語でやりたいことを記述 — oh-my-agentが適切なエージェントにルーティング
4. マルチエージェント作業には`/work`または`/orchestrate`を使用

これがワークフロー全体です。単一ドメインのタスクには特別な構文は不要です。

---

## 例1：シンプルな単一タスク

**入力：**
```
メール・パスワードフィールド、クライアントサイドバリデーション、アクセシブルなラベル付きのログインフォームコンポーネントをTailwind CSSで作成して
```

**何が起こるか：**

1. `oma-frontend`スキルが自動アクティベート（キーワード：「form」「component」「Tailwind CSS」）
2. レイヤー1（SKILL.md）がロード済み
3. レイヤー2リソースがオンデマンドロード：`execution-protocol.md`、`snippets.md`、`component-template.tsx`
4. エージェントが**CHARTER_CHECK**を出力
5. エージェントが実装：Reactコンポーネント、Zodバリデーションスキーマ、Vitestテスト、Loading Skeleton
6. チェックリスト実行：アクセシビリティ、モバイルビューポート、パフォーマンス、Error Boundaries

**出力：** TypeScript、バリデーション、テスト、アクセシビリティ対応のプロダクション対応Reactコンポーネント。

---

## 例2：マルチドメインプロジェクト

**入力：**
```
ユーザー認証、タスクCRUD、モバイルコンパニオンアプリ付きのTODOアプリを作成
```

**`/work`を使用（ステップバイステップ）：**

1. **PMエージェントが計画：** ドメイン特定、APIコントラクト定義、優先タスク分解
2. **プランを確認**
3. **エージェントが優先度順にスポーン：** P0（バックエンド並列）→ P1（フロントエンド + モバイル並列）
4. **QAエージェントがレビュー：** OWASP Top 10、パフォーマンス、アクセシビリティ、クロスドメイン整合性
5. **CRITICAL課題があれば反復**

---

## 例3：バグ修正

**入力：**
```
バグがある — 保存ボタンをクリックするとタスクリストで"Cannot read property 'map' of undefined"が表示される
```

1. `oma-debug`が自動アクティベート
2. MCP `search_for_pattern`で`.map()`呼び出しを特定
3. `find_referencing_symbols`でデータフローをトレース → ローディング状態の欠如が根本原因
4. 最小修正を提案（ユーザー確認待ち）
5. 修正適用 + 回帰テスト作成
6. 類似パターンスキャン → 3つの同様パターンを発見し修正

---

## 例4：デザインシステム

**入力：**
```
B2B SaaS分析製品のダークプレミアムランディングページをデザインして
```

1. `oma-design`がアクティベート
2. コンテキスト収集 → プロンプト補強 → 3つのデザイン方向性を提案
3. 選択された方向性でDESIGN.md + CSSトークン + Tailwind設定を生成
4. レスポンシブ、WCAG 2.2、Nielsen、AIスロップチェックで監査

---

## 例5：CLI並列実行

```bash
# 単一エージェント
oma agent:spawn frontend "Add dark mode toggle to the header" session-ui-01

# 3エージェント並列
oma agent:spawn backend "Implement notification API with WebSocket" session-notif-01 -w ./apps/api &
oma agent:spawn frontend "Build notification center with real-time updates" session-notif-01 -w ./apps/web &
oma agent:spawn mobile "Add push notification screens" session-notif-01 -w ./apps/mobile &
wait

# モニタリング（別ターミナル）
oma dashboard

# QA
oma agent:spawn qa "Review notification feature across all platforms" session-notif-01
```

---

## 例6：Ultrawork — 最高品質

```
/ultrawork Stripe統合の決済処理モジュールを構築
```

5フェーズ、17ステップ、11レビューステップで実行：PLAN（4レビュー）→ IMPL → VERIFY（3レビュー）→ REFINE（5レビュー）→ SHIP（4レビュー）

---

## 全ワークフローコマンド

| コマンド | 種別 | 内容 | 使用場面 |
|---------|------|-------------|-------------|
| `/orchestrate` | 永続 | 自動並列エージェント実行 | 最大並列処理の大規模プロジェクト |
| `/work` | 永続 | ステップバイステップ協調 | ユーザー制御が必要なマルチエージェント機能 |
| `/ultrawork` | 永続 | 5フェーズ・17ステップ品質ワークフロー | 最高品質デリバリー |
| `/plan` | 非永続 | PMタスク分解 | 複雑なマルチエージェント作業の前 |
| `/exec-plan` | 非永続 | 実行プランの作成・追跡 | 追跡が必要な複雑機能 |
| `/brainstorm` | 非永続 | デザインファーストアイデア出し | 実装アプローチ決定前 |
| `/deepinit` | 非永続 | プロジェクト初期化 | 既存コードベースでのoh-my-agentセットアップ |
| `/review` | 非永続 | QAパイプライン | マージ前、デプロイ前レビュー |
| `/debug` | 非永続 | 構造化デバッグ | バグやエラーの調査 |
| `/design` | 非永続 | 7フェーズデザインワークフロー | デザインシステム構築 |
| `/commit` | 非永続 | Conventional Commit | コード変更完了後 |
| `/tools` | 非永続 | MCPツール管理 | ツール可視性制御 |
| `/stack-set` | 非永続 | 技術スタック検出 | 言語固有コーディング規約のセットアップ |

---

## 自動検出の例

| 入力 | 検出ワークフロー | 言語 |
|----------|------------------|----------|
| "plan the authentication feature" | `/plan` | 英語 |
| "do everything in parallel" | `/orchestrate` | 英語 |
| "計画を立てて" | `/plan` | 日本語 |
| "コードレビューして" | `/review` | 日本語 |
| "デバッグして" | `/debug` | 日本語 |
| "デザインシステムを作って" | `/design` | 日本語 |

**情報的クエリはフィルタリング：** 「orchestrateとは？」→ ワークフロー非トリガー。

---

## 全14スキル — クイックリファレンス

| スキル | 最適な用途 | 主な出力 |
|-------|---------|---------------|
| **oma-brainstorm** | アイデア探索 | `docs/plans/`の設計ドキュメント |
| **oma-pm** | タスク分解 | `.agents/plan.json` |
| **oma-frontend** | UIコンポーネント | React/TypeScriptコンポーネント、テスト |
| **oma-backend** | API、サーバーロジック | エンドポイント、モデル、サービス、テスト |
| **oma-db** | スキーマ設計 | スキーマドキュメント、マイグレーション |
| **oma-mobile** | モバイルアプリ | Flutterスクリーン、状態管理 |
| **oma-design** | デザインシステム | DESIGN.md、CSS/Tailwindトークン |
| **oma-qa** | セキュリティ・品質監査 | CRITICAL/HIGH/MEDIUM/LOW指摘のQAレポート |
| **oma-debug** | バグ調査 | 修正コード + 回帰テスト + 類似パターン修正 |
| **oma-tf-infra** | クラウドインフラ | Terraformモジュール、IAMポリシー |
| **oma-dev-workflow** | CI/CD、モノレポタスク | mise.toml設定、パイプライン定義 |
| **oma-translator** | 多言語コンテンツ | トーン・レジスター保持の翻訳テキスト |
| **oma-orchestrator** | 自動並列エージェント実行 | 複数エージェントのオーケストレーション結果 |
| **oma-commit** | Gitコミット | 適切なtype/scopeのConventional Commits |

---

## ヒント

1. **プロンプトは具体的に。** 「JWTとReactフロントエンドのTODOアプリ」は「アプリを作って」より良い結果。
2. **並列エージェントにはワークスペースを使用。** 常に`-w`を渡してファイル競合を防止。
3. **実装前にAPIコントラクトを確定。** `/plan`を先に実行。
4. **積極的にモニタリング。** ダッシュボードで失敗を早期発見。
5. **再スポーンで反復。** 最初からやり直さず、修正コンテキストを追加して再スポーン。
6. **不安な場合は`/work`から。**
7. **曖昧なアイデアには`/brainstorm`を`/plan`の前に。**
8. **新コードベースには`/deepinit`を実行。**
9. **エージェント-CLIマッピングを設定。** 複雑な推論をClaudeに、高速生成をGeminiに。
10. **本番クリティカルなコードには`/ultrawork`。**

---

## トラブルシューティング

| 問題 | 原因 | 修正 |
|---------|-------|-----|
| IDEでスキルが検出されない | `.agents/skills/`の欠如 | インストーラーを実行、シンボリックリンクを確認、IDEを再起動 |
| スポーン時にCLIが見つからない | AI CLIが未インストール | `which gemini` / `which claude`で確認、インストールガイドに従う |
| エージェントのコードが競合 | ワークスペース分離なし | 個別ワークスペースを使用：`-w ./apps/api`、`-w ./apps/web` |
| ダッシュボードに「エージェント未検出」 | エージェントがまだメモリに書き込んでいない | エージェント開始を待つ、セッションIDを確認 |
| QAレポートが50+件の指摘 | 大規模コードベースの初回レビュー | CRITICALとHIGHに集中、MEDIUM/LOWは次スプリント |
| 自動検出が誤ったワークフローをトリガー | キーワードの曖昧さ | 明示的`/command`を使用 |
| 永続ワークフローが停止しない | 状態ファイルが残存 | 「workflow done」と発言、または`.agents/state/`から状態ファイルを手動削除 |
| エージェントがHIGH明確化でブロック | 要件が曖昧すぎる | エージェントが要求した回答を提供して再実行 |
| MCPツールが動作しない | Serena未設定 | `oma doctor`でMCP設定を確認 |
| エージェントがターン制限を超過 | タスクが複雑すぎる | `-t 30`フラグで増やすか、小さいタスクに分解 |

---

単一ドメインタスクパターンは[単一スキルガイド](./single-skill)を参照。
プロジェクト統合の詳細は[統合ガイド](./integration)を参照。
