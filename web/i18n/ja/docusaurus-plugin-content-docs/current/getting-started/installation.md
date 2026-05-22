---
title: インストール
description: oh-my-agentの完全インストールガイド。3つのインストール方法、ビルトインプリセットとスキルリスト、ベンダー別CLIツール要件、インストール後の設定、oma-config.yamlフィールド、oma doctorによる検証を解説します。
---

# インストール

## 前提条件

- **AI搭載IDEまたはCLI**: 以下のいずれか。Claude Code、Gemini CLI、Codex CLI、Qwen CLI、Antigravity CLI（`agy`）、Antigravity IDE、Cursor、またはOpenCode
- **bun**: JavaScriptランタイムおよびパッケージマネージャー（インストールスクリプトが未インストールの場合自動インストール）
- **uv**: Serena MCP用Pythonパッケージマネージャー（未インストールの場合自動インストール）

---

## 方法1：ワンライナーインストール（推奨）

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

両方のブートストラップスクリプトは同様に動作します：
1. プラットフォームを検出（macOS、Linux、またはWindows）
2. bun、uv、serenaを確認し、未インストールの場合はインストール
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
oma agent:review        # 外部CLI（codex/claude/gemini/qwen）経由のコードレビュー
oma stats               # セッション統計
oma retro               # エンジニアリング振り返り（コミット、ホットスポット、トレンド）
oma recap               # AIツールを横断する会話履歴サマリ
oma cleanup             # セッションアーティファクトのクリーンアップ
oma link                # `.agents/` SSOTからベンダー固有ファイルを再生成
oma update              # oh-my-agentの更新
oma verify              # エージェント出力の検証（ビルド/テスト/スコープ/シークレット）
oma visualize           # 依存関係の可視化（エイリアス：`oma viz`）
oma describe            # CLIコマンドをJSONとしてイントロスペクト
oma bridge              # MCP stdio ↔ Streamable HTTPブリッジ
oma memory:init         # Serenaメモリスキーマの初期化
oma auth:status         # CLI認証状態の確認（gh/antigravity/claude/codex/qwen）
oma search              # メカニカル検索プリミティブ（エイリアス：`oma s`）
oma image               # マルチベンダーAI画像生成（エイリアス：`oma img`）
oma export              # 外部IDE向けスキルエクスポート（例：cursor）
oma star                # リポジトリにスターを付ける
```

`oma`は`oh-my-agent`の短縮形です。どちらもCLIコマンドとして使用できます。

---

## AI CLIツールのインストール

少なくとも1つのAI CLIツールがインストールされている必要があります。oh-my-agentは複数のベンダーをサポートしており、エージェント-CLIマッピングにより異なるエージェントに異なるCLIを使い分けることができます。

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

### Antigravity CLI（`agy`）

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

初回実行時に`agy`が認証を処理します。バイナリ名は`agy`です。ヘッドレス環境では、代わりに`ANTIGRAVITY_API_KEY`環境変数を設定してください。`oma doctor`は`~/.gemini/antigravity-cli/cache/onboarding.json`を通じて認証状態を報告します。

---

## oma-config.yaml

`oma install`コマンドは`.agents/oma-config.yaml`を作成します。これはoh-my-agentのすべての動作の中央設定ファイルです：

```yaml
# Required
language: en
model_preset: antigravity   # ビルトイン: antigravity, claude, codex, qwen, cursor, mixed

# Optional — 日時の設定
date_format: ISO
timezone: UTC

# Optional — CLIをバックグラウンドで自動更新
auto_update_cli: true

# Optional — エージェントごとの部分オーバーライド（オブジェクト型のみ、シャローマージ）
agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }

# Optional — ユーザー定義モデルのスラグ
# models:
#   my-model: { cli: gemini, cli_model: gemini-3-flash, supports: { thinking: true } }

# Optional — ユーザー定義プリセット
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-5.5, effort: high }
```

### フィールドリファレンス

| フィールド | 型 | 必須 | 説明 |
|-------|------|------|-------------|
| `language` | string | はい | 応答言語コード。en、ko、ja、zh、es、fr、de、pt、ru、nl、plをサポート。 |
| `model_preset` | string | はい | アクティブなプリセットキー。ビルトインキー（`antigravity`、`claude`、`codex`、`qwen`、`cursor`、`mixed`）または`custom_presets`のキー。詳細は[エージェント別モデル](../guide/per-agent-models.md)を参照。 |
| `date_format` | string | いいえ | タイムスタンプ形式（`ISO`、`US`、`EU`）。デフォルト：`ISO`。 |
| `timezone` | string | いいえ | タイムゾーン識別子（例：`Asia/Seoul`）。デフォルト：`UTC`。 |
| `agents` | map | いいえ | エージェントごとの部分オーバーライド（オブジェクト型`AgentSpec`のみ）。プリセットのデフォルトにシャローマージされます。 |
| `models` | map | いいえ | ユーザー定義モデルのスラグ。以前は`models.yaml`に格納されていました。 |
| `custom_presets` | map | いいえ | ユーザー定義プリセット。ビルトインプリセットからの部分継承用に`extends:`をサポート。 |

### ベンダー解決の優先順位

エージェントをスポーンする際、CLIベンダーはアクティブな`model_preset`（および`agents:`オーバーライド）から解決されます。詳細は[エージェント別モデル](../guide/per-agent-models.md)を参照してください。

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

すべてのエージェントについて解決済みのモデルとCLIを確認するには、以下を実行します：

```bash
oma doctor --profile
```

完全なマトリクスと移行の詳細については[エージェント別モデル](../guide/per-agent-models.md)を参照してください。

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
