---
title: 並列実行
description: oh-my-agentの複数エージェント同時実行完全ガイド — agent:spawnの構文と全オプション、agent:parallelインラインモード、ワークスペース対応パターン、マルチCLI設定、ベンダー解決優先度、ダッシュボードモニタリング、セッションID戦略、避けるべきアンチパターン。
---

# 並列実行

oh-my-agentの核心的な利点は、複数の専門エージェントを同時に実行できることです。バックエンドエージェントがAPIを実装している間に、フロントエンドエージェントがUIを作成し、モバイルエージェントがアプリ画面を構築します。すべて共有メモリを通じて協調されます。

---

## agent:spawn — 単一エージェントのスポーン

### 基本構文

```bash
oma agent:spawn <agent-id> <prompt> <session-id> [options]
```

### パラメータ

| パラメータ | 必須 | 説明 |
|-----------|----------|-------------|
| `agent-id` | はい | エージェント識別子：`backend`、`frontend`、`mobile`、`db`、`pm`、`qa`、`debug`、`design`、`tf-infra`、`dev-workflow`、`translator`、`orchestrator`、`commit` |
| `prompt` | はい | タスク説明（引用符付き文字列またはプロンプトファイルのパス） |
| `session-id` | はい | 同じ機能で作業するエージェントをグループ化。形式：`session-YYYYMMDD-HHMMSS`または任意の一意文字列。 |

### オプション

| フラグ | 短縮形 | 説明 |
|------|-------|-------------|
| `--workspace <path>` | `-w` | エージェントの作業ディレクトリ。このディレクトリ内のファイルのみ変更。 |
| `--model <name>` | `-m` | CLIベンダーオーバーライド。選択肢：`gemini`、`claude`、`codex`、`qwen`。 |
| `--max-turns <n>` | `-t` | デフォルトターン制限をオーバーライド。 |
| `--json` | | 結果をJSONで出力。 |
| `--no-wait` | | 完了を待たずに即座にリターン。 |

### 使用例

```bash
# デフォルトベンダーでバックエンドエージェントをスポーン
oma agent:spawn backend "Implement JWT authentication API with refresh tokens" session-01

# ワークスペース分離付き
oma agent:spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# ベンダーオーバーライド
oma agent:spawn frontend "Build login form" session-01 -m claude -w ./apps/web

# 高いターン制限
oma agent:spawn backend "Implement payment gateway integration" session-01 -t 30

# プロンプトファイルを使用
oma agent:spawn backend ./prompts/auth-api.md session-01 -w ./apps/api
```

---

## バックグラウンドプロセスによる並列スポーン

```bash
# 3つのエージェントを並列でスポーン
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent:spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # すべてのエージェントが完了するまでブロック
```

### ワークスペース対応パターン

並列実行時は常に個別のワークスペースを割り当てて、ファイル競合を防止します：

```bash
oma agent:spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent:spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent:spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# 実装後にQAを実行（順次）
oma agent:spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent:parallel — インライン並列モード

```bash
oma agent:parallel -i <agent1>:<prompt1> <agent2>:<prompt2> [options]
```

```bash
# 基本的な並列実行
oma agent:parallel -i backend:"Implement auth API" frontend:"Build login form" mobile:"Auth screens"

# no-wait付き
oma agent:parallel -i backend:"Auth API" frontend:"Login form" --no-wait

# すべてのエージェントが同じセッションを自動共有
oma agent:parallel -i \
  backend:"JWT auth with refresh tokens" \
  frontend:"Login form with email validation" \
  db:"User schema with soft delete and audit trail"
```

---

## マルチCLI設定

```yaml
# .agents/oma-config.yaml
language: en
date_format: "YYYY-MM-DD"
timezone: "Asia/Seoul"
default_cli: gemini

agent_cli_mapping:
  frontend: claude       # 複雑なUI推論
  backend: gemini        # 高速APIスキャフォールディング
  mobile: gemini         # 高速Flutterコード生成
  db: gemini             # 迅速なスキーマ設計
  pm: gemini             # 迅速なタスク分解
  qa: claude             # 徹底的なセキュリティレビュー
  debug: claude          # 深い根本原因分析
  design: claude         # 繊細なデザイン判断
  tf-infra: gemini       # HCL生成
  dev-workflow: gemini   # タスクランナー設定
  translator: claude     # 文化的感受性を伴う翻訳
  orchestrator: gemini   # 高速協調
  commit: gemini         # コミットメッセージ生成
