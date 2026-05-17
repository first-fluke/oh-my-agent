# oh-my-agent: Portable Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md) | [Tiếng Việt](./README.vi.md) | [ภาษาไทย](./README.th.md)

AIアシスタントに同僚がいたらいいのに、って思ったことありませんか？ oh-my-agentはまさにそれです。

1つのAIに全部やらせて途中で混乱する代わりに、oh-my-agentは作業を**専門エージェント**に分担します。担当するのはfrontend、backend、architecture、QA、PM、DB、mobile、infra、debug、designなどの領域です。各エージェントは自分の領域を深く理解し、専用ツールとチェックリストを持ち、担当範囲に集中します。

主要なAI IDEすべてに対応: Antigravity、Claude Code、Cursor、Gemini CLI、Codex CLI、OpenCodeなど。

## クイックスタート

```bash
# macOS / Linux — bun & uv がなければ自動インストール
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell) — bun & uv がなければ自動インストール
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

```bash
# または手動で（任意の OS、bun + uv が必要）
bunx oh-my-agent@latest
```

### Agent Package Manager でインストール

<details>
<summary>Microsoft の <a href="https://github.com/microsoft/apm">Agent Package Manager</a>（APM）はスキルだけを配布する仕組み。クリックで展開。</summary>

> `oma-observability` の APM（Application Performance Monitoring）とは別物です。

```bash
# 全スキルを検出されたすべてのランタイムに展開
# (.claude, .cursor, .codex, .opencode, .github, .agents)
apm install first-fluke/oh-my-agent

