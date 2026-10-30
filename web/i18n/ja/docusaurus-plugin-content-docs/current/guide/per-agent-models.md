---
title: "ガイド：エージェントごとのモデル設定"
sidebar_label: エージェントモデル
description: oma-config.yaml の model_preset で、各エージェントが使う AI モデルを設定します。組み込みプリセットとロールごとのモデル、モデルと CLI の解決表、エージェントごとの上書き、インラインモデル定義、extends を使うカスタムプリセット、oma doctor --profile、クォータ上限、pi/OpenCode/Kimi のトランスポートを扱います。
---

# ガイド：エージェントごとのモデル設定

## 概要

新規インストールでは `model_preset: auto` がデフォルトです。設定していないエージェントは、現在のベンダーに固有のエージェント定義とモデル設定を使います。固定プリセットを選んでモデルを固定することも、別のモデルやベンダーが必要なエージェントだけを上書きすることもできます。明示的に設定した既存のプリセットは、再インストールや更新でも保持されます。

共有設定は `.agents/oma-config.yaml` に置きます。`.agents/oma-config.cue` がある場合は、そのキーが YAML の同じキーを上書きします。任意の Git 無視対象ローカルファイルで、自分のマシン用に設定を上書きできます。

トップレベルキーと優先順位の完全なリファレンスは、[設定リファレンス](/docs/guide/configuration-reference)を参照してください。

設定項目:

1. 組み込みプリセットと各ロールに割り当てられるモデル
2. OMA がエージェントのモデルと CLI を解決する方法
3. ローカル設定と FreeLLMAPI（`free`）プリセット
4. `agents:` マップで個別のエージェントを上書きする方法
5. `models:` でカスタムモデルスラッグをインライン定義する方法
6. `custom_presets:` と `extends:` でカスタムプリセットを定義する方法
7. `oma doctor --profile` で解決済み設定を確認する方法
8. レガシーな `agent_cli_mapping` からの移行とセッションのクォータ上限
9. pi、OpenCode、Kimi Code CLI を介したディスパッチ

---

## 組み込みプリセット {#built-in-presets}

