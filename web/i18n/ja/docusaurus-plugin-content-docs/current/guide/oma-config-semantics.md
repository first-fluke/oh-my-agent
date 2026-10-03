---
title: "ガイド：oma-config.yaml の読み込み規則"
sidebar_label: 設定の読み込み
description: OMA が CUE と YAML の設定レイヤーを選び、ローカルオーバーレイを適用し、インストールコンテキストのフォールバックを解決する方法を説明します。サポートされるキーとデフォルト値については設定リファレンスを参照してください。
---

## 概要

設定は、現在の作業ディレクトリから親方向へたどって最初に見つかる `.agents/` ディレクトリから選択されます。

- **共有設定**：`.agents/oma-config.cue`。CUE がない場合、または評価できない場合は `.agents/oma-config.yaml` を使います。
- **ローカル設定**：`.agents/oma-config.local.cue` または `.agents/oma-config.local.yaml`。共有設定に重ねるファイルを 1 つだけ置きます。このファイルは非公開にしてください。

通常のランタイム検索では、プロジェクトの設定ファイルと `~/.agents/oma-config.*` をマージしません。グローバルインストールではインストールルートが HOME なので HOME のファイルを読み込み、プロジェクトから実行したコマンドでは最も近いプロジェクトレイヤーを読み込みます。`auto_update_cli` だけは例外です。更新チェックはプロジェクト設定、HOME の設定、デフォルトで有効という順に確認します。設定モデル全体については[設定リファレンス](/docs/guide/configuration-reference)を参照してください。

## 優先順位テーブル

| キー | 有効になる規則 | 備考 |
|-----|:---:|-------|
| `OMA_MODEL_PRESET` | 最優先 | 空でない環境変数の値が、そのプロセスの `model_preset` を置き換えます。 |
| ローカルファイル | 共有設定に重ねる | 通常のマップは再帰的にマージします。配列、スカラー、`null` は共有値を置き換えます。ローカル形式は 2 つ同時に置けません。 |
| 共有 CUE | 優先 | CUE がないか評価に失敗した場合、ローダーは共有 YAML を試します。ローカル CUE のエラーは致命的です。 |
| 共有 YAML | フォールバック | 使用できる共有 CUE が選択されなかった場合に使います。 |
| `auto_update_cli` | プロジェクト、HOME、`true` の順 | `resolveAutoUpdateCli` に実装された更新専用のフォールバックです。一般的なグローバル設定レイヤーではありません。 |

プロジェクト固有の上書きでは、ローカルファイルに変更した末端の値だけを記述します。たとえば、ローカルのモデル選択を共有ファイルから分離できます。

```yaml
# .agents/oma-config.local.yaml
model_preset: claude
agents:
  backend:
    model: anthropic/claude-sonnet-4-6
```

最も近い `.agents/` ディレクトリを選べるように、コマンドはプロジェクトから実行してください。ローカルファイルが壊れている場合は明確に失敗するため、再試行する前に修正するか削除します。

## デフォルト値

| キー | デフォルト | 適用条件 |
|-----|---------|--------------|
| `auto_update_cli` | `true` | 両方のファイルがないか、キーがない場合 |
| `serena.mode` | `bridge` | 両方のファイルがないか、キーがない場合 |
| `serena.auto_update` | `true` | 両方のファイルがないか、キーがない場合 |
| `telemetry` | `false` | 両方のファイルがないか、キーがない場合 |
| `language` | `en` | 両方のファイルがないか、キーがない場合 |
| `model_preset` | 必須 | 配布されるプロジェクトテンプレートは `auto` を使いますが、スキーマでは空でない値が必要です。 |
| `translation_voice` | `balanced` | 両方のファイルがないか、キーがない場合 |
| `timezone` | システムのタイムゾーン | 両方のファイルがないか、キーがない場合 |

## 読み込み順序の理由

最も近いレイヤーを使う規則により、プロジェクトの設定をそのプロジェクト内で完結させられます。ユーザー全体のベースラインが必要な場合はグローバルインストールを行い、`~/.agents/oma-config.yaml` を編集してください。プロジェクトインストールでは、引き続きそのプロジェクトに最も近いレイヤーを定義できます。

## 注意点

- `oma-config.yaml` の `language` はエージェントの応答言語を制御します。インストールや更新の警告メッセージの決定には**使いません**。インストール時点では `oma-config.yaml` がまだ読み込まれていないため、これらのメッセージはシステムロケール（`$LANG`）を使います。
- `auto_update_cli` の優先順位は更新コマンドに明示的に実装されています。プロジェクトインストールとグローバルインストールの両方がある場合、まずプロジェクトの値を確認し、次に HOME の値を確認します。
- `telemetry`（デフォルトは `false`）は、各ベンダーのオプトアウト設定に対応します。`oma install`、`oma update`、`oma link` が設定を書き込みます。Claude では `DISABLE_TELEMETRY` と `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`、Gemini と Qwen では `privacy.usageStatisticsEnabled`、Codex では `analytics.enabled` と `feedback.enabled`、Grok では `[features] telemetry`、Antigravity（agy）では `~/.gemini/antigravity-cli/settings.json` の `enableTelemetry` を使います。`telemetry: true` にすると、そのベンダーに対して oma が設定したオプトアウトを削除し、再びオプトインします。
- `diagram`（エンジンは `auto` / `archify` / `mermaid`、設定は `explain_sidecar`、`archify.managed|channel|check_interval_min|path|quality|open`）は、`video` や `image` と同じスパースなスキル上書きセクションです。[ダイアグラムエンジン](/docs/guide/diagram-engine)を参照してください。
- `video.hyperframes.check_interval_min` は、1 回の実行で使う HyperFrames ツールチェーンと heygen-com/hyperframes の最新バージョン確認を調整します（`oma video compose`、`oma update`）。
- `market`（`managed|channel|check_interval_min|path|python|save_dir`）は、`oma market` が使う常に最新の `last30days` エンジンを設定します。[市場調査](/docs/guide/market-research)を参照してください。
- 型付きランタイムスキーマは `providers`、`free`、`agents`、`models`、`custom_presets`、`vendors`、`session`、`docs` とスパースなスキルセクションを対象とします。配布テンプレートには `scm`、`memory`、`serena_reaper`、`mcp` など、利用側が所有するブロックも含まれます。これらのネストしたキーは各利用側が管理します。この一覧からキーの存在を推測せず、[設定リファレンス](/docs/guide/configuration-reference)と該当機能のガイドを参照してください。
- `oma-config.yaml` を直接編集しても問題ありません。`oma install` と `oma update` は正規表現レベルでフィールドを置き換え、管理対象でないユーザー編集済みのキー（カスタムの `agents:` オーバーライドや `session.quota_cap` など）を保持します。
- `oma update` は、配布テンプレートに定義されていて手元のファイルにないトップレベルキーを、テンプレートのデフォルト値とともに `# Added by oma update` マーカーの下へ追加します。すでに存在するキーは変更せず、既存の内容をバイト単位で保持します。意図的に削除したキーはテンプレートのデフォルト値で再び現れるため、オプトアウトする場合はキーを削除せず値を明示してください。
