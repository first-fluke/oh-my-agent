---
title: クイックスタート
description: スキル 1 つまたはランタイムプリセットを選び、実測の検証を伴う範囲を絞った最初のタスクを実行します。
---

# クイックスタート

焦点を絞ったタスクを 1 つ実行して結果を確認します。すでに使っているコーディングエージェントにスキルを読み込むか、プロジェクトのフックや専門エージェント、ワークフローが必要な場合はランタイムをインストールします。利用可能な構成と依存関係については[セットアップを選ぶ](./choose-setup.md)で説明しています。

## 1. セットアップを選ぶ {#1-install}

以下の読み取り専用 Git タスクでは、エージェントにスキルを読み込み、指示とサポートディレクトリを参照するよう依頼します。

```bash
bunx skills use first-fluke/oh-my-agent@oma-scm
```

続けてステップ 3 のタスクに進みます。スキルの CLI 操作、他のスキル、プロジェクトルール、外部サービスはそれぞれ独立した依存関係のままです。このスキルを読み込んでも OMA インストーラーは実行されません。

### 必要な場合にランタイムをインストールする

ランタイムのブートストラップでは、`bun`、`uv`、Serena、CUE、グローバルな `oma` コマンドを準備できます。すでに使っている AI CLI または IDE を選択してください。プロバイダーやブラウザーの統合は、実行予定のタスクによって異なります。

プロジェクトのディレクトリから、ブートストラップインストーラーを実行します。

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Windows PowerShell では次を実行します。

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

