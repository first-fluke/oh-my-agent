---
title: スキル
description: oh-my-agentの2層スキルアーキテクチャ完全ガイド。SKILL.md設計、オンデマンドリソースローディング、全共有リソースの解説、条件付きプロトコル、スキルごとのリソースタイプ、ベンダー実行プロトコル、トークン節約の計算、スキルルーティングの仕組みを解説します。
---

# スキル

スキルは、各エージェントにドメイン専門知識を与える構造化された知識パッケージです。単なるプロンプトではなく、実行プロトコル、技術スタックリファレンス、コードテンプレート、エラー対応手順、品質チェックリスト、Few-shotサンプルが含まれ、トークン効率を考慮した2層アーキテクチャで構成されています。

---

## 2層設計

### レイヤー1：SKILL.md（約800バイト、常にロード）

すべてのスキルのルートに`SKILL.md`ファイルがあります。スキルが参照されるとき常にコンテキストウィンドウにロードされます。含まれるもの：

- **YAMLフロントマター**：`name`と`description`（ルーティングと表示に使用）
- **使用すべき場合/使用すべきでない場合**: 明示的なアクティベーション条件
- **コアルール**: ドメインの最も重要な5〜15の制約
- **アーキテクチャ概要**: コードの構造化方法
- **ライブラリリスト**: 承認済み依存関係とその用途
- **参照**: レイヤー2リソースへのポインター（自動ロードされない）

フロントマター例：

```yaml
---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---
```

descriptionフィールドは非常に重要です。スキルルーティングシステムがタスクをエージェントにマッチさせるルーティングキーワードが含まれています。

### レイヤー2：resources/（オンデマンドロード）

`resources/`ディレクトリには深い実行知識が含まれます。以下の場合にのみロードされます：
1. エージェントが明示的に呼び出された場合（`/command`またはエージェントskillsフィールド経由）
2. 現在のタスクタイプと難易度に特定のリソースが必要な場合

このオンデマンドローディングはコンテキストローディングガイド（`.agents/skills/_shared/core/context-loading.md`）によって制御され、エージェントごとにタスクタイプを必要なリソースにマッピングします。

---

## ファイル構造例

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← レイヤー1：常にロード（約800バイト）
└── resources/
    ├── execution-protocol.md         ← レイヤー2：ステップバイステップワークフロー
    ├── tech-stack.md                 ← レイヤー2：詳細な技術仕様
    ├── tailwind-rules.md             ← レイヤー2：Tailwind固有の規約
    ├── component-template.tsx        ← レイヤー2：Reactコンポーネントテンプレート
    ├── snippets.md                   ← レイヤー2：コピペ可能なコードパターン
    ├── error-playbook.md             ← レイヤー2：エラー回復手順
    ├── checklist.md                  ← レイヤー2：品質検証チェックリスト
    └── examples/                     ← レイヤー2：Few-shot入出力サンプル
        └── examples.md

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── examples.md
│   ├── orm-reference.md              ← ドメイン固有（ORMクエリ、N+1、トランザクション）
│   ├── checklist.md
│   └── error-playbook.md
└── stack/                             ← /stack-setで生成（言語固有）
    ├── stack.yaml
    ├── tech-stack.md
    ├── snippets.md
    └── api-template.*

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
└── reference/                         ← 深いリファレンス資料
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

