---
title: 並列実行
description: 現行の CLI 構文、タスクファイル、インラインモード、ワークスペース分離、モデルとベンダーの解決、モニタリング、セッション ID、復旧パターンを使って OMA のディスパッチロールを並列実行する方法を説明します。
---

# 並列実行

oh-my-agent の大きな利点は、複数の専門エージェントを同時に実行できることです。バックエンドエージェントが API を実装している間に、フロントエンドエージェントが UI を作り、モバイルエージェントがアプリ画面を構築します。オーケストレータは、永続化された実行状態と実行記録を使って各エージェントを調整します。

---

## agent:spawn: 単一エージェントのスポーン

### 基本構文

```bash
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

### パラメータ

| パラメータ | 必須 | 説明 |
|-----------|----------|-------------|
| `agent-id` | Yes | 正規のディスパッチロール：`orchestrator`、`architecture`、`qa`、`pm`、`backend`、`frontend`、`mobile`、`db`、`debug`、`refactor`、`docs`、`tf-infra`、`explore` |
| `prompt` | Yes | タスクの説明（引用符で囲んだ文字列またはプロンプトファイルのパス） |
| `session-id` | Yes | 同じ機能に取り組むエージェントをグループ化します。形式は `session-YYYYMMDD-HHMMSS` または任意の一意な文字列です。 |
| `options` | No | 下のオプション表を参照してください。 |

### オプション

| フラグ | 短縮形 | 説明 |
|------|-------|-------------|
| `--workspace <path>` | `-w` | エージェントの作業ディレクトリです。エージェントが変更できるのはこのディレクトリ内のファイルだけです。 |
| `--model <vendor>` | `-m` | このスポーンに使う CLI ベンダーを上書きします（`antigravity`、`claude`、`codex`、`cursor`、`opencode`、`qwen`、`grok`、`pi`）。 |
| `--resumed-from <run-id>` | | 直前の実行に基づく証拠チェーンへリトライをリンクします。 |
| `--fallback-vendors <vendors>` | | プライマリが実行できない場合に使う、順序付きのカンマ区切りベンダーフォールバックです。 |
| `--task-id <id>` | | セッションプランのタスク ID にスポーンを関連付けます。 |
| `--isolation <mode>` | | `worktree` を指定すると、一時 OMA ワークツリー領域に新しい Git ワークツリーを作成します。レビューやマージ、破棄のためにワークツリーは残ります。 |
| `--read-only` | | スポーンしたエージェントを非破壊ツールに制限します。 |

### 使用例

```bash
# Spawn a backend agent with default vendor
oma agent spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Spawn with workspace isolation
oma agent spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Override the CLI vendor for this specific spawn
oma agent spawn frontend "Build login form" session-01 --vendor claude -w ./apps/web

# Retry a run while preserving its evidence chain
oma agent spawn backend "Fix the payment gateway issue" session-01 --resumed-from run-123

# Use a prompt file instead of inline text
oma agent spawn backend ./prompts/auth-api.md session-01 -w ./apps/api

# Run inside an isolated git worktree (hypothesis spawn pattern)
oma agent spawn backend "Try a Drizzle-based rewrite" session-01 --isolation worktree
```

---

## バックグラウンドプロセスによる並列スポーン

複数のエージェントを同時に実行するには、シェルのバックグラウンドプロセスを使います。

```bash
# Spawn 3 agents in parallel
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Block until all agents complete
```

`&` は各エージェントをバックグラウンドで実行します。`wait` はすべてのバックグラウンドプロセスが完了するまで待機します。

### ワークスペース対応パターン {#workspace-aware-pattern}

並列実行では、ファイル競合を防ぐために必ず別々のワークスペースを割り当てます。

```bash
# Full-stack parallel execution
oma agent spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# After implementation, run QA (sequential; depends on implementation)
oma agent spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent:parallel: インライン並列モード

バックグラウンドプロセスの管理を自動化する、より簡潔な構文です。

### 構文

```bash
oma agent parallel --inline "<agent1>:<prompt1>" "<agent2>:<prompt2>" [options]
```

### 使用例

```bash
# Basic parallel execution
oma agent parallel --inline \
  "backend:Implement auth API" \
  "frontend:Build login form" \
  "mobile:Auth screens"

# With no-wait (fire and forget)
oma agent parallel --inline "backend:Auth API" "frontend:Login form" --no-wait

# All agents share the same session automatically
oma agent parallel --inline \
  "backend:JWT auth with refresh tokens" \
  "frontend:Login form with email validation" \
  "db:User schema with soft delete and audit trail" \
  --session session-auth-01
```

