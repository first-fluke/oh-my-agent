---
title: "ガイド：画像生成"
description: oh-my-agent画像生成の完全ガイド — Codex（gpt-image-2）、Pollinations（flux/zimage、無料）、Geminiへのマルチベンダーディスパッチ、リファレンス画像、コストガードレール、出力レイアウト、トラブルシューティング、共有呼び出しパターン。
---

# 画像生成

`oma-image`はoh-my-agentのマルチベンダー画像ルーターです。自然言語プロンプトから画像を生成し、認証済みのベンダーCLIへディスパッチして、すべての実行が再現可能になるよう出力の隣に決定論的なマニフェストを書き出します。

このスキルは*image*、*illustration*、*visual asset*、*concept art*などのキーワードや、別のスキルが副次的に画像を必要とする場合（ヒーローショット、サムネイル、商品写真）に自動アクティベートされます。

---

## 使うべきタイミング

- 画像、イラスト、商品写真、コンセプトアート、ヒーロー/ランディング向けビジュアルの生成
- 同じプロンプトを複数モデルで横並び比較（`--vendor all`）
- エディタワークフロー（Claude Code、Codex、Gemini CLI）内からのアセット生成
- 他のスキル（design、marketing、docs）が画像パイプラインを共有インフラとして呼び出す

## 使うべきでないタイミング

- 既存画像の編集・レタッチ — スコープ外（専用ツールを使用）
- 動画や音声の生成 — スコープ外
- 構造化データからのインラインSVG/ベクター合成 — テンプレート系スキルを使用
- 単純なリサイズ/フォーマット変換 — 生成パイプラインではなく画像ライブラリを使用

---

## ベンダー一覧

このスキルはCLIファーストです。ベンダーのネイティブCLIが画像のrawバイトを返せる場合、直接APIキーよりサブプロセス経路が優先されます。

| ベンダー | 戦略 | モデル | トリガー | コスト |
|---|---|---|---|---|
| `pollinations` | Direct HTTP | 無料: `flux`、`zimage`。クレジット制: `qwen-image`、`wan-image`、`gpt-image-2`、`klein`、`kontext`、`gptimage`、`gptimage-large` | `POLLINATIONS_API_KEY`設定済み（無料登録: https://enter.pollinations.ai） | `flux` / `zimage`は無料 |
| `codex` | CLIファースト — ChatGPT OAuth経由の`codex exec` | `gpt-image-2` | `codex login`（APIキー不要） | ChatGPTプランへ課金 |
| `gemini` | CLIファースト → 直接APIフォールバック | `gemini-2.5-flash-image`、`gemini-3.1-flash-image-preview` | `gemini auth login`または`GEMINI_API_KEY` + 課金有効 | デフォルト無効。課金が必要 |

`pollinations`がデフォルトベンダーです。`flux` / `zimage`は無料のため、キーワードでの自動トリガーが安全だからです。

---

## クイックスタート

```bash
# Free, zero-config — uses pollinations/flux
oma image generate "minimalist sunrise over mountains"

# Compare every authenticated vendor in parallel
oma image generate "cat astronaut" --vendor all

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# Inspect authentication and install status per vendor
oma image doctor

# List registered vendors and the models each one supports
oma image list-vendors
```

`oma img`は`oma image`のエイリアスです。

---

## スラッシュコマンド（エディタ内）

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --out ./hero "minimalist dashboard hero illustration"
```

スラッシュコマンドは同じ`oma image generate`パイプラインへ転送されるため、すべてのCLIフラグがここでも機能します。

---

## CLIリファレンス

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|gemini|all]
  [-n 1..5]
  [--size 1024x1024|1024x1536|1536x1024|auto]
  [--quality low|medium|high|auto]
  [--out <dir>] [--allow-external-out]
  [-r <path>]...
  [--timeout 180] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--format text|json]

oma image doctor
oma image list-vendors
```

### 主要フラグ

