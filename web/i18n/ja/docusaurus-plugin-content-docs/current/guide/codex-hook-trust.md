---
title: "ガイド：Codex フックの信頼"
sidebar_label: Codex フックの信頼
description: Codex が信頼の承認でフックを制御する仕組み、oh-my-agent が自身のフックを実行できるよう記録する内容、自分でフックを確認する必要がある場合を説明します。
---

# ガイド：Codex フックの信頼

oh-my-agent をプロジェクトにインストールすると、Codex CLI 用の `.codex/hooks.json` を含む、ベンダー固有のフック設定を書き込みます。Codex は、設定されているという理由だけではフックを実行しません。2 つの承認が制御し、どちらもユーザー設定（`$CODEX_HOME/config.toml`、デフォルトは `~/.codex/config.toml`）にあります。プロジェクトが自分のフックを自分で承認することはできません。

1. **プロジェクトの信頼。** プロジェクトの `.codex/` フォルダー（`config.toml` と `hooks.json`）が読み込まれるのは、信頼されたプロジェクトだけです。`[projects."<path>"] trust_level = "trusted"` が必要です。
2. **フックごとの信頼。** プロジェクト範囲でもユーザー範囲でも、管理対象ではないフックにはすべて `[hooks.state."<hooks.json path>:<event>:<group>:<handler>"]` エントリが必要です。その `trusted_hash` は、フックの現在の宣言（command、timeout、matcher、async フラグ、status message）と一致しなければなりません。

新しいフック、または変更されたフックは、Codex TUI に「Hooks need review」と表示されます。`codex exec` はそれを出さず、静かに対象から外します。

---

## oh-my-agent が記録する内容

`oma install`、`oma update`、`oma link` は、**oh-my-agent 自身のフック**について両方の承認を書き込みます。対象は `oma-hook-*` という名前のハンドラー、または `oma-hook.sh` ラッパー経由で動くハンドラーです。ハッシュは、Codex で「Trust all and continue」を選んだときに Codex が計算する値と同じです。そのため、最初の Codex セッションから `/hooks` の手順なしでフックが動きます。後の oh-my-agent リリースでフックのコマンドが変わった場合、`oma update` のときに新しいハッシュを記録するので、フックは有効なままです。

oh-my-agent が編集するのは `config.toml` の影響を受けるテーブルだけです。結果を読み直し、それ以外が変わる場合はファイルをそのままにします。次のことはしません。

- 同じ `hooks.json` に自分で追加したフックを承認する
- `trust_level = "untrusted"` とマークしたプロジェクトを信頼する
- 無効にしたフック（`enabled = false`）を再び有効にする
- Codex がホームディレクトリを作る前に Codex の設定へ触れる

グローバルインストール（`~/.codex/hooks.json`）では、信頼するプロジェクトがないため、フックごとのエントリだけを書き込みます。

---

## 自分でフックを確認する場合

oh-my-agent が信頼を記録できなかった場合は、理由を添えて次の通知を出します。

```text
⚠ Codex hooks installed/updated but not trusted (<reason>) — run codex and use /hooks to trust them (untrusted hooks do not run).
```

よくある原因は、解析できない `config.toml`、未信頼とマークしたプロジェクト、Codex をまだ一度も実行していないことです。その場合は Codex でプロジェクトを開き、`/hooks` を実行してフックを一度有効にします。その後 `oma link codex` を実行すると、以降の更新でも信頼が維持されます。

---

## oh-my-agent が起動する Codex プロセス

oh-my-agent 自身が Codex サブプロセスを起動する場合（たとえば `oma agent spawn`）、`--dangerously-bypass-hook-trust` も渡します。このフラグは、ハッシュ確認なしで有効なフックを実行します。プロジェクトの信頼は外しません。フラグが適用されるのは oh-my-agent が起動したプロセスだけで、設定ファイルには書き込まれません。

---

## `[features] hooks` フラグは不要

以前の oh-my-agent リリースは、Codex 設定に `[features] codex_hooks = true` を書き込んでいました。Codex 0.124 でこのフラグは `hooks` に名前が変わり、フックは安定版でデフォルト有効の機能になったため、フラグは不要です。oh-my-agent はどちらのキーも書き込みません。また、非推奨の `codex_hooks` と `child_agents_md` フラグを `[features]` テーブルで見つけた場合は削除します。

---

## まとめ

| 状況 | 行うこと |
|:----------|:------------|
| プロジェクトへの初回インストール | 何もしない。インストーラーが信頼を記録する |
| フックのコマンドを変える `oma update` | 何もしない。新しいハッシュが記録される |
| インストーラーが「not trusted (…)」と表示する | 原因を直すか、Codex で `/hooks` を一度実行する |
| `.codex/hooks.json` に自分で追加したフック | `/hooks` で自分で確認する |

## 関連項目

- [既存プロジェクトへの統合](./integration.md): インストーラーが各ベンダー向けに書き込む内容
- [グローバルインストール](./global-install.md): `~/.codex/` に書き込むユーザー全体のインストール