`model_preset` に組み込みキーのいずれかを設定します。

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto
```

| キー | 説明 | 適した用途 |
|:----|:-----------|:---------|
| `auto` | 現在のランタイムのエージェントとモデル設定に従います。モデルや effort フラグは注入しません。 | 新規インストールのデフォルト |
| `free` | OMA が起動する Codex、Claude、Qwen プロセス向けの特殊なゲートウェイモードです。組み込みプリセットレジストリとは別に解決されます。 | ローカルの FreeLLMAPI ゲートウェイ |
| `antigravity` | すべてのエージェントが Antigravity CLI（`agy`）を使います。実装、アーキテクチャ、QA には Gemini 4 Argon、オーケストレーション、PM、ドキュメント、探索には Gemini 3.8 Flash を使います。agy 1.1 以降では、OMA は `agy models` の表示 ID を渡し（例: `--model "Gemini 4 Argon (High)"`）、`effort` をモデルが公開している段階に対応付けます。agy 1.0 には `--model` がないため、agy 自身の設定で決まります。agy には `--thinking-budget` はありません。 | Antigravity CLI の利用者 |
| `claude` | すべてのエージェントが Claude を使います。architecture は Opus、explore は Haiku、それ以外のロールはすべて Sonnet です。 | Claude Max の契約者 |
| `codex` | ほとんどのロールでは GPT-5.5、explore では GPT-5.4-mini を使う OpenAI Codex を、effort レベル付きで利用します。 | ChatGPT Plus/Pro の利用者 |
| `qwen` | すべてのエージェントが Qwen Code を使います。ランタイムが一致する Qwen セッションでは生成されたネイティブエージェントを使え、ほかのランタイムでは CLI ディスパッチを使います。 | ローカルまたはセルフホスト推論 |
| `kiro` | すべてのエージェントが Kiro CLI を使います。実装とアーキテクチャは Sonnet、オーケストレーションと探索は Haiku が担当します。 | Kiro の利用者 |
| `cursor` | すべてのエージェントが Cursor の `composer-2.5` を使います。orchestrator、qa、pm、docs、explore では `composer-2.5-fast` を使います。 | Cursor Pro / Pro Student の利用者 |
| `mixed` | orchestrator、architecture（Opus）、qa、pm、docs は Claude、実装ロールは Codex の GPT-5.5、explore は GPT-5.4-mini を使います。 | エージェントごとの設定を管理せず、ベンダーごとの強みを使う場合 |

組み込みプリセットは CLI パッケージに含まれており、`oh-my-agent` をアップグレードすると自動的に更新されます。`gemini` は `antigravity` へリダイレクトする互換エイリアスで、現在の独立したプリセットではありません。ローカルのプリセットファイルは必要ありません。

### ロールごとのモデル {#models-per-role}

固定プリセットは次のレジストリスラッグを割り当てます。所有者の接頭辞は省略しています。最初の 6 列はそれぞれ `antigravity/`、`anthropic/`、`openai/`、`qwen/`、`kiro/`、`cursor/`、`mixed` では Claude のモデルが `anthropic/`、GPT のモデルが `openai/` です。正となるソースは `cli/platform/built-in-presets.ts` です。

| ロール | `antigravity` | `claude` | `codex` | `qwen` | `kiro` | `cursor` | `mixed` |
|:-----|:--------------|:---------|:--------|:-------|:-------|:---------|:--------|
| orchestrator, pm, docs | gemini-3.8-flash | claude-sonnet-4-6 | gpt-5.5 (medium) | qwen3-coder-next | claude-haiku-3-5 | composer-2.5-fast | claude-sonnet-4-6 |
| architecture | gemini-4-argon | claude-opus-4-7 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5 | claude-opus-4-7 |
| qa | gemini-4-argon | claude-sonnet-4-6 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5-fast | claude-sonnet-4-6 |
| backend, frontend, mobile, db, debug, refactor, tf-infra | gemini-4-argon | claude-sonnet-4-6 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5 | gpt-5.5 (high) |
| explore | gemini-3.8-flash | claude-haiku-4-5 | gpt-5.4-mini (low) | qwen3-coder-next | claude-haiku-3-5 | composer-2.5-fast | gpt-5.4-mini (low) |

括弧内の値は、プリセットの `effort`（Codex）または `thinking: true`（Qwen）です。プリセットに記載されていないロール（`eval` など）は、そのプリセットの `orchestrator` エントリを使います。

---

## OMA がエージェントのモデルと CLI を解決する方法 {#how-oma-resolves-an-agents-model-and-cli}

`OMA_MODEL_PRESET` が設定されている場合は、まずそれが `model_preset` を置き換えます（[設定の読み込み](/docs/guide/oma-config-semantics#precedence-table)を参照）。その後、リゾルバーは次の表から 1 行を選びます。

| `model_preset` | `agents.<id>` の設定 | CLI に渡すモデル | エージェントを実行する CLI |
|:---------------|:-------------------|:----------------------|:------------------------|
| `free` | 無視される | `FREELLM_MODEL`、なければ `free.model`、なければ `auto`（すべてのロール） | `--vendor`、なければ `OMA_RUNTIME_VENDOR`、なければ検出したランタイム（Codex、Claude、Qwen の場合）、なければ `default_cli`、なければ `codex`。受け付けるのは `codex`、`claude`、`qwen` だけ。 |
| `auto` | なし | なし。ベンダー固有のエージェント設定とセッション設定が適用される。 | `--vendor`、なければサポート対象の `OMA_RUNTIME_VENDOR`、なければ検出したランタイム、なければ `default_cli`、なければ `claude`。サポートされない値はエラー。 |
| `auto` | あり | 上書きの `model` | そのモデルの `cli`。その後、下記のベンダー上書き規則を適用 |
| 組み込み、エイリアス、カスタム | なし | そのロールに対するプリセットのエントリ、なければプリセットの `orchestrator` エントリ | そのモデルの `cli`。その後、下記のベンダー上書き規則を適用 |
| 組み込み、エイリアス、カスタム | あり | プリセットのエントリに上書きを浅くマージしたもの（上書きのフィールドが優先） | そのモデルの `cli`。その後、下記のベンダー上書き規則を適用 |

残りの要素は次のように組み合わさります。

- **プリセットの検索。** OMA はまず組み込みの名前、次にエイリアス（`gemini` は警告付きで `antigravity` にリダイレクト）、最後に `custom_presets` を確認します。組み込みと同じ名前のカスタムプリセットは無視されます。未知の名前は `Unknown model_preset "..."` で停止し、有効な名前の一覧を表示します。
- **モデルの検索。** スラッグはまず `models:`、次に組み込みレジストリで検索されます。未知のスラッグ、または `api_only: true` の仕様では、ディスパッチが停止します。
- **ベンダー上書き規則。** モデルに基づく行で `--vendor` または `OMA_RUNTIME_VENDOR` がベンダーを指定した場合、`pi` は常に優先されます（実プロバイダーのモデルのみ。[pi を介したディスパッチ](#dispatching-through-pi-transport-runtime)を参照）。それ以外のベンダーが優先されるのは、モデルの `supports.native_dispatch_from` に記載されている場合だけです。そうでなければ OMA は警告し、モデル自身の `cli` を維持します。
- **Effort。** CLI に effort フラグがないモデル（Claude Code）では、`effort` は警告付きで破棄されます。pi では維持され、`--thinking` に対応付けられます。

## 自動ディスパッチ

`auto` では、OMA は利用できれば現在のランタイムのネイティブなサブエージェントパスを使います。ベンダーが異なるエージェントやネイティブディスパッチに対応しないランタイムでは、`oma agent spawn` を使います。`auto` が固定ベンダーのプリセットに展開されることはありません。継承したプランには OMA のモデルフラグや effort フラグを注入しません。外部 CLI プロセスは、その CLI に保存されたデフォルト値を使うため、親セッションだけで選んだモデルとは異なることがあります。

`oma doctor --profile` は、継承したエージェントには `(vendor agent default)` と表示し、明示した上書きには解決済みモデルを表示します。ネイティブエージェントファイルにはベンダー固有の定義が残ります。`auto` モードで同じベンダーの上書きを指定した場合、そのファイルが install または update で生成されるときに適用されます。

## ローカル設定

共有設定の隣に `.agents/oma-config.local.cue` または `.agents/oma-config.local.yaml` の**どちらか 1 つ**を作成します。install、link、update は両方のパスを `.gitignore` に追加します。`--force` を使った場合も、既存のローカルファイルは保持されます。

OMA は最も近いプロジェクト設定ディレクトリを選びます。そのディレクトリ内では、共有 CUE で設定したキーが共有 YAML の同じキーを上書きし、ローカルファイルが共有値を上書きします。完全な順序は[優先順位表](/docs/guide/oma-config-semantics#precedence-table)にあります。CUE ファイルはマージ前に個別に評価されるため、共有設定の `model_preset: "auto"` をローカルの `"free"` で置き換えられます。オブジェクトは再帰的にマージし、配列、スカラー、`null` は共有値を置き換えます。壊れたローカルファイル、ローカル CUE に必要な CUE 実行ファイルの欠落、ローカル形式の同時存在はエラーになります。共有のデフォルトを使うための許可とは解釈されません。

コマンドオプションとサポートされる環境変数の上書きは、有効なファイル設定より優先されます。`oma doctor --profile` で使用したファイルを確認できます。ローカルファイルは Git クローンや新しい worktree には付いてきません。Free モードのサブプロセスは `OMA_MODEL_PRESET=free` と解決済みゲートウェイ環境を継承するため、ネストした OMA の spawn でも同じ経路を保てます。個別に起動したセッションには、そのセッション用のローカル設定または環境変数が必要です。install や setup コマンドが保存する設定は共有設定を対象としますが、実行時には引き続きローカル上書きが優先されます。

## FreeLLMAPI プリセット {#freellmapi-preset}

共有ファイルでは `model_preset: auto` を保持し、ローカルで opt-in します。

```cue
// .agents/oma-config.local.cue
model_preset: "free"
free: {
    base_url:    "http://127.0.0.1:31415/v1"
    api_key_env: "FREELLM_API_KEY"
    model:       "auto"
}
```

対応する YAML ファイルは次のとおりです。

```yaml
# .agents/oma-config.local.yaml
model_preset: free
free:
  base_url: http://127.0.0.1:31415/v1
  api_key_env: FREELLM_API_KEY
  model: auto
