---
title: プロジェクト構造
sidebar_label: プロジェクト構造
description: oh-my-agent のインストール結果を読むための案内です。`.agents/` の SSOT、代表的なスキルリソース、ワークフロー、リポジトリ内のエージェント定義、ランタイム状態、ベンダー統合層、ソースリポジトリの構成を説明します。
---

# プロジェクト構造

oh-my-agent をインストールすると、プロジェクトには2つの中心的なディレクトリツリーが追加されます。`.agents/` は単一の信頼できるソースで、`.agents/state/memories/` の調整用ストアも含みます。もう1つは `.claude/`、`.cursor/`、`.codex/` などのランタイム統合層です。コードインテリジェンスプロバイダーに Serena を選ぶと、Serena のオンボーディングメモリ用に任意の `.serena/` が存在する場合もあります。このページでは、トラブルシューティングで確認する共有ファイルと任意または生成されるパスを説明します。

---

## 代表的なディレクトリツリー

次のツリーでは、共有リソースと代表的なドメインスキルを詳しく示します。現在のカタログには33個のスキルディレクトリがあります。省略したスキルも、`SKILL.md` と、必要に応じた `resources/`、`variants/`、スキル固有のディレクトリという同じ構成です。生成されたファイルや任意のファイルがない場合は、実際の `.agents/` ツリーを基準にしてください。