| リソースタイプ | ファイル名パターン | 目的 | ロードタイミング |
|--------------|-----------------|---------|-------------|
| **実行プロトコル** | `execution-protocol.md` | ステップバイステップワークフロー：分析 -> 計画 -> 実装 -> 検証 | 常に（SKILL.mdとともに） |
| **技術スタック** | `tech-stack.md` | 詳細な技術仕様、バージョン、設定 | Complexタスク |
| **エラー対応手順** | `error-playbook.md` | 「3ストライク」エスカレーション付き回復手順 | エラー発生時のみ |
| **チェックリスト** | `checklist.md` | ドメイン固有の品質検証 | 検証ステップで |
| **スニペット** | `snippets.md` | コピペ可能なコードパターン | Medium/Complexタスク |
| **サンプル** | `examples.md`または`examples/` | LLM向けFew-shot入出力サンプル | Medium/Complexタスク |
| **バリアント** | `stack/`ディレクトリ | 言語/フレームワーク固有のリファレンス（`/stack-set`で生成） | stackが存在する場合 |
| **テンプレート** | `component-template.tsx`、`screen-template.dart` | ボイラープレートファイルテンプレート | コンポーネント作成時 |
| **ドメインリファレンス** | `orm-reference.md`、`anti-patterns.md`など | 特定のサブタスク向け深いドメイン知識 | タスクタイプ固有 |

---

## 共有リソース（_shared/）

すべてのエージェントは`.agents/skills/_shared/`の共通基盤を共有します。3つのカテゴリに分類されます：

### コアリソース（`.agents/skills/_shared/core/`）

| リソース | 目的 | ロードタイミング |
|----------|---------|-------------|
| **`skill-routing.md`** | タスクキーワードを正しいエージェントにマッピング。Skill-Agentマッピングテーブル、Complex Request Routingパターン、エージェント間依存ルール、エスカレーションルール、ターン制限ガイドを含む。 | オーケストレータおよびコーディネーションスキルが参照 |
| **`context-loading.md`** | タスクタイプと難易度に応じてロードするリソースを定義。エージェントごとのタスクタイプ-リソースマッピングテーブルと条件付きプロトコルローディングトリガーを含む。 | ワークフロー開始時（Step 0 / Phase 0） |
| **`prompt-structure.md`** | すべてのタスクプロンプトに必要な4要素を定義：Goal、Context、Constraints、Done When。PM、実装、QAエージェント用テンプレートを含む。 | PMエージェントおよびすべてのワークフローが参照 |
| **`clarification-protocol.md`** | 不確実性レベル（LOW/MEDIUM/HIGH）と各アクションを定義。不確実性トリガー、エスカレーションテンプレート、サブエージェントモードでの動作を含む。 | 要件が曖昧な場合 |
| **`context-budget.md`** | トークン予算管理。ファイル読み取り戦略（`read_file`ではなく`find_symbol`を使用）、モデルティアごとのリソースローディング予算（Flash：約3,100トークン / Pro：約5,000トークン）を定義。 | ワークフロー開始時 |
| **`difficulty-guide.md`** | タスクをSimple/Medium/Complexに分類する基準。予想ターン数、プロトコル分岐を定義。 | タスク開始時（Step 0） |
| **`reasoning-templates.md`** | 一般的な意思決定パターン向け構造化推論テンプレート。 | 複雑な意思決定時 |
| **`quality-principles.md`** | すべてのエージェントに適用される4つの普遍的品質原則。 | 品質重視ワークフロー開始時 |
| **`vendor-detection.md`** | ランタイム環境検出プロトコル。マーカーチェック：Agent tool = Claude Code、apply_patch = Codex、@-syntax = Gemini。 | ワークフロー開始時 |
| **`session-metrics.md`** | Clarification Debt（CD）スコアリングとセッションメトリクス追跡。 | オーケストレーションセッション中 |
| **`common-checklist.md`** | Complexタスクの最終検証時に適用される普遍的品質チェックリスト。 | Complexタスクの検証ステップ |
| **`lessons-learned.md`** | 過去セッションの学びのリポジトリ。 | エラー後およびセッション終了時に参照 |
| **`api-contracts/`** | APIコントラクトテンプレートと生成されたコントラクトを含むディレクトリ。 | クロスバウンダリ作業の計画時 |

### ランタイムリソース（`.agents/skills/_shared/runtime/`）

