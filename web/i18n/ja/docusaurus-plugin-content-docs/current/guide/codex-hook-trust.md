---
title: "ガイド：Codex フックの信頼設定"
sidebar_label: Codex フックの信頼設定
description: Codex フックが一度確認するまで実行されない理由、更新時の動作、oh-my-agent が起動した Codex サブプロセスに対して自動化する内容を説明します。
---

# ガイド：Codex フックの信頼設定

oh-my-agent をプロジェクトにインストールすると、Codex CLI 用の `.codex/hooks.json` など、ベンダー固有のフック設定を書き込みます。Claude Code と違い、Codex はこれらのフックを自動実行しません。管理対象ではないコマンドフックは Trust-On-First-Use（TOFU）によって制御され、1 度確認して有効にした後でのみ実行されます。

これは Codex 側の安全機構であり、oh-my-agent の制限ではありません。このガイドでは、最初に必要な操作、oh-my-agent の更新時に起きること、oh-my-agent が自動で処理する内容を説明します。

---

## 最初に 1 回だけ行う操作：Codex でフックを確認する

`oma`（インストール）、`oma link`、または `oma update` が、Codex がまだ認識していないプロジェクトに `.codex/hooks.json` を書き込んだ直後（グローバルインストールでは `~/.codex/hooks.json`）は、フックはまだ**実行されません**。Codex を開き、次の手順で 1 度確認してください。

1. Codex CLI でプロジェクトを開きます。
2. `/hooks` を実行してフックブラウザー（TUI）を開きます。
3. 表示されたフックを確認して有効にします。

この操作を行うまで、フックは信頼されていない状態で、静かにスキップされます。そのため、`.codex/hooks.json` を作成または変更するたびに、oh-my-agent は次の通知を表示します。

```text
⚠ Codex hooks installed/updated — run codex and use /hooks to trust them (untrusted hooks do not run).
```

Codex を開く前に、生成されたファイルを確認します。

```bash
test -s .codex/hooks.json && echo "Codex hooks are installed"
oma link codex
```

期待される結果は、インストールまたは更新の通知に続いて、Codex の `/hooks` ブラウザーにフックが表示されることです。`oma link codex` は生成ファイルを調整しますが、初回の信頼設定を置き換えるものではありません。

**注意：** `--dangerously-bypass-hook-trust` はここでは役に立ちません。警告の「Enabled hooks may run without review」（有効なフックは確認なしで実行されることがあります）という文は、すでに有効なフックに対する確認だけを省略するという意味です。一度も確認されていないフックは実行されません。初回にフックを有効にできるのは `/hooks` ブラウザーだけです。

Codex は内部で、フックファイルのパス、イベント、ブロック、フックの組み合わせで識別される `[hooks.state]` エントリとして、決定を `~/.codex/config.toml` に保存します。このエントリには `enabled` フラグと、コマンド文字列の `trusted_hash` が含まれます。

---

## 更新時の動作

一度フックを信頼すれば、更新のたびに同じ操作を繰り返す必要はありません。

- **`oma link` または `oma update` を再実行しても信頼状態は維持されます。** ただし、フックのコマンド文字列が変わらない場合に限ります。Codex は保存したハッシュと現在のコマンドを比較し、一致すれば信頼済みのままにします。
- **oh-my-agent の将来のバージョンでフックのコマンド文字列が変わった場合**、ハッシュが一致しなくなるため、そのフックは静かに未信頼へ戻ります。インストーラーの通知が再び表示されるので、`/hooks` で信頼し直してください。

つまり、確認が必要なのは最初の 1 度と、フックのコマンドを実際に変更したリリースの後だけです。

---

## oh-my-agent が自動で行うこと

oh-my-agent 自身が Codex サブプロセスを起動する場合（たとえば `oma agent spawn` を通じてベンダーをまたぐエージェントをディスパッチする場合）、`--dangerously-bypass-hook-trust` を自動的に渡します。これにより、oh-my-agent が検証済みの自身のフックを、更新後も手動で信頼し直さずに実行できます。

このフラグは、oh-my-agent が起動した Codex プロセスに**だけ**適用されます。`~/.codex/config.toml` やプロジェクト設定には書き込まれないため、自分で起動した Codex セッションには影響しません。

---

## `[features] hooks` フラグは不要

以前の oh-my-agent リリースは、Codex 設定に `[features] codex_hooks = true` を書き込んでいました。Codex 0.124 でこのフラグは `hooks` に名前が変わり、フックは安定版でデフォルト有効の機能になったため、フラグは不要です。oh-my-agent はどちらのキーも書き込みません。また、非推奨の `codex_hooks` と `child_agents_md` フラグを `[features]` テーブルで見つけた場合は削除します。

---

## まとめ

| 状況 | 行うこと |
|:----------|:------------|
| 初回インストール、またはプロジェクトで初めて `.codex/hooks.json` を作成した場合 | Codex を開き、`/hooks` を実行してフックを 1 回有効にする |
| フックのコマンドが変わらない `oma update` | 何もしない。信頼状態は維持される |
| フックのコマンドが変わる `oma update` | `/hooks` をもう一度実行して信頼し直す（インストーラーが通知を表示） |
| oh-my-agent が起動した Codex サブプロセス | 何もしない。自動でバイパスが適用される |

## 関連項目

- [既存プロジェクトへの統合](./integration.md): インストーラーが各ベンダー向けに書き込む内容
- [グローバルインストール](./global-install.md): `~/.codex/` に書き込むユーザー全体のインストール
