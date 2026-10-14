---
title: "ガイド：単一スキル実行"
sidebar_label: 単一スキル
description: oh-my-agentで単一ドメインのタスクを実行するための詳細ガイドです。使用するタイミング、プリフライトチェックリスト、説明付きのプロンプトテンプレート、フロントエンド・バックエンド・モバイル・データベースの実例、想定される実行フロー、品質ゲートチェックリスト、エスカレーションシグナルを扱います。
---

# ガイド：単一スキル実行

単一スキル実行は、1つのエージェントが1つのドメインに集中して1つのタスクを処理する最短経路です。オーケストレーションのオーバーヘッドや、複数エージェント間の調整はありません。ホストまたは選択したワークフローが自然言語のプロンプトをスキルへルーティングする場合があります。フックシステム自体がワークフローを検出し、ルーティング動作は選択したランタイムによって決まります。

## クイックパス

1. `oma doctor`を1回実行し、選択したホスト統合を確認します。使用しないプロバイダーに関する警告は、そのプロバイダーを使わないタスクを妨げません。
2. 明確な **Goal**、**Context**、**Constraints**、**Done When** の条件を含む、自己完結した変更を1つ説明します。
3. 選択したスキルがリポジトリを調査し、アクティブな実行コントラクトで`CHARTER_CHECK`が必要な場合はスコープを示し、実際に実行したチェックを報告します。
4. タスクがAPI、UI、データベース、モバイルの境界をまたぐようになったら、単一スキルの実行を止めて`/work`または`/orchestrate`に切り替えます。

管理対象の実行が停止した場合は、`oma agent status <session-id> [agent-id]`を使ってから、`.agents/state/agent-runs/`の受領記録と注入された申告パスを確認して再試行します。プロバイダーと復旧の動作については、[重要なデフォルト](../getting-started/important-defaults.md)を参照してください。

---

## 単一スキルを使うタイミング

タスクが以下のすべての基準を満たす場合に使用します。

- **1つのドメインが担当**：タスク全体がフロントエンド、バックエンド、モバイル、データベース、デザイン、インフラストラクチャ、その他の単一ドメインに属する
- **自己完結**：ドメインをまたぐAPIコントラクトの変更がなく、フロントエンドのタスクにバックエンドの変更が必要ない
- **スコープが明確**：出力が明確である（コンポーネント、エンドポイント、スキーマ、修正など）
- **調整が不要**：他のエージェントが前後に実行する必要がない

**単一スキルタスクの例：**
- UIコンポーネントを1つ作成する
- APIエンドポイントを1つ追加する
- 1つのレイヤーにあるバグを修正する
- データベーステーブルを1つ設計する
- Terraformモジュールを1つ作成する
- i18n文字列を1組翻訳する
- デザインシステムのセクションを1つ作成する

**マルチエージェント**（`/work`または`/orchestrate`）に切り替えるべき場合：
- UI作業に新しいAPIコントラクトが必要（フロントエンド + バックエンド）
- 1つの修正が複数のレイヤーに波及する（デバッグ + 実装エージェント）
- 機能がフロントエンド、バックエンド、データベースにまたがる
- 最初のイテレーション後にスコープが1つのドメインを超える

テストと受入基準も単一スキルの作業に含まれます。これだけで`/ralph`が必要になるわけではありません。ドメイン間の調整や、明示的に依頼した品質プロセスについては、[スキルとワークフローの選び方](/docs/core-concepts/workflows#choosing-a-skill-or-workflow)を参照してください。

---

## プリフライトチェックリスト

プロンプトを作成する前に、以下の4つの質問に答えます。

| 要素 | 質問 | 重要な理由 |
|---------|----------|----------------|
| **Goal** | どの具体的な成果物を作成または変更するか | 曖昧さを防ぐ（「ボタンを追加する」と「バリデーション付きフォームを追加する」は異なります） |
| **Context** | どのスタック、フレームワーク、規約を適用するか | エージェントはプロジェクトファイルから検出しますが、明示した方が確実です |
| **Constraints** | どのルールに従うべきか（スタイル、セキュリティ、パフォーマンス、互換性） | 制約がないと、プロジェクトに合わないデフォルトが使われます |
| **Done When** | どの受入基準で確認するか | エージェントに目標を伝え、利用者には検証チェックリストを示します |

プロンプトにいずれかの要素がない場合、エージェントは次のように処理します。

- **不確実性がLOW**：デフォルトを適用し、仮定を列挙する
- **不確実性がMEDIUM**：2〜3個の選択肢を示し、最も可能性の高いものを使って進める
- **不確実性がHIGH**：質問して停止する（コードは書かない）

---

## プロンプトテンプレート

```text
Build <specific artifact> using <stack/framework>.
Constraints: <style, performance, security, or compatibility constraints>.
Acceptance criteria:
1) <testable criterion>
2) <testable criterion>
3) <testable criterion>
Add tests for: <critical test cases>.
```

### テンプレートの分解

| 部分 | 目的 | 例 |
|------|---------|---------|
| `Build <specific artifact>` | Goal（作成するもの） | 「ユーザー登録フォームのコンポーネントを作成する」 |
| `using <stack/framework>` | Context（技術スタック） | 「React + TypeScript + Tailwind CSS を使う」 |
| `Constraints:` | エージェントが従うルール | 「アクセシブルなラベル、外部フォームライブラリなし、クライアント側だけでバリデーション」 |
| `Acceptance criteria:` | Done When（検証可能な完了条件） | 「1) メール形式のバリデーション 2) パスワード強度インジケーター 3) 無効な間は送信を無効にする」 |
| `Add tests for:` | テスト要件 | 「有効または無効な送信経路、メールバリデーションの境界ケース」 |