```
your-project/
├── .agents/                          ← Single Source of Truth (SSOT)
│   ├── oma-config.cue / .yaml    ← Language, model_preset, providers, agent overrides
│   │
│   ├── skills/
│   │   ├── _shared/                  ← Resources used by ALL agents
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
│   │   │   │   ├── quality-principles.md
│   │   │   │   ├── vendor-detection.md
│   │   │   │   ├── session-metrics.md
│   │   │   │   ├── common-checklist.md
│   │   │   │   ├── lessons-learned.md
│   │   │   │   └── api-contracts/
│   │   │   │       ├── README.md
│   │   │   │       └── template.md
│   │   │   ├── runtime/
│   │   │   │   ├── memory-protocol.md
│   │   │   │   └── execution-protocols/
│   │   │   │       ├── claude.md
│   │   │   │       ├── antigravity.md
│   │   │   │       ├── codex.md
│   │   │   │       ├── commandcode.md / kimi.md / kiro.md
│   │   │   │       ├── opencode.md / pi.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/              ← execution, stack, Angular, snippets, checks
│   │   │
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, ORM, checklist, recovery
│   │   │   └── variants/               ← node, python, rust seeds / generated refs
│   │   │
│   │   ├── oma-mobile/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, tech stack, screen templates, checks
│   │   │   └── variants/               ← stack schema and generated platform refs
│   │   │
│   │   ├── oma-db/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── document-templates.md
│   │   │       ├── anti-patterns.md
│   │   │       ├── vector-db.md
│   │   │       ├── migration-playbook.md
│   │   │       ├── query-tuning.md
│   │   │       ├── iso-controls.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-design/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── anti-patterns.md
│   │   │   │   ├── checklist.md
│   │   │   │   ├── design-md-spec.md
│   │   │   │   ├── design-tokens.md
│   │   │   │   ├── prompt-enhancement.md
│   │   │   │   ├── stitch-integration.md
│   │   │   │   └── error-playbook.md
│   │   │   └── reference/
│   │   │       ├── typography.md
│   │   │       ├── color-and-contrast.md
│   │   │       ├── spatial-design.md
│   │   │       ├── motion-design.md
│   │   │       ├── responsive-design.md
│   │   │       ├── component-patterns.md
│   │   │       ├── accessibility.md
│   │   │       └── shader-and-3d.md
│   │   │
│   │   ├── oma-pm/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── examples.md
│   │   │       ├── iso-planning.md
│   │   │       ├── plan-phase-protocol.md
│   │   │       ├── task-template.json
│   │   │       └── error-playbook.md
│   │   │
│   │   ├── oma-qa/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── iso-quality.md
│   │   │       ├── checklist.md
│   │   │       ├── self-check.md
│   │   │       ├── error-playbook.md
│   │   │       └── verify-ship-protocol.md
│   │   │
│   │   ├── oma-debug/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── common-patterns.md
│   │   │       ├── debugging-checklist.md
│   │   │       ├── bug-report-template.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── ...
│   │   │
│   │   ├── oma-tf-infra/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── multi-cloud-examples.md
│   │   │       ├── cost-optimization.md
│   │   │       ├── policy-testing-examples.md
│   │   │       ├── iso-42001-infra.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-dev-workflow/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── validation-pipeline.md
│   │   │       ├── database-patterns.md
│   │   │       ├── api-workflows.md
│   │   │       ├── i18n-patterns.md
│   │   │       ├── release-coordination.md
│   │   │       └── troubleshooting.md
│   │   │
│   │   ├── oma-translation/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── translation-rubric.md
│   │   │       ├── anti-ai-patterns.md
│   │   │       └── lang/
│   │   │           ├── _template.md
│   │   │           ├── en.md
│   │   │           ├── ja.md
│   │   │           ├── ko.md
│   │   │           └── zh.md
│   │   │
│   │   ├── oma-orchestration/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── subagent-prompt-template.md
│   │   │   │   └── memory-schema.md
│   │   │   ├── scripts/
│   │   │   │   ├── spawn-agent.sh
│   │   │   │   ├── parallel-run.sh
│   │   │   │   └── verify.sh
│   │   │   ├── templates/
│   │   │   └── config/
│   │   │       └── cli-config.yaml
│   │   │
│   │   ├── oma-brainstorm/
│   │   │   └── SKILL.md
│   │   │
│   │   ├── oma-coordination/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       └── examples.md
│   │   │
│   │   └── oma-scm/
│   │       ├── SKILL.md
│   │       ├── config/
│   │       │   └── commit-config.yaml
│   │       └── resources/
│   │           └── conventional-commits.md
│   │
│   ├── workflows/                    ← 21 process definitions
│   │   ├── orchestrate.md             ← Persistent: automated parallel execution
│   │   ├── work.md                    ← Persistent: step-by-step coordination
│   │   ├── ultrawork.md               ← Persistent: 5-phase quality workflow
│   │   ├── ralph.md                   ← Persistent: repeated execution + judge
│   │   ├── plan.md / brainstorm.md / architecture.md
│   │   ├── deepinit.md / review.md / debug.md / design.md
│   │   ├── scm.md / tools.md / stack-set.md / convert.md
│   │   ├── docs.md / explain.md / recap.md / schedule.md / video.md
│   │   └── ...                         ← Keep this list aligned with `.agents/workflows/`
│   │
│   ├── agents/                        ← 12 checked-in subagent definitions
│   │   ├── architecture-reviewer.md / backend-engineer.md
│   │   ├── db-engineer.md / debug-investigator.md / docs-curator.md
│   │   ├── frontend-engineer.md / mobile-engineer.md / pm-planner.md
│   │   ├── qa-reviewer.md / refactor-engineer.md
│   │   ├── research-explorer.md / tf-infra-engineer.md
│   │
│   ├── results/                       ← Plans, claims, reports, and generated artifacts
│   ├── state/                         ← Active workflow state files
│   │   ├── orchestrate-state.json     ← (exists only when workflow is active)
│   │   ├── ultrawork-state.json
│   │   ├── work-state.json
│   │   └── memories/                  ← Coordination memory store (canonical path)
│   │       ├── orchestrator-session-{sessionId}.md ← Session ID, status, phase tracking
│   │       ├── task-board-{sessionId}.md          ← Task assignments and status
│   │       ├── progress-{agentId}-{taskId}-{runId}-{sessionId}.md ← Run-scoped progress updates
│   │       ├── result-{agentId}-{taskId}-{runId}-{sessionId}.md   ← Run-scoped final outputs
│   │       ├── session-metrics.md         ← Session evidence and experiment results
│   │       ├── experiment-ledger.md       ← Experiment tracking (conditional)
│   │       ├── session-work.md            ← Work workflow session state
│   │       ├── session-ultrawork.md       ← Ultrawork workflow session state
│   │       ├── session-cost-{sessionId}.md ← Per-session spawn cost telemetry
│   │       └── archive/
│   │           └── metrics-{date}.md      ← Archived session metrics
│   └── mcp.json                       ← MCP server configuration
│
├── .claude/                           ← IDE Integration Layer
│   ├── settings.json                  ← Hooks registration and permissions
│   ├── hooks/                         ← Only the variant's runtime-required files (see below)
│   │   ├── oma-hook.sh                ← Generated wrapper: resolves oma binary, exec oma hook "$@"
│   │   ├── hud.ts                     ← [OMA] statusline indicator (bun path, not routed via oma hook)
│   │   └── filter-test-output.sh      ← Test-output filter; in-process test-filter pipes Bash test commands through it
│   ├── skills/                        ← Symlinks → .agents/skills/
│   │   ├── oma-frontend -> ../../.agents/skills/oma-frontend
│   │   ├── oma-backend -> ../../.agents/skills/oma-backend
│   │   └── ...
│   └── agents/                        ← Subagent definitions for Claude Code
│       ├── backend-engineer.md
│       ├── frontend-engineer.md
│       └── ...
│
└── .serena/                           ← Optional: Serena MCP (only created if Serena is used)
    └── memories/                       ← Serena's own onboarding knowledge (code_style.md,
        │                                 project_purpose.md, ...); legacy coordination
        │                                 fallback for older projects
        └── ...
```

