---
title: "ガイド: トラブルシューティング"
sidebar_label: トラブルシューティング
description: インストール、設定、ベンダー、ダッシュボード、スケジュール、評価、エージェント結果の問題を、ソースに基づく確認方法で診断します。
---

# トラブルシューティング

まず、プロジェクトまたはインストールのルートから機械可読な診断を開始します。

```bash
oma doctor --json
```

コマンドが終了すると、インストール、ベンダー、設定、統合に関する検出結果を含む JSON が出力されます。モデルまたはエージェントごとの解決が問題の場合は `--profile` を追加します。問題を報告するときは JSON を保持してください。推測による説明を加えなくても、選択されたパスと確認結果を含められます。

## CLI またはインストールが間違ったファイルを使っている

コンテキストを明示的に確認します。

```bash
oma doctor --json
oma doctor --profile
```

プロジェクトのコマンドは、最も近い `.agents/oma-config.cue` または `.agents/oma-config.yaml` と、1 つのローカルオーバーレイを読み込みます。グローバルコマンドは HOME のインストールルートを読み込みます。ローカルの CUE と YAML が両方ある場合は、一方を削除してください。ローカルファイルの形式が壊れている場合、OMA は上書きを黙って無視せず停止します。[設定リファレンス](/docs/guide/configuration-reference)も参照してください。

更新後は、設定と生成されたパスを確認します。

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` を使うと、実行は非対話式になります。ユーザー設定が予期せず置き換わった場合は `--force` を使ったか確認してください。通常の更新はユーザーが管理する設定を保持しますが、force モードでは置き換えられることがあります。

## インストールまたは更新でリリースをダウンロードできない

<!-- oma-docs:ignore-start -->
`oma install`、`oma update`、`oma doctor` の修復は、`main` ブランチの `prompt-manifest.json` が指すリリースをダウンロードします。まず `cli-v<version>` GitHub リリースの `agent-skills.tar.gz` アセットを試し、その `.sha256` ファイルで検証します。次にそのタグのソースアーカイブ、最後にそのタグの shallow clone を試します。チェックサムの不一致や、`.agents/skills/_version.json` が別のバージョンを示すペイロードがあった場合は、別のソースを試さずに実行を停止します。
<!-- oma-docs:ignore-end -->

リリースを作成した直後は、マニフェストが指すバージョンのアセットがまだ公開中の場合があります。数分待ってから再試行してください。リリース前の `main` ブランチの内容をあえてインストールしたい場合は、その実行に限ってオプトインします。

```bash
OMA_UPDATE_CHANNEL=main oma update
```

実行すると、main ブランチの内容はタグ付きリリースでもチェックサム検証済みでもない、という警告が表示されます。

## ベンダーが起動しない

まずベンダー自身の認証チェックを実行し、次に OMA が解決したプロファイルを確認します。

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

再認証には、`oma doctor` が表示したベンダーのコマンドをそのまま使います。モデルの上書きにはスキーマが受け付ける `owner/model` 形式を使い、選択した CLI トランスポートに対応するベンダーを指定してください。`model_preset: free` の場合は、`oma doctor --profile` で解決されたゲートウェイ URL とモデルを確認し、設定された API キー環境変数にキーが入っていることを確認します。`free` マップを省略した場合のデフォルトは `http://127.0.0.1:31415/v1`、`FREELLM_API_KEY`、モデル `auto` です。API キー自体を YAML に書かないでください。

子プロセスが結果アーティファクトなしで終了した場合は、実行ディレクトリと親の状態を確認します。起動された子プロセスは実行 ID と結果の指示を受け取り、注入されたパスに claim（構造化された結果宣言）を書き、アーティファクトを報告します。親は終了コードを取得した後で receipt（実行記録）を確定します。読み取り専用の子プロセスは `OMA_RESULT_JSON: ...` を返します。これは検査として記録されますが、実行可能な検証を満たしません。

