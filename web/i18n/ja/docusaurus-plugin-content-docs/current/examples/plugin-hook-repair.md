---
title: プラグインフックとプロジェクトブートストラップの修復
sidebar_label: プラグインフックの修復
description: マーケットプレイスのフックパス、Bash のプロビジョニング、プロジェクトブートストラップの受領記録を、回帰フィクスチャで修復した例です。
---

# プラグインフックとプロジェクトブートストラップの修復

[`2a29d3a8`](https://github.com/first-fluke/oh-my-agent/commit/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c) のプラグイン修復は、フックのディスパッチとブートストラップの挙動を対象にしました。親の `82649cbd` が、この比較の変更前の状態です。

## 失敗の仕組み

[古いフックマニフェスト](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/hooks/hooks.json)は、`${CLAUDE_PLUGIN_ROOT}/.claude/hooks/` 配下のファイルを呼び出していました。これらのパスは生成ファイルに依存します。プラグインキャッシュが新しいフィクスチャでは、プラグインディレクトリにそれらが含まれません。

[古いブートストラップ](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/scripts/plugin-bootstrap.sh)は、ダウンロードした Bash インストーラーを `sh -c` で実行していました。成功マーカーは共有のプラグインデータにあり、高速経路はそのマーカー、CLI のバージョン、プロジェクトの設定ファイルの有無だけを見ていました。そのため、設定ファイルがある別のプロジェクトが、自分の配線を省略できました。

## 修復

[新しいディスパッチャー](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.sh)は、インストール済みの CLI を呼びます。一致する実行可能なプロジェクトフックがすでにイベントを所有している場合、マーケットプレイスのフックはそれに譲ります。イベントが 2 回ディスパッチされないようにするためです。

[新しいブートストラップ](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.sh)は次のとおりです。

- Bash インストーラーを Bash で実行し、プロビジョニングの失敗を確認します。
- グローバルインストールの設定を継承していても、プロジェクトのインストールを強制します。
- 受領記録をそのプロジェクトの `.agents/state/plugin-bootstrap.version` に保存します。
- 受領記録を再利用する前に、設定、バージョンのメタデータ、実行可能なラッパー、登録されたイベントを確認します。
- 失敗したインストールの診断を `.agents/state/plugin-bootstrap.last-error.log` に残し、成功の受領記録は書きません。

## 回帰チェックを再現する

Bun と、リポジトリの開発依存がすでに使える、使い捨てチェックアウトの `2a29d3a8eb4d760e4e4000b484c9f04761c59f5c` を使います。そのルートから次を実行します。

```bash
bun run --cwd cli test --project scripts --maxWorkers 1 \
  plugin-bootstrap.test.ts plugin-hook.test.ts plugin-install.integration.test.ts
```

フィクスチャは、別々の境界を対象にします。

| フィクスチャ | アサーションが確認すること |
|---|---|
| [Bootstrap](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.test.ts) | Bash だけのプロビジョニング、プロジェクトごとの受領記録、CUE だけの設定、不完全な配線、バージョンの失敗、残した診断。 |
| [Hook dispatch](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.test.ts) | 新しいキャッシュでのディスパッチ、ハンドラーの時間予算、ペイロードの保持、一致するプロジェクトフックの所有、その所有がないか無効なときのフォールバック。 |
| [Install integration](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-install.integration.test.ts) | 2 つのプロジェクトインストール、保持されたユーザー設定、両方の登録をまたぐ prompt/Stop の 1 回の配送、配線失敗後の再試行。 |

これらのフィクスチャは一時ディレクトリと偽の CLI コマンドを作ります。統合フィクスチャは実際のフックコンポーザーを使います。マーケットプレイスのインストールやモデル呼び出しなしで、シェルのディスパッチと記録された効果を確認します。スイートは Windows ではスキップされます。

## 実際のセッションで残る確認

フィクスチャが通っても、動く Claude Code セッションであることは証明しません。実際の対象プロジェクトでは、受領記録と設定を確認し、`oma doctor` を実行し、セッションを再起動し、関係する prompt と Stop の挙動を、観測した効果を見ながら試してください。CLI の有無、認証情報、プロバイダーの挙動、ホストのフックポリシーには、それぞれ別の証拠が必要です。

別の失敗に同じ再現、修正、検証の進め方を使うときは、[失敗するテストのデバッグ](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/)から始めてください。プロジェクトのランタイムが必要なときは、[セットアップを選ぶ](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/)を参照してください。
