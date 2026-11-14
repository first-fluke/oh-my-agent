---
title: セットアップを選ぶ
sidebar_label: セットアップを選ぶ
description: タスク用に OMA スキルを 1 つ読み込むか、ドメインプリセットを選ぶか、ランタイムの依存を含む Claude Code プラグインをインストールします。
---

# セットアップを選ぶ

完了したいタスクの入り口を選びます。

| 必要なこと | 入り口 | 設定されるもの |
|---|---|---|
| いまのエージェントで焦点を絞ったタスク 1 つ | [スキルを 1 つ読み込む](#load-one-skill) | 一時ディレクトリにある指示とサポートファイル |
| プロジェクトフック、専門エージェント、ワークフロー | [スキルプリセットをインストールする](#install-a-skill-preset) | 選んだスキルを含む OMA ランタイム統合 |
| Claude Code マーケットプレイスからのインストール | [プラグインをインストールする](#install-the-claude-code-plugin) | OMA プラグインとプロジェクトのブートストラップ |
| Copilot CLI、Kiro、Qwen Code、Hermes、または Codex のパッケージインストール | [Agent Plugins パッケージ](../guide/vendor-capabilities.md#agent-plugins-package) | すべてのホスト向けのスキルと MCP サーバー。Copilot にはエージェント、コマンド、ルール、ブートストラップフックも入る |

## スキルを 1 つ読み込む {#load-one-skill}

コーディングエージェントに、タスク用のコマンドを実行させ、返された指示を読ませてください。`skills use` は指示と、サポートディレクトリのパスを表示します。別のエージェントを起動したり、OMA インストーラーを実行したりはしません。

| タスク | コマンド | 最初の依頼 |
|---|---|---|
| 管理画面のデザイン、または既存 UI のレビュー | `bunx skills use first-fluke/oh-my-agent@oma-design` | 管理画面の階層、テーブルの密度、空状態をレビューしてください。 |
| 再現できるバグ | `bunx skills use first-fluke/oh-my-agent@oma-debug` | この失敗を再現し、原因を直し、関係するチェックを実行してください。 |
| アーキテクチャの決定 | `bunx skills use first-fluke/oh-my-agent@oma-architecture` | このジョブを API に残す場合と、ワーカーへ移す場合を比較してください。 |

選んだフォルダーには、共有の指示参照が含まれます。そのフォルダーの外の依存は明示のままです。別のドメインスキル、プロジェクトルール、CLI 操作、ブラウザーツール、外部エンジンがまだ必要なことがあります。依頼した操作について、選んだスキルの依存を読んでください。タスクがフックや管理された実行を必要とするときは、ランタイムをインストールします。

デザイン作業では、`oma-design` は管理画面とプロダクトのインターフェース方向に Interface Design を、それ以外の Web のアートディレクションに Taste を、既存 UI の批評、監査、仕上げに Impeccable を選びます。プロジェクトのスタックと `DESIGN.md` は、実装とデザインの契約のままです。

## スキルプリセットをインストールする {#install-a-skill-preset}

CLI を一度インストールしてから、プロジェクトのスキルを選びます。

```bash
bun install --global oh-my-agent
oma install --preset frontend --yes
oma doctor
```

既存の CLI がある場合は、2 番目のコマンドから始められます。プリセット名とプロバイダーのオプションは `oma install --help` を見てください。[ブートストラップインストーラー](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#method-1-one-liner-install)は、対話式セットアップの前にランタイムの依存も準備します。

| プリセット | 最初のタスク | 使えるワークフローの例 |
|---|---|---|
| `frontend` | 設定ページを計画し、そのフォームを実装する | `/plan`、`/design`、`/review`、`/debug` |
| `backend` | 認証付き API エンドポイントを計画する | `/plan`、`/architecture`、`/review`、`/debug` |
| `research` | 論文を探し、その証拠を比較する | 引用付きの文献検索を依頼する |
| `all` | UI、API、データの横断で機能を調整する | `/orchestrate`、`/work`、`/ultrawork`、`/ralph` |

[`名前付きプリセット`](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#presets)は `--preset` が受け付けます。未知の名前、空の値、`custom` はインストール前に拒否されます。個別のスキルを選ぶには、`oma install` を対話式で実行し、Custom を選びます。`--preset` がない無人の `--yes` や CI のセットアップは `all` を選びます。

frontend プリセットは 8 個のスキルを選びます。プリセットが選ぶのはスキルの内容です。インストーラーは共有ファイル、すべてのワークフローとエージェント定義、フック、プロバイダーもセットアップします。ドメインプリセットの外のスキルが必要なワークフローがあります。使う前に[ワークフローの依存](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#workflows-that-need-skills-outside-a-preset)を確認するか、すべてのワークフローには `all` を選んでください。既存のインストールでより小さいプリセットを選んでも、他のスキルは削除されません。

プロバイダーの選択はプリセットとは独立です。たとえば、プロジェクトに意味メモリのサービスが不要なら `--semantic-memory none` を追加します。ランタイムが設定する他のファイルと統合は、[インストール時の効果](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#what-the-installer-also-does-by-default)を参照してください。

インストールの要約には、選んだスキルが並び、残しているスキルを含むスキルマニフェストの存在を確認します。条件分岐を含む、静的なワークフローとエージェントの参照を、参照されたスキルマニフェストとして報告します。タスクに必要な項目が欠けている、または読めない場合は `oma doctor` を実行して修復します。これらのチェックは、リソースの中身、ツール、プロバイダー、認証情報、実行までは確認しません。

## Claude Code プラグインをインストールする {#install-the-claude-code-plugin}

Claude Code の中で次のコマンドを実行します。

```text
/plugin marketplace add first-fluke/oh-my-agent
/plugin install oma@oh-my-agent
```

ドメインプラグインには `oma-frontend@oh-my-agent`、`oma-security@oh-my-agent`、`oma-research@oh-my-agent` を選びます。完全な `oma` エントリは、スキルの選択をすべて保持します。ドメインエントリは、対応するプリセットをブートストラップします。

プラグインのセッション開始フックは、必要なときに CLI を準備し、現在のプロジェクトに対して `oma install --yes` を実行します。この経路はランタイムのセットアップを行います。成功の受領記録はそのプロジェクトに属し、プラグインのイベントフックはインストール済みの CLI を使います。プラグインフックには、Windows を含め Bash が必要です。ブートストラップのタイムアウトは 600 秒です。失敗すると手動セットアップの手順を報告し、プロジェクトのログを `.agents/state/plugin-bootstrap.last-error.log` に残します。受領記録が再利用されるのは、CLI のバージョン、プロジェクト設定、フックのチェックが通った後だけです。ブートストラップが完了を報告したら、セッションを再起動します。

セットアップ中の設定と依存の選択には、`oma install` を直接使います。完全なプラグインの無人ブートストラップは `all` スキルプリセットを使います。各ドメインプラグインは、選んだプリセットを渡します。より小さいプリセットでも、プロジェクトにすでにインストールされている他のスキルは残ります。

## 結果を確認する {#check-the-result}

読み込んだスキルについては、エージェントが選んだ指示を読んだことを確認し、タスクで実際に行ったチェックを報告させてください。ランタイムをインストールした場合は `oma doctor` を実行し、プリセットの最初の依頼を試します。依頼したタスクがそのプロバイダーを使うとき、doctor のプロバイダー警告は重要です。