---

## `.agents/`: 信頼できるソース

ここはエージェントの動作を定める中心ディレクトリです。エージェントに必要なものはすべてここにあり、他のディレクトリはここから派生します。

### `oma-config.cue` と `oma-config.yaml`

**`oma-config.yaml`** は中央設定ファイルです。次を設定できます。
- `language`: 応答言語コード（en、ko、ja、zh、es、fr、de、pt、ru、nl、pl）
- `date_format`: タイムスタンプ形式（`ISO`、`US`、`EU`）。デフォルトは `ISO` です。
- `timezone`: IANA タイムゾーン識別子。省略するとシステムのタイムゾーンを使います。
- `model_preset`: アクティブなモデルプリセットキー（デフォルトは `auto`、または固定／カスタムプリセット）
- `providers`: docs、web、コードインテリジェンス、セマンティックメモリの機能プロバイダー
- `auto_update_cli`: CLI のバックグラウンド更新（デフォルトは `true`、`false` で無効）
- `telemetry`: ベンダーテレメトリーへの同意
- `mcp.devtools_browsers`: 任意のブラウザーリスト。未設定なら既存の項目を保持します。
- `agents`: エージェントごとの任意のオーバーライド（オブジェクト型の `AgentSpec` のみ）
- `models`: 任意のユーザー定義モデルスラッグ
- `custom_presets`: `extends:` を持つ任意のユーザー定義プリセット

### skills/

現在のカタログには、`_shared` リソースを含めて33個のスキルディレクトリがあります。`all` プリセットはこのライブツリーから生成されます。

**`_shared/`** は全エージェントが使うリソースです。
- `core/`: ルーティング、コンテキスト読み込み、プロンプト構造、明確化プロトコル、コンテキスト予算、難易度評価、推論テンプレート、品質原則、ベンダー検出、セッション指標、共通チェックリスト、学び、API コントラクトテンプレート
- `runtime/`: メモリプロトコル、イベント仕様、結果コントラクト、ベンダー固有の実行プロトコル
- `conditional/`: Quality Score、Experiment Ledger、Exploration Loop の測定。トリガーされたときだけ読み込みます。

**`oma-{skill}/`** はスキルごとのディレクトリです。それぞれに次があります。
- `SKILL.md`: スキルがルーティングされたときに読み込む Layer 1。役割、ルーティング、コアルールを定義します。
- `resources/`: オンデマンドで読む Layer 2。実行プロトコル、例、チェックリスト、エラー対応手順、技術スタック、スニペット、テンプレートを含みます。
- 一部のスキルには `variants/`（backend/mobile の種）、`stack/`（`/stack-set` が生成するリファレンス）、`reference/`（oma-design）、スキル固有のスクリプトや設定もあります。

### workflows/

`workflows/` にはスラッシュコマンドの挙動を定義する21個の Markdown ファイルがあります。各ファイルには次が含まれます。
- `description` を持つ YAML フロントマター
- 応答言語、手順の順序、MCP ツール要件を含む必須ルールセクション
- ベンダー検出の指示
- 手順ごとの実行プロトコル
- 永続ワークフローのゲート定義

永続ワークフローは `orchestrate.md`、`work.md`、`ultrawork.md`、`ralph.md` です。非永続ワークフローには `plan.md`、`brainstorm.md`、`architecture.md`、`deepinit.md`、`review.md`、`debug.md`、`design.md`、`scm.md`、`tools.md`、`stack-set.md`、`convert.md`、`docs.md`、`explain.md`、`recap.md`、`schedule.md`、`video.md` があります。