| リソース | 目的 |
|----------|---------|
| **`memory-protocol.md`** | CLIサブエージェント用のメモリファイル形式と操作。On Start、During Execution、On Completionプロトコルを定義。 |
| **`execution-protocols/claude.md`** | Claude Code固有の実行パターン。 |
| **`execution-protocols/gemini.md`** | Gemini CLI固有の実行パターン。 |
| **`execution-protocols/codex.md`** | Codex CLI固有の実行パターン。 |
| **`execution-protocols/qwen.md`** | Qwen CLI固有の実行パターン。 |

ベンダー固有の実行プロトコルは`oma agent:spawn`により自動的にインジェクトされます。

### 条件付きリソース（`.agents/skills/_shared/conditional/`）

| リソース | トリガー条件 | ロード元 | 概算トークン |
|----------|-------------------|-----------|----------------|
| **`quality-score.md`** | VERIFYまたはSHIPフェーズ開始 | オーケストレータ | 約250 |
| **`experiment-ledger.md`** | IMPLベースライン確立後の最初の実験 | オーケストレータ | 約250 |
| **`exploration-loop.md`** | 同じ問題で同じゲートが2回失敗 | オーケストレータ | 約250 |

予算影響：3つすべてロード時、合計約750トークン。一般的なセッションでは1〜2個がロード。

---

## skill-routing.mdによるスキルルーティング

### シンプルルーティング（単一ドメイン）

「Tailwind CSSでログインフォームを作成」→ キーワード`UI`、`component`、`form`、`Tailwind`にマッチ → **oma-frontend**。

### 複合リクエストルーティング

| リクエストパターン | 実行順序 |
|----------------|----------------|
| 「フルスタックアプリを作成」 | oma-pm -> (oma-backend + oma-frontend) 並列 -> oma-qa |
| 「モバイルアプリを作成」 | oma-pm -> (oma-backend + oma-mobile) 並列 -> oma-qa |
| 「バグを修正してレビュー」 | oma-debug -> oma-qa |
| 「ランディングページをデザインして構築」 | oma-design -> oma-frontend |
| 「機能のアイデアがある」 | oma-brainstorm -> oma-pm -> 関連エージェント -> oma-qa |
| 「すべて自動でやって」 | oma-orchestrator（内部：oma-pm -> エージェント群 -> oma-qa） |

### エージェント間依存ルール

**並列実行可能（依存関係なし）：**
- oma-backend + oma-frontend（APIコントラクトが事前定義の場合）
- oma-backend + oma-mobile（APIコントラクトが事前定義の場合）
- oma-frontend + oma-mobile（互いに独立）

**順次実行が必要：**
- oma-brainstorm -> oma-pm（設計が計画より先）
- oma-pm -> その他すべてのエージェント（計画が最初）
- 実装エージェント -> oma-qa（実装後にレビュー）
- oma-backend -> oma-frontend/oma-mobile（事前定義のAPIコントラクトがない場合）

**QAは常に最後。**

---

## トークン節約の計算

5エージェントのオーケストレーションセッション（pm、backend、frontend、mobile、qa）を想定：

**段階的開示なし：** 5 x 4,000 = 20,000トークン（作業開始前に消費）

**段階的開示あり：** 5 x 800 + 1,500 = 約5,500トークン

**節約：約72〜75%**

Flashティアモデル（128Kコンテキスト）では、作業に使用可能なトークンが108Kか125Kかの差になります。

---

## タスク難易度によるリソースローディング

### Simple（3〜5ターン想定）

単一ファイル変更、明確な要件。ロード：`execution-protocol.md`のみ。

### Medium（8〜15ターン想定）

2〜3ファイル変更、設計判断が必要。ロード：`execution-protocol.md` + `examples.md`。

### Complex（15〜25ターン想定）

4ファイル以上の変更、アーキテクチャ判断が必要。ロード：`execution-protocol.md` + `examples.md` + `tech-stack.md` + `snippets.md`。

---

## コンテキストローディングタスクマップ（エージェントごと）

### バックエンドエージェント