```

FreeLLMAPI を別途起動し、統一キーを `FREELLM_API_KEY` として export します。デフォルトのキー変数が選択されている場合、OMA は upstream の `FREELLMAPI_API_KEY` も受け付けます。両方が設定されていれば、正規の変数が優先されます。カスタムの `api_key_env` を指定した場合は、その変数だけを読み込みます。キーそのものを設定ファイルに書かないでください。`OMA_MODEL_PRESET` はプリセットを上書きします。`FREELLM_BASE_URL` と `FREELLM_MODEL` は、それぞれファイルの設定を上書きします。例にある値はデフォルトなので、サーバーとキーの準備ができていれば `model_preset: free` だけで十分です。

```bash
oma doctor --profile
oma agent spawn backend "Review the API error handling" free-review --vendor codex --read-only
```

Free モードは、既存の `agents.*.model` の固定指定があるロールも含め、OMA がディスパッチするすべてのロールで `free.model` を使います。固定指定を有料サブスクリプション向けに解決することはありません。`auto`、ゲートウェイのモデル ID、`auto:coding` のような名前付きゲートウェイチェーンのいずれかを選びます。名前付きチェーンは、あらかじめ FreeLLMAPI で作成してください。

トランスポートは、[OMA がエージェントのモデルと CLI を解決する方法](#how-oma-resolves-an-agents-model-and-cli)の `free` の行に従います。サポートされるトランスポートは Codex、Claude、Qwen だけです。サポートされないトランスポートを明示するとエラーになります。

| トランスポート | ゲートウェイエンドポイント | CLI のベース URL |
|:--|:--|:--|
| Codex | `/v1/responses` | `/v1` を含みます |
| Claude | `/v1/messages` | サーバールート。OMA が `/v1` のサフィックスを削除します |
| Qwen | `/v1/chat/completions` | `/v1` を含みます |

親が同じベンダーを使っている場合も `oma agent spawn` を使います。OMA はそのサブプロセスにだけゲートウェイ接続と認証情報を注入します。プリセットを変更しても、すでに開いているホストセッションやホストのネイティブなサブエージェントツールのモデルは変わりません。Codex には起動引数でカスタム Responses プロバイダーを渡し、キーは子プロセスの環境に残します。Claude と Qwen には互換性のあるエンドポイント設定を渡します。経路やキーを上書きする競合した Claude または Qwen の設定は実行前に報告しますが、OMA はそれらのファイルを書き換えません。

spawn と review は、エージェントを開始する前に認証済みの `GET /v1/models` を確認します。キーの欠落、接続失敗、HTTP 認証エラーがあると実行を停止します。`oma doctor --profile` は、実効 URL とモデル、環境変数の上書き、キーの有無、サーバーの準備状態をキー自体を表示せずに示します。準備完了でも、モデルにタスクを完了するだけのクォータがあるとは限りません。

リクエスト単位のプロバイダーフェイルオーバーは FreeLLMAPI が管理します。OMA のチェックポイント単位で明示するベンダーフェイルオーバーは、別のプロセス復旧メカニズムです。Free モードの後継も、サポートされる FreeLLMAPI トランスポートを使う必要があります。有料ベンダー設定へ自動的に戻ることはありません。

Free プリセットはエージェントの推論を設定します。既存のメモリサービスの埋め込み設定は変更しません。FreeLLMAPI は `/v1/embeddings` も提供するため、ベクトルストアを別に設定する場合はモデルファミリーを固定し、既存ベクトルと互換性のある空間を維持してください。

上流の参考資料： [クライアントのセットアップ](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/clients/01-agent-clients.md)、[API と埋め込みモデルの系統](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md)。

## 個別のエージェントを上書きする

`agents:` マップを使うと、有効なプリセットの上に特定のエージェントだけを上書きできます。記載したエージェントだけが影響を受け、残りは auto モードではベンダー設定に従い、固定プリセットでは選択したプリセットのデフォルトに従います。

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

各エントリは `AgentSpec` オブジェクトです。

| フィールド | 型 | 必須 | 説明 |
|:------|:-----|:---------|:-----------|
| `model` | string | はい | モデルスラッグ（組み込みまたはユーザー定義） |
| `effort` | `none` \| `low` \| `medium` \| `high` \| `xhigh` | いいえ | 推論の effort。対応しないモデルでは無視されます。 |
| `thinking` | boolean | いいえ | 拡張 thinking を有効にします。モデルによって異なります。 |
| `memory` | `user` \| `project` \| `local` | いいえ | エージェントのメモリスコープ |

有効なエージェント ID は `orchestrator`、`architecture`、`qa`、`pm`、`backend`、`frontend`、`mobile`、`db`、`debug`、`refactor`、`docs`、`tf-infra`、`explore`、`eval` です。組み込みプリセットは `eval` を定義していないため、上書きしない限り、プリセットの `orchestrator` エントリを使います。

マージは浅いマージです。上書きで指定した各フィールドが、同じフィールドのプリセット値を置き換えます。省略したフィールドはプリセット値を保持します。

---

## モデルスラッグをインライン定義する {#inlining-model-slugs}

組み込みレジストリにまだないモデルスラッグは、`models:` の下に登録します。登録したスラッグは `agents:` または `custom_presets:` から参照できます。

```yaml
# .agents/oma-config.yaml
models:
  antigravity/gemini-4-argon-low:
    cli: antigravity
    cli_model: "Gemini 4 Argon (Low)"   # exact display ID from `agy models`
    auth_hint: "Requires Antigravity CLI sign-in (Google AI Pro tier)"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: true
      computer_use: false
      native_dispatch_from: [antigravity]
      api_only: false