### agents/

Task tool（Claude Code）または CLI からサブエージェントをスポーンするときに使う、12個の定義ファイルがあります。各ファイルには次を定義します。
- フロントマターの `name`、`description`、`skills`（読み込むスキル）
- 実行プロトコルへの参照
- Charter Preflight（`CHARTER_CHECK`）テンプレート
- アーキテクチャ概要
- ドメイン固有の10個のルール
- 「`.agents/` ファイルを変更しない」という記載

### plan-\{sessionId\}.json

`/plan` ワークフローが生成するファイルです。エージェントの割り当て、優先度、依存関係、受入基準を含む構造化されたタスク分解で、`/orchestrate` と `/work` が読み取ります。対応する人間向けのトラッカーは `docs/plans/work/{NNN}-{name}.md` にあり、ライフサイクルは `Status` フィールドで管理します。永続的なデザインリファレンスは `docs/plans/designs/{NNN}-{name}.md` に並べて保存します。

### state/

永続ワークフローのアクティブな状態ファイルです。永続ワークフローの実行中だけ存在し、削除すると非アクティブになります。

### results/

エージェントが完了したときの結果ファイルです。ステータス、サマリー、変更ファイル、受入基準チェックリストを保存します。

### mcp.json

MCP サーバー設定です。サーバー定義、メモリ設定（`memoryConfig`）、`/tools` 管理用のツールグループ定義を含みます。

---

## `.claude/`: IDE 統合

このディレクトリは Claude Code や他の IDE を oh-my-agent に接続します。

### settings.json

