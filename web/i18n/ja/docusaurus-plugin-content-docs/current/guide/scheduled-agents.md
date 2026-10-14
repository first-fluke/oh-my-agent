---
title: "ガイド：スケジュールされたエージェント"
sidebar_label: エージェントのスケジュール実行
description: ベンダーのランタイムを開いたままにせず、OS スケジューラー（macOS launchd、Linux systemd、Windows Task Scheduler）でエージェントを定期または 1 回だけ実行します。
---

# スケジュールされたエージェント

`oma schedule` を使うと、現在開いている AI ベンダーのランタイム（Claude Code、Codex、Antigravity、Cursor、Qwen、Grok、opencode、pi）に関係なく、時間ベースでエージェントを実行できます。OS スケジューラーがジョブを起動し、ジョブはディスクにキャッシュされたベンダー認証情報でヘッドレスに `oma agent spawn` を呼び出します。

---

## 動作

`oma schedule create` を実行すると、oma は次を行います。

1. グローバルマニフェスト `~/.oma/schedule/schedules.json` にジョブ記録を書き込みます。
2. OS スケジューラー（macOS の launchd、Linux の systemd --user、Windows の Task Scheduler）にジョブを登録します。OS ジョブは設定された cron 間隔で `oma schedule run <id>` を呼び出します。
3. 発火時に `oma schedule run` がジョブを検索し、取得した環境変数を注入し、`oma agent spawn` を呼び、実行ログを `~/.oma/schedule/runs/<id>/<timestamp>.md` に書き込みます。

マニフェストが唯一の信頼できるソース（SSOT）です。OS スケジューラーは実行役にすぎません。ジョブ定義、実行ログ、最後に発火した時刻などの状態はすべて `~/.oma/schedule/` にあります。

### グローバル専用の設計

`oma schedule` はプロジェクト単位ではなく、ユーザー単位のグローバル機能です。OS スケジューラーは現在の作業ディレクトリと無関係にジョブを実行するため、中央レジストリ 1 つが現実的な SSOT です。各ジョブは `workspace` と `projectLabel` に所属プロジェクトを記録します。レジストリが共有でも、`schedule list` はプロジェクト別にグループ化できます。

`--global` フラグはありません。スケジュールのコマンドは `$OMA_HOME/schedule/`（デフォルトは `~/.oma/schedule/`）を使います。登録された OS ジョブには解決済みのホームが明示的に渡されるため、ログインシェルなしでも同じレジストリを開けます。ホームを移動した後は `oma schedule sync` を実行して、ジョブのコマンドとログのパスを更新してください。

### OS バックエンド

| プラットフォーム | 主なバックエンド | フォールバック | `oma schedule run` の stderr |
|---|---|---|---|
| macOS | launchd（plist + `launchctl`） | なし | `runs/<id>/stderr.log` |
| Linux | systemd --user timer | `systemctl --user` を使えない場合はユーザーの `crontab` | `runs/<id>/stderr.log`（systemd）、保存されない（crontab） |
| Windows | Task Scheduler（`schtasks`） | なし | 保存されない |

oma は利用可能なバックエンドを自動で選びます。手動設定は不要です。

---

## schedule、ralph、Claude /loop の比較

3 つの機能は「後でもう一度実行する」ため、ときどき混同されます。概念は異なります。

| 機能 | トリガー | 範囲 | ベンダー再起動後も残るか |
|---|---|---|---|
| `oma schedule` | 時間ベース（cron） | ベンダー横断、OS レベル | はい。ベンダーのランタイムが開いていなくても OS スケジューラーが発火します |
| `ralph` | 完了ベース（Stop フックのループ） | ベンダー横断 | 現在のセッション中だけ。ralph はタイマーではなく「完了するまで続ける」ループです |
| Claude Code `/loop` | 時間ベース（プロセス内 cron） | Claude ランタイムのみ | いいえ。Claude Code が実行中の間だけ発火します |

平日の午前 9 時にジョブを実行するなら `schedule` を使います。品質基準を満たすまでエージェントに反復させるなら `ralph` を使います。Claude Code の中にいて、ベンダー横断の移植性が不要な場合だけ `/loop` を使います。

---

## クイックスタート

