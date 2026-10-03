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

ローダーは現在のディレクトリから上に向かって検索し、共有設定またはローカル設定を含む最も近い `.agents/` ディレクトリで停止します。そのディレクトリでは次の順に処理します。

1. `oma-config.cue` を最初に評価します。
2. 共有 CUE ファイルがない、または評価できない場合は `oma-config.yaml` を使います。
3. 1 つのローカルファイル（`oma-config.local.cue` または `.local.yaml`）を共有ファイルにマージします。
4. `OMA_MODEL_PRESET` が設定されていれば、そのプロセスの `model_preset` を上書きします。

マップは再帰的にマージされます。配列、スカラー、`null` は共有値を置き換えます。ローカル形式を両方残すとエラーになります。ローカルファイルが不正な場合は、プライベートな上書きを黙って無視できないよう致命的エラーになります。

これは一般的なプロジェクトと HOME のマージ規則ではなく、最も近いレイヤーの規則です。グローバルインストールは HOME がインストールルートなので、`~/.agents/oma-config.*` を読み込みます。プロジェクトのコマンドは最も近いプロジェクトレイヤーを読み込みます。`auto_update_cli` の更新確認だけは例外で、プロジェクト、HOME、デフォルト（有効）の順に確認します。

## トップレベルキー

次のキーは、現在のランタイムスキーマまたは OMA に同梱された利用側で読み込まれます。「部分的」と示したキーは、意図的に一部だけを指定します。ネストした値を省略するとコードのデフォルトが使われます。

