---
title: "ガイド：グローバルインストール"
sidebar_label: グローバルインストール
description: プロジェクトごとではなく OMA のグローバルホーム（~/.oma/）に oh-my-agent をインストールし、同じスキル、ワークフロー、ルールをすべてのプロジェクトで使えるようにします。oma install --global、oma update --global、oma uninstall --global、OMA_HOME の上書き、oma doctor による二重インストールの検出、プラットフォームごとの注意点（sudo 拒否、CI、WSL、cwd=HOME ガード）を扱います。
---

## グローバルインストールとは

デフォルトでは、`oma install` の対象は現在のプロジェクトディレクトリです。SSOT は `<cwd>/.agents/` に置かれ、ベンダー設定は `<cwd>/.claude/`、`<cwd>/.codex/` などに書き込まれます。**グローバルインストール**（`oma install --global`）では、oh-my-agent を OMA のグローバルホームにインストールします。そのため、プロジェクトを開くたびにインストールを繰り返さなくても、同じスキル、ワークフロー、ルールをすべてのプロジェクトで使えます。SSOT は `~/.oma/.agents/` に置かれ、ベンダー設定は引き続き `~/.claude/`、`~/.codex/` などに置かれます。

## プロジェクトとグローバルの比較

| 項目 | プロジェクト（`oma install`） | グローバル（`oma install --global`、デフォルトの OMA ホーム） |
|--------|------------------------|--------------------------------|
| SSOT の場所 | `<cwd>/.agents/` | `~/.oma/.agents/` |
| ベンダー設定 | `<cwd>/.claude/`、`<cwd>/.codex/` など | `~/.claude/`、`~/.codex/` など |
| ロックファイル | `<cwd>/.agents/_install.lock` | `~/.oma/.agents/_install.lock` |
| メタデータ | `<cwd>/.agents/skills/_version.json`（schemaVersion 2） | `~/.oma/.agents/skills/_version.json`（schemaVersion 2） |
| 用途 | プロジェクトごとのカスタマイズ | すべてのプロジェクトに適用する個人用のデフォルト |
| oma-config.yaml のスコープ | プロジェクト固有 | ユーザー全体のベースライン |

両方のモードは共存できます。`oma doctor` は両方のインストールがあればレポートし、両者の差異も示します。

グローバルインストールが成功したら、ユーザーのホームを起点とするファイルと解決済みプロファイルを確認します。

```bash
oma doctor --global --json
oma doctor --global --profile
```

最初のコマンドはインストールとベンダーの状態を報告し、プロファイルコマンドはエージェントが使うモデル計画を表示します。`--global`（または `-g`）は省略しないでください。省略すると、どちらのコマンドも現在のディレクトリにあるプロジェクトを調べ、そのプロジェクトの設定をグローバルのデフォルトに重ねた結果を表示します。

## 初回セットアップ

マシンで `oma install --global` を初めて実行すると、インストール開始前に次の説明が表示されます。

```text
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.oma/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.oma/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

確認すると続行します。その後はプロジェクトインストールと同じ対話フローで、言語、モデルプリセット、プロジェクト種別、ベンダーを選択します。

インストールが成功すると、次の手順が表示されます。

```text
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## 注意点

### sudo では実行できない

`oma install` は、モードにかかわらず `sudo` で実行すると直ちに終了します。

```text
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

通常のユーザーとして、`sudo` を付けずにコマンドを実行してください。

### CI 環境

CI パイプラインで `oma install --global` を実行すると、CI ランナーの HOME ディレクトリが変更されます。通常は望ましくありません。ブートストラップ用のパイプラインなどで必要な場合、oma は次の警告を出します。

```text
Running `oma install --global` in CI. This will modify the CI user's HOME. Proceeding because --yes / non-interactive mode is set.
```

この警告は `CI` が `true` または `1` のときに表示されます。これらの値はすでにインストールを非対話にするため、デフォルト値で続行し、入力を待ちません。CI の外では、`--yes` または `OMA_YES=1` で同じ非対話の動作になります。

### WSL の Linux HOME と Windows USERPROFILE

oma が Windows Subsystem for Linux 内で実行されていることを検出すると、次のメッセージを表示します。

```text
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

WSL のインストールと PowerShell のインストールは独立しています。両方でグローバルに使う場合は、WSL と PowerShell からそれぞれ一度ずつ `oma install --global` を実行してください。

### cwd が HOME の場合のガード（プロジェクトモード）

`oma link` と `oma update`（`--global` なし）は、現在のディレクトリが HOME の間は実行を拒否します。プロジェクトモードでは `<cwd>/.claude/settings.json` が `~/.claude/settings.json`、つまりグローバルの Claude Code 設定になります。プロジェクトスコープのレンダーは、その `$HOME/.claude/hooks/...` コマンドを `$CLAUDE_PROJECT_DIR/...` に書き換えるため、独自の `.claude/hooks/` を持たないプロジェクトで、すべてのフックとステータスラインが壊れます。グローバルインストールには代わりに `oma link --global` / `oma update --global` を使うか、先にプロジェクトへ `cd` してください。

現在のディレクトリが HOME であるときに `--global` を付けずに `oma install` を実行すると、oma は次の警告を出します。