```

`agents:` から登録済みスラッグを参照するときは、次の 2 つの規則があります。

1. **キーは `owner/model` 形式でなければなりません。** `agents.<id>.model` は `owner/model` パターンで検証されるため、`my-fast-model` のような裸のキーは拒否されます。`antigravity/gemini-4-argon-low` のようにスラッシュを含むキー、またはベンダー固有の `provider/model` スラッグを使ってください。
2. **仕様は完全かつ有効でなければなりません。** 解決時には `cli`、`cli_model`、`auth_hint`、すべての `supports` フィールドが必要です。`cli` は `antigravity`、`claude`、`codex`、`commandcode`、`cursor`、`grok`、`kimi`、`kiro`、`qwen`、`opencode` のいずれか、`native_dispatch_from` のエントリは `antigravity`、`claude`、`codex`、`cursor`、`kimi`、`kiro`、`opencode`、`qwen` のいずれかでなければなりません。`gemini` はどちらにも有効な値ではありません。無効な仕様では `[model-registry] User inline model "<slug>" failed validation — falling back to core registry` がログに出力されます。コアレジストリにそのスラッグがない場合、ディスパッチは未知のスラッグのエラーで停止します。

> ユーザー定義のスラッグが組み込みスラッグと衝突すると、ユーザー定義が優先され、警告が出ます。

---

## カスタムプリセット

`custom_presets:` に追加のプリセットを定義します。`extends:` を使うと、組み込みプリセットからすべてのエージェントのデフォルトを継承し、必要なエージェントだけを上書きできます。

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude              # base preset — partial merge
    description: "Team A — sonnet base, codex for implementation"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }
      # all other agents inherited from claude
```