セットアップは既存の応答言語を保持するか、システム言語を自動検出します。対話式のセットアップでは、CLI ベンダー、[機能プロバイダー](./glossary.md#capability-provider)、[モデルプリセット](./glossary.md#model-preset)、プロジェクトの[スキルプリセット](./glossary.md#skill-preset)、スタックのバリアントを指定します。最初の実行ではデフォルトを使い、普段使っているベンダーを選び、リポジトリに最も近いプロジェクトプリセットを選択してください。各プリセットに含まれるスキルと、[プリセット外のスキルが必要なワークフロー](./installation.md#workflows-that-need-skills-outside-a-preset)については、[プリセット](./installation.md#presets)を参照してください。

すでに `bun` がある場合は、インストーラーを直接実行できます。

```bash
bunx oh-my-agent@latest
```

ブートストラップスクリプトは現在のプロジェクトにインストールします。HOME 単位でインストールしたい場合は `oma install --global` を使います。プロジェクト単位とグローバルインストールを組み合わせる前に、[グローバルインストール](../guide/global-install.md)を読んでください。


## 2. 結果を確認する

一時的にスキルを読み込む場合は、エージェントが選択した指示を読んだことを確認し、タスク自体を検証します。ランタイムをインストールした場合は、同じプロジェクトのディレクトリからヘルスチェックを実行します。

```bash
oma doctor
```

テキスト形式のコマンドは、`CLI Status` や `Skills Status` などのセクションを含むレポートを出力し、終了ステータスを返します。実際の行は、プロジェクトにインストールされているホストによって異なります。

```text
┌   🩺 oh-my-agent doctor
◇  CLI Status ...
◇  Skills Status ...
$ echo $?
0
```

`oma doctor` は、任意の統合の問題を警告として報告することがあります。デフォルトの AgentMemory の準備は `oma install` と `oma update` の実行中に確認されます。インストール、起動、ヘルスチェックのいずれかに失敗すると、これらのコマンドは停止します。`providers.semantic_memory: none` または `honcho` を選ぶか、`OMA_NO_AGENTMEMORY=1` を設定すると、この準備を省略します。

機械可読な形式で確認する場合は `oma doctor --json` を使います。レポートに問題が含まれていると、ゼロ以外の終了ステータスを返します。各標準エージェントロールで解決されたモデルと CLI を確認するには `oma doctor --profile` を使います。

`oma` が使えなくても Bun がインストールされている場合は、グローバルコマンドなしで同じチェックを実行できます。

```bash
bunx oh-my-agent@latest doctor
```

それでも `oma` コマンドが見つからない場合は、新しいシェルを開くか、パッケージマネージャーの bin ディレクトリを `PATH` に追加してください。`oma` コマンドのインストール方法は[インストール](./installation.md#method-3-global-install)にあります。`oma doctor` が無効な設定を報告した場合は、指定されたフィールドを修正してもう一度実行します。復旧のために `.agents/oma-config.yaml` を削除しないでください。このファイルはユーザーが管理する設定で、更新後も設定を保持します。

## 3. 小さなタスクを 1 つ実行する

お使いの AI ツールで既存の Git リポジトリを開きます。読み込んだ `oma-scm` スキル、または名前付きランタイムプリセットでインストールしたコピーを使います。Custom 選択を使った場合は、この例用に `oma-scm` を含めてください。

```text
Use oma-scm to inspect this repository's current branch and working tree. Do not edit, stage, commit, or contact remotes. Report staged, unstaged, and untracked changes, with the Git commands and exit statuses actually observed.
```

報告されたブランチと変更点を、実際の Git 出力と比較します。エージェントは実行したコマンドとその終了ステータスを報告するはずです。この読み取り専用のタスクでは、コードのテストやビルドは不要です。

通常のプロンプトだけではワークフローは開始せず、プロンプトフックが有効な場合は参考情報としてスキルヒントが追加されます。スキルのルーティングはホストまたは選択したワークフローが行うため、任意のホストへのプロンプトだけでフックや特定のスキルが保証されるわけではありません。それでも実行コントラクトでは、リポジトリの規約を確認し、指示された読み取り専用スコープを守り、実測のチェック結果を報告する必要があります。具体的なファイルとコマンドはプロジェクトによって異なります。

API と UI の両方にまたがるタスクでは、`/work` または `/orchestrate` を明示的に選択します。単一ドメインのタスクなら、[単一スキル実行](../guide/single-skill.md)に進んでください。より長い例は[使い方ガイド](../guide/usage.md)にあります。

## 4. 規模を広げる前にデフォルトを確認する

一時的なスキル読み込みでは、これらのランタイムのデフォルトは設定されません。プロジェクトフック、プロバイダー設定、チームワークフローを使う場合は、[セットアップを選ぶ](./choose-setup.md)のランタイム手順を利用してください。

OMA は初期状態で `model_preset: auto`、コードインテリジェンスに Serena、意味メモリに Agent Memory、Web 検索にネイティブ検索を使い、テレメトリを無効にします。Serena は共有 `bridge` トランスポートを使い、設定しない限り自動更新されます。ブラウザー DevTools MCP はオプトインで、初回の対話式セットアップでは Aside が先に提示されます。動作への影響と上書きキーは[重要なデフォルト](./important-defaults.md)を参照してください。

管理対象のタスクが停止した場合は、まず `oma agent status <session-id> [agent-id]` を実行し、`.agents/state/agent-runs/` にある受領記録と、注入された申告（claim）のパスを確認します。これらの記録には、実行、タスク、ワークスペース、終了コード、検証状態が含まれます。`.agents/state/memories/` の人間向け `result-*.md` と `progress-*.md` は、存在する場合に追加の文脈を提供します。実行が終了したことを確認してから、失敗した最小のコマンドだけを再実行してください。[永続ワークフロー](./glossary.md#persistent-workflow)は完了するか `workflow done` と指示するまでアクティブです。状態ファイルからの復旧については、[ワークフロー](../core-concepts/workflows.md#persistent-mode-mechanics)を参照してください。

## 次のステップ

- [セットアップを選ぶ](./choose-setup.md): スキル 1 つ、ランタイムプリセット、Claude Code プラグインの選択
- [重要なデフォルト](./important-defaults.md): 優先順位、プロバイダー、復旧方法
- [インストール](./installation.md): プリセット、ベンダー設定、グローバルインストール、更新
- [エージェント](../core-concepts/agents.md): 33 個のスキルパッケージとディスパッチロール
- [ワークフロー](../core-concepts/workflows.md): 計画、並列実行、QA、永続モード
- [トラブルシューティング](../guide/troubleshooting.md): インストール、ベンダー、フックが期待どおりに動かない場合
