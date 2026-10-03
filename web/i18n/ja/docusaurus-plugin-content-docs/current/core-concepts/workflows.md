---
title: ワークフロー
description: oh-my-agent の 21 ワークフローを網羅するリファレンスです。スラッシュコマンド、永続・非永続モード、11 言語のトリガーキーワード、フェーズとステップ、読み書きするファイル、`triggers.json` と `keyword-detector.ts` による自動検出、情報パターンのフィルタリング、永続モードの状態管理を説明します。
---

# ワークフロー

ワークフローは、スラッシュコマンドまたは自然言語のキーワードで起動する、構造化された複数ステップのプロセスです。単一フェーズのユーティリティから、5 フェーズの複雑な品質ゲートまで、エージェントがタスクでどう協力するかを定義します。

21 個のワークフローがあり、そのうち 4 個は永続的です。永続ワークフローは状態を維持し、誤って中断されません。

---

## スキルとワークフローの選び方 {#choosing-a-skill-or-workflow}

タスクに必要な調整と検証で選びます。すでにワークフローを選択している場合はそれに従い、明示的にキャンセルまたは変更するまで実行中のワークフローを続けます。新しいタスクでワークフローを選んでいない場合は、次のガイドを使います。

| タスクに必要なこと | 選択 | 例 |
|---|---|---|
| エージェントの調整を伴わない 1 つのドメイン | [単一スキル](/docs/guide/single-skill) | API エンドポイントを追加し、バリデーションをテストする |
| 計画、実装、QA を段階的に行う複数ドメイン | `/work` | API 変更と Web / モバイルクライアントを調整する |
| 独立したタスクの自動委任と並列実行 | `/orchestrate` | 依存関係を解決してからバックエンドとフロントエンドを並列実装する |
| 明示的に依頼された包括的な品質プロセス | `/ultrawork` | 計画、実装、検証、改善、リリース準備のレビューを一通り実行する |
| 機械的に検証できる基準を満たすまで繰り返すという明示的な依頼 | `/ralph` | ループのセーフガード内で、指定した回帰チェックが通るまで実装と独立検証を繰り返す |

`/orchestrate` は、エージェントをスポーンする前に使えるプランをロードするか、`/plan` で作成します。先に `/plan` を実行する必要はありません。既存のプランがあるかどうかで `/work` と `/orchestrate` を区別せず、作業をどう調整したいかで選びます。どちらも独立したタスクを並列実行できます。

受入基準とテストは単一スキルのタスクにも含めます。それだけでは `/ralph` は必要になりません。Ralph は各イテレーションで ultrawork の全プロセスと独立した判定を実行するため、検証ループを繰り返したい場合に選びます。セーフガードが適用されると、未完了またはブロックされた作業を残して停止することがあります。

この表は選択の助言であり、自動ワークフロールーターではありません。ホストエージェントは適切な方法を推奨できますが、ワークフローを推奨・説明するだけでは実行を開始しません。スラッシュコマンドが明示的な選択です。キーワード検出フックが有効なら、情報を尋ねる入力のフィルターに該当しない限り、設定済みキーワードまたはパターンへの一致でも起動します。検出器はドメイン数を分類せず、プランの準備状況も確認せず、この表を優先順位アルゴリズムとしても使いません。

プランレビューは、タスクについてすでに与えられた承認を引き継ぎます。エージェントが尋ねるのは、重要な未決定事項またはその範囲外の操作だけです。リリース準備レビュー自体は、公開やデプロイを承認するものではありません。

---

## 永続ワークフロー {#persistent-workflows}

永続ワークフローはすべてのタスクが完了するまで続きます。`.agents/state/` に状態を保持し、明示的に無効化するまで各ユーザーメッセージに `[OMA PERSISTENT MODE: ...]` コンテキストを再注入します。

永続モードが始まるのは、**明示的な呼び出し**があったときだけです。明示的な呼び出しとは、ワークフロー自身の名前を指します（`triggers.json` の `explicit` リスト。例："orchestrate"、"ultrawork"/"ulw"、"ralph"/"랄프"、"work mode"）。下に示すそのほかのトリガーキーワードは、自然言語のヒントです。これらは永続モードを有効にせず、ワークフローを提案として注入するだけです。プロンプトの最初または最後の行が `?` で終わる質問のときは、まったく起動しません。

### /orchestrate

**説明：** CLI による自動並列エージェント実行です。サブエージェントを CLI でスポーンし、永続的な実行状態と実行記録で調整し、進捗を監視して検証ループを実行します。

**永続：** はい。状態ファイルは `.agents/state/orchestrate-state.json` です。

**トリガーキーワード：**

| 言語 | キーワード |
|----------|----------|
| 明示的な呼び出し（永続） | "orchestrate", "オーケストレート", "orquestar", "orchestrer", "orchestrieren", "orquestrar", "оркестровать", "orkestreren", "orkiestrować" |
| English | "do everything", "run everything", "everything in parallel", "automate everything" |
| Korean | "전부 실행", "전부 해", "전부 병렬로", "자동으로 해줘" |
| Japanese | "全部実行", "全部並列で", "自動でやって" |
| Chinese | "编排", "全部执行", "全部并行", "自动处理" |
| Spanish | "ejecutar todo", "todo en paralelo" |
| French | "tout exécuter", "tout en parallèle" |
| German | "alles ausführen", "alles parallel" |
| Portuguese | "executar tudo", "tudo em paralelo" |
| Russian | "выполнить всё", "всё параллельно" |
| Dutch | "alles uitvoeren", "alles parallel" |
| Polish | "wykonaj wszystko", "wszystko równolegle" |

単独の "parallel" や "automate"（およびその翻訳語）はトリガーではありません。"run the tests in parallel" や "automate the release notes" は通常の依頼であり、マルチエージェントのオーケストレーションではありません。

