---
title: "ガイド：グローバルインストール"
sidebar_label: グローバルインストール
description: プロジェクトごとではなくユーザーの HOME（~/.agents/）に oh-my-agent をインストールし、同じスキル、ワークフロー、ルールをすべてのプロジェクトで使えるようにします。oma install --global、oma update --global、oma uninstall --global、OMA_HOME の上書き、oma doctor による二重インストールの検出、sudo 拒否、CI、WSL、cwd=HOME の注意点を扱います。
---

## グローバルインストールとは

デフォルトでは、`oma install` の対象は現在のプロジェクトディレクトリです。SSOT は `<cwd>/.agents/` に置かれ、ベンダー設定は `<cwd>/.claude/`、`<cwd>/.codex/` などに書き込まれます。**グローバルインストール**（`oma install --global`）では、oh-my-agent をユーザーの HOME にインストールします。そのため、プロジェクトを開くたびにインストールを繰り返さなくても、同じスキル、ワークフロー、ルールをすべてのプロジェクトで使えます。SSOT は `~/.agents/` に置かれ、ベンダー設定は `~/.claude/`、`~/.codex/` などに置かれます。

## プロジェクトとグローバルの比較

| 項目 | プロジェクト（`oma install`） | グローバル（`oma install --global`） |
|--------|------------------------|--------------------------------|
| SSOT の場所 | `<cwd>/.agents/` | `~/.agents/` |
| ベンダー設定 | `<cwd>/.claude/`、`<cwd>/.codex/` など | `~/.claude/`、`~/.codex/` など |
| ロックファイル | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| メタデータ | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| 用途 | プロジェクトごとのカスタマイズ | すべてのプロジェクトに適用する個人用のデフォルト |
| oma-config.yaml のスコープ | プロジェクト固有 | ユーザー全体のベースライン |

両方のモードは共存できます。`oma doctor` は両方のインストールを検出してレポートし、両者の差異も示します。

グローバルインストールが成功したら、ユーザーの HOME にあるファイルと解決済みプロファイルを確認します。

```bash
oma doctor --json
oma doctor --profile
```

最初のコマンドはインストールとベンダーの状態を報告し、プロファイルコマンドはエージェントが使うモデル計画を表示します。グローバルインストールを確認したい場合は、どのプロジェクトから実行しても構いません。

## 初回セットアップ

マシンで `oma install --global` を初めて実行すると、インストール開始前に次の説明が表示されます。

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

確認すると続行します。その後はプロジェクトインストールと同じ対話フローで、言語、モデルプリセット、プロジェクト種別、ベンダーを選択します。

インストールが成功すると、次の手順が表示されます。

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## 注意点

### sudo では実行できない

`oma install` は、モードにかかわらず `sudo` で実行すると直ちに終了します。

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

通常のユーザーとして、`sudo` を付けずにコマンドを実行してください。

### CI 環境

CI パイプラインで `oma install --global` を実行すると、CI ランナーの HOME ディレクトリが変更されます。通常は望ましくありません。ブートストラップ用のパイプラインなどで必要な場合、oma は次の警告を出します。

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

`--yes` または `OMA_YES=1` が設定されていればインストールは続行します。設定されていない場合は警告を表示してから対話モードで続行するため、多くの CI 環境では入力待ちのままになります。

### WSL の Linux HOME と Windows USERPROFILE

oma が Windows Subsystem for Linux 内で実行されていることを検出すると、次のメッセージを表示します。

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

WSL のインストールと PowerShell のインストールは独立しています。両方でグローバルに使う場合は、WSL と PowerShell からそれぞれ一度ずつ `oma install --global` を実行してください。

### cwd が HOME の場合のガード（プロジェクトモード）

`oma link` と `oma update`（`--global` なし）は、現在のディレクトリが HOME の間は実行を拒否します。プロジェクトモードでは `<cwd>/.claude/settings.json` が `~/.claude/settings.json`、つまりグローバルの Claude Code 設定になります。プロジェクトスコープのレンダーは、その `$HOME/.claude/hooks/...` コマンドを `$CLAUDE_PROJECT_DIR/...` に書き換えるため、独自の `.claude/hooks/` を持たないプロジェクトで、すべてのフックとステータスラインが壊れます。HOME へのインストールには代わりに `oma link --global` / `oma update --global` を使うか、先にプロジェクトへ `cd` してください。

現在のディレクトリが HOME であるときに `--global` を付けずに `oma install` を実行すると、oma は次の警告を出します。

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

非対話型または CI モードでは自動的に中止します。ユーザー全体へのインストールを意図している場合は `--global` を使ってください。

## グローバルインストールの再リンク

`oma link` は再インストールせずに SSOT からベンダー固有のファイルを生成し直します。`install` や `update` と同様に、対象はインストールコンテキストから解決されます。`~/.agents/` を更新するには `--global` を渡してください。`$HOME` 以外のディレクトリからも実行できます。

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.agents/oma-config.yaml)
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

アンインストールコマンドは、oma が所有するファイルとユーザーが所有するファイルを分けて扱います。ユーザー所有のコンテンツ（oma-config.yaml、mcp.json、`<!-- oma:generated -->` マーカーがないカスタムスキル）は削除しません。

プロジェクトインストールをアンインストールするには、`--global` を省略します。

```bash
oma uninstall [--dry-run]
```

## OMA_HOME の上書き

テストやステージングでは、oma のすべての操作を任意のディレクトリへリダイレクトできます。

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` は `--global` と `process.cwd()` より優先されます。禁止されたシステムパス（`/etc`、`/usr`、`/bin`、`/boot`、`/sys`、`/proc`）は `OMA_HOME` 経由でも拒否されます。パスは絶対パスで、書き込み可能でなければなりません。

安全にスモークテストするには、`OMA_HOME` を空の書き込み可能なディレクトリに設定して `oma install --global --yes` を実行します。概要にそのディレクトリがインストールルートとして表示されることを確認してください。テスト後にディレクトリを削除し、実際の HOME を使って本番のインストールを実行します。
