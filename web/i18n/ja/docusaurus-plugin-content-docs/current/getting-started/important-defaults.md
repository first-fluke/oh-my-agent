---
title: 重要なデフォルト
description: ルーティング、モデル選択、プロバイダー、更新、テレメトリ、ブラウザー MCP、Serena トランスポート、ワークフロー復旧に影響する oh-my-agent のデフォルト設定です。
---

# 重要なデフォルト

デフォルトは、ユーザーが管理する設定を保ちながら最初のプロジェクトを使える状態にするために選ばれています。実行時に解決されるため、キーを省略した場合と空の値を明示した場合で動作が変わることがあります。ハーネスは動作するものの、期待と違う場合はここを確認してください。

## 初回実行に影響するデフォルト

| 項目 | デフォルト | 影響 | 上書き方法 |
|---|---|---|---|
| 応答言語 | `en` | プロジェクト設定で別の対応言語を選ばない限り、エージェントとワークフローの応答は英語になります。ホストやワークフローが対応していれば、ユーザーまたはセッションで明示した言語指定がプロジェクトのデフォルトを上書きできます。 | `.agents/oma-config.yaml` または `.cue` の `language` |
| モデルルーティング | `auto` | 現在のランタイムのネイティブなエージェント設定を使います。ランタイムが不明で `default_cli` が設定されていれば、そこにフォールバックします。 | `model_preset`、`default_cli`、`agents.<id>` |
| コードインテリジェンス | `serena` | 新規インストールでは Serena のインストールを試み、MCP 設定を接続します。 | `providers.code_intelligence: gortex` または `serena` |
| コード検索ガード | `block` | コードインテリジェンスのプロバイダーが設定されている間、PreToolUse フックがネイティブの `Grep`/`Glob` と再帰的なシェル検索（`rg`、`grep -r`、`find -name`）を拒否し、プロバイダーのツールを使うようエージェントに案内します。確認済みの除外対象、またはプロジェクト外のパスだけを対象にした検索は許可されます。フックは、プロジェクトのソースに対する迂回方法を案内しません。 | `providers.code_intelligence_guard: off` |
| 意味メモリ | `agentmemory` | 利用できる場合は Agent Memory を意味メモリに選びます。 | `providers.semantic_memory: honcho` または `none` |
| Web 検索 | `native` | プロバイダーを選ばない限り、ランタイムのネイティブ Web チャネルで検索します。 | `providers.web` |
| ドキュメントプロバイダー | `context7` | スキルが要求したとき、Context7 プロバイダーでドキュメントを検索します。 | `providers.docs` |
| テレメトリ | 無効 | OMA はリンク時にベンダーのオプトアウト設定を書き込みます。 | `telemetry: true` |
| CLI 自動更新 | 有効 | 無効にしない限り、CLI は更新を確認します。 | `auto_update_cli: false` |
| 日付形式 | `ISO` | プロジェクトが形式を設定しない場合、日付は ISO 形式になります。 | `date_format: US` または `EU` |
| タイムゾーン | システムのタイムゾーン | `timezone` を省略すると、スケジュールと報告の時刻はホストに従います。 | `timezone: Australia/Sydney`（または別の IANA 名） |
| Serena トランスポート | `bridge` | プロジェクトごとに 1 つの Serena サーバーを共有します。bridge が利用できない場合は、セッション単位の stdio にフォールバックします。 | `serena.mode: stdio` |
| Serena 自動更新 | 有効 | 可能な場合、`oma update` がローカルの Serena ツールを更新します。 | `serena.auto_update: false` |
| ブラウザー DevTools MCP | 未設定 | 既存のブラウザーエントリを保持します。初回の対話式インストールでは `aside` を提示します。 | `mcp.devtools_browsers: [aside]`、`[chrome]`、`[firefox]`、または `[]` |
| Serena Reaper | スケジュール経路は無効 | `serena_reaper.enabled: false` のため、定期的な reap は無効です。対話式の `oma serena reap` は引き続き実行できます。 | `serena_reaper.enabled: true` と `oma serena reaper enable` |

プロバイダー名とデフォルトは、実行時ローダーとインストーラーのプロンプトから決まります。インストーラーが生成する設定ファイルには利用可能なセクションのコメントが含まれます。バージョンごとのスキーマガイドとして、そのコメントを使ってください。

## 設定の優先順位