`extends:` を指定しない場合は、少なくとも `orchestrator` を定義してください。プリセットで省略したロールはすべて `orchestrator` エントリを使います。`extends:` を指定した場合は、記載したエントリだけが上書きされ、残りはベースプリセットから継承されます。`extends` には組み込みプリセットまたは別のカスタムプリセットを指定でき、循環する継承はエラーになります。組み込みと同じ名前（例: `claude`）のカスタムプリセットは無視され、組み込みが優先されます。

---

## `oma doctor --profile`

`oma doctor --profile` を実行すると、プリセットのデフォルト、`custom_presets`、`agents:` の上書きをマージした後の、完全に解決済みのモデルマトリクスを確認できます。

```bash
oma doctor --profile
```

**出力例**（抜粋: `backend` を上書きした `model_preset: mixed`。実際の実行では 13 個のロールがすべて表示され、ターミナルは各セクションを枠で囲みます）：

```text
 Profile Health (mixed)

 Configuration sources
   shared: <project>/.agents/oma-config.yaml

 Auth Status Matrix
┌──────────────┬────────────────────────────────────┬──────────────┬────────────────┐
│ Role         │ Model                              │ CLI          │ Auth Status    │
├──────────────┼────────────────────────────────────┼──────────────┼────────────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6        │ claude       │ ✓ logged in    │
│ architecture │ anthropic/claude-opus-4-7          │ claude       │ ✓ logged in    │
│ qa (preset)  │ anthropic/claude-sonnet-4-6        │ claude       │ ✓ logged in    │
│ backend (over│ openai/gpt-5.5                     │ codex        │ ✓ logged in    │
│ explore (pres│ openai/gpt-5.4-mini                │ codex        │ ✓ logged in    │
└──────────────┴────────────────────────────────────┴──────────────┴────────────────┘

 Profile health check complete (mixed)
```

各行には、ロール、解決済みのモデルスラッグ、それを実行する CLI、認証状態が表示されます。ロールのセルにはソースのタグが付きます。`(preset)`、`(override)`、または `auto` でベンダー設定を継承するエージェントの `(vendor)` です。Role 列の幅は 14 文字なので、上の例のように長いタグは途中で切れます。サブエージェントが予想外のベンダーを選んだ場合は、この情報を確認してください。

---

## レガシーな `agent_cli_mapping` からの移行

Migration 008 は `oma install` と `oma update` で自動的に実行されます。レガシープロジェクトをその場で変換します。

| レガシー設定 | Migration 008 後の結果 |
|:-------------|:--------------------------|
| すべてのエントリが同じベンダー（例：すべて `claude`） | `model_preset` をそのベンダーのプリセットに設定（レガシーな `gemini` は `antigravity` に対応）、`agents:` なし |
| ベンダーが混在 | 最も多いベンダーを `model_preset` にし、それ以外を `agents:` の上書きにします |
| `AgentSpec` オブジェクトの値 | そのまま `agents:` に移します |
| `models.yaml` の内容 | `oma-config.yaml.models` にインライン化します |
| カスタマイズした `defaults.yaml` | `custom_presets.user-customized` として、警告付きで保持します |