| キー | 型または受け付ける値 | 省略時のデフォルト | 用途 |
| --- | --- | --- | --- |
| `language` | string | `en` | ワークフローとスキルが使う応答言語。 |
| `translation_voice` | `formal`、`balanced`、`interpreter` | 同梱テンプレートでは `balanced` | `oma-translation` の文体選択。 |
| `date_format` | `ISO`、`US`、`EU` | 同梱テンプレートでは `ISO`。省略時は明示的な上書きなし | 日付形式の設定。 |
| `timezone` | IANA 名 | システムのタイムゾーン | スケジュールとレポートで使う日時。 |
| `auto_update_cli` | boolean | `true` | CLI バージョンのバックグラウンド確認。`false` でオプトアウト。 |
| `telemetry` | boolean | `false` | install、update、link の調整で使うベンダーテレメトリのオプトイン。 |
| `model_preset` | 空でない string | 新しいテンプレートでは `auto` | 組み込みまたはカスタムのモデルプリセット。`OMA_MODEL_PRESET` は 1 プロセスだけ上書きします。 |
| `free` | `base_url`、`api_key_env`、`model` | `http://127.0.0.1:31415/v1`、`FREELLM_API_KEY`、`auto` | プリセットが `free` の場合の FreeLLMAPI 設定。`FREELLM_BASE_URL` と `FREELLM_MODEL` はファイルの値を上書きします。キー名に秘密情報自体を入れません。[エージェントごとのモデル設定](/docs/guide/per-agent-models#freellmapi-preset)を参照してください。 |
| `providers` | `docs`、`web`、`code_intelligence`、`code_intelligence_guard`、`semantic_memory` | `context7`、`native`、`serena`、`block`、`agentmemory` | ドキュメント、検索、コードインテリジェンス、意味メモリのプロバイダーを選択します。コードインテリジェンスは `serena` または `gortex`、意味メモリは `agentmemory`、`honcho`、`none` を受け付けます。`code_intelligence_guard`（`block` または `off`）は PreToolUse の検索ガードを制御します。確認済みのプロバイダー除外対象、またはプロジェクト外のパスだけを対象にしたネイティブ検索は、迂回策を使わずに許可されます。ガードは Serena の除外設定と有効な gitignore ルール、または Gortex の除外一覧を読み取ります。ディレクトリ名から依存関係を推測することはありません。フックは `OMA_CI_ALLOW_NATIVE` の名前を挙げません。`OMA_CI_ALLOW_NATIVE=1` を前置したシェル検索がガードを迂回できるのは、プロジェクト外のリソースや、ガードが認識しなかった無視対象のパスに限られ、プロジェクトのソースは対象外です。 |
| `brave` | `api_key_env` または `api_key_vault` | 未設定 | Brave 検索の認証情報への参照。 |
| `honcho` | `base_url`、`workspace_id`、`project_id`、`api_key_env`、`api_key_vault`、`timeout_ms`、`max_results`、`max_tokens`、`recall_mode` | [Honcho の詳細](#honcho-semantic-memory)を参照 | Honcho の意味メモリ接続設定。 |
| `agents` | エージェント ID → `model`、任意の `effort`、`thinking`、`memory` | プリセットの解決結果 | 選択したプリセットに適用するエージェントごとの上書き。effort は `none`、`low`、`medium`、`high`、`xhigh`、memory は `user`、`project`、`local` です。 |
| `models` | モデルスラッグ → CLI マッピング | 未設定 | 対応するベンダー CLI 用のインラインモデル定義。 |
| `custom_presets` | プリセット → description、任意の `extends`、`agent_defaults` | 未設定 | ユーザー定義プリセット。`extends` で組み込みプリセットを継承できます。 |
| `vendors` | YAML: 選択したベンダー ID の `string[]`。CUE テンプレート: 任意の `vendors.pi` フォールバックマップ | YAML リストではリンク可能な全ベンダー | `oma install` と `oma update` が YAML に投影するベンダー統合を選択します。ディスパッチの機能マップは管理対象のオーケストレーション設定にあります。[ベンダー選択とディスパッチメタデータ](#vendor-selection-and-dispatch-metadata)を参照してください。 |
| `default_cli` | string | 利用側のフォールバック | モデルプランが解決しない場合の、旧来のベンダー専用フォールバック。 |
| `session.quota_cap` | `tokens`、`spawn_count`、`per_vendor: map<string, integer>` | 省略した各次元は上限なし | 次のエージェント起動前に確認するトークン数と起動数の上限。[セッションのクォータ上限](#session-quota-caps)を参照してください。 |
| `docs` | `auto_verify`、`check_urls`、`exclude` | `false`、`true`、`[]` | `oma docs verify` の動作とスキャン除外。 |
| `serena` | `mode: bridge\|stdio`、`auto_update` | `bridge`、`true` | Serena MCP のトランスポートと更新動作。 |
| `mcp.devtools_browsers` | `aside`、`chrome`、`firefox`、または `[]` | 未設定 = 既存の設定をそのままにする | 調整時に使うブラウザー DevTools MCP の選択。空のリストを明示すると、選択したブラウザーのエントリを削除します。 |
| `video` | スキルが所有する部分的なマップ | スキルのデフォルト。[動画生成](/docs/guide/video-generation)を参照 | 動画のルーティング、プロバイダー順、出力、コスト、上限、HyperFrames の更新設定。 |
| `image` | スキルが所有する部分的なマップ | スキルのデフォルト。[画像生成](/docs/guide/image-generation)を参照 | 画像ベンダー、サイズ、品質、出力、比較、コストの設定。 |
| `voice` | `notification_profile`、`asset_profile`、`output_dir`、`auto_notify_after_sec`、`max_tts_chars`、`max_stt_minutes` | スキルのデフォルト。[コンテンツとリサーチのワークフロー](/docs/guide/content-and-research#generate-speech-or-transcribe-audio)を参照 | Voicebox のプロファイル、出力、長さの設定。 |
| `hwp` | `format`、`version.*`、`output.*` | スキルのデフォルト。[コンテンツとリサーチのワークフロー](/docs/guide/content-and-research#extract-hwp-family-documents)を参照 | Kordoc の形式、バージョンチャンネル、出力先。 |
| `pdf` | `format`、`image_output`、`image_format`、`use_struct_tree`、`ocr.*`、`output.*` | スキルのデフォルト。[コンテンツとリサーチのワークフロー](/docs/guide/content-and-research#extract-pdf-content)を参照 | PDF 抽出、OCR、画像、上書きの設定。 |
| `scholar` | `base_url` | スキルのデフォルト。[コンテンツとリサーチのワークフロー](/docs/guide/content-and-research#search-and-validate-scholarly-material)を参照 | Knows エンドポイントのホスト。プロトコルの形はスキルが所有します。 |
| `diagram` | `engine`、`explain_sidecar`、`archify.*` | スキルのデフォルト。[ダイアグラムエンジン](/docs/guide/diagram-engine)を参照 | Mermaid／archify の選択と管理エンジンの設定。 |
| `market` | `managed`、`channel`、`check_interval_min`、`path`、`python`、`save_dir` | スキルのデフォルト。[市場調査](/docs/guide/market-research)を参照 | 管理対象 last30days エンジンの解決と結果の保存先。 |

同梱テンプレートには、利用側が所有するブロックも含まれます。現在読み込まれるキーとデフォルトは次のとおりです。

| ブロック | 利用側が読むキー | デフォルト | 効果 |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`、`max_age_days` | 100 セッションを保持。50 日より古い Serena アーティファクトを削除。`0` で経過時間による削除を無効化 | `oma memory gc` のデフォルト。コマンドのフラグが上書きします。 |
| `serena_reaper` | `enabled`、`policy: lru\|idle`、`keep_warm`、`idle_minutes`、`grace_seconds` | `false`、`lru`、`2`、`10`、`90` | スケジュールされた Serena LSP クリーンアップ経路を制御します。対話式の `oma serena reap` は明示的なままです。スケジュールされた quiet 実行はオプトインです。 |
| `refactor_guard` | `enabled`、`max_lines` | `false`、`500` | stop-hook の行数ガードを選び、ファイルごとのコード予算を設定します。 |
| `scm` | `conventional_commits`、`branching_strategy`、`require_pr_for_default_branch`、`co_author.*`、`forbidden_patterns`、`allowed_exceptions` | 同梱テンプレートでは Conventional Commits と PR 保護を有効にし、テンプレートの co-author とファイル名リストを使う | SCM スキル、コミットフック、秘密パターンガードを制御します。有効にする前に、テンプレートの本人情報を自分のものへ置き換えてください。 |

これらのブロックは設定の passthrough で受け付けられ、対応する機能またはワークフローが解釈します。`serena_reaper` パーサーは上記の snake_case キーを読みます。古いテンプレートのコメントで camelCase が使われていても同じです。ネストしたキーを追加する前に対応する機能ガイドを読んでください。このページでは、列挙した利用側の外にキーを作りません。

## 正確なネストオブジェクト

### Honcho の意味メモリ {#honcho-semantic-memory}

`honcho` マップは `HonchoConfigSchema` で検証されます。キーと実効時の動作は次のとおりです。

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

`session.quota_cap` は部分マップです。すべてのフィールドは任意で、省略するとその次元に上限を設けません。値は 0 以上の整数で、`per_vendor` はベンダー名をトークン予算へ対応付けます。

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

上限ローダーは、ユーザーの CUE レイヤー、ユーザーの YAML レイヤー、同梱デフォルトのフォールバックの順に確認します。起動前に OMA は `spawn_count`、合計 `tokens`、`per_vendor` を順番に確認します。使用量が上限以上になると上限に達したとみなし、次の起動をブロックして、先に到達した次元を報告します。使用量はトークンの集計であり、請求額の見積もりではありません。

### ベンダー選択とディスパッチメタデータ {#vendor-selection-and-dispatch-metadata}

ユーザーが管理する `.agents/oma-config.yaml` では、`vendors` は選択した統合 ID のリストです。

```yaml
vendors:
  - claude
  - codex
  - pi
```

リストを省略するか空にすると、OMA のリンク可能なベンダーレジストリにあるすべての ID を選びます。このリストが制御するのはインストールと更新の投影であり、ベンダーごとのコマンド機能マップではありません。

同梱の `.agents/oma-config.cue` スキーマでは、`command`、`prompt_flag`、`model_flag`、`default_model`、`thinking_flag` フィールドを持つ `vendors.pi` オブジェクトも使えます。このブロックは CUE テンプレートの型付きフォールバック形状です。現在のエージェントディスパッチ経路は、下記の管理対象オーケストレーションレジストリから機能フィールドを解決します。そのため、`vendors.pi` を YAML の選択リストの代わりに使わないでください。

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

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed

# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-5.4
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

## 更新と所有権のルール

`.agents/oma-config.yaml` はユーザーが所有します。`oma update` は既存の内容を保持し、`# Added by oma update` マーカーの下に新しく同梱されたトップレベルテンプレートキーを追加することがあります。`oma update --force` はユーザー設定、MCP 設定、スタックディレクトリを置き換える可能性があります。カスタマイズをリセットする意図がある場合だけ使ってください。ローカルオーバーレイはマシン固有の値を置く場所です。

このファイルに API キーを入れないでください。`api_key_env` または `api_key_vault` フィールドを使い、実際の認証情報は参照先の秘密ストアまたは環境変数に保管します。

モデル解決の詳細は[エージェントごとのモデル設定](/docs/guide/per-agent-models)を参照してください。レイヤーのセマンティクスと失敗時の動作は[oma-config のセマンティクス](/docs/guide/oma-config-semantics)を参照してください。