**トリガー正規表現パターン**（意図と名詞ホワイトリスト。[自動検出：パターンフィールド](#pattern-field-raw-regex)を参照）：

| セクション | パターン | 起動する例 |
|---------|---------|----------------------|
| `*`（ユニバーサル） | `(build\|create\|make\|develop\|implement\|scaffold) + (me)? + (a\|an) + [modifier]{0,3} + <noun>` | "Build a TODO app with user authentication", "Create an awesome web service", "Develop a backend with PostgreSQL" |
| `*`（ユニバーサル） | `i want a/an + <noun>` | "I want a CLI for parsing logs" |
| `ko` | `<noun> + (을\|를\|이\|가)? + (만들어\|구현해\|개발해 + 변형)` | "TODO 앱 만들어줘", "REST API 구현해", "백엔드를 개발해주세요" |

名詞ホワイトリスト（14 個）：app、api、service、server、cli、tool、website、dashboard、system、backend、frontend、prototype、mvp、bot。単一の機能（"implement the login feature"、"로그인 기능 구현해줘"）や既存のもの（"make the API faster"）には一致しません。

**ステップ：**

1. **Step 0、準備：** coordination スキル、context-loading ガイド、memory protocol を読み、ベンダーを検出します。
2. **Step 1、プランのロード/作成：** `.agents/results/plan-{sessionId}.json`、次に最新の `plan-*.json` を確認します。プランがない場合、またはエージェント、優先度ティア、依存関係、受入基準のいずれかが欠けていて実行可能でない場合は、同じセッション ID を保ったまま `/plan` にインラインで作成を委任します。プランを提示し、既存の承認を引き継ぎます。委任前に確認するのは、重要な未決定事項または新しい承認が必要な場合だけです。
3. **Step 2、セッションの初期化：** `oma-config.yaml` をロードし、CLI マッピング表を表示します。プラン作成時のセッション ID を再利用するか、`session-YYYYMMDD-HHMMSS` を生成します。設定済みのメモリストアに `orchestrator-session-{sessionId}.md` と `task-board-{sessionId}.md` を作成します。
4. **Step 3、エージェントのスポーン：** 優先度ティアごとに、ベンダーに適した方法でエージェントをスポーンします。同じランタイムとベンダーならネイティブサブエージェントを使い、外部または異なるベンダーなら `oma agent spawn` を使います。MAX_PARALLEL を超えません。
5. **Step 4、モニタリング：** 実行単位の `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` と構造化された実行記録をポーリングし、タスクボードを更新します。完了、失敗、クラッシュを監視します。
6. **Step 5、検証：** 完了したエージェントごとに `verify.sh {agent-type} {workspace}` を実行します。失敗したらエラーのコンテキストを付けて最大 2 回まで再スポーンします。失敗が続く場合は別の仮説を検討する理由になり得ますが、すべての試行は同じ合計の復旧予算を消費します。予算で比較ラウンドを賄えない場合は、未解決の証拠を保全します。
7. **Step 6、収集：** 実行単位の結果ファイルと構造化された主張を読み、サマリーを作成します。
8. **Step 7、最終レポート：** セッションサマリーを提示します。実験を実施した場合は証拠と判断をまとめ、教訓を記録するのは再利用できる原因が特定できた場合に限ります。

**読み込むファイル：** `.agents/results/plan-{sessionId}.json`、`.agents/oma-config.yaml`、実行単位の進捗/結果ファイル、構造化された実行記録。

**書き込むファイル：** 設定済みメモリストアの実行単位のセッション/タスクボード状態、構造化された実行記録と主張、最終レポート。

**使用すべき場合：** 自動調整で最大限の並列処理が必要な大規模プロジェクト。

---

### /work

**説明：** 複数ドメインの作業を段階的に調整します。PM が最初に計画し、エージェントが承認済みの範囲で実行し、QA レビューと問題修正を続けます。

**永続：** はい。状態ファイルは `.agents/state/work-state.json` です。

**トリガーキーワード：**

| 言語 | キーワード |
|----------|----------|
| 明示的な呼び出し（永続） | "work mode", "work workflow" |
| Universal | "step by step" |
| English | "one by one", "one step at a time" |
| Korean | "단계별", "하나씩 해줘", "차근차근" |
| Japanese | "ステップバイステップ", "一歩ずつ" |
| Chinese | "逐步", "一步一步" |
| Spanish | "paso a paso", "uno por uno" |
| French | "étape par étape", "un par un" |
| German | "schritt für schritt", "der reihe nach" |

単独の "work" はトリガーではありません。日常的な語彙だからです（"Does this work on Windows?"）。

**ステップ：**

1. **Step 0、準備：** スキル、context-loading、memory protocol を読み、セッション開始を記録します。
2. **Step 1、要件分析：** 関係するドメインを特定します。単一ドメインなら直接エージェントを使うよう提案します。
3. **Step 2、PM エージェントによる計画：** PM が要件を分解し、API コントラクトと優先度付きタスク分解を作成して `.agents/results/plan-{sessionId}.json` に保存します。
4. **Step 3、プランのレビュー：** プランを提示し、既存の承認範囲で続行します。重要な未決定事項や新しい承認が必要な場合だけ質問します。
5. **Step 4、エージェントのスポーン：** 優先度ティアごとにスポーンし、同じティアでは並列実行します。ワークスペースは分けます。
6. **Step 5、モニタリング：** 進捗ファイルをポーリングし、エージェント間の API コントラクト整合性を検証します。
7. **Step 6、QA レビュー：** セキュリティ（OWASP）、パフォーマンス、アクセシビリティ、コード品質をレビューする QA エージェントをスポーンします。
8. **Step 6.1、計測（条件付き）：** 定義された比較が必要な場合に、ベースラインを記録します。
9. **Step 7、反復：** CRITICAL / HIGH の問題があれば担当エージェントを再スポーンします。同じ問題が 2 回続いたら Exploration Loop を起動します。

**使用すべき場合：** 複数ドメインにまたがり、計画・実装・QA を段階的に調整したい機能。

---

### /ultrawork

**説明：** 品質に焦点を当てたワークフローです。5 フェーズ、全 17 ステップ、12 個の分離レビューを持ち、各フェーズにゲートがあります。

**永続：** はい。状態ファイルは `.agents/state/ultrawork-state.json` です。

**トリガーキーワード：**

| 言語 | キーワード |
|----------|----------|
| 明示的な呼び出し（永続） | "ultrawork", "ulw" |

**フェーズとステップ：**

| フェーズ | ステップ | エージェント | レビュー観点 |
|-------|-------|-------|-------------------|
| **PLAN** | 1-4 | PM Agent（インライン） | 完全性、メタレビュー、過剰エンジニアリング/シンプルさ |
| **IMPL** | 5 | Dev Agents（スポーン） | 実装 |
| **VERIFY** | 6-8 | QA Agent（スポーン） | 整合性、安全性（OWASP）、回帰防止 |
| **REFINE** | 9-13 | Refactor Agent（スポーン） | ファイル分割、再利用性、カスケード影響、一貫性、デッドコード |
| **SHIP** | 14-17 | QA Agent（スポーン） | コード品質（lint / coverage）、UX フロー、関連課題、デプロイ準備 |

**ゲートの定義：**

- **PLAN_GATE：** プランを文書化し、前提を列挙し、代替案を検討し、過剰エンジニアリングをレビューし、スコープを承認します。
- **IMPL_GATE：** 適用対象の非出力チェックとテストが通り、計画したファイルだけを変更し、実際の実験ではベースラインの証拠を記録します。ビルドチェックは明示的に依頼された場合のみ実行します。
- **VERIFY_GATE：** 実装が要件に一致し、CRITICAL ゼロ、HIGH ゼロ、回帰なし、適用対象のプロジェクト計測目標を満たしています。
- **REFINE_GATE：** プロジェクトの保守性ルールに従い、統合機会を記録し、副作用を確認してコードを整理し、未解決の回帰がありません。
- **SHIP_GATE：** 品質チェック、UX 検証、関連課題、デプロイ準備チェックリストが完了し、適用対象のプロジェクト計測目標を最新の証拠で満たしています。既存の承認を引き継ぎますが、公開またはデプロイにはその操作の承認が必要です。

**ゲートに失敗した場合：** 1 回目は該当ステップへ戻って修正し、再試行します。同じ問題で 2 回目に失敗したら原因を再評価します。残りの予算内で試す価値のある代替案があれば、分離した実験を、必要な動作と定義済みの指標に照らして比較します。

**条件付きの拡張：** 定義済みの指標による比較、実験の判断と証拠、予算内での仮説探索、再利用できる原因に裏づけられた教訓。

**REFINE のスキップ条件：** 50 行未満の単純なタスク。

**使用すべき場合：** リリース準備状況を判断する前に完全なレビュー工程を実行したい場合。ワークフローはチェックと指摘を記録しますが、プロダクション準備完了の判断は行いません。

---

### /ralph

**説明：** 自己参照型の永続実行ループです。ultrawork を独立した検証担当で包み、各イテレーション後に完了基準を確認します。すべての基準が PASS なら完全完了、PASS と BLOCKED だけが残るなら部分完了を報告し、セーフガードが発動したら停止します。

**永続：** はい。状態ファイルは `.agents/state/ralph-state.json` です。

**トリガーキーワード：**

| 言語 | キーワード |
|------|-----------|
| 明示的な呼び出し（永続） | "ralph", "랄프" |
| English | "don't stop", "until done", "keep going until", "finish everything", "run to completion" |
| Korean | "멈추지마", "끝까지 해", "완료될때까지", "때까지 계속", "끝장내" |
| Japanese | "止まるな", "完了まで", "最後まで", "全部終わらせて" |
| Chinese | "不要停", "直到完成", "全部完成", "做完为止" |
| Spanish | "no pares", "hasta completar", "termina todo" |
| French | "n'arrête pas", "jusqu'à complétion", "termine tout" |
| German | "hör nicht auf", "bis zur fertigstellung", "alles fertigstellen" |

単独の再開フレーズ（"keep going"、"carry on"、"계속해"、"続けて"、"продолжай" など）はトリガーではありません。ユーザーは中断後に再開するためにこれらを入力するからです。

**フェーズ：**

1. **Phase 0、INIT：** 前提（context-loading、memory protocol、judge protocol）をロードします。テストのアサーション、非出力型チェック、終了コード、ファイルの存在など、機械的に検証できる完了基準を定義して記録します。ビルドチェックは明示的に依頼された場合だけ含めます。基準を提示して承認済みの範囲で続行し、`max_iterations: 5` でセッションを初期化します。
2. **Phase 1、WORK：** ultrawork（PLAN → IMPL → VERIFY → REFINE → SHIP）を 1 回のイテレーションとして実行します。
3. **Phase 2、JUDGE：** 独立した検証担当が、承認済みのチェックを実行してファイルの存在を確認します。実際のプロジェクト状態に対する根拠と、PASS、FAIL、REGRESSED、BLOCKED の基準状態を記録します。
4. **Phase 3、DECIDE：** すべての基準が PASS なら完全完了を報告します。PASS と BLOCKED だけなら部分完了を報告します。FAIL または REGRESSED があれば、セーフガードの範囲内で失敗のコンテキストを次のイテレーションへ渡します。
5. **セーフガード：** `current_iteration >= max_iterations`（デフォルト 5）に達した場合、または同じ根本原因で同じ基準が 3 回連続して失敗した場合（スタック検出）にループを停止します。

**/ultrawork との主な違い：** Ultrawork は 5 フェーズのプロセスを実行し、フェーズのゲートに失敗すると再試行します。Ralph は ultrawork をリトライループに包み、独立した判定担当が完了を客観的に検証します。ループは完全完了、ブロックされた作業を残す部分完了、またはセーフガードレポートで終了します。

**読み込むファイル：** `.agents/workflows/ralph/resources/judge-protocol.md`、ultrawork の全ファイル。

**書き込むファイル：** `session-ralph.md`（メモリ）、イテレーションログ、最終レポート。

**使用すべき場合：** 機械的に検証できる完了基準に対して、実行と独立検証を繰り返すことを明示的に希望する場合。テストがあるだけでは Ralph は必要ありません。各イテレーションで ultrawork 全体を実行し、セーフガードを考慮します。

---

## 非永続ワークフロー

### /plan

**説明：** PM 主導でタスクを分解します。要件を分析し、技術スタックを選び、依存関係付きの優先タスクと API コントラクトを定義します。

**トリガーキーワード：**

| 言語 | キーワード |
|----------|----------|
| Universal | "task breakdown" |
| English | "plan" |
| Korean | "계획", "요구사항 분석", "스펙 분석" |
| Japanese | "計画", "要件分析", "タスク分解" |
| Chinese | "计划", "需求分析", "任务分解" |

**ステップ：** 要件収集 -> 技術的実現可能性の分析（MCP コード解析） -> 複雑度の評価（Simple / Medium / Complex） -> 必要なら API コントラクトを定義 -> タスクを分解 -> ユーザーレビュー -> 成果物を保存（機械可読 JSON と、Medium / Complex の場合は人間向け Markdown トラッカー）。

**出力：** `.agents/results/plan-{sessionId}.json`、メモリ書き込み、Medium / Complex では `docs/plans/work/{NNN}-{name}.md`（タスク表、決定ログ、進捗ノート付き）。ライフサイクルは Markdown ヘッダーの `Status` フィールド（`Active` -> `Completed`）で管理します。プランをフォルダー間で移動しません。`/brainstorm` で作成した設計は `docs/plans/designs/{NNN}-{name}.md` に保存します。

**実行：** インラインで行い、サブエージェントはスポーンしません。`/orchestrate` または `/work` が実行中にタスクとステータスを更新します。

---

### /brainstorm

**説明：** デザインファーストのアイデア出しです。意図を探索し、制約を明確化し、2〜3 のアプローチを提案して、計画前に承認済みの設計ドキュメントを作成します。

**トリガーキーワード：**

| 言語 | キーワード |
|----------|----------|
| Universal | "brainstorm" |
| English | "ideate", "explore design" |
| Korean | "브레인스토밍", "아이디어", "설계 탐색" |
| Japanese | "ブレインストーミング", "アイデア", "設計探索" |
| Chinese | "头脑风暴", "创意", "设计探索" |

**ステップ：** プロジェクトコンテキストを探索（MCP 解析） -> 一度に 1 つずつ確認質問 -> トレードオフ付きで 2〜3 のアプローチを提案 -> ユーザーの承認を得ながらセクション単位で設計を提示 -> `docs/plans/designs/{NNN}-{name}.md` に設計を保存 -> `/plan` を提案。

**ルール：** 設計の承認前に実装や計画を行いません。コードを出力しません。YAGNI を守ります。

---

### /architecture

**説明：** アーキテクチャの問題を診断し、診断ルーティング / design-twice / ATAM / CBAM / ADR の適切な分析手法を選び、選択肢を比較し、ステークホルダーの意見を統合して、推奨案、レビュー、または ADR を作成します。

**トリガーキーワード：**

| 言語 | キーワード |
|----------|----------|
| Universal | "architecture", "ADR", "ATAM", "CBAM" |
| English | "architecture review", "architectural tradeoff" |
| Korean | "아키텍처", "설계 검토" |
| Japanese | "アーキテクチャ" |
| Chinese | "架构" |

**ステップ：** 判断を枠付け（新しいアーキテクチャ / レビュー / トレードオフ分析 / 投資優先順位付け / ADR 作成） -> 診断ルーティングで方法を選択 -> MCP コード解析（`get_symbols_overview`、`find_symbol`、`find_referencing_symbols`）で現在のアーキテクチャを分析 -> 必要な場合だけステークホルダーの意見を統合 -> 前提、トレードオフ、リスク、検証手順が明確な推奨案を作成 -> 実装が必要なら `/plan` に引き渡します。

**ルール：** このワークフローで実装コードやタスク計画を書きません。アーキテクチャの判断後は `/plan` に引き渡します。MCP ツールを使い、生のファイル読み取りや grep で代替しません。

**使用すべき場合：** システムアーキテクチャ、モジュール/サービス/所有権の境界、リファクタリングの優先順位、ADR の作成、変更の増幅・隠れた依存関係・扱いにくい API などのアーキテクチャ上の問題。

---

### /deepinit

**説明：** 既存のコードベースを分析し、AGENTS.md、ARCHITECTURE.md、構造化された `docs/` ナレッジベースを生成してプロジェクトを初期化します。

**トリガーキーワード：**

| 言語 | キーワード |
|----------|----------|
| Universal | "deepinit" |
| Korean | "프로젝트 초기화" |
| Japanese | "プロジェクト初期化" |
| Chinese | "项目初始化" |

**ステップ：** 準備 -> コードベースの分析（プロジェクト種別、アーキテクチャ、暗黙のルール、ドメイン、境界） -> ARCHITECTURE.md を生成（ドメインマップ、200 行未満） -> `docs/` ナレッジベースを生成（design-docs/、plans/、generated/、product-specs/、references/、ドメイン文書） -> ルート AGENTS.md を生成（目次付き、約 100 行） -> 境界 AGENTS.md を生成（モノレポのパッケージごと、各 50 行未満） -> 既存ハーネスを更新（再実行の場合） -> 検証（デッドリンクと行数制限がないこと）。

**出力：** AGENTS.md、ARCHITECTURE.md、docs/design-docs/、docs/plans/、docs/PLANS.md、docs/QUALITY-SCORE.md、docs/CODE-REVIEW.md、検出したドメイン固有のドキュメント。

---

### /review

**説明：** OWASP Top 10 のセキュリティ監査、パフォーマンス分析、WCAG 2.1 AA のアクセシビリティ確認、コード品質レビューを行う QA パイプラインです。

**トリガーキーワード：**

| 言語 | キーワード |
|----------|----------|
| Universal | "code review", "security audit", "security review" |
| English | "review" |
| Korean | "리뷰", "코드 검토", "보안 검토" |
| Japanese | "レビュー", "コードレビュー", "セキュリティ監査" |
| Chinese | "审查", "代码审查", "安全审计" |

**ステップ：** レビュー範囲の特定 -> 自動セキュリティチェック（npm audit、bandit） -> OWASP Top 10 の手動セキュリティレビュー -> パフォーマンス分析 -> WCAG 2.1 AA のアクセシビリティレビュー -> コード品質レビュー -> QA レポートの生成。

**任意の修正・検証ループ**（`--fix`）：QA レポート後にドメインエージェントをスポーンして CRITICAL / HIGH を修正し、QA を再実行します。最大 3 回繰り返します。

**委任：** 範囲が大きい場合は、Step 2〜7 をスポーンした QA サブエージェントに委任します。

---

### /deepsec

**説明：** `oma-deepsec` スキルをエンドツーエンドで実行します。`.deepsec/` のインストール、コストの校正、scan / process / triage / revalidate / export、`process --diff` による PR ゲート、カスタムマッチャーの作成、指摘の専門エージェントへのルーティングを行います。インラインで実行し、サブエージェントはスポーンしません。

**トリガーキーワード：**

| 言語 | キーワード |
|----------|----------|
| Universal | `/deepsec`、`deepsec workflow` |
| English | `run deepsec`、`deepsec scan this repo`、`scan repo with deepsec`、`deepsec pr review`、`deepsec ci gate`、`deepsec triage`、`deepsec matchers` |
| Korean | "딥섹 워크플로우", "딥섹 실행", "딥섹 스캔", "딥섹으로 검사", "딥섹 PR 리뷰", "딥섹 CI 게이트" |
| Japanese | "ディープセック実行", "deepsecワークフロー", "deepsecでスキャン", "deepsec PRレビュー" |
| Chinese | "运行 deepsec", "deepsec 工作流", "用 deepsec 扫描", "deepsec PR 审查" |

**ステップ：**

1. **Step 1、スキルのロード：** `.agents/skills/oma-deepsec/SKILL.md` を読み、解決した意図に合うリソース（`setup.md`、`scanning.md`、`pr-review.md`、`matchers.md`、`triage.md`、`config.md`）だけをロードします。リポジトリルートに `.deepsec/` が存在する場合は増分実行とみなし、再度 `init` しません。
2. **Step 2、意図の分類：** `setup`、`scan`、`pr-review`、`matchers`、`triage`、`config`、`troubleshoot` のいずれか 1 つに解決します。複数の意図は順番に実行します。`.deepsec/` がない場合は AI 呼び出しの意図より前に `setup` を入れます。
3. **Step 3、エージェント選択の確認：** 有料の呼び出しの前に、`claude`（最も強い推論、最も高価）か `codex`（読み取り専用サンドボックス、安価）を確認します。ユーザーが指定した場合、`deepsec.config.ts` が `defaultAgent` を固定している場合、またはユーザーが選択を委任した場合は省略します。
4. **Step 4、解決した意図の実行：**
   - **4A `setup`：** `bunx deepsec init`、`bun install`、`.env.local` の編集を実行し、`scan --limit 20` + `process --limit 5` で確認し、プロジェクト固有の `data/<id>/INFO.md`（50〜100 行）を作成します。`INFO.md` にはユーザー確認が必要です。
   - **4B `scan`：** `--limit 50 --concurrency 5` でスキャンを校正し、コストを外挿して明示的な許可を得てから完全な `process` を実行し、`triage --severity HIGH` + `revalidate --min-severity HIGH`、`export --format md-dir` + `metrics` を続けます。
   - **4C `pr-review`：** `process --diff origin/${BASE_REF} --comment-out comment.md` を直接実行します。`pull-requests: write` を付けない `analyze` と、サニタイズ済み成果物だけを読む `comment` の 2 ジョブ CI パターンを出力します。終了コード `1` は新規の指摘が少なくとも 1 件あることを示します。
   - **4D `matchers`：** `data/<id>/files/` を入口の抜けについて確認し、適切なノイズ階層（`precise` / `normal` / `noisy`）で `.deepsec/matchers/<slug>.ts` を作成し、`.deepsec/deepsec.config.ts` に接続して `scan --matchers` で検証します。
   - **4E `triage`：** `triage --severity HIGH` -> `revalidate --min-severity HIGH` を実行し、エクスポートは `true-positive` / `uncertain` だけに絞ります。繰り返す FP の形を次の `INFO.md` の改訂用に記録します。
   - **4F `config` / `troubleshoot`：** `resources/config.md` の症状表を適用します。
5. **Step 5、要約とルーティング：** project id、pass type、agent/model、files scanned、findings、TP after revalidate、cost、wall time、stop conditions を含む実行サマリーを作ります。脆弱なファイルの**レイヤー**に応じて後続をルーティングします（backend -> `oma-backend`、frontend -> `oma-frontend`、mobile -> `oma-mobile`、IaC -> `oma-tf-infra`、DB -> `oma-db`、CI -> `oma-dev-workflow`、ドキュメントドリフト -> `oma-docs`、入口の抜け -> 4D に戻る）。レイヤーが曖昧、または `revalidation.verdict === "uncertain"` の場合は、まず `oma-debug` をトリアージの中継として使います。
6. **Step 6、停止条件：** 意図と Step 5 の要約が完了した場合、ブロック条件（認証情報不足、`INFO.md` の拒否）がある場合、または安全な再開コマンドを提示できるクォータ停止で終了します。

**読み込むファイル：** `.agents/skills/oma-deepsec/SKILL.md`、意図に対応する `.agents/skills/oma-deepsec/resources/*.md`、`data/<id>/INFO.md`、`data/<id>/files/`、`deepsec.config.ts`。

**書き込むファイル：** `setup` では `.deepsec/`、`.env.local`（gitignore 対象）、`data/<id>/INFO.md`、`matchers` では `.deepsec/matchers/<slug>.ts`、`export` では `findings/`、`pr-review` では `comment.md`。

**ルール：** このワークフローでは製品ソースコードを変更せず、専門エージェントに引き渡します。認証情報（`vck_…`、`sk-ant-…`、OIDC トークン）を表示またはコミットしません。PR から制御されたコードを実行する CI ジョブに `pull-requests: write` を付与しません。リセットせず再開します。中断したら同じコマンドを再実行し、明示的なユーザー指示なしに `rm -rf data/<id>/` を実行しません。

**使用すべき場合：** リポジトリのエージェント駆動脆弱性スキャン、`process --diff` による CI / PR セキュリティゲート、入口の網羅性を高めるプロジェクト固有マッチャーの作成、既存指摘のトリアージによる FP 削減。

---

### /debug

**説明：** 再現、診断、修正、回帰テスト、類似パターンのスキャンを含む構造化されたバグ診断と修正です。

**トリガーキーワード：**

| 言語 | キーワード |
|----------|----------|
| Universal | "debug" |
| English | "fix bug", "fix error", "fix crash" |
| Korean | "디버그", "버그 수정", "에러 수정", "버그 찾아", "버그 고쳐" |
| Japanese | "デバッグ", "バグ修正", "エラー修正" |
| Chinese | "调试", "修复 bug", "修复错误" |

**ステップ：** エラー情報を収集 -> MCP（`search_for_pattern`、`find_symbol`）で再現 -> MCP の `find_referencing_symbols` で実行経路を追跡して根本原因を診断 -> 最小修正を提案（ユーザー確認が必要） -> 修正と回帰テストを実装 -> 類似パターンをスキャン（10 ファイル超なら debug-investigator サブエージェントをスポーンできる） -> メモリにバグを記録します。

**サブエージェントのスポーン条件：** エラーが複数ドメインにまたがる、スキャン対象が 10 ファイルを超える、または深い依存関係の追跡が必要な場合。

---

### /design

**説明：** DESIGN.md、トークン、コンポーネントパターン、アクセシビリティルールを生成する 7 フェーズのデザインワークフローです。

**トリガーキーワード：**

| 言語 | キーワード |
|----------|----------|
| Universal | "design system", "DESIGN.md", "design token" |
| English | "design", "landing page", "ui design", "color palette", "typography", "dark theme", "responsive design", "glassmorphism" |
| Korean | "디자인", "랜딩페이지", "디자인 시스템", "UI 디자인" |
| Japanese | "デザイン", "ランディングページ", "デザインシステム" |
| Chinese | "设计", "着陆页", "设计系统" |

**フェーズ：** SETUP（コンテキスト収集、`.design-context.md`） -> EXTRACT（任意、参照 URL / Stitch から） -> ENHANCE（曖昧なプロンプトの補強） -> PROPOSE（色、タイポグラフィ、レイアウト、モーション、コンポーネントを含む 2〜3 の方向性） -> GENERATE（DESIGN.md + CSS / Tailwind / shadcn トークン） -> AUDIT（レスポンシブ、WCAG 2.2、Nielsen ヒューリスティクス、AI スロップ確認） -> HANDOFF（保存してユーザーに通知）。

**必須事項：** すべての出力をレスポンシブファーストにします（モバイル 320〜639px、タブレット 768px 以上、デスクトップ 1024px 以上）。

---

### /scm

**説明：** 機能ごとの自動分割を伴う Conventional Commits を生成します。

**トリガーキーワード：** なし（自動検出から除外）。

**ステップ：** 変更を分析（git status、git diff） -> 5 ファイルを超え、異なるスコープ/種類にまたがる場合は機能を分割 -> 種類を決定（feat / fix / refactor / docs / test / chore / style / perf） -> 変更モジュールからスコープを決定 -> 命令形で説明を作成（72 文字未満） -> 直ちにコミットを実行（確認プロンプトなし）。

**ルール：** `git add -A` を使いません。シークレットをコミットしません。複数行メッセージには HEREDOC を使います。Co-Author トレーラーは、有効な `scm.co_author` 設定に名前とメールアドレスがある場合だけ追加します。

---

### /tools

**説明：** MCP ツールの可視性と制限を管理します。

**トリガーキーワード：** なし（自動検出から除外）。

**機能：** 現在の MCP ツール状態の表示、ツールグループ（memory、code-analysis、code-edit、file-ops）の有効化/無効化、永続または一時（`--temp`）変更、自然言語の解析（「memory tools only」「disable code edit」）。

**ツールグループ：**

- memory: read_memory、write_memory、edit_memory、list_memories、delete_memory
- code-analysis: get_symbols_overview、find_symbol、find_referencing_symbols、search_for_pattern
- code-edit: replace_symbol_body、insert_after_symbol、insert_before_symbol、rename_symbol
- file-ops: list_dir、find_file

---

### /convert

**説明：** メディアのカテゴリに応じてルーティングし、ファイルを別の形式に変換します。**ドキュメント**（PDF は `opendataloader-pdf` / `oma-pdf`、HWP / HWPX / HWPML は `kordoc` / `oma-hwp`）は Markdown に抽出します。**画像**、**動画**、**音声**は `oma-video` 用に導入済みの `ffmpeg` でトランスコードします。

**トリガーキーワード：** なし（入力ファイルパスを明示して起動）。

**ステップ：** 入力を検証してカテゴリでルーティング（ドキュメント `.pdf` / `.hwp*`、画像 `.jpg` / `.png` / `.webp` / …、動画 `.mp4` / `.mov` / …、音声 `.mp3` / `.wav` / …） -> ターゲット形式を決定（ドキュメントのデフォルトは Markdown、メディアは明示的な `--to`） -> 変換（PDF：`uvx opendataloader-pdf`、スキャン PDF はハイブリッド OCR、HWP：`bunx kordoc@latest`、メディア：`ffmpeg`） -> ドキュメントを正規化（PDF：`uvx mdformat`、HWP：`flatten-tables.ts`） -> 検証（Markdown を読み取り、メディアは `ffprobe`） -> 変換元から変換先の形式と画質・コーデックの選択を報告します。

**ルール：** カテゴリでルーティングし、ドキュメント変換器をメディアに、またはその逆に使いません。出力先のデフォルトは入力と同じディレクトリです。メディアでは画質・コーデックの選択を報告します（トランスコードは可逆ではありません）。ステップを省略しません。応答言語は `.agents/oma-config.yaml` に従います。

**使用すべき場合：** LLM / RAG の取り込み用に PDF や韓国語 HWP 系の文書を Markdown へ変換する場合、または画像（jpg→webp/png）、動画（mov→mp4、mp4→gif）、音声（wav→mp3）をトランスコードする場合。

---

### /docs

**説明：** `oma-docs` によるドキュメントドリフトの検出と同期です。Verify はすべてのリポジトリ Markdown（デフォルトの glob は `**/*.md`）で壊れた参照を探し、Sync は Git 差分で影響を受けるドキュメントごとのパッチを提案します。インラインで実行し、ベンダーに関わらず `oma docs` を直接呼び出します。

**トリガーキーワード：** Universal：`oma-docs`、`docs verify`、`docs sync`。English：`verify docs`、`check docs`、`docs drift`、`broken doc links`、`stale docs`、`sync docs`、`patch docs`。Korean：`문서 검증`、`문서 드리프트`、`문서 동기화`。Japanese：`ドキュメント検証`、`ドキュメント同期`。Chinese：`文档校验`、`文档同步`。

**ステップ：** モードを検出（デフォルトは `verify`、プロンプトが sync または Git 差分範囲を含む場合は `sync`） -> 事前確認（`command -v oma`。Sync では使用可能な差分を確認し、`HEAD~1..HEAD` にフォールバック） -> Verify：`oma docs verify --json`（終了コード `0` はクリーン、`1` は壊れた参照）または Sync：範囲に対する `oma docs sync --json` -> ホスト LLM 契約に従って結果を合成（Verify は CRITICAL / HIGH / MEDIUM / LOW 別に具体的な修正、Sync は最小の unified-diff パッチ） -> Sync パッチを文書ごとに対話的に提示（`[y] apply [n] skip [d] show diff [s] show full proposal`。自動適用しない） -> 適用したら `oma docs verify --json` でインデックスを再生成 -> モード、種類別件数、`docs/generated/doc-refs.json` / `url-drift.json` の場所を報告。

**ルール：** Sync パッチを自動適用しません（文書ごとに `[y]` の確認が必要）。`.agents/`（SSOT）を変更しません。`oma docs` がない場合はインストール案内を表示して終了し、手動 grep にフォールバックしません。

**読み込むファイル：** 対象 Markdown（`**/*.md` または指定 glob）、Sync の `git diff` にある `changedFiles`。

**書き込むファイル：** Verify で常に再生成する `docs/generated/doc-refs.json`、URL チェック時の `docs/generated/url-drift.json`、Sync で承認されたドキュメントパッチ。

**使用すべき場合：** 壊れたファイルパス、CLI コマンド、設定キー、環境変数など、ドキュメントがコードベースと一致するか確認するとき、またはコード変更後にパッチを提案するとき。

---

### /recap

**説明：** `oma-recap` による日次または期間の作業リキャップです。自然言語から日付または期間を解決し、複数の AI ツール履歴（Grok、Claude、Codex、Qwen、Cursor、Antigravity）に対して `oma recap --json` を実行し、テーマ分析と Markdown 形式への整形をスキルに委任して、保存先と TL;DR を報告します。インラインで実行し、サブエージェントはスポーンしません。

**トリガーキーワード：** Universal：`recap`。Korean：`리캡`。Japanese：`リキャップ`。

**ステップ：** モードと期間を検出（デフォルトは `daily`、今日の日次。`this week` や `지난 7일` なら `period` として `--window Nd` を使う） -> ユーザーが明示した場合だけ `--tool` フィルターを抽出（`grok, claude, codex, qwen, cursor, antigravity`） -> `command -v oma` を事前確認 -> `oma recap --json` を実行（日次は `--date YYYY-MM-DD` または省略、期間は `--window 7d` / `30d`） -> 15 分テーマ閾値とテンプレートで保存 -> 3 項目の TL;DR と保存先を報告。

**ルール：** `.agents/`（SSOT）を変更しません。保存するリキャップの技術用語（プロジェクト名、ツール名、CLI フラグ）を自動翻訳しません。ソースがない場合はリキャップを作りません。

**読み込むファイル：** `oma recap` 経由の AI ツールの会話履歴。

**書き込むファイル：** `.agents/results/recap/{date}.md` または `.agents/results/recap/{start}~{end}.md`。

**使用すべき場合：** AI ツールをまたいだ日または期間（週/月）の作業を要約するとき。特定のツールだけに絞ることもできます。

---

### /stack-set

**説明：** プロジェクトの技術スタックを自動検出し、解決したドメインスキル（Backend または Mobile）の言語固有リファレンスを生成します。`Package.swift` / `.xcodeproj` の Swift/iOS、`pubspec.yaml` の Flutter、`package.json` と react-native の React Native を検出して `oma-mobile` へルーティングします。それ以外は `oma-backend` にルーティングします。モノレポで両方がある場合は、どちらを設定するか尋ねます。

**トリガーキーワード：** なし（自動検出から除外）。

<!-- oma-docs:ignore-start -->
**ステップ：** マニフェストを検出（pyproject.toml、package.json、Cargo.toml、pom.xml、go.mod、mix.exs、Gemfile、*.csproj、Package.swift、*.xcodeproj、pubspec.yaml） -> 確認（検出したスタックを表示してユーザーの確認を得る） -> 生成（`stack/stack.yaml`、`stack/tech-stack.md`、8 つの必須パターンを含む `stack/snippets.md`、`stack/api-template.*`） -> 検証。
<!-- oma-docs:ignore-end -->

**出力：** 解決したドメインスキルの `stack/` ディレクトリ（例：`.agents/skills/oma-backend/stack/` または `.agents/skills/oma-mobile/stack/`）。`SKILL.md` や `resources/` は変更しません。

---

### /video

**説明：** `oma-video` スキルをエンドツーエンドで実行します。brief → script → narration → visuals → captions → render-spec → 管理対象の HyperFrames（または MoneyPrinterTurbo）という流れです。再現可能な実行ディレクトリを作り、コンポジターと ffprobe の確認が通った場合だけ実際の `.mp4` を出力します。対応するアセットのフォールバックはキーなしでも使えますが、コンポジターやツールチェーンの失敗は失敗のままです。インラインで実行し、サブエージェントはスポーンしません。

**トリガーキーワード：**

| 言語 | キーワード |
|----------|----------|
| Universal | `/video`、`oma-video`、`hyperframes`、`shorts`、`reels`、`screencast` |
| English | `generate video`、`create a video`、`make a video`、`short-form video`、`explainer video`、`demo video`、`walkthrough video`、`video from readme`、`video from code` |
| Korean | "영상 만들어", "영상 생성", "비디오 만들어", "숏폼 만들어", "쇼츠 영상", "릴스 영상", "데모 영상", "설명 영상" |
| Japanese | "動画を生成", "動画を作成", "ショート動画", "解説動画", "デモ動画" |
| Chinese | "生成视频", "制作视频", "短视频", "讲解视频", "演示视频" |

**ステップ：**

1. **brief と mode を解決：** `shorts`（9:16）、`explainer`（16:9）、`demo`（画面/Web キャプチャ）を選び、フラグで上書きできるデフォルトを適用します。
2. **script を構成：** シーンとナレーションを生成します（キーがあれば LLM、なければ brief から決定的なアウトライン）。
3. **アセットを合成：** `oma-voice` でナレーション、`oma-image` / `oma-slide` / stock で映像、キー不要のキャプション同期、または `demo --source web` の監督付きブラウザキャプチャを使います。各プロバイダーは決定的フォールバックへ切り替わります。
4. **render-spec を作成：** 決定性の境界となる `render-spec.json` とアセットを実行ディレクトリに書き込みます。
5. **レンダー：** 管理対象の HyperFrames プロジェクト（または MoneyPrinterTurbo）をサブプロセスとして起動します。通常のコンポジターまたはツールチェーンの失敗は失敗として扱い、決定的なプレースホルダーは明示的なモック/テスト経路（`OMA_VIDEO_MOCK=1`）でだけ使用できます。ライブキャプチャはマニフェストに `nondeterministic` と記録します。

**出力：** `.agents/results/videos/{timestamp}-{shortid}-{mode}/` にある実行ディレクトリ。`script.json`、`render-spec.json`、`timing.json`、`captions.{srt,vtt}`、`audio/`、`visuals/`、`{composition}.mp4`、`manifest.json` を含みます。[動画生成ガイド](../guide/video-generation.md)を参照してください。

---

### /schedule

**説明：** `oma schedule <action>` コマンドで時間ベースのエージェントジョブを登録・管理します。ジョブはグローバルレジストリ（`~/.agents/schedule/`）に保存され、OS ネイティブのスケジューラ（macOS の launchd、Linux の systemd user timers、Windows の schtasks、POSIX フォールバックの crontab）で起動します。各実行は `oma agent spawn` でハーネスに戻ります。

**トリガーキーワード：** なし（`oma schedule <action>` の時間ベースジョブをスラッシュで起動）。

**ステップ：** 意図を解決（add / list / remove / sync） -> スケジュールを解析（明示的な `--cron` または `--every` による自然言語） -> `oma schedule create` で登録（名前付き環境変数だけを取得、ファイルは 0600） -> `oma schedule list` で検証（マニフェストと OS の差分、プロジェクト別のグループ） -> ジョブ ID と次回実行時刻を報告。

**使用すべき場合：** インタラクティブセッションが開いていないときにも実行する必要がある、夜間のリキャップ、スケジュールスキャン、定期メンテナンスなどの繰り返しタスク。

---

### /explain

**説明：** `oma-explanation` スキルをエンドツーエンドで実行し、差分、PR、ブランチ、コミット範囲を自己完結したインタラクティブ HTML 解説（Background / Intuition / Code / Quiz）に変換します。インラインで実行し、サブエージェントはスポーンしません。

**トリガーキーワード：** なし。「explain」は日常語であり、キーワード検出では通常の「この関数を説明して」のような質問を誤検出するため、スラッシュ専用です。

**ステップ：** 引数を解決（対象 ref：明示的な PR# / ブランチ / SHA 範囲 -> staged -> dirty tree -> `HEAD~1..HEAD`、読者レベル `onboarding` | `reviewer`、出力言語、問題数） -> コントラクトをロード（`oma-explanation` SKILL.md + resources） -> 収集とゲート（差分と周辺コード、生成前のシークレットスキャン、差分/PR テキストを厳密にデータとして扱う） -> ドキュメントと HTML コントラクトに従って HTML を生成 -> 検証（最終 HTML のシークレットスキャンを含む grep チェック、最大 3 回の修正ループ） -> 配布（`open` は警告のみ、TL;DR + パス）。

**出力：** `.agents/results/explain/{YYYY-MM-DD}-{slug}.html`（Asia/Seoul の日付。同じ日付と slug で再実行すると上書き）。[コード解説ガイド](../guide/code-explainer.md)を参照してください。

---

## スキルとワークフローの違い

| 観点 | スキル | ワークフロー |
|--------|--------|-----------|
| **対象** | エージェントの専門知識（何を知っているか） | 調整されたプロセス（どう協力するか） |
| **場所** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **起動** | スキルルーティングキーワードで自動 | スラッシュコマンドまたはトリガーキーワード |
| **範囲** | 単一ドメインの実行 | 複数ステップ、多くの場合は複数エージェント |
| **例** | 「React コンポーネントを作る」 | 「計画 -> 実装 -> レビュー -> コミット」 |

---

## 自動検出の仕組み

### フックシステム

oh-my-agent は各ユーザーメッセージの処理前に `UserPromptSubmit` フックを使います。ベンダーの設定は単一の `<hookDir>/oma-hook.sh --vendor <v> --event <e>` エントリを登録し、処理チェーンをインプロセスで実行する `oma hook run` へルーティングします。チェーンは次の 3 つで構成されます。

1. **`triggers.json`**（`.agents/hooks/core/triggers.json`、`oma` バイナリに埋め込み）：11 の対応言語（英語、韓国語、日本語、中国語、スペイン語、フランス語、ドイツ語、ポルトガル語、ロシア語、オランダ語、ポーランド語）のキーワードとワークフローの対応を定義します。
2. **`keyword-detector.ts`**（`.agents/hooks/core/keyword-detector.ts`）：ユーザー入力をすべての言語のトリガーキーワードと照合し、ワークフローの起動コンテキストを注入する TypeScript ロジックです。
3. **`persistent-mode.ts`**（`.agents/hooks/core/persistent-mode.ts`）：状態ファイルを確認して永続ワークフローの実行を強制し、ワークフローコンテキストを再注入します。

### 検出フロー

1. ユーザーが自然言語を入力します。
2. フックが明示的な `/command` の有無を確認します。存在すれば重複を避けるため検出をスキップします。
3. フックが入力をサニタイズし（コードブロック、引用符付き文字列、貼り付けたシステムエコーブロックを除去）、`.agents/hooks/core/triggers.json` に対してキーワードリスト（リテラルフレーズ）と `patterns`（生の正規表現）をスキャンします。強化ガードは、同じワークフローが直近 60 秒で 2 回以上起動していれば再トリガーを抑制します。
4. 一致があれば、入力が情報パターンにも一致するか確認します。
5. 情報を求める入力（例：「what is orchestrate?」）ならフィルターし、ワークフローを起動しません。
6. 実行要求なら `[OMA WORKFLOW: {workflow-name}]` をコンテキストへ注入します。複数のワークフローが一致した場合は、明示的な呼び出しが優先され、次に最も長いキーワードが優先されます。
7. 永続ワークフローでは、明示的な呼び出し（`triggers.json` の `explicit`）だけが永続モードの状態ファイルを書き込みます。自然言語での一致は提案として注入され、質問で終わるプロンプト（最初または最後の行が `?`）では一切起動しません。
8. エージェントが注入されたタグを読み、`.agents/workflows/` から対応するワークフローファイルをロードします。

### 言語セクションの規約

`.agents/hooks/core/triggers.json` は `keywords`、`patterns`、`informationalPatterns` について、言語ごとのセクション構造を使います。

| セクション | 動作 |
|---------|----------|
| `*` | ユニバーサル。英語コンテンツ（共通語）と、本当に言語をまたぐトークン（ワークフロー名の `"orchestrate"` など）に使います。 |
| `en` | 英語。機能的には `*` と同じです。 |
| `ko`、`ja`、`zh`、`es`、`fr`、`de`、`pt`、`ru`、`nl`、`pl` | 言語固有の言い回しです。 |

すべてのセクションは常にロードされます。ユーザーは自分が考える言語でプロンプトを入力するため、`.agents/oma-config.yaml` の `language` 設定が制御するのは応答言語だけです。ある言語で書かれたキーワードは、その言語の文字を含むプロンプトにしか一致しません。そのため、すべてのセクションを統合しても、無関係なプロンプトで起動することはありません。

単語境界はキーワード自体だけで決まり、`language` には左右されません。ASCII のキーワードは単語全体にだけ一致します（そのため "work" は "network" に、"review" は "preview" に一致しません）。一方、非 ASCII のテキストを含むキーワードは、CJK の助詞や活用語尾が単語に直接つながるため、部分文字列として一致します（"리뷰해줘"）。

### パターンフィールド（生の正規表現） {#pattern-field-raw-regex}

リテラルな `keywords` に加え、各ワークフローは `patterns` を宣言できます。`patterns` は `iu` フラグでコンパイルする生の正規表現文字列です。パターンを使うと、組み合わせの多いキーワードリストなしに複数トークンの意図を照合できます。

```jsonc
{
  "workflows": {
    "orchestrate": {
      "persistent": true,
      // Subset of `keywords` that activates persistent mode (persistent workflows only)
      "explicit": ["orchestrate", ...],
      "keywords": { "*": ["orchestrate"], "en": ["do everything", ...] },
      "patterns": {
        "*": ["\\b(build|create|make)\\s+(?:me\\s+)?(?:an?)\\s+...\\b"],
        "ko": ["(앱|API|...)\\s*(?:을|를)?\\s*(?:만들어\\s*(?:주세요|줘)?|...)"]
      }
    }
  }
}
```

**作成ルール：**

- 文字列は直接コンパイルします。バックスラッシュは JSON 用と正規表現用に一度ずつエスケープします（`\\b`、`\\s+`）。
- 自動的な単語境界ラップはありません。パターンの作成者が `\b` を自分で扱います。
- 無効な正規表現は実行時に黙ってスキップされます（設定編集時にはテスト失敗で確認できます）。

### 情報パターンのフィルタリング

`.agents/hooks/core/triggers.json` の `informationalPatterns` セクションには、コマンドではなく質問を示すフレーズを定義します。各ワークフロー候補の一致の前後 60 文字のウィンドウを確認します。

| セクション | パターン例 |
|---------|----------------------|
| `*`（ユニバーサル英語） | "what is", "what are", "how to", "how does", "how do", "should we", "should i", "could we", "would you", "what if", "what about", "why build", "false positive", "trigger when", "auto-trigger" |
| `ko` | "뭐야", "무엇", "어떻게", "설명해", "알려줘", "트리거", "발동", "메타", "왜 만들", "어떻게 만들", "어떨까", "한다면", "할까요" |
| `ja` | "とは", "って何", "どうやって", "説明して" |
| `zh` | "是什么", "什么是", "怎么", "解释" |

入力がワークフローのトリガーと情報パターンの両方に一致した場合、情報パターンを優先し、ワークフローを起動しません。次のプロンプトをブロックする仕組みです。

- `"How do you build a TODO app?"`：`*` の `how do` が orchestrate の意図正規表現をブロックします。
- `"orchestrate 트리거 해주면 되나요?"`：`ko` の `트리거` が orchestrate キーワードをブロックします。

### 除外ワークフロー

次のワークフローはキーワード検出の対象外で、明示的な `/command` で起動します。`/tools` と `/stack-set` は `excludedWorkflows` に含まれます。`/convert` はトリガーキーワードを持たないだけです（`oma-pdf` と `oma-hwp` のスキルが独自のキーワード検出を持ちます）。`/schedule` は時間ベースの `oma schedule <action>` を使うスラッシュ起動ワークフローです。`/explain` は日常語の「explain」で誤検出するためトリガーキーワードを持ちません。

- `/tools`
- `/stack-set`
- `/convert`
- `/schedule`
- `/explain`

---

## 永続モードの仕組み {#persistent-mode-mechanics}

### 状態ファイル

永続ワークフロー（orchestrate、ultrawork、work、ralph）は、明示的に呼び出されたとき、`.agents/state/` に状態ファイルを作成します（[永続ワークフロー](#persistent-workflows)を参照）。

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
├── work-state.json
└── ralph-state.json
```

状態ファイルにはワークフロー名、現在のフェーズ/ステップ、セッション ID、タイムスタンプ、保留中の状態が含まれます。

### 再注入

永続ワークフローが有効な間、`persistent-mode.ts` フックは各ユーザーメッセージに `[OMA PERSISTENT MODE: {workflow-name}]` を注入します。これにより会話ターンをまたいでも実行が続きます。

### Goal contract（任意の停止ゲートと予算）

`oma goal set` は、アクティブな永続ワークフローに機械的な完了契約を追加します。

- `--gate typecheck|test|lint`：Stop フックは、その `package.json` スクリプトが成功した場合だけセッションの終了を許可します（シェルを使わず argv 配列として実行し、自由形式コマンドは意図的に拒否します）。失敗時は末尾の出力でブロックし、失敗とタイムアウトは再強化制限に数えるため、赤いゲートが永遠に停止を妨げることはありません。
- `--budget-minutes <n>`：アクティベーションからの実時間予算です。超過するとワークフローを無効化し、正直な部分停止を許可します。セッションイベント履歴に記録します。

契約がない場合、永続モードは上記のとおりに動作し、契約はオプトインです。詳細は [CLI コマンドリファレンス](../cli-interfaces/commands.md#goal-set)の `goal set` を参照してください。

### 非アクティブ化

永続ワークフローを無効化するには、ユーザーが「workflow done」（設定言語での同等表現）と言います。次の処理を行います。

1. `.agents/state/` から状態ファイルを削除します。
2. 永続モードコンテキストの注入を停止します。
3. 通常の動作に戻ります。

すべてのステップが完了して最終ゲートを通過すると、ワークフローは自然に終了することもあります。`goal set` のゲートが設定されている場合は、ゲートの合格で自動的に無効化されます。

---

## 典型的なワークフローシーケンス

### 単一ドメインの機能

```
Describe the task → relevant skill → implement → focused verification
```

### 複雑なマルチドメインプロジェクト

```
/work → PM plans → review within authorized scope → agents spawn → QA reviews → fix issues → report
```

### 自動並列実装

```
/orchestrate → load or create plan → resolve dependencies → spawn independent tasks → verify → report
```

### 最高品質のデリバリー

```
/ultrawork → PLAN (4 review steps) → IMPL → VERIFY (3 review steps) → REFINE (5 review steps) → SHIP (4 review steps)
```

### バグ調査

```
/debug → reproduce → root cause → minimal fix → regression test → similar pattern scan
```

### デザインから実装へ

```
/brainstorm → design document → /plan → task breakdown → /orchestrate → parallel implementation → /review → /scm
```

### 新しいコードベースのセットアップ

```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/
```

### 独立検証を伴う反復実行

```
/ralph → define criteria → ultrawork → judge → repeat as needed → completion, partial completion, or safeguard report
```