| タスクタイプ | 必要なリソース |
|-----------|-------------------|
| CRUD API作成 | stack/snippets.md（route、schema、model、test） |
| 認証 | stack/snippets.md（JWT、password）+ stack/tech-stack.md |
| DBマイグレーション | stack/snippets.md（migration） |
| パフォーマンス最適化 | examples.md（N+1サンプル） |
| 既存コード変更 | examples.md + Serena MCP |

### フロントエンドエージェント

| タスクタイプ | 必要なリソース |
|-----------|-------------------|
| コンポーネント作成 | snippets.md + component-template.tsx |
| フォーム実装 | snippets.md（form + Zod） |
| API統合 | snippets.md（TanStack Query） |
| スタイリング | tailwind-rules.md |
| ページレイアウト | snippets.md（grid）+ examples.md |

### デザインエージェント

| タスクタイプ | 必要なリソース |
|-----------|-------------------|
| デザインシステム作成 | reference/typography.md + reference/color-and-contrast.md + reference/spatial-design.md + design-md-spec.md |
| ランディングページデザイン | reference/component-patterns.md + reference/motion-design.md + prompt-enhancement.md |
| デザイン監査 | checklist.md + anti-patterns.md |
| デザイントークンエクスポート | design-tokens.md |
| 3D / シェーダーエフェクト | reference/shader-and-3d.md + reference/motion-design.md |
| アクセシビリティレビュー | reference/accessibility.md + checklist.md |

### QAエージェント

| タスクタイプ | 必要なリソース |
|-----------|-------------------|
| セキュリティレビュー | checklist.md（Securityセクション） |
| パフォーマンスレビュー | checklist.md（Performanceセクション） |
| アクセシビリティレビュー | checklist.md（Accessibilityセクション） |
| フル監査 | checklist.md（全体）+ self-check.md |
| 品質スコアリング | quality-score.md（条件付き） |

---

## オーケストレータのプロンプト構成

オーケストレータがサブエージェントのプロンプトを構成する際、タスクに関連するリソースのみを含みます：

1. エージェントSKILL.mdのCore Rulesセクション
2. `execution-protocol.md`
3. 特定のタスクタイプにマッチするリソース（上記マップから）
4. `error-playbook.md`（常に含む。回復は不可欠）
5. Serenaメモリプロトコル（CLIモード）

このターゲットを絞った構成は、不要なリソースのロードを避け、サブエージェントの実際の作業に利用可能なコンテキストを最大化します。

---

## Clarification Debt とセッションメトリクス（詳細）

Clarification Debt（CD）は、セッション中に要件が不明瞭であることのコストを測定します。オーケストレータはユーザーの修正をすべて追跡し、スコアを付けます。

| イベントタイプ | ポイント | 説明 |
|------------|--------|-------------|
| `clarify` | +10 | 単純な明確化質問（MEDIUMの不確実性で想定される） |
| `correct` | +25 | 方向転換が必要となる意図の誤解 |
| `redo` | +40 | スコープ/Charterの違反でロールバックと再開が必要 |
| `blocked` | +0 | エージェントが正しく停止して質問した場合（良い挙動なのでペナルティなし） |

**修飾子：** Charter未読（+15）、許可リスト違反（+20）、同じエラーの繰り返し（×1.5）。

**閾値と強制：**
- **CD >= 50** → `lessons-learned.md`へのRCAエントリ追加が必須
- **CD >= 80** → セッション停止、ユーザーは要件を再指定する必要がある
- **`redo` >= 2** → オーケストレータが一時停止し、明示的なスコープ確認を要求
- **同じエージェントで連続3セッションの平均CD >= 30** → エージェントプロンプトテンプレートのレビュー対象

セッションログは`.serena/memories/session-metrics.md`にイベント単位の行（ターン、エージェント、イベントタイプ、ポイント、詳細）とサマリセクションとともに記録されます。

---

## 評価者精度とQAチューニング

QAエージェントは、追跡された判断ミスを通じて改善されます。CD（リアルタイム）と異なり、Evaluator Accuracy（EA）は事後的なものです。多くのエラーはセッション終了後に発見されます。