`--inline` フラグは各 `agent:task` 引数を解析します。タスクに専用ワークスペースが必要な場合は、3 番目のコロン区切り値として `agent:task:workspace` を追加します。`--inline` を付けない場合は、`{tasks: [{id?, agent, task, workspace?}]}` の YAML タスクファイルを渡します。`--session` は並列結果を既存のセッションに関連付けます。

---

## マルチ CLI 設定

oh-my-agent は `.agents/oma-config.yaml` の `model_preset` に従って、各エージェントを適切な CLI にルーティングします。利用するベンダーの組み込みプリセットを選び、必要に応じて個別のエージェントを上書きします。

### 設定例

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed   # mixed: Claude for coordination, Codex for implementation/explore

# Override specific agents on top of the preset
agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }
  backend:  { model: openai/gpt-5.5, effort: high }
```

組み込みプリセットは `auto`、`free`、`antigravity`、`claude`、`codex`、`qwen`、`cursor`、`kiro`、`mixed` です。詳しくは [エージェント別モデル](../guide/per-agent-models.md) を参照してください。

### ベンダー解決

`oma agent spawn` が使用する CLI を決めるときは、次の優先順位で確認します。

| 優先度 | ソース | 例 |
|----------|--------|---------|
| 1（最高） | `--vendor` フラグ | `oma agent spawn backend "task" session-01 --vendor claude` |
| 2 | `oma-config.yaml` の `agents:` オーバーライド | `agents: { backend: { model: openai/gpt-5.5 } }` |
| 3 | 有効な `model_preset` のエージェントデフォルト | エージェントロールのプリセット検索 |

`--vendor` フラグが常に優先されます。フラグがない場合は、`agents:` のオーバーライド、プリセットのデフォルト、設定済みのフォールバック CLI の順に確認します。`model_preset: auto` では、現在のランタイムのネイティブ設定がモデルを決めます。

---

## ベンダー固有のスポーン方法

スポーン方法は IDE や CLI によって異なります。

| ベンダー | エージェントのスポーン方法 | 結果の処理 |
|--------|----------------------|-----------------|
| **Claude Code** | 同じベンダーのタスクでは `.claude/agents/{name}.md` を使う Agent ツール、異なるベンダーでは `oma agent spawn` にフォールバックします。 | 同期リターン |
| **Codex CLI** | 同じベンダーのタスクでは `.codex/agents/{name}.toml` のネイティブカスタムエージェント、異なるベンダーでは `oma agent spawn` にフォールバックします。 | JSON 出力 |
| **Antigravity CLI/IDE** | `agy` ランタイム経由で `oma agent spawn` を使います。ネイティブサブエージェントは不要です。 | 永続化された実行記録と結果ファイルのポーリング |
| **Cursor** | 利用可能な場合は生成済みの Cursor 統合を使い、それ以外は `oma agent spawn` を使います。 | 結果ファイルのポーリング |
| **OpenCode / pi** | 選択されている場合はインプロセス拡張ブリッジを使い、異なるベンダーの作業では `oma agent spawn` を使います。 | 結果ファイルのポーリング |
| **CLI フォールバック** | `oma agent spawn {agent} {prompt} {session} -w {workspace}` | 証拠に基づく結果のポーリング |

Claude Code 内で実行する場合、ワークフローは `Agent` ツールを直接使います。

```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

同じメッセージ内の複数の Agent ツール呼び出しは、順番を待たずに真の並列として実行されます。

ベンダーが異なっても同じディスパッチ規則を使います。

1. `.agents/oma-config.yaml` から `target_vendor_for_agent` を解決します。
2. 現在のランタイムベンダーと一致する場合は、そのベンダーのネイティブエージェントファイルを使います。
3. 一致しない場合だけ、そのエージェントに `oma agent spawn` を使います。

---

## エージェントのモニタリング

### ターミナルダッシュボード

```bash
oma dashboard terminal
```

次の情報を含むライブテーブルを表示します。

- セッション ID と全体の状態
- エージェントごとの状態（running、completed、failed）
- ターン数
- 進捗ファイルから取得した最新アクティビティ
- 経過時間

ダッシュボードは `.agents/state/memories/` を監視し、エージェントが進捗を書き込むと更新します。

### Web ダッシュボード

```bash
oma dashboard web
# Opens http://localhost:9847
```

機能は次のとおりです。

- WebSocket によるリアルタイム更新
- 接続が切れたときの自動再接続
- 色分けされたエージェント状態
- 進捗ファイルと結果ファイルからのアクティビティログストリーミング
- セッション履歴

### 推奨ターミナルレイアウト