Claude Code のフックと権限を登録します。

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [{
          "name": "oma-hook-UserPromptSubmit",
          "type": "command",
          "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/oma-hook.sh --vendor claude --event UserPromptSubmit",
          "timeout": 25
        }]
      }
    ]
  }
}
```

`statusLine` のエントリは、ホットパスの表示を保つため、`oma hook run` を経由しない直接の `bun` パスのままです。

### hooks/

ベンダーの `hooks/` ディレクトリには、ランタイムで実行または読み取りされるファイルだけが入ります。キーワード検出、永続モード、スキル注入などのハンドラーチェーンは、`oma` バイナリ内で `oma hook run` を介してインプロセスで実行されます。ハンドラーの `.ts` ファイルは CLI にバンドルされ、ベンダーのディレクトリには配置されません。

**`oma-hook.sh`** は `oma link`、`oma install`、`oma update` が生成するラッパースクリプトです。すべてのベンダーフックイベントはこのファイルを通ります。ランタイムでの解決順は `$OMA_BIN`（明示的な上書き）、`command -v oma`（PATH）、`$HOME/.bun/bin` や `$HOME/.local/share/mise/shims` などの既知のインストール先（GUI から起動したエージェントは PATH が限定されるため）、`exit 0`（失敗してもエージェントを止めない）です。マシン固有の内容は書き込まれないため、ファイルは開発者ごとに同じで安全にコミットできます。`"$@"` をそのまま渡すので、`--vendor`、`--event`、`--matcher` は `oma hook run` に届きます。プロジェクトとグローバルのインストールが同じイベントを登録した場合に二重実行を抑える自己重複排除の前置きも含みます。

**`hud.ts`** はステータスバーの `[OMA]` インジケーターを描画し、モデル名、コンテキスト使用率（緑／黄／赤）、アクティブなワークフロー状態を表示します。ホットパスの表示遅延を保つため、`oma hook run` ではなく `statusLine` に直接登録します。`statusLine` または HUD 専用イベントを登録する variant（例: claude、antigravity、qwen）だけに配置されます。自身のインストール先からベンダーの形式を推定するため、ベンダーごとのコピーにも意味があります。

**`filter-test-output.sh`** はテストランナーのノイズを削るシェルフィルターです。インプロセスの test-filter ハンドラーが、検出した Bash のテストコマンドを `<hookDir>/filter-test-output.sh` にパイプするよう書き換えます。そのため、`test-filter.ts` を登録する variant（cursor 以外）に配置されます。

#### ハンドラーロジックの実体

ハンドラーのソースは `.agents/hooks/core/` が SSOT で、`oma hook run` を介してインプロセスで実行されます。

**`keyword-detector.ts`** はキーワード検出用の純粋なハンドラー（`run(input, ctx): HandlerResult | null`）です。
1. 入力をサニタイズします（コードブロック、引用文字列、貼り付けたシステムエコーブロックを除去）。
2. クリアした入力をトリガーの `keywords`（リテラル）と `patterns`（正規表現）に照合します。
3. 各マッチの周囲60文字のウィンドウで情報パターンを確認します。
4. 強化ガードを適用します（同じワークフローが60秒以内に2回以上トリガーされた場合は抑制）。
5. `[OMA WORKFLOW: ...]` または `[OMA PERSISTENT MODE: ...]` をコンテキストへ注入する `context` 結果を返します。

**`persistent-mode.ts`** は `run()` を持つ純粋なハンドラーで、`.agents/state/` のアクティブな状態ファイルを確認し、永続モードを再適用します。`Stop` イベントで `oma hook run` からインプロセスで呼ばれます。

**`scm-guard.ts`** は Bash／シェルツールの `PreToolUse` で動く純粋なハンドラーです。秘密らしいファイルの `git add` を拒否します。`.agents/skills/oma-scm/config/commit-config.yaml` の `forbidden_patterns` から `allowed_exceptions` を除いた規則を適用し、設定がない場合は埋め込みのデフォルトを使います。claude、codex、cursor、grok、kimi、kiro、qwen のチェーンでは `test-filter` より前に動き、opencode ブリッジ（`tool.execute.before` から例外を投げてブロック）と pi ブリッジ（`tool_call` が `{ block: true, reason }` を返す）でも動きます。`OMA_SCM_ALLOW_SECRETS=1` を前置したコマンドは、ユーザーが明示的に承認した後にガードを迂回できます。広いステージング（`git add -A` / `git add .`）は、フックがユーザーの同意を観測できないため意図的にブロックしません。

**`code-intelligence-guard.ts`** は `PreToolUse` で動く純粋なハンドラー（`run()`）で、「Code Search」ルールを機械的に強制します。`providers.code_intelligence` が `serena`（または `gortex`）に解決され、かつ `providers.code_intelligence_guard` が `off` でない間は、ネイティブの検索ツール（Claude Code では `Grep`、`Glob`）と、先頭のバイナリが再帰的なコード検索（`rg`、`ag`、`ack`、`fd`、`grep -r`、`find -name`/`-path`、`git grep`）であるシェルコマンドを拒否します。拒否の理由には、代わりに使うプロバイダーのツール（`search_for_pattern`、`find_file`、`find_symbol`）が示されます。再帰的でない `grep`（パイプのフィルター、単一ファイル）、名前の条件がない `find`、読み取りには干渉しません。claude、codex、cursor、grok、kimi、kiro、qwen では `scm-guard` の直後に登録されます。インストーラーはチェーンのマッチャーの和集合を取るため、Claude の `PreToolUse` エントリは `Bash|Grep|Glob` になります。`OMA_CI_ALLOW_NATIVE=1` を含むシェルコマンドは引き続きガードを迂回しますが、それはあくまで、プロジェクト外のリソースや、ガードが認識しなかった無視対象のパスを検索するための運用者向けのエスケープハッチです。拒否の理由にこの前置きは示されず、プロジェクトのソースに対するフォールバックでもありません。

**`triggers.json`** は、ビルド時に `oma` バイナリへ静的にインライン化されるキーワードとワークフローの対応表です（ソースは `.agents/hooks/core/triggers.json`）。次を定義します。
- `workflows`: ワークフロー名から `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] }, explicit?: [...] }` へのマップ。`keywords` はリテラル句、`patterns` は正規表現文字列です（`iu` フラグでコンパイル）。`explicit`（永続ワークフローのみ）は、明示的な呼び出しとみなすキーワードの一覧です。永続モードを有効にするのはこれらだけで、それ以外の一致は提案として注入されます。
- `informationalPatterns`: 質問を示す句（自動検出から除外）
- `excludedWorkflows`: 明示的な `/command` 呼び出しが必要なワークフロー

`keywords`、`patterns`、`informationalPatterns` の言語セクションは次の規約です。
- `*`: Universal/English。
- `en`: 機能的には `*` と同じです。
- `ko`、`ja`、`zh` など: 言語固有の言い回しです。

すべてのセクションは常に読み込まれます。`.agents/oma-config.yaml` の `language` 設定が制御するのは応答言語だけです。単語境界はキーワード自体で決まります。ASCII のキーワードは単語全体に一致し、非 ASCII のテキストを含むキーワードは部分文字列として一致します。

#### ベンダーごとの materialization: before → after

以前のインストールでは、インプロセスのディスパッチにより大半が不要なコピーになっていたにもかかわらず、`.agents/hooks/core/` 全体（約20ファイル）を各ベンダーのフックディレクトリにコピーしていました。

```
# BEFORE — every vendor hookDir (.claude/hooks, .codex/hooks, .cursor/hooks, …)
hooks/
├── oma-hook.sh            ← executed (event dispatch)
├── hud.ts                 ← executed (statusLine)
├── filter-test-output.sh  ← read (test-filter pipe target)
├── keyword-detector.ts    ← dead copy (runs in-process via oma hook)
├── persistent-mode.ts     ← dead copy
├── skill-injector.ts      ← dead copy
├── state-boundary.ts      ← dead copy
├── test-filter.ts         ← dead copy
├── code-intelligence-primer.ts ← dead copy
├── triggers.json          ← dead copy (inlined into the oma binary)
├── types.ts, constants.ts, fs-utils.ts, hook-output.ts,
│   agentmemory-client.ts, agy-input.ts,
│   inject-log.ts, state-emit.ts, state-marker.ts,
│   vendor-renderer.ts     ← dead copies (handler-chain internals)
└── …
```

現在は、インストーラーがベンダー variant の JSON（`cli/platform/hooks-composer.ts` の `requiredVariantScripts`）から許可リストを作り、そのベンダーが実行または読み取るファイルだけを配置します。

```
# AFTER
.claude/hooks/              .codex/hooks/  .grok/hooks/  .kiro/hooks/
├── oma-hook.sh             ├── oma-hook.sh
├── hud.ts                  └── filter-test-output.sh
└── filter-test-output.sh
                            .cursor/hooks/  .commandcode/hooks/