変更前に、元のファイルを `.agents/backup/008-model-preset/<timestamp>-<pid>/` にバックアップします（グローバルインストールでは `~/.oma/backup/008-model-preset/...`）。移行は冪等です。すでに `model_preset` がある場合はスキップします。

<!-- oma-docs:ignore-start -->
移行後、`.agents/config/defaults.yaml`、`.agents/config/models.yaml`、`.agents/config/` ディレクトリは削除されます。
<!-- oma-docs:ignore-end -->

---

## セッションのクォータ上限

サブエージェントの過剰な spawn を制限するには、`oma-config.yaml` に `session.quota_cap` を追加します。

```yaml
session:
  quota_cap:
    tokens: 2000000      # plain digits: YAML reads 2_000_000 as a string, which disables the cap
    spawn_count: 40
    per_vendor:          # dispatch vendor IDs (claude, codex, antigravity, ...), not model owners
      claude: 1200000
      codex: 600000
      antigravity: 200000
```

上限に達すると、`oma agent spawn` は次の spawn を拒否し、`[session-cost] Quota cap exceeded for session <id>: <dimension> (current: N, limit: M)` で失敗します。トークン使用量はプロンプトの長さから推定されるため、最も予測しやすい上限は `spawn_count` です。フィールドの規則は[セッションのクォータ上限](/docs/guide/configuration-reference#session-quota-caps)を参照してください。

---

## 完全な例

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  antigravity/gemini-4-argon-low:
    cli: antigravity
    cli_model: "Gemini 4 Argon (Low)"   # exact display ID from `agy models`
    auth_hint: "Requires Antigravity CLI sign-in (Google AI Pro tier)"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: true
      computer_use: false
      native_dispatch_from: [antigravity]
      api_only: false

custom_presets:
  my-team:
    extends: claude
    description: "Sonnet base, Codex for backend/db"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }

session:
  quota_cap:
    tokens: 2000000
    spawn_count: 40
```

`oma doctor --profile` を実行して解決結果を確認し、その後は通常どおりワークフローを開始します。

---

## pi を介したディスパッチ（トランスポートランタイム） {#dispatching-through-pi-transport-runtime}

[pi](https://github.com/earendil-works/pi)（Earendil）は、モデルの所有者ではなく、複数のプロバイダーを扱うプロキシランタイムです。1 つの CLI から Anthropic、OpenAI、Google の実モデルを実行できます。oma は pi を**トランスポートオーバーレイ**として扱います。`model_preset` と `agents:` の上書きはそのまま保持され、特定のエージェントを実行する CLI として pi が使われます。

`--vendor pi` の上書きを指定すると、任意のエージェントを pi 経由でディスパッチできます。

```bash
oma agent spawn backend "Implement the export endpoint" <session> --vendor pi
```

実行時の動作は次のとおりです。

- プリセットまたは上書きから解決したエージェントごとのモデル（例：`openai/gpt-5.5`）を pi の `--model <provider/id>` 形式に変換し、`effort` を pi の `--thinking` レベルに変換します。**pi では、エージェントごとのモデルがネイティブの場合と同じように機能します。** エージェントごとに異なるモデルを実行できます。
- pi にはベンダー側のエージェントファイルを参照する仕組みがないため、エージェントのペルソナ（システムプロンプト）は `.agents/agents/<id>.md` からインライン化されます。
- 認証は pi 自体の設定に従います（`~/.pi/agent/auth.json` または環境変数のプロバイダー API キー）。`oma doctor` は他の CLI と並べて pi のインストールと認証状態を報告します。

**制約：** pi は実プロバイダーのモデルだけを実行します。CLI 内部だけに存在するモデルを名前に持つ `cursor`、`kiro`、`qwen`、`antigravity` のプリセットを pi 経由でディスパッチすると、明確なエラーで拒否されます。pi にルーティングする場合は、`claude`、`codex`、`mixed` のいずれか、またはモデルが `anthropic/`、`openai/`、`google/` のスラッグである `agents.<id>` の上書きを使ってください。`gemini` は `antigravity` のエイリアスなので、pi は拒否します。

> pi のモデルカタログはリリースと認証の状態に左右されます。解決したスラッグがインストールした pi にない場合は `pi --list-models` を確認してください。pi の `--model` 一致はあいまい検索なので、ほとんどのプロバイダーのスラッグはそのまま解決されます。

### pi の組み込みレジストリにないモデル（例：Z.ai GLM）

pi は `--model` を**組み込みモデルレジストリ**に対して解決します。`defaultProvider` 設定はモデルがまったく渡されなかった場合だけ参照します。Z.ai については、pi が同梱する GLM ID は一部だけです（pi 0.80.x 時点では `glm-4.7`、`glm-4.5-air`、`glm-5-turbo`、`glm-5.1`、`glm-5v-turbo`）。それ以外の GLM ID を指定するプリセットは解決に失敗します。

対応方法は 2 つあります。

1. **レジストリ ID**：プリセットをレジストリのモデル ID に制限します。`provider/id` 形式（例：`zai/glm-4.7`）でプロバイダーを明示すると、oma はそのまま pi の `--model` に渡します。
2. **未登録 ID**：pi の拡張機能で登録します。`api` フィールドにはプロバイダー名ではなく、pi の**API アダプター ID**（`openai-completions`、`anthropic-messages` など）を指定する必要があります。`"zai"` のようなプロバイダー名や、`"openai"` のような短縮名はアダプター ID ではないため、ディスパッチ時に `No API provider registered for api: …` で失敗します。

```typescript
// ~/.pi/agent/extensions/zai-glm-models/index.ts  (or <project>/.pi/extensions/)
export default function (pi: ExtensionAPI) {
  pi.registerProvider("zai", {
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
    api: "openai-completions", // adapter id, NOT "zai"
    apiKey: "$ZAI_API_KEY",
    models: [
      { id: "glm-4.7-flash", api: "openai-completions", /* … */ },
      // NOTE: `models` replaces ALL existing models for the provider —
      // re-declare the built-in ids here if you still want them.
    ],
  });
}
```

プリセットに ID を設定する前に、`pi --list-models` で確認してください。

---

## OpenCode を介したディスパッチ

[OpenCode](https://opencode.ai) は拡張クラスのベンダーです。pi と同様にモデルの所有者ではなく、独自のカタログからモデルを実行する CLI です。無料の `opencode` プロバイダー、低価格の `opencode-go` サブスクリプションプラン、`opencode-zen` ゲートウェイがあります。oma は OpenCode を**インプロセスプラグインベンダー**として統合します。opencode は設定ファイルのフックを登録する代わりに `.opencode/plugins/oma/` を自動ロードし、各エージェントのペルソナを生成済みの `.opencode/agents/<id>.md` ファイルから解決します。

### 明示的なディスパッチ

`--vendor opencode` の上書きを指定すると、任意のエージェントを OpenCode 経由でルーティングできます。

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor opencode
```

