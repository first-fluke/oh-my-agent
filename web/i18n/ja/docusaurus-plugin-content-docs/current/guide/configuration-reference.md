---
title: "ガイド: 設定リファレンス"
sidebar_label: 設定リファレンス
description: OMA が対応する設定場所、優先順位、型付きキー、デフォルト、更新時の所有権ルールを説明します。
---

# 設定リファレンス

OMA は `.agents/oma-config.cue` または `.agents/oma-config.yaml` から設定を読み込みます。`.agents/oma-config.local.cue` または `.agents/oma-config.local.yaml` のローカルオーバーレイは、共有ファイルに入れたくないマシン固有の設定に使えます。

確認したい設定を持つプロジェクトから実行します。

```bash
oma doctor --profile
```

期待される結果は、選択したプリセットとエージェントごとのモデルプランを示す解決済みプロファイルです。パースエラーが表示された場合は、モデル設定を変更する前に最も近い設定レイヤーを修正してください。

## どのファイルが優先されるか

ローダーは `$OMA_HOME/.agents/`（デフォルトは
`~/.oma/.agents/`）からグローバルのデフォルトを読み込み、次に現在のディレクトリから上に向かって検索し、
最も近いプロジェクトの `.agents/` ディレクトリで停止します。選ばれた各ディレクトリでは次のように処理します。

1. `oma-config.yaml` が共有の値を提供します。
2. `oma-config.cue` が存在して有効な場合は、それが設定するすべてのキーを上書きします。CUE が設定しない YAML のキーは残ります。CUE ファイルを評価できない場合、OMA は警告を出して YAML ファイルだけを使います。
3. 1 つのローカルファイル（`oma-config.local.cue` または `.local.yaml`）を共有の結果にマージします。

