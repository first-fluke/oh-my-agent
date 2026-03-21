---
title: 使用ガイド
description: 使用例、ワークフロー、ダッシュボード操作、トラブルシューティングを含む完全な使用ガイド。
---

# Antigravityマルチエージェントスキルの使用方法

## クイックスタート

1. **Antigravity IDEで開く**
   ```bash
   antigravity open /path/to/oh-my-agent
   ```

2. **スキルは自動的に検出されます。** Antigravityが`.agents/skills/`をスキャンし、利用可能なすべてのスキルをインデックス化します。

3. **IDEでチャット。** 構築したいものを説明してください。

---

## 使用例

### 例1: シンプルな単一ドメインタスク

**あなたが入力:**
```
"Tailwind CSSを使用してメールとパスワードフィールドを持つログインフォームコンポーネントを作成"
```

**何が起こるか:**
- Antigravityがこれが`oma-frontend`にマッチすると検出
- スキルが自動的にロード（Progressive Disclosure）
- TypeScript、Tailwind、フォームバリデーション付きのReactコンポーネントを取得

### 例2: 複雑なマルチドメインプロジェクト

**あなたが入力:**
```
"ユーザー認証付きのTODOアプリを構築"
```

**何が起こるか:**

1. **Workflow Guideが起動** — マルチドメインの複雑さを検出
2. **PM Agentが計画** — 優先順位付きのタスク分解を作成
3. **CLIでエージェントを起動**:
   ```bash
   oma agent:spawn backend "JWT認証API" session-01 &
   oma agent:spawn frontend "ログインとTODO UI" session-01 &
   wait
   ```
4. **エージェントが並列作業** — Knowledge Baseに出力を保存
5. **調整** — 一貫性のために`.agents/brain/`をレビュー
6. **QA Agentがレビュー** — セキュリティ/パフォーマンス監査
7. **修正と反復** — 修正を含めてエージェントを再起動

### 例3: バグ修正

**あなたが入力:**
```
"バグがあります — ログインをクリックすると'Cannot read property map of undefined'と表示されます"
```

**何が起こるか:**

1. **oma-debugが起動** — エラーを分析
2. **根本原因を発見** — データロード前にコンポーネントが`todos`をマップしている
3. **修正を提供** — ローディング状態とnullチェックを追加
4. **リグレッションテストを作成** — バグが再発しないことを保証
5. **類似パターンを発見** — 他の3つのコンポーネントを予防的に修正

### 例4: CLIベースの並列実行

```bash
# 単一エージェント (ワークスペース自動検出)
oma agent:spawn backend "JWT認証APIを実装" session-01

# 並列エージェント
oma agent:spawn backend "認証APIを実装" session-01 &
oma agent:spawn frontend "ログインフォームを作成" session-01 &
oma agent:spawn mobile "認証画面を構築" session-01 &
wait
```

**リアルタイムで監視:**
```bash
# ターミナル (別のターミナルウィンドウで)
bunx oh-my-agent dashboard

# またはブラウザで
bunx oh-my-agent dashboard:web
# → http://localhost:9847
```

---

## リアルタイムダッシュボード

### ターミナルダッシュボード

```bash
bunx oh-my-agent dashboard
```

`fswatch` (macOS) または `inotifywait` (Linux) を使用して`.serena/memories/`を監視します。セッションステータス、エージェント状態、ターン数、最新アクティビティを含むライブテーブルを表示します。メモリファイルが変更されると自動的に更新されます。

**要件:**
- macOS: `brew install fswatch`
- Linux: `apt install inotify-tools`

### Webダッシュボード

```bash
npm install          # 初回のみ
bunx oh-my-agent dashboard:web
```

ブラウザで`http://localhost:9847`を開きます。機能:

- **リアルタイム更新** WebSocket経由（ポーリングではなくイベント駆動）
- **自動再接続** 接続が切れた場合
- **SerenaテーマのUI** 紫のアクセントカラー
- **セッションステータス** — IDと実行中/完了/失敗状態
- **エージェントテーブル** — 名前、ステータス（カラードット付き）、ターン数、タスク説明
- **アクティビティログ** — 進捗と結果ファイルからの最新変更

サーバーはchokidarを使用して`.serena/memories/`を監視し、デバウンス（100ms）を適用します。変更されたファイルのみが読み取りをトリガーし、完全な再スキャンは行いません。

---

## 主要な概念

### Progressive Disclosure（段階的開示）
Antigravityは自動的にリクエストをスキルにマッチングします。スキルを手動で選択することはありません。必要なスキルのみがコンテキストにロードされます。

