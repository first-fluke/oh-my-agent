---
title: ベンチマーク
sidebar_label: ベンチマーク
description: 5つの Claude Code ハーネスが同じプロンプトから子ども向け3D学習プラットフォームの MVP を構築しました。oh-my-agent は機能、仕様、ビジュアル、エンジニアリング、効率の各軸で 80.6/100 を獲得し、1位になりました。
---

# ベンチマーク

5つの Claude Code ハーネスが、同一の生プロンプトから子ども向け3Dクリエイティブラーニングプラットフォームの MVP を構築しました。**oh-my-agent は5軸ルーブリック（機能、仕様、ビジュアル、エンジニアリング、効率）で 80.6/100 を獲得し、1位になりました。**

> 実行条件: `claude-opus-4-6`、effort `max`、`--max-budget-usd 20`、`--no-session-persistence`、`--setting-sources project,local`。ユーザーがログイン済みの `claude` CLI で OAuth を使い、`ANTHROPIC_API_KEY` は使いません。

---

## 比較したハーネス

| ハーネス | 仕組み |
|---|---|
| `vanilla` | プラグインやスキルを使わない素の Claude Code（ベースライン） |
| `oma` | `oh-my-agent` のソースを配置（`.agents/` + `.claude/`） |
| `omc` | `--plugin-dir` で `oh-my-claudecode` を使用 |
| `ecc` | `everything-claude-code` を `~/.claude/` にインストール |
| `superpowers` | `--plugin-dir` で `superpowers` を使用 |

---

## 最終スコアボード

| 順位 | ハーネス | **合計** | Func/35 | Spec/15 | Visual/20 | Eng/20 | Eff/10 |
|---|---|---|---|---|---|---|---|
| 1 | **oma** | **80.6** | 32 | 13.3 | 15.3 | 15 | 5 |
| 2 | omc | 74.1 | 33.5 | 6.7 | 14.4 | 14.5 | 5 |
| 3 | superpowers | 72.9 | 30 | 9.3 | 11.6 | 14 | 8 |
| 4 | vanilla | 70.7 | 28.5 | 11.7 | 12 | 12.5 | 6 |
| 5 | ecc | 70.2 | 28.5 | 9.7 | 13 | 15 | 4 |

### 実行コスト

| ハーネス | ターン数 | 所要時間 | コスト | ファイル数（src） |
|---|---|---|---|---|
| vanilla | 42 | 8m 56s | $2.37 | 16 |
| oma | 31 | 15m 56s | $4.04 | 21 |
| omc | 61 | 9m 02s | $1.92 | 14 |
| ecc | 79 | 10m 20s | $3.84 | 22 |
| superpowers | 39 | 8m 13s | $1.28 | 18 |

---

## ランディングページの比較

| vanilla | oma | omc | ecc | superpowers |
|---|---|---|---|---|
| ![vanilla](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/vanilla/01-landing.png) | ![oma](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/oma/01-landing.png) | ![omc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/omc/01-landing.png) | ![ecc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/ecc/01-landing.png) | ![superpowers](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/superpowers/01-landing.png) |

各画面（ワールドビルダー、AIパネル、ギャラリー、save→reload の状態）の完全な比較は [GitHub ベンチマークレポート](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks)にあります。

---

## 各軸の算出方法

| 軸 | 重み | 主なシグナル | ツール |
|---|---|---|---|
| **Functional** | 35 | build の終了コード、開発サーバーの起動（HTTP 200 ≤45s）、5つのユーザージャーニーチェック、lint、ts-clean | `pm install/build/lint`、curl、chrome-devtools MCP、`tsc --noEmit` |
| **Spec** | 15 | プロンプトに明示された13の成果物、real-API ボーナス | brace-balanced JSON extractor を使う LLM judge |
| **Visual** | 20 | アンチパターン、子ども向け UX、デザインシステムの一貫性、アクセシビリティ | スクリーンショットに対する LLM judge |
| **Engineering** | 20 | コードの幅、TS strict、最大ファイルサイズとフォルダー深度、deferred-stub マーカー、ハードコードされたキーがないこと | 静的解析（jq + grep + find） |
| **Efficiency** | 10 | 完了までのターン数、経過時間、ファイル単位のコスト | `claude -p` の結果 JSON |

Spec と Visual の judge は、`judge-multi.sh` によりハーネスごとに3回実行され、項目ごとのスコアはラウンド間で平均されます。実装は [`benchmarks/scoring/multiaxis/`](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks/scoring/multiaxis)にあります。

---

## 留意事項

1. **superpowers のプロンプト上書き:** 非対話モードでハーネスを動かすために必要でした。`<HARD-GATE>` ブレインストーミングスキルがシングルショット実行をブロックするためです。結果は「ゲートを回避した後に superpowers ができること」を示しており、完全に同条件の比較ではありません。
2. **Spec と Visual は複数 judge、ジャーニーは単一実行:** ジャーニーの判定には稼働中の開発サーバーが必要なため、単一実行のままです。ジャーニーの差が約2ポイント未満ならノイズとして扱ってください。各ハーネスのサンプルは1ビルドです。
3. **コストの正規化:** Efficiency 軸ではファイル単位のコストを使い、5ハーネスの絶対コスト（$1.28〜$8.19）はスコアに反映していません。
4. **oma の `lint-clean` ペナルティは意図的です:** oma は、エージェントスキルに ESLint 固有のルールを組み込まず、lint/typecheck の強制を git フック（husky + lint-staged）と CI に委ねています。単一実行のベンチマークでは `lint-clean` が -5 になりますが、実際のワークフローでは同じ問題がリモートに届く前に pre-push でブロックされます。

---

## 再現方法

```bash
# Run all harnesses (sequential, ~45 min, ~$15-20 in API spend)
./benchmarks/run.sh

# Multiaxis scoring per harness (5-axis, 100pt) — single judge round
for h in vanilla oma omc ecc superpowers; do
  ./benchmarks/scoring/multiaxis/score.sh \
    /tmp/oma-benchmark-<timestamp>/projects/$h \
    $h \
    /tmp/oma-benchmark-<timestamp>/results/$h.json \
    /tmp/oma-benchmark-<timestamp>/multiaxis/$h
done

# Generate the report
./benchmarks/scoring/multiaxis/build-report.sh \
  /tmp/oma-benchmark-<timestamp> \
  $(pwd)
```

各ハーネスの詳しい説明、生スコア、スクリーンショットは [`benchmarks/README.md`](https://github.com/first-fluke/oh-my-agent/blob/main/benchmarks/README.md)で管理しています。このファイルは各実行の `multiaxis/*.json` から `build-report.sh` が生成するため、最新のスコアリング成果物と常に同期します。