```bash
# Run the qa-reviewer agent every weekday at 9 AM
oma schedule create qa-reviewer "Run QA review on the latest changes" --cron "0 9 * * 1-5"

# Run a backend agent every 2 hours using natural-language syntax
oma schedule create backend "Check for slow queries in the API logs" --every "2h"

# One-shot: run at the next 15:00 and remove the job after a successful run
oma schedule create pm "Generate weekly plan" --cron "0 15 * * *" --once

# Check what is scheduled
oma schedule list

# Remove a job
oma schedule delete sch_abcdefgh2345
```

`schedule create` は、`run` と `delete` で必要になるジョブ ID を表示します。

```text
Scheduled job registered: sch_abcdefgh2345
  Agent:   qa-reviewer
  Cron:    0 9 * * 1-5
  Vendor:  auto
  Project: my-project
  Once:    false
```

新しいジョブは、最初のスケジュール実行の前に一度手動で発火させ、プロンプトとベンダー認証情報を確認してください。

```bash
oma schedule run sch_abcdefgh2345
ls ~/.oma/schedule/runs/sch_abcdefgh2345/
```

---

## コマンド

### schedule create

スケジュールされたエージェントジョブを登録します。

```bash
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <Nd>] [--env <KEY1,KEY2>] [--dry-run] [--accept-rounded]
```

**引数:**

| 引数 | 必須 | 説明 |
|---|---|---|
| `agent-id` | はい | `oma agent spawn` に渡すエージェント。標準 ID（`orchestrator`、`architecture`、`pm`、`backend`、`frontend`、`mobile`、`db`、`debug`、`refactor`、`qa`、`docs`、`tf-infra`、`explore`）、または `qa-reviewer` や `backend-engineer` などの定義名を指定します。登録時には検証されないため、ジョブを作成した後に一度 `oma schedule run <id>` を実行してください。 |
| `prompt` | はい | 実行時にエージェントへ渡すタスクの説明 |

**オプション:**

| フラグ | 説明 |
|---|---|
| `--cron "<expr>"` | 5 フィールドの cron 式（例：毎日午前 9 時の `"0 9 * * *"`）。`--every` とは併用できません。 |
| `--every "<phrase>"` | 自然言語の間隔（下の表を参照）。`--cron` とは併用できません。 |
| `--vendor <vendor>` | `oma agent spawn` に渡す CLI ベンダーの上書き: `antigravity`、`claude`、`codex`、`cursor`、`opencode`、`qwen`、`grok`、`pi`。デフォルトは `oma-config.yaml` から自動検出。 |
| `-w, --workspace <path>` | 実行時のエージェントの作業ディレクトリ。登録時の現在の作業ディレクトリがデフォルト。 |
| `--once` | 1 回だけ実行するモード。終了コード 0 で終わった最初の実行の後、ジョブは自身を削除します。実行が失敗した場合はジョブが残り、次に cron が一致したときに再び発火します。デフォルトは繰り返しです。 |
| `--expires-after <duration>` | 指定した期間を過ぎた後の最初の発火時に、繰り返しジョブを削除します。`30d` のように単位付きの日数で指定します。単位のない数値（`30`）は拒否されます。`0` は無期限（デフォルト）。 |
| `--env <KEY1,KEY2>` | 指定した環境変数だけを `~/.oma/schedule/env/<id>`（権限 0600）に保存し、実行時に注入します。秘密情報はマニフェスト自体には書きません。 |
| `--dry-run` | スケジューラのジョブ、マニフェストエントリ、環境ファイルを書かずに、解決後の cron と丸めに関する注記を表示します。 |
| `--accept-rounded` | OMA が自然言語の間隔を cron で表現できるステップへ丸めた後に登録するために必要です。まず `--dry-run` でプレビューします。 |

`--cron` または `--every` のどちらか 1 つが必須です。

#### --every: 自然言語の間隔

`--every` は次の形式を受け付けます。oma は 5 フィールドの cron 式に変換し、要求された間隔を最も近い cron 表現可能なステップへ丸めた場合は注記を表示します。

