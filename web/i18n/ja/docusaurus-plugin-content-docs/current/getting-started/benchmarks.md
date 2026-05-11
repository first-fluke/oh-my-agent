---
title: ベンチマーク
description: 5つのClaude Codeハーネスが、同一のプロンプトから子供向け3D学習プラットフォームのMVPを構築。oh-my-agentは機能、仕様、ビジュアル、エンジニアリング、効率の5軸で80.6/100を獲得し1位を記録しました。
---

# ベンチマーク

5つのClaude Codeハーネスが、同一の生プロンプトから子供向け3Dクリエイティブ学習プラットフォームのMVPを構築しました。**oh-my-agentは80.6/100で1位**を獲得し、5軸ルーブリック（機能、仕様、ビジュアル、エンジニアリング、効率）で評価されています。

> 実行条件：`claude-opus-4-6`、effort `max`、`--max-budget-usd 20`、`--no-session-persistence`、`--setting-sources project,local`。ユーザーがログイン済みの`claude` CLI経由のOAuth認証（`ANTHROPIC_API_KEY`は不使用）。

---

## 比較対象ハーネス

| ハーネス | メカニズム |
|---|---|
| `vanilla` | プラグイン／スキルなしの素のClaude Code（ベースライン） |
| `oma` | `oh-my-agent`をソースシード（`.agents/` + `.claude/`） |
| `omc` | `oh-my-claudecode`を`--plugin-dir`経由で使用 |
| `ecc` | `everything-claude-code`を`~/.claude/`にインストール |
| `superpowers` | `superpowers`を`--plugin-dir`経由で使用 |

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

## ランディングページ比較

| vanilla | oma | omc | ecc | superpowers |
|---|---|---|---|---|
| ![vanilla](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/vanilla/01-landing.png) | ![oma](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/oma/01-landing.png) | ![omc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/omc/01-landing.png) | ![ecc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/ecc/01-landing.png) | ![superpowers](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/superpowers/01-landing.png) |

画面ごとの完全な比較（ワールドビルダー、AIパネル、ギャラリー、save→reloadステート）は[GitHubベンチマークレポート](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks)で確認できます。

---

## 各軸の算出方法

| 軸 | 重み | 主要シグナル | ツーリング |
|---|---|---|---|
| **Functional** | 35 | ビルドexit、devサーバー起動（HTTP 200 ≤45s）、5つのユーザージャーニーチェック、lint、ts-clean | `pm install/build/lint`、curl、chrome-devtools MCP、`tsc --noEmit` |
| **Spec** | 15 | プロンプトに明示された13の成果物、real-APIボーナス | brace-balanced JSONエクストラクタによるLLMジャッジ |
| **Visual** | 20 | アンチパターン、子供向けUX、デザインシステムの一貫性、アクセシビリティ | スクリーンショットを対象としたLLMジャッジ |
| **Engineering** | 20 | コードの幅、TS strict、最大ファイルサイズ＋フォルダ深度、deferred-stubマーカー、ハードコードされたキーの不在 | 静的解析（jq + grep + find） |
| **Efficiency** | 10 | 完了までのターン数、wall-clock所要時間、ファイル単位コスト | `claude -p`の結果JSON |

仕様とビジュアルのジャッジは`judge-multi.sh`によりハーネスごとに3回実行され、項目別スコアはラウンド間で平均化されます。実装は[`benchmarks/scoring/multiaxis/`](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks/scoring/multiaxis)にあります。

---

## 留意事項

1. **superpowersのプロンプト上書き**：非インタラクティブモードでハーネスを動作させるために必須でした（`<HARD-GATE>`ブレインストーミングスキルがシングルショット実行をブロックするため）。結果は「ゲートを回避した後のsuperpowersができること」を反映しており、純粋な同条件比較ではありません。
2. **仕様＋ビジュアルはマルチジャッジ平均、ジャーニーは単一実行**：ジャーニー判定にはライブのdevサーバーが必要なため、シングル実行のままとしています。約2ポイント以下のジャーニー差はノイズとして扱ってください。サンプルサイズはハーネスごとに1ビルドです。
3. **コスト正規化**：効率軸はファイル単位コストを用いており、絶対コスト（5ハーネスで$1.28〜$8.19）はスコアに反映されていません。
4. **omaの`lint-clean`ペナルティは意図的なもの**：omaはlint／typecheckの強制をエージェントスキルにESLint固有のルールを組み込むのではなく、gitフック（husky + lint-staged）とCIに意図的に委ねています。シングル実行のベンチマークではこれが`lint-clean`で-5として減点されますが、実際のワークフローでは同じ問題がリモートに到達する前にpre-pushでブロックされます。

---

## 再現方法

```bash
# Run all 5 harnesses (sequential, ~45 min, ~$15-20 in API spend)
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

ハーネスごとの完全な解説、生スコア、スクリーンショットは[`benchmarks/README.md`](https://github.com/first-fluke/oh-my-agent/blob/main/benchmarks/README.md)で管理されています。このファイルは各実行の`multiaxis/*.json`から`build-report.sh`によって生成されるため、常に最新のスコアリング成果物と同期しています。
