---
title: "ガイド：グローバルインストール"
description: プロジェクトごとではなくユーザーHOME（~/.agents/）にoh-my-agentをインストールし、同じskill、workflow、ruleをすべてのプロジェクトで共有します。oma install --global、oma update --global、oma uninstall --global、OMA_HOMEオーバーライド、oma doctorによる二重インストール検出、プラットフォーム固有の注意事項（sudo拒否、CI、WSL、cwd=HOMEガード）をカバーします。
---

## グローバルインストールとは？

デフォルトでは、`oma install`はすべての処理を現在のプロジェクトディレクトリに限定します。SSOTは`<cwd>/.agents/`に置かれ、ベンダー設定は`<cwd>/.claude/`、`<cwd>/.codex/`などに書き込まれます。**グローバルインストール**（`oma install --global`）はoh-my-agentをユーザーHOMEにインストールするため、新しいプロジェクトを開くたびにインストール手順を繰り返さなくても、同じskill、workflow、ruleをすべてのプロジェクトで利用できます。SSOTは`~/.agents/`に、ベンダー設定は`~/.claude/`、`~/.codex/`などに配置されます。

## プロジェクト vs グローバルの比較

| 項目 | プロジェクト（`oma install`） | グローバル（`oma install --global`） |
|--------|------------------------|--------------------------------|
| SSOTの場所 | `<cwd>/.agents/` | `~/.agents/` |
| ベンダー設定 | `<cwd>/.claude/`、`<cwd>/.codex/`など | `~/.claude/`、`~/.codex/`など |
| Lockファイル | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| メタデータ | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| ユースケース | プロジェクトごとのカスタマイズ | すべてのプロジェクトに適用する個人デフォルト |
| oma-config.yamlのスコープ | プロジェクト限定 | ユーザー全体のベースライン |

両方のモードは共存できます。`oma doctor`は両方のインストールが存在すればその両方をレポートし、両者の間にドリフトがあれば指摘します。

## 初回セットアップ

マシン上で`oma install --global`を初めて実行すると、処理を進める前に次の説明が表示されます。

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

確認すると続行します。インストールはその後、プロジェクトインストールと同じインタラクティブな流れ（言語、モデルプリセット、プロジェクト種別、ベンダー選択）を経ます。

インストールが成功すると、次のステップが表示されます。

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## 注意事項

### sudo拒否

`oma install`はどのモードであっても、`sudo`の下で実行されると直ちに終了します。

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

通常のユーザーとして`sudo`を付けずにコマンドを実行してください。

### CI環境

CIパイプライン内で`oma install --global`を実行すると、CIランナーのHOMEディレクトリが変更されます。これは通常望ましくありません。ブートストラップ用パイプラインなどでどうしても必要な場合、omaは次の警告を出力します。

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

`--yes`または`OMA_YES=1`が設定されていればインストールは続行します。設定されていない場合は警告が表示されたうえでインタラクティブモードで続行されるため、多くのCI環境では応答待ちでハングします。

### WSL：Linux HOMEとWindows USERPROFILE

omaがWindows Subsystem for Linux内で実行されていることを検知すると、次のメッセージが出力されます。

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

WSLインストールとPowerShellインストールは独立しています。両側でグローバルなカバレッジを得たい場合は、`oma install --global`をWSLで一度、PowerShellで一度それぞれ実行してください。

### cwd = HOME警告（プロジェクトモード）

現在のディレクトリがHOMEである状態で`--global`を付けずに`oma install`を実行すると、omaは次の警告を出します。

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

非対話型／CIモードでは自動的に中止されます。ユーザー全体へのインストールを意図する場合は、`--global`を使用してください。

## アンインストール

```bash
# 削除対象のプレビュー（実際には何も削除しません）
oma uninstall --global --dry-run

# グローバルインストールを削除
oma uninstall --global
```

uninstallコマンドはoma管理下のファイルとユーザー管理下のファイルを区別します。ユーザー所有のコンテンツ（oma-config.yaml、mcp.json、`<!-- oma:generated -->`マーカーを持たないカスタムskill）は決して削除されません。

プロジェクトインストールをアンインストールするには、`--global`を省略します。

```bash
oma uninstall [--dry-run]
```

## OMA_HOMEオーバーライド

テストやステージング用途で、すべてのoma操作を任意のディレクトリへリダイレクトできます。

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME`は`--global`と`process.cwd()`よりも優先されます。禁止されたシステムパス（`/etc`、`/usr`、`/bin`、`/boot`、`/sys`、`/proc`）は`OMA_HOME`経由でも拒否されます。パスは絶対パスかつ書き込み可能でなければなりません。