---

## 実例

### フロントエンド：ログインフォーム

```text
Create a login form component in React + TypeScript + Tailwind CSS.
Constraints: accessible labels, client-side validation with Zod, no external form library beyond @tanstack/react-form, shadcn/ui Button and Input components.
Acceptance criteria:
1) Email validation with meaningful error messages
2) Password minimum 8 characters with feedback
3) Disabled submit button while form is invalid
4) Keyboard and screen-reader friendly (ARIA labels, focus management)
5) Loading state while submitting
Add unit tests for: valid submission path, invalid email, short password, loading state.
```

**想定される実行フロー：**

1. **スキルルーティング：** ホストまたはワークフローが`oma-frontend`を選択します（「form」「component」「Tailwind CSS」「React」などのキーワードがルーティングの手がかりです）。
2. **難易度評価：** Medium（2〜3ファイル。バリデーションUXについていくつか設計判断があります）。
3. **ロードされるリソース：**
   - `execution-protocol.md`（常にロード）
   - `snippets.md`（フォームとZodのパターン。スキルが提供する場合は既存コンポーネントのパターンも含む）
4. **実行コントラクト：** 有効な場合は`CHARTER_CHECK`を出力することがあります。
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: form validation, accessibility, loading state, tests
   - Assumptions: Next.js App Router, @tanstack/react-form + Zod, shadcn/ui, FSD-lite architecture
   ```
<!-- oma-docs:ignore-start -->
5. **実装：**
   - `src/features/auth/components/login-form.tsx`を作成（`"use client"`付きのClient Component）
   - `src/features/auth/utils/login-schema.ts`を作成（Zodスキーマ）
   - `src/features/auth/components/skeleton/login-form-skeleton.tsx`を作成
   - shadcn/uiの`<Button>`、`<Input>`、`<Label>`を使用（読み取り専用、変更なし）
   - `@tanstack/react-form`とZodでフォームを処理
   - `@/`による絶対インポートを使用
   - 1ファイルにつき1コンポーネント
6. **検証：**
   - チェックリスト：ARIAラベル、セマンティックな見出し、キーボード操作を確認
   - モバイル：320pxのビューポートで正しく表示
   - パフォーマンス：CLSなし
   - テスト：`src/features/auth/utils/__tests__/login-schema.test.ts`にVitestテストファイル
<!-- oma-docs:ignore-end -->

---

### バックエンド：REST APIエンドポイント

```text
Add a paginated GET /api/tasks endpoint that returns tasks for the authenticated user.
Constraints: Repository-Service-Router pattern, parameterized queries, JWT auth required, cursor-based pagination.
Acceptance criteria:
1) Returns only tasks owned by the authenticated user
2) Cursor-based pagination with next/prev cursors
3) Filterable by status (todo, in_progress, done)
4) Response includes total count
Add tests for: auth required, pagination, status filter, empty results.
```

**想定される実行フロー：**

1. **スキルルーティング：** ホストまたはワークフローが`oma-backend`を選択します（「API」「endpoint」「REST」などのキーワードがルーティングの手がかりです）。
2. **スタック検出：** `pyproject.toml`または`package.json`を読み、言語とフレームワークを判定します。生成された`stack/`参照または同梱された`variants/`があれば、そこから規約をロードします。
3. **難易度評価：** Medium（2〜3ファイル。route、service、repository、テスト）。
4. **ロードされるリソース：**
   - `execution-protocol.md`（常にロード）
<!-- oma-docs:ignore-start -->
   - 利用可能な場合は対応する`stack/snippets.md`または`variants/{node,python,rust}/snippets.md`
   - 対応する`stack/tech-stack.md`またはvariantのtech-stack参照
<!-- oma-docs:ignore-end -->
5. **実行コントラクト：** 有効な場合は`CHARTER_CHECK`を出力することがあります。
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: backend
   - Must NOT do: frontend UI, mobile screens, database schema changes
   - Success criteria: authenticated endpoint, cursor pagination, status filter, tests
   - Assumptions: existing JWT auth middleware, PostgreSQL, existing Task model
   ```
