---
title: インストール
description: oh-my-agentの完全インストールガイド — 3つのインストール方法、6つのプリセットとスキルリスト、4つのベンダー向けCLIツール要件、インストール後の設定、oma-config.yamlフィールド、oma doctorによる検証。
---

# インストール

## 前提条件

- **AI搭載IDEまたはCLI** — 以下のいずれか：Claude Code、Gemini CLI、Codex CLI、Qwen CLI、Antigravity IDE、Cursor、またはOpenCode
- **bun** — JavaScriptランタイムおよびパッケージマネージャー（インストールスクリプトが未インストールの場合自動インストール）
- **uv** — Serena MCP用Pythonパッケージマネージャー（未インストールの場合自動インストール）

---

## 方法1：ワンライナーインストール（推奨）

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

このスクリプトの動作：
1. プラットフォームを検出（macOS、Linux）
2. bunとuvを確認し、未インストールの場合はインストール
3. プリセット選択付きのインタラクティブインストーラーを実行
4. 選択したスキルで`.agents/`を作成
5. `.claude/`統合レイヤーをセットアップ（フック、シンボリックリンク、設定）
6. Serena MCPが検出された場合は設定

標準的なインストール時間：60秒未満。

---

## 方法2：bunxによる手動インストール

```bash
bunx oh-my-agent@latest
```

依存関係のブートストラップなしでインタラクティブインストーラーを起動します。bunが事前にインストールされている必要があります。

インストーラーはプリセットの選択を促し、どのスキルをインストールするかを決定します：

### プリセット

| プリセット | 含まれるスキル |
|--------|----------------|
| **all** | oma-brainstorm、oma-pm、oma-frontend、oma-backend、oma-db、oma-mobile、oma-design、oma-qa、oma-debug、oma-tf-infra、oma-dev-workflow、oma-translator、oma-orchestrator、oma-scm、oma-coordination |
| **fullstack** | oma-frontend、oma-backend、oma-db、oma-pm、oma-qa、oma-debug、oma-brainstorm、oma-scm |
| **frontend** | oma-frontend、oma-pm、oma-qa、oma-debug、oma-brainstorm、oma-scm |
| **backend** | oma-backend、oma-db、oma-pm、oma-qa、oma-debug、oma-brainstorm、oma-scm |
| **mobile** | oma-mobile、oma-pm、oma-qa、oma-debug、oma-brainstorm、oma-scm |
| **devops** | oma-tf-infra、oma-dev-workflow、oma-pm、oma-qa、oma-debug、oma-brainstorm、oma-scm |

すべてのプリセットにはベースラインエージェントとしてoma-pm（計画）、oma-qa（レビュー）、oma-debug（バグ修正）、oma-brainstorm（アイデア出し）、oma-scm（Git）が含まれます。ドメイン固有のプリセットはその上に関連する実装エージェントを追加します。

共有リソース（`_shared/`）はプリセットに関係なく常にインストールされます。コアルーティング、コンテキストローディング、プロンプト構造、ベンダー検出、実行プロトコル、メモリプロトコルが含まれます。

### 作成されるもの

インストール後、プロジェクトには以下が含まれます：

```
.agents/
├── config/
│   └── oma-config.yaml      # 設定
├── skills/
│   ├── _shared/                    # 共有リソース（常にインストール）
│   │   ├── core/                   # skill-routing、context-loadingなど
│   │   ├── runtime/                # memory-protocol、execution-protocols/
│   │   └── conditional/            # quality-score、experiment-ledgerなど
│   ├── oma-frontend/               # プリセットごと
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                         # 選択された他のスキル
├── workflows/                      # 全16ワークフロー定義
├── agents/                         # サブエージェント定義
├── mcp.json                        # MCPサーバー設定
├── results/plan-{sessionId}.json                       # 空（/planで作成）
├── state/                          # 空（永続ワークフローで使用）
└── results/                        # 空（エージェント実行で作成）

.claude/
├── settings.json                   # フックとパーミッション
├── hooks/
│   ├── triggers.json               # キーワード-ワークフローマッピング（11言語）
│   ├── keyword-detector.ts         # 自動検出ロジック
│   ├── persistent-mode.ts          # 永続ワークフロー強制
│   └── hud.ts                      # [OMA]ステータスラインインジケーター
├── skills/                         # シンボリックリンク → .agents/skills/
└── agents/                         # IDE用サブエージェント定義

.serena/
└── memories/                       # ランタイム状態（セッション中に作成）
```

---

## 方法3：グローバルインストール

CLIレベルの使用（ダッシュボード、エージェントスポーン、診断）には、oh-my-agentをグローバルにインストールします：

### Homebrew（macOS/Linux）

```bash
brew install oh-my-agent
```

### npm / bunグローバル

```bash
bun install --global oh-my-agent
# または
npm install --global oh-my-agent
```

これにより`oma`コマンドがグローバルにインストールされ、任意のディレクトリからすべてのCLIコマンドにアクセスできます：

```bash
oma doctor              # ヘルスチェック
oma dashboard           # ターミナルモニタリング
oma dashboard:web       # Webダッシュボード http://localhost:9847
oma agent:spawn         # ターミナルからエージェントをスポーン
oma agent:parallel      # 並列エージェント実行
oma agent:status        # エージェント状態確認
oma stats               # セッション統計
oma retro               # 振り返り分析
oma cleanup             # セッションアーティファクトのクリーンアップ
oma update              # oh-my-agentの更新
oma verify              # エージェント出力の検証
oma visualize           # 依存関係の可視化
oma describe            # プロジェクト構造の説明
oma bridge              # Antigravity用SSE-to-stdioブリッジ
oma memory:init         # メモリプロバイダーの初期化
oma auth:status         # CLI認証状態の確認
oma star                # リポジトリにスターを付ける
```