```

### ベンダー解決の優先順位

| 優先度 | ソース | 例 |
|----------|--------|---------|
| 1（最高） | `--model`フラグ | `oma agent:spawn backend "task" session-01 -m claude` |
| 2 | `agent_cli_mapping` | oma-config.yamlの設定 |
| 3 | `default_cli` | oma-config.yamlの設定 |
| 4 | `active_vendor` | レガシー`cli-config.yaml` |
| 5（最低） | ハードコード | `gemini` |

---

## ベンダー固有のスポーン方法

| ベンダー | スポーン方法 | 結果処理 |
|--------|----------------------|-----------------|
| **Claude Code** | `Agent` tool。同一メッセージ内の複数呼び出し = 真の並列。 | 同期リターン |
| **Codex CLI** | モデル仲介並列サブエージェントリクエスト | JSON出力 |
| **Gemini CLI** | `oh-my-ag agent:spawn` CLIコマンド | MCPメモリポーリング |
| **Antigravity IDE** | `oh-my-ag agent:spawn`のみ | MCPメモリポーリング |
| **CLIフォールバック** | `oh-my-ag agent:spawn {agent} {prompt} {session} -w {workspace}` | 結果ファイルポーリング |

---

## エージェントのモニタリング

### ターミナルダッシュボード

```bash
oma dashboard
```

ライブテーブル表示：セッションID、エージェントごとのステータス、ターン数、最新アクティビティ、経過時間。

### Webダッシュボード

```bash
oma dashboard:web
# http://localhost:9847
```

WebSocketリアルタイム更新、自動再接続、色分けステータス、アクティビティログストリーミング。

### 推奨ターミナルレイアウト

```
┌─────────────────────────┬──────────────────────┐
│   ターミナル1:          │   ターミナル2:       │
│   oma dashboard         │   エージェントスポーン│
├─────────────────────────┴──────────────────────┤
│   ターミナル3: テスト/ビルドログ、Git操作       │
└────────────────────────────────────────────────┘
```

---

## セッションID戦略

- **機能ごとに1セッション：** 同じ機能のすべてのエージェントがIDを共有
- **説明的なID：** `session-auth-01`、`session-payment-v2`
- **自動生成：** オーケストレータは`session-YYYYMMDD-HHMMSS`形式を使用
- **反復に再利用可能：** 再スポーン時も同じセッションIDを使用

---

## 並列実行のヒント

### すべきこと

1. **まずAPIコントラクトを確定。** `/plan`を実行してエンドポイントの合意を得る。
2. **機能ごとに1セッションID。**
3. **個別ワークスペースを割り当て。** 常に`-w`でエージェントを分離。
4. **積極的にモニタリング。** ダッシュボードで問題を早期発見。
5. **QAは実装後に実行。** すべての実装完了後にQAを順次スポーン。
6. **再スポーンで反復。** 新セッションではなく同じセッションIDで修正。
7. **不安な場合は`/work`から。**

### すべきでないこと

1. **同じワークスペースにエージェントをスポーンしない。** マージコンフリクト発生。
2. **MAX_PARALLEL（デフォルト3）を超えない。**
3. **計画ステップをスキップしない。** 実装の不整合を防ぐ。
4. **失敗したエージェントを無視しない。**
5. **関連作業でセッションIDを混在させない。**

---

## エンドツーエンドの例

```bash
# Step 1: 機能を計画（AI IDEで/planを実行）

# Step 2: 実装エージェントを並列でスポーン
oma agent:spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints." session-auth-01 -w ./apps/api &
oma agent:spawn frontend "Build login and registration forms with email validation." session-auth-01 -w ./apps/web &
oma agent:spawn mobile "Create auth screens with biometric login support." session-auth-01 -w ./apps/mobile &

# Step 3: 別ターミナルでモニタリング
oma dashboard

# Step 4: 全実装エージェントを待機
wait

# Step 5: QAレビュー
oma agent:spawn qa "Review all auth implementations for OWASP Top 10." session-auth-01

# Step 6: QA課題があれば修正を再スポーン
oma agent:spawn backend "Fix: QA found missing rate limiting." session-auth-01 -w ./apps/api

# Step 7: 修正検証のためQA再実行
oma agent:spawn qa "Re-review backend auth after fixes." session-auth-01
```