## フックはインストールされているが実行されない

Codex の場合は生成されたファイルを確認し、初回の信頼フローを行います。

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

初回のインストール後と、更新によってコマンド文字列が変わった後に `/hooks` を実行します。OMA が起動する Codex サブプロセスは、管理対象の実行にバイパスフラグを渡します。これは、自分で開始した Codex セッションのフックを信頼するものではありません。[Codex フックの信頼設定](/docs/guide/codex-hook-trust)を参照してください。

## ダッシュボードが空、または切断される

セッションファイルがあるプロジェクトから、ターミナルダッシュボードを起動します。

```bash
oma dashboard terminal
```

デフォルトでは `.agents/state/memories/` を読み込みます。状態が別の場所にある場合は `MEMORIES_DIR` を設定してください。Web ダッシュボードはループバックにバインドし、トークン付き URL を表示します。

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

コマンドが表示した正確な URL を開いてください。Web API と WebSocket にはダッシュボードのトークンが必要です。ポートが使用中なら別の `DASHBOARD_PORT` を使います。エージェントが表示されない場合は、ワークフローが選択したメモリディレクトリにセッション、タスク、進捗ファイルを書き込んでいるか確認してください。ダッシュボードは古い `.serena/memories/` ディレクトリを自動検索しません。

## スケジュールがない、または実行されない

マニフェストとスケジューラーの状態を確認します。

```bash
oma schedule list
oma schedule sync
oma schedule run SCHEDULE_ID
```

`schedule list` は `synced`、`stale`、`missing-in-os`、`orphan-in-os` を報告します。`schedule sync` は不足しているジョブを復元し、`stale` の登録を書き換えます（実行ログに `Unknown command: schedule:run` と出ている場合は、その登録がコマンド名の変更より前のものです。`oma update` が自動で再同期します）。孤立した OS ジョブを削除する場合だけ `--prune` を追加してください。`--dry-run` で作成したプレビューはジョブを登録しません。繰り返し間隔では、プレビューを確認してから `--accept-rounded` を使い、OMA の丸めを受け入れます。ベンダーの終了コードが 0 以外、または `re-auth required` になっていないか、`~/.agents/schedule/runs/<id>/` の実行ログで確認してください。

## 評価または最適化でカバレッジがないと報告される

スキル評価とスキル最適化には、`.agents/eval/<skill>/` の下に少なくとも 5 つのフィクスチャが必要です。モックモードでは、記録したロールアウトの出所が現在のスキルとフィクスチャハッシュに一致している必要があります。フィクスチャまたはスキルを変更した場合はライブモードで再記録してください。古い `_rollouts` ファイルを新しいスキルディレクトリにコピーして、現在の証拠として扱わないでください。

最適化では、提案された diff を確認する間はデフォルトの `--dry-run` を維持します。`--apply` には、検証結果が厳密に正で、実行側が所有するテスト分割に合格することが必要です。OMA 所有のスキルは、後の `oma update` で上書きされる場合があります。

## 結果を確定または再開できない

実行とプランのファイルを確認します。

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

完了前に `oma agent verify RUN_ID --required` を実行します。検証記録が失敗している場合、入力が変わった場合、アーティファクトがない場合、未解決項目がある場合、タスク契約が変わった場合は、完了した claim が拒否または partial に格下げされます。再開が自動で行われるのは、`retry_policy: "safe"`、再生可能なプロンプト、残りの試行回数があるタスクだけです。重複実行を防ぐため、実行中のプロセスや中断されたネイティブ実行に明確な partial／failed 結果がない場合は、そのまま残されます。[エージェント結果と再開](/docs/guide/agent-results-and-resume)を参照してください。

助けを求めるときは、関連する `oma doctor --json` の出力、コマンド、セッション／実行 ID、未解決メッセージを含めます。認証情報や、秘密情報を含むファイルの内容は含めないでください。