```text
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

非対話型または CI モードでは自動的に中止します。ユーザー全体へのインストールを意図している場合は `--global` を使ってください。

## グローバルインストールの再リンク

`oma link` は再インストールせずに SSOT からベンダー固有のファイルを生成し直します。`install` や `update` と同様に、対象はインストールコンテキストから解決されます。`~/.oma/.agents/` を調整するには `--global` を渡してください。`$HOME` だけでなく、どのディレクトリからでも実行できます。

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.oma/.agents/oma-config.yaml)
oma link opencode --global
```

`--global` を付けない `oma link` は `<cwd>/.agents/` を対象にします。そのため、グローバルインストールを使っているときにプロジェクト内で実行すると、そこに `.agents/` ディレクトリがないという結果になります。

## アンインストール

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```

アンインストールコマンドは、oma が所有するファイルとユーザーが所有するファイルを分けて扱います。削除するのは、`.agents/state/` 配下の `managed-skills.json` に OMA 管理として記録されたスキルだけです。`<!-- oma:generated -->` マーカーは、生成された Copilot のプロンプトファイルを識別します。ユーザー所有のコンテンツ（`oma-config.yaml`、`mcp.json`、管理対象として記録されていないスキル）は決して削除しません。正確な一覧を確認するには、先に `--dry-run` を実行してください。

プロジェクトインストールをアンインストールするには、`--global` を省略します。

```bash
oma uninstall [--dry-run]
```

## OMA_HOME の上書き

OMA が所有するグローバルデータの場所を移すには、`OMA_HOME` に絶対パスを設定します。

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` はグローバルの保存ルートであり、プロジェクトのインストール先ではありません。上の値では、グローバル定義は `/tmp/oma-test/.agents/` に置かれます。プロジェクトのインストールとリンクは引き続き `<cwd>/.agents/` を使います。ベンダー固有の設定と認証情報は `OMA_HOME` の外に残ります。グローバルの OpenCode 統合ファイルは、実際の HOME ディレクトリ配下の `~/.config/opencode/` に書き込まれます。

`OMA_STATE_HOME` は、プロファイル／L1／プロジェクトのランタイム保存先に対する明示的な例外です。絶対パスでなければならず、`u/` を含みます。設定しない場合、プロファイルは `OMA_HOME` に従います。`XDG_CONFIG_HOME` は OMA の状態の場所をもう移動せず、OMA の OpenCode 出力パスも変更しません。OS キーチェーンの秘密情報、AgentMemory／Honcho のデータ、管理対象ツールチェーンのキャッシュは、既存の所有者のもとに残ります。

## グローバルの保存レイアウト

グローバルデータはデフォルトで `~/.oma` 配下にあります。`OMA_HOME` を設定した場合は、`~/.oma` をその値に置き換えてください。

| データ | 場所 |
|---|---|
| グローバル定義、設定、インストールメタデータ | `~/.oma/.agents/` |
| スケジュールのマニフェスト、取得した環境、実行ログ | `~/.oma/schedule/` |
| グローバルのバックアップ | `~/.oma/backup/` |
| Serena のレジストリ、ロック、ログ | `~/.oma/state/serena/` |
| vault のキー名インデックス | `~/.oma/state/vault-index.json` |
| プロファイル、L1 セッション、プロジェクトのランタイム | `~/.oma/u/<profile>/`（`OMA_STATE_HOME` を設定した場合は `<OMA_STATE_HOME>/u/<profile>/`） |

グローバル設定はデフォルトを提供します。最も近いプロジェクトの `.agents/oma-config.*` と
そのローカルオーバーレイがそれを上書きします。異なる祖先のプロジェクトルート同士はマージされません。
完全な順序は[設定の読み込み](./oma-config-semantics.md#precedence-table)を参照してください。
プロジェクトで `semantic_memory: none` を選ぶと、グローバル設定が AgentMemory を選んでいても
メモリは無効のままです。

## 既存のインストール

ホームの移行では、`~/.agents/` と `~/.config/oma/` にある OMA 所有のデータを
新しいレイアウトにコピーします。元のファイルは残ります。ただし、検出用リンクに変換された、
検証済みの OMA 所有スキルディレクトリは例外です。古いパスが移行先スキルへのリンクになる前に、
元の内容が `~/.oma/backup/legacy-global-skills/` にアーカイブされます。移行先に既存のファイルがあれば
上書きしません。競合や使用中のデータは再試行のために報告されます。vault のインデックスは
キー名をマージし、秘密の値は OS キーチェーンから移動しません。ユーザーの
スキルと外部のリンクはそのまま残り、ベンダーの認証ファイルは
移動しません。ランタイムの読み取りは
新しいパスだけを使います。

```bash
oma home migrate --dry-run --json
oma home migrate --json
oma schedule sync
```

グローバルのインストールと更新は、グローバルファイルを書き込む前に移行を実行します。
プロジェクトのインストールと更新は統合されたルートを使い、無関係なグローバル
データは移行しません。移行は OS のジョブ登録を変更しません。スケジュールがある場合は、
移行後に `oma schedule sync` を実行してください。稼働中のサービスやランナーがあるとデータの移行が保留されることがあります。
それらのプロセスを終了してから、移行を再実行してください。

## 関連項目

- [設定の読み込み](./oma-config-semantics.md): グローバル、プロジェクト、ローカルの設定ファイルのマージ方法
- [既存プロジェクトへの統合](./integration.md): プロジェクトモードのインストール、検証、ロールバック
- [自動更新](./automated-updates.md): CI から `oma update` を実行する