| 形式 | 例 | 注記 |
|---|---|---|
| 短縮単位 | `5m`、`2h`、`1d` | 分、時間、日 |
| Every + 短縮 | `every 20m`、`every 2h` | |
| Every + 単語 | `every 5 minutes`、`every 2 hours` | 複数形の単位を受け付ける |
| 秒 | `30s` | 1 分の最小値へ切り上げ。cron は 1 分未満を表せない |

割り切れない間隔は最も近い適切なステップへ丸め、注記を表示します。たとえば 7 は 60 の約数ではないため、`--every 7m` は `6m`（`*/6`）に丸められます。

登録前に丸められた間隔を確認します。

```bash
oma schedule create backend "Check logs" --every 7m --dry-run
# Preview: requested interval resolves to */6 * * * *
# Note: Requested every 7m -- 7 is not a divisor of 60; rounded to every 6m (*/6 * * * *).
# Preview only: no OS job, manifest entry, or env file was written.
oma schedule create backend "Check logs" --every 7m --accept-rounded
```

プレビューを省略すると、コマンドは丸めた間隔の登録を拒否します。スケジュールは選択した OS スケジューラーのローカル時刻規則を使います。

**例:**

```bash
# Exact cron expression (full control)
oma schedule create backend "Optimize slow queries" --cron "0 */4 * * *"

# Natural language (oma converts to cron)
oma schedule create frontend "Run lighthouse audit" --every "every 6 hours"
# Converts to 0 */6 * * * (6 divides 24 cleanly, so no rounding note)

# Pin to a vendor and a workspace
oma schedule create qa "Run security scan" --cron "0 2 * * 0" --vendor claude -w /home/user/myproject

# One-shot job
oma schedule create pm "Generate sprint retrospective" --cron "0 17 * * 5" --once

# Capture specific env vars for the job
oma schedule create backend "Sync external API data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

---

### schedule list

OS のドリフト状態を含め、全プロジェクトのスケジュール済みジョブをプロジェクト別に一覧表示します。

```bash
oma schedule list [--json]
```

**オプション:**

| フラグ | 説明 |
|---|---|
| `--json` | 機械可読な JSON を出力 |

**ドリフト状態:**

| 状態 | 意味 |
|---|---|
| `synced` | マニフェストと OS スケジューラーの両方にジョブがある |
| `stale` | ジョブは登録されているが、OS 登録が現在の CLI が受け付けなくなったコマンドを呼び出す（たとえば、コマンドパスの標準化前に書き込まれた `schedule:run <id>`）。`schedule sync` で書き換え。`oma update` が自動で実行 |
| `missing-in-os` | マニフェストにはあるが OS スケジューラーにない。`schedule sync` で修復 |
| `orphan-in-os` | エージェントのスケジュール（`dev.oma.sch_*`）が OS スケジューラーにあるがマニフェストにない。`schedule sync --prune` で削除 |

`dev.oma.agentmemory`、`dev.oma.serena-daemon-gc`、`dev.oma.serena-reaper` などの内部サービスには、それぞれ専用のサービスマネージャーがあります。`schedule list` はこれらを孤立ジョブの検出対象から除外し、`schedule sync --prune` もこれらを残します。

**出力（テキスト）:**

ジョブはプロジェクトラベルでグループ化されます。各行には ID、cron 式、エージェント、ベンダー、OS バックエンド、繰り返しかどうか、ドリフト状態が表示されます。

```text
[my-project]
ID                 CRON           AGENT              VENDOR   BACKEND  RECUR  STATE
------------------------------------------------------------------------------------------
sch_abcdefgh2345   0 9 * * 1-5    qa-reviewer        auto     launchd  true   synced
sch_mnopqrst4567   */30 * * * *   backend            claude   launchd  true   missing-in-os

[orphan-in-os]
  dev.oma.sch_old (in OS scheduler but not in manifest)
```

`oma harness evolution enable` が作成したジョブは、エージェント `__builtin__` として一覧に表示され、そのプロジェクトで `oma harness evolution run --scheduled` を実行します。これらは `oma schedule delete` ではなく、`oma harness evolution enable` と `disable` で管理してください（[プロジェクトハーネス進化](./harness-evolution.md)を参照）。`oma schedule --help` に表示される `oma schedule builtin-evolution-add` と `oma schedule inspect` は、そのコマンド用の内部ヘルパーです。

**例:**

```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

---

### schedule delete

