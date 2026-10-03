---
title: スキル
description: OMA の 33 スキルによる 2 層アーキテクチャの完全ガイドです。SKILL.md のルーティング、オンデマンドリソース、共有・条件付きプロトコル、ベンダー実行、トークン計測、ルーティングの仕組みを説明します。
---

# スキル

スキルは、ディスパッチロールにドメインの指針を与える構造化された知識パッケージです。実行プロトコル、技術スタックのリファレンス、コードテンプレート、エラープレイブック、品質チェックリスト、スキルが提供する例を、トークン効率を考えた 2 層アーキテクチャで整理しています。

---

## 2 層設計

### Layer 1: SKILL.md（スキルがルーティングされたときにロード）

すべてのスキルはルートに `SKILL.md` ファイルを持ちます。スキルがルーティングされるとコンテキストウィンドウに入ります。インジェクターフックが渡すのは本文ではなく **パス参照** なので、ルーティングされていないスキルは `description` 以外のコストを消費しません。次の内容を含みます。

- **YAML フロントマター**：ルーティングと表示に使う `name` と `description`
- **使用すべき場合 / 使用すべきでない場合**：明示的なアクティベーション条件
- **コアルール**：そのドメインで最も重要な 5〜15 個の制約
- **アーキテクチャ概要**：コードをどう構成するか
- **ライブラリ一覧**：承認済みの依存関係と用途
- **参照**：Layer 2 リソースへのポインター（自動ロードされません）

フロントマターの例：

```yaml
---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---
```

`description` フィールドは、スキルルーティングシステムがタスクとエージェントを照合するためのキーワードを含むため重要です。

### Layer 2: resources/（オンデマンド）

`resources/` ディレクトリには、実行に必要な詳しい知識を収めます。次の場合にだけロードされます。

1. ホストまたはワークフローがスキルを選択した場合（ネイティブスキルの一致や明示的なコマンドなど）
2. 現在のタスクが、そのリファレンスのロード条件を満たす場合

このオンデマンドロードはコンテキストローディングガイド（`.agents/skills/_shared/core/context-loading.md`）が制御します。ガイドは、エントリの指示と、タスクごとに選択するリファレンスを区別します。

---

## ファイル構造の例

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← Layer 1: loaded when routed
└── resources/
    ├── execution-protocol.md         ← Layer 2: step-by-step workflow
    ├── tech-stack.md                 ← Layer 2: detailed technology specs
    ├── angular-rules.md              ← Layer 2: Angular-specific conventions
    ├── snippets.md                   ← Layer 2: copy-paste code patterns
    ├── error-playbook.md             ← Layer 2: error recovery procedures
    └── checklist.md                  ← Layer 2: quality verification checklist

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── orm-reference.md              ← Domain-specific (ORM queries, N+1, transactions)
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Shipped language seeds / generated references
    ├── node/
    ├── python/
    └── rust/

.agents/skills/oma-mobile/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── tech-stack.md
│   ├── screen-template.dart
│   ├── screen-template.swift         ← Swift native iOS screen template
│   ├── screen-template.tsx            ← React Native screen template
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Stack schema and generated platform references
    ├── README.md
    └── stack.schema.json

.agents/skills/oma-design/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── anti-patterns.md
│   ├── checklist.md
│   ├── design-md-spec.md
│   ├── design-tokens.md
│   ├── prompt-enhancement.md
│   ├── stitch-integration.md
│   └── error-playbook.md
└── reference/                         ← Deep reference material
    ├── typography.md
    ├── color-and-contrast.md
    ├── spatial-design.md
    ├── motion-design.md
    ├── responsive-design.md
    ├── component-patterns.md
    ├── accessibility.md
    └── shader-and-3d.md