# スキル 1 つだけ
apm install first-fluke/oh-my-agent/.agents/skills/oma-frontend
```

APM は `.claude-plugin/plugin.json` の `skills: .agents/skills/` ポインタを読み込むので、`.agents/` SSOT が唯一のソースになります（ビルドステップもミラーも不要）。

APM が配るのはスキル一式だけです。ワークフロー、ルール、`oma-config.yaml`、キーワード検出フック、`oma agent:spawn` CLI には `bunx oh-my-agent@latest` を使ってください。プロジェクトごとに配布方式は 1 つに絞り、ずれが出ないようにしましょう。

</details>

プリセットを選べばすぐ使えます:

| プリセット | 内容 |
|-----------|------|
| ✨ All | すべてのエージェントとスキル |
| 🌐 Fullstack | architecture + frontend + backend + db + pm + qa + debug + brainstorm + scm |
| 🎨 Frontend | architecture + frontend + pm + qa + debug + brainstorm + scm |
| ⚙️ Backend | architecture + backend + db + pm + qa + debug + brainstorm + scm |
| 📱 Mobile | architecture + mobile + pm + qa + debug + brainstorm + scm |
| 🚀 DevOps | architecture + tf-infra + dev-workflow + pm + qa + debug + brainstorm + scm |

## エージェントチーム

| エージェント | 役割 |
|-------------|------|
| **oma-academic-writer** | 出版品質のアカデミック英語文章のドラフト、改稿、ルーブリック評価 |
| **oma-architecture** | アーキテクチャのトレードオフと境界、ADR/ATAM/CBAMを踏まえた分析 |
| **oma-backend** | Python、Node.js、RustでAPI開発 |
| **oma-brainstorm** | 実装前にアイデアを探索 |
| **oma-db** | スキーマ設計、マイグレーション、インデックス、vector DB |
| **oma-debug** | 根本原因分析、修正、リグレッションテスト |
| **oma-deepsec** | エージェント型脆弱性スキャナー、PR ゲート、カスタム matcher |
| **oma-design** | デザインシステム、トークン、アクセシビリティ、レスポンシブ |
| **oma-dev-workflow** | CI/CD、リリース、モノレポ自動化 |
| **oma-docs** | 参照整合性チェック、変更影響文書の特定 |
| **oma-frontend** | React/Next.js、TypeScript、Tailwind CSS v4、shadcn/ui |
| **oma-hwp** | HWP/HWPX/HWPMLからMarkdownへの変換 |
| **oma-image** | マルチベンダーAI画像生成 |
| **oma-market** | コミュニティ信号による市場調査、ペイン・トレンド・競合・ディスカバリ、SWOT/5F/PESTEL 適用 |
| **oma-mobile** | Flutterクロスプラットフォームアプリ |
| **oma-observability** | APM/RUM、メトリクス/ログ/トレース/プロファイル、SLO、インシデント調査、トランスポート層チューニングを担うオブザーバビリティルーター |
| **oma-orchestrator** | CLI経由の並列エージェント実行 |
| **oma-pdf** | PDFからMarkdownへの変換 |
| **oma-pm** | タスク計画、要件分解、APIコントラクト定義 |
| **oma-qa** | OWASPセキュリティ、パフォーマンス、アクセシビリティレビュー |
| **oma-recap** | 会話履歴の分析とテーマ別作業サマリー |
| **oma-scholar** | 文献検索やピアレビューを支える学術研究のコンパニオン |
| **oma-scm** | ブランチ、マージ、ワークツリー、ベースライン、Conventional Commits を扱うソフトウェア構成管理（SCM） |
| **oma-search** | インテント型検索ルーター＋信頼スコア（ドキュメント、ウェブ、コード、ローカル） |
| **oma-skill-creator** | OMA スキルを SSL-lite フォーマットで作成・監査 |
| **oma-tf-infra** | マルチクラウド Terraform IaC（Infrastructure as Code） |
| **oma-translator** | 自然な多言語翻訳 |
| **oma-voice** | Voicebox MCP によるローカルファースト TTS/STT、音声生成・ナレーション・文字起こし |

## 仕組み

チャットするだけ。やりたいことを説明すれば、oh-my-agentが適切なエージェントを選びます。

```
You: "ユーザー認証付きのTODOアプリを作って"
→ PMが作業を計画
→ Backendが認証APIを構築
→ FrontendがReact UIを構築
→ DBがスキーマを設計
→ QAが全体をレビュー
→ 完了: 統制されたコード、レビュー済み
```

スラッシュコマンドで構造化されたワークフローも実行できます:

| 順 | コマンド | 説明 |
|---|---------|------|
| 1 | `/brainstorm` | 自由なアイデア発散 |
| 2 | `/architecture` | ソフトウェアアーキテクチャのレビュー、トレードオフ、ADR/ATAM/CBAM型の分析 |
| 2 | `/design` | 7フェーズのデザインシステムワークフロー |
| 2 | `/plan` | PMが機能をタスクに分解 |
| 3 | `/work` | ステップごとのマルチエージェント実行 |
| 3 | `/orchestrate` | 自動並列エージェントスポーン |
| 3 | `/ultrawork` | 11のレビューゲート付き5フェーズ品質ワークフロー |
| 4 | `/review` | セキュリティ + パフォーマンス + アクセシビリティ監査 |
| 4 | `/deepsec` | エージェントベースの深層セキュリティスキャン |
| 5 | `/debug` | 構造化された根本原因デバッグ |
| 5 | `/docs` | `oma-docs` によるドキュメントドリフト検証と同期 |
| 6 | `/scm` | SCMとGitのワークフロー、Conventional Commitsの支援 |

**自動検出**: スラッシュコマンドがなくても、メッセージに「アーキテクチャ」「計画」「レビュー」「デバッグ」などのキーワードがあれば（11言語対応！）適切なワークフローが自動で起動します。

## CLI

```bash
# グローバルインストール
bun install --global oh-my-agent   # または: brew install oh-my-agent