マニフェストと OS スケジューラーの両方からスケジュールされたジョブを削除します。

```bash
oma schedule delete <id>
```

**引数:**

| 引数 | 必須 | 説明 |
|---|---|---|
| `id` | はい | `schedule list` のジョブ ID（形式：`sch_<base32-12>`） |

OS スケジューラーからの削除に失敗しても（バックエンドが一時的に利用できない場合など）、警告を表示してマニフェストのエントリは削除します。

**例:**

```bash
oma schedule delete sch_abcdefgh2345
```

---

### schedule run

ID でスケジュールされたジョブを実行します。発火時に OS スケジューラーから呼ばれるため、通常は手動で呼びません。

```bash
oma schedule run <id>
```

ラッパーは次を行います。
1. マニフェストでジョブ ID を検索します。見つからなければ 0 以外で終了します。`--expires-after` の期間を過ぎている場合は、実行せずにジョブを削除します。
2. `~/.oma/schedule/env/<id>`（存在する場合）から取得済み環境変数を読み込み、起動するプロセスへ注入します。
3. `oma agent spawn <agentId> <prompt> <generatedSessionId> --vendor <vendor> -w <workspace>` を呼び出します。
4. 実行結果を `~/.oma/schedule/runs/<id>/<ISO-timestamp>.md` に書き込みます。
5. マニフェストの `lastFiredAt` を更新します。
6. `--once` が設定されていて、エージェントが終了コード 0 で終わった場合は、ジョブを（マニフェストと OS スケジューラーから）削除します。

**認証の失敗は明示されます：** ベンダーの認証情報が期限切れなら、ジョブは 0 以外で終了し、stderr に `re-auth required: <vendor>` を表示します（launchd と systemd では `runs/<id>/stderr.log` に保存されます）。`--vendor` なしで作成したジョブでは、ベンダーは `unknown` と表示されます。黙って成功することはありません。

デバッグのため、`schedule run` を手動で呼び出せます。

```bash
oma schedule run sch_abcdefgh2345
```

---

### schedule sync

マニフェストを OS スケジューラーと再同期します。システム移行、OS スケジューラーのリセット後、またはドリフトの修復に使います。

```bash
oma schedule sync [--prune]
```

**オプション:**

| フラグ | 説明 |
|---|---|
| `--prune` | OS スケジューラーにありマニフェストにないジョブも削除（`orphan-in-os` 状態）。`--prune` がなければ孤立ジョブを報告するだけで削除しません。 |

**例:**

```bash
# Repair missing-in-os jobs and rewrite stale registrations (does not remove orphans)
oma schedule sync

# Repair missing-in-os jobs AND remove orphans
oma schedule sync --prune
```

`oma update` は更新のたびに、同じ再同期（`--prune` なし）を実行します。そのため、CLI のリリースで `oma schedule run` コマンドの綴りが変わっても、既存の OS 登録が新しいバイナリの拒否するコマンドを指したままになることはありません。古いバージョンが `oma schedule:run <id>` で書き込んだ登録も、そのまま動作します。OS から呼び出されるジョブでは、その従来の綴りが引き続き受け付けられるためです。

---

## 保存レイアウト

スケジュールの状態はすべて `~/.oma/schedule/` にあります。

```text
~/.oma/schedule/
├── schedules.json          # SSOT manifest (permissions 0600)
├── env/
│   └── sch_abcdefgh2345    # Captured env vars for this job (permissions 0600)
├── running/                # Lease files while a job runs
└── runs/
    └── sch_abcdefgh2345/
        ├── 2026-06-16T09-00-00-000Z.md   # One log per fire: session, exit code, agent output
        ├── stdout.log                    # launchd and systemd only: stdout of oma schedule run
        └── stderr.log                    # launchd and systemd only: stderr, e.g. re-auth required
```

権限:
- `~/.oma/schedule/` ディレクトリ: `0700`
- `schedules.json` と `env/<id>` ファイル: `0600`

**秘密情報が `schedules.json` に書き込まれることはありません。** `--env` は指定したキーだけを `env/` の下にある別の `0600` ファイルへ書き込みます。明示的に列挙したキーだけが取得され、環境全体のダンプは保存されません。

---

## セキュリティに関する注意

