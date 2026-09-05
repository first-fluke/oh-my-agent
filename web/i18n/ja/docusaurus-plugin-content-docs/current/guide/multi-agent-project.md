---
title: "ガイド：マルチエージェントプロジェクト"
description: フロントエンド、バックエンド、データベース、モバイル、QAにまたがる複数ドメインエージェントの協調ガイド。計画からマージまでをカバーします。
---

# ガイド：マルチエージェントプロジェクト

## マルチエージェント協調を使うべきとき

機能が複数ドメインにまたがる場合に使用します（バックエンドAPI + フロントエンドUI + データベーススキーマ + モバイルクライアント + QAレビューなど）。単一エージェントではフルスコープを処理できず、ドメインが互いのファイルを踏まずに並列進行する必要がある場合に最適です。

タスクが完全に1つのドメインに収まる場合は、特定のエージェントを直接使用してください。

---

## 全体の流れ：/plan から /review まで

### Step 1（/plan）: 要件とタスク分解

```
/plan
```

1. **要件収集**: ターゲットユーザー、コア機能、制約、デプロイ先
2. **技術的実現可能性分析**: MCP分析ツールで既存コードベースをスキャン
3. **APIコントラクト定義**: `.agents/skills/_shared/core/api-contracts/`に保存
4. **タスク分解**: エージェント、タイトル、受入基準、優先度、依存関係
5. **ユーザーレビュー**: 承認なしでは進行しない
6. **プラン保存**: `.agents/results/plan-{sessionId}.json`

### Step 2（/work または /orchestrate）: 実行

| 側面 | /work | /orchestrate |
|:-------|:-----------|:-------------|
| **対話** | インタラクティブ（各段階でユーザー確認） | 自動（完了まで実行） |
| **PM計画** | 内蔵 | planが必要 |
| **永続モード** | はい | はい |
| **最適な用途** | 初回使用、監視が必要な複雑プロジェクト | 繰り返し実行、明確なタスク |

#### /work: インタラクティブなマルチエージェントパイプライン

`/work`はステップバイステップで進行し、各ゲートでユーザー確認を求めます。組み込みのPM計画フェーズがあり、別途`/plan`を呼ばなくても要件分解から始められます。複雑なプロジェクトを観察しながら進めたい場合に適しています。

#### /orchestrate: 自動並列実行

`/orchestrate`は事前の`/plan`成果物（`.agents/results/plan-{sessionId}.json`）が必要です。優先度ティアごとにエージェントを並列スポーンし、検証ループまで含めて自動的に完了まで走ります。タスクが明確で、繰り返し可能な場合に最適です。

### Step 3（agent:spawn）: CLIレベルのエージェント管理

```bash
oma agent spawn backend "Implement user auth API with JWT" session-20260324-143000 -w ./api
```

**ベンダー解決順序：** `--vendor`フラグ > `oma-config.yaml`の`agents:`オーバーライド > アクティブな`model_preset`のエージェントデフォルト

**ワークスペース自動検出：** モノレポ設定ファイル（pnpm-workspace.yaml、package.json、lerna.json、nx.json、turbo.json、mise.toml）をスキャンし、エージェントタイプのキーワードでスコアリング。

### Step 4（/review）: QA検証

OWASP Top 10セキュリティ、パフォーマンス、アクセシビリティ（WCAG 2.1 AA）、コード品質のフルパイプライン。`--fix`オプションで修正-検証ループ（最大3回）。

---

## セッションID戦略

形式：`session-YYYYMMDD-HHMMSS`。メモリファイル、PIDファイル、ログファイル、結果のグループ化に使用。

---

## ワークスペース割り当て

### 自動検出

| エージェントタイプ | キーワード（優先順） |
|:-----------|:---------------------------|
| frontend | web, frontend, client, ui, app, dashboard |
| backend | api, backend, server, service, gateway |
| mobile | mobile, ios, android, native, rn, expo |

### フォールバック候補

- **frontend：** `apps/web`、`apps/frontend`、`frontend`、`web`
- **backend：** `apps/api`、`apps/backend`、`backend`、`api`
- **mobile：** `apps/mobile`、`mobile`、`app`

### 明示的オーバーライド

`-w`フラグでワークスペースを直接指定できます。自動検出を信頼できない場合や、モノレポ外のディレクトリにルーティングしたい場合に使います。

```bash
oma agent spawn backend "task" session-01 -w ./services/api
oma agent spawn frontend "task" session-01 -w ./packages/web-app
```