`oma`は`oh-my-agent`の短縮形です。どちらもCLIコマンドとして使用できます。

---

## AI CLIツールのインストール

少なくとも1つのAI CLIツールがインストールされている必要があります。oh-my-agentは4つのベンダーをサポートしており、エージェント-CLIマッピングにより異なるエージェントに異なるCLIを使い分けることができます。

### Gemini CLI

```bash
bun install --global @google/gemini-cli
# または
npm install --global @google/gemini-cli
```

認証は初回実行時に自動で行われます。Gemini CLIはデフォルトで`.agents/skills/`からスキルを読み込みます。

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# または
npm install --global @anthropic-ai/claude-code
```

認証は初回実行時に自動で行われます。Claude Codeはフックと設定に`.claude/`を使用し、スキルは`.agents/skills/`からシンボリックリンクされます。

### Codex CLI

```bash
bun install --global @openai/codex
# または
npm install --global @openai/codex
```

インストール後、`codex login`を実行して認証します。

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

インストール後、CLI内で`/auth`を実行して認証します。

---

## oma-config.yaml

`oma install`コマンドは`.agents/oma-config.yaml`を作成します。これはoh-my-agentのすべての動作の中央設定ファイルです：

```yaml
# すべてのエージェントとワークフローの応答言語
language: en

# レポートとメモリファイルで使用する日付形式
date_format: "YYYY-MM-DD"

# タイムスタンプのタイムゾーン
timezone: "UTC"

# エージェントスポーンのデフォルトCLIツール
# オプション: gemini, claude, codex, qwen
default_cli: gemini

# エージェントごとのCLIマッピング（default_cliをオーバーライド）
agent_cli_mapping:
  frontend: claude       # 複雑なUI推論
  backend: gemini        # 高速API生成
  mobile: gemini
  db: gemini
  pm: gemini             # 迅速なタスク分解
  qa: claude             # 徹底的なセキュリティレビュー
  debug: claude          # 深い根本原因分析
  design: claude
  tf-infra: gemini
  dev-workflow: gemini
  translator: claude
  orchestrator: gemini
  commit: gemini
```

### フィールドリファレンス

| フィールド | 型 | デフォルト | 説明 |
|-------|------|---------|-------------|
| `language` | string | `en` | 応答言語コード。すべてのエージェント出力、ワークフローメッセージ、レポートでこの言語が使用されます。11言語をサポート（en、ko、ja、zh、es、fr、de、pt、ru、nl、pl）。 |
| `date_format` | string | `YYYY-MM-DD` | プラン、メモリファイル、レポートのタイムスタンプに使用する日付形式文字列。 |
| `timezone` | string | `UTC` | すべてのタイムスタンプのタイムゾーン。標準タイムゾーン識別子を使用（例：`Asia/Seoul`、`America/New_York`）。 |
| `default_cli` | string | `gemini` | エージェント固有のマッピングが存在しない場合のフォールバックCLI。ベンダー解決優先度のレベル3で使用。 |
| `agent_cli_mapping` | map | （空） | エージェントIDを特定のCLIベンダーにマッピング。`default_cli`より優先。 |

### ベンダー解決の優先順位

エージェントをスポーンする際、CLIベンダーは以下の優先順位で決定されます（高い順）：

1. `oma agent:spawn`に渡された`--model`フラグ
2. `oma-config.yaml`のそのエージェント固有の`agent_cli_mapping`エントリ
3. `oma-config.yaml`の`default_cli`設定
4. `cli-config.yaml`の`active_vendor`（レガシーフォールバック）
5. `gemini`（ハードコードされた最終フォールバック）

---

## 検証：`oma doctor`

インストールとセットアップ後、すべてが正常に動作していることを検証します：

```bash
oma doctor
```

このコマンドが確認する項目：
- 必要なすべてのCLIツールがインストールされ、アクセス可能であること
- MCPサーバー設定が有効であること
- 有効なSKILL.mdフロントマターを持つスキルファイルが存在すること
- `.claude/skills/`のシンボリックリンクが有効なターゲットを指していること
- `.claude/settings.json`でフックが適切に設定されていること
- メモリプロバイダーが到達可能であること（Serena MCP）
- `oma-config.yaml`が必要なフィールドを持つ有効なYAMLであること

問題がある場合、`oma doctor`は修正方法をコピペ可能なコマンドとともに正確に示します。

---

## 更新

### CLIの更新

```bash
oma update
```

グローバルのoh-my-agent CLIを最新バージョンに更新します。

### プロジェクトスキルの更新

プロジェクト内のスキルとワークフローは、自動更新用のGitHub Action（`action/`）を介して、または手動でインストーラーを再実行して更新できます：

```bash
bunx oh-my-agent@latest
```

インストーラーは既存のインストールを検出し、`oma-config.yaml`やカスタム設定を保持したまま更新を提案します。

---

## 次のステップ

AI IDEでプロジェクトを開き、oh-my-agentの使用を開始します。スキルは自動検出されます。以下を試してください：

```
"Tailwind CSSを使ってメール検証付きのログインフォームを作成して"
```

またはワークフローコマンドを使用：

```
/plan JWTとリフレッシュトークンを使った認証機能
```

詳細な例は[使い方ガイド](/docs/guide/usage)を、各スペシャリストの詳細は[エージェント](/docs/core-concepts/agents)を参照してください。