| フラグ | 用途 |
|---|---|
| `--vendor <name>` | `auto`、`pollinations`、`codex`、`gemini`、`all`のいずれか。`all`では要求されたすべてのベンダーが認証済みである必要があります（strict）。 |
| `-n, --count <n>` | ベンダーごとの画像枚数、1〜5（実時間制約）。 |
| `--size <size>` | アスペクト比: `1024x1024`（正方形）、`1024x1536`（縦長）、`1536x1024`（横長）、`auto`。 |
| `--quality <level>` | `low`、`medium`、`high`、`auto`（ベンダーデフォルト）。 |
| `--out <dir>` | 出力ディレクトリ。デフォルトは`.agents/results/images/{timestamp}/`。`$PWD`外のパスには`--allow-external-out`が必要。 |
| `-r, --reference <path>` | 最大10枚のリファレンス画像（PNG/JPEG/GIF/WebP、各5MB以下）。複数指定またはカンマ区切り。`codex`と`gemini`でサポート、`pollinations`では拒否。 |
| `-y, --yes` | 推定`$0.20`以上の実行に対するコスト確認プロンプトをスキップ。`OMA_IMAGE_YES=1`でも可。 |
| `--no-prompt-in-manifest` | `manifest.json`にプロンプトの生テキストではなくSHA-256を保存。 |
| `--dry-run` | 計画とコスト見積もりを表示するのみで実費は発生しない。 |
| `--format text\|json` | CLI出力フォーマット。JSONは他スキルとの統合インターフェース。 |
| `--strategy <list>` | Gemini専用のエスカレーション、例: `mcp,stream,api`。`vendors.gemini.strategies`を上書き。 |

---

## リファレンス画像

スタイル、被写体のアイデンティティ、構図を導くため、最大10枚のリファレンス画像を添付できます。

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor gemini
oma image generate -r a.png,b.png "blend these styles" --vendor gemini
```

| ベンダー | リファレンス対応 | 方法 |
|---|---|---|
| `codex` (gpt-image-2) | 対応 | `codex exec`に`-i <path>`を渡す |
| `gemini` (2.5-flash-image) | 対応 | リクエストにbase64の`inlineData`をインライン化 |
| `pollinations` | 非対応 | exit code 4で拒否（URLホスティングが必要） |

### 添付画像の所在

- **Claude Code** — `~/.claude/image-cache/<session>/N.png`、システムメッセージで`[Image: source: <path>]`として提示。セッションスコープのため、後で再利用したい場合は永続的な場所へコピーすること。
- **Antigravity** — ワークスペースのアップロードディレクトリ（IDEが正確なパスを表示）
- **ホストとしてのCodex CLI** — 明示的に渡す必要があり、会話内の添付ファイルは転送されない

ユーザーが画像を添付し、それを基に生成や編集を求めた場合、呼び出しエージェントは散文で説明するのではなく**必ず**`--reference <path>`で転送しなければなりません。ローカルCLIが古くて`--reference`をサポートしていない場合は、`oma update`を実行してリトライしてください。

---

## 出力レイアウト

すべての実行は、タイムスタンプとハッシュ接尾辞付きのディレクトリで`.agents/results/images/`に書き込まれます：

```
.agents/results/images/
├── 20260424-143052-ab12cd/                 # single-vendor run
│   ├── pollinations-flux.jpg
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # --vendor all run
    ├── codex-gpt-image-2.png
    ├── pollinations-flux.jpg
    └── manifest.json