6. **実装：**
   - Repository：パラメーター化クエリを使う`TaskRepository.find_by_user(user_id, cursor, status, limit)`
   - Service：`TaskService.get_user_tasks(user_id, cursor, status, limit)`（ビジネスロジックのラッパー）
   - Router：JWT認証ミドルウェア、入力バリデーション、レスポンス整形を備えた`GET /api/tasks`
   - Tests：認証必須なら401、ページネーションなら正しいカーソル、フィルターが機能し、空の結果なら空配列を含む200

---

### モバイル：設定画面

```text
Build a settings screen in Flutter with profile editing (name, email, avatar), notification preferences (toggle switches), and a logout button.
Constraints: Riverpod for state management, GoRouter for navigation, Material Design 3, handle offline gracefully.
Acceptance criteria:
1) Profile fields pre-populated from user data
2) Changes saved on submit with loading indicator
3) Notification toggles persist locally (SharedPreferences)
4) Logout clears token storage and navigates to login
5) Offline: show cached data with "offline" banner
Add tests for: profile save, logout flow, offline state.
```

**想定される実行フロー：**

1. **スキルルーティング：** ホストまたはワークフローが`oma-mobile`を選択します（「Flutter」「screen」「mobile」などのキーワードがルーティングの手がかりです）。
2. **難易度評価：** Medium（設定画面、状態管理、オフライン処理）。
3. **ロードされるリソース：**
   - `execution-protocol.md`
   - `snippets.md`（画面テンプレート、Riverpodプロバイダーパターン）
   - `screen-template.dart`
4. **実行コントラクト：** 有効な場合は`CHARTER_CHECK`を出力することがあります。
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: mobile
   - Must NOT do: backend API changes, web frontend, database schema
   - Success criteria: profile editing, notification toggles, logout, offline
   - Assumptions: existing auth service, Dio interceptors, Riverpod, GoRouter
   ```
<!-- oma-docs:ignore-start -->
5. **実装：**
   - `lib/features/settings/presentation/settings_screen.dart`（Riverpodを使うStateless Widget）
   - `lib/features/settings/providers/settings_provider.dart`にプロバイダーを作成
   - `lib/features/settings/data/settings_repository.dart`にリポジトリを作成
   - オフライン処理：Dioインターセプターで`SocketException`を捕捉し、キャッシュデータにフォールバック
   - すべてのコントローラーを`dispose()`メソッドで破棄
<!-- oma-docs:ignore-end -->

---

### データベース：スキーマ設計

```text
Design a database schema for a multi-tenant SaaS project management tool. Entities: Organization, Project, Task, User, TeamMembership.
Constraints: PostgreSQL, 3NF, soft delete with deleted_at, audit fields (created_at, updated_at, created_by), row-level security for tenant isolation.
Acceptance criteria:
1) ERD with all relationships documented
2) External, conceptual, and internal schema layers documented
3) Index strategy for common query patterns (tasks by project, tasks by assignee)
4) Capacity estimation for 10K orgs, 100K users, 1M tasks
5) Backup strategy with full + incremental cadence
Add deliverables: data standards table, glossary, migration script.
```

**想定される実行フロー：**

1. **スキルルーティング：** ホストまたはワークフローが`oma-db`を選択します（「database」「schema」「ERD」「migration」などのキーワードがルーティングの手がかりです）。
2. **難易度評価：** Complex（アーキテクチャ上の判断、複数のエンティティ、キャパシティ計画）。
3. **ロードされるリソース：**
   - `execution-protocol.md`
   - `document-templates.md`（成果物の構成）
   - `examples.md`
   - `anti-patterns.md`（最適化時のレビュー）
4. **実行コントラクト：** 有効な場合は`CHARTER_CHECK`を出力することがあります。
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: database
   - Must NOT do: API implementation, frontend UI, infrastructure
   - Success criteria: schema, ERD, indexes, capacity estimate, backup strategy
   - Assumptions: PostgreSQL, 3NF, soft delete, multi-tenant with RLS
   ```
5. **ワークフロー：** 探索（エンティティ、リレーション、アクセスパターン、ボリューム見積もり）→設計（外部・概念・内部スキーマ、制約、ライフサイクル項目）→最適化（クエリパターン向けのインデックス、パーティショニング戦略、バックアップ計画、アンチパターンレビュー）
6. **成果物：**
   - 外部スキーマの概要（管理者、プロジェクトマネージャー、チームメンバーのロール別ビュー）
   - ERD付きの概念スキーマ（Organization 1:N Project、Project 1:N Task、Organization 1:N TeamMembershipなど）
   - 物理DDL、インデックス、パーティショニングを含む内部スキーマ
   - データ標準テーブル（フィールド命名規則、型の規約）
   - 用語集（tenant、workspace、assigneeなど）
   - キャパシティ見積もりシート
   - バックアップ戦略（日次フル + 毎時増分、30日保持）
   - マイグレーションスクリプト