プロジェクトの共有／ローカルの結果は、グローバルの共有／ローカルの結果を上書きします。
`OMA_MODEL_PRESET` が設定されていれば、すべてのファイルレイヤーの後で `model_preset` を上書きします。
完全な順序、フロー図、トラブルシューティングは
[設定の読み込み](/docs/guide/oma-config-semantics#precedence-table)にあります。

マップは再帰的にマージされます。配列、スカラー、`null` は共有値を置き換えます。ローカル形式を両方残すとエラーになります。ローカルファイルが不正な場合は、プライベートな上書きを黙って無視できないよう致命的エラーになります。

異なる祖先のプロジェクトルート同士はマージされません。最も近いプロジェクトの
`.agents/` が空でも、その境界は成立します。廃止された `~/.agents/` のインストールは
移行の入力であり、プロジェクトのフォールバックとしては読み込まれません。グローバルのデフォルトは、
現在のプロジェクトの識別情報やメモリのスコープを変更しません。

## トップレベルキー {#top-level-keys}

次のキーは、現在のランタイムスキーマまたは OMA に同梱された利用側で読み込まれます。「部分的」と示したキーは、意図的に一部だけを指定します。ネストした値を省略するとコードのデフォルトが使われます。

| キー | 型または受け付ける値 | 省略時のデフォルト | 用途 |
| --- | --- | --- | --- |
| `language` | string | `en` | ワークフローとスキルが使う応答言語。インストールは既存の値を残すか、確認なしでシステム言語から初期化します。 |
| `translation_voice` | `formal`、`balanced`、`interpreter` | 同梱テンプレートでは `balanced` | `oma-translation` の文体選択。 |
| `date_format` | `ISO`、`US`、`EU` | 同梱テンプレートでは `ISO`。省略時は明示的な上書きなし | 日付形式の設定。 |
| `timezone` | IANA 名 | システムのタイムゾーン | スケジュールとレポートで使う日時。 |
| `auto_update_cli` | boolean | `true` | CLI バージョンのバックグラウンド確認。`false` でオプトアウト。 |
| `telemetry` | boolean | `false` | install、update、link の調整で使うベンダーテレメトリのオプトイン。 |
| `model_preset` | 空でない string | 新しいテンプレートでは `auto` | 組み込みまたはカスタムのモデルプリセット。`OMA_MODEL_PRESET` は 1 プロセスだけ上書きします。 |
| `free` | `base_url`、`api_key_env`、`model` | 未設定 | `providers.free` の古い書き方です（そこでの `model` は `default_model`）。引き続き読み込まれ、`oma update` が移動します。 |
| `providers` | `docs`、`web`、`code_intelligence`、`code_intelligence_guard`、`semantic_memory`。`brave`、`exa`、`honcho` の認証情報セクション。それ以外の `<name>` は LLM プロバイダーオブジェクト | `context7`、`native`、`serena`、`block`、`agentmemory`。認証情報や LLM プロバイダーはなし | ドキュメント、検索、コードインテリジェンス、意味メモリのプロバイダーを選び、認証情報の参照を保持し、エージェントを通せる LLM エンドポイントを宣言します。[プロバイダー](#providers)を参照してください。 |
| `brave`、`exa`、`honcho` | `providers` の下と同じ | 未設定 | `providers.brave`、`providers.exa`、`providers.honcho` の古いトップレベル表記。引き続き読み込まれ、`oma update` が移動します。 |
| `agents` | エージェント ID → `model`、任意の `effort`、`thinking`、`memory`。`default` → `cli`、`effort`、`thinking`、`memory` | プリセットの解決結果。`default.cli` は `claude` にフォールバック（プロバイダー経路では `codex`） | 選択したプリセットに適用するエージェントごとの上書き。effort は `none`、`low`、`medium`、`high`、`xhigh`、memory は `user`、`project`、`local` です。`agents.default` は、自分で何も設定していないすべてのロールにこれらのフィールドを埋めます。その `cli`（`claude`、`codex`、`cursor`、`antigravity`、`qwen`、`grok`、`kimi`、`kiro`、`opencode`、`pi` のいずれか）は、ほかに何も選ばないときに使うベンダーです。対象は、`auto` でランタイムを検出できない場合、またはプロバイダー経路で `--vendor`、`OMA_RUNTIME_VENDOR`、検出したランタイムの後です。`<provider>/<model-id>` 形式のモデルは、そのロールをその LLM プロバイダーへ通します。 |
| `models` | モデルスラッグ → CLI マッピング | 未設定 | 対応するベンダー CLI 用のインラインモデル定義。 |
| `custom_presets` | プリセット → description、任意の `extends`、`agent_defaults` | 未設定 | ユーザー定義プリセット。`extends` で組み込みプリセットを継承できます。 |
| `vendors` | 選択したベンダー ID の `string[]`（YAML と CUE） | 省略時: `oma link` はリンク可能なすべてのベンダー、`oma update` はプロジェクトディレクトリが存在するベンダーを使う | `oma install` と `oma update` が投影するベンダー統合を選択します。ディスパッチの機能マップは管理対象のオーケストレーション設定にあります。[ベンダー選択とディスパッチメタデータ](#vendor-selection-and-dispatch-metadata)を参照してください。 |
| `default_cli` | ベンダー ID | 未設定 | `agents.default.cli` の古い書き方です。引き続き読み込まれ、`oma update` が移動します。 |
| `session.quota_cap` | `tokens`、`spawn_count`、`per_vendor: map<string, integer>` | 省略した各次元は上限なし | 次のエージェント起動前に確認する、記録されたトークン使用量と起動数の上限。[セッションのクォータ上限](#session-quota-caps)を参照してください。 |
| `diagnostic_feedback` | `enabled`、`host_diagnostics`、`timeout_ms` | 対応するターミナルホストでは自動、`false`、`1400` | ネイティブなファイル編集の前後で Serena の診断を比較します。[診断フィードバック](#diagnostic-feedback)を参照してください。 |
| `docs` | `auto_verify`、`check_urls`、`exclude` | `false`、`true`、`[]` | `oma docs verify` の動作とスキャン除外。 |
| `serena` | `mode: bridge\|stdio`、`auto_update` | `bridge`、`true` | Serena MCP のトランスポートと更新動作。 |
| `mcp.devtools_browsers` | `aside`、`chrome`、`firefox`、または `[]` | 未設定 = 既存の設定をそのままにする | 調整時に使うブラウザー DevTools MCP の選択。空のリストを明示すると、選択したブラウザーのエントリを削除します。 |
| `video` | スキルが所有する部分的なマップ | スキルのデフォルト。[動画生成](/docs/guide/video-generation)を参照 | 動画のルーティング、プロバイダー順、出力、コスト、上限、HyperFrames の更新設定。 |
| `image` | スキルが所有する部分的なマップ | スキルのデフォルト。[画像生成](/docs/guide/image-generation)を参照 | 画像ベンダー、サイズ、品質、出力、比較、コストの設定。 |
| `voice` | `backend`、`notification_profile`、`asset_profile`、`output_dir`、`auto_notify_after_sec`、`max_tts_chars`、`max_stt_minutes` | `backend: auto`。その他のキーはスキルのデフォルト。[コンテンツとリサーチのワークフロー](/docs/guide/content-and-research#generate-speech-or-transcribe-audio)を参照 | 音声バックエンド（`auto`、`voicebox`、`voicestudio`。`oma video` のナレーションも同じ設定を使用）、プロファイル、出力、長さの設定。 |
| `hwp` | `format`、`version.*`、`output.*` | スキルのデフォルト。[コンテンツとリサーチのワークフロー](/docs/guide/content-and-research#extract-hwp-family-documents)を参照 | Kordoc の形式、バージョンチャンネル、出力先。 |
| `pdf` | `format`、`image_output`、`image_format`、`use_struct_tree`、`ocr.*`、`output.*` | スキルのデフォルト。[コンテンツとリサーチのワークフロー](/docs/guide/content-and-research#extract-pdf-content)を参照 | PDF 抽出、OCR、画像、上書きの設定。 |
| `scholar` | `base_url` | スキルのデフォルト。[コンテンツとリサーチのワークフロー](/docs/guide/content-and-research#search-and-validate-scholarly-material)を参照 | Knows エンドポイントのホスト。プロトコルの形はスキルが所有します。 |
| `diagram` | `engine`、`explain_sidecar`、`archify.path`、`archify.quality`、`archify.open` | スキルのデフォルト。[ダイアグラムエンジン](/docs/guide/diagram-engine)を参照 | Mermaid／archify の選択と、archify の固定および品質の設定。廃止された `archify.managed`、`archify.channel`、`archify.check_interval_min` は通知付きで無視され、`oma update` が削除します。 |
| `market` | `path`、`python`、`save_dir` | スキルのデフォルト。[市場調査](/docs/guide/market-research)を参照 | last30days エンジンの固定、インタープリター、結果の保存先。廃止された `managed`、`channel`、`check_interval_min` は通知付きで無視され、`oma update` が削除します。 |

同梱テンプレートには、利用側が所有するブロックも含まれます。現在読み込まれるキーとデフォルトは次のとおりです。

| ブロック | 利用側が読むキー | デフォルト | 効果 |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`、`max_age_days` | 100 セッションを保持。50 日より古い Serena 成果物を削除。`0` で経過時間による削除を無効化 | `oma memory gc` のデフォルト。コマンドのフラグが上書きします。 |
| `serena_reaper` | `enabled`、`policy: lru\|idle`、`keep_warm`、`idle_minutes`、`grace_seconds` | `false`、`lru`、`2`、`10`、`90` | スケジュールされた Serena LSP クリーンアップ経路を制御します。対話式の `oma serena reap` は明示的なままです。スケジュールされた quiet 実行はオプトインです。 |
| `refactor_guard` | `enabled`、`max_lines` | `false`、`500` | stop-hook の行数ガードを選び、ファイルごとのコード予算を設定します。 |
| `scm` | `conventional_commits`、`branching_strategy`、`require_pr_for_default_branch`、`co_author.*`、`forbidden_patterns`、`allowed_exceptions` | 同梱テンプレートでは Conventional Commits と PR 保護を有効にし、テンプレートの co-author とファイル名リストを使う | SCM スキル、コミットフック、秘密パターンガードを制御します。有効にする前に、テンプレートの本人情報を自分のものへ置き換えてください。 |

これらのブロックは設定の passthrough で受け付けられ、対応する機能またはワークフローが解釈します。`serena_reaper` パーサーは上記の snake_case キーだけを読み、camelCase は無視します。同梱テンプレートはまだ camelCase（`keepWarm`、`idleMinutes`、`graceSeconds`）を示しており、同梱の CUE スキーマはそのスキーマブロック内の snake_case キーを拒否します（`field not allowed`）。そのため、これらは `oma-config.yaml` またはローカルの YAML オーバーレイで設定してください。ネストしたキーを追加する前に対応する機能ガイドを読んでください。このページでは、列挙した利用側の外にキーを作りません。

## 正確なネストオブジェクト

### プロバイダー {#providers}

`providers` は機能ごとに 1 つのプロバイダーを選びます。

| キー | 受け付ける値 | デフォルト |
| --- | --- | --- |
| `docs` | `context7` | `context7` |
| `web` | 検索プロバイダー ID（英小文字、数字、`_`、`-`）。`native` や `brave` など | `native` |
| `code_intelligence` | `serena`、`gortex` | `serena` |
| `code_intelligence_guard` | `block`、`off` | `block` |
| `semantic_memory` | `agentmemory`、`honcho`、`none` | `agentmemory` |

3 つの予約キーは、セレクターの認証情報または接続セクションを持ちます。`web` 向けの `providers.brave` と `providers.exa`（`api_key_env` または `api_key_vault`）、`semantic_memory` 向けの `providers.honcho`（[Honcho の意味メモリ](#honcho-semantic-memory)を参照）です。古いトップレベル表記も引き続き読み込まれます。

`providers` のそれ以外のキーは **LLM プロバイダー**です。OpenAI 互換または Anthropic 互換のエンドポイントで、`oma agent spawn` は子 CLI を、その CLI 自身のアカウントではなくここへ通せます。値はオブジェクトです。

| フィールド | 受け付ける値 | 必須 | 用途 |
| --- | --- | --- | --- |
| `base_url` | 認証情報、クエリ、フラグメントを含まない絶対 HTTP(S) URL。`/v1` がなければ追加される | はい | エンドポイント。 |
| `api_key_env` | 環境変数名 | はい（`free` を除く。`free` のデフォルトは `FREELLM_API_KEY`） | キーの読み込み元。ファイル自体はキーを持ちません。`base_url` も `free` だけ任意です（`http://127.0.0.1:31415/v1`）。 |
| `transport` | `chat_completions`（デフォルト）、`responses`、`anthropic_messages`、`multi` | いいえ | エンドポイントが話すワイヤプロトコル。子 CLI を選びます。`chat_completions` は Codex または Qwen、`responses` は Codex、`anthropic_messages` は Claude、`multi`（3 つすべてを提供するゲートウェイ）は Codex、Claude、または Qwen。 |
| `default_model` | モデル ID | プロバイダーを `model_preset` として使うとき | `model_preset: <name>` のとき、すべてのロールが使うモデル。 |

```yaml
providers:
  code_intelligence: serena
  exaone:
    base_url: https://api.exaone.ai/v1
    api_key_env: EXAONE_API_KEY
    transport: chat_completions
    default_model: k-exaone_v2.5
agents:
  default: { effort: medium }
  backend: { model: exaone/k-exaone_v2.5 }
```

`free` はローカルの FreeLLMAPI ゲートウェイ向けの組み込みプロバイダーです。すべてのフィールドにデフォルトがあり、`FREELLM_BASE_URL` と `FREELLM_MODEL` がファイルを上書きします。レガシーなトップレベルの `free:` ブロックも引き続き読み込まれます（その `model` はここでの `default_model`）。[カスタム LLM プロバイダー](/docs/guide/per-agent-models#custom-llm-providers)を参照してください。

`code_intelligence_guard` は PreToolUse の検索ガードを制御します。確認済みのプロバイダー除外対象、またはプロジェクト外のパスだけを対象にしたネイティブ検索は、迂回策を使わずに許可されます。ガードは Serena の除外設定と有効な gitignore ルール、または Gortex の除外一覧を読み取ります。ディレクトリ名から依存関係を推測することはありません。

フックは `OMA_CI_ALLOW_NATIVE` の名前を挙げません。`OMA_CI_ALLOW_NATIVE=1` を前置したシェル検索がガードを迂回できるのは、プロジェクト外のリソースや、ガードが認識しなかった無視対象のパスに限られ、プロジェクトのソースは対象外です。

### Honcho の意味メモリ {#honcho-semantic-memory}

`providers.honcho` マップ（レガシーなトップレベルの `honcho` も引き続き読み込まれます）は `HonchoConfigSchema` で検証されます。キーと実効時の動作は次のとおりです。

| キー | 形 | 実効デフォルトまたは制約 |
| --- | --- | --- |
| `base_url` | URL 文字列 | `https://api.honcho.dev`。ループバック HTTP 以外は HTTPS が必要です。認証情報、クエリ文字列、フラグメントは拒否されます。 |
| `workspace_id` | 英数字、`_`、`-` の 1〜128 文字 | プロバイダー起動時に必須。保存値がない場合、対話式インストーラーは `oma` を設定します。 |
| `project_id` | 前後の空白を除いた 1〜128 文字の文字列 | 省略すると現在の OMA プロジェクトルート。 |
| `api_key_env` | 環境変数名 | `HONCHO_API_KEY`。ループバック以外のエンドポイントでは、この変数または `api_key_vault` が必要です。 |
| `api_key_vault` | vault キー名（`A-Z`、`a-z`、数字、`.`、`_`、`-`、1〜64 文字） | 省略すると vault を検索しません。両方の認証情報参照がある場合は環境変数を先に使います。 |
| `timeout_ms` | 整数 `100`〜`30000` | `5000` ミリ秒。status または memory リクエストに同じ期限を使います。 |
| `max_results` | 整数 `1`〜`50` | recall 結果 `8` 件。 |
| `max_tokens` | 整数 `128`〜`16000` | recall した内容と推論コンテキストに使う UTF-8 バイト数 `2000`。 |
| `recall_mode` | `messages` または `hybrid` | 新しい選択ではインストーラーが `messages` を書きます。省略すると、メッセージの recall とともにプロバイダーの representation リクエストも有効になります。 |

たとえば、リモートワークスペースでは、秘密情報を YAML に入れずに秘密参照を使えます。

```yaml
providers:
  semantic_memory: honcho
honcho:
  base_url: https://honcho.example.com
  workspace_id: team
  project_id: product-docs
  api_key_vault: honcho-team
  timeout_ms: 5000
  max_results: 8
  max_tokens: 2000
  recall_mode: messages
```

Honcho を対話式または保存済み URL なしの非対話式で初期設定する場合、インストーラーは最初の URL として `http://127.0.0.1:8000` を使います。このインストーラーの初期値は、上記プロバイダーのランタイムフォールバックとは別です。プロバイダーを選んだ後に `oma memory status` を実行してください。ワークスペースや認証情報がない場合は、別のメモリプロバイダーへ黙って切り替えず、利用不可として報告します。

### セッションのクォータ上限 {#session-quota-caps}

`session.quota_cap` は部分マップです。すべてのフィールドは任意で、省略するとその次元に上限を設けません。値は `_` 区切りを使わずに書いた 0 以上の整数でなければなりません（YAML は `2_000_000` を文字列として読むため、その次元は上限なしになります）。`per_vendor` は、`claude`、`codex`、`antigravity` などのディスパッチ用ベンダー ID をトークン予算へ対応付けます。

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

上限ローダーは、ユーザーの CUE レイヤー、ユーザーの YAML レイヤー、同梱デフォルトのフォールバックの順に確認します。起動前に OMA は `spawn_count`、合計 `tokens`、`per_vendor` を順番に確認します。使用量が上限以上になると上限に達したとみなし、次の起動をブロックして、先に到達した次元を報告します。

OMA は実行開始時に入力トークンの見積もりを予約します。実行後に対応するネイティブなトランスクリプトがあれば、記録された入力、キャッシュ、出力の使用量がその見積もりを置き換え、起動数は追加しません。そうでなければ、記録はプロンプト長からの明示的な見積もりのままです。ネイティブなサブエージェントが取得範囲の外にある場合、観測したルートセッションの使用量は部分的とマークされます。したがってトークン上限は、利用できる観測に依存します。すでに動いている子を中断せず、請求の上限も保証しません。最も予測しやすい上限は `spawn_count` です。

### セッションの実行予算 {#session-execution-budget}

OMA が管理する CLI ディスパッチと検証の経過時間を制限するには、`session.execution` を設定します。正の `timeout_seconds` か、タイムゾーン付きの ISO 8601 `deadline` のいずれかを使います。

```yaml
session:
  execution:
    timeout_seconds: 1800
```

`oma agent spawn`、`parallel`、`review`、`resume`、`begin`、`verify` の各コマンドは `--timeout-seconds` または `--deadline` を受け付けます。準備、実行、リトライ、チェックは 1 つの絶対期限を共有します。設定、継承、保存のうち最も早い期限が優先され、リトライや再開で時計はリセットされません。`session.execution` と両方のフラグを省略すると、親が期限を渡していない限り、この次元は上限なしです。

実行履歴は `.agents/state/executions/` に残ります。キャンセルまたはタイムアウトになると、そのセッションの以降の実行はブロックされ、停止理由が記録されます。これらの制御が対象にするのは、管理対象 CLI 経路から起動したプロセスです。ネイティブなベンダーエージェントと任意のシェルジョブには、ホスト側のキャンセル手段が必要です。CPU、RAM、ストレージの上限にはプロバイダーの対応が必要です。

管理対象の子 CLI は `OMA_EXECUTION_DEADLINE`、`OMA_EXECUTION_STATE`、`OMA_EXECUTION_ID` を継承します。状態パスと実行 ID は、束ねられた継承参照になります。別の台帳、壊れた台帳、一致しない台帳は、書き込み前に拒否されます。OMA の子をラップするときは、継承した環境をすべて転送してください。これらの変数を設定しても、無関係なプログラムに期限の強制は追加されません。

キャンセル時、OMA は受付を止め、所有する計算の終了を上限付きで試みます。ログ、結果、worktree、登録済みリソースのメタデータは残します。成果物や外部リソースの削除には、依頼か明示的な保持ポリシーが必要です。終了に失敗した場合は、完全に片付けたと報告せず、見える状態のままにします。

### 診断フィードバック {#diagnostic-feedback}

対応するターミナルホストでは、OMA はネイティブなファイル編集の前後でエラーと警告を比較し、新しく報告された診断を次のツールフィードバックへ注入します。Serena が有効なコードインテリジェンスプロバイダーであるとき（プロバイダー未指定時のデフォルト）、すでに動いていてプロジェクトが一致する Serena HTTP デーモンを使います。デーモンを起動したり、ビルドを実行したりはしません。Serena 自身のシンボリック編集は、すでに診断を返すため対象外です。

```yaml
diagnostic_feedback:
  enabled: true
  host_diagnostics: false
  timeout_ms: 1400
```

このフィードバックを止めるには `enabled: false` にします。ホストがすでに編集診断を渡す場合は `host_diagnostics: true` にします。Cursor と Antigravity は自動でスキップされます。プロジェクトローカルの上書きは、通常の設定レイヤーに従います。環境変数の上書きは `OMA_DIAGNOSTIC_FEEDBACK`、`OMA_HOST_DIAGNOSTICS`、`OMA_DIAGNOSTIC_FEEDBACK_TIMEOUT_MS` です。

タイムアウトは、編集前または編集後のフック 1 回全体を対象とし、100〜10,000 ミリ秒に制限されます。遅いプロバイダーでは、より長いタイムアウトを使えます。失敗またはタイムアウトした検索はフィードバックを省略し、短いクールダウンを始めます。診断がきれいだったことには数えません。編集前のベースラインがない、または古い場合もフィードバックを省略します。各フックは最大 3 ファイルを確認し、新しいエラーまたは警告を最大 8 件報告します。

### ベンダー選択とディスパッチメタデータ {#vendor-selection-and-dispatch-metadata}

ユーザーが管理する `.agents/oma-config.yaml` では、`vendors` は選択した統合 ID のリストです。

```yaml
vendors:
  - claude
  - codex
  - pi
```

リストを指定するとそのベンダーだけを選び、`vendors: []` は何も選びません。`vendors` キーがない場合、`oma link` は OMA のリンク可能なベンダーレジストリにあるすべてのベンダーを対象にし、`oma update` はプロジェクトディレクトリがすでに存在するベンダーだけを対象にします。このリストが制御するのはインストールと更新の投影であり、ベンダーごとのコマンド機能マップではありません。

同梱の `.agents/oma-config.cue` スキーマは `vendors` を同じリスト（`[...string]`）として型付けします。以前の CUE テンプレートは、どこからも読まれない `vendors.pi` オブジェクト（`#VendorsConfig`）として型付けしていました。エージェントディスパッチは、下記の管理対象オーケストレーションレジストリから機能フィールドを解決します。`oma-config.cue` がまだ `vendors?: #VendorsConfig` を宣言している場合は、選択リストを書く前に `vendors?: [...string]` に変更してください。

管理対象の `.agents/skills/oma-orchestration/config/cli-config.yaml` に機能マップがあります。各 `vendors.<id>` エントリは次のフィールドをサポートします。

| フィールド | 形 | 用途 |
| --- | --- | --- |
| `command` | 実行ファイルの文字列 | 実行するバイナリ。 |
| `subcommand` | 文字列 | オプションの前に挿入するサブコマンド（`codex exec` など）。 |
| `prompt_flag` | 文字列、または無効化する `none` / `null` | プロンプトと組み合わせるフラグ。無効化すると位置引数のプロンプトを使います。 |
| `auto_approve_flag` | 文字列 | 書き込み可能な実行で使うベンダーの権限バイパスフラグ。読み取り専用では抑制されます。 |
| `read_only_flag` | 文字列 | ベンダーの読み取り専用フラグ。ない場合はベンダー固有のフォールバックを使うか警告します。 |
| `output_format_flag` | 文字列 | 機械可読出力を選ぶフラグ。 |
| `output_format` | 文字列 | `output_format_flag` と組み合わせる値。 |
| `model_flag` | 文字列 | `default_model` と組み合わせるフラグ。 |
| `default_model` | 文字列 | 解決済みプランがモデルを指定しない場合に使うモデル値。 |
| `isolation_env` | `NAME=value` 文字列 | 任意の環境変数割り当て。危険な loader／interpreter キーは拒否され、`$$` は現在のプロセス ID に展開されます。 |
| `isolation_flags` | シェル形式の引数文字列 | 追加の隔離引数。argv のトークンへ分割されます。 |

管理対象の機能ファイルは OMA の更新で再生成されます。モデル選択を変更するにはユーザーが所有する `agents`、`models`、`custom_presets` キーを編集してください。この機能マップを編集するのは、管理対象オーケストレーションデータを保守するとき、またはベンダーアダプターをデバッグするときだけです。古いテンプレートのコメントにある `vendors.pi` オブジェクトはフォールバックメタデータであり、選択ベンダーのリストや管理対象ディスパッチレジストリの代わりにはなりません。

## よくある変更

プロジェクトには固定プリセットを選びつつ、個人用の上書きをローカルに保管します。

**共有ファイル**（コミットする）:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed
```

**ローカルオーバーレイ**（Git で無視する）:

```yaml
# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-6.1-terra
    effort: high
```

コードインテリジェンスとメモリのプロバイダーを明示的に選びます。

```yaml
providers:
  code_intelligence: serena
  code_intelligence_guard: block   # off → advisory primer only, no tool denial
  semantic_memory: none
```

更新中もブラウザー設定を維持するか、意図的に削除します。

```yaml
# Omit mcp.devtools_browsers to leave existing browser entries unchanged.
mcp:
  devtools_browsers: []
```

## 更新と所有権のルール {#update-and-ownership-rules}

`.agents/oma-config.yaml` はユーザーが所有します。`oma update` は既存の内容を保持し、`# Added by oma update` マーカーの下に新しく同梱されたトップレベルテンプレートキーを追加することがあります。`oma update --force` はユーザー設定、MCP 設定、スタックディレクトリを置き換える可能性があります。カスタマイズをリセットする意図がある場合だけ使ってください。ローカルオーバーレイはマシン固有の値を置く場所です。

このファイルに API キーを入れないでください。`api_key_env` または `api_key_vault` フィールドを使い、実際の認証情報は参照先の秘密ストアまたは環境変数に保管します。

モデル解決の詳細は[エージェントごとのモデル設定](/docs/guide/per-agent-models)を参照してください。レイヤーのセマンティクスと失敗時の動作は[oma-config のセマンティクス](/docs/guide/oma-config-semantics)を参照してください。