最適な可視性を得るには、3 つのターミナルを使います。

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│   Terminal 1:           │   Terminal 2:        │
│   oma dashboard terminal         │   Agent spawn        │
│   (live monitoring)     │   commands           │
│                         │                      │
├─────────────────────────┴──────────────────────┤
│                                                │
│   Terminal 3:                                  │
│   Test/build logs, git operations              │
│                                                │
└────────────────────────────────────────────────┘
```

### 個別エージェントの状態確認

```bash
oma agent status <session-id> <agent-id>
```

特定エージェントの現在の状態（running、completed、failed）、ターン数、最後のアクティビティを返します。

---

## セッション ID 戦略

セッション ID は、同じ機能に取り組むエージェントをグループ化します。ベストプラクティスは次のとおりです。

- **機能ごとに 1 つのセッション：** 1 つの機能に取り組むすべてのエージェントで ID を共有します。たとえば「ユーザー認証」に取り組むエージェントは、すべて `session-auth-01` を共有します。
- **説明的な ID：** `session-auth-01`、`session-payment-v2`、`session-20260324-143000` のような ID を使います。
- **自動生成：** オーケストレータは `session-YYYYMMDD-HHMMSS` 形式の ID を生成します。
- **反復で再利用：** 修正を加えて再スポーンするときも同じセッション ID を使います。

セッション ID は、エージェントが読み書きする実行単位のメモリファイル（`progress-{agentId}-{taskId}-{runId}-{sessionId}.md`、`result-{agentId}-{taskId}-{runId}-{sessionId}.md`）、ダッシュボードの監視対象、最終レポートでの結果のグループ化を決めます。

---

## 並列実行のヒント

### すべきこと

1. **API コントラクトを先に確定する。** `/plan` を実行してから実装エージェントをスポーンし、フロントエンドとバックエンドがエンドポイント、リクエスト/レスポンススキーマ、エラー形式について合意できるようにします。
2. **機能ごとに 1 つのセッション ID を使う。** これでエージェントの出力がまとまり、ダッシュボードで追跡しやすくなります。
3. **別々のワークスペースを割り当てる。** 常に `-w` を使ってエージェントを分離します。
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   ```
4. **積極的にモニタリングする。** ダッシュボードを開いて問題を早く見つけます。失敗したエージェントを長時間放置するとターンを消費します。
5. **実装後に QA を実行する。** すべての実装エージェントが完了してから、QA エージェントを順番にスポーンします。
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent spawn qa "Review all changes" session-01
   ```
6. **再スポーンで反復する。** 改善が必要な場合は、元のタスクと修正内容を添えて同じセッション ID で再スポーンします。新しいセッションは開始しません。
7. **迷ったら `/work` から始める。** `/work` は計画、実行、QA の手順を順番に案内し、各ゲートでユーザーの確認を求めます。

### してはいけないこと

1. **同じワークスペースにエージェントをスポーンしない。** 同じディレクトリで 2 つのエージェントが書き込むと、マージ競合や上書きが起こります。
2. **MAX_PARALLEL（デフォルト 3）を超えない。** 同時実行数を増やしても、必ずしも速くなるとは限りません。各エージェントにはメモリと CPU リソースが必要です。デフォルトの 3 は、ほとんどのシステムに合わせて調整されています。
3. **プランの手順を省略しない。** プランなしのスポーンは、実装の不整合につながります。フロントエンドがある API の形に合わせて構築する一方、バックエンドは別の形で構築してしまう、といった状況です。
4. **失敗したエージェントを放置しない。** 失敗したエージェントの作業は未完了です。構造化された申告または実行単位の結果ファイルで失敗理由を確認し、指示を修正して再スポーンします。
5. **関連する作業でセッション ID を混在させない。** 同じ機能のバックエンドとフロントエンドは、オーケストレータが調整できるよう同じ ID を使います。

---

## エンドツーエンドの例

認証機能を実装する並列実行の流れは次のとおりです。

```bash
# Step 1: Plan the feature
# (In your AI IDE, run /plan or describe the feature)
# This creates .agents/results/plan-{sessionId}.json with task breakdown

# Step 2: Spawn implementation agents in parallel
oma agent spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use Argon2id for password hashing. Follow the API contract in .agents/results/api-contracts/" session-auth-01 -w ./apps/api &
oma agent spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Step 3: Monitor in a separate terminal
# Terminal 2:
oma dashboard terminal

# Step 4: Wait for all implementation agents
wait

# Step 5: Run QA review
oma agent spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Step 6: If QA finds issues, re-spawn specific agents with fixes
oma agent spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Step 7: Re-run QA to verify fixes
oma agent spawn qa "Re-review backend auth after fixes." session-auth-01
```