### トークン最適化されたスキル設計
各スキルは最大限のトークン効率のために2層アーキテクチャを使用:
- **SKILL.md** (~40行): アイデンティティ、ルーティング、コアルール — 即座にロード
- **resources/**: 実行プロトコル、例、チェックリスト、エラープレイブック — オンデマンドでロード

共有リソースは`_shared/`（スキルではない）にあり、すべてのエージェントから参照されます:
- 4ステップワークフローを含むchain-of-thought実行プロトコル
- 中位モデルガイダンスのためのfew-shot入出力例
- "3 strikes"エスカレーションを含むエラー復旧プレイブック
- 構造化された多段階分析のための推論テンプレート
- Flash/Proモデルティアのコンテキスト予算管理
- `verify.sh`による自動検証
- セッション横断の教訓蓄積

### CLIエージェント起動
`oma agent:spawn`を使用してCLI経由でエージェントを実行します。`user-preferences.yaml`の`agent_cli_mapping`を尊重して、エージェントタイプごとに適切なCLI（gemini、claude、codex、qwen）を選択します。ワークスペースは一般的なモノレポ規約から自動検出されるか、`-w`で明示的に設定できます。

### Knowledge Base
`.agents/brain/`に保存されたエージェント出力。計画、コード、レポート、調整メモを含みます。

### Serena Memory
`.serena/memories/`の構造化されたランタイム状態。orchestratorはセッション情報、タスクボード、エージェントごとの進捗、結果を書き込みます。ダッシュボードはこれらのファイルを監視して監視を提供します。

### ワークスペース
エージェントは競合を避けるために別々のディレクトリで作業できます。ワークスペースは一般的なモノレポ規約から自動検出されます:
```
./apps/api   または ./backend   → Backend Agentワークスペース
./apps/web   または ./frontend  → Frontend Agentワークスペース
./apps/mobile または ./mobile   → Mobile Agentワークスペース
```

---

## 利用可能なスキル

| スキル | 自動起動条件 | 出力 |
|-------|-------------------|--------|
| oma-coordination | 複雑なマルチドメインプロジェクト | ステップバイステップのエージェント調整 |
| oma-pm | "plan this"、"break down" | `.agents/plan.json` |
| oma-frontend | UI、コンポーネント、スタイリング | Reactコンポーネント、テスト |
| oma-backend | API、データベース、認証 | APIエンドポイント、モデル、テスト |
| oma-mobile | モバイルアプリ、iOS/Android | Flutter画面、状態管理 |
| oma-brainstorm | アイデア創出、コンセプト探索 | 設計ドキュメント |
| oma-db | データベース、スキーマ、ERD、マイグレーション | スキーマ設計、クエリチューニング |
| oma-dev-workflow | CI/CD、git hooks、モノレポ設定 | ワークフロー設定、自動化 |
| oma-tf-infra | Terraform、クラウドインフラ | IaC モジュール、ステート管理 |
| oma-translator | 翻訳、多言語コンテンツ | トーンを維持した翻訳文 |
| oma-qa | "review security"、"audit" | 優先順位付きの修正を含むQAレポート |
| oma-debug | バグレポート、エラーメッセージ | 修正されたコード、リグレッションテスト |
| oma-orchestrator | CLIサブエージェント実行 | `.agents/results/`の結果 |
| oma-commit | "commit"、"커밋해줘" | Gitコミット（機能ごとに自動分割） |

---

## ワークフローコマンド

Antigravity IDEチャットでこれらを入力してステップバイステップのワークフローをトリガー:

| コマンド | 説明 |
|---------|-------------|
| `/brainstorm` | 設計優先アイデア創出 — 意図、制約、アプローチの探索 |
| `/coordinate` | ステップバイステップガイダンス付きCLI経由のマルチエージェントオーケストレーション |
| `/deepinit` | AGENTS.md と ARCHITECTURE.md でプロジェクトハーネスを初期化 |
| `/exec-plan` | 実行計画をリポジトリアーティファクトとして作成・追跡 |
| `/orchestrate` | 自動化されたCLIベースの並列エージェント実行 |
| `/plan` | APIコントラクト付きPMタスク分解 |
| `/review` | 完全なQAパイプライン（セキュリティ、パフォーマンス、アクセシビリティ、コード品質） |
| `/debug` | 構造化されたバグ修正（再現 → 診断 → 修正 → リグレッションテスト） |
| `/setup` | プロジェクトの設定と構成 |
| `/tools` | MCP ツール管理 |
| `/ultrawork` | 11 のレビューゲートを持つ高品質 5 フェーズ開発 |

これらは**スキル**（自動起動）とは別のものです。ワークフローは多段階プロセスに対する明示的な制御を提供します。

---

## 典型的なワークフロー

### ワークフローA: 単一スキル

```
あなた: "ボタンコンポーネントを作成"
  → Antigravityがoma-frontendをロード
  → すぐにコンポーネントを取得
```

### ワークフローB: マルチエージェントプロジェクト（自動）

```
あなた: "認証付きTODOアプリを構築"
  → oma-coordinationが自動的に起動
  → PM Agentが計画を作成
  → CLI経由でエージェントを起動 (oma agent:spawn)
  → エージェントが並列作業
  → QA Agentがレビュー
  → 問題を修正し、反復
```

### ワークフローB-2: マルチエージェントプロジェクト（明示的）

```
あなた: /coordinate
  → ステップバイステップのガイド付きワークフロー
  → PM計画 → 計画レビュー → エージェント起動 → 監視 → QAレビュー
```

### ワークフローC: バグ修正

```
あなた: "ログインボタンがTypeErrorをスロー"
  → oma-debugが起動
  → 根本原因分析
  → 修正 + リグレッションテスト
  → 類似パターンをチェック
```

### ワークフローD: ダッシュボード付きCLIオーケストレーション

```
ターミナル1: bunx oh-my-agent dashboard:web
ターミナル2: oma agent:spawn backend "task" session-01 &
            oma agent:spawn frontend "task" session-01 &
ブラウザ:    http://localhost:9847 → リアルタイムステータス
```

---

## ヒント

1. **具体的に** — "JWT認証、Reactフロントエンド、FastAPIバックエンドでTODOアプリを構築"は"アプリを作る"よりも良い
2. **CLI起動を使用** マルチドメインプロジェクトには — 1つのチャットですべてをやろうとしない
3. **Knowledge Baseをレビュー** — API一貫性のために`.agents/brain/`をチェック
4. **再起動で反復** — 指示を洗練させ、最初からやり直さない
5. **ダッシュボードを使用** — orchestratorセッションを監視するために`bunx oh-my-agent dashboard`または`bunx oh-my-agent dashboard:web`
6. **ワークスペースを分離** — 各エージェントに独自のディレクトリを割り当てる

---

## トラブルシューティング

| 問題 | 解決策 |
|---------|----------|
| スキルがロードされない | `antigravity open .`、`.agents/skills/`をチェック、IDEを再起動 |
| CLIが見つからない | `which gemini` / `which claude`をチェック、欠落しているCLIをインストール |
| エージェント出力が互換性がない | Knowledge Baseで両方をレビュー、修正を含めて再起動 |
| ダッシュボード: "No agents" | メモリファイルがまだ作成されていない、最初にorchestratorを実行 |
| Webダッシュボードが起動しない | `npm install`を実行してchokidarとwsをインストール |
| fswatchが見つからない | macOS: `brew install fswatch`、Linux: `apt install inotify-tools` |
| QAレポートに50以上の問題 | まずCRITICAL/HIGHに焦点を当て、残りは後で文書化 |

---

## CLIコマンド

```bash
bunx oh-my-agent                # 対話型スキルインストーラー
bunx oh-my-agent doctor         # セットアップチェックと欠落スキルの修復
bunx oh-my-agent doctor --json  # CI/CD用JSON出力
bunx oh-my-agent update         # スキルを最新バージョンに更新
bunx oh-my-agent stats          # 生産性メトリクスを表示
bunx oh-my-agent stats --reset  # メトリクスをリセット
bunx oh-my-agent retro          # セッション振り返り（学びと次のステップ）
bunx oh-my-agent dashboard      # ターミナルリアルタイムダッシュボード
bunx oh-my-agent dashboard:web  # Webダッシュボード (http://localhost:9847)
bunx oh-my-agent help           # ヘルプを表示
```

---

## 開発者向け（統合ガイド）

これらのスキルを既存のAntigravityプロジェクトに統合したい場合は、[AGENT_GUIDE.md](../AGENT_GUIDE.md)を参照してください:
- クイック3ステップ統合
- 完全なダッシュボード統合
- 技術スタック用のスキルカスタマイズ
- トラブルシューティングとベストプラクティス

---

**Antigravity IDEでチャットするだけです。** 監視にはダッシュボードを使用してください。CLI実行にはorchestratorスクリプトを使用してください。既存プロジェクトに統合するには、[AGENT_GUIDE.md](../AGENT_GUIDE.md)を参照してください。
