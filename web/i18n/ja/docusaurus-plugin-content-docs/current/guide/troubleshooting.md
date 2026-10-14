---
title: "ガイド: トラブルシューティング"
sidebar_label: トラブルシューティング
description: インストール、設定、ベンダー、フック、ダッシュボード、スケジュール、評価、エージェント結果の問題を、症状または正確なエラーメッセージから診断し、ソースに基づく確認方法と対処法を示します。
---

# トラブルシューティング

まず、プロジェクトまたはインストールのルートから機械可読な診断を開始します。

```bash
oma doctor --json
```

コマンドが終了すると、インストール、ベンダー、設定、統合に関する検出結果を含む JSON が出力されます。モデルまたはエージェントごとの解決が問題の場合は `--profile` を追加します。問題を報告するときは JSON を保持してください。推測による説明を加えなくても、選択されたパスと確認結果を含められます。

## 症状から探す {#find-your-symptom}

| 症状 | 参照先 |
|---------|-------|
| OMA が間違った設定を読み込む、または更新で設定が置き換えられた | [CLI またはインストールが間違ったファイルを使っている](#the-cli-or-install-is-using-the-wrong-files) |
| `oma install` または `oma update` がリリースをダウンロードできない | [インストールまたは更新でリリースをダウンロードできない](#an-install-or-update-cannot-download-the-release) |
| ベンダー CLI またはモデルが起動しない | [ベンダーが起動しない](#a-vendor-does-not-start) |
| フックはインストールされているが何も起きない | [フックはインストールされているが実行されない](#hooks-are-installed-but-do-not-run) |
| ダッシュボードが空、切断される、または起動しない | [ダッシュボードが空、または切断される](#the-dashboard-is-empty-or-disconnected) |
| スケジュールしたジョブがない、または失敗した | [スケジュールがない、または実行されない](#a-schedule-is-missing-or-did-not-run) |
| スキル評価または最適化でカバレッジがないと報告される | [評価または最適化でカバレッジがないと報告される](#evaluation-or-optimization-reports-no-coverage) |
| エージェント実行が検証、完了、再開できない | [結果を確定または再開できない](#a-result-cannot-finish-or-resume) |
| CLI がエラーメッセージを表示した | [エラーから探す](#find-your-error) |

## エラーから探す {#find-your-error}

以下の各メッセージは CLI が出力するものです。メッセージの先頭部分で照合してください。

| メッセージ | 原因 | 対処法 |
|---------|-------|-----|
| `Unknown plan task: <id>` | タスク ID（`--task-id` で指定したもの、またはデフォルトではエージェント ID）が `.agents/results/plan-<session>.json` のタスク `id` にない | プランにあるタスク ID を `--task-id` に渡す |
| `Plan is immutable after dispatch; ...` | セッションのプランが最初のディスパッチ後に変更された | プランを元に戻すか、変更したプランを新しいセッション ID（`lineage_id` を設定している場合は新しい `lineage_id` も）で保存する |
| `Task acceptance contract changed before dispatch` または `Plan changed before dispatch` | 実行の開始中にプランが編集された | プランが安定してから再試行する |
| `Attempt limit reached for workflow lineage and logical goal` | プランの `max_attempts`（デフォルト 3、最初の試行を含む）を使い切った | 次の試行を計画する前に、失敗した試行を確認する |
| `Cannot verify a finished run; start a new run` | 実行の完了後に `oma agent verify` を実行した | `oma agent begin` で新しい実行を開始する |
| `Choose a command, --required, or --affected` | `oma agent verify` に検証モードが指定されていない、または複数指定された | `--required`、`--affected PATH...`、`-- <argv>` のいずれか 1 つだけを使う |
| `No complete test selection for affected paths: ...` | グラフにそのパスに対する完全なテスト選択がない | `--required` を使う |
| `The spawning parent finalizes managed runs; write the claim file instead` | `oma agent spawn` または `parallel` で開始した実行に対して `oma agent finish` を呼び出した | 注入されたパスに申告を書く。実行は親が確定する |
| `Resume requires a session plan with task contracts` | セッションにプランファイルがない | 再開はプランベースのセッションでのみ動作する。代わりにタスクを再度起動する |
| `A resume coordinator already owns this session` | そのセッションに対する別の `oma agent resume` が実行中、またはそのリースが別のホストのもの | もう一方の再開が終わるのを待つ。同じホスト上で終了したプロセスが残したリースは自動で回収される |
| `No graph-backed context found for <agent>` | そのエージェントのグラフコンテキストが存在しない | タスク定義を修正するか、プロジェクトに記載されたネイティブ検索の方法で続行する |
| `Dashboard failed: port 9847 is already in use. ...` | 別のプロセスがダッシュボードのポートを使用している | `DASHBOARD_PORT=8080 oma dashboard web` を使うか、別のプロセスを停止する |
| `Invalid DASHBOARD_PORT: ...` | `DASHBOARD_PORT` が 1 から 65535 の整数ではない | 有効なポートを設定するか、設定を解除して 9847 を使う |
| `Removed option <old>. Use <new>.` | 削除されたフラグの綴りをコマンドで使った | メッセージに示されたフラグを使う |
| `Unknown command: ... Use oma --help.` | コマンドパスが削除された、または名前が変更された | `oma --help` または `oma describe` で現在のパスを確認する |
| `oma agent spawn` が終了コード 3 で終了する | ベンダーは 0 で終了したが、実行が `completed` で終わらなかった | 実行記録の `unresolved` を読む。[エージェントの結果と再開](./agent-results-and-resume.md)を参照 |

## CLI またはインストールが間違ったファイルを使っている {#the-cli-or-install-is-using-the-wrong-files}

コンテキストを明示的に確認します。

```bash
oma doctor --json
oma doctor --profile
```

| 症状 | 原因 | 対処法 |
|---------|-------|-----|
| 設定が無視される、またはグローバルのデフォルトが優先される | コマンドは `$OMA_HOME/.agents/`（デフォルトは `~/.oma/.agents/`）からグローバルのデフォルトを読み込み、次に最も近いプロジェクトの共有設定と 1 つのローカルオーバーレイを読み込む。異なる祖先のプロジェクトルートはマージされない | `oma doctor --json` が選択した設定パスを確認し、実際に読み込まれているファイルを編集する |
| 設定の読み込み中に OMA が停止する | ローカルの CUE と YAML が両方ある、またはローカルファイルの形式が壊れている。OMA は上書きを黙って無視せず停止する | 2 つのローカルファイルの一方を削除するか、壊れたファイルを修正する |
| 更新後にユーザー設定が置き換えられた | 更新が `--force` 付きで実行された。通常の更新はユーザーが管理する設定を保持するが、force モードでは置き換えられることがある | `--force` なしで更新し、設定と生成されたパスを確認する |

ファイルの読み込み順は[設定リファレンス](/docs/guide/configuration-reference)を参照してください。更新後は、設定と生成されたパスを確認します。

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` を使うと、実行は非対話式になります。

## インストールまたは更新でリリースをダウンロードできない {#an-install-or-update-cannot-download-the-release}

<!-- oma-docs:ignore-start -->
`oma install`、`oma update`、`oma doctor` の修復は、`main` ブランチの `prompt-manifest.json` が指すリリースをダウンロードします。まず `cli-v<version>` GitHub リリースの `agent-skills.tar.gz` アセットを試し、その `.sha256` ファイルで検証します。次にそのタグのソースアーカイブ、最後にそのタグの shallow clone を試します。チェックサムの不一致や、`.agents/skills/_version.json` が別のバージョンを示すペイロードがあった場合は、別のソースを試さずに実行を停止します。
<!-- oma-docs:ignore-end -->

| 症状 | 原因 | 対処法 |
|---------|-------|-----|
| リリース直後にダウンロードが失敗する | マニフェストが指すバージョンのアセットがまだ公開中 | 数分待ってから再試行する |
| `main` のリリース前の内容が必要 | リリースはタグ付きの内容だけをインストールする | `OMA_UPDATE_CHANNEL=main oma update` でその実行に限ってオプトインする |

```bash
OMA_UPDATE_CHANNEL=main oma update
```

実行すると、main ブランチの内容はタグ付きリリースでもチェックサム検証済みでもない、という警告が表示されます。

## ベンダーが起動しない {#a-vendor-does-not-start}

まずベンダー自身の認証チェックを実行し、次に OMA が解決したプロファイルを確認します。

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

| 症状 | 原因 | 対処法 |
|---------|-------|-----|
| ベンダー CLI が認証されていない | ベンダーのセッションが期限切れ、または一度も設定されていない | `oma doctor` が表示したベンダーのコマンドをそのまま使って再認証する |
| モデルの上書きが拒否される | 上書きがスキーマの受け付ける `owner/model` 形式ではない、またはそのベンダーが選択した CLI トランスポートに対応していない | `owner/model` 形式を使い、そのトランスポートに対応するベンダーを指定する |
| `model_preset: free` がゲートウェイに到達できない | 解決されたゲートウェイ URL またはモデルが間違っている、または設定された API キー環境変数が空 | `oma doctor --profile` でゲートウェイ URL とモデルを確認し、環境変数にキーを設定する |
| 子プロセスが結果アーティファクトなしで終了する | 子プロセスが注入されたパスに申告を書かなかった | 実行ディレクトリと親の状態を確認する（下記参照） |

`free` マップを省略した場合のデフォルトは `http://127.0.0.1:31415/v1`、`FREELLM_API_KEY`、モデル `auto` です。API キー自体を YAML に書かないでください。

起動された子プロセスは実行 ID と結果の指示を受け取り、注入されたパスに申告（claim）を書き、アーティファクトを報告します。親は終了コードを取得した後で、管理対象の受領記録を確定します。読み取り専用の子プロセスは `OMA_RESULT_JSON: ...` を返します。この行は検査として記録されますが、実行可能な検証を満たしません。

## フックはインストールされているが実行されない {#hooks-are-installed-but-do-not-run}

| 症状 | 原因 | 対処法 |
|---------|-------|-----|
| Codex が OMA のフックを実行しない | フックがまだ信頼されていない。初回のインストール直後か、更新によってフックのコマンド文字列が変わった | `.codex/hooks.json` を確認し、Codex 内で `/hooks` を実行する |

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

OMA が起動する Codex サブプロセスは、自身の管理対象の実行にバイパスフラグを渡します。これは、自分で開始した Codex セッションのフックを信頼するものではありません。[Codex フックの信頼設定](/docs/guide/codex-hook-trust)を参照してください。

## ダッシュボードが空、または切断される {#the-dashboard-is-empty-or-disconnected}

セッションファイルがあるプロジェクトから、ターミナルダッシュボードを起動します。

```bash
oma dashboard terminal
```

| 症状 | 原因 | 対処法 |
|---------|-------|-----|
| `No agents detected yet` | ワークフローが監視対象のメモリディレクトリにセッション、タスク、進捗ファイルをまだ書き込んでいない、またはダッシュボードが別のディレクトリを監視している | 最初の進捗ファイルを待つ。プロジェクトルートから実行するか、`--project-root <path>` を渡すか、`MEMORIES_DIR` を設定する |
| 古い `.serena/memories/` ディレクトリのファイルが表示されない | ダッシュボードは `.agents/state/memories/` を読み込み、古いディレクトリは検索しない | ファイルがあるディレクトリを `MEMORIES_DIR` に設定する |
| `oma dashboard web` が `port 9847 is already in use` で終了する | 別のプロセスがポートを使用している | 別の `DASHBOARD_PORT` を使う |
| ダッシュボードを再起動した後も Web ページが Disconnected のまま | 起動のたびに新しいアクセストークンが作られるが、開いているタブは古いトークンを保持している | ページを再読み込みする |

Web ダッシュボードはループバックにバインドし、URL を表示します。その URL を開いてください。ページは Web API と WebSocket 用のトークンを自身で保持しています。

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

ダッシュボードのその他のシグナルは[ダッシュボード監視](./dashboard-monitoring.md#troubleshooting-runbook)にあります。

## スケジュールがない、または実行されない {#a-schedule-is-missing-or-did-not-run}

マニフェストとスケジューラーの状態を確認します。最初の 2 つのコマンドは読み取り専用で、残りの 2 つは状態を変更します。

```bash
oma schedule list                 # read-only: synced, stale, missing-in-os, orphan-in-os
oma schedule inspect SCHEDULE_ID  # read-only: one manifest entry
oma schedule sync                 # writes: registers missing jobs and rewrites stale ones
oma schedule run SCHEDULE_ID      # executes the job now (normally invoked by the OS scheduler)
```

| 症状 | 原因 | 対処法 |
|---------|-------|-----|
| `schedule list` に `missing-in-os` または `stale` が表示される | OS への登録がない、または古い | `oma schedule sync` |
| 実行ログに `Unknown command: schedule:run` と表示される | その登録がコマンド名の変更より前のもの | `oma update` が自動で再同期する。`oma schedule sync` でも書き換えられる |
| `schedule list` に `orphan-in-os` が表示される | OS のジョブにマニフェストのエントリがない | 孤立したジョブを削除してよい場合に限り `oma schedule sync --prune` |
| 作成したスケジュールが登録されなかった | プレビューだけを行う `--dry-run` 付きで作成した | `--dry-run` なしで作成し直す |
| 繰り返し間隔が登録されなかった | 間隔に丸めが必要 | プレビューを確認し、`--accept-rounded` で丸めを受け入れる |
| ジョブは実行されたが失敗した | ベンダーの終了コードが 0 以外、またはログに `re-auth required` と出ている | `~/.oma/schedule/runs/<id>/` の実行ログを確認し、ベンダーを再認証する |

## 評価または最適化でカバレッジがないと報告される {#evaluation-or-optimization-reports-no-coverage}

| 症状 | 原因 | 対処法 |
|---------|-------|-----|
| スキル評価または最適化でカバレッジがないと報告される | `.agents/eval/<skill>/` の下のフィクスチャが 5 つ未満 | フィクスチャを 5 つ以上になるまで追加する |
| モックモードが記録済みのロールアウトを拒否する | 記録したロールアウトの出所が現在のスキルとフィクスチャハッシュに一致しない | ライブモードで再記録する。古い `_rollouts` ファイルを新しいスキルディレクトリにコピーして、現在の証拠として扱わない |
| `--apply` が書き込みを拒否する | `--apply` には、検証結果が厳密に正で、実行側が所有するテスト分割に合格することが必要 | 提案された diff を確認する間はデフォルトの `--dry-run` を維持し、まず失敗している検証を修正する |

`--apply` で変更した OMA 所有のスキルは、後の `oma update` で上書きされる場合があります。

## 結果を確定または再開できない {#a-result-cannot-finish-or-resume}

実行とプランのファイルを確認します。

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

| 症状 | 原因 | 対処法 |
|---------|-------|-----|
| 完了した申告が拒否される、または格下げされる | 検証記録の失敗、入力の変更、アーティファクトの欠落、未解決項目、タスク契約の変更 | 完了前に `oma agent verify RUN_ID --required` を実行し、受領記録が報告した問題を修正する |
| 再開してもタスクが `blocked` のまま | 自動再開には `retry_policy: "safe"`、再生可能なプロンプト、残りの試行回数が必要 | dry-run レポートで理由を確認する。プランは最初のディスパッチ後に固定されるため、新しいセッションのプランで `retry_policy` を設定するか、タスクを手動で再実行する |
| 再開してもタスクが再試行されない | 重複作業を防ぐため、実行中のプロセスや、明確な partial／failed 結果のない中断されたネイティブ実行はそのまま残される | 実行中のプロセスを待つか、先にネイティブ実行を確定する |

ライフサイクル全体は[エージェントの結果と再開](./agent-results-and-resume.md)を参照してください。

## 助けを求める {#ask-for-help}

助けを求めるときは、関連する `oma doctor --json` の出力、コマンド、セッション／実行 ID、未解決メッセージを含めます。認証情報や、秘密情報を含むファイルの内容は含めないでください。Issue は [github.com/first-fluke/oh-my-agent/issues](https://github.com/first-fluke/oh-my-agent/issues) で作成してください。

## 関連項目 {#see-also}

- [OMA の使い方](./usage.md#troubleshooting): スキルや CLI の欠落、ワークスペースの競合などのセットアップの問題
- [ダッシュボード監視](./dashboard-monitoring.md#troubleshooting-runbook): 停止、クラッシュ、切断されたダッシュボードのシグナル
- [エージェントの結果と再開](./agent-results-and-resume.md): 実行記録、申告、復旧
- [用語集](../getting-started/glossary.md): [実行記録と申告](../getting-started/glossary.md#run-record-and-claim) などの用語