.qwen/hooks/  .kiro/hooks/  └── oma-hook.sh
(same as .claude where the variant needs it)
```

| ベンダー | 配置されるファイル | 理由 |
|---|---|---|
| claude, qwen | `oma-hook.sh`、`hud.ts`、`filter-test-output.sh` | statusLine + test-filter |
| codex, grok, kiro | `oma-hook.sh`、`filter-test-output.sh` | test-filter、statusLine なし |
| cursor | `oma-hook.sh` | statusLine なし、test-filter なし |
| commandcode | `oma-hook.sh` | Stop のみ。Command Code にはプロンプトイベントがなく、PreToolUse で入力を書き換えられません（[hooks リファレンス](https://commandcode.ai/docs/hooks/reference)）。 |
| antigravity | なし（プロジェクト）。`hud.ts` とコアフックは `~/.gemini/antigravity-cli/hooks/` にコピー | agy は HOME の設定と `.agents/hooks.json` のワークスペースフックだけを読みます。ワークスペースフックは `.agents/hooks/core/` からハンドラーを直接実行します。プロジェクトの `.gemini/antigravity-cli/` は読み込まれません（`homeOnly` variant フラグ）。 |
| pi | `.agents/hooks/core/` 一式を `.pi/extensions/oma/` に配置 | pi ブリッジが設定フックではなくハンドラーをサブプロセスとして起動するため |

移行先のディレクトリはコピー前に消去されます。そのため、古いインストールで `oma install`、`oma update`、`oma link` を再実行すると、以前の全コピーに含まれていた不要なファイルも自動的に削除されます。

#### 隔離したハンドラーチェーンのデバッグ

実際のペイロードを使って、エージェントのライブセッションを起動せずに任意のハンドラーチェーンを実行できます。

```bash
# Inspect what keyword-detector injects for a given prompt
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Test a pre_tool block (Bash tool)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement
echo '{"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event Stop
```

`oma hook run` は常に終了コード0（fail-open）で終了します。標準出力が空なら、そのイベントのチェーンは何もしません。ハンドラーが起動すると、ベンダー形式の JSON（または kiro のプロンプトではプレーンテキスト）が標準出力に書かれます。

#### pre-019 インストールからの移行

古い `bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"` エントリがある既存のインストールは、次に `oma install`、`oma update`、`oma link` を実行したときに自動移行されます。インストーラーはマーカーを使って置き換えます。`name` や `command` のパターンで OMA 管理のフックグループだけを特定して置き換え、追加した独自のフックグループは元の順序のまま保持します。`statusLine` と HUD のパスは変わりません。pi のインプロセスブリッジも影響を受けません。ルーターの実装は `cli/commands/hook/command.ts`（内部では「design 019」）を、ベンダーごとの materialization は `cli/platform/hooks-composer/` を参照してください。