---

## 品質ゲートチェックリスト

エージェントが成果物を提出したら、受け入れる前に次の項目を確認します。

### 全エージェント共通

- [ ] **動作が受入基準に合致**: プロンプトのすべての基準を満たしている
- [ ] **テストがハッピーパスと主要なエッジケースをカバー**: ハッピーパスだけではない
- [ ] **無関係なファイル変更なし**: タスクに関連するファイルのみ変更
- [ ] **共有モジュールが壊れていない**: インポート、型、インターフェースが正常
- [ ] **チャーターが遵守された**: 「Must NOT do」の制約が守られている
- [ ] **lint、typecheck、ビルドがパス**: プロジェクトの標準チェックを実行する

### フロントエンド固有

- [ ] アクセシビリティ：`aria-label`、セマンティック見出し、キーボードナビゲーション
- [ ] モバイル：320px、768px、1024px、1440pxで正しくレンダリング
- [ ] パフォーマンス：CLSなし、FCPターゲット達成
- [ ] Error BoundariesとLoading Skeletons実装
- [ ] shadcn/uiコンポーネントを直接変更していない（ラッパーを使用）
- [ ] `@/`による絶対インポートを使用している（相対的な`../../`は使わない）

### バックエンド固有

- [ ] クリーンアーキテクチャ維持：ルートハンドラにビジネスロジックなし
- [ ] すべての入力がバリデーション済み（ユーザー入力を信頼しない）
- [ ] パラメーター化クエリのみ（SQLでの文字列補間なし）
- [ ] 集約されたエラーモジュールによるカスタム例外（生のHTTP例外は使わない）
- [ ] 認証エンドポイントにレート制限

### モバイル固有

- [ ] すべてのコントローラーが`dispose()`で破棄
- [ ] オフラインが適切に処理
- [ ] 60fpsターゲット維持（カクつきなし）
- [ ] iOSとAndroidの両方でテスト済み

### データベース固有

- [ ] 3NF以上（非正規化の場合は根拠を文書化）
- [ ] 3つのスキーマ層すべてを文書化（外部、概念、内部）
- [ ] 整合性制約を明示（エンティティ、ドメイン、参照、ビジネスルール）
- [ ] アンチパターンレビュー完了

---

## エスカレーションシグナル

単一スキルからマルチエージェント実行に切り替えるべきことを示す、次のシグナルに注意してください。

| シグナル | 意味 | 対応 |
|--------|--------------|--------|
| エージェントが「バックエンドの変更が必要」と言う | クロスドメイン依存関係 | `/work`に切り替えてバックエンドエージェントを追加 |
| CHARTER_CHECKの「Must NOT do」に実際に必要な項目がある | スコープが1ドメインを超過 | まず`/plan`で機能全体を計画 |
| 修正が3つ以上の異なるレイヤーのファイルに波及 | 複数ドメインに影響 | `/debug`でスコープ拡大、または`/work` |
| APIコントラクトの不一致を発見 | フロントエンド/バックエンドの不整合 | `/plan`でコントラクト定義後、両エージェントを再スポーン |
| 品質ゲートが統合ポイントで失敗 | コンポーネントが正しく接続されない | `/review`を実行するか、QAパスを追加：`oma agent spawn qa "Review the integration" SESSION_ID --read-only` |
| タスクが「1コンポーネント」から「3コンポーネント + 新ルート + API」に膨張 | 実行中のスコープクリープ | 停止、`/plan`で分解、`/orchestrate`で実行 |
| エージェントがHIGH明確化でブロック | 要件が根本的に曖昧 | エージェントの質問に回答、または`/brainstorm`で方針を明確化 |

### 一般ルール

同じエージェントを修正付きで2回を超えて再スポーンしている場合、タスクはおそらくマルチドメインです。`/work`、または少なくとも`/plan`を実行して分解してください。

---

## 次のステップ

- タスクが複数のドメインにまたがる場合：[マルチエージェントプロジェクト](./multi-agent-project.md)
- タスクがバグの場合：[バグ修正](./bug-fixing.md)
- 実行を監査または再開する場合：[エージェントの結果と再開](./agent-results-and-resume.md)
- 何かが失敗した場合：[トラブルシューティング](./troubleshooting.md)
- スキルとワークフローのどちらを使うか選ぶ場合：[ワークフロー](../core-concepts/workflows.md#choosing-a-skill-or-workflow)