OMA は現在の作業ディレクトリから上に向かって、最も近い `.agents/` ディレクトリを探します。`oma-config.cue` があれば読み込み、共有 CUE の評価に失敗した場合は `oma-config.yaml` にフォールバックします。プロジェクトローカルのオーバーレイ（`oma-config.local.cue` または `oma-config.local.yaml`）を上からマージします。ローカルオーバーレイは 1 つだけ残してください。`OMA_MODEL_PRESET` はプロセス単位で `model_preset` を上書きできます。ローカル設定が無効な場合は、別の値を黙って選ばず読み込みを停止します。

固定された優先順位より前に、モデルルーティングには 2 つの特別なケースがあります。

- `model_preset: auto` の場合、現在のランタイムのネイティブなエージェント／モデル設定を使います。明示的な `agents.<id>` の上書きが引き続き優先されます。ランタイムが不明な場合は `default_cli` を使えます。
- `model_preset: free` の場合、子エージェントはローカルの FreeLLMAPI ゲートウェイを使います。`free.model` がゲートウェイのモデルを選び、エージェントごとのモデル固定値を置き換えます。省略した場合は `FREELLM_MODEL`、それもなければプロバイダーのフォールバック `auto` を使います。

固定プリセットまたはカスタムプリセットでは、実効的な優先順位は次のとおりです。

1. `agents.<id>` の明示的な上書き
2. 組み込みまたは `custom_presets` にある、対応する `model_preset` のエントリ
3. ロールにエントリがない場合のプリセットの `orchestrator` エントリ
4. それ以前のレベルで計画が解決しない場合の、ベンダー用フォールバック `default_cli`

`free` プリセットは、3 つのプロバイダー設定すべてにデフォルトを提供します。`base_url` は `http://127.0.0.1:31415/v1`、`api_key_env` は `FREELLM_API_KEY`（互換エイリアスとして `FREELLMAPI_API_KEY` も使用可能）、`model` は `auto` です。選択した環境変数に有効な API キーを設定する必要があります。ベンダーへのフォールバックはありません。マシン固有にする値は `oma-config.local.yaml` に設定するか、プロセス単位の上書きに `FREELLM_BASE_URL` と `FREELLM_MODEL` を使います。

## 意外な影響があるデフォルト

`mcp.devtools_browsers` キーを省略すると、「現在のブラウザーエントリをそのままにする」という意味になります。空のリストを明示すると、照合時にブラウザーエントリが削除されます。ブラウザー MCP プロセスはエージェントセッションごとに動くため、ブラウザーを操作するタスクでだけ有効にしてください。

デフォルトの Serena `bridge` モードでは、同じプロジェクトで複数のエージェントが動く場合に、重複する言語サーバープロセスを減らせます。ローカル bridge を起動できない場合や、プロセスを厳密に分離したい場合は `stdio` を復旧手段にします。Serena は次のツール呼び出しで言語サーバーの子プロセスを自己修復します。メモリの reaper は別の仕組みなので、通常の利用で有効にする必要はありません。

テレメトリのデフォルトはオプトアウトです。`telemetry: true` にすると、次回のリンクまたは更新で OMA のベンダーオプトアウトエントリが削除され、テレメトリに依存するベンダー機能が再び有効になることがあります。この設定が変えるのはベンダー統合の変更であり、OMA が自身の集計用に書き込むセッションコストファイルではありません。

## 復旧方法

| 症状 | 最初に確認するもの | 復旧方法 |
|---|---|---|
| ベンダーのファイルが古い | `oma doctor` と `oma link --dry-run` | `.agents/` を編集した後に `oma link <vendor>` を実行します。SSOT はソースとして保持してください。 |
| モデルが受け付けられない | `oma doctor --profile` | `auto` に切り替えるか、組み込みプリセットを使うか、`models:` の下にモデルスラッグを定義します。 |
| Serena ツールがタイムアウトする | `oma doctor` とプロバイダーのセクション | `serena.mode: stdio` を試します。メモリ不足が原因なら、`oma serena reap --dry-run` で確認します。 |
| 持続ワークフローが停止しない | `.agents/state/*-state.json` | `workflow done` と指示します。ワークフローが後始末しなかった場合だけ状態ファイルを確認してください。 |
| スケジュールされた reaper が何もしない | `oma doctor` の Serena Reaper セクション | `serena_reaper.enabled: true` にしてから `oma serena reaper enable` を実行します。 |
| ローカル設定で起動できない | `oma doctor` のエラーパス | ローカルオーバーレイを修正または削除します。`.cue` と `.yaml` のオーバーレイを両方作らないでください。 |

[インストール](./installation.md)、[エージェントごとのモデル](../guide/per-agent-models.md)、または [OMA の設定セマンティクス](../guide/oma-config-semantics.md)に進んでください。