```

`manifest.json`はベンダー、モデル、プロンプト（またはそのSHA-256）、サイズ、品質、コストを記録します — マニフェスト単体からすべての実行が再現可能です。

---

## コスト、安全性、キャンセル

1. **コストガードレール** — 推定`$0.20`以上の実行は確認を求めます。`-y`または`OMA_IMAGE_YES=1`で回避可能。デフォルトの`pollinations`（flux/zimage）は無料のため、自動的にプロンプトはスキップされます。
2. **パス安全性** — `$PWD`外への出力パスは予期しない書き込みを防ぐため`--allow-external-out`が必要。
3. **キャンセル可能** — `Ctrl+C`（SIGINT/SIGTERM）で進行中のすべてのプロバイダ呼び出しとオーケストレーターが中止されます。
4. **決定論的な出力** — `manifest.json`は常に画像の隣に書き込まれます。
5. **最大`n` = 5** — クォータではなく実時間制約。
6. **Exit code** — `oma search fetch`と整合: `0` ok、`1` general、`2` safety、`3` not-found、`4` invalid-input、`5` auth-required、`6` timeout。

---

## クラリフィケーションプロトコル

`oma image generate`を呼び出す前に、呼び出しエージェントは以下のチェックリストを実行します。何かが欠けていて推論不能な場合は、まず質問するか、プロンプトを増幅して拡張案を提示し承認を得ます。

**必須:**
- **被写体** — 画像の主要対象は何か？（オブジェクト、人物、シーン）
- **設定／背景** — どこにあるか？

**強く推奨（欠落かつ推論不能なら質問）:**
- **スタイル** — フォトリアル、イラスト、3Dレンダー、油絵、コンセプトアート、フラットベクター？
- **ムード／ライティング** — 明るいかムーディーか、暖色か寒色か、ドラマチックかミニマルか
- **使用コンテキスト** — ヒーロー画像、アイコン、サムネイル、商品ショット、ポスター？
- **アスペクト比** — 正方形、縦長、横長

*"a red apple"*のような短いプロンプトの場合、エージェントは追加質問を**しません**。代わりにインラインで増幅し、ユーザーへ提示します：

> ユーザー: "a red apple"
> エージェント: "次のように生成します： *a single glossy red apple centered on a clean white background, soft studio lighting, photorealistic, shallow depth of field, 1024×1024*。このまま進めますか、それとも別のスタイル/構図にしますか？"

ユーザーが完成したクリエイティブブリーフを書いている場合（被写体 + スタイル + ライティング + 構図のうち2つ以上）、そのプロンプトはそのまま尊重されます — クラリフィケーションも増幅もしません。

**出力言語。** 生成プロンプトは英語でプロバイダへ送信されます（画像モデルは主に英語キャプションで学習されているため）。ユーザーが他言語で書いた場合、エージェントは翻訳し、増幅時に翻訳結果を提示することで、誤読をユーザーが訂正できるようにします。

---

## 共有呼び出し（他スキルから）

他のスキルは画像生成を共有インフラとして呼び出します：

```bash
oma image generate "<prompt>" --format json
```

stdoutに書き出されるJSONマニフェストには出力パス、ベンダー、モデル、コストが含まれており、パースとチェーンが容易です。

---

## 設定

- **プロジェクト設定:** `config/image-config.yaml`
- **環境変数:**
  - `OMA_IMAGE_DEFAULT_VENDOR` — デフォルトベンダーを上書き（指定なしなら`pollinations`）
  - `OMA_IMAGE_DEFAULT_OUT` — デフォルト出力ディレクトリを上書き
  - `OMA_IMAGE_YES` — `1`でコスト確認をバイパス
  - `POLLINATIONS_API_KEY` — pollinationsベンダーで必須（無料登録）
  - `GEMINI_API_KEY` — geminiベンダーが直接APIへフォールバックする際に必要
  - `OMA_IMAGE_GEMINI_STRATEGIES` — geminiのカンマ区切りエスカレーション順（`mcp,stream,api`）

---

## トラブルシューティング

| 症状 | 想定原因 | 対処 |
|---|---|---|
| Exit code `5`（auth-required） | 選択したベンダーが未認証 | `oma image doctor`でログインが必要なベンダーを確認。続いて`codex login` / `POLLINATIONS_API_KEY`設定 / `gemini auth login`。 |
| `--reference`使用時のExit code `4` | `pollinations`はリファレンスを拒否、またはファイルサイズ過大／フォーマット不正 | `--vendor codex`または`--vendor gemini`へ切り替え。各リファレンスは5MB以下、PNG/JPEG/GIF/WebPであること。 |
| `--reference`が認識されない | ローカルCLIが古い | `oma update`を実行してリトライ。散文での説明にフォールバックしないこと。 |
| コスト確認が自動化を妨げる | 推定`$0.20`以上の実行 | `-y`を渡すか`OMA_IMAGE_YES=1`を設定。より良い方法: 無料の`pollinations`へ切り替え。 |
| `--vendor all`が即座に中止 | 要求ベンダーのいずれかが未認証（strictモード） | 不足ベンダーを認証するか、特定の`--vendor`を選択。 |
| 出力が想定外のディレクトリに書き込まれる | デフォルトは`.agents/results/images/{timestamp}/` | `--out <dir>`を渡す。`$PWD`外のパスには`--allow-external-out`が必要。 |
| Geminiが画像バイトを返さない | Gemini CLIのagentic loopがstdoutへrawな`inlineData`を出さない（0.38時点） | プロバイダは自動で直接APIへフォールバック。`GEMINI_API_KEY`を設定し課金が有効であることを確認。 |

---

## 関連

- [スキル](/docs/core-concepts/skills) — `oma-image`を支える2層スキルアーキテクチャ
- [CLIコマンド](/docs/cli-interfaces/commands) — `oma image`コマンドの完全リファレンス
- [CLIオプション](/docs/cli-interfaces/options) — グローバルオプション一覧