- `schedule create` は信頼済みの経路でのみ行う操作です。認証済みユーザーだけがジョブを登録できます。外部または信頼できない入力に `schedule create` を公開しないでください。スケジュールされたプロンプトは、将来の時刻に実行される任意のコードです。
- `schedule run` は、ID がマニフェストに存在するジョブだけを実行します。任意の argv 注入はできません。
- ベンダーのディスク上の認証情報（例: `~/.codex/auth.json`、`~/.grok/auth.json`）は、ヘッドレスディスパッチ用にそのまま使われます。追加の認証ゲートはありません。認証情報が期限切れなら、ジョブは明示的に失敗します。

---

## ヒントとトラブルシューティング

**実行ログを確認する:**

```bash
ls ~/.oma/schedule/runs/sch_abcdefgh2345/
cat ~/.oma/schedule/runs/sch_abcdefgh2345/2026-06-16T09-00-00-000Z.md
```

**システム再起動後にジョブが `missing-in-os` になる:**

`oma schedule sync` を実行して、すべてのマニフェストジョブを OS スケジューラーへ再登録します。

**ジョブは発火したがベンダー認証情報が期限切れだった:**

macOS（launchd）と Linux（systemd）では、`~/.oma/schedule/runs/<id>/stderr.log` で `re-auth required: <vendor>` を確認します。`<timestamp>.md` の実行ログには、エージェント自身の出力と終了コードが記録されます。crontab と Task Scheduler のバックエンドはこの stderr を保存しないため、ターミナルで `oma schedule run <id>` を実行して確認してください。ベンダー CLI（例: `claude login`、`codex login`）で再認証し、次の発火前に `oma schedule run <id>` を手動で実行して確認します。

**ジョブを変更する:**

`schedule update` はありません。先に置き換え用のジョブを作成してから、`oma schedule delete <old-id>` で古い ID を削除します。`--env` はジョブ作成時に変数の値をコピーするため、シークレットをローテーションした後は、新しい値をシェルで export してからジョブを作り直してください。

**`--every` が間隔を丸めた:**

oma が間隔を丸めると、変更内容を説明する注記を表示します。60 分または 24 時間で正確に割り切れない間隔が必要なら、明示的な 5 フィールド式を `--cron` で指定します。

**プロジェクトのジョブをすべて削除する:**

```bash
# List jobs for a specific project, then remove each
oma schedule list --json | jq -r '.jobs[] | select(.projectLabel == "my-project") | .id' \
  | xargs -I{} oma schedule delete {}
```

**Windows の対応:**

Windows では `schtasks` を使ってジョブを登録します。Task Scheduler の登録内容は読み戻せないため、`schedule list` は登録済みのすべてのジョブを `stale` と報告し、`schedule sync`（`oma update` でも実行されます）はそれらをすべて再登録します。Windows では `stale` は想定どおりの状態です。`missing-in-os` と `orphan-in-os` は引き続きドリフトを示します。

`schtasks` はすべての cron 形式を表現できるわけではありません。対応する形式は `*/N * * * *`（N 分ごと）、`M * * * *`（:M 分に毎時）、`M H * * *`（毎日）、`M H * * D`（毎週。`D` は単一の日、`1-5` のような範囲、`1,3,5` のようなカンマ区切りのリスト）、`M H D * *`（毎月）です。その他の式（たとえば分フィールドのカンマ区切りリスト）は、Windows の `schedule create` 実行時に拒否されます。

`--every` が対応する形式を生成するのは、60 を割り切る分単位の間隔（例：`--every 5m` や `--every 30m`）だけです。時間単位や日単位の間隔（`--every 2h`、`--every "every 6 hours"`、`--every 1d`）や、`--cron "0 */4 * * *"` のような時間のステップは `0 */N * * *` または `0 0 */N * *` を生成し、Task Scheduler は `schedule create` の時点でこれを拒否します。Windows では、`--cron "0 9 * * 1-5"` のように固定の時刻を使ってください。

---

## 関連項目

- [プロジェクトハーネス進化](./harness-evolution.md) — 予算内でスキル改善を実行する組み込みの `__builtin__` ジョブ。
- [ハーネス評価](./harness-eval.md) — 評価コマンドの組み合わせ方。
