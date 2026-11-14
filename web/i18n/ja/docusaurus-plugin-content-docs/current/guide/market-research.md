---
title: "ガイド：市場調査（last30days エンジン）"
sidebar_label: 市場調査
description: oh-my-agent の oma-market スキルが、skills CLI 経由でスキルとして導入した上流の mvanhorn/last30days エンジンを使ってコミュニティの反応を調査する方法を説明します。market 設定セクション、oma market resolve / update / run、detect-trap ゲート、意図からフレームワークへの対応、失敗時の動作を扱います。
---

# 市場調査

`oma-market` は「直近 N 日間に、X について人々は実際に何を話しているか」という問いに答えます。Reddit（投票数と上位コメント）、X、YouTube の文字起こし、TikTok、Instagram、Hacker News、Polymarket、GitHub、arXiv、Techmeme、Digg、LinkedIn、StockTwits、Bluesky、Web など、実際の反応数を持つコミュニティソースから、困りごと、トレンド、競合への反応、発見を集めます。

調査は上流の [**last30days**](https://github.com/mvanhorn/last30days-skill) エンジン（MIT、Python 3.12 以降）で実行されます。oh-my-agent はこれをフォークしません。エンジンは [skills CLI](https://github.com/vercel-labs/skills) 経由でエージェントスキルとしてインストールされ、oh-my-agent はすべての実行をゲートし、その上に戦略フレームワークの層を加えます。リリース頻度、スター数、プロバイダーの対応範囲は上流プロジェクトに属し、変わる可能性があります。

---

## クイックスタート

エージェントに普通の言葉で依頼します。「market research」「pain points」「competitor analysis」「voice of customer」「trend detection」などの表現で `oma-market` スキルが起動します。

```text
VS Code のリモートコンテナについて、直近 30 日間に開発者が報告している主な困りごとを調べて。
Cursor と Windsurf のコミュニティの反応を直近 90 日間で比較して。frameworks swot,5f。
```

| 指定方法 | 効果 |
|---|---|
| 「A vs B」または `--vs B` | 競合の意図：上流の比較フロー + SWOT + Porter の 5F |
| `--days 7`、`30`、`90`、`180` | 調査期間 |
| `--intent pain`、`trend`、`competitor`、`discovery` | 意図の自動分類を上書きします |
| `--frameworks none`、または `swot,5f,pestel` のようなリスト | フレームワークのセクションを無効にするか、選択します |

結果は `.agents/results/market/{topic-slug}-{YYYYMMDD}.md` に 1 つのブリーフとして保存されます。1 行目はエンジンのバッジ（`🌐 last30days v<version> · synced <date>`）で、続いてリンク付きの順位付き証拠クラスタ、フレームワークのセクション、スキップしたソースを列挙するエンジンのフッターが並びます。

| キーなしで動作 | 上流のセットアップウィザードが必要（キーまたは Cookie） |
|---|---|
| Reddit、Hacker News、GitHub、Polymarket、arXiv、Techmeme、Digg、Web | X、YouTube の文字起こし、TikTok、Instagram などキーが必要なソース。スキップしたソースはフッターに列挙されます |

---

## エンジンをインストールする（Python 3.12 以降が必要） {#always-the-latest-engine--nothing-to-install}

```bash
oma market update   # installs last30days when missing, otherwise updates it
# runs: bunx skills add mvanhorn/last30days-skill --skill last30days -g -y
#   or: bunx skills update last30days -g -y
```

```bash
# Illustrative output; the version, install path, and Python version vary.
oma market resolve
# engine:   last30days
# reason:   last30days 3.21.1 via home:~/.agents/skills
# root:     ~/.agents/skills/last30days
# skill:    ~/.agents/skills/last30days/SKILL.md
# version:  3.21.1
# python:   python3.14 (3.14.7, PATH)
# save_dir: <workspace>/.agents/results/market/raw
```

- `resolve` はインストール済みのスキルディレクトリだけを参照し、ネットワークには一切アクセスしません。何もインストールされていない場合は `ok` にならず、インストールコマンドを示します。`oma market update` を実行する前にスキルが確認を求めます。
- `oma update` はエンジンをインストールしません。更新するには `oma market update`（または `bunx skills update last30days -g -y`）を使います。
- Python の選択順は `LAST30DAYS_PYTHON` → `market.python` → PATH 上の `python3.14`、`python3.13`、`python3.12`、`python3`、`python`（3.12 以上が必要）→ `uv python find '>=3.12'` です。見つからない場合、`resolve` は ok にならず、インストール方法を表示します。スキルは Web 検索だけの調査に劣化させず、停止します。
- エンジンの設定と API キーは `~/.config/last30days/` にあります。上流のセットアップウィザードが同意を得て書き込むため、エンジン更新後も残ります。

解決の順序は次のとおりです（最初に見つかったものを使います）。`market.path` → `LAST30DAYS_HOME` → インストール済みスキルディレクトリ（プロジェクト内の `.agents|.claude|.codex|.cursor|.qwen|.kiro|.gemini|.copilot/skills/last30days`、次に `~` 配下、次に `~/.config/agents/skills/last30days` と Claude Code のプラグインキャッシュ）。Claude Code プラグインとしてインストールされている場合は `oma market update` ではなく `/plugin` で更新します。

```bash
oma market run -- --help     # the engine's own flags (without `--`, oma prints its own help)
```

以前のリリースでは `~/.cache/oma-market/` 配下に独自のコピーを保持していました。現在は読み込まれないため、削除して問題ありません。

---

## 設定

```yaml
market:
  path: null                      # explicit engine dir (pin)
  python: null                    # interpreter override
  save_dir: .agents/results/market/raw
```

`managed`、`channel`、`check_interval_min` は非推奨です。設定されていても検証は通りますが値は無視され、`resolve` はそれらが設定されているあいだ警告を表示します。

---

## 実行の流れ

```mermaid
flowchart TD
  trap["oma market detect-trap"] -->|"exit 2: refused"| reframe["Show the reframe; engine not run"]
  trap -->|ok| resolve["oma market resolve --json"]
  resolve -->|"ok: false"| stopNode["Stop with the update or Python hint"]
  resolve -->|"ok: true"| contract["Read the engine SKILL.md"]
  contract --> run["oma market run (same args as upstream)"]
  run --> synth["Synthesize per OUTPUT CONTRACT + frameworks"]
  synth --> check["Write the brief, then self-check the written file"]
```

1. `oma market detect-trap "<topic>"` はキーワードトラップや属性による買い物調査のトピックを拒否し（終了コード 2）、言い換えを提案します。トピックが空、または 200 文字を超える場合は終了コード 4 で終了します。
2. `oma market resolve --json` でエンジンと Python を確認します。`ok: false` なら停止します。
3. エージェントは解決されたエンジンの `SKILL.md` を上から最後まで読み、それに従います。対象は初回セットアップウィザード、WebSearch が使える場合の調査前のハンドル／サブレディット／ハッシュタグ解決、クエリ計画、前提条件ゲートです。
4. `oma market run "<topic>" <flags> --emit=compact` は上流の `python3 scripts/last30days.py` 呼び出しと同じ引数を使います。`market.save_dir` の値から `--save-dir` が追加されます。
5. 合成は上流の OUTPUT CONTRACT（1 行目のバッジ、順位付きの証拠クラスタ、LAWs 1〜8）に従います。その後、エンジンの本文とエンジンのフッターの間に、エンジンのクラスタだけを引用するフレームワークのセクションを oma が追加します。

| 意図 | エンジンへの指示 | フレームワーク |
|---|---|---|
| pain | 苦情として整えたトピック、`--days 30`、薄い場合は `--deep` | SWOT |
| trend | `--days 7/30/90/180`、「何が注目されているか」には `--discover "<domain>"` | SWOT |
| competitor | `"A vs B"` → 上流の比較フロー | SWOT + Porter の 5F |
| discovery | `--discover`、続けて `--drill` のフォローアップ | SWOT + PESTEL |

6. `.agents/results/market/{topic-slug}-{YYYYMMDD}.md` に書き込み、書き込んだファイルに対して自己チェックを実行します。ブリーフを配信する前に修正と再チェックを行います。

---

## 失敗時の動作

| 状況 | 結果 |
|---|---|
| detect-trap がトピックを拒否 | 言い換えを表示し、エンジンを実行しません。`--force` はユーザーが明示的に再確認した後だけ使います |
| エンジンが未インストール | `ok: false` → `oma market update`（skills CLI でインストールします） |
| Python 3.12 以降がない | インストール方法（brew / apt / `uv python install 3.12`）を含む `ok: false`。または `LAST30DAYS_PYTHON` / `market.python` を設定します。Web 検索だけの代替はありません |
| `oma market update` が失敗 | skills CLI のエラーが表示されます。既存のインストールは引き続き動作します |
| キーのないソース | エンジン内でスキップし、フッターに列挙します。上流のセットアップウィザードで有効にできます |

---

## 次のステップ

- [コンテンツと調査のワークフロー](./content-and-research.md)。ほかの調査やドキュメント作業に合った機能を選べます
- [ダイアグラムエンジン](./diagram-engine.md)。archify で使われている同じ skills-CLI インストールパターンです
- [oma-config.yaml のセマンティクス](./oma-config-semantics.md)。`market:` セクションのマージ方法です
- [CLI コマンド：market](../cli-interfaces/commands.md#market)。オプションの一覧です
- 上流： [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill)