### skills/

`.agents/skills/` を指すシンボリックリンクです。`.claude/skills/` から読み取る IDE でも、SSOT は `.agents/` です。

### agents/

Claude Code の Agent tool 用に整形されたサブエージェント定義です。スキルファイルを参照し、`CHARTER_CHECK` テンプレートを含みます。

---

## `.agents/state/memories/`: ランタイム状態

オーケストレーション中にエージェントが書き込む場所です。`state/memories/` サブディレクトリが調整用メモリの標準パスで、CLI は最初にここを解決します。古いプロジェクトでは従来の `.serena/memories/` にフォールバックします。セッションとタスクボードのファイルにはセッション ID が付き、進捗と結果のファイルにはエージェント、タスク、実行、セッションの ID が付きます。ダッシュボードはこのディレクトリを監視します。

| ファイル | 所有者 | 目的 |
|------|-------|---------|
| `orchestrator-session-{sessionId}.md` | オーケストレーター | セッションのメタデータ（ID、状態、開始時刻、フェーズ） |
| `task-board-{sessionId}.md` | オーケストレーター | タスクの割り当て、優先度、状態、依存関係 |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | その実行 | ターンごとの進捗、読んだ／変更したファイル、現在の状態 |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | その実行 | 最終出力、完了状況、変更ファイル、受入基準 |
| `session-metrics.md` | オーケストレーター | 重要な訂正と実験の証拠 |
| `experiment-ledger.md` | オーケストレーター／QA | 実際の実験の証拠記録 |
| `session-work.md` | Work ワークフロー | Work ワークフローのセッション状態 |
| `session-ultrawork.md` | Ultrawork ワークフロー | Ultrawork ワークフローのセッション状態 |
| `session-cost-{sessionId}.md` | システム | セッションごとのコストテレメトリー |
| `archive/metrics-{date}.md` | システム | アーカイブしたセッション指標（30日保持） |

メモリファイルのパスとツール名は、`memoryConfig.provider`、`memoryConfig.basePath`、`memoryConfig.tools` を含む `.agents/mcp.json` の `memoryConfig` で設定できます。

Serena 自身のオンボーディングメモリ（`code_style.md`、`project_purpose.md` など）は `.serena/memories/` に残り、これらの調整用成果物とは別です。

---

## oh-my-agent ソースリポジトリの構造

oh-my-agent 自体を開発する場合（単に使う場合ではなく）、リポジトリはモノレポです。

```
oh-my-agent/
├── cli/                  ← CLI tool source (TypeScript, run with bun)
│   ├── cli.ts / bin/     ← CLI entry points
│   ├── commands/         ← User-facing command families
│   ├── platform/         ← Agent, vendor, skill, and hook adapters
│   ├── vendors/ / utils/ / types/
│   ├── package.json
│   └── install.sh        ← Bootstrap installer
├── web/                  ← Documentation site (Docusaurus)
│   ├── docs/             ← English documentation pages (base locale)
│   └── i18n/             ← Translated documentation pages
├── action/               ← GitHub Action for automated skill updates
├── docs/                 ← Translated READMEs and specifications
├── .agents/              ← EDITABLE in source repo (this IS the source)
├── .claude/              ← IDE integration
├── CLAUDE.md             ← Project instructions for Claude Code
└── package.json          ← Root workspace config
```

ソースリポジトリでは `.agents/` の変更が許可されます。これはソース本体だからです。`.agents/` を変更しないというルールは利用側プロジェクトに適用され、oh-my-agent リポジトリには適用されません。

開発コマンドはリポジトリのルートから実行します。
- `bun run test`: CLI テスト（vitest）
- `bun run lint`: CLI と web ワークスペースの lint
- `bun run build`: CLI のビルド
- `bun run typecheck`: CLI と web の型チェック
- コミットは Conventional Commit 形式に従う必要があります（commitlint が強制します）。