これは `opencode run --agent pm --dir <workspace> "<prompt>"` を実行します。プロンプトは**末尾の位置引数**です。opencode の `-p` フラグはプロンプトではなく `--password` を意味します。

### エージェントごとの OpenCode モデル

特定のエージェントを OpenCode のモデルへルーティングするには、モデルを `models:` に登録して `agents:` から参照します。要件は 2 つあります（[モデルスラッグをインライン定義する](#inlining-model-slugs)を参照）。

1. **スラッグは `owner/model` 形式でなければなりません。** レジストリキーには OpenCode の `provider/model` スラッグを使います。裸の名前は `agents.<id>.model` スキーマで拒否されます。
2. **仕様は完全でなければなりません。** `cli`、`cli_model`、`auth_hint`、すべての `supports` フィールドが必要です。不完全な仕様は検証に失敗し、OMA は警告をログに出力してコアレジストリへフォールバックします。その場合、エージェントは OpenCode へルーティングされません。

```yaml
# .agents/oma-config.yaml
language: en
model_preset: claude          # heavier impl roles stay on Claude

models:
  opencode-go/deepseek-v4-flash:
    cli: opencode
    cli_model: opencode-go/deepseek-v4-flash
    auth_hint: "OpenCode Go subscription — run: opencode auth login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [opencode]
      api_only: false

agents:
  pm:      { model: opencode-go/deepseek-v4-flash }
  qa:      { model: opencode-go/deepseek-v4-flash }
  docs:    { model: opencode-go/deepseek-v4-flash }
  explore: { model: opencode-go/deepseek-v4-flash }
```

ルーティングされた各エージェントは `opencode run -m opencode-go/deepseek-v4-flash --agent <id> --dir <workspace> "<prompt>"` を実行します。pm、qa、docs、explore のような軽量で高速なロールに適しています。より重い実装エージェントは Codex や Claude などに残せます。

### モデルスラッグを検証する

OpenCode のカタログはサブスクリプションとログインによって制限されるため、oma は OpenCode のモデルスラッグを**ハードコードしません**。インストール済みのカタログに対して検証します。

```bash
oma model probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```

`oma model probe` は、スラッグが `opencode models` に列挙されていれば `accepted`、列挙されていなければ `rejected`、プロバイダーがログインまたはサブスクリプションを要求する場合は `auth_required` を報告します。

### 認証と生成ファイル

- **認証：** `opencode auth login` は認証情報を `~/.local/share/opencode/auth.json` に、プロバイダーごとに 1 エントリずつ保存します。`oma auth status` / `oma doctor` は、いずれかのプロバイダーに認証情報があれば OpenCode を認証済みとして報告します。一方、`oma doctor --profile` はプロバイダーを区別します。各行を登録済み `cli_model` のプロバイダー接頭辞に対して確認するため、`cli_model: zai-coding-plan/glm-5.3` のモデルは `zai-coding-plan` の認証情報で確認されます。登録済みの `provider/model` 形式の `cli_model` がない行は、認証失敗と断定せず `? unknown` と報告します。
- **生成ファイル：** `oma link`（または `oma link opencode`）は、エージェントごとに 1 つの `.opencode/agents/<id>.md` ペルソナと `.opencode/plugins/oma/` ブリッジを書き込みます。これらは `.agents/` の SSOT から生成されるため、直接編集せず、`oma link` を再実行して生成し直してください。

> **永続ワークフローに関する注意：** OpenCode の `session.idle` イベント（Claude の `Stop` フックに最も近いもの）は通知専用で、セッションの終了をブロックできません。そのため、永続ワークフロー（orchestrate / work / ultrawork）は OpenCode では**Stop セマンティクスが低下した状態**で動作します。ワークフローの再強化は、セッションを開いたままにするのではなく、次のメッセージで行われます。

---

## Kimi Code CLI を介したディスパッチ

[Kimi Code CLI](https://www.kimi.com/code) は、フックをグローバル設定（`~/.kimi-code/config.toml`、`KIMI_CODE_HOME`）からのみ読み込みます。そのため `oma install` と `oma link` は、Antigravity と同様に明示的な同意を得て、HOME に Kimi のフックチェーンとスキルシンボリックリンクを書き込みます。Kimi は oma の SSOT `.agents/skills/` も直接スキャンするため、いずれにせよスキルはプロジェクト全体で解決できます。**MCP** は HOME への書き込みを必要とせず、プロジェクト単位です。プロジェクトでは `<cwd>/.kimi-code/mcp.json` に、グローバルでは `~/.kimi-code/mcp.json` に、モードに応じて書き込みます。

### 明示的なディスパッチ

`--vendor kimi` の上書きを指定すると、任意のエージェントを Kimi 経由でルーティングできます。

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor kimi
```

これは `kimi -p "<prompt>"` を実行します。Kimi の `-p`（非対話）モードは `auto` 権限ポリシーの下で通常のツール呼び出しを自動承認するため、oma は `--yolo` や `--auto` を追加しません。これらは `-p` と同時には使えません。

### エージェントごとの Kimi モデル

OpenCode と同様に、oma は Kimi のモデルカタログをハードコードしません。ラインナップはプロバイダーとサブスクリプションによって異なるためです。特定のエージェントを Kimi のモデルへルーティングするには、`cli: kimi` を含む完全な仕様を `models:` に登録し、`agents:` から参照します。

レジストリキーは `owner/model` 形式でなければなりません。裸の名前は `agents.<id>.model` スキーマで拒否されます。`cli_model` は `kimi --model` に渡す正確なエイリアスです。Kimi がドキュメントで示すコーディング用エイリアスは `kimi-code/kimi-for-coding` です。設定をコミットする前に、サブスクリプションで使えるエイリアスを `kimi --model <alias>` で確認してください。

```yaml
# .agents/oma-config.yaml
models:
  kimi-code/kimi-for-coding:
    cli: kimi
    cli_model: kimi-code/kimi-for-coding
    auth_hint: "Kimi subscription — run: kimi login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: []
      api_only: false

agents:
  pm:   { model: kimi-code/kimi-for-coding }
  docs: { model: kimi-code/kimi-for-coding }
```

ルーティングされた各エージェントは `kimi --model kimi-code/kimi-for-coding -p "<prompt>"` を実行します。

> **永続ワークフローに関する注意：** Kimi がドキュメントで示す Stop ブロッキングの経路は終了コード 2 と stderr ですが、`oma hook run` ルーターは常に 0 で終了し、stdout の方言を出力します。oma はベストエフォートで `permissionDecision: "deny"`（Claude 形式の `decision: "block"` も併記）を出力するため、Kimi では永続ワークフローが段階的に機能低下します。