**EAイベントタイプ：**

| イベント | ポイント | 発見タイミング |
|-------|--------|-----------------|
| `false_negative` | +30 | 次のセッションまたは本番環境（QAが見逃したバグ） |
| `false_positive` | +15 | セッション中（実装エージェントがQAの指摘に対し正当な反論をした場合） |
| `severity_mismatch` | +10 | セッション中または次セッションのレビュー時（誤った重要度が割り当てられた場合） |
| `missed_stub` | +20 | ランタイム検証で表示専用の機能を捕捉した場合 |
| `good_catch` | -10 | QAが分かりにくいバグを捕捉した場合（ポジティブな報酬シグナル） |

**EAは直近3セッションのローリングウィンドウで計算されます。** 閾値は次のとおりです。
- **EA >= 30** → チューニング推奨: 蓄積されたEAイベントをレビューし、繰り返されるQA判断エラーを特定
- **EA >= 50** → チューニング必須：QAの`execution-protocol.md`を更新
- **ウィンドウ内で`false_negative` >= 3** → 検出パターンをQAの`checklist.md`に追加
- **ウィンドウ内で`good_catch` >= 5** → 成功パターンを`common-checklist.md`へ一般化

閾値を超えた場合は、蓄積されたEAイベントをレビューしてエラーを分類し、QAチェックリスト/実行プロトコルにパッチを適用し、次の3セッションで検証します。

---

## 複雑なタスクのスプリント分解

複雑なタスク（4つ以上のファイル、アーキテクチャ判断を含む）は、単一の長時間実行ではなく、スプリントベースの実行を使います。

1. **分解**: 各々が独立してテスト可能な、機能フォーカスのスプリント2〜4個に分解
2. **目標**: スプリントごとに5〜8ターン
3. **スプリントゲート**（各スプリントの後）：
   - スプリントの成果物は完成しているか？
   - lint/testは通るか？
   - スプリントが想定の2倍のターン数を要した場合 → チェックポイントを書き出し、ユーザーに通知
4. **継続**: ゲート通過時に次のスプリントへ

**例：** 「JWT認証 + CRUD API + テスト」というタスクは以下に分解されます。
- スプリント1：ユーザーモデル + 認証エンドポイント（register/login）
- スプリント2：CRUDエンドポイント + バリデーション
- スプリント3：テスト + エラーハンドリング

**難易度誤判の回復：** タスクがSimpleとして始まったがより複雑であることが判明した場合、エージェントは実行中にMediumまたはComplexプロトコルへアップグレードし、変更を進捗ログに記録します。

---

## コンテキストリセットプロトコル

長時間動作するエージェントは、コンテキストが満杯になるにつれて品質が低下します。エージェント自身ではなく、オーケストレータがこれを監視してリセットをトリガーします。

**トリガー条件**（オーケストレータがモニタリング中に確認）：

| 条件 | 検出 | アクション |
|-----------|-----------|--------|
| ターン予算の枯渇 | エージェントが想定ターン数の80%以上を消費 かつ 受入基準の達成が50%未満 | コンテキストリセット |
| 進捗の停止 | 進捗ファイルが3回以上連続のモニタリングサイクルで更新されない | コンテキストリセット |
| 浅い出力 | 結果ファイルがスタブマーカーまたはTODOプレースホルダーを含む | 明示的指示で再スポーン |

**リセット手順：**
1. **チェックポイント**: エージェントの現状を保存（完了項目、残項目、主要決定）
2. **終了**: 現在のエージェント実行を停止
3. **再スポーン**: チェックポイントをコンテキストとして新しいエージェントを起動
4. **再開**: 新しいエージェントがチェックポイントを読み、残項目のみから継続

オーケストレータを伴わないスタンドアロンのエージェントの場合、`difficulty-guide.md`のスプリントゲートが安全網として機能します。スプリントが想定の2倍のターン数を要したら、エージェントはチェックポイントを書き出してユーザーに通知します。