# どこでも使える
oma agent:parallel -i backend:"Auth API" frontend:"Login form"
oma agent:spawn backend "Build auth API" session-01
oma dashboard               # リアルタイムエージェントモニタリング
oma doctor                  # ヘルスチェック
oma image generate "cat"    # マルチベンダー AI 画像生成
oma link                    # .agents/ から .claude/.codex/.gemini などを再生成
oma model:check             # 登録済みモデルとライブベンダーリストのドリフト検知
oma recap --window 1d       # ツール横断の会話履歴サマリー
oma retro 7d --compare      # メトリクス + トレンド付きエンジニアリングレトロ
oma search fetch <url>      # 自動エスカレーション戦略によるメカニカル検索
```

モデル選択は2層で行われます。
- 同一ベンダーのネイティブディスパッチは、`.claude/agents/`、`.codex/agents/`、`.gemini/agents/` に生成されたベンダーエージェント定義を使用します。
- クロスベンダーや CLI フォールバックのディスパッチでは、`.agents/skills/oma-orchestrator/config/cli-config.yaml` のベンダーデフォルトを使用します。

**エージェント別モデル**: `.agents/oma-config.yaml` で各エージェントに独自のモデルと `effort` を割り当てられます。プリセットは6種類の runtime profile: `claude`、`codex`、`gemini`、`qwen`、`cursor`、`mixed`。解決後の auth マトリクスは `oma doctor --profile` で確認できます。完全ガイド: [web/docs/guide/per-agent-models.md](../web/docs/guide/per-agent-models.md)。

## なぜ oh-my-agent？

> [詳しくはこちら →](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589)

- **ポータブル**: `.agents/` はプロジェクトと一緒に移動し、特定のIDEに縛られません
- **ロールベース**: プロンプトの寄せ集めではなく、実際のエンジニアリングチームのように設計
- **トークン効率**: 2レイヤースキル設計でトークンを約75%節約
- **品質重視**: Charter preflight、quality gate、レビューワークフローを内蔵:
  - `oma verify <agent>` — エージェントタイプ別14種の決定論的チェック（TypeScript strict、テスト、raw SQL、ハードコードされたシークレット、Flutter analyze、インラインスタイル、スコープ違反、charter alignment …）
  - `session.quota_cap` — `oma-config.yaml` でセッションごとのトークン / spawn / ベンダー別予算上限；`orchestrate` Step 5 は上限超過時に次の spawn を遮断します
  - `ralph` ワークフロー — 独立した JUDGE がイテレーションごとに全 criterion を再検証し silent regression を捕捉；30秒超のテストはキャッシュします
  - Exploration Loop — 2回リトライ後、`orchestrate` が hypothesis のバリアントを並列 spawn し最高スコアのみ残します
  - モノレポ自動ルーティング — `detectWorkspace` が pnpm / nx / turbo / lerna を読み取り、各エージェントを担当 workspace にルーティングします
- **マルチベンダー**: エージェントタイプごとにGemini、Claude、Codex、Qwenを混在可能
- **可観測性**: ターミナルとWebダッシュボードでリアルタイムにモニタリング

## アーキテクチャ

```mermaid
flowchart TD
    subgraph Workflows["Workflows"]
        direction TB
        W0["/brainstorm"]
        W1["/work"]
        W1b["/ultrawork"]
        W2["/orchestrate"]
        W3["/architecture"]
        W4["/plan"]
        W5["/review"]
        W6["/debug"]
        W7["/deepinit"]
        W8["/design"]
    end

    subgraph Orchestration["Orchestration"]
        direction TB
        PM[oma-pm]
        ORC[oma-orchestrator]
    end

    subgraph Domain["Domain Agents"]
        direction TB
        ARC[oma-architecture]
        FE[oma-frontend]
        BE[oma-backend]
        DB[oma-db]
        MB[oma-mobile]
        DES[oma-design]
        TF[oma-tf-infra]
    end

    subgraph Quality["Quality"]
        direction TB
        QA[oma-qa]
        DBG[oma-debug]
    end

    Workflows --> Orchestration
    Orchestration --> Domain
    Domain --> Quality
    Quality --> SCM([oma-scm])
```

## もっと詳しく

- **[詳細ドキュメント](./AGENTS_SPEC.md)**: 完全な技術仕様とアーキテクチャ
- **[対応エージェント](./SUPPORTED_AGENTS.md)**: IDE別エージェント対応状況
- **[Webドキュメント](https://first-fluke.github.io/oh-my-agent/)**: ガイド、チュートリアル、CLIリファレンス

## スポンサー

このプロジェクトは素敵なスポンサーの皆さんのおかげで維持されています。

> **気に入りましたか？** スターをお願いします！
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> 最適化されたスターターテンプレートもどうぞ: [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

<a href="https://github.com/sponsors/first-fluke">
  <img src="https://img.shields.io/badge/Sponsor-♥-ea4aaa?style=for-the-badge" alt="Sponsor" />
</a>
<a href="https://buymeacoffee.com/firstfluke">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-FFDD00?style=for-the-badge" alt="Buy Me a Coffee" />
</a>

### 🚀 Champion

<!-- Champion tier ($100/mo) logos here -->

### 🛸 Booster

<!-- Booster tier ($30/mo) logos here -->

### ☕ Contributor

<!-- Contributor tier ($10/mo) names here -->

[スポンサーになる →](https://github.com/sponsors/first-fluke)

全サポーターの一覧は [SPONSORS.md](../SPONSORS.md) をご覧ください。



## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)


## 参考文献

- Liang, Q., Wang, H., Liang, Z., & Liu, Y. (2026). *From skill text to skill structure: The scheduling-structural-logical representation for agent skills* (Version 2) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2604.24026


## ライセンス

MIT