```

---

## スキルごとのリソースタイプ

| リソースタイプ | ファイル名パターン | 目的 | ロードされるタイミング |
|--------------|-----------------|---------|-------------|
| **実行プロトコル** | `execution-protocol.md` | 手順型ワークフロー：Analyze -> Plan -> Implement -> Verify | 選択した操作で、コマンドやコントラクトの詳細が必要なとき |
| **技術スタック** | `tech-stack.md` | 技術仕様、バージョン、設定の詳細 | 選択したフレームワークまたはスタックの判断に関わる場合 |
| **エラープレイブック** | `error-playbook.md` | 「3 回でエスカレーション」する復旧手順 | エラー発生時のみ |
| **チェックリスト** | `checklist.md` | ドメイン固有の品質検証 | Verify ステップ |
| **スニペット** | `snippets.md` | コピーして使えるコードパターン | 実装や出力の形式になじみがない場合 |
| **例** | `examples.md` または `examples/` | LLM 向けの少数ショット入出力例 | 実装や出力の形式になじみがない場合 |
| **バリアント** | `variants/` ディレクトリ | 言語・フレームワーク固有のリファレンス。Backend には `node`、`python`、`rust` のシードがあります。Mobile にはスキーマがあり、生成されたプラットフォームリファレンスを受け取れます。 | 対応するスタックがある場合 |
| **テンプレート** | `component-template.tsx`、`screen-template.dart` | ボイラープレートのファイルテンプレート | コンポーネント作成時 |
| **ドメインリファレンス** | `orm-reference.md`、`anti-patterns.md` など | 特定のサブタスク向けの詳しいドメイン知識 | タスクの種類に応じて |

---

## 共有リソース（_shared/）

すべてのエージェントは `.agents/skills/_shared/` の共通基盤を共有します。リソースは 3 つのカテゴリに分かれています。

### コアリソース（`.agents/skills/_shared/core/`）

| リソース | 目的 | ロードされるタイミング |
|---------|---------|-------------|
| **`skill-routing.md`** | タスクの成果、担当、実際の依存関係でルーティングします。必須のエージェント連鎖やターン数のクォータはありません。 | オーケストレータとコーディネーションスキルが参照 |
| **`context-loading.md`** | 担当スキルのエントリ、条件付きリファレンス、ランタイムのロード境界。 | コンテキストを組み立てるとき |
| **`prompt-structure.md`** | なじみのないタスクの引き継ぎで、ゴール、コンテキスト、実際の制約、受入基準を満たす証拠を示す指針です。直接依頼されたタスクに必須のテンプレートはありません。 | PM エージェントとすべてのワークフローが参照 |
| **`clarification-protocol.md`** | 通常の詳細はコンテキストから解決し、重要な不足情報と承認だけを求めます。 | 要件が曖昧な場合 |
| **`context-budget.md`** | ファイルサイズの推定値、実際のプロンプトの計測、範囲を絞った読み取り、チェックポイント。 | 長いタスク、またはコンテキストのオーバーヘッドを診断するとき |
| **`difficulty-guide.md`** | 依存関係と検証の必要性から、計画の深さと成果物を決めます。 | タスク分解で難易度の見積もりが必要なとき |
| **`quality-principles.md`** | スコープ、保守性、証拠、タスクに見合った検証に関する指針です。 | 品質重視ワークフロー（ultrawork）の開始時 |
| **`vendor-detection.md`** | 現在のランタイム環境を検出するプロトコルです（Claude Code、Codex CLI、Antigravity、Cursor、Kiro、Qwen、CLI フォールバック）。ホストのマーカーと設定済みベンダー状態を使います。 | ワークフロー開始時 |
| **`session-metrics.md`** | 会話や評価者に関するペナルティスコアを伴わない、任意のセッションの証拠。 | 振り返りが依頼されたとき、または重要な訂正があったとき |
| **`common-checklist.md`** | 該当するドメイン横断のチェック。全体に適用する行数の上限や、catch を一律に求める要件はありません。 | ドメイン横断のレビューが関連する場合 |
| **`lessons-learned.md`** | バージョンやトリガーの条件を付けて、証拠に裏付けられた学びを記録し、適用します。RCA を自動で実施するしきい値はありません。 | エラー後とセッション終了時に参照 |
| **`api-contracts/`** | 任意のコントラクトテンプレート。プロジェクトのスキーマを再利用します。生成されたコントラクトは、スキルのソースの外にあります。 | 境界をまたぐ作業を計画するとき |

### ランタイムリソース（`.agents/skills/_shared/runtime/`）

| リソース | 目的 |
|---------|---------|
| **`memory-protocol.md`** | CLI サブエージェント向けのメモリファイル形式と操作。設定可能なメモリツール（read / write / edit）を使う On Start、During Execution、On Completion のプロトコルを定義します。実験追跡の拡張も含みます。 |
| **`execution-protocols/claude.md`** | Claude Code 固有の実行パターン。`oma agent spawn` がベンダーに応じて注入します。 |
| **`execution-protocols/antigravity.md`** | Antigravity CLI（`agy`）の実行パターン。 |
| **`execution-protocols/codex.md`** | Codex CLI 固有の実行パターン。 |
| **`execution-protocols/commandcode.md`** | CommandCode の実行パターン。 |
| **`execution-protocols/grok.md`** | Grok の実行パターン。 |
| **`execution-protocols/kimi.md`** | Kimi Code の実行パターン。 |
| **`execution-protocols/kiro.md`** | Kiro の実行パターン。 |
| **`execution-protocols/opencode.md`** | OpenCode 拡張の実行パターン。 |
| **`execution-protocols/pi.md`** | pi 拡張の実行パターン。 |
| **`execution-protocols/qwen.md`** | Qwen CLI 固有の実行パターン。 |

ベンダー固有の実行プロトコルは、CLI 起動のエージェントなら `oma agent spawn` が自動で注入します。ネイティブサブエージェントは、選択したベンダーの統合規則を使います。

### 条件付きリソース（`.agents/skills/_shared/conditional/`）

これらは、実行中に特定の条件が満たされたときにだけロードされます。

| リソース | トリガー条件 | ロード元 |
|---------|-------------------|---------|
| **`quality-score.md`** | 定義済みのベースラインまたは実験の比較が必要になる | Orchestrator（QA エージェントへ渡す） |
| **`experiment-ledger.md`** | IMPL ベースライン確立後に最初の実験を記録する | Orchestrator（ベースライン計測後にインラインで渡す） |
| **`exploration-loop.md`** | 復旧を繰り返しても失敗し、予算の範囲で代替案を試す価値がある | Orchestrator（仮説エージェントをスポーンする前にインラインで渡す） |

これらのリソースは、それぞれのトリガー条件を満たすまでロードを後回しにします。難易度だけでは注入しません。

---

## skill-routing.md によるスキルルーティング

ルーティングマップはタスクをエージェントへ対応付けます。

### シンプルルーティング（単一ドメイン）

「Tailwind CSS でログインフォームを作成」というプロンプトは、`UI`、`component`、`form`、`Tailwind` に一致し、**oma-frontend** へルーティングされます。

### 複合リクエストのルーティング

複数ドメインにまたがるリクエストは、定められた実行順序に従います。

| リクエストパターン | 実行順序 |
|----------------|----------------|
| 「フルスタックアプリを作成」 | oma-pm -> （oma-backend + oma-frontend）を並列実行 -> oma-qa |
| 「モバイルアプリを作成」 | oma-pm -> （oma-backend + oma-mobile）を並列実行 -> oma-qa |
| 「バグを修正してレビュー」 | oma-debug -> oma-qa |
| 「ランディングページをデザインして構築」 | oma-design -> oma-frontend |
| 「機能のアイデアがある」 | oma-brainstorm -> oma-pm -> 関連エージェント -> oma-qa |
| 「すべて自動で実行」 | oma-orchestration（内部では oma-pm -> エージェント群 -> oma-qa） |

### エージェント間の依存関係ルール

**並列で実行できる（依存関係なし）：**

- oma-backend + oma-frontend（API コントラクトが事前定義されている場合）
- oma-backend + oma-mobile（API コントラクトが事前定義されている場合）
- oma-frontend + oma-mobile（互いに独立している場合）

**順番に実行する必要がある：**

- oma-brainstorm -> oma-pm（設計を先に行う）
- oma-pm -> その他すべてのエージェント（計画が先）
- 実装エージェント -> oma-qa（実装後にレビュー）
- oma-backend -> oma-frontend / oma-mobile（API コントラクトが事前定義されていない場合）

**QA は常に最後です。**ただし、ユーザーが特定ファイルだけのレビューを依頼した場合を除きます。

---

## トークン節約の計算 {#token-savings-math}

節約を主張する前に計測してください。

```bash
bun scripts/measure-skill-context.ts
bun scripts/measure-skill-context.ts --skills oma-pm,oma-backend,oma-frontend --json
oma agent context backend --difficulty Simple
```

スクリプトは、ファイルサイズに基づくシナリオについて、UTF-8 バイト数 / 4 の推定値を報告します。`routed` はエントリのみです。`simple`、`medium`、`complex` は比較用に、想定上のプロトコル、例、スタックの各ファイルを追加します。これらの名前はスクリプトとの互換性のために残してあり、事前ロードの指示ではありません。`all` はリソースサイズの上限であり、ランタイムの構成ではありません。新しいチェックアウトでは、サイズの目安としてプラットフォームのシードを 1 つ使う場合があります。すべてのプラットフォームをロードするわけではありません。

context コマンドは、実際に注入されるタスクコンテキストを表示します。会話のそれ以外の部分は含まず、ホストやランタイムの指示もすべては含みません。特定のモデルでの入力トークンの総数、レイテンシ、コストを計測するには、組み立てたプロンプトか使用状況のテレメトリを使ってください。これらをリポジトリのサイズや、生成されたミラーの数から推測しないでください。

## タスクごとのリソースロード {#resource-loading-by-task}

どの難易度でも、担当スキルから始めます。グラフはリファレンスのインデックスです。隣接関係は、別のスペシャリスト、エラープレイブック、条件付きの実験ワークフローをロードする許可にはなりません。

ローダーは、Simple / Medium / Complex にそれぞれ推定 1,500 / 4,000 / 8,000 トークンのソフトな予算を使います。予算を超えるエントリも保持し、超過を報告します。補助リファレンスは、タスクのトリガーが確定したあとで明示的に選択しない限り、ロードを後回しにしたままです。必須のエントリを、より小さな無関係のドキュメントで置き換えることはありません。

検証は、タスクのリスクとプロジェクトの要件に従います。難易度のラベルによって、完全なテストスイート、固定のプリフライト応答、承認済みの作業への再度の承認が必要になることはありません。

## コンテキストロードのタスクマップ（エージェント別）

これらは、タスクで必要になったときに参照するリファレンスの例です。担当スキルの最新のインデックスを使い、該当するセクションだけを選択してください。

### Backend エージェント

| タスクの種類 | 必須リソース |
|-----------|-------------------|
| CRUD API の作成 | 存在する場合は対応する `variants/{node,python,rust}/snippets.md` |
| 認証 | 対応する `variants` の `snippets.md` と、存在する場合は `tech-stack.md` |
| DB マイグレーション | 存在する場合は対応する `variants/{node,python,rust}/snippets.md` |
| パフォーマンス最適化 | `orm-reference.md` と、スキルが提供する対応する例 |
| 既存コードの変更 | プロジェクトのコードインテリジェンスプロバイダーと関連する実行リソース |

### Frontend エージェント

| タスクの種類 | 必須リソース |
|-----------|-------------------|
| コンポーネント作成 | `snippets.md` とプロジェクト既存のコンポーネントパターン |
| フォーム実装 | `snippets.md`（フォーム + Zod） |
| API 統合 | `snippets.md`（TanStack Query） |
| スタイリング | `tailwind-rules.md` |
| ページレイアウト | `snippets.md`（grid） |

### Design エージェント

| タスクの種類 | 必須リソース |
|-----------|-------------------|
| デザインシステム作成 | `reference/typography.md` + `reference/color-and-contrast.md` + `reference/spatial-design.md` + `design-md-spec.md` |
| ランディングページのデザイン | `reference/component-patterns.md` + `reference/motion-design.md` + `prompt-enhancement.md` |
| デザイン監査 | `checklist.md` + `anti-patterns.md` |
| デザイントークンのエクスポート | `design-tokens.md` |
| 3D / シェーダー効果 | `reference/shader-and-3d.md` + `reference/motion-design.md` |
| アクセシビリティレビュー | `reference/accessibility.md` + `checklist.md` |

### QA エージェント

| タスクの種類 | 必須リソース |
|-----------|-------------------|
| セキュリティレビュー | `checklist.md`（Security セクション） |
| パフォーマンスレビュー | `checklist.md`（Performance セクション） |
| アクセシビリティレビュー | `checklist.md`（Accessibility セクション） |
| 完全監査 | `checklist.md`（全体）+ `self-check.md` |
| 定義済みメトリクスの比較 | `quality-score.md`（条件付き） |

---

## オーケストレータのプロンプト構成

オーケストレータがサブエージェントのプロンプトを組み立てるときは、タスクに関係するリソースだけを含めます。

1. 担当スキルの `SKILL.md` のパス（CLI ディスパッチはすでに本文を注入しています）
2. 選択した操作の execution-protocol セクション（必要な場合）
3. 特定のタスク種類に対応するリソース（上のマップから）
4. 該当する error-playbook セクション（失敗を実際に確認した後に限る）
5. Memory Protocol（CLI モード）

この絞り込んだ構成により、不要なリソースをロードせず、サブエージェントが実際の作業に使えるコンテキストを増やせます。

---

## セッションの証拠と振り返りレビュー

セッション記録には、重要な訂正、スコープの変更、やり直し、裁定済みのレビュー指摘を、証拠とともに残します。必要な明確化にペナルティはありません。以前の CD と EA の加重スコア、およびしきい値で発動する RCA ルールは削除されました。これらはプロンプトの指示であり、CLI が計算するメトリクスではありませんでした。

可能な場合は、既存のタスク結果を使ってください。設定済みのコーディネーションストアの配下に、別ファイルの `session-metrics-{sessionId}.md` を作るかどうかは任意です。失敗の繰り返しや依頼された振り返りは、学びを記録する根拠になり得ます。通常のチェックの失敗や、異議が出ている指摘が、自動的に学びになるわけではありません。過去のログは残し、新しい形式に書き換えないでください。

`oma stats` は、生産性と、記録された使用量・コストのサマリーを報告します。`oma retro` は、実際のゲート、ブロッカー、決定欠落の各イベントを提案にまとめます。どちらも、これらの Markdown アーティファクトから CD / EA スコアを計算しません。

## タスク分解とコンテキストの復旧

依存関係と、独立して検証できる動作を軸に計画してください。固定のスプリント数、ファイル数、ターン数の見積もりは、レビューの深さや完了を決めるものではありません。テストとエラーハンドリングは、検証対象の動作と一緒に扱ってください。

停滞や有用なコンテキストの喪失を実際に確認した場合は、再開または再ディスパッチの前に、完了した作業、残りの基準、関連するパス、検証の証拠を保存してください。既存の作業を保持し、実行中の試行と重複しないようにしてください。ターン数と進捗の比率だけでは、リセットは必要ありません。

## 条件付きの計測と探索

定義済みのベースラインや実験の比較があると、計測のガイダンスが有効になります。テストや lint があるだけでは有効になりません。比較可能なメトリクスを、単位、方法、リビジョン、証拠とともに記録してください。必須の正確性チェックとセキュリティチェックは、引き続き独立しています。OMA には、デフォルトの複合的な計算式も、レターグレードのゲートも、スコアで発動するロールバックもありません。

実際の実験では、仮説、ベースラインと候補の証拠、必須のチェック、決定、担当ファイルを記録します。失敗の繰り返しは、既存の復旧予算の範囲内で別の仕組みを試す根拠になり得ます。実験の変更は分離し、無関係な編集は保持してください。統合した候補を検証してから、ゲートを再開してください。