`-w`が指定された場合、自動検出はスキップされます。

---

## コントラクトファーストルール

APIコントラクトはエージェント間の同期メカニズムです：
1. **実装前にコントラクトを定義**
2. **各エージェントが関連コントラクトをコンテキストとして受信**
3. **コントラクトがインターフェース境界を定義**（メソッド、パス、スキーマ、認証、エラー形式）
4. **モニタリング中にコントラクト違反を検出**
5. **QAレビューでコントラクト準拠を確認**

---

## マージゲート：4つの条件

### 1. ビルド成功

全コードがエラーなしでコンパイルされること。CIで確認可能なように、コミット時点で`bun run build`（またはプロジェクト相当）が緑になっている必要があります。

### 2. テストパス

既存テストが引き続き通過し、新規追加分も通過すること。フレームワーク（Vitest、Jest、pytest、`flutter test`など）を問わず、サブエージェントは触れた領域のテストを更新します。

### 3. 計画ファイルのみ変更

スコープ外の変更がないこと。プランに記載されたファイル以外の差分が出た場合はQAでフラグされ、再スポーンの対象になります。

### 4. QAレビュークリア

CRITICALとHIGHの指摘がゼロであること。MEDIUM/LOWはバックログ化可能ですが、CRITICAL/HIGHはマージ前に必ず解消してください。

---

## スポーン例

### 単一エージェントのスポーン

```bash
# Geminiでバックエンドエージェントをスポーン（デフォルト）
oma agent spawn backend "Implement /api/tasks CRUD" session-01 -w ./apps/api

# 明示的なワークスペース指定でClaudeを使ってフロントエンドエージェントを起動
oma agent spawn frontend "Build tasks dashboard" session-01 -w ./apps/web --vendor claude

# プロンプトファイルから起動
oma agent spawn backend --prompt-file ./prompts/auth.md session-01 -w ./apps/api
```

### agent:parallelによる並列実行

```bash
oma agent parallel ./tasks.yaml --session-id session-01
```

```yaml
# tasks.yaml
- agent: backend
  task: "Implement /api/tasks CRUD with JWT auth"
  workspace: ./apps/api
- agent: frontend
  task: "Build tasks dashboard with React Query"
  workspace: ./apps/web
- agent: mobile
  task: "Build tasks screen with Riverpod"
  workspace: ./apps/mobile
```

`--no-wait`を付ければ即座に戻り、結果は`.agents/results/parallel-{timestamp}/`に書き出されます。

---

## アンチパターン

### 1. 計画のスキップ

`/orchestrate`に`/plan`なしは拒否されます。要件が定義されていない並列実行は競合の温床です。

### 2. ワークスペースの重複

同ディレクトリに2エージェントを当てるとファイル競合します。`-w`で明示的に分離してください。

### 3. APIコントラクト未定義

両エージェントが推測でデータ形を決めると、ほぼ確実に互換性のない形式になります。`/plan`段階でコントラクトを保存してから実装してください。

### 4. QA指摘の無視

CRITICAL/HIGHは本番で発覚するバグです。修正してからマージしてください。

### 5. 手動ファイル協調

各エージェントの出力を手動でマージし始めると、必ず統合バグが発生します。自動パイプライン（`/work`、`/orchestrate`）の方が確実です。

### 6. 過剰並列化

P0完了前にP1を起動しないでください。優先度ティアは依存関係の表現でもあります。

### 7. 検証のスキップ

ビルド失敗やスコープ違反を次のフェーズに伝播させない。`oma verify`でビルド/テスト/スコープ/シークレットを通してから次に進みます。

---

## クロスドメイン統合検証

1. **APIコントラクト整合性**: バックエンド実装がフロントエンド/モバイルのコントラクトに一致
2. **型の一貫性**: TypeScript型、Pythonデータクラス、Dartモデルのフィールド名一致
3. **認証フロー**: JWT送信、トークン保存、リフレッシュの整合性
4. **エラーハンドリング**: 全クライアントが文書化されたエラー形式を処理
5. **データベーススキーマ整合性**: ORMモデルとスキーマの一致

---

## 完了条件

- すべてのエージェントが全優先度ティアで正常完了
- 検証スクリプトがすべてパス
- QAレビューでCRITICALとHIGHがゼロ
- クロスドメインAPIコントラクト整合性が確認済み
- ビルド成功・テストパス
- 最終レポートがメモリに記録
- ユーザーの最終承認
